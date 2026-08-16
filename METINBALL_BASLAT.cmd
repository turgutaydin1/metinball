@echo off
setlocal EnableExtensions
title METINBALL 3D
cd /d "%~dp0"
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo Windows PowerShell bulunamadi.
  pause
  exit /b 1
)
echo.
echo METINBALL 3D aciliyor...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\server.ps1"
