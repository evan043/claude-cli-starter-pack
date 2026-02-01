@echo off
REM happy-start.bat - Fallback launcher (prefer happy-start.ps1)
REM This batch file exists for compatibility but the PowerShell version is preferred

REM Check if PowerShell script exists and use it
if exist "%~dp0happy-start.ps1" (
    powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0happy-start.ps1"
    exit /b
)

REM Fallback: Run directly if no PowerShell script
echo ========================================
echo Happy CLI Launcher (batch fallback)
echo ========================================
echo.

set HAPPY_SERVER_URL=
echo [OK] Cleared HAPPY_SERVER_URL env var
echo.
echo Starting Happy CLI...
echo ========================================
echo.

happy
