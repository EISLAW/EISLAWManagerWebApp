param(
  [Parameter(Mandatory=$false)][string]$AppId = '',
  [Parameter(Mandatory=$false)][string]$ServicePrincipalObjectId = ''
)

$ErrorActionPreference = 'Stop'

function Get-Secrets {
  $p = Join-Path $PSScriptRoot '..\secrets.local.json'
  if (-not (Test-Path $p)) { throw "Missing secrets: $p" }
  return (Get-Content $p -Raw | ConvertFrom-Json)
}

function DeviceToken([string]$TenantId, [string]$ClientId, [string]$Scope){
  $dcUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/devicecode"
  $tokUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
  $dc = Invoke-RestMethod -Method Post -Uri $dcUri -Body @{ client_id=$ClientId; scope=$Scope } -ContentType 'application/x-www-form-urlencoded'
  Write-Host "To authorize Graph, open" $dc.verification_uri "and enter code:" $dc.user_code -ForegroundColor Yellow
  $body = @{ grant_type='urn:ietf:params:oauth:grant-type:device_code'; client_id=$ClientId; device_code=$dc.device_code }
  $deadline = (Get-Date).AddSeconds([int]$dc.expires_in)
  while ($true) {
    Start-Sleep -Seconds ([int]$dc.interval)
    try { return (Invoke-RestMethod -Method Post -Uri $tokUri -Body $body -ContentType 'application/x-www-form-urlencoded').access_token } catch { if ((Get-Date) -gt $deadline){ throw 'Device code expired' } }
  }
}

$sec = Get-Secrets
$tenant = $sec.microsoft_graph.tenant_id
$appId  = if ($AppId) { $AppId } else { $sec.microsoft_graph.client_id }

# Azure CLI public client id for device flow
$publicClientId = '04b07795-8ddb-461a-bbee-02f9e1bf7b46'
$graphTok = DeviceToken -TenantId $tenant -ClientId $publicClientId -Scope 'https://graph.microsoft.com/.default offline_access'
$H = @{ Authorization = "Bearer $graphTok"; 'Content-Type' = 'application/json' }

# Resolve our app + SP
$appQ = "https://graph.microsoft.com/v1.0/applications?`$filter=" + [uri]::EscapeDataString("appId eq '$appId'")
$app = Invoke-RestMethod -Headers $H -Method Get -Uri $appQ
if (-not $app.value) { throw "App $appId not found" }
$spQ = "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=" + [uri]::EscapeDataString("appId eq '$appId'")
$sp = Invoke-RestMethod -Headers $H -Method Get -Uri $spQ
if (-not $sp.value) { throw "Service principal for $appId not found" }
$spId = $sp.value[0].id

# Resolve Microsoft Graph SP and app roles
$graphSpQ = "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=" + [uri]::EscapeDataString("appId eq '00000003-0000-0000-c000-000000000000'")
$graphSp = (Invoke-RestMethod -Headers $H -Method Get -Uri $graphSpQ).value[0]
$roles = $graphSp.appRoles | Where-Object { $_.isEnabled -eq $true }

# Desired Application permissions (app roles by 'value')
$desired = @(
  'Files.Read.All',
  'Sites.Read.All',
  'Mail.Read',
  'Calendars.Read',
  'User.Read.All',
  'Directory.Read.All'
)

Write-Host "Granting Application permissions on Microsoft Graph to SP $spId ..." -ForegroundColor Cyan
foreach($val in $desired){
  $role = $roles | Where-Object { $_.value -eq $val } | Select-Object -First 1
  if (-not $role) { Write-Warning "Role value '$val' not found on Graph SP"; continue }
  $body = @{ principalId = $spId; resourceId = $graphSp.id; appRoleId = $role.id } | ConvertTo-Json
  try {
    Invoke-RestMethod -Headers $H -Method Post -Uri "https://graph.microsoft.com/v1.0/servicePrincipals/$spId/appRoleAssignments" -Body $body | Out-Null
    Write-Host "Assigned ${val}" -ForegroundColor Green
  } catch {
    Write-Warning "Failed ${val}: $($_.Exception.Message)"
  }
}

Write-Host "Done. Review in Entra → Enterprise apps → (your app) → Permissions." -ForegroundColor Green
