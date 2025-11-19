$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$true)][string]$WebAppName,
  [string]$SecretsPath = (Join-Path $PSScriptRoot '..' 'secrets.local.json'),
  [string]$ReportLinkHost = ''
)

if (!(Test-Path $SecretsPath)) { throw "Secrets file not found: $SecretsPath" }
$sec = Get-Content $SecretsPath -Raw | ConvertFrom-Json

$fill = $sec.fillout
$air  = $sec.airtable
$gr   = $sec.microsoft_graph

if (-not $ReportLinkHost) { $ReportLinkHost = "https://$WebAppName.azurewebsites.net" }

$settings = @{
  FILLOUT_API_KEY   = ($fill.api_key   | ForEach-Object { "$_" })
  AIRTABLE_TOKEN    = ($air.token      | ForEach-Object { "$_" })
  AIRTABLE_BASE_ID  = ($air.base_id    | ForEach-Object { "$_" })
  AIRTABLE_TABLE_ID = ($air.table_id   | ForEach-Object { "$_" })
  AIRTABLE_VIEW     = ($air.view       | ForEach-Object { "$_" })
  GRAPH_CLIENT_ID   = ($gr.client_id   | ForEach-Object { "$_" })
  GRAPH_CLIENT_SECRET = ($gr.client_secret | ForEach-Object { "$_" })
  GRAPH_TENANT_ID   = ($gr.tenant_id   | ForEach-Object { "$_" })
  GRAPH_MAILBOX     = ($gr.mailbox     | ForEach-Object { "$_" })
  REPORT_LINK_HOST  = $ReportLinkHost
}

Write-Host "Setting app settings on $WebAppName in $ResourceGroup ..." -ForegroundColor Cyan

$kv = @()
foreach ($k in $settings.Keys) {
  if ($settings[$k]) { $kv += "$k=$($settings[$k])" }
}

if ($kv.Count -eq 0) { throw "No settings to apply (empty secrets?)" }

az webapp config appsettings set -g $ResourceGroup -n $WebAppName --settings @kv | Out-Null
Write-Host "Done." -ForegroundColor Green

