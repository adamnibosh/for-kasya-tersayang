$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$repoName = "for-kasya-tersayang"
$owner = "adamnibosh"
$url = "https://$owner.github.io/$repoName/"
$ToastAppId = "KasyaTersayang.Deploy"

function Register-ToastApp {
    $shortcutPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\$ToastAppId.lnk"
    if (Test-Path $shortcutPath) { return }

    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($shortcutPath)
    $sc.TargetPath = "powershell.exe"
    $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    $sc.WorkingDirectory = $PSScriptRoot
    $sc.Description = "Deploy for-kasya-tersayang"
    $sc.Save()
}

function Show-DeployNotify {
    param([string]$Title, [string]$Message, [switch]$Success)

    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host " $Title" -ForegroundColor Green
    Write-Host " $Message" -ForegroundColor White
    Write-Host " $url" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Magenta

    try { [console]::Beep(880, 160); if ($Success) { Start-Sleep -Milliseconds 80; [console]::Beep(1100, 200) } } catch {}

    $notified = $false

    try {
        Register-ToastApp
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $safeTitle = [System.Security.SecurityElement]::Escape($Title)
        $safeMsg = [System.Security.SecurityElement]::Escape($Message)
        $xml = @"
<toast activationType="protocol" launch="$url" duration="long">
  <visual>
    <binding template="ToastGeneric">
      <text>$safeTitle</text>
      <text>$safeMsg</text>
    </binding>
  </visual>
  <audio src="ms-winsoundevent:Notification.Default"/>
</toast>
"@
        $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
        $doc.LoadXml($xml)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($ToastAppId).Show($toast)
        $notified = $true
    } catch {}

    if (-not $notified) {
        try {
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $icon = New-Object System.Windows.Forms.NotifyIcon
            $icon.Icon = [System.Drawing.SystemIcons]::Information
            $icon.Visible = $true
            $icon.BalloonTipTitle = $Title
            $icon.BalloonTipText = "$Message`n$url"
            $icon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
            $icon.ShowBalloonTip(12000)
            Start-Sleep -Seconds 5
            $icon.Dispose()
            $notified = $true
        } catch {}
    }

    if (-not $notified) {
        try {
            (New-Object -ComObject Wscript.Shell).Popup("$Message`n`n$url", 12, $Title, 64) | Out-Null
        } catch {}
    }
}

function Wait-PagesLive {
    param([string]$ExpectSnippet, [int]$MaxSeconds = 180)
    $deadline = (Get-Date).AddSeconds($MaxSeconds)
    while ((Get-Date) -lt $deadline) {
        $status = gh api "repos/$owner/$repoName/pages" --jq .status 2>$null
        try {
            $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).Content
            if ($status -eq "built" -and ($ExpectSnippet -eq "" -or $html -like "*$ExpectSnippet*")) {
                return $true
            }
        } catch {}
        Write-Host "  waiting for GitHub Pages... ($status)" -ForegroundColor DarkYellow
        Start-Sleep -Seconds 10
    }
    return $false
}

if ($args -contains "-NotifyTest") {
    Show-DeployNotify -Title "Test notification" -Message "If you see this, deploy alerts work!" -Success
    exit 0
}

Write-Host "`n=== Deploy $repoName ===" -ForegroundColor Magenta

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Sign in to GitHub..." -ForegroundColor Yellow
    gh auth login --hostname github.com --git-protocol https --web
}

git add -A
$dirty = git status --porcelain
if ($dirty) {
    $msg = Read-Host "Commit message (Enter = 'Update site')"
    if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Update site" }
    git commit -m $msg
}

git push origin main
if ($LASTEXITCODE -ne 0) { throw "git push failed" }

Write-Host "`nPushed. Waiting for GitHub Pages to finish..." -ForegroundColor Cyan
$live = Wait-PagesLive -ExpectSnippet ""

if ($live) {
    Set-Content -Path "$env:USERPROFILE\Desktop\kasya-link.txt" -Value $url
    Show-DeployNotify -Title "Site is live!" -Message "for-kasya-tersayang deployed successfully" -Success
} else {
    Show-DeployNotify -Title "Push done - still building" -Message "Open the site in 1-2 minutes"
}