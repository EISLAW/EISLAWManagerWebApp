param(
  [Parameter(Mandatory=$true)][string]$SubscriptionId,
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$false)][string]$AppId,
  [Parameter(Mandatory=$false)][string]$ServicePrincipalObjectId,
  [Parameter(Mandatory=$false)][string]$StorageAccountName
)

$ErrorActionPreference = 'Stop'

function Get-Secrets {
  $p = Join-Path $PSScriptRoot '..\secrets.local.json'
  if (-not (Test-Path $p)) { throw "Missing secrets: $p" }
  return (Get-Content $p -Raw | ConvertFrom-Json)
}

function Get-DeviceToken([string]$TenantId, [string]$ClientId, [string]$Scope){
  $dcUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/devicecode"
  $tokUri = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
  $dc = Invoke-RestMethod -Method Post -Uri $dcUri -Body @{ client_id=$ClientId; scope=$Scope } -ContentType 'application/x-www-form-urlencoded'
  Write-Host "\nTo authorize, open" $dc.verification_uri "and enter code:" $dc.user_code -ForegroundColor Yellow
  $body = @{ grant_type='urn:ietf:params:oauth:grant-type:device_code'; client_id=$ClientId; device_code=$dc.device_code }
  $token = $null
  $deadline = (Get-Date).AddSeconds([int]$dc.expires_in)
  while(-not $token){
    Start-Sleep -Seconds ([int]$dc.interval)
    try {
      $token = Invoke-RestMethod -Method Post -Uri $tokUri -Body $body -ContentType 'application/x-www-form-urlencoded'
    } catch {
      if ((Get-Date) -gt $deadline) { throw "Device code expired. Please rerun." }
    }
  }
  return $token.access_token
}

function Ensure-SpId([string]$TenantId, [string]$AppId, [string]$GraphToken){
  if (-not $AppId) { return $null }
  $headers = @{ Authorization = "Bearer $GraphToken" }
  $url = "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=" + [uri]::EscapeDataString("appId eq '$AppId'")
  $sp = Invoke-RestMethod -Headers $headers -Method Get -Uri $url
  return $sp.value[0].id
}

$sec = Get-Secrets
$tenant = $sec.microsoft_graph.tenant_id
$appId = if ($AppId) { $AppId } else { $sec.microsoft_graph.client_id }

# Azure CLI public client id (device flow)
$publicClientId = '04b07795-8ddb-461a-bbee-02f9e1bf7b46'  # Azure CLI AAD app id

# 1) Get Graph token (user) and resolve SP object id if needed
if (-not $ServicePrincipalObjectId) {
  $graphTok = Get-DeviceToken -TenantId $tenant -ClientId $publicClientId -Scope 'https://graph.microsoft.com/.default offline_access'
  $ServicePrincipalObjectId = Ensure-SpId -TenantId $tenant -AppId $appId -GraphToken $graphTok
  if (-not $ServicePrincipalObjectId) { throw "Could not resolve Service Principal for appId $appId" }
}

# 2) Get ARM token (user) for role assignments
$armTok = Get-DeviceToken -TenantId $tenant -ClientId $publicClientId -Scope 'https://management.azure.com/.default offline_access'
$armHeaders = @{ Authorization = "Bearer $armTok"; 'Content-Type'='application/json' }

# Contributor on RG
$roleDefContributor = 'b24988ac-6180-42a0-ab88-20f7382dd24c'
$rdId = "/subscriptions/$SubscriptionId/providers/Microsoft.Authorization/roleDefinitions/$roleDefContributor"
$assignId = [guid]::NewGuid().Guid
$rgScope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup"
$uri = "https://management.azure.com$rgScope/providers/Microsoft.Authorization/roleAssignments/$assignId?api-version=2022-04-01"
$body = @{ properties = @{ roleDefinitionId = $rdId; principalId = $ServicePrincipalObjectId } } | ConvertTo-Json -Depth 5
Write-Host "Assigning Contributor on $rgScope to $ServicePrincipalObjectId ..." -ForegroundColor Cyan
Invoke-RestMethod -Method Put -Uri $uri -Headers $armHeaders -Body $body | Out-Null

if ($StorageAccountName) {
  $roleDefBlob = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe' # Storage Blob Data Contributor
  $rdBlob = "/subscriptions/$SubscriptionId/providers/Microsoft.Authorization/roleDefinitions/$roleDefBlob"
  $saScope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Storage/storageAccounts/$StorageAccountName"
  $assignId2 = [guid]::NewGuid().Guid
  $uri2 = "https://management.azure.com$saScope/providers/Microsoft.Authorization/roleAssignments/$assignId2?api-version=2022-04-01"
  $body2 = @{ properties = @{ roleDefinitionId = $rdBlob; principalId = $ServicePrincipalObjectId } } | ConvertTo-Json -Depth 5
  Write-Host "Assigning Storage Blob Data Contributor on $saScope ..." -ForegroundColor Cyan
  Invoke-RestMethod -Method Put -Uri $uri2 -Headers $armHeaders -Body $body2 | Out-Null
}

Write-Host "Role assignments completed." -ForegroundColor Green

