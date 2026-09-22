@echo off
cd /d "%~dp0"
echo ACHTUNG: Lokale BottomUpParti-Datenbank wird geloescht.
pause
if exist data\bottomupparti.db del /Q data\bottomupparti.db
if exist data\bottomupparti.db-wal del /Q data\bottomupparti.db-wal
if exist data\bottomupparti.db-shm del /Q data\bottomupparti.db-shm
echo Datenbank geloescht. Beim naechsten Start wird die Demo neu angelegt.
pause
