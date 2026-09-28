# PartiUp P0.16.31 – Nachrichteneinstieg wieder benutzbar

Stand: 28. September 2026. Release Candidate auf P0.16.30; manuelle Sichtprüfung offen.

## Gemeldeter Fehler und Ursache

Nach Auswahl einer Person blieb das Schreibfeld aus. Im Dialog erschienen sowohl für Direktnachrichten als auch Gruppen dieselben Empfänger, obwohl der Server für beide verschiedene Kontaktregeln anwendet. Server-Ablehnungen wurden als kurzlebiger Hinweis außerhalb des Dialogs angezeigt. Beim Anlegen wurden außerdem mehrere asynchrone Listenladungen gleichzeitig gestartet. Die bisherige Browserstrecke wählte immer nur den ersten berechtigten Empfänger einer frischen Testdatenbank und erkannte diese Zustände nicht.

## Änderung

- Direktnachrichten zeigen ausschließlich dafür zugelassene Empfänger; Gruppenchats ausschließlich dafür einladbare Personen. Der Server prüft beide Rechte weiter unabhängig und abschließend.
- Das schlankere Erstellen-Fenster zeigt nur die zur Art passenden Felder. Fehlende Auswahl und Server-Ablehnung werden dauerhaft lesbar im Fenster angezeigt.
- Nach erfolgreichem Erstellen wird die Unterhaltung einmal kontrolliert geladen und das Schreibfeld fokussiert; auch der Profilknopf verwendet denselben Weg. Keine unbeabsichtigte Ortsbindung von Chats.
- Desktop- und Mobile-Browserfälle decken den Profilknopf, das Schreibfeld sowie den Wechsel zwischen unterschiedlichen Kontaktregeln ab.
- Der vollständige Browserlauf deckte zusätzlich einen unabhängigen Bestandsfehler auf: Das schreibende API-Limit zählte auch lesende Anfragen und sperrte so nach intensiver Nutzung Abmelden, Kontolöschung und gelegentlich das Anlegen von Events. Lesende und schreibende Anfragen erhalten getrennte IP-Budgets; Login und Kontolöschung behalten ihre eigenen strengeren Grenzen. Ein API-Test prüft 190 berechtigte Lesezugriffe mit anschließendem erfolgreichen geschützten Schreibzugriff.

Die grundsätzliche visuelle Gestaltung des gesamten Chatbereichs bleibt als eigenständige UX-Aufgabe offen; die gezeigte Erstellen-Maske ist hier gezielt vereinfacht. Preflight, Sicherheits-/Datenschutzprüfungen und echter Browserlauf sind vor Freigabe erforderlich.
