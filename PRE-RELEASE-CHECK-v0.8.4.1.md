# Pre-Release Check v0.8.4.1

## Release-Gates

### 1. Grundstruktur
- Spaces/Unterräume nutzen weiter dasselbe Community-Modell.
- Keine Parallelmodelle für Verein, Team oder Gruppe.
- Inhalte werden einmal gespeichert und über Beziehungen/Aggregation sichtbar gemacht.
- Modulkonfiguration ist pro Space möglich, Übersicht und Über bleiben als feste Basis.

### 2. Vernetzung
- Events, Projekte und Beteiligung besitzen einen primären Ursprungs-Space.
- Propagation: eigener Space / direkter Eltern-Space / bis Haupt-Community.
- Ursprungs-Space bleibt in aggregierten Ansichten sichtbar.
- Bestehende Orte-/Themen-/Community-Beziehungen bleiben erhalten.

### 3. Interoperabilität & API-Readiness
- Provider-neutrale `external_sources`.
- `object_source_links` für externe ID, Provenance, Sync-Modus und Source-of-Truth.
- REST, GraphQL, iCal/ICS, RSS/Atom, ActivityPub, JSON und CSV strukturell vorgesehen.
- Keine Bindung des Kernmodells an Mobilizon, Decidim, WeChange oder andere einzelne Anbieter.

### 4. Privacy & Security
- Private Communities bleiben serverseitig geschützt.
- Private/unlisted Projekte werden nicht durch Space-Aggregation öffentlich.
- Aggregation hebt keine Zugriffsrechte auf.
- Bestehende CSRF-, Session-, Upload-, Rate-Limit- und Privacy-Prüfungen bleiben aktiv.

### 5. Mobile & UX
- Community-Space-Navigation bleibt responsive und touchfähig.
- Modulregister werden nur angezeigt, wenn das Modul aktiv ist.
- Erstellen im Unterraum zeigt den Kontext und die gewünschte Aggregationsstufe verständlich an.
- Herkunft aggregierter Inhalte wird kompakt und nicht überladen angezeigt.

## Automatisierte Prüfungen
- Produkt/Architektur: 71/71 bestanden.
- Security/Privacy: 24/24 bestanden.
- Mobile/App UX: 20/20 bestanden.
- Node/Browser-JavaScript Syntax: bestanden.
- SQLite-Schema statisch gegen SQLite geprüft: bestanden.
- ZIP-Integrität: vor Auslieferung geprüft.

## Dependency-Hinweis
Ein vollständiges `npm audit` benötigt die lokal installierte Dependency-Auflösung. Nach `npm.cmd install` daher zusätzlich `npm.cmd audit` ausführen. Kein `--force` ohne Einzelprüfung.
