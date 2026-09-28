# PartiUp P0.16.30 – mehrere kontrollierte Chatreaktionen

Stand: 28. September 2026

Status: Release Candidate; isolierter GitHub-Browserlauf und manuelle Sichtprüfung offen.

## Ausgangslage

P0.16.29 bestand 35/35 Gold-Browserfälle für die gemeinsame Orts- und Ebenennavigation; die manuelle Sichtprüfung steht noch aus. Die Reaktions-API erlaubte bereits sechs Emojis, die Chatoberfläche bot zum Hinzufügen jedoch nur „＋👍“. Reaktionsurheber waren trotz berechtigter Unterhaltung nicht einsehbar. Die API nahm zudem neue Reaktionen in blockierten oder abgelaufenen Unterhaltungen noch nicht ausdrücklich aus.

## R6d

- Die verfügbare Reaktionsauswahl stammt aus der serverseitigen Liste. Ein aufklappbarer, per Tastatur und Touch nutzbarer Knopf bietet 👍, ❤️, 😂, 👏, ✅ und 🤔 an.
- Bestehende Reaktionsknöpfe zeigen den Zähler; ein erneuter Klick entfernt ausschließlich die eigene Reaktion. Der Zustand bleibt nach Reload erhalten.
- Mitglieder können die Namen der Reagierenden aufklappen. Der Server berücksichtigt dafür nur aktuelle Mitglieder derselben Unterhaltung und liefert keine E-Mail-Adressen.
- Fremde können Reaktionen weder sehen noch setzen. Blockierte Kontakte können nicht über Reaktionen weiter interagieren. Abgelaufene oder gelöschte Nachrichten nehmen keine Reaktionen an.
- Direkt-, Gruppen- und kontextgebundene Unterhaltungen verwenden weiterhin dasselbe Nachrichtenmodell; weder Ortswahl noch Föderation ändern die Rechte.

## Abnahme

API-Regressionen decken mehrere Reaktionen, eigenes Entfernen, Zähler, Mitgliedernamen, fremde Zugriffe, Gruppenchat, Blockierung und Löschung ab. Desktop und Mobile prüfen die sichtbare Auswahl, Persistenz nach Reload und bedienbare Darstellung ohne horizontalen Überlauf. Vollständiger Preflight, Security-/Privacy-Integrationen und GitHub-Chromium-Lauf sind vor Freigabe erforderlich. Keine Erweiterung des Emoji-Allowlists oder Übertragung von Reaktionen an Fediverse-Instanzen in dieser Version.
