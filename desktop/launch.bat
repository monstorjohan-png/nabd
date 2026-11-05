@echo off
REM NABD - Launch app (Electron)
set "ELECTRON=E:\nabd-runtime\electron.exe"
set "APPDIR=E:\sites\nabd\desktop"
if not exist "%ELECTRON%" (
  echo Electron runtime not found.
  pause
  exit /b 1
)
start "" "%ELECTRON%" "%APPDIR%"