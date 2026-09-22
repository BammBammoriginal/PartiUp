# PartiUp P0.16.22 – Blockierte Personen verwalten

Ausgangspunkt ist die unveränderlich markierte Baseline `p0.16.21-gold-restored`.

## R4: Safety und Personenbeziehungen

- „Mein Netzwerk“ enthält einen zentralen Zugang zu „blockierte Personen“.
- Die private Liste wird erst auf ausdrücklichen Abruf über `/api/blocks` geladen und nicht in allgemeine Bootstrap-Daten aufgenommen.
- Angezeigt werden ausschließlich ID, Anzeigename, Avatar und Vertrauensstufe; E-Mail, Bio, Ort und weitere Profildaten bleiben ausgeschlossen.
- Nur die Person, die eine Blockierung gesetzt hat, kann sie über ihren eigenen Verwaltungsweg entfernen.
- Entblocken stellt weder Freundschaft noch Personen-Follow automatisch wieder her. Neue Beziehungen müssen ausdrücklich und unter den dann geltenden Sichtbarkeits- und Kommunikationsregeln aufgebaut werden.
- Der mobile Drawer wird vor dem Verwaltungsdialog geschlossen; die Ansicht besitzt einen eigenen Overflow-Test bei 412 × 915.

## Unverändert

- keine Änderung an Blockierungswirkung, Nachrichtenfreigaben oder Profil-Sichtbarkeit,
- keine Änderung an Community-, Projekt-, Veranstaltungs- oder Beteiligungsrechten,
- keine Änderung an Föderation, Registrierung, Suche oder Ranking,
- keine zusätzlichen personenbezogenen Daten im Bootstrap.

## Prüfpfade

- API: Liste, Datenminimierung, Eigentümerbindung und Entblocken,
- Beziehungen: Freundschaft und Follow bleiben nach Entblocken entfernt,
- Browser Desktop: blockieren, zentral auffinden, entblocken,
- Browser Mobile: derselbe Ablauf über den echten Drawer bei 412 × 915,
- vollständiger Gold-, Security- und Privacy-Lauf vor Freigabe.

## Korrektur des ersten RC-Browserlaufs

Der erste externe Gold-Lauf bestand 21 von 23 Browserprüfungen. Beide neuen
R4-Tests suchten fest nach „Anna“, obwohl dieses Profil in einer frischen
QA-Datenbank gemäß seiner Sichtbarkeit „Netzwerk / Freunde“ für Max noch nicht
sichtbar war. Die Produktfunktion und sämtliche 25 API-/Privacy-Regressionen
waren dabei bereits erfolgreich.

Die Testvorbedingung wird nun über die echte sichtbare Oberfläche hergestellt:
Ein zweites Demo-Profil gibt sein Gesamtprofil ausdrücklich für angemeldete
Mitglieder frei. Desktop und Mobile wählen danach dynamisch eine sichtbare,
nicht mit Max identische Person anhand ihrer stabilen ID. Es gibt weiterhin
keinen Auth-Bypass, keine direkte Datenbankmanipulation und keine Aufweichung
der produktiven Privacy-Regeln. Der Gold-Preflight sichert diese Invarianten
zusätzlich ab.

## Korrektur des zweiten RC-Browserlaufs

Der zweite externe Lauf erreichte erneut 21 von 23 Browserprüfungen. Die
Personenauswahl und Privacy-Vorbedingung funktionierten nun korrekt; der Test
versuchte danach jedoch, den vorhandenen Blockieren-Button direkt anzuklicken,
obwohl er produktseitig absichtlich im geschlossenen Menü „Weitere Aktionen“
liegt. Das war erneut eine falsche Testannahme, kein Produktfehler.

Desktop und Mobile verwenden jetzt denselben echten Bedienweg: sichtbares
Aktionsmenü öffnen, dessen offenen Zustand und den sichtbaren Button prüfen,
Blockierung bestätigen und die erfolgreiche Serverantwort abwarten. Erzwungene
Klicks und verlängerte Wartezeiten werden ausdrücklich nicht verwendet. Der
Gold-Preflight verhindert künftig direkte Klicks auf den geschlossenen Button.

## Korrektur des dritten RC-Browserlaufs

Der dritte externe Lauf bestand 22 von 23 Browserprüfungen; der vollständige
mobile R4-Ablauf war erfolgreich. Der einzige Fehler war eine sprachlich
abweichende Desktop-Erwartung: Die korrekte Oberfläche sagt „stellt … nicht
automatisch wieder her“, während der Test „nicht automatisch
wiederhergestellt“ suchte. Der Test prüft jetzt die tatsächlichen semantischen
Kerne der Sicherheitsinformation: Freundschaften und Folgen, keine
automatische Wiederherstellung und ausdrücklich neuer Beziehungsaufbau.

## Gold-Freigabe

Der abschließende reale Windows-/Chromium-Lauf des Gold Candidate bestand am
21. September 2026 vollständig mit 23/23 Tests. Darin enthalten sind Setup,
Desktop und Mobile bei 412 × 915 sowie die neuen R4-Abläufe zum Blockieren,
zentralen Auffinden und kontrollierten Entblocken.

Verbindlicher geprüfter Quellstand: `936e9a9`. Nach diesem Lauf wurden keine
Laufzeit-, Test- oder Konfigurationsdateien mehr verändert; ergänzt wurden nur
diese Freigabedokumentation und die Wiederherstellungsmatrix.
