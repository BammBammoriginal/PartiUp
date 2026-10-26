# PartiUp – Projektregister, Kompass-Index und Arbeitsprotokoll

Stand: 2026-10-26 · **Index, keine neue fachliche Master-Spezifikation.**

## Zweck und Quellenhierarchie
Dieses Register verhindert Kontextverlust bei Übergaben zwischen Menschen und KI-Agenten. Es soll die bereits ausgearbeiteten Projektkompasse und Fachverträge **referenzieren statt ersetzen**.
- **Implementierungsstand:** aktueller GitHub-Branch/Commit und Quellcode.
- **Verbindliche Fach- und Qualitätsregeln:** vorhandene Architektur-, Safety-/Privacy-, QA- und Projektentscheidungsdokumente; bei Widersprüchen Entscheidung ausdrücklich klären.
- **Geplanter Umfang:** freigegebene Aufgaben/Entscheidungen; Absicht nicht mit Implementierung verwechseln.
- **Historie:** bestehende Changelogs und retrospektive Analysen; ein Changelog beweist keinen erfolgreichen Browsertest.

## Bestätigter Bestand auf `main` bei Anlage
- `package.json`: Projektversion `0.16.28`, Node.js/Express, SQLite (`better-sqlite3`), Playwright.
- Ausgangs-Commit dieses Dokumentationsbranches: `f185fcb404a4de80ce1139123d1b30dcaf6e0a90`.
- Vorhanden: `PARTIUP-P0.1-ARCHITECTURE.md`, `COMMUNITY-SPACES.md`, `PARTICIPATION-MODEL.md`, `SPACE-MODULES-AND-AGGREGATION.md`, `QA-RELEASE-PROCESS.md`, `P0.16.0-BIS-P0.16.20-RETROSPEKTIVE.md`, `P0.16.23-GOLD-RELEASE.md` sowie diverse Security-, Privacy- und Federation-Dokumente.
- Offene Sicherheitsarbeit: [PR #20](https://github.com/BammBammoriginal/PartiUp/pull/20) (Draft am 2026-10-20; vor Änderungen aktuellen Status neu prüfen).
- Ein separat als zusammengeführter „Projektkompass“ benanntes Dokument ist **auf diesem `main`-Stand nicht identifiziert**. Vor einer Konsolidierung andere Branches/PRs und die Originaldokumente prüfen. Nichts als vollständig integriert bezeichnen, solange diese Prüfung fehlt.

## Fachlicher Orientierungspunkt (aus existierender Projektdokumentation)
PartiUp verknüpft Menschen, Orte, Themen, Communities, Veranstaltungen, Projekte und Beteiligungsräume über gemeinsame Identitäts-, Sichtbarkeits-, Beziehungs- und Space-Regeln. Datenschutz, serverseitige Berechtigungen, nachvollziehbare Herkunft und sichere Föderationsgrenzen sind Grundanforderungen. Welche Integrationen real laufen, ist im Code gesondert nachzuweisen.

## Laufendes Arbeitsprotokoll
Neue Einträge **anhängen**, nicht ältere umschreiben. Format:
```
### YYYY-MM-DD – Kurztitel
- Verantwortlich / Agent:
- Issue / PR / Branch / Commit:
- Anlass und Entscheidung:
- Geänderter fachlicher oder technischer Bereich:
- Nachweis: Tests (ausgeführt / nicht ausgeführt), Ergebnis:
- Risiken, offene Fragen und nächster Schritt:
- Referenz auf ausführliche Entscheidung/Datei:
```

### 2026-10-26 – Zusammenarbeit zweier KIs vorbereitet
- Verantwortlich / Agent: ChatGPT, auf Nutzerauftrag.
- Branch: `docs/ai-collaboration-2026-10-26`; Ausgangsstand `main` `f185fcb404a4de80ce1139123d1b30dcaf6e0a90`.
- Entscheidungsvorschlag: Claude Code primär für Umsetzung, ChatGPT/Work für Planung, Review und bei Bedarf eigene Änderungen; keine zusätzliche Codex-Pflicht.
- Umfang: Arbeitsanweisungen und Dokumentationsindex; kein Produktcode.
- Tests: noch keine Laufzeit-, Security- oder Browsertests ausgeführt, da ausschließlich Markdown-Dateien angelegt werden.
- Offene Frage: ursprünglichen zusammengeführten Projektkompass aus Chats/anderen Branches identifizieren und anschließend referenzieren, nicht still ersetzen.
