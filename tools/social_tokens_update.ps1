param(
  [Parameter(Mandatory=$true)]
  [string]$UserToken
)

$ErrorActionPreference = 'Stop'

$secretsPath = Join-Path $PSScriptRoot '..\secrets.local.json'
if (-not (Test-Path $secretsPath)) { throw "Missing secrets at $secretsPath" }

$secrets = Get-Content $secretsPath -Raw | ConvertFrom-Json

# Get Page token from /me/accounts
$pages = Invoke-RestMethod -Uri ("https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=$UserToken") -Method Get
if (-not $pages.data -or $pages.data.Count -lt 1) { throw 'No pages returned for this user token' }
$page = $pages.data[0]

# Update secrets
if (-not $secrets.instagram) { $secrets | Add-Member -NotePropertyName instagram -NotePropertyValue (@{}) }
$secrets | Add-Member -NotePropertyName facebook_user -NotePropertyValue (@{ access_token = $UserToken }) -Force
$secrets | Add-Member -NotePropertyName facebook_page -NotePropertyValue (@{ page_id = $page.id; access_token = $page.access_token }) -Force
$secrets.instagram | Add-Member -NotePropertyName page_id -NotePropertyValue $page.id -Force
$secrets.instagram | Add-Member -NotePropertyName page_access_token -NotePropertyValue $page.access_token -Force

$secrets | ConvertTo-Json -Depth 12 | Set-Content -Path $secretsPath -Encoding UTF8
Write-Host "Updated page $($page.id) and user token in secrets.local.json" -ForegroundColor Green
