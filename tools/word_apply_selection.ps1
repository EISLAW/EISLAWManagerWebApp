<#!
.SYNOPSIS
  Applies rule results to the Word review document by checking the right blocks.

.PARAMETER TemplatePath
  Path to the Word file (.docx/.dotm) that contains the toggle:*/block:* content controls.

.PARAMETER Score
  JSON string or path with: { level, reg, report, dpo, requirements: [] }

.PARAMETER Answers
  Optional JSON string or path with normalized answers (used to derive trigger toggles).

.PARAMETER OutPath
  Where to save the filled review document (checkboxes set). Defaults under docs/Word with timestamp.

.PARAMETER Compose
  If set, runs the ComposeCheckedBlocks macro to generate a clean body document as well.

.PARAMETER ComposeOutPath
  Where to save the composed document if -Compose is used.

.EXAMPLE
  pwsh -NoProfile -File tools/word_apply_selection.ps1 `
    -TemplatePath "docs/Word/Security_Review_Example.docx" `
    -Score '{"level":"mid","reg":true,"report":false,"dpo":true,"requirements":["direct_marketing_rules"]}' `
    -Answers '{"ppl":12000,"sensitive_people":1500,"monitor_1000":false}' `
    -Compose
!#>

param(
  [string]$TemplatePath = "${PSScriptRoot}\..\docs\Word\Security_Review_Example.docx",
  [Parameter(Mandatory=$true)][string]$Score,
  [string]$Answers,
  [string]$OutPath,
  [switch]$Compose,
  [string]$ComposeOutPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-JsonArg {
  param([string]$Value)
  if (-not $Value) { return @{} }
  if ($Value.Trim().StartsWith('{')) { return $Value | ConvertFrom-Json }
  $p = Resolve-Path -LiteralPath $Value -ErrorAction Stop
  return (Get-Content -LiteralPath $p -Raw | ConvertFrom-Json)
}

function Get-DerivedTriggers {
  param([hashtable]$Answers, [hashtable]$Score)
  $out = New-Object System.Collections.Generic.List[string]
  $ppl = 0; $sp = 0; $access = 0
  try { $ppl = [int]($Answers.ppl) } catch {}
  try { $sp = [int]($Answers.sensitive_people) } catch {}
  try { $access = [int]($Answers.access) } catch {}
  $pplEff = [Math]::Max($ppl, $sp)
  if ($pplEff -ge 100000) { $out.Add('ppl_100k') }
  if ($sp -ge 100000) { $out.Add('sensitive_people_100k') }
  $sensitive = $false
  if ($sp -gt 0) { $sensitive = $true }
  if ($Answers.sensitive_types -and $Answers.sensitive_types.Count -gt 0) { $sensitive = $true }
  if ($sensitive -and $access -ge 101) { $out.Add('access_101_sensitive') }
  if ($Answers.monitor_1000) { $out.Add('monitor_1000') }
  if ($sp -ge 1000) { $out.Add('sensitive_people_1000') }
  if ($Score.reg -and $Answers.transfer) { $out.Add('reg_transfer') }
  if ($Score.reg -and $Answers.directmail_biz) { $out.Add('reg_directmail_biz') }
  return ,$out.ToArray()
}

function Ensure-Path {
  param([string]$Path)
  $dir = Split-Path -LiteralPath $Path -Parent
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

function Set-ToggleStates {
  param([object]$Doc, [hashtable]$Score, [string[]]$Triggers)
  # Build a set of which toggle codes should be checked
  $want = New-Object System.Collections.Generic.HashSet[string]
  if ($Score.level) { $null = $want.Add("level.$($Score.level.ToLower())") }
  if ($Score.reg) { $null = $want.Add('obligation.reg') }
  if ($Score.report) { $null = $want.Add('obligation.report') }
  if ($Score.dpo) { $null = $want.Add('obligation.dpo') }
  foreach ($r in ($Score.requirements | ForEach-Object { $_ })) { if ($r) { $null = $want.Add("req.$r") } }
  foreach ($t in $Triggers) { if ($t) { $null = $want.Add("trig.$t") } }

  foreach ($cc in @($Doc.ContentControls)) {
    if ($cc.Type -eq 8) { # wdContentControlCheckBox
      $tag = [string]$cc.Tag
      if ($tag.StartsWith('toggle:')) {
        $code = $tag.Substring(7)
        $cc.Checked = $want.Contains($code)
      }
    }
  }
}

# Load score/answers
$score = Convert-JsonArg -Value $Score | ConvertTo-Json -Depth 6 | ConvertFrom-Json
$answers = Convert-JsonArg -Value $Answers | ConvertTo-Json -Depth 6 | ConvertFrom-Json
$triggers = Get-DerivedTriggers -Answers $answers -Score $score

if (-not $OutPath) {
  $stamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
  $OutPath = Join-Path -Path (Join-Path $PSScriptRoot '..\docs\Word') -ChildPath ("Review_Filled_" + $stamp + ".docx")
}
Ensure-Path -Path $OutPath
if (-not $ComposeOutPath -and $Compose) {
  $stamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
  $ComposeOutPath = Join-Path -Path (Join-Path $PSScriptRoot '..\docs\Word') -ChildPath ("Review_Composed_" + $stamp + ".docx")
}

# Open Word and apply
$word = New-Object -ComObject Word.Application
$word.Visible = $true
try {
  $doc = $word.Documents.Open((Resolve-Path -LiteralPath $TemplatePath).Path)
  Set-ToggleStates -Doc $doc -Score $score -Triggers $triggers

  # Save the toggled review copy
  try { $doc.SaveAs2($OutPath, 16) } catch { try { $doc.SaveAs($OutPath, 16) } catch { $doc.SaveAs([ref]$OutPath) } }

  if ($Compose) {
    try { $word.Run('ComposeCheckedBlocks') } catch {}
    if ($word.Documents.Count -ge 2) {
      $bodyDoc = $word.ActiveDocument
      try { $bodyDoc.SaveAs2($ComposeOutPath, 16) } catch { try { $bodyDoc.SaveAs($ComposeOutPath, 16) } catch { $bodyDoc.SaveAs([ref]$ComposeOutPath) } }
    }
  }
}
finally {
  # keep Word open for manual review; comment next line to auto-quit
  # $word.Quit()
}

Write-Host "Filled review saved at: $OutPath"
if ($Compose -and $ComposeOutPath) { Write-Host "Composed body saved at: $ComposeOutPath" }

