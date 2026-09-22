# PartiUp P0.15.3 – Comment Media Upload & Display Fix

Diese Bugfix-Version zieht Kommentar-Medien auf denselben stabilen Grundfluss wie Beitragsmedien.

Beim Auswählen eines Bildes erscheint direkt eine Vorschau. Beim Absenden werden Kommentar und Bild gemeinsam verarbeitet und erst danach – sofern erlaubt – föderiert. Dadurch kann ein Bild nicht mehr still verloren gehen, während nur der Textkommentar angelegt wird.

Start unter Windows PowerShell:

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```
