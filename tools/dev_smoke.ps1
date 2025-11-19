param(
  [string]$ClientName = 'סיון בנימיני'
)

$ErrorActionPreference = 'Stop'

Write-Host "Setting dev environment..." -ForegroundColor Cyan
. (Join-Path $PSScriptRoot 'dev_env.ps1')

# Start backend
Write-Host "Starting backend (uvicorn)..." -ForegroundColor Cyan
$backend = Start-Process -FilePath (Get-Command python).Source -ArgumentList '-m','uvicorn','scoring_service.main:app','--host','127.0.0.1','--port','8788','--reload' -PassThru

function Wait-Url($u,$timeoutSec=30){
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while((Get-Date) -lt $deadline){
    try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ return $true } } catch {}
    Start-Sleep -Milliseconds 500
  }
  return $false
}

if(-not (Wait-Url 'http://127.0.0.1:8788/health' 25)) { throw 'Backend did not start' }

# Build + preview frontend (static) for smoke
Write-Host "Building frontend..." -ForegroundColor Cyan
Push-Location (Join-Path (Split-Path $PSScriptRoot -Parent) 'frontend')
if(-not (Test-Path 'node_modules')){ npm ci | Out-Null }
npm run build | Out-Null
Write-Host "Starting vite preview..." -ForegroundColor Cyan
$preview = Start-Process -FilePath (Get-Command npm).Source -ArgumentList 'run','preview','--','--host','127.0.0.1','--port','4173' -PassThru
Pop-Location

if(-not (Wait-Url 'http://127.0.0.1:4173' 20)) { throw 'Frontend preview did not start' }

# API checks
$nameEnc = [uri]::EscapeDataString($ClientName)
$health  = (Invoke-WebRequest -Uri 'http://127.0.0.1:8788/health' -UseBasicParsing).StatusCode
$clients = (Invoke-WebRequest -Uri 'http://127.0.0.1:8788/api/clients' -UseBasicParsing).StatusCode
$locs    = (Invoke-WebRequest -Uri "http://127.0.0.1:8788/api/client/locations?name=$nameEnc" -UseBasicParsing).Content

# UI probe
node (Join-Path $PSScriptRoot 'playwright_probe.mjs') 'http://127.0.0.1:4173/#/' | Set-Content (Join-Path $PSScriptRoot 'playwright_probe_result.json')

Write-Host "\nSmoke results:" -ForegroundColor Green
Write-Host ("health={0}  clients={1}" -f $health, $clients)
Write-Host ("locations={0}" -f $locs)
Write-Host ("probeJson={0}" -f (Join-Path $PSScriptRoot 'playwright_probe_result.json'))

Write-Host "\nTo stop servers, close the terminals or kill PIDs: backend=$($backend.Id) preview=$($preview.Id)" -ForegroundColor Yellow

