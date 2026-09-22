# PartiUp P0.2 – ActivityPub-ready Datenmodell

P0.2 bereitet PartiUp auf echte Federation vor, aktiviert aber noch keine Netzwerkkommunikation.

## Stabile Mappings

- Nutzer -> ActivityStreams `Person`
- Community/Space -> `Group`
- Beitrag -> `Note`
- Kommentar -> `Note`
- Veranstaltung -> `Event`

Die lokalen Pfade sind stabil und host-unabhängig gespeichert. Erst `PARTIUP_BASE_URL` macht daraus eine absolute ActivityPub-ID. Dadurch wird `localhost` nicht versehentlich als dauerhafte föderierte Identität in die Datenbank eingebrannt.

## Registry

`federation_entities` trennt lokale Produktdaten von Federation-Metadaten. Gespeichert werden u. a. ActivityStreams-Typ, lokaler Pfad, kanonische URI, Herkunftshost und – später für Remote-Objekte – die Quell-URI und ein kontrollierter Rohdaten-Snapshot.

Diese Trennung verhindert, dass PartiUps Kernmodell an Mastodon, Lemmy, Mobilizon oder einen anderen einzelnen Anbieter gekoppelt wird.

## Noch ausdrücklich nicht enthalten

- WebFinger
- Actor-Dokumente als öffentliche ActivityPub-Endpunkte
- Inbox/Outbox und Zustellung
- HTTP Signatures
- Follow/Accept über das Netzwerk
- Remote Content Import
- Group-Permissions/FEP-spezifische Semantik

Diese Punkte beginnen erst in P0.3.
