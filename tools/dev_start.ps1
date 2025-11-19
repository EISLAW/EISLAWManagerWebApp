$ErrorActionPreference = 'Stop'

# Repo root
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repo

# Load dev env (Graph creds, VITE_API_URL, CORS)
. (Join-Path $PSScriptRoot 'dev_env.ps1')

# Start backend (FastAPI + reload) in a new terminal (use python -m to avoid PATH issues)
$py = (Get-Command python).Source
Start-Process pwsh -WorkingDirectory $repo -ArgumentList '-NoExit','-Command',"& '$py' -m uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788 --reload" | Out-Null

# Start frontend (Vite dev server) in a new terminal
Start-Process pwsh -WorkingDirectory (Join-Path $repo 'frontend') -ArgumentList '-NoExit','-Command','npm run dev' | Out-Null

# Open browser to the dashboard
Start-Process 'http://localhost:5173/#/' | Out-Null

Write-Host 'Started backend on http://127.0.0.1:8788 and frontend on http://localhost:5173' -ForegroundColor Green
