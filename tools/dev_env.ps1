param(
  [switch]$PrintOnly
)

$ErrorActionPreference = 'Stop'

function Load-Secrets {
  $p = Join-Path $PSScriptRoot '..' 'secrets.local.json'
  if (-not (Test-Path $p)) { throw "Missing secrets: $p" }
  return (Get-Content $p -Raw | ConvertFrom-Json)
}

$sec = Load-Secrets

# Backend (Graph)
$env:GRAPH_CLIENT_ID     = $sec.microsoft_graph.client_id
$env:GRAPH_CLIENT_SECRET = $sec.microsoft_graph.client_secret
$env:GRAPH_TENANT_ID     = $sec.microsoft_graph.tenant_id
$env:GRAPH_ENDPOINT      = 'https://graph.microsoft.com/v1.0'
$env:GRAPH_MAILBOX       = 'eitan@eislaw.co.il'

# Frontend API base for dev
$env:VITE_API_URL        = 'http://127.0.0.1:8799'
$env:VITE_MODE           = 'LOCAL'
$env:VITE_HIDE_OUTLOOK   = '0'
$env:VITE_TASKS_NEW      = '1'

# FastAPI dev CORS
$env:DEV_CORS_ORIGINS    = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'

# Enable local folder open endpoint
$env:DEV_ENABLE_OPEN     = '1'
$env:DEV_DESKTOP_ENABLE  = '1'

# SharePoint mapping (adjust if needed)
$env:SP_SITE_PATH        = 'eislaw.sharepoint.com:/sites/EISLAWTEAM'
$env:SP_DOC_BASE         = 'לקוחות משרד'
# Optional: specify library/drive display name (e.g., 'Documents' or 'מסמכים')
# $env:SP_DRIVE_NAME     = 'Documents'

if ($PrintOnly) {
  Write-Host "Set for current session:" -ForegroundColor Cyan
  Get-ChildItem Env:GRAPH_* , Env:VITE_API_URL , Env:DEV_CORS_ORIGINS | Format-Table -AutoSize
  return
}

Write-Host "Development environment variables set for this session." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1) Start backend:  uvicorn scoring_service.main:app --host 127.0.0.1 --port 8799 --reload"
Write-Host "2) Start frontend: (cd frontend; npm run dev)"
