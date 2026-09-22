# BottomUpParti v0.9.2 – Permission & Abuse Integration Hardening

Kein neuer Produktfunktionsblock. Diese Version stabilisiert v0.8.9/v0.9.0/v0.9.1 durch echte HTTP-Integrationstests gegen einen isolierten Testserver und eine eigene, temporäre SQLite-Datenbank.

## Neue Security-/Permission-Integrationstests

- unauthentifizierter Zugriff auf Rollen- und Moderationsendpunkte
- Owner/Admin/Moderator/Mitglied/Gast-Auflösung
- Schutz vor Rollen-Eskalation
- serverseitige Aufgabenrechte
- Space-Grenzen für Moderationsrechte
- Melden → Moderationsqueue → Review
- CSRF-Pflicht für Schreibzugriffe
- Cross-Origin-Abwehr
- kontrollierte JSON-404 für unbekannte API-Endpunkte

`npm.cmd run qa:security` führt diesen Block separat aus. `qa:fast` enthält den Security-Integrationstest jetzt standardmäßig.

## Release-Prinzip

Stabilität und Sicherheit haben Vorrang vor neuen Funktionen. Ein fehlgeschlagener Security-Integrationstest blockiert den Fast-QA-Pfad.
