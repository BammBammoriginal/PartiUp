@echo off
setlocal
cd /d "%~dp0"
echo === BottomUpParti QA Setup ===
call npm.cmd ci --ignore-scripts
if errorlevel 1 goto :fail
call npm.cmd audit signatures
if errorlevel 1 goto :fail
call npm.cmd run deps:build
if errorlevel 1 goto :fail
call npm.cmd audit --audit-level=moderate
if errorlevel 1 (
  echo SECURITY-GATE FEHLGESCHLAGEN. QA wird nicht fortgesetzt.
  goto :fail
)
call npm.cmd run version-preflight
if errorlevel 1 goto :fail
call node_modules\.bin\playwright.cmd install chromium
if errorlevel 1 goto :fail
echo.
echo QA-Umgebung fertig. Volltest: npm.cmd run release-check
pause
exit /b 0
:fail
echo.
echo FEHLER beim QA-Setup. Siehe Meldung oben.
pause
exit /b 1
