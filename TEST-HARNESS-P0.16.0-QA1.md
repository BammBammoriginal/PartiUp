# PartiUp P0.16.0 – Test-Harness QA1

## Einordnung

Diese Arbeitskopie basiert unverändert auf der vom Nutzer hochgeladenen P0.16.0-ZIP.
Der Produktstand bleibt Version `0.16.0`. QA1 verändert ausschließlich Test-,
Preflight- und QA-Konfiguration sowie diese Dokumentation.

- Referenz-ZIP SHA-256: `7a009de74c7118f90a341ea32cf246dc7e935cc4c065c1a05e3d0e8e1725f933`
- Git-Referenz-Tag: `reference-p0.16.0-uploaded`
- Der Tag kennzeichnet die unveränderte Quelle, keine freigegebene Gold-Baseline.
- Jede Laufzeitprüfung verwendet eine frische isolierte SQLite-Datenbank.

## Korrigierter Test-Harness

- Der Kommentarbild-Preflight verlangt nicht länger fälschlich exakt P0.15.3.
- API-Integrationstests übernehmen nach erfolgreichem Login den rotierten
  CSRF-Token der neuen Session.
- Federation-Privacy-QA respektiert die getrennte `bio_visibility`; ein
  öffentliches Basisprofil veröffentlicht nicht automatisch eine restriktiver
  freigegebene Bio.
- Playwright-QA authentifiziert über das sichtbare Loginformular und prüft den
  echten Session-Cookie. Es gibt keinen Test-Login-Endpunkt und keinen
  Session-Bypass.
- Ein neuer Frontend-Referenz-Preflight meldet aufgerufene oder als Handler
  gebundene eigene Funktionen, für die keine Definition existiert.
- Lokal erzeugte Abhängigkeiten, Testdatenbanken, Browserberichte, Traces und
  gespeicherte QA-Sitzungen sind von der Versionsführung ausgeschlossen.

## Nachgewiesene Produktblocker – bewusst nicht repariert

### 1. Undefinierte Funktion `wireCards()`

`renderPersonSpace()` ruft in `public/app.js` die Funktion `wireCards()` auf.
Eine Definition existiert nicht. Der neue Frontend-Referenz-Preflight stoppt
deshalb korrekt. Der Aufruf ist auch in den untersuchten Ständen P0.16.18,
P0.16.19 und P0.16.20 noch vorhanden.

### 2. Fehlerhafte Owner-Space-/Rollenvererbung

Nach der CSRF-Harness-Korrektur erreicht die Security-Integration die
Rollenprüfung und weist nach:

```text
Parent membership maps Max to project member: guest
```

Dies entspricht dem später dokumentierten fehlenden `owner_space_id`-Backfill
nach dem Demo-Seed. Es handelt sich um Produkt-/Datenlogik und wurde in QA1
nicht verändert.

## Prüfergebnis

Bestanden:

- Syntaxprüfung von Server, Datenbank und Frontend
- lokaler Start mit frischer Testdatenbank
- Health- und Bootstrap-Endpunkt; vier Orte vorhanden
- Places/Topics/Discovery-Preflight 17/17
- Kommentarbild-Preflight 13/13
- QA-Infrastruktur- und QA-Auth-Preflight
- Event-Zugriffs-Integration
- Privacy-Datenlebenszyklus einschließlich Export/Löschung
- User-Federation-Privacy nach Korrektur des Testfalls
- Federation-Inbox-Ressourcenprüfung
- XSS-Payload-Regression 8/8
- Login-CSRF, Participation-ACL und Reports-IDOR

Absichtlich rot:

- Frontend-Referenz-Preflight: undefiniertes `wireCards()`
- Security-Permissions-Integration: Projektrolle bleibt `guest`

Nicht ausgeführt:

- Playwright Desktop/Mobile, weil in der Arbeitsumgebung kein lokaler
  Chromium-Browser vorhanden ist. Das Ergebnis ist nicht freigabefähig.

## Windows-Befehle

Abhängigkeiten installieren:

```powershell
.\setup.bat
```

Hinweis: `setup.bat` endet in QA1 absichtlich rot, solange die beiden
Produktblocker nicht in einem späteren, ausdrücklich produktbezogenen Schritt
behoben sind.

Playwright-Chromium für die spätere Goldsuite installieren:

```powershell
npx.cmd playwright install chromium
```

Lokal starten:

```powershell
.\start-local.bat
```

Im LAN starten:

```powershell
.\start-network.bat
```

## Nächster Schritt

Als Nächstes wird ausschließlich die neue Goldstandard-Browsersuite aufgebaut.
Die beiden Produktblocker werden erst danach in getrennten roten Tests
reproduziert und jeweils isoliert repariert.
