# PartiUp – verbindliche Roadmap zur menschlichen Übernahme

Stand 2026-10-26. Status: **geplant, nicht umgesetzt**. Grundlage: `AGENTS.md`, `QA-RELEASE-PROCESS.md`, bestehende Sicherheits-/Privacy-Architektur. Keine komplette Neuschreibung und kein vorschneller Datenbankwechsel.

## Definition of Done für jede Etappe
Ein PR ist erst abgeschlossen, wenn tatsächlich genutzte Codepfade geändert wurden, die dokumentierten Schnittstellen nachvollziehbar sind, gezielte Regressionen und alle betroffenen Sicherheits-/Privacy-Tests bestehen, ausgeführte und ausgefallene Tests samt Umgebung genannt sind und die Änderung unabhängig überprüft wurde. Ein Markdown-Dokument, eine Klassenhülle oder ein grüner statischer Preflight allein genügen nicht. Ein Release setzt weiterhin echte Goldtests auf Desktop und Mobile voraus.

## Architektur-Zielbild
HTTP/Express-Router -> Application Service (Anwendungsablauf) -> Domain/Policy (Fachlogik und Autorisierung) -> Repository Interface (Datenoperationen) -> SQLite-Adapter. Federation, Medien und externe Integrationen sind getrennte Adapter; Querverbindungen laufen über definierte Verträge. Services dürfen keine direkte SQLite-API importieren; sichere Transaktionsgrenzen und konsistente Berechtigungsprüfung bleiben erhalten. Kein pauschales Einführen eines ORM.

## Abzuarbeitende Etappen (in Reihenfolge, Sicherheitsfixes dürfen vorgehen)
1. **Bestandsaufnahme / Baseline:** Imports, direkte DB-Zugriffe, Tabellen-/Migrationsstruktur, Routen-/Service-Grenzen, Security-Checks, Tests und reale Startanweisungen kartieren. Messgrößen: Größe `server/db.js`, `server/server.js`, Anzahl direkter DB-Zugriffe außerhalb der Adapter, E2E-Abdeckung zentraler Journeys. Ergebnis: Diagramm, Abhängigkeitskarte, priorisierter Backlog. Nur Doku in diesem ersten Schritt.
2. **Ein schmaler vertikaler Schnitt:** eine risikoarme vorhandene Funktion auswählen, End-to-End-Regression *vor* Umbau sichern, Route/Service/Repository-Vertrag/SQLite-Implementierung extrahieren, tatsächlichen Aufrufer umstellen. Vorher/Nachher-Test muss gleiches Verhalten zeigen. Keine Auth-/Privacy-Grenzen als erste Übungsstrecke.
3. **Adapter-Vertrag und kontrollierter Zweitadapter:** gemeinsame Vertragstests für CRUD, Transaktionen, Constraints, Fehlerszenarien; PostgreSQL-Testadapter für den ausgewählten Schnitt oder klar getrennten Test-Prototyp implementieren. Kein paralleles Produktionssystem nötig. Ein Adapter gilt erst als unabhängig, wenn gleiche Tests gegen SQLite und PostgreSQL laufen; dokumentierte Abweichungen explizit.
4. **Schrittweise Migration weiterer Module:** Events, Projects, Participation, Relations, Permissions, Federation nach Risiko und fachlichen Abhängigkeiten priorisieren; pro PR einen benutzten Pfad aus den Monolithen herauslösen. Sicherheitskritische Bereiche zuletzt und mit zusätzlichen Regressionen. Monolith-Metriken und verbliebene Abhängigkeiten fortschreiben.
5. **Migrations- und Betriebsreife:** versioniertes Schema/Migrationen, Datenübertragungsprobe auf anonymisierten Testdaten, Integritätsprüfungen, Wiederherstellung und Rollback; dokumentiertes lokales Setup, Deployment, Betrieb, Fehlerdiagnose und Secrets-Management. SQLite erst ersetzen, wenn Vorteile, Betriebskonzept und Migration belegt und freigegeben sind.
6. **Menschlicher Übergabetest:** ein Entwickler ohne vorherige KI-Chats kann anhand des Repositorys die Anwendung starten, Architektur und Datenmodell erklären, eine kleine Änderung sicher durchführen und die Tests/Recovery-Verfahren reproduzieren. Probleme werden als Issues aufgenommen. Dieser praktische Test ist die eigentliche Übergabeabnahme.

## GitHub-Steuerung
- Für jede Etappe ein Issue mit Auftrag, Abhängigkeiten, Akzeptanzkriterien und Prüfnachweisen; PR referenziert das Issue.
- Agenten dürfen ein Issue nicht allein aufgrund einer Beschreibung schließen; kontrolliere Code-Diff, genutzten Aufrufpfad und CI-/Browser-Nachweise.
- Verbindliche Statuschecks und Pull-Request-Regeln für `main` nach Repository-/Tarifmöglichkeiten konfigurieren; Schutzstatus separat kontrollieren. Fehlende Schutzfunktion nicht als eingerichtet bezeichnen.
- Abgeschlossene Etappen im `docs/PROJECT-REGISTER.md` protokollieren; offene und blockierte Etappen sichtbar halten.

## Einordnung gegenüber Sicherheit, PoC und MVP
Diese Roadmap läuft neben dem Produktfahrplan, nicht vor ihm. Entschieden am 2026-10-26 (W3): Sicherheit und der Weg zu PoC und MVP haben Vorrang. Sicherheits-Baseline (PR #20) zuerst; Etappe 1 als reine Bestandsaufnahme parallel; ab Etappe 2 wird bevorzugt ein Codepfad modernisiert, der für Föderations-PoC oder MVP ohnehin angefasst wird, damit Modernisierung und Produktarbeit sich nicht gegenseitig blockieren.

## Erstes konkret messbares Ziel
Noch **kein** Wechsel zu PostgreSQL. Zuerst eine präzise Ist-Aufnahme und einen einzigen funktionierenden End-to-End-Adapter-Schnitt mit bestandenem Verhaltenstest erstellen. Danach anhand des tatsächlichen Aufwandes weitere Etappen planen.
