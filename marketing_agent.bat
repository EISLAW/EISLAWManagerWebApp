@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: marketing_agent.bat ^<transcript.txt^> "^<brief^>" [--provider gemini|openai|anthropic] [--model NAME] [--prompt PATH]
  echo Example: marketing_agent.bat transcripts\call.txt "מייל שיווקי" --prompt tools\marketing_agent\prompt_marketing_agent_viral.txt
  exit /b 1
)
set T=%1
shift
set B=%1
shift
python tools\marketing_agent\marketing_agent.py --transcript "%T%" --brief "%B%" %*
