$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$true)][string]$WebAppName,   # e.g., eislaw-api-01
  [Parameter(Mandatory=$true)][string]$StorageName,  # e.g., eislawstweb
  [string]$SecretsPath = (Join-Path $PSScriptRoot '..' 'secrets.local.json')
)

function Step($msg){ Write-Host "==> $msg" -ForegroundColor Cyan }

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repo

Step "Package backend"
pwsh -NoLogo -NoProfile -File (Join-Path $PSScriptRoot 'package_backend.ps1')
$zip = Join-Path $repo 'build/webapp_package.zip'
if (!(Test-Path $zip)) { throw "Backend zip missing: $zip" }

Step "Deploy backend zip to $WebAppName"
az webapp deploy -g $ResourceGroup -n $WebAppName --src-path $zip --type zip | Out-Null

Step "Apply app settings from secrets"
pwsh -NoLogo -NoProfile -File (Join-Path $PSScriptRoot 'set_app_settings.ps1') -ResourceGroup $ResourceGroup -WebAppName $WebAppName -SecretsPath $SecretsPath

Step "Build frontend"
Push-Location (Join-Path $repo 'frontend')
npm install --silent | Out-Null
npx vite build | Out-Null
Pop-Location

Step "Upload frontend to static website ($StorageName)"
az storage blob upload-batch -s (Join-Path $repo 'frontend/dist') -d '$web' --account-name $StorageName --auth-mode login --overwrite | Out-Null

Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "Backend: https://$WebAppName.azurewebsites.net/health"
Write-Host "Frontend: https://$StorageName.z39.web.core.windows.net/#/privacy"  # adjust domain if needed

