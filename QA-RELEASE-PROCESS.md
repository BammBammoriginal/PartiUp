# Aktuelle Ergänzung vom 20.10.2026

Die rückwirkenden Regeln in `AGENTS.md` und `RETROFIT-REVIEW-2026-10-20.md`
gelten für den gesamten Bestand. Ein Prototyp-Goldstand braucht den erfolgreichen
Lauf auf dem exakten PR-Head: Registry-Signaturen, Produktions-/Gesamtaudit,
Preflight, Security/Privacy/Retrofit einschließlich Key-/Recovery-Tests, 43
Desktop-/Mobil-Goldfälle sowie Smoke-, Layout- und DOM-/Accessibility-Gates.
Ein signierter externer Release hat zusätzliche Voraussetzungen aus
`SECURITY-UPDATE-AND-RECOVERY.md`. Bestehende Betreiber- oder Live-Föderations-
Lücken werden durch einen grünen Browserlauf nicht aufgehoben.

# PartiUp QA- und Release-Prozess

Stand: 22.09.2026. Ältere Befehlsbeispiele weiter unten beschreiben
zusätzliche Prüfungen; für den Goldstandard gilt der aktuelle Ablauf hier.

## Aktueller Ablauf: kurze Schleife, belastbare Freigabe

1. **Änderung eingrenzen.** Vor einer Änderung fachliches Verhalten,
   betroffene Space-Typen/Unterräume, vernetzte Ansichten und Privacy-,
   Security- und Föderationsgrenzen benennen. Für reine QA-Korrekturen bleibt
   der Produktcode unverändert. Die gemeinsame Space-Logik ist die
   Grundannahme; Abweichungen werden fachlich begründet.
2. **Eine passende Prüfung zuerst.** Bei einer neuen Funktion oder einem
   gefundenen Produktfehler den relevanten Browserablauf und die nötigen
   serverseitigen Rechte-/Privacy-Regressionen prüfen. Bei einem QA-Fehler
   erst Screenshot, Video, Trace und Netzwerk-/Browserfehler auswerten und
   einen gezielten Einzelfall reproduzieren. Keine Vermutung als gesicherte
   Ursache ausgeben.
3. **Test oder Produkt eindeutig zuordnen.** Für jede Störung festhalten:
   Produktfehler, Testfehler, geteilte Ursache oder Umgebungsfehler; belegen,
   warum. Eine Testkorrektur darf ein reales Nutzerproblem nicht verdecken.
   Start- und Reload-Bereitschaft der Anwendung an sichtbarem Zustand messen,
   nicht allein am Ladeereignis oder einer HTTP-200-Antwort.
4. **Klein korrigieren.** Zuerst den betroffenen Test gezielt ausführen,
   anschließend Goldstandard, Preflight und bei Produkt-/Rechteänderungen
   die Security-/Privacy-Integrationen. Keine pauschalen Wartezeiten,
   erzwungenen Klicks, Login-Bypässe oder erhöhten Timeouts als Ersatz
   für eine Ursache. Releases bleiben mit `retries: 0` ehrlich; ein
   diagnostischer Wiederholungslauf ersetzt keinen bestandenen Erstlauf.
5. **Freigabe nur mit ausführbarem Browser-Gate.** Ein echter Desktop- und
   Mobile-Lauf muss vor Freigabe auf dem exakt gepackten Stand vollständig
   bestehen. Statische Preflights und API-Tests sind eigene Prüfungen,
   kein Browser-Ersatz. Wenn Chromium hier fehlt, lautet der Status
   „Browser ungeprüft“ und es wird keine freigegebene Version behauptet.
   Ein dauerhaft verfügbarer Windows- oder CI-Testrechner sollte diesen
   Schritt übernehmen, damit die Durchführung nicht an den Nutzer fällt.
6. **Keine endlose Kandidatenkette.** Nach einem Fehlschlag zuerst genau
   dessen Trace/Screenshot/Video und die Versionsdifferenz analysieren;
   gezielten Fall testen, dann einmal die ganze Suite. Ohne diese Evidenz
   wird keine weitere ZIP-Version als vermeintliche Korrektur erzeugt.
   Einen fachlich unveränderten Goldstand als Rückfallpunkt behalten.

Der aktuelle Goldstandard verwendet einmalig das **sichtbare Login über die
Oberfläche** und einen echten Session-Cookie. Frühere QA-Versionen mit
direkter Anmeldung über die API sind kein gültiger Goldstandard.

Offener Produktverdacht aus P0.16.24 RC3/RC4: Bedienelemente sind während
des ersten asynchronen Bootstrap-Ladens sichtbar und können schon betätigt
werden. Der QA-Helfer wartet seit RC4 auf den fertig gerenderten Zustand;
damit ist das Verhalten der Anwendung für schnelle echte Klicks noch nicht
bewiesen oder behoben. Nach der RC4-Browserabnahme getrennt reproduzieren,
bei Bestätigung im Produkt lösen und mit einem sichtbaren Browserablauf
absichern. Keine Änderung an Rechten oder personenbezogenen Daten daraus
ableiten.

Ab v0.8.5.5 ist eine Version erst dann als ausspielbar zu betrachten, wenn die festen Gates durchlaufen wurden.

## 1. Statische Produkt-/Architektur-Gates
`npm.cmd run preflight`

Prüft u. a. Grundstruktur, Vernetzung, API-/Interoperabilitätsgrundlagen, Privacy/Security, Mobile-Readiness, Boot-Reihenfolge, Profil-Runtime und Kartenstruktur.

## 2. Browser-E2E-Gates (Playwright)
`npm.cmd run qa:gold` (Pflichtabläufe mit Desktop und Mobile)

`npm.cmd run qa` ist nur die schnelle Teilprüfung und kein vollständiges
Gold- oder Release-Gate.

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
`npm.cmd run release-check:full` (einschließlich echtem Goldstandard)

Offline (ohne npm-Audit-Netzwerkzugriff):
`npm.cmd run preflight` und `npm.cmd run qa:gold` getrennt ausführen;
der Abhängigkeitsaudit bleibt dann ausdrücklich ungeprüft.

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
