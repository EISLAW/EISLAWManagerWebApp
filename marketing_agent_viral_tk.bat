@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: marketing_agent_viral_tk.bat ^<transcript.txt^> "^<brief^>"
  exit /b 1
)
set T=%1
shift
set B=%*
python tools\marketing_agent\marketing_agent.py --transcript "%T%" --brief "%B%" --prompt "tools\marketing_agent\prompt_marketing_agent_viral.txt"

