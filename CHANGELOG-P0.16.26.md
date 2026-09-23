# PartiUp P0.16.26 – kontrollierte Chatbild-Vorschau

Stand: 23. September 2026

## Zweck

R6 ergänzt für private Direkt- und Gruppenunterhaltungen eine lokale Bildvorschau vor dem Versand. Ausgewählte Bilder können geprüft und entfernt werden; eine Übertragung beginnt erst mit dem bewussten Absenden der Nachricht.

## Nutzerablauf

- Unterstützte Bilder werden nach der Auswahl mit Dateiname und Größe angezeigt.
- Die Vorschau verwendet ausschließlich eine lokale `blob:`-Adresse.
- „Ausgewähltes Chatbild entfernen“ leert Auswahl und Vorschau ohne Netzwerkanfrage.
- Erst „Senden“ überträgt das Bild an den bestehenden privaten Medienendpunkt.
- Nach erfolgreichem Versand bleibt das Bild nach einem Neuladen in der Unterhaltung sichtbar.
- Desktop und Mobile verwenden denselben Ablauf und dieselbe responsive Vorschaukomponente.

## Sicherheit und Datenschutz

- Clientseitige Vorprüfung auf JPG, PNG, WebP, HEIC oder HEIF und maximal 8 MB.
- Die bestehende serverseitige MIME-, Größen-, Bildauflösungs- und Zugriffsprüfung bleibt maßgeblich.
- Die lokale Vorschau erzeugt keine vorzeitige Serverübertragung und wird beim Entfernen oder Neurendern widerrufen.
- Die bestehende Blockierungsregel für Textnachrichten gilt nun ausdrücklich auch für Bildnachrichten.
- Die Blockierungsprüfung erfolgt vor der privaten Dateipersistenz; abgewiesene Uploads erzeugen keine verwaisten privaten Medien.
- Keine Änderung an Space-Logik, Rollen, Föderation oder öffentlicher Medienauslieferung.

## Regressionen und Gates

- Eigenes Chatbild-Preflight-Gate mit 12 strukturellen und funktionalen Invarianten.
- API-Negativfälle für nicht unterstützten Dateityp, Blockierung und verwaiste private Medien.
- Echter Desktop-Ablauf: auswählen → lokal prüfen → entfernen → erneut auswählen → senden → neu laden.
- Derselbe Ablauf bei 412 × 915 Pixeln einschließlich Überbreitenprüfung.
- Bestehende Textnachrichten-, Privacy-, Security- und Goldabläufe bleiben verpflichtend.

## Versionskontext

P0.16.25 bleibt die unveränderte Gold-Baseline. P0.16.26 wird erst nach vollständig grünem isoliertem GitHub-Chromium-Lauf freigegeben.
