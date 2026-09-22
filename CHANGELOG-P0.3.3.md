# PartiUp P0.3.3 – Mastodon Discovery Compatibility

P0.3.3 trennt erstmals die interne PartiUp-User-ID vom oeffentlichen Fediverse-Handle und verschärft den Discovery-Selbsttest fuer Mastodon-Kompatibilitaet.

## Neu
- Tabelle `federation_handles`: stabile, eindeutige oeffentliche Fediverse-Handles getrennt von internen User-IDs.
- Demo-User `u-max` wird standardmaessig als `max` publiziert; `u-anna` -> `anna`, `u-lisa` -> `lisa`.
- WebFinger sucht nach dem oeffentlichen Handle und verweist weiterhin auf den stabilen Actor-URI.
- Actor `preferredUsername` und FEP-2c59-`webfinger` verwenden exakt denselben oeffentlichen Handle.
- `discoverable: true` fuer oeffentlich auffindbare Demo-Actors.
- Neuer Endpunkt `/api/federation/discovery-check?handle=max` fuer serverseitige Konsistenzdiagnose.
- Live-Selftest prueft zusaetzlich Actor -> WebFinger -> identischer Actor (Mastodon-artiger Loopback).
- Bestehende SSRF-, HTTPS-, Digest- und Signatur-Haertung aus P0.3.2 bleibt unveraendert.

## Noch bewusst nicht enthalten
- Eingehende Remote-Posts/Replies (`Create`) bleiben deferred.
- Kein oeffentlicher Handle-Editor in der UI; fuer den PoC werden Handles automatisch einmalig aus Demo-IDs abgeleitet.
