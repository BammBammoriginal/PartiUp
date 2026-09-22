# Pre-Release-Check v0.8.4

Prüfung gegen die verbindlichen BottomUpParti-Prämissen:

## 1. Logische, schlanke Grundstruktur
- Community bleibt ein einziger Objekttyp.
- Untergruppen/Teams verwenden dasselbe Community-Modell mit Parent/Child-Beziehung.
- Orte, Themen, Projekte, Events und Beteiligungen bleiben als verknüpfte eigenständige Objekte erhalten.
- Popup wird nur noch für kurze Aktionen/Formulare genutzt; Community selbst ist ein eigener Space.

## 2. Interoperabilität & API-Readiness
- bestehende Community-API bleibt erhalten.
- Unterräume sind explizit über `GET/POST /api/communities/:id/subspaces` erreichbar.
- keine proprietäre Sonderstruktur für Vereinsmannschaften oder Arbeitsgruppen.
- Deep-Link-Struktur für spätere App-/PWA-Routen vorbereitet.

## 3. DSGVO / Privacy / Security
- private Communities bleiben backendseitig geschützt.
- unlisted/private Unterräume werden nicht öffentlich über Eltern-Spaces geleakt.
- Mitgliederliste wird nur an Mitglieder ausgeliefert.
- Unterräume können nur durch berechtigte Admins/Moderatoren erstellt werden.
- Security-Preflight: 24/24 bestanden.

## 4. UX / Mobile-first
- Community-Navigation ist als horizontal scrollbar Tab-Leiste mobil nutzbar.
- Übersicht bündelt Teams, Termine, Kennzahlen und Beziehungen statt alles gleichzeitig zu zeigen.
- Unterräume besitzen eigene Seiten und können beliebig weiter strukturiert werden.
- Mobile/App-Preflight: 20/20 bestanden.

## Automatisierte Prüfung
- Produkt/Architektur: 60/60 bestanden.
- Security/Privacy: 24/24 bestanden.
- Mobile/App: 20/20 bestanden.
- Node/JavaScript-Syntaxprüfung bestanden.
