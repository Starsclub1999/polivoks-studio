@echo off
cd /d "%~dp0"
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo Open OPEN_FORMANTA.html in your browser.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\local-server.ps1"
if errorlevel 1 pause
