$ErrorActionPreference = 'Stop'

Write-Host 'EISLAW — Local Mode' -ForegroundColor Cyan
Set-Location (Split-Path $PSScriptRoot -Parent)

# 1) Ensure dev env vars (local API for frontend)
. (Join-Path $PSScriptRoot 'dev_env.ps1') | Out-Null
$port = 8799
$env:VITE_API_URL = "http://127.0.0.1:$port"

function Test-Http($url) {
  try { (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3).StatusCode } catch { 0 }
}

# 2) Backend (uvicorn) on $port — ensure correct API surface (with /email/*)
function Get-PortPid($port){
  try { (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1).OwningProcess } catch { $null }
}
function Stop-UvicornOnPort($port){
  try {
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'uvicorn' -and $_.CommandLine -match [regex]::Escape($port) } | ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
  } catch {}
  $pProc = Get-PortPid $port
  if ($pProc) { try { Stop-Process -Id $pProc -Force -ErrorAction SilentlyContinue } catch {} }
}

$needStart = $true
if ((Test-Http ("http://127.0.0.1:{0}/health" -f $port)) -eq 200) {
  try {
    $openapi = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/openapi.json" -f $port) -UseBasicParsing -TimeoutSec 5 | Select-Object -ExpandProperty Content
    if ($openapi -match '"/email/by_client"') {
      $needStart = $false
    } else {
      Write-Warning ("Existing backend on {0} lacks /email endpoints. Restarting…" -f $port)
      Stop-UvicornOnPort $port
      Start-Sleep -Seconds 1
    }
  } catch {
    # health passed but openapi failed → restart
    Stop-UvicornOnPort $port
  }
}
if ($needStart) {
  Write-Host ("Starting backend (127.0.0.1:{0})…" -f $port) -ForegroundColor Yellow
  $py = (Get-Command python).Source
  Start-Process pwsh -WorkingDirectory (Get-Location) -ArgumentList '-NoExit','-Command',("& '{0}' -m uvicorn scoring_service.main:app --host 127.0.0.1 --port {1} --reload" -f $py,$port) | Out-Null
}

# 3) Frontend (Vite dev) on 5173
if ((Test-Http 'http://127.0.0.1:5173') -eq 0) {
  Write-Host 'Starting frontend (localhost:5173)…' -ForegroundColor Yellow
  Start-Process pwsh -WorkingDirectory (Join-Path (Get-Location) 'frontend') -ArgumentList '-NoExit','-Command','npm run dev' | Out-Null
}

Start-Sleep -Seconds 3

# 4) Open the Clients page (always local)
$url = 'http://localhost:5173/#/clients'
Start-Process $url | Out-Null
Write-Host "Opened: $url" -ForegroundColor Green
Write-Host ("Local API base: http://127.0.0.1:{0}" -f $port) -ForegroundColor Green
