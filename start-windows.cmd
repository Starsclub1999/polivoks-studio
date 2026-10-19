@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 start-local.py
) else (
  python start-local.py
)
if errorlevel 1 (
  echo Требуется Python 3. Либо загрузите эту папку на GitHub Pages и откройте сайт по HTTPS.
  pause
)
