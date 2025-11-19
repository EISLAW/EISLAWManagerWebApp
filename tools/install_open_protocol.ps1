param()

$ErrorActionPreference = 'Stop'

$helperDir = Join-Path $env:LOCALAPPDATA 'EISLAW'
New-Item -ItemType Directory -Force -Path $helperDir | Out-Null

# Copy helper script
$src = Join-Path $PSScriptRoot 'open_folder.ps1'
$dst = Join-Path $helperDir 'open_folder.ps1'
Copy-Item -Force $src $dst

$cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$dst`" `"%1`""

# Register custom URL protocol under HKCU (no admin required)
$base = 'HKCU:\Software\Classes\eislaw-open'
New-Item -Path $base -Force | Out-Null
Set-ItemProperty -Path $base -Name '(Default)' -Value 'URL:EISLAW Open Folder' -Force
New-ItemProperty -Path $base -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null

$cmdKey = Join-Path $base 'shell\open\command'
New-Item -Path $cmdKey -Force | Out-Null
Set-ItemProperty -Path $cmdKey -Name '(Default)' -Value $cmd -Force

Write-Host 'Installed custom URL protocol: eislaw-open://<encoded-path>' -ForegroundColor Green
Write-Host 'Test: Start-Process "eislaw-open://C:/Windows"' -ForegroundColor Yellow

