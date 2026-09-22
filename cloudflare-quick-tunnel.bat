@echo off
cd /d "%~dp0"
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo FEHLER: cloudflared wurde im PATH nicht gefunden.
  echo Nutze deine bestehende Cloudflare-Tunnel-Installation oder starte den Tunnel manuell.
  pause
  exit /b 1
)
echo.
echo Starte einen temporaeren HTTPS-Tunnel auf http://127.0.0.1:3000 ...
echo Kopiere die angezeigte https://...trycloudflare.com URL.
echo Dieses Fenster fuer den gesamten Test OFFEN lassen.
echo.
cloudflared tunnel --url http://127.0.0.1:3000
pause
