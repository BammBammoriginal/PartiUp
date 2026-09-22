# PartiUp p0.5 – Private Event Access Hardening

## Access-Modell

Event-Zugriff wird serverseitig in drei getrennte Entscheidungen aufgeteilt:

1. **Sichtberechtigung** – `canViewEventRow()` entscheidet, ob Eventdetails bzw. Eventlisten einen Datensatz ausgeben dürfen.
2. **Teilnahme-Anfrage/-Beitritt** – `canRequestEventAttendance()` entscheidet unabhängig davon, ob ein Nutzer RSVP auslösen darf.
3. **Genehmigte Teilnahme** – `hasApprovedEventAttendance()` erkennt ausschließlich bestätigte Attendance-Zustände als Zugangsgrund.

### Attendance-Status

- `going`: bestätigte Teilnahme, darf bei nichtöffentlichen Events Zugriff begründen.
- `maybe`: bestätigter Teilnehmerzustand im bestehenden Datenmodell, darf Zugriff begründen.
- `requested`: reine offene Freigabeanfrage; **kein Sichtrecht**.
- `waitlist`: Wartelisten-/Kapazitätsstatus; **kein Sichtrecht**.

Das bestehende Schema besitzt keinen separaten Attendance-Status `approved`; eine freigegebene Anfrage wird daher im bestehenden Modell durch einen bestätigten Status (`going`/`maybe`) repräsentiert.

### Private / unlisted Events

- Ersteller: Zugriff.
- bestätigte Teilnehmer (`going`/`maybe`): Zugriff.
- `invite`: Einladung begründet Sichtrecht nur, wenn die Event-Policy `invite` ist.
- `members`: Community-Mitgliedschaft begründet Sichtrecht nur, wenn die Event-Policy `members` ist.
- `trust`: Nutzer, die die konfigurierte Mindest-Verifizierungsstufe erfüllen, erfüllen das entsprechende Policy-Gate.
- `approval`: eine RSVP-Anfrage kann `requested` erzeugen, aber `requested` gibt weder Detail-, Listen- noch Bootstrap-Zugriff.
- `open`: hebt bei nichtöffentlichen Events die Sichtbarkeitsgrenze nicht auf. Kenntnis einer Event-ID ist keine Autorisierung.

Öffentliche Events bleiben öffentlich. Nicht gelistete Events bleiben wie bisher nicht anonym sichtbar und unterliegen für privilegierten Zugriff derselben zentralen Policy-Auswertung.

## Durchgesetzte Serverpfade

- `GET /api/events/:id` -> `eventDetail()` -> `canViewEventRow()`
- `POST /api/events/:id/rsvp` -> `canRequestEventAttendance()` vor jeder Attendance-Änderung
- Eventlisten -> `listEvents()` -> `canViewEventRow()`
- `/api/bootstrap` -> `listEvents()`
- Community-Event-Aggregation -> `listEvents()`

Damit ist die Zugriffskontrolle nicht vom Client abhängig.

## Tests

Neu: `tests/integration/event-access.integration.js`

Abgedeckt werden:
- anonymous -> private event -> 404
- unrelated authenticated user -> kein Zugriff
- approval RSVP -> `requested`
- `requested` -> weiterhin kein Detail-/Bootstrap-Zugriff
- bestätigte Teilnahme -> Zugriff
- `waitlist` -> kein privater Detailzugriff
- Einladung -> Zugriff nur mit `invite`-Policy
- Community-Mitglied -> Zugriff mit `members`-Policy
- Community-Mitglied -> kein Bypass einer `approval`-Policy
- public Regression
- unlisted Regression

`npm run qa:security` führt den bestehenden Security-Integrationstest und anschließend den neuen Event-Access-Integrationstest aus.

## Testergebnis in der Build-Sandbox

Erfolgreich ausgeführt:
- `npm run check` – Syntaxprüfung erfolgreich.
- `node scripts/security-preflight.js` – 24/24 bestanden.
- `node scripts/stability-security-preflight.js` – 12/12 bestanden.
- `node scripts/privacy-hardening-preflight.js` – 11/11 bestanden.

Der HTTP-Integrationstest konnte in der isolierten Build-Sandbox nicht vollständig ausgeführt werden, weil das hochgeladene Archiv keine `node_modules` enthält und `npm ci` mangels Registry-Netzzugriff nicht abgeschlossen werden konnte (`Cannot find module 'express'` beim Serverstart). Der Integrationstest selbst besteht die Node-Syntaxprüfung und ist in `qa:security` eingebunden.
