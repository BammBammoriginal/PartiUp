# BottomUpParti v0.7

## Neu
- Zentrales Medienmodell mit Verknüpfung zu Nutzern, Communities, Projekten und Beiträgen.
- Bild-Upload für Profilfoto, Community-Logo, Community-Titelbild, Projektbild und Beitragsbilder.
- Serverseitige Bildoptimierung: automatische Ausrichtung, WebP-Komprimierung und drei Anzeigevarianten (256 / 720 / 1600 px). Das große Original wird im Prototyp nicht zusätzlich dauerhaft gespeichert.
- Upload-Limit für Bilder: 12 MB. Unterstützt: JPEG, PNG, WebP sowie HEIC/HEIF, soweit Sharp auf dem jeweiligen System dekodieren kann.
- Benachrichtigungsmodell und Benachrichtigungszentrale. Erste Ereignisse: Kommentare und neue Community-Mitglieder.
- Kommunikations-/Privatsphäre-Einstellungen bereits vor dem Chat: Direktnachrichten und Gruppeneinladungen können auf alle / gemeinsame Communities / niemand begrenzt werden.
- Benachrichtigungseinstellungen für Kommentare, Erwähnungen, Nachrichten und Events.
- Datenmodell für Medien unterscheidet image / video / file. Video ist strukturell vorbereitet, Upload/Transcoding wird bewusst erst mit dem Messaging-Ausbau umgesetzt.

## Architekturprinzipien
- Ein Medium wird einmal gespeichert und über `media_links` mit Objekten verbunden.
- Für die Anzeige wird immer die kleinste passende Bildvariante genutzt.
- Bestehende Vernetzungs-, Orts-, Themen-, Verifizierungs- und Civic-Strukturen bleiben erhalten.
