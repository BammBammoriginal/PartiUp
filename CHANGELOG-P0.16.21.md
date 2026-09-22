# PartiUp P0.16.21 – Gold-Baseline-Wiederherstellung I

Ausgangspunkt ist die auf Windows/Chromium mit 21 von 21 Gold-Standard-Browserabläufen bestätigte P0.16.0-Gold-Baseline. Spätere Quelldateien wurden nicht pauschal übernommen.

## Freigabestatus

Der abschließende Windows-/Chromium-Lauf vom 21. September 2026 bestand alle 21 von 21 Gold-Browserfälle. P0.16.21 ist damit als `p0.16.21-gold-restored` die aktive Entwicklungsbaseline; P0.16.0 bleibt die unveränderte historische Rückfallreferenz.

## Behobene Laufzeitfehler

- Die serverseitige Datenschutz-Profilvorschau importiert ihre Projekt- und Veranstaltungslisten korrekt; zuvor endete die Netzwerk-Vorschau mit HTTP 500.
- Die Berechnung gemeinsamer Kontakte verwendet jetzt exakt die sieben SQLite-Parameter der Abfrage; zuvor konnten Profile bestätigter Freunde mit HTTP 500 scheitern.

## Privacy und Sicherheit

- Blockieren entfernt Freundschaft und Personen-Follows in beiden Richtungen.
- Während eine Blockierung besteht, kann kein neuer Personen-Follow angelegt werden.
- Follow-Ziele werden über ihre zentrale Sichtbarkeitslogik geprüft. Nicht sichtbare private Veranstaltungen, Projekte und Beteiligungsvorgänge können weder gefolgt noch über die API als existent bestätigt werden.
- Die datenschutzminimierte Messenger-Empfängerliste der Gold-Baseline bleibt erhalten; spätere vollständige `people`-Datensätze wurden ausdrücklich nicht zurückkopiert.

## Einheitliche Space-Logik

- Community, Veranstaltung, Projekt und Beteiligungsvorgang verwenden nun dasselbe zentrale Follow-Modell.
- Alte Datenbanken mit dem bisherigen Vier-Typ-Constraint werden sicher auf die zusätzlichen Space-Typen migriert.
- Veranstaltung, Projekt und Beteiligungsvorgang zeigen denselben wiederverwendbaren Follow-Baustein.
- Der Gold-Browserablauf prüft Follow, Zustand und Persistenz nach Reload innerhalb der bereits vorhandenen 21 Kernfälle.

## Semantik und Kommunikation

- Der technische Typ `event` wird im neuen Follow-Baustein als „Veranstaltung“ bezeichnet.
- Ein einzelnes Participation-Objekt wird im neuen Follow-Kontext als „Beteiligungsvorgang“ bezeichnet; der Navigationsbereich kann weiterhin kurz „Beteiligung“ heißen.
- Die Kommunikationsregel `members` heißt nun „Freunde oder Menschen aus gemeinsamen Communities“ und verhält sich entsprechend.
- Kommunikation und Benachrichtigungen besitzen einen eigenen sichtbaren Speichern-Button.
- Der veraltete Hinweis, Chat sei erst für eine frühere Zukunftsversion vorgesehen, wurde entfernt.

## QA

- Neuer Integrationstest `qa:gold:regressions` reproduziert die behobenen Fehler zuerst gegen den alten Stand und prüft zusätzlich die Migration einer historischen Datenbank.
- `qa:gold` führt den Gold-Preflight und danach den Integrationstest automatisch vor den 21 Desktop-/Mobile-Browserfällen aus.
- Das Authentifizierungs-Setup, Desktop-QA und Gold-Desktop-QA verwenden dieselbe zentrale Viewport-Konfiguration (1440 × 1000). Damit kann das Setup nicht erneut unbemerkt auf Playwrights kleinere Standardgröße zurückfallen und den sichtbaren Identitätsbutton außerhalb des Viewports vorfinden.
- Das Login-Setup prüft vor dem Klick ausdrücklich Sichtbarkeit und Lage im Viewport und besitzt ein eigenes 20-Sekunden-Zeitbudget.
- Der Gold-Preflight blockiert eine Version, wenn die gemeinsame Viewport-Konfiguration, die Viewport-Prüfung oder seine zwingende Einbindung in `qa:gold` entfernt wird.
- Die lokale Datenbank-Ausnahme in `.gitignore` gilt nur noch für `/data/`; öffentliche Laufzeitdaten unter `public/data/` werden nicht länger versehentlich ausgeschlossen.
- Ein dynamischer Release-Inhaltscheck ermittelt lokal referenzierte Frontend-Assets, prüft ihre Existenz und im Entwicklungsstand zusätzlich ihre Versionsführung. Dadurch werden auch spätere Asset-Ergänzungen und Umbenennungen berücksichtigt.
- Der Gold-Regressionstest legt sein temporäres Datenverzeichnis selbst an und hängt nicht mehr davon ab, ob ein ZIP-Programm leere Ordner konserviert.
- Desktop- und Mobile-Logout-Abläufe laufen in eigenen Browser-Kontexten. Abmelden invalidiert daher nicht mehr die gespeicherte Sitzung aller nachfolgenden Gold-Tests und erzeugt keine Login-Rate-Limit-Kaskade.
- Der gemeinsame Login-Helfer nutzt mobil den sichtbaren Drawer-Weg, prüft den Identitätsbutton im Viewport und schließt den Drawer anschließend wieder bedienbar über den Backdrop.
- Auch der separate Profil-/Logout-Helfer öffnet den mobilen Drawer zustandsabhängig und verlangt vor dem Klick, dass der Identitätsbutton tatsächlich im Viewport liegt; reine CSS-Sichtbarkeit genügt nicht mehr.
- Der Gold-Preflight blockiert künftige Versionen, wenn Logout-Isolation oder der echte mobile Login-Weg verloren gehen.
- Diese Korrektur verändert ausschließlich das QA-Harness; Produktcode, Login-/CSRF-/Sessionlogik, Rechte, Space-Funktionen und Datenschutz bleiben unverändert.

## Bewusst nicht übernommen

- keine Registrierung,
- kein Test-Login-Bypass,
- keine globale Suche,
- keine kompletten Dateien aus P0.16.18/P0.16.19,
- keine Änderung an Federation-Protokollen, Rollenmodellen oder Rankinglogik.

## Noch offene, dokumentierte Punkte

- Blockierte Personen müssen in der Oberfläche zentral auffindbar und entblockbar werden.
- Benachrichtigungs-, Freundschafts- und Badge-Zustände benötigen noch einen getrennt geprüften Live-Sync.
- Chat-Bildvorschau und Datenschutzexport/-löschung in der UI werden als eigene Tranche behandelt.
- Die verbleibenden sichtbaren Mischbegriffe „Event/Events“ werden nicht per riskanter globaler Ersetzung geändert, sondern ansichtsweise mit Browserprüfung vereinheitlicht.

Die vollständige historische Einordnung und weitere Reihenfolge stehen in `P0.16-WIEDERHERSTELLUNGSMATRIX.md`.
