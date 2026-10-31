# Installs the latest AvanzaDesk release on Windows:
#   irm https://raw.githubusercontent.com/AnteWall/avanza-desk/main/scripts/install.ps1 | iex
# The app updates itself after that.
$ErrorActionPreference = 'Stop'

$release = Invoke-RestMethod https://api.github.com/repos/AnteWall/avanza-desk/releases/latest
$asset = $release.assets | Where-Object name -like '*-setup.exe' | Select-Object -First 1
if (-not $asset) { throw "No installer in release $($release.tag_name)" }

$file = Join-Path $env:TEMP $asset.name
Write-Host "Downloading $($asset.name)"
Invoke-WebRequest $asset.browser_download_url -OutFile $file
# Per-user NSIS installer: /S installs silently, no admin prompt.
Start-Process $file -ArgumentList '/S' -Wait
Remove-Item $file
Write-Host "Installed AvanzaDesk $($release.tag_name)"
