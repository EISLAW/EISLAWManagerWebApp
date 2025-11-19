@echo off
setlocal
cd /d "%~dp0\.."
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File tools\dev_env.ps1 | out-null
)
echo Syncing emails for participants: yael@eislaw.co.il (last 90 days)
python tools\email_sync_worker.py --participants yael@eislaw.co.il --since-days 90
endlocal

