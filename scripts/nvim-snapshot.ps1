#!/usr/bin/env pwsh
#Requires -Version 5.0

<#
.SYNOPSIS
    Layout snapshot capture for nvim-ccasp plugin

.DESCRIPTION
    Captures the current terminal UI layout state to text and JSON files.
    Useful for regression testing and debugging UI changes.

.EXAMPLE
    .\scripts\nvim-snapshot.ps1
#>

# Color output functions
function Write-Success { param([string]$msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param([string]$msg) Write-Host $msg -ForegroundColor Red }
function Write-Info { param([string]$msg) Write-Host $msg -ForegroundColor Cyan }

# Change to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot

try {
    Write-Info "=== CCASP Layout Snapshot Capture ==="
    Write-Host ""

    # Check if nvim is installed
    try {
        $null = & nvim --version 2>&1
    }
    catch {
        Write-Error "✗ Neovim not found"
        exit 1
    }

    # Create artifacts directory
    $artifactsDir = "nvim-ccasp/tests/artifacts"
    if (-not (Test-Path $artifactsDir)) {
        Write-Info "Creating artifacts directory: $artifactsDir"
        New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
    }

    # Output paths
    $textSnapshot = "$artifactsDir/last-snapshot.txt"
    $jsonSnapshot = "$artifactsDir/last-snapshot.json"

    Write-Info "Capturing layout snapshot..."
    Write-Host ""

    # Create Lua script to capture snapshot
    $captureScript = @"
-- Load ccasp plugin
vim.opt.runtimepath:prepend('$($ProjectRoot -replace '\\', '/')/nvim-ccasp')

-- Require snapshot module
local snapshot = require('ccasp.test.snapshot')

-- Capture to both formats
local success, err = pcall(function()
    snapshot.capture_to_file('$($textSnapshot -replace '\\', '/')')
    snapshot.capture_to_json('$($jsonSnapshot -replace '\\', '/')')
end)

if not success then
    print('Error capturing snapshot: ' .. tostring(err))
    vim.cmd('cquit 1')
else
    print('Snapshot captured successfully')
    vim.cmd('quit')
end
"@

    $tempScript = [System.IO.Path]::GetTempFileName()
    $tempScript = [System.IO.Path]::ChangeExtension($tempScript, ".lua")
    $captureScript | Out-File -FilePath $tempScript -Encoding utf8 -NoNewline

    # Run Neovim headless with capture script
    & nvim --headless -u NONE -c "source $tempScript"
    $exitCode = $LASTEXITCODE

    # Cleanup temp script
    Remove-Item $tempScript -ErrorAction SilentlyContinue

    if ($exitCode -ne 0) {
        Write-Error "✗ Snapshot capture failed"
        exit 1
    }

    # Verify files were created
    if ((Test-Path $textSnapshot) -and (Test-Path $jsonSnapshot)) {
        Write-Success "✓ Snapshot captured successfully"
        Write-Host ""
        Write-Info "Output files:"
        Write-Host "  Text: $textSnapshot"
        Write-Host "  JSON: $jsonSnapshot"
        Write-Host ""

        # Print text snapshot to stdout
        Write-Info "Text snapshot content:"
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        Get-Content $textSnapshot | ForEach-Object { Write-Host $_ }
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        Write-Host ""

        # Show JSON summary
        try {
            $jsonContent = Get-Content $jsonSnapshot -Raw | ConvertFrom-Json
            Write-Info "JSON snapshot summary:"
            Write-Host "  Timestamp: $($jsonContent.timestamp)"
            Write-Host "  Total splits: $($jsonContent.splits.Count)"
            if ($jsonContent.splits) {
                $jsonContent.splits | ForEach-Object {
                    Write-Host "    - $($_.type): $($_.width)x$($_.height)"
                }
            }
        }
        catch {
            Write-Warning "Could not parse JSON snapshot"
        }

        exit 0
    }
    else {
        Write-Error "✗ Snapshot files not created"
        exit 1
    }
}
finally {
    Pop-Location
}
