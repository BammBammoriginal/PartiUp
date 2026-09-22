# BottomUpParti QA- und Release-Prozess

Ab v0.8.5.5 ist eine Version erst dann als ausspielbar zu betrachten, wenn die festen Gates durchlaufen wurden.

## 1. Statische Produkt-/Architektur-Gates
`npm.cmd run preflight`

Prüft u. a. Grundstruktur, Vernetzung, API-/Interoperabilitätsgrundlagen, Privacy/Security, Mobile-Readiness, Boot-Reihenfolge, Profil-Runtime und Kartenstruktur.

## 2. Browser-E2E-Gates (Playwright)
`npm.cmd run qa`

Zwei feste Viewports werden geprüft:
- Desktop Chrome: 1440 × 1000
- Mobile / Pixel 7: 412 × 915

Die Tests decken ab:
- Login und Bootstrap
- Startseite, Entdecken, Communities, Menschen, Events, Projekte, Beteiligung
- Community-Space und Nutzerprofil
- Event öffnen / Teilnahmeaktion
- horizontales Overflow
- Kartenüberlappungen
- Ersteller-Metadaten innerhalb ihrer Kachel
- mobile Bottom-Navigation
- doppelte IDs
- verschachtelte interaktive Elemente
- zugängliche Button-Namen
- `alt`-Attribute von Bildern

Bei einem Fehler speichert Playwright Trace/Screenshot/Video unter `test-results/`.

## 3. Pixelbasierte Visual Regression (bewusst separat)
Da Windows/Linux bei Fonts und Emoji leicht unterschiedlich rendern, ist die pixelgenaue Baseline maschinen-/plattformgebunden.

Baseline auf dem Testrechner bewusst erzeugen/aktualisieren:
`npm.cmd run qa:baseline`

Danach vergleichen:
`npm.cmd run qa:visual`

Baselines niemals automatisch bei jedem Release überschreiben. Eine Layoutänderung soll bewusst bestätigt werden.

## 4. Dependency-/Security-Gate
`npm.cmd run audit:prod`

Keine bekannte produktionsrelevante Schwachstelle ab `moderate` wird stillschweigend akzeptiert. Falls kein Fix verfügbar ist, muss die Ausnahme vor dem Release dokumentiert und bewertet werden.

## 5. Gesamtes Release-Gate
`npm.cmd run release-check`

Offline (ohne npm-Audit-Netzwerkzugriff):
`npm.cmd run release-check:offline`

## 6. Release-Regeln
- Keine neue ZIP nur nach Syntaxprüfung.
- Server muss real booten.
- Kernpfade müssen in einem Browser getestet werden.
- Desktop **und** Mobile müssen bestehen.
- Neue Kernansichten werden in die Smoke-/Layout-Suite aufgenommen.
- Neue Kachel-/Renderer-Varianten bekommen einen Layout-Test.
- Privacy-/Access-Änderungen bekommen einen serverseitigen Regressionstest.
- Versionsnummern werden aus `package.json` abgeleitet bzw. gegen diese geprüft.
- Visual Baselines werden nur nach bewusster Sichtprüfung aktualisiert.

## 7. Feste BottomUpParti-Prämissen
Jeder Release wird weiterhin gegen vier Hauptprämissen geprüft:
1. logische, schlanke, nachvollziehbare Grundstruktur
2. Interoperabilität und API-Readiness
3. DSGVO / Privacy-by-Design / Security-by-Design
4. hochwertige Mobile-first UX und App-Readiness

## QA-Authentifizierung und Mobile Navigation (ab v0.8.7.3)

- Die E2E-Suite authentifiziert sich genau einmal über ein Playwright-Setup-Projekt.
- Desktop- und Mobile-Projekte verwenden anschließend denselben gespeicherten Test-Session-State.
- Dadurch darf die QA das produktive Login-Rate-Limit nicht durch wiederholte `beforeEach`-Logins auslösen.
- Mobile Navigation muss reale Nutzerwege abbilden: Ziele in der Bottom-Navigation werden direkt geöffnet; übrige Hauptnavigation über den mobilen Drawer.
- Viewport-spezifische Assertions müssen pro Playwright-Projekt verzweigen und dürfen nicht erst nach einem fehlschlagenden gemeinsamen `beforeEach` übersprungen werden.

## Authentifizierung der QA ab v0.8.7.4
Die Test-Suite provisioniert ihre Session einmalig über die Login-API innerhalb des Playwright-Browser-Kontexts. Das ist bewusst von den UI-Tests getrennt: Ein versteckter oder außerhalb des Viewports liegender Login-Button darf nicht die gesamte Regression-Suite blockieren. Die Login-Oberfläche selbst bleibt ein eigener UX-/Smoke-Testpfad.
