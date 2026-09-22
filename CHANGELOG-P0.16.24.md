# PartiUp P0.16.24 – Benachrichtigungen und Freundschaftsstatus

Ausgangspunkt ist `p0.16.23-gold`.

## R5a: Anzeigen beim Öffnen und Lesen aktualisieren

- Beim Öffnen der Benachrichtigungen werden der persönliche Seitenzustand und die Liste vom Server neu geladen. Eine seit dem letzten Seitenaufruf angenommene Freundschaft erscheint danach auch in der noch geöffneten Profilansicht.
- Die Zahl ungelesener Benachrichtigungen stammt aus der aktuellen Serverantwort und stimmt mit der Liste überein.
- Nach „Alle als gelesen“ oder dem Lesen eines einzelnen Eintrags werden Liste und Zähler gemeinsam aktualisiert, ohne einen Seitenreload zu verlangen.
- Fehler beim Lesen lösen eine sichtbare Fehlermeldung aus; die Anzeige wird erst nach erfolgreichem Serveraufruf verändert.

## Geltungsbereich und Grenzen

- Persönliche Benachrichtigungen und Personenfreundschaften, auf Desktop und Mobile.
- Benachrichtigungen werden beim Öffnen und nach einer Leseaktion aktualisiert. Eine kontinuierliche Aktualisierung über WebSockets oder Hintergrundabfragen gehört nicht zu dieser Korrektur.
- Spaces und Subspaces, Veranstaltungen, Projekte und Beteiligungsvorgänge behalten ihre gemeinsame Vernetzungs- und Rechtebasis.
- Benachrichtigungsdaten bleiben an die angemeldete Person gebunden. Es werden weder öffentliche Empfängerlisten noch zusätzliche personenbezogene Daten erzeugt.

## Prüfpfade

- Desktop: sichtbare Freundschaftsanfrage aus Max' Profil, Annahme durch Anna in einer getrennten echten Browsersitzung, anschließend Benachrichtigung und aktuellen Status ohne Seitenreload prüfen und Benachrichtigung lesen.
- Mobile: Benachrichtigungsliste und Lesebedienung innerhalb des Viewports.
- API: Benachrichtigungen bleiben kontogebunden; eine fremde Person kann sie nicht als gelesen markieren; nach dem Lesen stimmt der Bootstrap-Zähler.
- Goldstandard, vollständiger Preflight, Security, Privacy, Rechte, Föderation und XSS bleiben Pflicht vor Freigabe.

Lokaler Prüfstand vor Windows-/Chromium-Abnahme: Gold-Preflight 46/46,
Gold-API-Regressionen 36/36, vollständiger Preflight, Security-Integration
46/46 sowie Privacy-, Föderations-, Rechte- und XSS-Gates bestanden. Die
Browserkonfiguration listet 27 echte Fälle, deren Ausführung aussteht.

## Befund des ersten RC-Browserlaufs (26/27)

Die neu hinzugekommene Desktop-Strecke fand bei Anna keine eingehende
Freundschaftsanfrage von Max. Der Fehler lag im Produkt: Die serverseitige
Freundschaftsliste verwarf jede Beziehung, deren Gegenprofil für die
betrachtende Person nicht vollständig freigegeben war. Max' Profil steht
vor einer angenommenen Freundschaft auf „Netzwerk/Freunde“; Anna konnte
seine Anfrage deshalb nicht annehmen. Alle übrigen 26 Browserfälle
bestanden. Der erste RC ist nicht freigegeben.

Die Beziehungsliste liefert bei einer eingehenden Anfrage nun allein ID,
Anzeigename, einfaches Avatarzeichen, Vertrauensstufe und Beziehungsstatus,
damit die empfangende Person entscheiden kann. Bio, Ort, Interessen,
Profilbild, Kontaktadresse und gemeinsame Verbindungen werden nicht
offengelegt. Die normale Profil-API bleibt für Anna vor Annahme gesperrt.
Bei ausgehenden Anfragen an verborgene Profile bleibt auch der Zielname
verdeckt; ein gezielter Anfrageversand kann damit keine versteckten
Kontonamen ermitteln. Dies deckt eine zuerst fehlschlagende und anschließend
bestandene API-Regression ab. Der korrigierte RC braucht einen neuen
realen Browserlauf.

## Befund des zweiten RC-Browserlaufs (25/27)

Der Desktopfall für Benachrichtigungen und Freundschaften bestand vollständig,
ebenso 25 der insgesamt 27 Browserfälle. Zwei ältere mobile Goldfälle hatten
Fehler im Testaufbau: Der Login-Helfer las den statischen Platzhalter „Nicht
angemeldet“, während der gespeicherte Login im Startaufruf noch geladen wurde.
Beim Personen-Test zielte ein Klick auf die Kartenmitte; in der inzwischen
veränderten Karte kann dort ein eigener Follow- oder Statusbereich liegen.
Das liefert keinen belastbaren Hinweis auf einen Fehler im Orts-Dropdown oder
der Blockierungsfunktion.

Der QA-Helfer wartet nun auf die Serverantwort **und** die danach gerenderte
Startoberfläche, bevor er den Anmeldestatus bewertet. Die Person wird über
ihren sichtbaren Namen geöffnet. Es werden weder Zeitlimits erhöht noch Klicks
erzwungen, Sitzungen gefälscht oder Produktrechte geändert. Zwei zusätzliche
Preflight-Invarianten schützen diese Testvorbedingungen. Dieser dritte RC
benötigt einen neuen Browserlauf; die bisherigen 25 erfolgreichen Fälle
belegen keine Gesamtfreigabe.

## Befund des dritten RC-Browserlaufs (26/27)

Der zuvor gescheiterte mobile Login und die Personenansicht bestanden. Ein
anderer mobiler Goldfall wartete nach einem Seitenreload vergeblich auf die
Unterhaltungsliste. Ursache ist eine weitere fehlende Wartebedingung im
gemeinsamen Navigationshelfer: Playwright meldet `page.reload()` schon als
abgeschlossen, während `/api/bootstrap` und das Rendern der angemeldeten
Oberfläche noch laufen. Öffnet der Test vorher „Nachrichten“, rendert die
App die anonyme leere Liste; das spätere Bootstrap-Rendern ruft die
Unterhaltungen nicht nachträglich ab. Die 26 anderen Browserfälle bestanden.

Der Navigationshelfer wartet nun vor der Nutzeraktion auf das sichtbar
abgeschlossene Bootstrap-Rendern. Diese Bedingung gilt auch für die anderen
Goldfälle mit Navigation direkt nach einem Reload. Ein zusätzlicher
Gold-Preflight-Check schützt sie vor versehentlichem Entfernen. Weder
Produktcode noch Authentifizierung, Zeitlimits, Rechte oder Space-Logik wurden
in diesem vierten Kandidaten geändert. Für die Freigabe ist ein erneuter
echter Browserlauf erforderlich.
