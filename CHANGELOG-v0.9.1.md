# BottomUpParti v0.9.1 – Stability & Security

Diese Version ist bewusst kein Feature-Release. Sie stabilisiert den aktuellen Kern vor breiteren Tests.

## Sicherheits-Härtung
- Production startet nicht ohne explizite `BUP_PUBLIC_ORIGIN`.
- SQLite ist im Production-Modus standardmäßig blockiert. Ein bewusster technischer Test erfordert `BUP_ALLOW_SQLITE_PRODUCTION=1`; echter Markt-/Produktionsbetrieb ist weiterhin für PostgreSQL vorgesehen.
- Demo-Seeding ist in Production standardmäßig deaktiviert.
- Vorhandene Demo-Accounts blockieren einen Production-Start.
- Demo-Zugangsdaten werden in Production nicht ausgegeben.
- Cross-Site-Schreibzugriffe werden zusätzlich über `Sec-Fetch-Site` abgewehrt.
- HSTS und Cross-Origin-Opener-Policy ergänzt.
- Cookie-Parser toleriert fehlerhafte Cookie-Header ohne Server-Crash.
- Unbekannte API-Routen liefern kontrolliertes JSON statt der SPA.
- Öffentliche Upload-Dateinamen werden begrenzt/sanitisiert.
- Projektbild-Bearbeitung nutzt das neue Permission-System statt einer alten Creator-Sonderregel.

## Stabilität
- SQLite `busy_timeout=5000` für weniger Lock-Fehler insbesondere unter Windows/QA.
- `synchronous=NORMAL` passend zum WAL-Modus.
- Abgelaufene Sessions werden beim Start bereinigt.
- Rate-Limit-Buckets werden begrenzt/bereinigt.
- Graceful Shutdown für SIGINT/SIGTERM schließt HTTP-Server und SQLite sauber.

## Release Gate
- Neuer `stability-security-preflight` mit 12 statischen Checks ist Bestandteil von `npm run preflight`.

## Wichtig
v0.9.1 ist weiterhin **Closed-Alpha-/lokaler Entwicklungsstand**, nicht als öffentlicher Produktionsbetrieb freigegeben. Vor Marktstart fehlen mindestens Produktionshosting/PostgreSQL, Backups/Restore-Test, Monitoring, echte Account-/Verifizierungsflüsse, Security-Review/Pentest sowie rechtliche/DSGVO-/DSA-Dokumentation und Prozesse.
