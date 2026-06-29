$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n=== Add daily note (append only — old notes stay) ===" -ForegroundColor Magenta
Write-Host "Today: $(Get-Date -Format 'yyyy-MM-dd')`n" -ForegroundColor Cyan

$text = Read-Host "Note for Kasya (main message)"
$text = $text.Trim()
if (-not $text) { Write-Host "Cancelled — no text entered." -ForegroundColor Red; exit 1 }

$sub = Read-Host "Small sub-line (Enter to skip)"
$sub = $sub.Trim()

$jsonPath = Join-Path $PSScriptRoot "daily.json"
$raw = Get-Content -Path $jsonPath -Raw -Encoding UTF8
$notes = @()
if ($raw.Trim()) {
    $notes = $raw | ConvertFrom-Json
    if ($notes -isnot [System.Array]) { $notes = @($notes) }
}

$today = Get-Date -Format "yyyy-MM-dd"
$entry = [ordered]@{ date = $today; text = $text }
if ($sub) { $entry.sub = $sub }

$notes += [pscustomobject]$entry
$notes | ConvertTo-Json -Depth 4 | Set-Content -Path $jsonPath -Encoding UTF8

Write-Host "`nAdded note for $today ($($notes.Count) total)" -ForegroundColor Green
Write-Host "Deploying to GitHub..." -ForegroundColor Cyan

git add daily.json
git commit -m "Daily note for $today"
git push origin main

Write-Host "`nDONE. Sayang will see it in 'daily dari baby' on the site.`n" -ForegroundColor Green