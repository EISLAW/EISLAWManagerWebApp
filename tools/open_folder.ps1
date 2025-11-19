param(
  [Parameter(Mandatory=$false)][string]$Arg
)

$ErrorActionPreference = 'Stop'

function Decode-Url([string]$s){
  if(-not $s){ return '' }
  try {
    return [System.Uri]::UnescapeDataString($s)
  } catch { return $s }
}

# If invoked via custom protocol, $Arg will be like: eislaw-open://C%3A%5Cpath%5Cto
if($Arg -match '^[a-zA-Z][a-zA-Z0-9\-]+:\/\/'){
  $u = [Uri]$Arg
  $raw = $u.OriginalString -replace '^[^:]+:\/\/', ''
  $path = Decode-Url $raw
} else {
  $path = Decode-Url $Arg
}

# Fix slashes and quotes
$path = $path -replace '\\$',''  # trim trailing backslash
$path = $path -replace '/','\\'

if(-not (Test-Path -LiteralPath $path)){
  Write-Error "Path not found: $path"
  exit 2
}

Start-Process explorer.exe -ArgumentList @("`"$path`"")
exit 0

