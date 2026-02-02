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

# Launch happy - find it dynamically
$npmPrefix = (npm config get prefix 2>$null)
if ($npmPrefix) {
    $happyPath = Join-Path $npmPrefix "happy.cmd"
    if (Test-Path $happyPath) {
        & $happyPath
    } else {
        # Fallback to PATH lookup
        & happy
    }
} else {
    # Fallback to PATH lookup
    & happy
}
