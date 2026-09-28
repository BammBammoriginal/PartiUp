# PartiUp P0.16.28 – kontrollierte Autorenlöschung für Nachrichten

Stand: 28. September 2026

Status: **Release Candidate – isolierte Browserabnahme ausstehend**

## R6c – eigene Nachrichten für alle löschen

- Nur der Verfasser darf eine eigene Nachricht löschen; die API prüft dieses Recht unabhängig von der Oberfläche.
- Direkt-, Gruppen- und kontextgebundene Space-Unterhaltungen verwenden dieselbe Nachrichten- und Löschlogik.
- Eine gelöschte Nachricht bleibt für alle berechtigten Teilnehmer als inhaltsfreier Löschhinweis im Verlauf sichtbar.
- Gelöschte Nachrichten können weder beantwortet noch mit neuen Reaktionen versehen werden.
- Bestehende Reaktionen auf eine gelöschte Nachricht werden entfernt.
- Unterhaltungsvorschauen zeigen den Löschzustand, ohne ursprünglichen Text oder Medieninformationen preiszugeben.
- Die Löschung bleibt nach einem Reload bestehen.

## Private Medien und Datenschutz

- Zugehörige private Medien werden aus Nachrichtenverknüpfung und Metadatenbestand entfernt.
- Die physische Datei wird über die bestehende Löschwarteschlange mit dem Grund `message_deletion` entfernt.
- Der geschützte Medienendpunkt liefert für Medien gelöschter Nachrichten keinen Inhalt mehr aus.
- Der Datenschutzexport enthält für den verbleibenden Löschdatensatz keinen Nachrichtentext und kennzeichnet den Löschzeitpunkt.
- Andere Unterhaltungsteilnehmer erhalten beim Löschversuch HTTP 403; Außenstehende erhalten ohne Sichtbarkeitsleck HTTP 404.

## Oberfläche und Bedienung

- Desktop zeigt die Löschaktion kontextuell bei Hover oder Tastaturfokus.
- Mobile hält die Autorenaktion ohne versteckte Desktop-Abhängigkeit erreichbar.
- Eine ausdrückliche Bestätigung erläutert, dass der Löschhinweis im Verlauf bestehen bleibt.
- Der Löschhinweis ist visuell zurückgenommen, per Text verständlich und enthält keine verborgenen Originalinhalte.

## Bewusst unveränderte Grenzen

- Moderationslöschung ist kein Autorenrecht und bleibt ein eigener, später zu protokollierender Rechtefall.
- Eine mögliche föderierte Löschung ist noch nicht Teil dieses lokalen Nachrichtenablaufs.
- Erweiterte Emoji-Reaktionen bleiben der getrennte Folgeschritt R6d.
- Rechte, Kommunikationszugang, Space-Gleichwertigkeit und bestehende Blockierungsregeln werden nicht aufgeweicht.
- Diese Version trifft keine neue CMS- oder externe Plattformentscheidung.

## Lokale technische Prüfung

- Messaging-Preflight: 26/26.
- Goldstandard-Browser-Preflight: 59/59.
- Gold-Regression-Integration einschließlich Autorenrecht, 403/404-Abgrenzung, Löschhinweis, Export und physischer Medienlöschung: bestanden.
- Vollständiger Preflight sowie Security-, Privacy-, Federation-, XSS- und Login-/CSRF-Prüfungen: bestanden.
- Der lokale Chromium-Browser ist in der Arbeitsumgebung nicht installiert; deshalb entscheidet der verpflichtende isolierte GitHub-Lauf über die automatisierte Browserfreigabe.
