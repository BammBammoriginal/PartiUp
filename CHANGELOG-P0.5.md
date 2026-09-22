# PartiUp P0.5 – Community / Group Federation

- PartiUp Communities können als eigenständige ActivityPub `Group` Actors auftreten.
- Eigene, kollisionsfreie Fediverse-Handles und RSA-Schlüssel für Spaces.
- WebFinger kann neben Personen nun auch föderierbare Communities auflösen.
- Group Inbox, Outbox, Followers und Following Collections.
- Eingehende signierte `Follow` / `Undo(Follow)` für Communities.
- Community-Beiträge und Antworten tragen `audience` und `context` und werden durch den Space als `Announce` an dessen Remote-Follower verteilt.
- Separate Delivery Queue für Space-Aktivitäten mit Retry.
- Remote-Schreibzugriffe auf Communities bleiben absichtlich deaktiviert/deferred. Ein späterer Schritt führt dafür eine eigene, admin-gesteuerte Berechtigung ein.
- `federation_mode=off` bedeutet: der Space wird nicht als öffentlicher Group Actor exponiert.

P0.5 orientiert sich am stabilen ActivityStreams-`Group`/`Announce`-Modell und an FEP-1b12, ohne NodeBB- oder Lemmy-spezifische Datenstrukturen in den PartiUp-Core einzubauen.
