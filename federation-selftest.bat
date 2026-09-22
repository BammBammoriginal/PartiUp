@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Nutzung: federation-selftest.bat https://DEINE-URL.trycloudflare.com [fediverse-handle]
  echo Beispiel: federation-selftest.bat https://abc.trycloudflare.com max
  exit /b 2
)
set "FED_HANDLE=%~2"
if "%FED_HANDLE%"=="" set "FED_HANDLE=max"
call npm.cmd run federation:selftest -- --url "%~1" --handle "%FED_HANDLE%"
pause
