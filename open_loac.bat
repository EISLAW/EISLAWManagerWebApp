@echo off
setlocal
cd /d "%~dp0"

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_start.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_start.ps1"
)

endlocal
