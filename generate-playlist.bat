@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate-playlist.ps1"
echo.
echo Done. Re-apply the wallpaper in Lively to load the new list.
pause
