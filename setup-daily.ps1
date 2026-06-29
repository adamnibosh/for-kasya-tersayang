$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Read-DailyNotes {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @() }
    $raw = Get-Content -Path $Path -Raw -Encoding UTF8
    if (-not $raw.Trim()) { return @() }

    $parsed = $raw | ConvertFrom-Json
    $items = New-Object System.Collections.Generic.List[object]

    function Add-Note($note) {
        if (-not $note.date -or -not $note.text) { return }
        $items.Add([pscustomobject]@{
            date = [string]$note.date
            text = [string]$note.text
            sub  = if ($note.sub) { [string]$note.sub } else { $null }
        })
    }

    if ($parsed -is [System.Array]) {
        foreach ($item in $parsed) {
            if ($null -eq $item) { continue }
            if ($item.PSObject.Properties.Name -contains 'value') {
                foreach ($nested in @($item.value)) { Add-Note $nested }
            } else {
                Add-Note $item
            }
        }
    } else {
        if ($parsed.PSObject.Properties.Name -contains 'value') {
            foreach ($nested in @($parsed.value)) { Add-Note $nested }
        } else {
            Add-Note $parsed
        }
    }

    return ,$items.ToArray()
}

function Write-DailyNotes {
    param([string]$Path, [array]$Notes)
    $rows = New-Object System.Collections.Generic.List[hashtable]
    foreach ($n in $Notes) {
        $row = [ordered]@{ date = $n.date; text = $n.text }
        if ($n.sub) { $row.sub = $n.sub }
        $rows.Add($row)
    }
    $json = ConvertTo-Json -InputObject @($rows.ToArray()) -Depth 4
    [System.IO.File]::WriteAllText($Path, $json + "`n", [System.Text.UTF8Encoding]::new($false))
}

Write-Host ""
Write-Host "=== Add daily note (append only - old notes stay) ===" -ForegroundColor Magenta
Write-Host "Today: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor Cyan
Write-Host ""

$text = Read-Host "Note for Kasya (main message)"
$text = $text.Trim()
if (-not $text) {
    Write-Host "Cancelled - no text entered." -ForegroundColor Red
    exit 1
}

$sub = Read-Host "Small sub-line (Enter to skip)"
$sub = $sub.Trim()

$jsonPath = Join-Path $PSScriptRoot "daily.json"
$notes = [System.Collections.Generic.List[object]](Read-DailyNotes -Path $jsonPath)

$today = Get-Date -Format "yyyy-MM-dd"
$entry = [pscustomobject]@{ date = $today; text = $text }
if ($sub) { $entry | Add-Member -NotePropertyName sub -NotePropertyValue $sub }
$notes.Add($entry)

Write-DailyNotes -Path $jsonPath -Notes $notes.ToArray()

Write-Host ""
Write-Host "Added note for $today ($($notes.Count) total)" -ForegroundColor Green
Write-Host "Deploying to GitHub..." -ForegroundColor Cyan

git add daily.json
if ($LASTEXITCODE -ne 0) { throw "git add failed" }
git commit -m "Daily note for $today"
if ($LASTEXITCODE -ne 0) { throw "git commit failed" }
git push origin main
if ($LASTEXITCODE -ne 0) { throw "git push failed" }

Write-Host ""
Write-Host "DONE. Sayang will see it in daily dari baby on the site." -ForegroundColor Green
Write-Host ""