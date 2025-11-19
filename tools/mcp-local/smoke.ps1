Param()
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSCommandPath -Parent)
Write-Host 'MCP smoke: starting server via test client (stdio)…' -ForegroundColor Cyan
node .\test_client.js
if ($LASTEXITCODE -eq 0) {
  Write-Host 'MCP smoke: OK' -ForegroundColor Green
  exit 0
} else {
  Write-Host "MCP smoke: FAILED ($LASTEXITCODE)" -ForegroundColor Red
  exit $LASTEXITCODE
}

