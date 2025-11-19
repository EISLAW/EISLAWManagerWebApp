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

REM Load dev env vars (sets VITE_API_URL, DEV flags, etc.)
%_PS% -NoLogo -NoProfile -ExecutionPolicy Bypass -File "tools\dev_env.ps1"

set "API_PORT=8799"
set "WEB_PORT=8080"

REM Detect docker compose CLI
set "COMPOSE_CMD=docker compose"
where docker-compose >nul 2>&1 && set "COMPOSE_CMD=docker-compose"

REM Start the container stack in its own window (includes api, web, meili)
start "EISLAW Stack (Docker)" cmd /k "cd /d \"%~dp0\" && set API_PORT=%API_PORT% && set WEB_PORT=%WEB_PORT% && %COMPOSE_CMD% up --build"

REM Open the app in the browser (served from Nginx inside the web container)
start "" "http://localhost:%WEB_PORT%/#/rag"

echo.
echo Started docker compose stack (api:%API_PORT%, web:%WEB_PORT%). Close the compose window to stop it.
endlocal
