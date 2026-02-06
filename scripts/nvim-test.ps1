#!/usr/bin/env pwsh
#Requires -Version 5.0

<#
.SYNOPSIS
    Full test runner for nvim-ccasp plugin using plenary.nvim

.DESCRIPTION
    Runs all test specs in nvim-ccasp/tests/ using Neovim headless mode.
    Checks for nvim and plenary.nvim before running tests.

.PARAMETER Filter
    Optional filter to run specific spec files (e.g., "ui_smoke")

.EXAMPLE
    .\scripts\nvim-test.ps1
    .\scripts\nvim-test.ps1 -Filter ui_smoke
#>

param(
    [string]$Filter = ""
)

# Color output functions
function Write-Success { param([string]$msg) Write-Host $msg -ForegroundColor Green }
function Write-Error { param([string]$msg) Write-Host $msg -ForegroundColor Red }
function Write-Info { param([string]$msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warning { param([string]$msg) Write-Host $msg -ForegroundColor Yellow }

# Change to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ProjectRoot

try {
    Write-Info "=== Neovim CCASP Test Runner ==="
    Write-Host ""

    # Check if nvim is installed
    Write-Info "Checking for Neovim..."
    try {
        $nvimVersion = & nvim --version 2>&1 | Select-Object -First 1
        Write-Success "✓ Found: $nvimVersion"
    }
    catch {
        Write-Error "✗ Neovim not found in PATH"
        Write-Host ""
        Write-Host "Please install Neovim from: https://neovim.io/"
        exit 1
    }

    # Check for plenary.nvim
    Write-Info "Checking for plenary.nvim..."
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
            $resolvedPath = Resolve-Path $path | Select-Object -First 1
            Write-Success "✓ Found: $resolvedPath"
            $plenaryFound = $true
            break
        }
    }

    if (-not $plenaryFound) {
        Write-Error "✗ plenary.nvim not found"
        Write-Host ""
        Write-Warning "Installation instructions:"
        Write-Host "  1. Using lazy.nvim:"
        Write-Host "     { 'nvim-lua/plenary.nvim' }"
        Write-Host ""
        Write-Host "  2. Using packer.nvim:"
        Write-Host "     use 'nvim-lua/plenary.nvim'"
        Write-Host ""
        Write-Host "  3. Manual installation:"
        Write-Host "     git clone https://github.com/nvim-lua/plenary.nvim \"$env:LOCALAPPDATA\nvim-data\site\pack\vendor\start\plenary.nvim\""
        Write-Host ""
        exit 1
    }

    # Set isolated test environment
    $env:NVIM_APPNAME = "ccasp-test"
    Write-Info "Using isolated test environment (NVIM_APPNAME=ccasp-test)"
    Write-Host ""

    # Determine test target
    $testTarget = "nvim-ccasp/tests/"
    $testDescription = "all specs"

    if ($Filter) {
        $filterPath = "nvim-ccasp/tests/${Filter}_spec.lua"
        if (Test-Path $filterPath) {
            $testTarget = $filterPath
            $testDescription = "${Filter}_spec.lua"
        }
        else {
            Write-Warning "Filter file not found: $filterPath"
            Write-Info "Running all tests instead..."
        }
    }

    Write-Info "Running tests: $testDescription"
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""

    # Run tests
    $minimalInit = "nvim-ccasp/tests/minimal_init.lua"

    if ($testTarget.EndsWith("/")) {
        # Directory - use PlenaryBustedDirectory
        $nvimCmd = "PlenaryBustedDirectory $testTarget {minimal_init = '$minimalInit'}"
    }
    else {
        # Single file - use PlenaryBustedFile
        $nvimCmd = "PlenaryBustedFile $testTarget {minimal_init = '$minimalInit'}"
    }

    & nvim --headless -c $nvimCmd
    $exitCode = $LASTEXITCODE

    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""

    if ($exitCode -eq 0) {
        Write-Success "✓ All tests passed!"
        exit 0
    }
    else {
        Write-Error "✗ Tests failed (exit code: $exitCode)"
        exit 1
    }
}
finally {
    Pop-Location
}
