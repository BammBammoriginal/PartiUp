# CLAUDE.md

Leitfaden für Claude Code in diesem Repository. Projektsprache (UI, Doku, Testnamen) ist Deutsch; Commit-Messages sind kurze englische Imperativsätze.

## Was ist PartiUp?

Beziehungsorientierte Beteiligungs- und Community-Plattform: Orte × Themen × Communities × Menschen × Veranstaltungen × Projekte × Beteiligung, dazu Chats und ActivityPub-Föderation. Status: gehärteter Prototyp / Closed Alpha, **nicht produktionsreif** (`PRODUCTION-READINESS-v0.9.1.md`).

Abgeleitet von BottomUpParti v0.9.3 – deshalb heißen Env-Variablen, Cookies und die Standard-DB noch `BUP_*`, `bup_session`, `bottomupparti.db`. Diese Namen bewusst **nicht** umbenennen (`README-PARTIUP-P0.1.md`). Version kommt ausschließlich aus `package.json` (`version-preflight` verbietet hartcodierte Versionen in UI/Batch-Dateien).

## Verbindliche Regeln für die Weiterentwicklung

Die Regeln sind über viele Dokumente verteilt; diese Zusammenfassung verweist auf die Quellen. Bei Konflikt gilt die Quelle.

### Fachlicher Funktionsvertrag (`P0.16.0-BIS-P0.16.20-RETROSPEKTIVE.md`, `P0.16-WIEDERHERSTELLUNGSMATRIX.md`)

- Community, Unterraum, Projekt, Veranstaltung und Beteiligungsvorgang sind **Space-Ausprägungen mit derselben Grundlogik** (Identität, Rollen, Sichtbarkeit, Module, Navigation, Beziehungen, Follow). Abweichungen nur mit dokumentiertem Fachzweck.
- Ein Objekt bleibt **ein** Objekt, auch wenn es mit mehreren Orten, Themen und Communities verknüpft ist. Ort, Thema und Mensch sind gleichwertige Vernetzungsachsen, keine bloßen Filter; Navigation muss in beide Richtungen funktionieren.
- **Kein algorithmisches Ranking** – Übersichten entstehen aus bestehenden Verknüpfungen.
- Unterräume über `parent_id`, keine Spezialtabellen; Eltern-Sichtbarkeit hebt private Kinder nicht auf (`COMMUNITY-SPACES.md`, `SPACE-MODULES-AND-AGGREGATION.md`).
- „Erstellen ≠ Konfigurieren“: minimaler Create-Flow, dann schrittweise Einrichtung; Templates sind nur Modul-Defaults (`SPACE-CREATION-FLOW.md`).
- Funktionen eines Spaces in der Funktionsnavigation; Transparenz/Herkunft („Vertrauen & Herkunft“) unter `ⓘ Info`, Administration unter `⚙ Einstellungen` (`README-PARTIUP-P0.10.4.md`). User-Verifizierungsstufe und offizielle Organisationsautorisierung bleiben getrennt.
- Begriffe: UI sagt „Veranstaltung“ (technisch `event`), Einzelobjekt „Beteiligungsvorgang“, Navigation „Beteiligung“. Freundschaft, Personen-Follow und Mitgliedschaft sind drei getrennte Beziehungen.
- Beteiligung ist ein Kernkonzept quer über alle Space-Typen; Abstimmungen sind keine rechtsverbindlichen Wahlverfahren (`PARTICIPATION-MODEL.md`).
- Chat-Regeln (Medien, Aktionen, Autorenrechte, generische Reaktionen, Medien-Lebenszyklus): Abschnitt „Messaging- und Chat-Leitlinien“ in `P0.16-WIEDERHERSTELLUNGSMATRIX.md`.

### Security & Privacy (Release-Blocker)

- Privacy-/Security-by-Design, Datenminimierung, **Default Deny**, Rechte immer serverseitig und im konkreten Space-Kontext (Owner > Admin > Moderator > Mitglied > Gast; `PERMISSIONS-v0.8.9.md`). UI-Ausblenden ist nur UX.
- Fehlendes Recht für Beteiligte → 403; Außenstehende → 404 ohne Sichtbarkeitsleck. Ein bekannter Link oder eine bekannte ID ist keine Berechtigung.
- Space-Sichtbarkeit, persönliche Föderationsfreigabe (Opt-in, Default aus) und Objektveröffentlichung sind getrennte Entscheidungen (`ACTIVITYPUB-USER-PRIVACY-P0.5.md`). Remote-Eingaben sind nicht vertrauenswürdig (Signaturen, SSRF-Schutz, fail-closed).
- Export und Kontolöschung folgen der Löschmatrix in `PRIVACY-DATA-LIFECYCLE-P0.5.md`. Moderation: Melden, Prüfen, Maßnahme getrennt; nachvollziehbar statt physisch löschen (`MODERATION-SAFETY-v0.9.md`).
- Nutzerinhalte im Frontend immer über `esc()`/`escAttr()` ausgeben (XSS-Preflight).
- Abhängigkeiten exakt pinnen, Lockfile führend; nie `npm audit fix --force`. Keine eigene Krypto-, Rollen- oder Identitätslogik erfinden, sondern bestehende Bibliotheken und Standards nutzen.

### Arbeits- und QA-Regeln (`QA-RELEASE-PROCESS.md`, `QA-FAST-FULL.md`)

- **Eine fachliche Änderung pro Branch/PR.** Vorher betroffene Space-Typen, vernetzte Ansichten, Rechte-, Privacy- und Föderationsgrenzen benennen.
- Produktfehler zuerst mit einem Test **rot** reproduzieren, minimal korrigieren, Test grün, dann alle Gates laufen lassen und den Git-Diff auf Seiteneffekte prüfen.
- Jede Störung einordnen: Produkt-, Test-, Umgebungsfehler oder geteilte Ursache, mit Beleg (Trace/Screenshot). Eine Testkorrektur darf kein echtes Nutzerproblem verdecken.
- Ehrliche QA: keine pauschalen Wartezeiten, `force`-Klicks, Login-/API-Bypässe, höheren Timeouts, Retries oder gelockerten Rate-Limits. Bereitschaft am sichtbaren UI-Zustand messen, nicht nur an HTTP 200.
- Tests prüfen Fachwirkung und Endzustand, nicht starr Labels/Tabnamen. Wie ein Nutzer klicken (z. B. Kartentitel statt Kartenmitte).
- Desktop- und Mobile-Annahmen nie in einem Test mischen (Desktop = Sidebar, Mobile = Bottom-Nav/Drawer `#mobileMore`).
- Rechte-/Privacy-Änderungen brauchen einen serverseitigen Negativtest; neue Ansichten/Kachelvarianten einen Smoke-/Layout-Test.
- Ohne echten Chromium-Lauf (Desktop **und** Mobile) keine Freigabe; nicht Ausgeführtes ausdrücklich als „ungeprüft“ benennen. Visual-Baselines nur nach bewusster Sichtprüfung aktualisieren.

### Schlanker Core, Erweiterbarkeit und Interoperabilität in alle Richtungen

PartiUp ist nicht als abgeschlossene Plattform gedacht. Es ist ein stabiler, bewusst schlanker Kern, der über Erweiterungen wächst, Teil des Fediverse ist und sich mit anderen Systemen (CivicTech/GovTech, Feeds, andere Netzwerke) verbinden lässt, sowohl als anbindender als auch als angebundener Teil. Das ist eine tragende Produktsäule und kein Zusatz.

- **Schichten strikt trennen** (`PARTIUP-P0.1-ARCHITECTURE.md`, `README-PARTIUP-P0.15.md`):
  - Core: Identität, Spaces, Beziehungen, Orte/Themen, Rechte, Moderation, Feed, Participation Core.
  - Module: Veranstaltungen, Projekte, Diskussion, Aufgaben, Medien.
  - Föderation: ActivityPub in `server/federation/`.
  - Connectors: Nicht-ActivityPub-Systeme wie RSS/Atom, AT Protocol/Bluesky und generische APIs in `server/connectors/`.
  - Integrations: fachliche CivicTech-Anbindungen wie Decidim, Consul Democracy, WeChange und öffentliche Demokratiedaten in `server/integrations/`.
  - Erweiterungen: Space-Funktionen mit Manifest in `server/extensions/`.
- **Core klein halten.** Neue Fachfunktionen zuerst als Modul oder Erweiterung auf bestehenden Core-Bausteinen bauen, nicht als neue Sonderlogik im Core. Kommunale Fachverfahren gehören z. B. nicht in den Core, sondern in ein späteres Paket `municipal.participation` (`README-PARTIUP-P0.9.md`). Reihenfolge: **wiederverwenden → integrieren → föderieren → erst dann selbst entwickeln** (ADR-0001).
- **Internes Modell zuerst, externe Abbildung danach.** Kein Anbieter (Mastodon, Mobilizon, Decidim …) bestimmt das PartiUp-Datenmodell. Föderations-Metadaten liegen getrennt in `federation_entities`, externe Herkunft anbieterneutral in `external_sources`/`object_source_links`, ohne anbieterspezifische Tabellen.
- **ActivityPub-Abbildung:** Person ↔ Nutzer, Group ↔ Community/Space, Note ↔ Beitrag/Kommentar, Event ↔ Veranstaltung, inklusive Join/Leave/Accept/Reject, Medienanhänge und Tombstones (`PARTIUP-P0.2-ACTIVITYPUB-MODEL.md`, P0.3–P0.14). Föderierte Inhalte erscheinen in derselben PartiUp-Oberfläche mit sichtbarer Herkunft, nicht in einem getrennten Fediverse-Bereich (P0.11).
- **Föderation ist kontrolliert offen.**
  - Instanz-Governance `open|reviewed|allowlist` plus Peer-Regeln pro Space (P0.8).
  - Eingehende Föderation pro Space getrennt einstellbar: lesen, Antworten, Threads (P0.6).
  - Teilnehmerlisten werden nie föderiert.
  - Die jeweils restriktivere Regel gewinnt.
- **Erweiterungen:**
  - Jede Erweiterung hat ein Manifest mit Capabilities, Datenzugriff, Netzwerkzugriff und UI-Flächen.
  - Beim Aktivieren wird die Änderung auditiert.
  - Für Nutzer erscheint sie als normale Space-Funktion und ist unter „ⓘ Info“ offengelegt (`README-PARTIUP-P0.10.md`).
  - Externe ausführbare Plugins bleiben gesperrt, bis Herkunftsprüfung, Isolation, Capability-Durchsetzung und ein Update-/Rollback-Weg existieren.
- **Connectors und Integrations:**
  - Read-only first; Rückschreiben nur mit eigenem, dokumentiertem Rechte- und Konfliktentscheid.
  - Capabilities werden vorab erklärt, nur HTTPS, Payloads werden normalisiert.
  - Jede Herkunft bleibt sichtbar (Anbieter, externe ID, kanonische URL).
  - Kein versteckter Sync, kein Crawler, kein offener Proxy, kein Tracking.
  - Eine Integration erweitert nie lokale Rechte. Decidim und Consul bleiben eigenständige Systeme und werden nicht in den Core kopiert (`server/connectors/README.md`, `server/integrations/README.md`).
- **Eine kanonische Quelle pro Objekt, eine Nutzeroberfläche.** Externe Systeme bekommen keine parallele Community-Oberfläche (ADR-0001).
- **Stand 2026-10-20:**
  - ActivityPub ist umgesetzt, aber noch nicht mit echten Instanzen über eine eigene HTTPS-Domain gegengetestet.
  - Verfügbare Erweiterung: `partiup.resources`.
  - Connectors (RSS/Atom, ATProto) und Integrations (Decidim, Consul Democracy, WeChange, Demokratiedaten) sind als `planned_adapter` katalogisiert; das Framework steht, Adapter fehlen.
  - Nicht als fertig ausgeben.

### Noch nicht in `main` (Stand 2026-10-20)

Offene PRs enthalten weitere verbindliche Regeln. Vor neuer Arbeit `gh pr list` prüfen, um Doppelarbeit zu vermeiden:
- PR #20 (`security/retrofit-core-2026-10`): `AGENTS.md` (rückwirkende Regeln vom 20.10.2026), `RETROFIT-REVIEW-2026-10-20.md`, `SECURITY-UPDATE-AND-RECOVERY.md`; Umstieg auf Node 24, `npm ci --ignore-scripts`, `npm audit signatures`, better-sqlite3 13.0.3. Enthält PR #16/#17. Nach dem Merge diese Datei an `AGENTS.md` angleichen.
- Branch `docs/content-boundary-drupal-hybrid`: `ADR-0001` (Reuse → Integrate → Federate → erst dann selbst entwickeln; eine kanonische Quelle pro Objekt; Read-only first; eine Nutzeroberfläche).

## Stack & Struktur

- Node.js (CI: 22), Express 4, `better-sqlite3` (natives Modul), `multer`, `sharp`. Kein Build-Schritt, kein Frontend-Framework.
- `server/server.js`: Express-App mit ca. 145 API-Routen, Security-Header, Rate-Limits, CSRF, Sessions (sehr groß, dichte Einzeiler).
- `server/db.js`: Schema (`CREATE TABLE IF NOT EXISTS` plus Migrationen), Demo-Seed, Sichtbarkeits-/Rechtefunktionen (`canView*`, `listEvents` …).
- `server/privacy.js`: Datenexport, Kontolöschung, Datei-Löschwarteschlange.
- `server/federation/`: ActivityPub (protocol, store, governance, key-store, media, security).
- `server/extensions|connectors|integrations/registry.js`: Manifeste/Kataloge; `server/core/architecture.js` liefert den Architektur-Snapshot.
- `server/modules/*/README.md`: nur Grenzmarkierungen; der Modulcode lebt noch in `server.js`/`db.js`.
- `public/index.html`, `public/app.js`, `public/style.css`: Vanilla-JS-SPA (Seiten = `<section class="page">`, Navigation über `data-page`). Farben nur über CSS-Variablen im `:root` von `style.css` (`DESIGN-SYSTEM.md`).
- `data/` (gitignored): SQLite-DBs und private Medien; `uploads/public/`: öffentliche Uploads.
- Die vielen `*.md` im Root sind Release-, Changelog- und Audit-Historie pro Version. Neue Versionen bekommen eigene `CHANGELOG-P0.x.md`/`README-PARTIUP-P0.x.md`; alte nicht umschreiben.

## Befehle

```bash
npm ci                 # Abhängigkeiten exakt nach Lockfile (wie CI)
npm run qa:install     # Playwright-Chromium
npm start              # http://127.0.0.1:3000 (BIND_HOST=0.0.0.0 für LAN)
npm run dev            # node --watch
npm run check          # Syntaxcheck server.js, db.js, app.js
```

Demo-Login (nur außerhalb von Produktion; eine frische DB wird geseedet): `max@bottomupparti.local` / `demo123` (ebenso `anna@…`, `lisa@…`). DB zurücksetzen: `data/bottomupparti.db*` löschen (`reset-database.bat`).

### Test-Gates

CI (`.github/workflows/goldstandard.yml`, jeder PR gegen `main`): `preflight` → `qa:security` → `qa:gold`.

| Befehl | Inhalt |
|---|---|
| `npm run preflight` | ca. 70 statische Preflight-Skripte (`scripts/*-preflight.js`) plus `check` |
| `npm run qa:security` | Integrationstests `tests/integration/` und XSS-Payloads (starten eigenen Server) |
| `npm run qa:gold` | Gold-Preflights, `gold-regressions.integration.js`, Playwright `gold-desktop` + `gold-mobile` |
| `npm run qa:smoke` / `qa:layout` / `qa:accessibility` | Ergänzende Browser-Suiten (nicht in CI auf `main`) |
| `npm run qa:full` | smoke + layout + accessibility + gold |

Stand `main` am 2026-10-20: preflight, qa:security und qa:gold (39/39) sind grün. Rot sind smoke (2 Desktop- und 2 Mobile-Tests), layout (Discover-Karten Desktop) und accessibility (verschachtelte Buttons in Karten mit `role="button"`, ein echter Produktbefund). PR #20 passt genau diese Stellen an (Kartentitel-Aktionen, Smoke-/Layout-/Accessibility-Tests); dort erneut verifizieren.

Einzelne Tests:
```bash
node scripts/messaging-preflight.js
node tests/integration/registration.integration.js
npx playwright test tests/e2e/gold.desktop.spec.js --project=gold-desktop -g "Teil des Testnamens"
```

## Wie die Tests funktionieren

- **Preflights** sind statische Checks, die oft per `includes()`/Regex auf konkrete Strings in `server.js`, `app.js`, `style.css` oder `index.html` prüfen. Beim Umbauen von Code schlägt deshalb leicht ein Preflight fehl. Dann den zugehörigen Preflight lesen und **nur bewusst** anpassen, nie eine Sicherheitsprüfung aufweichen.
- **Integrationstests** (`tests/integration/*.js`, `tests/security/*.js`) sind eigenständige Node-Skripte. Sie starten `server/server.js` auf einem Zufallsport mit eigener DB unter `data/` und nutzen `fetch` mit Cookie-Jar und CSRF-Header `X-BUP-CSRF`. Sie geben ✓/✗ aus und enden mit Exitcode ≠ 0 bei Fehlern.
- **Playwright** (`playwright.config.js`): Server auf Port 3100 mit frischer DB, `workers: 1`, `retries: 0`, Test-Timeout 8 s (Gold 30 s), Expect 3 s. Das Projekt `setup` loggt einmal **sichtbar über die UI** als Max ein (`tests/.auth/user.json`). Viewports: Desktop 1440×1000, Mobile Pixel 7 412×915. Helfer liegen in `tests/helpers/app.js` und `tests/helpers/gold.js`. Gold-Tests sammeln `pageerror`, fehlgeschlagene Requests und HTTP 5xx.
- Testartefakte bei Fehlern: `test-results/` (Trace, Screenshot, Video), Report in `playwright-report/`.

## Git

- Arbeit auf Feature-Branches (`feature/…`, `fix/…`, `ui/…`, `security/…`, `qa/…`), Merge per PR nach `main`.
- Commit-Messages: englisch, Imperativ, ohne Präfix (z. B. „Keep mobile chat composer above bottom navigation“).

## Windows-Hinweise

- Primäre Entwicklungsumgebung ist Windows; in Batch/PowerShell `npm.cmd` verwenden. Python ist nicht installiert. Batch-Skripte: `setup.bat`, `setup-qa.bat`, `start-local.bat`, `start-network.bat`.
- npm ≥ 11 meldet bei `npm ci` „install scripts not yet covered by allowScripts“ für `better-sqlite3`; die mitgelieferte Binary funktioniert trotzdem. Falls `require('better-sqlite3')` scheitert: `npm rebuild better-sqlite3`.
