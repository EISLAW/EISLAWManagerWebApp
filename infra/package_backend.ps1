param(
  [string]$OutZip = 'build/webapp_package.zip'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root '..')

$staging = 'build/webapp'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

# Copy backend sources
Copy-Item -Recurse -Force -Path 'scoring_service' -Destination (Join-Path $staging 'scoring_service')

# Ensure requirements.txt is at the zip root for Oryx detection
if (Test-Path 'scoring_service/requirements.txt') {
  Copy-Item 'scoring_service/requirements.txt' (Join-Path $staging 'requirements.txt') -Force
}

# Pre-vendor python dependencies into .python_packages for Azure App Service
$sitePackages = Join-Path $staging '.python_packages\lib\site-packages'
if (Test-Path $sitePackages) { Remove-Item $sitePackages -Recurse -Force }
New-Item -ItemType Directory -Force -Path $sitePackages | Out-Null

function Convert-ToWslPath([string]$winPath){
  $drive = $winPath.Substring(0,1).ToLower()
  $rest = $winPath.Substring(2).Replace('\\','/')
  return "/mnt/$drive$rest"
}

$pythonExe = Join-Path $PWD '.venv\\Scripts\\python.exe'
$useWsl = $false
if (!(Test-Path $pythonExe)) {
  $pythonExe = 'python'
  if (-not (Get-Command $pythonExe -ErrorAction SilentlyContinue)) {
    $useWsl = $true
  }
}
Write-Host "Installing backend requirements into $sitePackages" -ForegroundColor Cyan
if ($useWsl) {
  $wslRepo = Convert-ToWslPath $PWD
  $wslTarget = Convert-ToWslPath $sitePackages
  $cmdUpgrade = "cd `"$wslRepo`" && python3 -m pip install --quiet --upgrade pip"
  $cmdInstall = "cd `"$wslRepo`" && python3 -m pip install --quiet -r scoring_service/requirements.txt --target `"$wslTarget`""
  $null = & wsl.exe /bin/sh -c $cmdUpgrade
  $null = & wsl.exe /bin/sh -c $cmdInstall
} else {
  & $pythonExe -m pip install --quiet --upgrade pip | Out-Null
  & $pythonExe -m pip install --quiet -r 'scoring_service/requirements.txt' --target $sitePackages
}

# Create zip package
if (Test-Path $OutZip) { Remove-Item $OutZip -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $OutZip -Force

Write-Host "Created $OutZip" -ForegroundColor Green
