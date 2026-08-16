@echo off
setlocal EnableExtensions
title METINBALL - SEVDIGIMIZ OYUN
cd /d "%~dp0"
if not exist "index.html" (echo HATA: index.html bulunamadi.&pause&exit /b 1)
if not exist "tools\portable_server.ps1" (echo HATA: sunucu dosyasi bulunamadi.&pause&exit /b 1)
echo METINBALL aciliyor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\portable_server.ps1"
exit /b
