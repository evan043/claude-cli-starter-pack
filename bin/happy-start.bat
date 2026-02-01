@echo off
REM happy-start.bat - Launch Happy CLI with clean environment
REM Clears HAPPY_SERVER_URL to prevent 401 auth errors from stale Railway config
REM Auth token is issued for api.cluster-fluster.com, not the Railway URL

echo ========================================
echo Happy CLI Launcher
echo ========================================
echo.

REM CRITICAL: Unset the Railway URL that causes 401 errors
REM The token in .happy/access.key is for cluster-fluster.com
set HAPPY_SERVER_URL=
echo [OK] Cleared HAPPY_SERVER_URL env var

REM Change to provided directory or current directory
if "%~1"=="" echo [OK] Using current directory: %CD%
if not "%~1"=="" cd /d "%~1" && echo [OK] Changed to directory: %~1

echo.
echo Starting Happy CLI...
echo ========================================
echo.

REM Launch happy in this window
happy
