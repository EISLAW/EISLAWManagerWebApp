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

# Create zip package
if (Test-Path $OutZip) { Remove-Item $OutZip -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $OutZip -Force

Write-Host "Created $OutZip" -ForegroundColor Green

