# happy-start-cd.ps1 - Scan for git repos and launch Happy in selected directory
# Usage: powershell -File happy-start-cd.ps1 [-ScanPath "C:\path"] [-Depth 3]

param(
    [string]$ScanPath = "",
    [int]$Depth = 3,
    [switch]$CommonPaths
)

Write-Host ""
Write-Host "========================================"
Write-Host "  Happy CLI - Directory Selector"
Write-Host "========================================"
Write-Host ""

# Define common development paths
$commonDevPaths = @(
    "$env:USERPROFILE\Projects",
    "$env:USERPROFILE\repos",
    "$env:USERPROFILE\code",
    "$env:USERPROFILE\dev",
    "$env:USERPROFILE\GitHub",
    "$env:USERPROFILE\Documents\GitHub",
    "F:\",
    "D:\"
)

# Determine search paths
$searchPaths = @()
if ($ScanPath -ne "") {
    $searchPaths = @($ScanPath)
} elseif ($CommonPaths) {
    $searchPaths = $commonDevPaths | Where-Object { Test-Path $_ }
} else {
    # Default: scan common paths
    $searchPaths = $commonDevPaths | Where-Object { Test-Path $_ }
}

if ($searchPaths.Count -eq 0) {
    Write-Host "[ERROR] No valid paths to scan." -ForegroundColor Red
    exit 1
}

Write-Host "Scanning for git repositories..."
Write-Host "Paths: $($searchPaths -join ', ')"
Write-Host "Depth: $Depth"
Write-Host ""

# Scan for repositories
$repos = @()
foreach ($path in $searchPaths) {
    Write-Host "  Scanning: $path" -ForegroundColor Gray
    try {
        $found = Get-ChildItem -Path $path -Directory -Depth $Depth -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName ".git") } |
            ForEach-Object { $_.FullName }

        if ($found) {
            $repos += $found
        }
    } catch {
        Write-Host "  [Skip] Cannot access: $path" -ForegroundColor Yellow
    }
}

# Remove duplicates and sort
$repos = $repos | Sort-Object | Get-Unique

if ($repos.Count -eq 0) {
    Write-Host ""
    Write-Host "[ERROR] No git repositories found." -ForegroundColor Red
    Write-Host "Try scanning a different location or increasing depth."
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Found $($repos.Count) Repositories"
Write-Host "========================================"
Write-Host ""

# Display menu
$index = 1
foreach ($repo in $repos) {
    $repoName = Split-Path $repo -Leaf
    $shortPath = $repo
    if ($repo.Length -gt 50) {
        $shortPath = "..." + $repo.Substring($repo.Length - 47)
    }

    Write-Host "  $index) " -NoNewline -ForegroundColor Yellow
    Write-Host "$repoName" -ForegroundColor Cyan
    Write-Host "     $shortPath" -ForegroundColor Gray
    $index++
}

Write-Host ""
Write-Host "========================================"
$selection = Read-Host "Enter number (1-$($repos.Count)) or 'q' to quit"

if ($selection -eq 'q' -or $selection -eq 'Q') {
    Write-Host "Cancelled."
    exit 0
}

$selectedIndex = 0
if (-not [int]::TryParse($selection, [ref]$selectedIndex)) {
    Write-Host "[ERROR] Invalid selection." -ForegroundColor Red
    exit 1
}

if ($selectedIndex -lt 1 -or $selectedIndex -gt $repos.Count) {
    Write-Host "[ERROR] Selection out of range." -ForegroundColor Red
    exit 1
}

$selectedRepo = $repos[$selectedIndex - 1]
$repoName = Split-Path $selectedRepo -Leaf

Write-Host ""
Write-Host "========================================"
Write-Host "  Starting Happy CLI"
Write-Host "========================================"
Write-Host ""
Write-Host "Repository: $repoName"
Write-Host "Path: $selectedRepo"
Write-Host ""

# Clear HAPPY_SERVER_URL to prevent 401 errors
Remove-Item Env:HAPPY_SERVER_URL -ErrorAction SilentlyContinue

# Launch in new Windows Terminal tab
try {
    $happyPath = "C:\Users\erola\AppData\Roaming\npm\happy.cmd"

    # Check if Windows Terminal is available
    $wtExists = Get-Command wt.exe -ErrorAction SilentlyContinue

    if ($wtExists) {
        # Launch in Windows Terminal
        Start-Process wt.exe -ArgumentList "-d", "`"$selectedRepo`"", "powershell", "-NoExit", "-Command", "Remove-Item Env:HAPPY_SERVER_URL -ErrorAction SilentlyContinue; Write-Host 'Starting Happy CLI in $repoName...'; & '$happyPath'"
        Write-Host "[OK] Launched Happy in Windows Terminal" -ForegroundColor Green
    } else {
        # Fallback to regular PowerShell window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$selectedRepo'; Remove-Item Env:HAPPY_SERVER_URL -ErrorAction SilentlyContinue; Write-Host 'Starting Happy CLI in $repoName...'; & '$happyPath'"
        Write-Host "[OK] Launched Happy in PowerShell" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Your Happy mobile app should now see this session."
    Write-Host ""
} catch {
    Write-Host "[ERROR] Failed to launch: $_" -ForegroundColor Red
    exit 1
}
