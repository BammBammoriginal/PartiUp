# Production Readiness Gate – v0.9.1

## Status
**Nicht production-ready.** v0.9.1 ist ein gehärteter Closed-Alpha-Stand.

## Vor externem Closed-Alpha-Test
- `npm.cmd audit` ohne relevante offene Findings
- `npm.cmd run preflight`
- `npm.cmd run qa:full`
- ausschließlich Testdaten
- temporärer Tunnel nur bewusst und zeitlich begrenzt
- Backup des Test-Datenbestands

## Vor öffentlichem Markt-/Produktionsbetrieb zwingend
1. PostgreSQL statt lokaler SQLite-Datei und getestete Migration.
2. EU/EWR-Hostingkonzept, TLS über Reverse Proxy, Secret-/Environment-Management.
3. Automatisierte verschlüsselte Backups + dokumentierter Restore-Test.
4. Monitoring, Error-Tracking, Audit-/Security-Logging mit Datenminimierung.
5. Registrierung, Passwort-Reset, E-Mail-Verifizierung und sichere Recovery-Flows.
6. Organisatorische Verifizierung/Official-Account-Prozess.
7. Rechte-/Moderations-Integrationstests inklusive Missbrauchsfällen.
8. Externer Security-Review/Pentest vor öffentlichem Launch.
9. Datenschutzinformationen, AV-Verträge/Verzeichnis der Verarbeitungstätigkeiten soweit erforderlich, Lösch-/Auskunftsprozesse und Aufbewahrungsfristen fachlich/rechtlich prüfen.
10. DSA-/Melde-/Moderationsprozesse entsprechend tatsächlichem Dienstmodell rechtlich prüfen.
11. Abuse-/Rate-Limit-/Spam-Schutz für öffentlich erreichbare Registrierung und Interaktionen.
12. Incident-Response-, Patch- und Dependency-Update-Prozess.

## Production-Fail-Closed in diesem Build
`NODE_ENV=production` benötigt `BUP_PUBLIC_ORIGIN`. SQLite ist zusätzlich blockiert, solange `BUP_ALLOW_SQLITE_PRODUCTION=1` nicht bewusst gesetzt wird. Diese Ausnahme ist nur für technische Staging-Tests gedacht, nicht als Empfehlung für echten Betrieb.
