@echo off
cd /d "%~dp0"
echo Starte PartiUp nur auf diesem PC...
set BIND_HOST=127.0.0.1
call npm.cmd start
pause
