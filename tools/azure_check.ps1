param(
  [string]$SubscriptionId = ''
)

$ErrorActionPreference = 'Stop'

function Get-Secrets {
  $p = Join-Path $PSScriptRoot '..\secrets.local.json'
  if (-not (Test-Path $p)) { throw "Missing secrets: $p" }
  return (Get-Content $p -Raw | ConvertFrom-Json)
}

function Get-ArmToken($tenantId, $clientId, $clientSecret) {
  $body = @{
    grant_type = 'client_credentials'
    client_id = $clientId
    client_secret = $clientSecret
    scope = 'https://management.azure.com/.default'
  }
  $tok = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Body $body -ContentType 'application/x-www-form-urlencoded'
  return $tok.access_token
}

function Get-Json($uri, $token) {
  Invoke-RestMethod -Method Get -Uri $uri -Headers @{ Authorization = "Bearer $token" }
}

$secrets = Get-Secrets
$tenant = $secrets.microsoft_graph.tenant_id
$cid    = $secrets.microsoft_graph.client_id
$csec   = $secrets.microsoft_graph.client_secret
$token  = Get-ArmToken -tenantId $tenant -clientId $cid -clientSecret $csec

# List subscriptions accessible to this app
$subs = Get-Json -uri 'https://management.azure.com/subscriptions?api-version=2020-01-01' -token $token

# Choose subscription
if (-not $SubscriptionId -and $subs.value.Count -gt 0) { $SubscriptionId = $subs.value[0].subscriptionId }

$result = [ordered]@{}
$result.subscriptions = $subs.value | Select-Object subscriptionId, displayName, state

if ($SubscriptionId) {
  # Locations (enabled regions)
  $locs = Get-Json -uri "https://management.azure.com/subscriptions/$SubscriptionId/locations?api-version=2020-01-01" -token $token
  $result.subscription = $SubscriptionId
  $result.locations = $locs.value | Select-Object name, displayName, regionalDisplayName

  # Resource groups (permission sanity)
  try {
    $rgs = Get-Json -uri "https://management.azure.com/subscriptions/$SubscriptionId/resourcegroups?api-version=2021-04-01" -token $token
    $result.resourceGroups = $rgs.value | Select-Object name, location, properties
    $result.access = 'ok'
  } catch {
    $result.access = "failed: $($_.Exception.Message)"
  }
}

$result | ConvertTo-Json -Depth 6 | Write-Output
