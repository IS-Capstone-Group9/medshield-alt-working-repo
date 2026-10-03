$ErrorActionPreference = 'Stop'
$inputPath = 'C:\Users\Ethan\descriptive_1\docs\chapters\MedShield_Chapter_4_Results_and_Discussion_Defense_Ready.docx'
$outputDir = 'C:\Users\Ethan\descriptive_1\tmp\chapter4_defense\render_intro_2026_v1'
$outputPath = Join-Path $outputDir 'MedShield_Chapter_4.pdf'
$workingPath = Join-Path $outputDir 'render-source.docx'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
Copy-Item -LiteralPath $inputPath -Destination $workingPath -Force
$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    $document = $word.Documents.Open($workingPath, $false, $true, $false, '', '', $false, '', '', 0, $false, $false, $false, $false, $true)
    $document.ExportAsFixedFormat($outputPath, 17)
    Write-Output $outputPath
}
finally {
    if ($document -ne $null) { $document.Close($false) }
    if ($word -ne $null) { $word.Quit() }
    Remove-Item -LiteralPath $workingPath -Force -ErrorAction SilentlyContinue
}
