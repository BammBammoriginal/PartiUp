@echo off
setlocal
cd /d "%~dp0"
echo.
echo === PartiUp Setup ===
where node >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Node.js wurde nicht gefunden.
  echo Installiere eine unterstuetzte Node.js-Version und starte das Terminal neu.
  pause
  exit /b 1
)
echo Node:
node --version
echo npm:
call npm.cmd --version
echo.
echo Installiere und synchronisiere Abhaengigkeiten...
call npm.cmd install
if errorlevel 1 goto :fail
echo.
echo Baue SQLite-Modul...
call npm.cmd rebuild better-sqlite3
if errorlevel 1 goto :fail
echo.
echo Pruefe ALLE Abhaengigkeiten auf bekannte Schwachstellen...
call npm.cmd audit --audit-level=moderate
if errorlevel 1 (
  echo.
  echo SECURITY-GATE FEHLGESCHLAGEN. Diese Version bitte nicht extern testen.
  echo Kein npm audit fix --force ausfuehren. Ausgabe melden.
  pause
  exit /b 2
)
echo.
echo Pruefe Versions-, Architektur-, Privacy-, Mobile-, Runtime- und UI-Gates...
call npm.cmd run preflight
if errorlevel 1 goto :fail
echo.
echo Setup und Preflight erfolgreich.
echo Lokal: start-local.bat ^| LAN: start-network.bat
pause
exit /b 0
:fail
echo.
echo FEHLER im Setup/Preflight. Siehe Meldung oben.
pause
exit /b 1
