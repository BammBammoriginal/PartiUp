# PartiUp P0.13

P0.13 legt das Grundgerüst für externe Connectoren an. Connectoren dienen Nicht-ActivityPub-Systemen und bleiben strikt von Federation und Produktlogik getrennt.

## Neu

- `server/connectors/registry.js`: Manifeste, Capabilities, Quellvalidierung, provider-neutrale Normalisierung und Provenance.
- `GET /api/connectors/catalog`: sichere öffentliche Metadaten zu vorgesehenen Connectoren.
- `GET /api/connectors/framework`: transparente Architektur-/Capability-Übersicht.
- Geplante Adapter: RSS/Atom, ATProto/Bluesky, explizite provider-spezifische APIs.

## Bewusst noch nicht enthalten

Kein Live-Sync, kein Crawler, kein allgemeiner Proxy, kein Credential-Management, kein Bluesky-Login und keine neuen Nutzeroberflächen. Diese Funktionen werden erst mit konkreten, einzeln geprüften Adaptern ergänzt.
