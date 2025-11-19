Param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function New-ArchiveRoot {
  $root = 'C:\Coding Projects\_Archive'
  if (-not (Test-Path $root)) { New-Item -ItemType Directory -Path $root | Out-Null }
  $stamp = (Get-Date).ToString('yyyyMMdd-HHmm')
  $dest = Join-Path $root $stamp
  if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
  return $dest
}

function Move-ItemSafe([string]$path, [string]$archiveRoot){
  if (-not (Test-Path $path)) { return $false }
  $rel = ($path -replace '^C:\\Coding Projects\\','') -replace '^[\\/]',''
  $dest = Join-Path $archiveRoot ($rel -replace '[\\/:*?"<>|]','_')
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  if ($DryRun) { Write-Host "DRYRUN: move '$path' -> '$dest'" -ForegroundColor Yellow; return $true }
  try { Move-Item -Path $path -Destination $dest -Force } catch { Copy-Item -Path $path -Destination $dest -Recurse -Force; Remove-Item -Path $path -Recurse -Force }
  return $true
}

function Write-Log($obj){ $global:LOG += ,$obj }

$global:LOG = @()
$archive = New-ArchiveRoot

Write-Host "Workspace organizer — archive at: $archive" -ForegroundColor Cyan

# 1) EISLAW-WebApp — keep only forwarder launcher; archive duplicates
$webApp = 'C:\Coding Projects\EISLAW-WebApp'
if (Test-Path $webApp) {
  $keep = @('session_start.bat','README-Forwarded.md')
  Get-ChildItem -Path $webApp -Force | ForEach-Object {
    if ($keep -contains $_.Name) { return }
    $p = $_.FullName
    if (Move-ItemSafe -path $p -archiveRoot $archive) { Write-Log @{ action='archive'; path=$p } }
  }
}

# 2) EISLAW System — archive temp outputs and obvious build/test artifacts; keep app scripts
$sys = 'C:\Coding Projects\EISLAW System'
if (Test-Path $sys) {
  $candidates = @(
    'playwright-report',
    'test-results',
    'tmp_main_view.py',
    'tmp_clients.json',
    'sp_check_result.json',
    'openapi_dump.json'
  )
  foreach($c in $candidates){
    $p = Join-Path $sys $c
    if (Test-Path $p) {
      if (Move-ItemSafe -path $p -archiveRoot $archive) { Write-Log @{ action='archive'; path=$p } }
    }
  }
}

# 3) Do not touch TK app under AudoProcessor Iterations
Write-Log @{ note = 'TK app preserved'; path = 'C:\\Coding Projects\\AudoProcessor Iterations' }

# 4) Emit log json
$out = Join-Path $sys 'tools\organize_workspace_log.json'
($LOG | ConvertTo-Json -Depth 6) | Set-Content -Path $out -Encoding UTF8
Write-Host ("Log saved: {0}" -f $out) -ForegroundColor Green

Write-Host 'Done.' -ForegroundColor Cyan

