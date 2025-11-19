param(
  [switch]$InstallLocal = $true
)

$ErrorActionPreference = 'Stop'

# 1) Local MCP (shell/files/open) using @modelcontextprotocol/sdk
if($InstallLocal){
  $dir = Join-Path $PSScriptRoot 'mcp-local'
  if(-not (Test-Path (Join-Path $dir 'node_modules'))){
    Push-Location $dir
    npm install | Out-Null
    Pop-Location
  }
  Write-Host "Local MCP server ready: node tools/mcp-local/server.js" -ForegroundColor Green
}

# 2) Task Scheduler entry (start on login)
$taskName = 'EISLAW-MCP-Local'
$scriptPath = (Join-Path $PSScriptRoot 'mcp-local\server.js')
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument "`"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden
try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Write-Host "Scheduled task '$taskName' created to start MCP on login." -ForegroundColor Green
} catch {
  Write-Warning "Failed to create scheduled task: $($_.Exception.Message)"
}

Write-Host "Run now: node tools/mcp-local/server.js (stdio MCP)" -ForegroundColor Yellow

