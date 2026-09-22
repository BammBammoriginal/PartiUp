# PartiUp P0.9 – Participation Core

P0.9 verschiebt den Schwerpunkt bewusst zurück vom Protokoll zum Produktkern: Beteiligung wird als gemeinsame Engine für alle Space-Typen vereinheitlicht.

## Neu
- Phasen: Information, Sammlung, Beratung, Entscheidung, Auswertung, Ergebnisse.
- Ideen/Vorschläge mit Unterstützung/Priorisierung und nachvollziehbarem Bearbeitungsstatus.
- Ergebnisse und Umsetzungsstände als eigener, persistenter Teil des Prozesses.
- Space-Schnellumfragen werden neu über den Participation Core angelegt; alte Poll-Datensätze bleiben als Legacy-Inhalte lesbar.
- Mindest-Verifizierungsstufe wird serverseitig auch bei aktiver Teilnahme erzwungen.
- Privacy-Export und Account-Lifecycle berücksichtigen Vorschläge, Unterstützungen und Outcomes.

## Kommunale Zukunft
Der Core enthält absichtlich **keine** fest verdrahtete kommunale Fachverfahrenslogik. Er stellt jedoch Phasen, Rechte, Provenienz, Ergebnisse, API- und Erweiterungspunkte bereit, damit in einer späteren Extension-Architektur ein `municipal.participation`-Paket bzw. Decidim-/Consul-Anbindungen sauber darauf aufsetzen können. Für normale Nutzer soll diese technische Modularität später unsichtbar bleiben.

## Windows
```powershell
.\setup.bat
.\start-local.bat
```
LAN:
```powershell
.\start-network.bat
```
