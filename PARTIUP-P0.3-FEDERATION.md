# PartiUp P0.3 – erster Federation-Vertical-Slice

P0.3 macht PartiUp erstmals als ActivityPub-Server auffindbar, sobald `PARTIUP_BASE_URL` auf eine von außen erreichbare URL gesetzt wird.

## Enthalten
- WebFinger für lokale Nutzer (`acct:user@domain`)
- ActivityPub `Person`-Actor mit Inbox, Outbox, Followers/Following und persistentem RSA Public Key
- öffentliche Post-Objekte als ActivityStreams `Note`
- Outbox als `OrderedCollection`
- signaturgeprüfte Inbox für `Follow` und `Undo(Follow)`
- signierte `Accept`-Antwort auf gültige Follow-Aktivitäten
- Speicherung von Federation-Aktivitäten und Remote-Follower-Beziehungen
- Fail-closed: andere eingehende Activity-Typen werden noch nicht in PartiUp-Daten geschrieben

## Sicherheitsgrenzen
Remote Requests gelten als nicht vertrauenswürdig. Inbox-Schreibzugriffe benötigen eine gültige HTTP-Signatur und bei Bodies einen passenden SHA-256-Digest. Production Federation verlangt HTTPS. Vollständige Follower-Listen werden nicht öffentlich ausgegeben.

## Bewusst noch nicht enthalten
- eingehende `Create`/`Note` und Replies
- ausgehende automatische Post-Zustellung an alle Follower
- Mastodon-Follow aus PartiUp heraus
- RFC 9421 Signaturerzeugung/-prüfung (vorbereitet als nächster Kompatibilitätsschritt; Legacy RSA-SHA256 bleibt für Mastodon/Fediverse-Kompatibilität relevant)
- Group Federation, Events, Pixelfed/PeerTube-Adapter

## Test mit öffentlicher Entwicklungs-URL
Für einen echten Mastodon-Test braucht PartiUp eine HTTPS-URL, die von Mastodon erreicht werden kann. Beispiel:

```bat
set PARTIUP_BASE_URL=https://DEINE-OEFFENTLICHE-HTTPS-DOMAIN
start-network.bat
```

Die gesetzte URL muss tatsächlich auf den laufenden PartiUp-Server zeigen. Erst dann sollten Actor-IDs erzeugt und föderierte Tests durchgeführt werden.
