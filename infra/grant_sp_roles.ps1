param(
  [Parameter(Mandatory=$true)][string]$SubscriptionId,
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$false)][string]$AppId,
  [Parameter(Mandatory=$false)][string]$ServicePrincipalObjectId,
  [Parameter(Mandatory=$false)][string]$StorageAccountName
)

$ErrorActionPreference = 'Stop'

# Resolve Azure CLI path explicitly (works even if PATH missing)
$azCandidates = @(
  'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd',
  'C:\\Program Files (x86)\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd',
  'az'
)
$az = $azCandidates | Where-Object { $_ -eq 'az' -or (Test-Path $_) } | Select-Object -First 1
if (-not $az) { throw 'Azure CLI not found. Please install or add to PATH.' }

Write-Host "Login to Azure (device code)..." -ForegroundColor Cyan
& $az login --use-device-code | Out-Null
& $az account set --subscription $SubscriptionId

if (-not $ServicePrincipalObjectId -and $AppId) {
  $spJson = & $az ad sp list --filter "appId eq '$AppId'" --query "[0].id" -o tsv
  if (-not $spJson) { throw "Service principal for appId $AppId not found" }
  $ServicePrincipalObjectId = $spJson
}
if (-not $ServicePrincipalObjectId) { throw "Provide -AppId or -ServicePrincipalObjectId" }

$scope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup"
Write-Host "Granting Contributor on $scope to $ServicePrincipalObjectId ..." -ForegroundColor Yellow
& $az role assignment create --assignee-object-id $ServicePrincipalObjectId --assignee-principal-type ServicePrincipal --role Contributor --scope $scope | Out-Null

if ($StorageAccountName) {
  $storageScope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Storage/storageAccounts/$StorageAccountName"
  Write-Host "Granting Storage Blob Data Contributor on $storageScope ..." -ForegroundColor Yellow
  & $az role assignment create --assignee-object-id $ServicePrincipalObjectId --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" --scope $storageScope | Out-Null
}

Write-Host "Done." -ForegroundColor Green
