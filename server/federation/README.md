# Federation Core — P0.1 boundary

ActivityPub is a core interoperability layer, not a UI replacement.
P0.1 does not expose a public inbox/outbox yet. It reserves the boundary for actor discovery,
ActivityStreams object normalization, inbox/outbox processing, signatures, remote-object safety and adapters.

Security rule: remote federation payloads are untrusted input and must never bypass PartiUp permissions,
moderation, provenance or content sanitization.

## P0.14 – Medien

Föderierte Medien werden über `media.js` als eigene Sicherheitsgrenze behandelt. Lokale Bilder werden als ActivityStreams-Metadaten (`attachment` bzw. `image`) ausgegeben. Eingehende Remote-Medien werden nur als validierte Metadaten gespeichert; Bilder können anschließend ausschließlich über den ID-basierten, SSRF-gehärteten Same-Origin-Proxy geladen werden. Video bleibt in P0.14 Metadaten/Externer-Link und wird nicht transkodiert oder geproxyt.
