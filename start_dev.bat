@echo off
setlocal
REM Launch EISLAW local dev (backend + frontend)
cd /d "%~dp0"

REM Prefer PowerShell 7 (pwsh), fallback to Windows PowerShell
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_start.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_start.ps1"
)

REM Keep the launcher window open in case it was double‑clicked
echo.
echo If terminals did not open, check PowerShell execution policy.
pause

