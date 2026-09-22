# PartiUp P0.4.2

- Korrigiert einen falschen Moderations-Preflight: Die Prüfung hat bisher jede autorisierte Selbstlöschung eines Beitrags (`DELETE FROM posts WHERE id=?`) fälschlich als harte Moderationslöschung gewertet.
- Der Test untersucht jetzt gezielt nur die Moderationsroute und stellt sicher, dass Moderationsmaßnahmen über `moderation_content_state` als Hide/Remove/Restore umgesetzt werden und dort keine Posts/Kommentare hart gelöscht werden.
- Die bestehende bewusste Selbstlöschung eigener Beiträge bleibt unverändert erhalten.
- Keine Änderung an der Moderations- oder Federation-Produktlogik.
