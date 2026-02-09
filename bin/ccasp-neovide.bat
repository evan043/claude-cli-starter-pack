@echo off
REM CCASP Neovide Launcher - Opens CCASP as a standalone GUI application
REM Launches silently without keeping a terminal window open.
REM Requires: neovide (https://neovide.dev) and a Nerd Font installed

where neovide >nul 2>nul
if %ERRORLEVEL% neq 0 (
    REM Try common install location
    if exist "%ProgramFiles%\Neovide\neovide.exe" (
        set "NEOVIDE=%ProgramFiles%\Neovide\neovide.exe"
    ) else (
        echo ERROR: neovide not found in PATH.
        echo Install from https://neovide.dev or via: winget install neovide
        exit /b 1
    )
) else (
    set "NEOVIDE=neovide"
)

REM Resolve nvim-ccasp directory relative to this script (bin/../nvim-ccasp)
set "SCRIPT_DIR=%~dp0"
set "PLUGIN_DIR=%SCRIPT_DIR%..\nvim-ccasp"
set "PROJECT_DIR=%SCRIPT_DIR%.."

REM Start in the CCASP project root so detect_project_root() finds .claude/
REM "start /b" detaches the process so the cmd window closes immediately
start "" /b /d "%PROJECT_DIR%" "%NEOVIDE%" --frame none -- --clean -c "lua vim.opt.runtimepath:prepend('%PLUGIN_DIR:\=/%')" -c "lua require('ccasp').setup({layout='appshell'})" -c "lua require('ccasp').open()"
