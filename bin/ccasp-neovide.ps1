# CCASP Neovide Launcher - Opens CCASP as a standalone GUI application
# Requires: neovide (https://neovide.dev) and a Nerd Font installed

param(
    [string]$Font = "JetBrainsMono NF:h12",
    [int]$Padding = 4
)

# Check for neovide
$neovide = Get-Command neovide -ErrorAction SilentlyContinue
if (-not $neovide) {
    # Try common install locations
    $paths = @(
        "$env:LOCALAPPDATA\neovide\neovide.exe",
        "$env:ProgramFiles\Neovide\neovide.exe",
        "$env:USERPROFILE\scoop\apps\neovide\current\neovide.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            $neovide = $p
            break
        }
    }
    if (-not $neovide) {
        Write-Error "neovide not found. Install from https://neovide.dev or: winget install neovide"
        exit 1
    }
    $neovide = $neovide.ToString()
} else {
    $neovide = $neovide.Source
}

# Resolve nvim-ccasp plugin directory relative to this script (bin/../nvim-ccasp)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginDir = (Resolve-Path (Join-Path $scriptDir "..\nvim-ccasp")).Path -replace '\\', '/'

# Validate font is installed (best-effort check)
$fontFamilies = [System.Drawing.FontFamily]::Families 2>$null
if ($fontFamilies) {
    $fontName = ($Font -split ':')[0]
    $found = $fontFamilies | Where-Object { $_.Name -eq $fontName }
    if (-not $found) {
        Write-Warning "Font '$fontName' not found. Neovide will use fallback font."
        Write-Warning "Install from: https://www.nerdfonts.com/font-downloads"
    }
}

# Build Lua commands
$luaRtp = "lua vim.opt.runtimepath:prepend('$pluginDir')"
$luaSetup = "lua require('ccasp').setup({layout='appshell', neovide={font='$Font', padding=$Padding}})"
$luaOpen = "lua require('ccasp').open()"

# Start in the CCASP project root so detect_project_root() finds .claude/
$projectDir = (Resolve-Path (Join-Path $scriptDir "..")).Path

Write-Host "Launching CCASP via Neovide..." -ForegroundColor Cyan
Push-Location $projectDir
& $neovide --frame none -- --clean -c $luaRtp -c $luaSetup -c $luaOpen
Pop-Location
