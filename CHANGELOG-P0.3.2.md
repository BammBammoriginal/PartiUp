# PartiUp P0.3.2 – Public Federation Test Hardening

## Ziel
P0.3.2 bereitet den ersten kontrollierten Live-Interoperabilitaetstest mit Mastodon vor. Die Version erweitert P0.3.1 nicht um Remote-Create/Reply-Schreibzugriffe, sondern haertet die bereits vorhandene Follow/Accept-Strecke und liefert Diagnose-/Selftest-Werkzeuge.

## Aenderungen
- Version 0.3.2.
- Federation-Testmodus `PARTIUP_FEDERATION_TEST=1`; oeffentliche Base-URL muss dann HTTPS verwenden.
- FEP-2c59 `webfinger`-Hinweis im Person-Actor ergaenzt, waehrend klassisches WebFinger weiterhin voll unterstuetzt bleibt.
- Remote Actor Fetch und Activity Delivery nur ueber HTTPS.
- Private, Loopback-, Link-Local-, reservierte und lokale DNS-Ziele werden vor Remote Requests blockiert (SSRF-Haertung).
- DNS-Aufloesung wird fuer den anschliessenden HTTPS-Request gepinnt; Redirects werden nicht verfolgt.
- 8-Sekunden-Timeout und 1-MiB-Response-Limit fuer Remote Federation Requests.
- Eingehende Legacy-HTTP-Signaturen verlangen request-target, host und date; bei Body zusaetzlich signierten Digest.
- Signaturdatum ist auf ein 5-Minuten-Fenster begrenzt.
- `keyId` und `owner` muessen exakt zum geladenen Remote Actor passen.
- Digest-Vergleich ist byte-/case-sensitiv.
- Oeffentlicher Diagnose-Endpunkt `/api/federation/diagnostics` ohne Secrets.
- `npm run federation:selftest` prueft den echten oeffentlichen HTTPS-Pfad von WebFinger bis Outbox.
- Windows-Helfer: `start-federation-test.bat`, `federation-selftest.bat`, `cloudflare-quick-tunnel.bat`.

## Bewusste Grenzen
- Remote `Create`, Replies, Likes, Announces etc. bleiben deferred.
- RFC 9421 HTTP Message Signatures sind noch nicht implementiert; fuer P0.3.x bleibt die weiterhin kompatible Legacy-HTTP-Signatur aktiv. RFC-9421-Verifikation ist fuer die naechste Security-/Interop-Stufe vorgesehen.
- Ein erfolgreicher Selftest beweist unsere oeffentliche Discovery/Actor-Ausgabe, nicht allein Mastodon-Interoperabilitaet. Der echte Follow-Test bleibt erforderlich.
