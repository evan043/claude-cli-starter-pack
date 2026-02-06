#!/usr/bin/env pwsh
#Requires -Version 5.0

<#
.SYNOPSIS
    Smoke test runner for nvim-ccasp plugin

.DESCRIPTION
    Runs only ui_smoke_spec.lua for quick validation.
    Provides compact output and fast feedback.

.EXAMPLE
    .\scripts\nvim-smoke.ps1
#>

# Color output functions
function Write-Success { param([string]$msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param([string]$msg) Write-Host $msg -ForegroundColor Red }
function Write-Info { param([string]$msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warning { param([string]$msg) Write-Host $msg -ForegroundColor Yellow }

# Change to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot

try {
    Write-Info "=== CCASP Smoke Test ==="

    # Quick check for nvim
    try {
        $null = & nvim --version 2>&1
    }
    catch {
        Write-Error "✗ Neovim not found"
        exit 1
    }

    # Check for plenary.nvim
    $plenaryPaths = @(
        "$env:LOCALAPPDATA\nvim-data\site\pack\*\start\plenary.nvim",
        "$env:LOCALAPPDATA\nvim-data\site\pack\*\opt\plenary.nvim",
        "$HOME\.local\share\nvim\site\pack\*\start\plenary.nvim",
        "$HOME\.local\share\nvim\site\pack\*\opt\plenary.nvim"
    )

    if ($env:XDG_DATA_HOME) {
        $plenaryPaths += "$env:XDG_DATA_HOME\nvim\site\pack\*\start\plenary.nvim"
        $plenaryPaths += "$env:XDG_DATA_HOME\nvim\site\pack\*\opt\plenary.nvim"
    }

    $plenaryFound = $false
    foreach ($path in $plenaryPaths) {
        if (Test-Path $path) {
            $plenaryFound = $true
            break
        }
    }

    if (-not $plenaryFound) {
        Write-Error "✗ plenary.nvim not found"
        Write-Warning "Install: git clone https://github.com/nvim-lua/plenary.nvim \"$env:LOCALAPPDATA\nvim-data\site\pack\vendor\start\plenary.nvim\""
        exit 1
    }

    # Check if smoke test exists
    $smokeTestPath = "nvim-ccasp/tests/ui_smoke_spec.lua"
    if (-not (Test-Path $smokeTestPath)) {
        Write-Error "✗ Smoke test not found: $smokeTestPath"
        exit 1
    }

    # Set isolated test environment
    $env:NVIM_APPNAME = "ccasp-test"

    # Run smoke test
    Write-Info "Running ui_smoke_spec.lua..."
    Write-Host ""

    $minimalInit = "nvim-ccasp/tests/minimal_init.lua"
    & nvim --headless -c "PlenaryBustedFile $smokeTestPath {minimal_init = '$minimalInit'}"
    $exitCode = $LASTEXITCODE

    Write-Host ""

    if ($exitCode -eq 0) {
        Write-Success "✓ Smoke test passed"
        exit 0
    }
    else {
        Write-Error "✗ Smoke test failed"
        exit 1
    }
}
finally {
    Pop-Location
}
