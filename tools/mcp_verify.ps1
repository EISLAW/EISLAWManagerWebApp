Param()
$ErrorActionPreference = 'Stop'
Write-Host 'MCP verify — starting' -ForegroundColor Cyan

$result = [ordered]@{
  timestamp = (Get-Date).ToString('s')
  configPath = Join-Path $env:USERPROFILE '.codex\config.toml'
  configExists = $false
  vscodeSettings = Join-Path $env:APPDATA 'Code\User\settings.json'
  vscodeOverridesPresent = $false
  packages = @{}
  localSmoke = $false
}

# Config checks
if (Test-Path $result.configPath) { $result.configExists = $true }
try {
  if (Test-Path $result.vscodeSettings) {
    $json = Get-Content $result.vscodeSettings -Raw | ConvertFrom-Json
    # Treat any explicit codex.configPath override as an override; default is preferred
    if ($json.'codex.configPath') { $result.vscodeOverridesPresent = $true }
  }
} catch {}

# NPM package availability
$pkgs = @(
  '@modelcontextprotocol/server-filesystem',
  '@kevinwatt/shell-mcp',
  '@playwright/mcp',
  '@upstash/context7-mcp',
  '@imazhar101/mcp-puppeteer-server'
)
foreach($p in $pkgs){
  try { $v = (npm view $p version) 2>$null; $result.packages[$p] = @{ version = $v; ok = $true } }
  catch { $result.packages[$p] = @{ version = $null; ok = $false; error = $_.Exception.Message } }
}

# Local stdio MCP smoke
try {
  pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'mcp-local/smoke.ps1') | Out-Null
  if ($LASTEXITCODE -eq 0) { $result.localSmoke = $true }
} catch { }

$outPath = Join-Path $PSScriptRoot 'mcp_verify_result.json'
$result | ConvertTo-Json -Depth 6 | Set-Content -Path $outPath -Encoding UTF8
Write-Host ("Result saved to: {0}" -f $outPath) -ForegroundColor Green
if (-not $result.configExists) {
  Write-Warning 'MCP config missing at default location ~/.codex/config.toml.'
  exit 1
}
if ($result.vscodeOverridesPresent) {
  Write-Warning 'VS Code settings contain codex.configPath override; consider removing to use the default.'
}
Write-Host 'MCP verify — done' -ForegroundColor Cyan
