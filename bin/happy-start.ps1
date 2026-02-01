# happy-start.ps1 - Launch Happy CLI with clean environment
# Clears HAPPY_SERVER_URL to prevent 401 auth errors from stale Railway config

Write-Host "========================================"
Write-Host "Happy CLI Launcher"
Write-Host "========================================"
Write-Host ""

# Clear the environment variable that causes 401 errors
Remove-Item Env:HAPPY_SERVER_URL -ErrorAction SilentlyContinue
Write-Host "[OK] Cleared HAPPY_SERVER_URL env var"
Write-Host ""
Write-Host "Starting Happy CLI..."
Write-Host "========================================"
Write-Host ""

# Launch happy
& "C:\Users\erola\AppData\Roaming\npm\happy.cmd"
