@echo off
cd /d "%~dp0"
echo Starte PartiUp im lokalen Netzwerk...
set BIND_HOST=0.0.0.0
call npm.cmd start
pause
