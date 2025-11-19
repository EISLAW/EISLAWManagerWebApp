@echo off
setlocal
REM Run quick local smoke test (backend + build/preview frontend + UI probe)
cd /d "%~dp0"

where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_smoke.ps1"
) else (
  powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_smoke.ps1"
)

echo.
echo See tools\playwright_probe_result.json and tools\playwright_probe.png for details.
pause

