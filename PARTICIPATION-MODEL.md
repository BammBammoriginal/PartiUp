# Beteiligungsraum — MVP-Modell v0.8.3

Ein Beteiligungsvorgang ist ein vernetztes Objekt und kann optional mehrere Module aktivieren.

## Register
1. **Übersicht** — Ersteller, Verifizierungsstufe, Status, Frist, Ebene, Quelle, Institutionsbezug und offizielle Autorisierung getrennt.
2. **Informationen** — Hintergrund, Updates und Kontext.
3. **Umfrage** — unverbindliches Meinungsbild.
4. **Abstimmung** — formalisierter Vote. Eine Kennzeichnung als „für diesen Prozess verbindlich“ ist eine Aussage des Erstellers und keine automatische rechtliche/behördliche Verbindlichkeit.
5. **Pro & Contra** — optionale strukturierte Argumentation.
6. **Verlauf & Ergebnisse** — transparente Chronologie und Zwischenstände.

## Vertrauen
- Native Vorgänge: Ersteller + Verifizierungsstufe sichtbar.
- Erstellung: aktuell mindestens Verifizierungsstufe 2.
- Aktive Teilnahme kann pro Vorgang eine Mindest-Verifizierungsstufe verlangen.
- Institutioneller Bezug und offizielle Autorisierung sind getrennte Felder.
- Externe Vorgänge bleiben lokal read-only; Interaktion soll später über die jeweilige Quelle/Integration laufen.

## MVP-Grenze
Noch nicht enthalten: rechtssichere Wahlverfahren, geheime Wahlen, Wahlregister, Delegation/Liquid Democracy, komplexe Quoren, kryptographisch verifizierbare Abstimmungen oder behördliche Rechtswirkung. Diese Funktionen benötigen eigene Fach-/Security-Prüfung.
