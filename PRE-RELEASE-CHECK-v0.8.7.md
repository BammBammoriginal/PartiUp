# Pre-Release Check v0.8.7

## Verbindliche Prämissen
- Logische, schlanke, nachvollziehbare Grundstruktur
- Interoperabilität und API-Readiness
- DSGVO / Privacy-by-Design / Security-by-Design
- Mobile-first, hochwertige UX und App-Readiness

## Neu geprüft
- Erstellung und Konfiguration sind getrennte Prozesse.
- Create-Request erzeugt zuerst eine kanonische Space-ID.
- Neuer Space öffnet direkt im Einrichtungsmodus.
- Setup-Status ist persistent und jederzeit änderbar.
- Templates sind nur Modul-Defaults, kein alternatives Datenmodell.
- Unterräume folgen derselben Logik.
- Ersteller und Verifizierungsstufe bleiben transparent.
- Anbieterneutrale Interoperabilitätsstruktur bleibt erhalten.
- Neu erstellte Projekte/Events aktualisieren den besitzenden Space unmittelbar.
- Mobile Setup-Karten werden einspaltig dargestellt.

## Statisch bestanden
- 76 Produkt-/Architekturprüfungen
- 24 Security-/Privacy-Prüfungen
- 20 Mobile-/App-Prüfungen
- 12 Messaging-Prüfungen
- 9 Space-Creation-Prüfungen
- Module-Boundary-, Karten- und QA-Static-Prüfungen
- Node/JavaScript Syntaxprüfung

## Lokal noch auszuführen
- `npm.cmd audit`
- `npm.cmd run preflight`
- `npm.cmd run release-check` nach installiertem Playwright/Chromium
