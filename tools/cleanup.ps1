param(
  [switch]$Delete,
  [switch]$Deep
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSCommandPath -Parent) | Out-Null
$repo = (Resolve-Path '..').Path
Set-Location $repo

function Add-Candidate($path){
  if(Test-Path $path){ [PSCustomObject]@{ Path = (Resolve-Path $path).Path; Type = (Get-Item $path).PSIsContainer ? 'dir' : 'file' } }
}

$candidates = @()

# Safe, rebuildable outputs
$candidates += Add-Candidate 'build'
$candidates += Add-Candidate 'frontend/dist'
$candidates += Add-Candidate 'tools/playwright_probe_result.json'
$candidates += Add-Candidate 'tools/playwright_probe.png'
$candidates += Add-Candidate 'tools/mcp-local/out'

# Python caches
Get-ChildItem -Recurse -Force -Directory -Filter '__pycache__' | ForEach-Object { $candidates += [PSCustomObject]@{ Path = $_.FullName; Type='dir' } }
Get-ChildItem -Recurse -Force -File -Include '*.pyc' | ForEach-Object { $candidates += [PSCustomObject]@{ Path = $_.FullName; Type='file' } }

# Optional: node_modules (large)
if($Deep){
  $candidates += Add-Candidate 'frontend/node_modules'
  $candidates += Add-Candidate 'tools/node_modules'
  $candidates += Add-Candidate 'tools/mcp-local/node_modules'
}

# De-duplicate
$candidates = $candidates | Where-Object { $_ } | Sort-Object -Property Path -Unique

if(-not $Delete){
  Write-Host 'Cleanup preview (use -Delete to remove):' -ForegroundColor Cyan
  $candidates | Format-Table -AutoSize
  return
}

Write-Host 'Removing candidates...' -ForegroundColor Yellow
foreach($item in $candidates){
  try{
    if($item.Type -eq 'dir'){ Remove-Item -Recurse -Force -LiteralPath $item.Path }
    else { Remove-Item -Force -LiteralPath $item.Path }
    Write-Host "Removed: $($item.Path)" -ForegroundColor DarkGray
  } catch { Write-Warning "Failed: $($item.Path) — $($_.Exception.Message)" }
}
Write-Host 'Cleanup complete.' -ForegroundColor Green

