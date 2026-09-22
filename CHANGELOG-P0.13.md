# PartiUp P0.13 — Connector Framework

- Separate Connector Layer für Nicht-ActivityPub-Systeme konkretisiert.
- Zentrales Connector-Registry mit expliziten Capabilities eingeführt.
- Provider-neutrale Normalisierung mit verpflichtender Provenance definiert.
- Strikte HTTPS-Quellvalidierung ohne URL-Zugangsdaten.
- Schlanke öffentliche Katalog-/Framework-API ergänzt.
- RSS/Atom, ATProto und generische APIs als geplante Adapter modelliert, aber bewusst noch nicht als fertige Integration ausgegeben.
- Keine neue Remote-Fetch-/Proxy-/Sync-Logik und keine Änderung bestehender Federation-/Space-/RBAC-Prozesse.
