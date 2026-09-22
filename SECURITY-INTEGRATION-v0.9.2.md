# Security Integration – v0.9.2

## Schnell ausführen

```powershell
npm.cmd run qa:security
```

Der Test startet automatisch eine isolierte lokale Testinstanz auf `127.0.0.1`, verwendet eine eindeutige temporäre Datenbank und beendet sowie bereinigt sie danach wieder.

## Abgedeckte kritische Pfade

1. Authentifizierungspflicht
2. Rollenauflösung pro Space
3. Rollen-Eskalationsschutz
4. Aufgabenrechte
5. Moderationsrechte und Space-Grenzen
6. Melde-/Review-Pfad
7. CSRF
8. Cross-Origin-Schutz
9. API-404-Verhalten

Der Test ersetzt kein professionelles Penetration Testing und keine externe Security-Prüfung vor öffentlichem Produktionsbetrieb.
