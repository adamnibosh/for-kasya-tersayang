$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n=== Analytics setup for for-kasya-tersayang ===" -ForegroundColor Magenta
Write-Host "Follow the browser steps, then paste your Firebase URL here.`n" -ForegroundColor Cyan

Start-Process "https://console.firebase.google.com/"
Write-Host "1) Create project (name: for-kasya-tersayang or any name)" -ForegroundColor Yellow
Write-Host "2) Left menu: Build -> Realtime Database -> Create database" -ForegroundColor Yellow
Write-Host "3) Start in TEST MODE (ok for personal logs)" -ForegroundColor Yellow
Write-Host "4) Rules tab -> paste this, then Publish:" -ForegroundColor Yellow
Write-Host '   { "rules": { "events": { ".read": true, ".write": true } } } }' -ForegroundColor White
Write-Host "5) Copy Database URL from top of Realtime Database page`n" -ForegroundColor Yellow

$url = Read-Host "Paste Firebase Database URL"
$url = $url.Trim().TrimEnd('/')
if (-not $url) { Write-Host "No URL entered. Cancelled." -ForegroundColor Red; exit 1 }
if ($url -notmatch '^https://') { Write-Host "URL must start with https://" -ForegroundColor Red; exit 1 }

$configPath = Join-Path $PSScriptRoot "analytics-config.js"
$content = @"
// Analytics — configured by setup-analytics.ps1
const ANALYTICS_CONFIG = {
  enabled: true,
  firebaseDatabaseUrl: '$url'
};
"@
Set-Content -Path $configPath -Value $content -Encoding UTF8

Write-Host "`nSaved analytics-config.js" -ForegroundColor Green
Write-Host "Deploying to GitHub..." -ForegroundColor Cyan
git add analytics-config.js
git commit -m "Enable session analytics"
git push origin main

Write-Host "`nDONE. Admin logs:" -ForegroundColor Green
Write-Host "https://adamnibosh.github.io/for-kasya-tersayang/admin.html" -ForegroundColor White
Write-Host "Enter 0909 on main site keypad to open logs`n" -ForegroundColor White