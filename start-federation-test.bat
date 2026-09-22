@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo.
  echo Nutzung: start-federation-test.bat https://DEINE-URL.trycloudflare.com
  echo.
  echo Die URL muss bereits durch einen laufenden HTTPS-Tunnel auf http://127.0.0.1:3000 zeigen.
  exit /b 2
)
echo Starte PartiUp fuer kontrollierten Fediverse-Test...
set "PARTIUP_BASE_URL=%~1"
set PARTIUP_FEDERATION_TEST=1
set BIND_HOST=127.0.0.1
set NODE_ENV=development
echo Public URL: %PARTIUP_BASE_URL%
echo Lokales Backend: http://127.0.0.1:3000
call npm.cmd start
pause
