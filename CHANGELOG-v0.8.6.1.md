# v0.8.6.1 – QA/Security Release Hardening

- `@playwright/test` auf 1.62.1 aktualisiert (gepatchte aktuelle Stable-Linie).
- Versionsprüfung liest die Soll-Version nun aus `package.json`; keine hart codierte Vorversion mehr.
- Neuer `version-preflight` blockiert Versionsdrift zwischen package.json, Server, UI und Startskripten.
- Dependency-Preflight prüft zusätzlich die Synchronität von `package-lock.json` und QA-Abhängigkeiten.
- `release-check` prüft jetzt sowohl Produktions- als auch Dev-Abhängigkeiten via `npm audit`.
- Messaging-Funktionen aus v0.8.6 unverändert.
