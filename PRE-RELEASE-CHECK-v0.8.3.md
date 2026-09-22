# Pre-Release Check v0.8.3

## Architektur & Produkt
- [x] Orte, Themen und Communities bleiben mehrdimensional vernetzt
- [x] Creator + Verifizierungsstufe für native Beteiligung sichtbar
- [x] Institutioneller Bezug ist nicht mit offizieller Autorisierung gleichgesetzt
- [x] Beteiligungsraum modular: Info / Umfrage / Abstimmung / Pro & Contra / Verlauf
- [x] Umfrage und Abstimmung sind getrennte Funktionen
- [x] Abstimmung kann nur ausdrücklich vom Ersteller als „verbindlich bezeichnet“ markiert werden
- [x] Externe Vorgänge erzeugen keine irreführende lokale Abstimmung
- [x] Mindest-Verifizierungsstufe für aktive Teilnahme wird serverseitig geprüft
- [x] Farbsystem zentral über semantische Design-Tokens anpassbar

## Security / Privacy
- [x] Schreibzugriffe benötigen Login + CSRF / Same-Origin-Schutz
- [x] Erstellung weiterhin erst ab Verifizierungsstufe 2
- [x] Eingabetexte und Optionslisten begrenzt und serverseitig bereinigt
- [x] Ein Nutzer hat pro Umfrage/Abstimmung genau eine aktuelle Stimme
- [x] Erstellerrechte für Ergänzen von Info/Umfragen/Abstimmungen serverseitig geprüft

## Mobile / App UX
- [x] Beteiligungstabs horizontal scrollbar / touchfähig
- [x] Pro-/Contra-Spalten werden mobil einspaltig
- [x] Abstimmungsoptionen bleiben auf kleinen Displays bedienbar
- [x] Touch-Ziele bleiben >= 44px über bestehende Mobile-Regeln
