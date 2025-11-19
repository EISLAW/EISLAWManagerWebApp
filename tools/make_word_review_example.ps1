param(
  [string]$TextsPath = "${PSScriptRoot}\..\docs\security_texts.he-IL.json",
  [string]$OutDir = "${PSScriptRoot}\..\docs\Word",
  [string]$OutName = "Security_Review_Example.docx"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Add-Heading($doc, $text) {
  $para = $doc.Paragraphs.Add()
  $para.Range.Text = $text
  $para.Range.Style = 'Heading 2'
  $null = $para.Range.InsertParagraphAfter()
}

function Add-Block($doc, $code, $label, $body) {
  # Toggle checkbox content control
  $para = $doc.Paragraphs.Add()
  $range = $para.Range
  $cb = $doc.ContentControls.Add(8, $range) # 8 = wdContentControlCheckBox
  $cb.SetCheckedSymbol(0x2611, 'Segoe UI Symbol') | Out-Null
  $cb.SetUncheckedSymbol(0x25A2, 'Segoe UI Symbol') | Out-Null
  $cb.Tag = "toggle:$code"
  $cb.Title = "Include $code"
  $range.Collapse(0) | Out-Null # wdCollapseEnd
  $range.Text = "  $label"
  $null = $range.InsertParagraphAfter()

  # Rich text content control with the body
  $rtPara = $doc.Paragraphs.Add()
  $rtRange = $rtPara.Range
  $rt = $doc.ContentControls.Add(0, $rtRange) # 0 = wdContentControlRichText
  $rt.Tag = "block:$code"
  $rt.Title = "Block $code"
  $rt.Range.Text = $body
  $null = $rtRange.InsertParagraphAfter()
}

function Main {
  $texts = Get-Content -LiteralPath $TextsPath -Raw | ConvertFrom-Json
  if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
  $outPath = Join-Path $OutDir $OutName

  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  try {
    $doc = $word.Documents.Add()
    $doc.Styles['Heading 2'].Font.Name = 'Segoe UI'

    # Levels
    Add-Heading $doc 'Levels'
    foreach ($k in 'lone','basic','mid','high') {
      $label = "level:$k"
      $body = [string]$texts.level.$k
      Add-Block $doc "level.$k" $label $body
    }

    # Obligations
    Add-Heading $doc 'Obligations'
    foreach ($k in 'reg','report','dpo') {
      $label = "obligation:$k"
      $body = [string]$texts.obligation.$k
      Add-Block $doc "obligation.$k" $label $body
    }

    # Requirements
    Add-Heading $doc 'Requirements'
    foreach ($k in 'worker_security_agreement','cameras_policy','consultation_call','outsourcing_text','direct_marketing_rules') {
      $label = "req:$k"
      $body = [string]$texts.requirement.$k
      Add-Block $doc "req.$k" $label $body
    }

    # Triggers (optional)
    Add-Heading $doc 'Triggers (why)'
    foreach ($k in 'ppl_100k','sensitive_people_100k','access_101_sensitive','monitor_1000','sensitive_people_1000','reg_transfer','reg_directmail_biz') {
      $label = "trig:$k"
      $body = [string]$texts.trigger.$k
      Add-Block $doc "trig.$k" $label $body
    }

    # Save as DOCX
    $wdFormatXMLDocument = 16
    try { $doc.SaveAs2($outPath, 16) } catch { try { $doc.SaveAs($outPath, 16) } catch { $doc.SaveAs([ref]$outPath) } }
    $doc.Close()
  }
  finally {
    $word.Quit()
  }
  Write-Output "Created: $outPath"
}

Main



