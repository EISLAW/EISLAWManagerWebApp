param(
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][string]$Email
)

$ErrorActionPreference = 'Stop'

function Load-Settings {
  $p = Join-Path $PSScriptRoot '..' '..' 'AudoProcessor Iterations' 'settings.json'
  if(-not (Test-Path $p)) { throw "Missing settings.json at $p" }
  return (Get-Content $p -Raw | ConvertFrom-Json)
}

$st = Load-Settings
$store = $st.by_os.windows.store_base
if(-not (Test-Path $store)) { throw "store_base not found: $store" }

$regPath = Join-Path $store 'clients.json'
if(-not (Test-Path $regPath)) {
  @{ clients = @() } | ConvertTo-Json -Depth 6 | Set-Content -Path $regPath -Encoding UTF8
}
$reg = Get-Content $regPath -Raw | ConvertFrom-Json
if(-not $reg.clients) { $reg | Add-Member -NotePropertyName clients -NotePropertyValue @() }

$folder = Join-Path $store $Name
New-Item -ItemType Directory -Force -Path $folder | Out-Null

$exists = $false
for($i=0; $i -lt $reg.clients.Count; $i++){
  $c = $reg.clients[$i]
  $dn = ($c.display_name, $c.name, $c.slug | Where-Object { $_ })[0]
  if($dn -eq $Name -or (Split-Path ($c.folder) -Leaf) -eq $Name){
    # update emails/folder
    if([string]::IsNullOrWhiteSpace($c.folder)) { $c | Add-Member -NotePropertyName folder -NotePropertyValue $folder -Force }
    $emails = @()
    if($c.email -is [string]){ $emails = @($c.email) } elseif($c.email){ $emails = @($c.email) } else { $emails = @() }
    if(-not ($emails -contains $Email)) { $emails += $Email }
    $c.email = $emails
    $exists = $true
    break
  }
}
if(-not $exists){
  $reg.clients += [pscustomobject]@{
    id = [guid]::NewGuid().ToString()
    display_name = $Name
    slug = $Name
    email = @($Email)
    folder = $folder
    created_at = (Get-Date).ToString('s')
    phone = ''
    notes = ''
    contacts = @()
  }
}

$reg | ConvertTo-Json -Depth 6 | Set-Content -Path $regPath -Encoding UTF8

Write-Host "Client added/updated:" -ForegroundColor Green
Write-Host " - Name: $Name" -ForegroundColor Yellow
Write-Host " - Email: $Email" -ForegroundColor Yellow
Write-Host " - Folder: $folder" -ForegroundColor Yellow

