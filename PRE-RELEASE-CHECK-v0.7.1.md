# Pre-Release-Check – BottomUpParti v0.7.1

Vor Ausspielung geprüft gegen die bisher festgelegten Produkt- und Architekturprinzipien.

## Struktur & Vernetzung
- [x] Deutschland → Bayern → Erlangen bleibt räumliche Hierarchie, nicht starre Besitzstruktur.
- [x] Communities, Projekte, Events und Beteiligung werden über Beziehungen mit Orten/Themen verknüpft.
- [x] Mehrfachzuordnung bleibt möglich; Objekte werden nicht für jede Ansicht dupliziert.
- [x] Erlangen-Ansicht filtert direkt auf Erlangen zugeordnete Communities.
- [x] Gruppenformen bleiben filterbar.

## Vertrauen & Quellen
- [x] Ersteller-Verifizierung und Organisations-Verifizierung bleiben getrennt.
- [x] Kacheln bleiben kompakt; Vertrauensdetails liegen auf Detailseiten.
- [x] Native und externe Quellen bleiben unterscheidbar.

## Community & Civic
- [x] Mitgliedschaft/Rollen, Feed, Kommentare, Events, Projekte und Umfragen bleiben erhalten.
- [x] Kommune/Land/Bund und Beteiligungsobjekte bleiben erhalten.

## Medien & Datensparsamkeit
- [x] Zentrales Medienmodell bleibt erhalten.
- [x] Bilder werden in WebP-Varianten 256/720/max.1600px gespeichert.
- [x] Das große Upload-Original wird nicht zusätzlich dauerhaft gespeichert.
- [x] Video ist modelliert, aber weiterhin noch nicht ineffizient als Rohdatei freigeschaltet.

## Kommunikation
- [x] Benachrichtigungen bleiben erhalten.
- [x] DM-/Gruppeneinladungsregeln bleiben vorbereitet.
- [x] Chat wurde bewusst noch nicht vorgezogen; er bleibt nächster großer Kommunikationsbaustein.

## Folgen – neu
- [x] Communities können gefolgt werden.
- [x] Orte können gefolgt werden.
- [x] Themen können gefolgt werden.
- [x] Folgen ist getrennt von Community-Mitgliedschaft.
- [x] Persönlicher Feed nutzt Mitgliedschaften + gefolgte Communities + Orte + Themen.
- [x] Benachrichtigungsstufe pro Follow ist bereits im Datenmodell vorbereitet.
- [x] Follow-Buttons überladen die Community-Kacheln nicht.

## Betrieb
- [x] LAN-Betrieb über 0.0.0.0 bleibt erhalten.
- [x] Node-Dateien syntaktisch geprüft.
