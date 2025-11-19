@echo off
setlocal
REM EISLAW — single entry to start everything for a coding session
cd /d "%~dp0"

REM Prefer PowerShell 7 if available
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\session_start.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\session_start.ps1"
)

echo.
echo If anything failed, open docs\SESSION_READINESS.md.
pause

