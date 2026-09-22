# PartiUp P0.2

PartiUp (ParticipationUpwards) – ActivityPub-ready Datenmodell.

## Windows Start
Einmalig:

    setup.bat

Lokal:

    start-local.bat

LAN:

    start-network.bat

## Öffentliche Basis-URL
Für P0.2 ist keine öffentliche URL notwendig. Für kanonische Federation-IDs kann optional gesetzt werden:

    set PARTIUP_BASE_URL=https://deine-domain.example

Ohne diese Variable werden nur stabile lokale Pfade registriert. Dadurch wird `localhost` nicht als dauerhafte Fediverse-Identität eingebrannt.

## Prüfen

    npm run check
    npm run partiup-federation-model-preflight
    npm run partiup-architecture-preflight

Siehe `PARTIUP-P0.2-ACTIVITYPUB-MODEL.md` für die Modellentscheidung.
