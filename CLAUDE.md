# Claude Code – PartiUp

@AGENTS.md

Die Regeln oben (`AGENTS.md`) gelten vollständig. Lies außerdem `docs/AI-COLLABORATION.md` und `docs/PROJECT-REGISTER.md`, bevor du anfängst. Diese Datei ergänzt nur, was für Claude Code spezifisch oder praktisch nötig ist. Projektsprache (UI, Doku, Testnamen, PR-Texte) ist Deutsch; Commit-Messages sind kurze englische Imperativsätze.

## Deine Rolle

Du bist standardmäßig der ausführende Coding-Agent: kleinste saubere Änderung planen, aktuellen GitHub-Stand prüfen, nur den vereinbarten Umfang umsetzen, testen, dokumentieren, PR erstellen oder aktualisieren. ChatGPT/Work übernimmt Planung und unabhängiges Review. Code und Testnachweise haben Vorrang vor KI-Behauptungen.

**Grenzen:** kein Push nach `main`, kein eigenmächtiger Merge, kein produktiver Rollout, keine irreversiblen Datenbankaktionen, keine Abhängigkeits-Updates oder Lockerungen der Sicherheit ohne ausdrückliche Freigabe der projektverantwortlichen Person.

**Modernisierung:** Die menschliche Übernahmefähigkeit ist ein aktiver Auftrag (`docs/HUMAN-HANDOVER-ROADMAP.md`). Beginne mit Etappe 1 (Bestandsaufnahme), nicht mit einem großen Refactoring, und starte eine Code-Etappe erst nach Freigabe des vorherigen PR. Die Priorität gegenüber Sicherheit, Föderations-PoC und MVP steht im Projektregister.

## Stack und Struktur

- Node.js mit Express 4, `better-sqlite3` (natives Modul), `multer`, `sharp`. Kein Build-Schritt, kein Frontend-Framework. Laufzeit: Node 24 ab PR #20 (`engines`); `main` lief vorher in der CI mit Node 22.
- `server/server.js`: Express-App mit rund 145 API-Routen, Security-Header, Rate-Limits, CSRF, Sessions (sehr groß, dichte Einzeiler).
- `server/db.js`: Schema (`CREATE TABLE IF NOT EXISTS` plus Migrationen), Demo-Seed, Sichtbarkeits- und Rechtefunktionen.
- `server/privacy.js`: Datenexport, Kontolöschung, Datei-Löschwarteschlange.
- `server/federation/`: ActivityPub (protocol, store, governance, key-store, media, security).
- `server/extensions|connectors|integrations/registry.js`: Manifeste und Kataloge. `server/modules/*/README.md` sind nur Grenzmarkierungen; der Modulcode lebt noch in `server.js`/`db.js`.
- `public/index.html`, `public/app.js`, `public/style.css`: Vanilla-JS-SPA (Seiten = `<section class="page">`, Navigation über `data-page`).
- `data/` (gitignored): SQLite-DBs und private Medien; `uploads/public/`: öffentliche Uploads.
- Die vielen `*.md` im Root sind Release-, Changelog- und Audit-Historie. Neue Versionen bekommen eigene Dateien; alte nicht umschreiben.
- Env-Variablen, Cookies und Standard-DB heißen aus Kompatibilität noch `BUP_*`, `bup_session`, `bottomupparti.db`; nicht umbenennen. Die Version kommt ausschließlich aus `package.json`.

## Befehle

```bash
npm ci --ignore-scripts   # Installation exakt nach Lockfile, ohne Installationsskripte (ab PR #20)
npm run supply-chain-preflight && npm audit signatures && npm run audit:prod && npm run audit:all
npm run deps:build        # prüft das mitgelieferte SQLite-Modul (ab PR #20)
npm run qa:install        # Playwright-Chromium
npm start                 # http://127.0.0.1:3000 (BIND_HOST=0.0.0.0 für LAN)
npm run check             # Syntaxcheck server.js, db.js, app.js
```

Auf Windows in Batch/PowerShell `npm.cmd` verwenden. Python ist nicht installiert. Lädt `better-sqlite3` nicht, ist das ein Befund für `deps:build`; nicht mit `npm rebuild` oder freigegebenen Installationsskripten umgehen.

Demo-Login (nur außerhalb von Produktion, frische DB wird geseedet): `max@bottomupparti.local` / `demo123` (ebenso `anna@…`, `lisa@…`). DB zurücksetzen: `data/bottomupparti.db*` löschen.

## Tests in der Praxis

| Befehl | Inhalt |
|---|---|
| `npm run preflight` | rund 70 statische Preflight-Skripte (`scripts/*-preflight.js`) plus `check` |
| `npm run qa:security` | Integrationstests `tests/integration/` und XSS-Payloads |
| `npm run qa:smoke` / `qa:layout` / `qa:accessibility` | ergänzende Browser-Suiten, getrennt Desktop/Mobile |
| `npm run qa:gold` | Gold-Preflights, Gold-Regressionen, Playwright `gold-desktop` + `gold-mobile` |

CI (`.github/workflows/goldstandard.yml`) läuft auf jedem PR gegen `main`; ab PR #20 mit Lieferkette, Audits und allen Suiten. Nach einem Merge läuft die CI nicht automatisch auf `main`.

```bash
node tests/integration/registration.integration.js
npx playwright test tests/e2e/gold.desktop.spec.js --project=gold-desktop -g "Teil des Testnamens"
```

- **Preflights** prüfen oft per `includes()`/Regex konkrete Zeichenketten in Quelltext und Testdateien. Schlägt einer nach einer verhaltensgleichen Änderung fehl, nach `AGENTS.md` §6 vorgehen, nie eine Sicherheitsprüfung aufweichen.
- **Integrationstests** sind eigenständige Node-Skripte: eigener Server auf Zufallsport, eigene DB unter `data/`, `fetch` mit Cookie-Jar und CSRF-Header `X-BUP-CSRF`, Ausgabe ✓/✗, Exitcode ≠ 0 bei Fehlern.
- **Playwright** (`playwright.config.js`): Port 3100, frische DB, `workers: 1`, `retries: 0`, Timeout 8 s (Gold 30 s), Expect 3 s. Projekt `setup` meldet sich einmal sichtbar über die UI an. Desktop 1440 × 1000, Mobile Pixel 7 412 × 915. Helfer: `tests/helpers/app.js`, `tests/helpers/gold.js`.
- Linux-CI und Windows rendern Schrift unterschiedlich. Ein Test, der nur in der CI scheitert, wird über das Artefakt `gold-browser-failure` (Screenshot, Trace) eingeordnet: `gh run download <run-id>`.
- Artefakte lokal: `test-results/`, Report in `playwright-report/`.

## Git

- Branches `feature/…`, `fix/…`, `ui/…`, `security/…`, `qa/…`, `docs/…`; Merge per PR nach `main`.
- Für Arbeit an einem fremden PR-Branch einen separaten `git worktree` verwenden, damit der Haupt-Checkout unberührt bleibt.
- Commit-Messages englisch, Imperativ, ohne Präfix, mit Begründung im Text, wenn die Änderung nicht selbsterklärend ist.

Den aktuellen Projektstand (Testergebnisse, offene Befunde, PR-Lage) nicht hier pflegen, sondern im Projektregister.
