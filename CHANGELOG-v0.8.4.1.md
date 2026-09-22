# Changelog v0.8.4.1

## Space-Nesting korrigiert
- Unterräume können eigene Events, Projekte und Beteiligung anlegen.
- Bestehende Umfragen/Feed bleiben Space-eigen.
- Inhalte besitzen einen primären `owner_space_id` und eine `propagation_scope`.
- `own`: nur eigener Space.
- `parent`: zusätzlich direkter Eltern-Space.
- `root`: zusätzlich alle übergeordneten Spaces bis zur Haupt-Community.
- Aggregierte Inhalte zeigen ihren Ursprungs-Space.

## Modulare Räume
- `space_modules` als neutrales Modulmodell.
- Admins/Moderatoren können zentrale Module aktivieren/deaktivieren.
- Unterräume übernehmen zunächst die Modulkonfiguration des Elternraums.

## Interoperabilität / Import-Readiness
- `external_sources`: neutrale Beschreibung externer Quellen.
- `object_source_links`: Provenance, externe ID, Sync-Modus, Source-of-Truth und letzter Sync.
- Keine Anbieterabhängigkeit im Kernmodell.
- Demo-Spielplanquelle zeigt die spätere Verbands-/Kalenderintegration strukturell.

## Nicht Ziel dieser Version
Keine echte Drittanbieter-Synchronisation. Die Version schafft die notwendige saubere Grundlage.
