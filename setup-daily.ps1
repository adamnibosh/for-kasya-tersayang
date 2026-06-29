$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Host "ERROR: Python not found. Install Python 3 and try again." -ForegroundColor Red
    exit 1
}

& python (Join-Path $PSScriptRoot "add-daily.py") @args
exit $LASTEXITCODE