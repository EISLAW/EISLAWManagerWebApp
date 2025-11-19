@echo off
setlocal
cd /d "%~dp0"

REM Prefer PowerShell Core if available
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
  set "_PS=pwsh"
) else (
  set "_PS=powershell"
)

REM Load dev env vars (enables DEV_ENABLE_OPEN/DEV_DESKTOP_ENABLE, sets VITE_API_URL, etc.)
%_PS% -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_env.ps1"

set "BACKEND_PORT=8799"
set "FRONTEND_PORT=5173"

REM Start backend (uvicorn) in its own window
start "EISLAW Backend (uvicorn)" %_PS% -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "cd '%~dp0'; python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port %BACKEND_PORT% --reload"

REM Start frontend (Vite) in its own window
start "EISLAW Frontend (Vite)" %_PS% -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "cd '%~dp0frontend'; npm run dev -- --host --port %FRONTEND_PORT%"

REM Open the app in the browser
start "" "http://localhost:%FRONTEND_PORT%/#/clients"

endlocal
