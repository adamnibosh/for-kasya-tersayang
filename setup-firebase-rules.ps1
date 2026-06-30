$ErrorActionPreference = "Stop"
$rulesPath = Join-Path $PSScriptRoot "firebase-rules.json"
Write-Host ""
Write-Host "=== Firebase rules for phone content writes ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "1. Open Firebase Console -> Realtime Database -> Rules"
Write-Host "2. Replace ALL rules with the contents of firebase-rules.json"
Write-Host "3. Click Publish"
Write-Host ""
Write-Host "Rules file: $rulesPath" -ForegroundColor Cyan
Write-Host ""
Get-Content $rulesPath -Raw
Write-Host ""
Start-Process "https://console.firebase.google.com/project/for-kasya-tersayang/database/for-kasya-tersayang-default-rtdb/rules"
Write-Host "Browser opened. Paste rules and Publish, then phone writes will work." -ForegroundColor Green
Write-Host ""