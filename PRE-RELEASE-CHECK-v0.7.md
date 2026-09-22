# Pre-Release-Check v0.7

Vor Ausspielung geprüft gegen die bisher festgelegten BottomUpParti-Prinzipien:

- Ortehierarchie bleibt erhalten: Deutschland → Bayern → Erlangen/Nürnberg.
- Objekte werden nicht dupliziert, sondern über Mehrfachbeziehungen mit Orten/Themen/Communities vernetzt.
- Communityansicht auf Ortsebene filtert direkt zugeordnete Communities; globale Ansicht bleibt optional.
- Gruppenformenfilter bleibt enthalten.
- Verifizierung bleibt getrennt: Ersteller-Vertrauensstufe vs. offiziell verwaltete Organisation; Karten bleiben kompakt.
- Civic-/Democracy-Schicht Kommune/Land/Bund bleibt enthalten.
- Medien sind ein eigenes, wiederverwendbares Modell und kein Feld-Duplikat pro Objekt.
- Bildspeicherung ist datenbewusst: WebP, Größenvarianten 256/720/1600 px, kein zusätzliches großes Original im Prototyp.
- Profilbilder, Community-Logo/Titelbild, Projektbild, Eventbild sowie Bilder in Posts und Kommentaren sind angebunden.
- Notifications und Kommunikations-/Privatsphäre-Regeln sind vor dem eigentlichen Chat vorhanden.
- Video ist im Medienmodell vorbereitet, aber bewusst noch nicht als unkomprimierter Upload freigeschaltet.
- LAN-Betrieb und lokale SQLite-Entwicklung bleiben erhalten.

Automatischer `node scripts/preflight.js`: 18/18 Prüfungen bestanden.
JavaScript-Syntaxcheck: bestanden.

Hinweis: Eine vollständige Laufzeitprüfung mit `npm install` konnte in der Build-Umgebung nicht abgeschlossen werden, weil der Paketdownload dort zeitlich auslief. Die Abhängigkeiten sind in package.json hinterlegt und werden auf dem Windows-PC über `npm.cmd install` installiert.
