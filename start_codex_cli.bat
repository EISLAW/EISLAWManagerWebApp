@echo off
setlocal
set "ROOT=%~dp0"
set "CODEX_EXE=%LOCALAPPDATA%\Programs\Codex\codex.exe"
if not exist "%CODEX_EXE%" set "CODEX_EXE=codex.exe"

REM Canonical config path (VS Code default). Avoid setting CODEX_CONFIG* env vars.
set "CFG=C:\Users\USER\.codex\config.toml"

echo === Launching Codex CLI with MCP config (no env overrides) ===
if not exist "%CFG%" (
  echo ERROR: Config file not found at "%CFG%".
  echo Create it or run Codex in VS Code (which also uses this default).
  goto :done
)

echo Config: %CFG%
start "Codex CLI" "%CODEX_EXE%" --config "%CFG%"
echo Codex CLI launched. If it fails, ensure codex.exe is installed or update CODEX_EXE.

:done
endlocal
