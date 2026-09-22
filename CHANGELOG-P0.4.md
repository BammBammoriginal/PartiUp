# PartiUp P0.4

## Ziel
Erster kontrollierter Vertical Slice für föderierte Posts und Replies.

## Neu
- lokale öffentliche Community-Posts werden als ActivityPub `Note` / `Create` an bestätigte Follower ausgeliefert
- Kommentare werden als `Note` mit `inReplyTo` modelliert
- `Update` und `Delete` für lokale Posts/Kommentare erzeugen Federation-Aktivitäten
- persistente Delivery Queue mit begrenzten Retries statt synchroner harter Kopplung an Remote-Server
- eingehende signierte öffentliche `Create`, `Update` und `Delete` für `Note`
- Remote-Inhalte bleiben in `federation_remote_objects` getrennt von lokalen PartiUp-Inhalten
- fremdes HTML wird vor interner Nutzung in begrenzten Plaintext normalisiert
- Remote-Objekte behalten Actor, Origin-Host, URI, Reply-Bezug und Rohdaten für Herkunft/Audit
- unadressierte/unbezogene eingehende Notes werden nicht gespeichert, sondern deferred
- Federation ist auf Space-Ebene explizit administrierbar (`off`, `public`, `selected`)
- einzelne Beiträge besitzen zusätzlich `inherit`, `enabled` oder `disabled`; die restriktivere Regel gewinnt immer
- private und nichtöffentliche Community-Inhalte werden niemals föderiert; Wechsel auf nichtöffentlich schaltet Space-Federation automatisch ab
- die PartiUp-UX zeigt die Federation-Regel transparent im Space und beim Beitrag

## Bewusst noch nicht enthalten
- Darstellung fremder Inhalte in der normalen PartiUp-UX
- ausgehendes Folgen fremder Accounts
- Likes/Boosts
- Group Federation
- Event Federation
- RFC-9421-Signaturen

## Datenschutz/Security
P0.4 erweitert die öffentliche Angriffsfläche nur hinter der bereits in P0.3.x eingeführten Signatur- und SSRF-Grenze. Remote-Inhalte werden nicht als vertrauenswürdiges HTML in lokale Posts übernommen.
