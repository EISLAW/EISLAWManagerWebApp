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

set "BACKEND_PORT=8799"
set "FRONTEND_PORT=5173"

REM Start backend (uvicorn) in its own window
start "EISLAW Backend (uvicorn)" %_PS% -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "cd '%~dp0'; . .venv/bin/activate 2>$null; python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port %BACKEND_PORT% --reload"

REM Start frontend (Vite) in its own window
start "EISLAW Frontend (Vite)" %_PS% -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "cd '%~dp0frontend'; npm run dev -- --host --port %FRONTEND_PORT%"

REM Start MCP bridge (local) from WSL
set "WSL_EXE=%SystemRoot%\System32\wsl.exe"
set "BASE_WSL=/mnt/c/Coding Projects"
set "LOCAL_MCP_DIR=%BASE_WSL%/EISLAW System/tools/mcp-local"
start "MCP Local" "%WSL_EXE%" --cd "%LOCAL_MCP_DIR%" node server.js

REM Optional: Playwright MCP (comment out if not needed)
set "PLAYWRIGHT_PORT=3001"
start "Playwright MCP" "%WSL_EXE%" --cd "%BASE_WSL%" npx @playwright/mcp@latest --allowed-hosts localhost --port %PLAYWRIGHT_PORT% --host localhost

REM Open the app in the browser
start "" "http://localhost:%FRONTEND_PORT%/#/clients"

echo.
echo Started backend:%BACKEND_PORT%, frontend:%FRONTEND_PORT%, MCP bridge, Playwright MCP.
echo Close the spawned terminal windows to stop them.
endlocal
