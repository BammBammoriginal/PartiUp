# PartiUp P0.16.27 – responsive Chatdarstellung

Stand: 24. September 2026

## Anlass

Die technische Chatbild-Vorschau aus P0.16.26 funktionierte, eine reale Sichtprüfung zeigte jedoch eine nicht abnahmefähige Darstellung: Große Bilder dominierten den Nachrichtenbereich, während Unterhaltungsliste, Thread, Metadaten und Eingabe keine eigene belastbare Layouthierarchie hatten.

## R6b – Darstellung und Bedienstruktur

- Unterhaltungsliste und aktiver Thread bilden auf Desktop zwei klar getrennte Bereiche.
- Mobile zeigt entweder die Unterhaltungsliste oder den fokussierten Thread und bietet einen eindeutigen Zurückweg.
- Eigene und fremde Nachrichten werden als kompakte, nicht ausschließlich farbcodierte Nachrichtenblasen dargestellt.
- Absender, Zeit, Text, Medien, Reaktionen und Eingabe erhalten eine wiederholbare visuelle Hierarchie.
- Hoch- und Querformatbilder behalten ihr Seitenverhältnis und bleiben innerhalb definierter maximaler Breiten und Höhen.
- Kleine Bilder werden nicht zwangsweise auf die volle Nachrichtenbreite vergrößert.
- Eine größere Bildansicht öffnet sich erst nach einer bewussten Aktion und ist per Schließen-Schaltfläche, Tastatur und Dialogstandard wieder verlassbar.
- Nachrichtenverlauf und Eingabe bleiben ohne horizontalen Überlauf bedienbar.

## Unveränderte Grenzen

- Versand, Dateitypen, 8-MB-Grenze und serverseitige Bildverarbeitung bleiben unverändert.
- Die Blockierungsprüfung vor privater Medienpersistenz bleibt erhalten.
- Rechte, Kommunikationszugang, Privacy, Föderation und Space-Logik werden nicht verändert.
- Autorenlöschung und erweiterte Reaktionen bleiben getrennte Folgeschritte R6c und R6d.

## Regressionen und Abnahme

- Chatbild-Preflight wurde von 13 auf 18 Invarianten erweitert.
- Goldstandard-Browser-Preflight wurde von 53 auf 56 Invarianten erweitert.
- Desktop verwendet ein reales Hochformatbild und prüft Pixelgrenzen, Seitenverhältnis, Spaltenanordnung und Großansicht.
- Mobile verwendet ein reales Querformatbild und prüft Pixelgrenzen, Seitenverhältnis, Großansicht, Listen-/Threadwechsel und horizontalen Überlauf.
- Der vollständige isolierte GitHub-Chromium-Lauf bleibt Freigabevoraussetzung.
