# BottomUpParti v0.7.1

## Folgen & persönlicher Feed
- Einheitliches `user_follows`-Modell für Communities, Orte und Themen.
- Folgen ist ausdrücklich unabhängig von Community-Mitgliedschaft und Rollen.
- Community-Detailseiten erhalten eine kompakte Folgen-Funktion.
- Orte können auf ihrer Ebene gefolgt werden.
- Themen können direkt aus der Themenübersicht gefolgt werden.
- Der Startseiten-Feed wird für angemeldete Nutzer aus Mitgliedschaften und gefolgten Communities/Orten/Themen zusammengesetzt.
- `notification_level` ist bereits im Datenmodell vorgesehen (`feed`, `important`, `all`, `muted`), ohne die Oberfläche jetzt zu überladen.

## Bewusst noch nicht
- Chat bleibt für v0.8 vorgesehen.
- Keine Push-Einstellungen pro Follow-Ziel im UI; Datenmodell ist vorbereitet.
