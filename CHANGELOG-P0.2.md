# PartiUp P0.2 – ActivityPub-ready data model

## Neu
- Provider-neutrales Federation-Modell unter `server/federation/model.js`.
- Stabile Mappings: User→Person, Community/Space→Group, Post/Comment→Note, Event→Event.
- Neue Tabelle `federation_entities` als getrenntes Register für lokale und spätere Remote-Identitäten.
- Lokale, host-unabhängige Federation-Pfade; absolute IDs erst mit `PARTIUP_BASE_URL`.
- Read-only Diagnose-Endpunkte `/api/federation/model` und `/api/federation/entity/:type/:id`.
- Eigener P0.2-Preflight.

## Bewusst noch nicht aktiviert
P0.2 sendet oder empfängt keine ActivityPub-Aktivitäten. WebFinger, Inbox/Outbox, Signaturen, Follow/Accept und Remote-Import folgen erst mit P0.3.

## Architekturprinzip
PartiUp speichert Produktdaten weiterhin im eigenen Kernmodell. Federation-Metadaten liegen getrennt, damit keine Kopplung an Mastodon, Lemmy, Mobilizon oder einen anderen einzelnen Anbieter entsteht.
