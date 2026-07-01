$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$exts = @(".jpg", ".jpeg", ".png", ".webp", ".gif")
$imgs = Get-ChildItem -Path "images" -File |
    Where-Object { $exts -contains $_.Extension.ToLower() } |
    Sort-Object Name

$list = ($imgs | ForEach-Object { '"images/' + $_.Name + '"' }) -join ', '
Set-Content -Path "images/playlist.js" -Encoding UTF8 -Value "window.SLIDESHOW_FILES = [$list];"

Write-Host ("Wrote " + $imgs.Count + " image(s) to images\playlist.js")
