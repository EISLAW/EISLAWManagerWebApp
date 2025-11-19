param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$true)][string]$WebAppName,   # e.g., eislaw-api-01
  [Parameter(Mandatory=$true)][string]$StorageName,  # e.g., eislawstweb
  [string]$SecretsPath = (Join-Path (Join-Path $PSScriptRoot '..') 'secrets.local.json')
)

$ErrorActionPreference = 'Stop'

function Step($msg){ Write-Host "==> $msg" -ForegroundColor Cyan }

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repo

Step "Package backend"
$packageScript = Join-Path $PSScriptRoot 'package_backend.ps1'
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
  pwsh -NoLogo -NoProfile -File $packageScript
} else {
  powershell.exe -NoLogo -NoProfile -File $packageScript
}
$zip = Join-Path $repo 'build/webapp_package.zip'
if (!(Test-Path $zip)) { throw "Backend zip missing: $zip" }

Step "Deploy backend zip to $WebAppName"
$azArgs = "webapp deploy -g $ResourceGroup -n $WebAppName --src-path `"$zip`" --type zip"
$azCmd = Get-Command az -ErrorAction SilentlyContinue
if ($azCmd -and $azCmd.Source -like '*/wbin/az') {
  powershell.exe -NoLogo -NoProfile -Command "& `\"$($azCmd.Source)`\" $azArgs" | Out-Null
} else {
  & az webapp deploy -g $ResourceGroup -n $WebAppName --src-path $zip --type zip | Out-Null
}

Step "Apply app settings from secrets"
pwsh -NoLogo -NoProfile -File (Join-Path $PSScriptRoot 'set_app_settings.ps1') -ResourceGroup $ResourceGroup -WebAppName $WebAppName -SecretsPath $SecretsPath

Step "Build frontend"
Push-Location (Join-Path $repo 'frontend')
npm install --silent | Out-Null
npx vite build | Out-Null
Pop-Location

Step "Upload frontend to static website ($StorageName)"
$storageArgs = "storage blob upload-batch -s `"$(Join-Path $repo 'frontend/dist')`" -d '$web' --account-name $StorageName --auth-mode login --overwrite"
if ($azCmd -and $azCmd.Source -like '*/wbin/az') {
  powershell.exe -NoLogo -NoProfile -Command "& `\"$($azCmd.Source)`\" $storageArgs" | Out-Null
} else {
  & az storage blob upload-batch -s (Join-Path $repo 'frontend/dist') -d '$web' --account-name $StorageName --auth-mode login --overwrite | Out-Null
}

Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "Backend: https://$WebAppName.azurewebsites.net/health"
Write-Host "Frontend: https://$StorageName.z39.web.core.windows.net/#/privacy"  # adjust domain if needed
