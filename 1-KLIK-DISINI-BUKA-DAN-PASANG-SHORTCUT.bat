@echo off
title JournalSearch - Memasang Shortcut Desktop...
color 0b

echo ========================================================
echo   SISTEM REKOMENDASI JURNAL ILMIAH ACUAN SKRIPSI
echo   Memasang Shortcut dengan Ikon Resmi di Desktop
echo ========================================================
echo.
echo Sedang mendeteksi Desktop dan memasang shortcut...

wscript //nologo "%~dp0PASANG_SHORTCUT_DESKTOP.vbs"
if errorlevel 1 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $d=[Environment]::GetFolderPath('Desktop'); $s=$ws.CreateShortcut((Join-Path $d 'JournalSearch - Pencari Jurnal Skripsi.lnk')); $s.TargetPath='%~dp0index.html'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%~dp0JournalSearch.ico,0'; $s.Description='Sistem Rekomendasi Jurnal Ilmiah'; $s.Save(); start '%~dp0index.html'"
)

echo.
echo Selesai! Shortcut telah aktif di Desktop Anda.
timeout /t 2 >nul
exit
