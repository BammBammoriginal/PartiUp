# PartiUp P0.16.0 – Goldstandard-Browser-QA2

## Status und Abgrenzung

QA2 baut die verpflichtende Browser-Regression auf der unveränderten
P0.16.0-Produktbaseline auf. In `public/`, `server/` und der Datenbanklogik
wurde nichts verändert. Die Tests verwenden bei jedem Lauf eine neue,
eindeutig benannte SQLite-Datenbank.

Die Suite ist ein Release-Gate, keine Freigabe: P0.16.0 bleibt so lange rot,
bis alle Browserabläufe in echtem Chromium bestanden sind und die bekannten
Produktblocker in getrennten Folgeschritten behoben wurden.

## Goldstandard-Inventar

Playwright registriert 21 Tests: einen sichtbaren Login-Setup-Test und 20
fachliche Desktop-/Mobile-Abläufe.

### Identität und Schutz

- sichtbares Login über E-Mail und Passwort;
- echter Session-Cookie, kein Test-Login-Endpunkt;
- Reload mit erhaltener Sitzung;
- vollständiges Logout einschließlich Kontoanzeige;
- geschützte Erstellung bleibt danach gesperrt;
- erneutes sichtbares Login;
- eigener anonymer Browserzustand.

### Gleichwertige Objekt-/Space-Logik

- Veranstaltung global erstellen, speichern, öffnen und nach Reload finden;
- Projekt global erstellen, speichern, öffnen und nach Reload finden;
- Beteiligung global erstellen, speichern, öffnen und nach Reload finden;
- Veranstaltung, Projekt und Beteiligung in einem verwalteten Community-Space;
- sofortige Einbettung bzw. Wiederauffindbarkeit im Space;
- Unterraum erstellen und dort denselben Projektablauf nutzen;
- Aufgaben- sowie Vertrauen-/Herkunftsfunktion bei Projekt und Event.

Die Prüfung akzeptiert für dieselbe Funktion sowohl einen eigenen
„Vertrauen“-Bereich als auch die semantisch gleichwertige Einordnung unter
„Info“. Entscheidend ist, dass „Vertrauen & Herkunft“ erreichbar und
funktional bleibt. Dadurch erkennt die QA Sprach-/Benennungsänderungen, ohne
eine fachlich gleichwertige Oberfläche fälschlich abzulehnen.

### Vernetzung als USP

- Orts-Dropdown enthält echte Optionen;
- Ortswechsel aktualisiert Überschrift und Kontext;
- Ort → Thema behält den kombinierten Ortsfilter;
- Navigation über Ort, Thema, Community und Person;
- dieselben Objekte bleiben über Hauptlisten erreichbar;
- keine Prüfung behandelt Event, Projekt oder Beteiligung als isolierten
  Sondertyp außerhalb der gemeinsamen Space-/Beziehungslogik.

### Kommunikation und Mobile

- Unterhaltung über die sichtbare Oberfläche starten;
- Nachricht senden und nach Reload wiederfinden;
- Mobile-Viewport exakt 412 × 915;
- Bottom-Navigation, Drawer und Backdrop bedienen;
- Kernobjekte mobil erstellen und nach Reload finden;
- Community-Funktionsbereiche mobil erreichen;
- horizontales Overflow prüfen.

### Fehler, die nicht mehr unsichtbar bleiben dürfen

Jeder fachliche Test sammelt zusätzlich:

- unbehandelte `pageerror`-Ereignisse;
- fehlgeschlagene Browserrequests;
- HTTP-5xx-Antworten;
- Trace, Screenshot und Video bei Playwright-Fehlern.

Der statische `qa:gold:preflight` sichert ab, dass die vereinbarten
Goldstrecken nicht aus der Suite entfernt oder durch einen Auth-Bypass ersetzt
werden.

## Bereits belegte bzw. erwartete rote Baseline-Fälle

Diese Befunde sind durch Quelltext/Integration belegt; die Browserbestätigung
steht wegen des fehlenden Chromium-Binaries in dieser Arbeitsumgebung noch aus:

1. `renderPersonSpace()` ruft die nicht definierte Funktion `wireCards()` auf.
   Der Personen-Navigationstest muss dies als `pageerror` melden.
2. Das Demo-Projekt `p1` besitzt in P0.16.0 keinen wirksam abgeleiteten
   `owner_space_id`; Max wird dadurch als `guest` statt `member` aufgelöst.
3. Ein Themenchip aus „Lokal entdecken“ transportiert in P0.16.0 den gewählten
   Ortsfilter nicht. Der Goldtest verlangt deshalb
   `data-context-place-filter` und muss vor der späteren Korrektur rot sein.

Die vom Nutzer an P0.16.20 beobachteten Regressionen – inkonsistentes Logout,
fehlende Erstellabläufe und leeres Orts-Dropdown – sind ebenfalls als echte
Browserabläufe enthalten. Für P0.16.0 werden ihre Ergebnisse erst nach dem
lokalen Chromium-Lauf behauptet.

## Ausführung unter Windows

Einmalig:

```powershell
.\setup.bat
npx.cmd playwright install chromium
```

Goldstandard vollständig:

```powershell
npm.cmd run qa:gold
```

Getrennt:

```powershell
npm.cmd run qa:gold:desktop
npm.cmd run qa:gold:mobile
```

Vollständiges Release-Gate einschließlich Goldsuite:

```powershell
npm.cmd run release-check:full
```

## Freigaberegel

Fehlt Chromium oder kann auch nur ein Pflichtablauf nicht ausgeführt werden,
lautet das Ergebnis „nicht geprüft“ beziehungsweise „rot“ – niemals
„bestanden“. Erst nach reproduzierbar grünem Desktop- und Mobile-Lauf dürfen
Produktkorrekturen einzeln übernommen und eine neue Baseline vorgeschlagen
werden.
