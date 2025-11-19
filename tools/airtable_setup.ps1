<#!
.SYNOPSIS
  Creates or updates the Airtable table schema for the Security_Submissions queue.

.DESCRIPTION
  Uses Airtable Metadata API to ensure a table named Security_Submissions exists with the fields
  defined in docs/airtable_schema.json. Requires a PAT with access to the base and (ideally)
  metadata schema write permissions. If schema write is not permitted, the script will print
  a helpful message and exit non‑fatally.

.USAGE
  pwsh -NoProfile -File tools/airtable_setup.ps1
!#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Secrets {
  $p = Join-Path $PSScriptRoot '..\secrets.local.json'
  return Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
}

function Invoke-Air {
  param([string]$Method, [string]$Url, [object]$Body)
  $token = (Get-Secrets).airtable.token
  $Headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
  if ($Body) {
    $json = ($Body | ConvertTo-Json -Depth 20 -Compress)
    return Invoke-RestMethod -Headers $Headers -Method $Method -Uri $Url -Body $json -TimeoutSec 60
  } else {
    return Invoke-RestMethod -Headers $Headers -Method $Method -Uri $Url -TimeoutSec 60
  }
}

function Ensure-Table {
  $secrets = Get-Secrets
  $baseId = $secrets.airtable.base_id
  if (-not $baseId) { throw 'Missing airtable.base_id in secrets.local.json' }
  $metaUrl = "https://api.airtable.com/v0/meta/bases/$baseId/tables"
  try {
    $tables = Invoke-Air GET $metaUrl $null
  } catch {
    Write-Warning "Failed to read tables. Your token may not allow Metadata API: $($_.Exception.Message)"
    return 1
  }

  $schema = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\docs\airtable_schema.json') -Raw | ConvertFrom-Json
  $existing = $tables.tables | Where-Object { $_.name -eq $schema.tableName }
  if (-not $existing) {
    Write-Host "Creating table $($schema.tableName) in base $baseId ..."
    $payload = @{ name = $schema.tableName; fields = @() }
    # primary field
    $payload.primaryFieldId = $null
    $payload.fields += @{ name = $schema.primaryField.name; type = $schema.primaryField.type }
    foreach ($f in $schema.fields) { $payload.fields += $f }
    try {
      $res = Invoke-Air POST $metaUrl $payload
      Write-Host "Created table with id: $($res.id)"
      return 0
    } catch {
      Write-Warning "Create failed (likely permissions). You may need to create the table manually. $_"
      return 2
    }
  } else {
    Write-Host "Table exists (id: $($existing.id)). Ensuring fields ..."
    # Compute createFields for any missing
    $have = @{}
    foreach ($f in $existing.fields) { $have[$f.name] = $true }
    $create = @()
    foreach ($f in $schema.fields) { if (-not $have.ContainsKey($f.name)) { $create += $f } }
    if ($create.Count -gt 0) {
      $url = "https://api.airtable.com/v0/meta/bases/$baseId/tables/$($existing.id)"
      $body = @{ createFields = $create }
      try {
        $null = Invoke-Air PATCH $url $body
        Write-Host "Added fields: $($create | ForEach-Object { $_.name } | Join-String -Separator ', ')"
      } catch {
        Write-Warning "Update failed (permissions?). You can add missing fields manually. $_"
      }
    } else {
      Write-Host "All fields present."
    }
    return 0
  }
}

exit (Ensure-Table)

