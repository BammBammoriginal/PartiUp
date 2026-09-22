# Pre-Release Check v0.8.5

## Release Gates
- Grundstruktur: Personen sind ein eigener vernetzter Objekttyp, kein Parallel-Silo.
- Interoperabilität/API: GET /api/people und GET /api/users/:id; Follow-Beziehung anbieterneutral.
- DSGVO/Privacy: serverseitige Sichtbarkeitsprüfung; Mitgliedschaften/Follows/Interessen standardmäßig nicht pauschal öffentlich.
- Security: keine E-Mail-Adresse in fremden Profilen; API no-store; bestehende CSRF/Rate-Limits bleiben.
- UX: eigene Profilseite statt Popup, mobile Karten/Navigation, Deep Links.

## Regression
- Community Spaces, Unterräume, Aggregation, Beteiligung, Events, Projekte und Medien bleiben bestehen.
