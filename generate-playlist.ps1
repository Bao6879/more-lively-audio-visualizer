$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$exts = @(".jpg", ".jpeg", ".png", ".webp", ".gif")
$imgs = Get-ChildItem -Path "images" -File |
    Where-Object { $exts -contains $_.Extension.ToLower() } |
    Sort-Object Name

$list = ($imgs | ForEach-Object { '"images/' + $_.Name + '"' }) -join ', '
Set-Content -Path "images/playlist.js" -Encoding UTF8 -Value "window.SLIDESHOW_FILES = [$list];"

Write-Host ("Wrote " + $imgs.Count + " image(s) to images\playlist.js")

# Video background list (Batch 6) — same pattern, scans the videos folder.
$vidExts = @(".mp4", ".webm")
if (Test-Path "videos") {
    $vids = Get-ChildItem -Path "videos" -File |
        Where-Object { $vidExts -contains $_.Extension.ToLower() } |
        Sort-Object Name

    $vlist = ($vids | ForEach-Object { '"videos/' + $_.Name + '"' }) -join ', '
    Set-Content -Path "videos/playlist.js" -Encoding UTF8 -Value "window.VIDEO_FILES = [$vlist];"

    Write-Host ("Wrote " + $vids.Count + " video(s) to videos\playlist.js")
}
