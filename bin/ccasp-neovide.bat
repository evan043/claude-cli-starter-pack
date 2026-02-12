@echo off
REM CCASP Neovide Launcher - Opens CCASP as a standalone GUI application
REM Launches silently without keeping a terminal window open.
REM Requires: neovide (https://neovide.dev)
REM Nerd Font is auto-installed if missing.

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
set "FONTS_DIR=%PLUGIN_DIR%\fonts"

REM Auto-install Nerd Font if not already present (per-user, no admin needed)
set "FONT_DEST=%LOCALAPPDATA%\Microsoft\Windows\Fonts"
if not exist "%FONT_DEST%\JetBrainsMonoNerdFontMono-Regular.ttf" (
    if exist "%FONTS_DIR%\JetBrainsMonoNerdFontMono-Regular.ttf" (
        echo Installing JetBrainsMono Nerd Font...
        if not exist "%FONT_DEST%" mkdir "%FONT_DEST%"
        copy /y "%FONTS_DIR%\JetBrainsMonoNerdFontMono-Regular.ttf" "%FONT_DEST%\" >nul
        copy /y "%FONTS_DIR%\JetBrainsMonoNerdFontMono-Bold.ttf" "%FONT_DEST%\" >nul
        copy /y "%FONTS_DIR%\JetBrainsMonoNerdFontMono-Italic.ttf" "%FONT_DEST%\" >nul
        copy /y "%FONTS_DIR%\JetBrainsMonoNerdFontMono-BoldItalic.ttf" "%FONT_DEST%\" >nul
        REM Register fonts in user registry
        reg add "HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "JetBrainsMonoNerdFontMono-Regular (TrueType)" /t REG_SZ /d "%FONT_DEST%\JetBrainsMonoNerdFontMono-Regular.ttf" /f >nul 2>nul
        reg add "HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "JetBrainsMonoNerdFontMono-Bold (TrueType)" /t REG_SZ /d "%FONT_DEST%\JetBrainsMonoNerdFontMono-Bold.ttf" /f >nul 2>nul
        reg add "HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "JetBrainsMonoNerdFontMono-Italic (TrueType)" /t REG_SZ /d "%FONT_DEST%\JetBrainsMonoNerdFontMono-Italic.ttf" /f >nul 2>nul
        reg add "HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "JetBrainsMonoNerdFontMono-BoldItalic (TrueType)" /t REG_SZ /d "%FONT_DEST%\JetBrainsMonoNerdFontMono-BoldItalic.ttf" /f >nul 2>nul
        echo Nerd Font installed. Icons will render in the icon rail.
    )
)

REM Start in the CCASP project root so detect_project_root() finds .claude/
REM "start /b" detaches the process so the cmd window closes immediately
start "" /b /d "%PROJECT_DIR%" "%NEOVIDE%" --frame none -- --clean -c "lua vim.opt.runtimepath:prepend('%PLUGIN_DIR:\=/%')" -c "lua require('ccasp').setup({layout='appshell'})" -c "lua require('ccasp').open()"
