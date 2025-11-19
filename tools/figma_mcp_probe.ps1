param(
  [string]$Url = 'http://127.0.0.1:3845/mcp'
)

$ErrorActionPreference = 'Stop'
try {
  $res = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2 -Method GET
  $code = $res.StatusCode
  if ($code -ge 200 -and $code -lt 300) {
    Write-Output (@{ ok = $true; status = $code; reachable = $true } | ConvertTo-Json -Compress)
  } else {
    # Many MCP servers return 400 on GET; consider it reachable
    Write-Output (@{ ok = $true; status = $code; reachable = $true; note = 'non-200 (expected for MCP GET)' } | ConvertTo-Json -Compress)
  }
} catch {
  $resp = $_.Exception.Response
  if ($resp -and $resp.StatusCode.value__ -eq 400) {
    Write-Output (@{ ok = $true; reachable = $true; status = 400; note = 'MCP endpoint reachable; handshake required' } | ConvertTo-Json -Compress)
    exit 0
  }
  Write-Output (@{ ok = $false; reachable = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
  exit 1
}
