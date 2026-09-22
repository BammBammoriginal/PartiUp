# PartiUp P0.6

- Bidirektionale Community-/Group-Federation-Grundlage.
- Space-Admins steuern eingehende Federation getrennt: `off`, `replies`, `threads`.
- Signierte öffentliche Remote-`Note`-Objekte können einer Community zugeordnet werden.
- `replies` erlaubt nur Antworten auf bekannte lokale oder bereits zugeordnete föderierte Inhalte; `threads` erlaubt zusätzlich neue Diskussionen.
- Remote-Objekte müssen die Group adressieren, dem signierenden Actor gehören und vom selben HTTPS-Host stammen.
- Update/Delete sind nur für bereits der Community zugeordnete Objekte und denselben Actor zulässig.
- Remote-Inhalte werden nativ im PartiUp-Feed dargestellt und bleiben als externe Herkunft gekennzeichnet.
- Space-Moderatoren können föderierte Inhalte ausblenden, entfernen und wiederherstellen.
- Bestehende P0.5-Security-Hardening-Basis bleibt erhalten.
