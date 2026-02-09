# Download JetBrainsMono Nerd Font from GitHub releases
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$zipUrl = "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.3.0/JetBrainsMono.zip"
$zipPath = Join-Path $env:TEMP "JetBrainsMono-NF.zip"
$extractPath = Join-Path $env:TEMP "JetBrainsMono-NF"
$fontsDir = $PSScriptRoot

Write-Host "Downloading JetBrainsMono Nerd Font..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting..."
if (Test-Path $extractPath) { Remove-Item $extractPath -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

# Copy only the Mono variants (Regular + Bold) - these are best for terminal/editor use
$needed = @(
    "JetBrainsMonoNerdFontMono-Regular.ttf",
    "JetBrainsMonoNerdFontMono-Bold.ttf",
    "JetBrainsMonoNerdFontMono-Italic.ttf",
    "JetBrainsMonoNerdFontMono-BoldItalic.ttf"
)

foreach ($font in $needed) {
    $src = Get-ChildItem -Path $extractPath -Filter $font -Recurse | Select-Object -First 1
    if ($src) {
        Copy-Item $src.FullName -Destination (Join-Path $fontsDir $font) -Force
        Write-Host "  Bundled: $font"
    } else {
        Write-Host "  WARNING: $font not found in archive"
    }
}

# Cleanup
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Done! Font files are in: $fontsDir"
