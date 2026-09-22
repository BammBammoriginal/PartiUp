# PartiUp P0.3.3 – Mastodon Discovery Test

## Ziel
Beweisen, dass Mastodon einen PartiUp-Actor ueber einen normalen Fediverse-Handle finden kann.

Der Demo-Nutzer mit interner ID `u-max` hat jetzt den oeffentlichen Fediverse-Handle `max`. Die interne ID wird nicht mehr als Username publiziert.

## Ablauf
1. `setup.bat`
2. Terminal A: `start-local.bat`
3. Terminal B: `cloudflare-quick-tunnel.bat`
4. Die angezeigte `https://...trycloudflare.com`-URL kopieren.
5. Terminal A stoppen und neu starten mit:
   `start-federation-test.bat https://DEINE-URL.trycloudflare.com`
6. Terminal C:
   `federation-selftest.bat https://DEINE-URL.trycloudflare.com max`
7. Nur bei komplett gruener Ausgabe in Mastodon suchen nach:
   `@max@DEINE-DOMAIN.trycloudflare.com`
8. Wenn das Profil erscheint: folgen und danach Terminal A auf einen eingehenden `Follow` pruefen.

## Diagnose
Im Browser kann zusaetzlich aufgerufen werden:
`https://DEINE-URL.trycloudflare.com/api/federation/discovery-check?handle=max`

`ok: true` bedeutet, dass PartiUp intern WebFinger, Actor-ID, `preferredUsername`, Actor-`webfinger`, Public-Key-Owner und Discoverability konsistent ausliefert.
