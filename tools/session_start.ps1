$ErrorActionPreference = 'Stop'

function Prefer-Pwsh { if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' } }

Write-Host 'EISLAW — Session Start' -ForegroundColor Cyan
Set-Location (Split-Path $PSScriptRoot -Parent)

# 1) Ensure native folder open protocol (idempotent)
try { & (Prefer-Pwsh) -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install_open_protocol.ps1') } catch { Write-Warning $_.Exception.Message }

# 2) Ensure local MCP server installed + auto-start, and start it now
try { & (Prefer-Pwsh) -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'mcp_bridge_setup.ps1') } catch { Write-Warning $_.Exception.Message }
Start-Process -FilePath (Join-Path (Get-Location) 'start_mcp.bat') | Out-Null

# 3) Start backend + frontend dev (opens terminals + browser)
& (Prefer-Pwsh) -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'dev_start.ps1')

# 4) Quick readiness checks
Start-Sleep -Seconds 6
$backend = 'http://127.0.0.1:8788/health'
$frontend = 'http://localhost:5173/'
function Get-Status($u){ try { (Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 5).StatusCode } catch { 0 } }
$b = Get-Status $backend
$f = Get-Status $frontend

Write-Host ("Backend: {0}  Frontend: {1}" -f $b, $f) -ForegroundColor Green

# 5a) Outlook warm-up disabled by default to prevent unwanted windows.
# Re-enable by setting $env:DEV_OUTLOOK_WARMUP='1' before running this script.
try {
  if (($env:DEV_OUTLOOK_WARMUP -eq '1') -and ($env:DEV_DESKTOP_ENABLE -or $env:DEV_ENABLE_OPEN)) {
    Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'http://127.0.0.1:8788/dev/open_outlook_app' -ContentType 'application/json' -Body '{}' | Out-Null
    Write-Host 'Outlook app-window warmed.' -ForegroundColor Yellow
  } else {
    Write-Host 'Outlook warm-up: skipped (DEV_OUTLOOK_WARMUP not set).' -ForegroundColor DarkYellow
  }
} catch { Write-Warning "Outlook warm-up failed: $($_.Exception.Message)" }

# 5) Optional UI probe via Playwright (ignore failures)
try {
  $probe = Join-Path (Split-Path $PSScriptRoot -Parent) 'tools/playwright_probe.mjs'
  if (Test-Path $probe) {
    $out = Join-Path (Split-Path $PSScriptRoot -Parent) 'tools/playwright_probe_result.json'
    node $probe 'http://localhost:5173/#/' | Set-Content -Path $out -Encoding UTF8
    Write-Host "UI probe saved to: $out" -ForegroundColor Yellow
  }
} catch { Write-Warning "Probe failed: $($_.Exception.Message)" }

Write-Host 'Session ready. If any item is 0, see docs/SESSION_READINESS.md.' -ForegroundColor Cyan
