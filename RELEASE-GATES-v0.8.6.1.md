# Release-Gates ab v0.8.6.1

Eine neue BottomUpParti-Version darf nicht ausgeliefert werden, wenn eines dieser Gates fehlschlägt:

1. `npm install` erzeugt/synchronisiert das Lockfile.
2. `npm audit --omit=dev --audit-level=moderate` muss ohne produktionsrelevante Findings durchlaufen.
3. `npm audit --audit-level=moderate` muss auch die QA-/Dev-Abhängigkeiten prüfen.
4. `npm run version-preflight` prüft die Versionsnummer dynamisch aus `package.json` gegen Server, UI und Startskripte.
5. `npm run preflight` prüft Produktstruktur, Security/Privacy, Mobile, Messaging, Boot/Runtime und UI-Struktur.
6. `npm run qa` prüft Desktop/Mobile im echten Browser.
7. Nur danach gilt `npm run release-check` als bestanden.

## Vermeidungsregeln
- Keine hart codierte Soll-Version in Tests.
- Keine neue ZIP auf Basis eines alten `package-lock.json` ohne erneute Dependency-Prüfung.
- QA-Dependencies sind Bestandteil des Security-Gates, nicht ausgenommen.
- Runtime-/Login-/Bootstrap-Pfade werden vor Release ausgeführt, nicht nur syntaktisch geprüft.
- UI-Kernseiten werden in Desktop und Mobile getestet.
