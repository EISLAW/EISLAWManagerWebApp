@echo off
setlocal

set "WSL_EXE=%SystemRoot%\System32\wsl.exe"
set "BASE_WSL=/mnt/c/Coding Projects"
set "LOCAL_MCP_DIR=%BASE_WSL%/EISLAW System/tools/mcp-local"

echo Starting EISLAW local MCP (WSL)...
start "MCP Local" "%WSL_EXE%" --cd "%LOCAL_MCP_DIR%" node server.js

echo Starting Playwright MCP (WSL)...
start "Playwright MCP" "%WSL_EXE%" --cd "%BASE_WSL%" npx @playwright/mcp@latest --allowed-hosts localhost --port 3001 --host localhost

echo MCP servers launched in background windows. Close those windows to stop the servers.
endlocal
