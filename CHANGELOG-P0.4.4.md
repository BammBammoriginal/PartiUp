# PartiUp P0.4.4

Runtime-Fix fuer lokale/LAN-Starts nach Einfuehrung des Federation-Registers.

- `federation_entities.canonical_uri` verwendet fuer nicht konfigurierte lokale Federation-Identitaeten jetzt `NULL` statt eines leeren Strings.
- Bestehende Legacy-Zeilen mit `canonical_uri = ''` werden beim Schema-Setup auf `NULL` migriert.
- Damit kollidieren mehrere lokale Objekte nicht mehr mit dem `UNIQUE(canonical_uri)`-Constraint.
- Ein Start ohne `PARTIUP_BASE_URL` entfernt bewusst temporaere/stale kanonische Tunnel-URIs lokaler Objekte statt sie als dauerhafte Identitaet weiterzutragen.
- `source_uri` und `origin_host` werden beim lokalen Upsert konsistent mit der aktuell konfigurierten Basis aktualisiert.

Sicherheits-/Architekturprinzip bleibt: localhost/LAN-Adressen werden nie als dauerhafte ActivityPub-Identitaet gespeichert.
