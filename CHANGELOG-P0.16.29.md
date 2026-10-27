# PartiUp P0.16.29 – gemeinsame Orts- und Ebenennavigation

Stand: 28. September 2026

Status: Release Candidate; GitHub-Browserlauf und manuelle Sichtprüfung erforderlich.

## Ausgangsfehler und Bezug zur Vorversion

P0.16.28 hatte eine Ortsauswahl nur in „Entdecken → Lokal“. Die direkt über die Navigation erreichbaren Bereiche verwendeten teils einen statischen Pilotort, teils eigene Filter oder gar keine Ortsauswahl. Ein Wechsel in „Lokal entdecken“ konnte die angezeigte Auswahl von anderen Ansichten entkoppeln. Der Begriff „Alle Ebenen“ bezeichnete in Beteiligung sowohl die räumliche Auswahl als auch Kommune/Land/Bund.

## Änderung

- Ein gemeinsam gesteuerter Ortswähler mit „Alle Ebenen“ und der vorhandenen Ortshierarchie ist im Navigationsbereich sowie in den Übersichten Orte, Themen, Communities, Menschen, Veranstaltungen, Projekte und Beteiligung erreichbar. „Entdecken → Lokal“ benutzt denselben Zustand.
- Beim Wechsel aktualisieren sich die aus sichtbaren Verknüpfungen abgeleiteten Listen. Der gewählte Ort bleibt beim Navigieren und nach einem Reload innerhalb desselben Browser-Tabs bestehen.
- Menschen erscheinen in einem konkreten Ortskontext nur anhand der für den Betrachter freigegebenen Ortsangabe. Die bisherige serverseitige Sichtbarkeitsprüfung bleibt die Grundlage.
- Sichtbare Personen, die ihren Ort nicht freigegeben haben, bleiben als eigener Bereich „ohne freigegebenen Ort“ erreichbar. Der gewählte Ort wird ihnen nicht zugeschrieben.
- Der mobile Navigationsbereich hält den Konto-Einstieg erreichbar und lässt bei Platzmangel die Navigationsliste innerhalb der Seitenleiste scrollen.
- Der bisherige Community-Umfang „direkt auf Ebene“ bleibt erkennbar. Die Aktion „Alle Ebenen anzeigen“ führt nun denselben gemeinsamen Ortswechsel aus.
- Die Verfahrenswahl in der Beteiligung heißt zur Abgrenzung „Alle Beteiligungsebenen“.
- Private Unterhaltungen, persönliche Beziehungen und der persönliche Start-Feed bleiben ortsunabhängig.

## Geprüfte Risiken und Abnahme

Desktop- und Mobile-Goldfälle prüfen Ortswechsel, die einheitliche Anzeige über Bereichswechsel und Reload, Ortsbezug freigegebener Menschenprofile und den weiterhin eigenständigen Chatbereich. Die strukturelle Prüfung des alten „Lokal entdecken“-Selektors wurde auf den gemeinsamen Auswahlmechanismus angepasst. Security-/Privacy-Integration und vollständiger Preflight müssen bestehen. Der Browserlauf auf GitHub und die Sichtprüfung entscheiden über die Freigabe; bis dahin bleibt diese Version ein Release Candidate.

Der erste isolierte Browserlauf für PR #8 bestand 28/35 Fällen. Sieben Fehler betrafen die Erreichbarkeit des Kontos im mobilen Drawer, sichtbare Personen ohne freigegebenen Ort und eine Einrückung in der mobilen Ortsauswahl. Die gezielten Korrekturen oben benötigen einen erneuten vollständigen Browserlauf; der erste Lauf gilt ausdrücklich nicht als Freigabe.

Der zweite Lauf bestand 34/35. Im verbleibenden Navigationsfall klickte der Test auf die Mitte einer Personenkarte und traf dort eine eigene Kartenaktion. Der Test klickt nun wie die anderen Sicherheitsabläufe ausdrücklich auf den sichtbaren Namen; eine statische Schranke schützt diesen Pfad gegen das alte Klickmuster. Vollständige Browserabnahme weiterhin offen.

Die mögliche Umordnung von persönlichen Kontakten und Chats sowie ein zusätzlicher Einstieg über ein Sprechblasen-Symbol im Kopfbereich sind als eigenständiger UX-Schritt R6f vermerkt. Diese Version ändert weder Gesprächsrechte noch Chatnavigation, Datenmodell oder Föderationsregeln.

## Nachtrag 27. Oktober 2026: auf aktuellen Stand nachgezogen

PR #8 basierte auf P0.16.28 vom 28.09. und hatte nach fünfzehn späteren Merges Konflikte. Er wurde auf dem aktuellen `main` neu zusammengeführt (PR „P0.16.29 nachgezogen“), ohne die Funktion zu ändern:

- `load()` behält den Kontowechsel-Schutz aus #17 und ergänzt die Prüfung, dass der gewählte Ort nach einem Neuladen noch existiert.
- Die Stilregeln beider Seiten bleiben erhalten.
- Karten werden in Tests über ihren Titel geöffnet (`openCardByTitle`); die Preflight-Prüfung, die das alte Klickmuster als Text vorschrieb, entfällt („Keine Tests über Tests“, Entscheidung vom 27.10.2026).
- Seit #11 sind die Demo-Konten öffentlich, auch ihr Ort. Der Fall „sichtbare Person ohne freigegebenen Ort“ hat deshalb einen eigenen Gold-Test, der seine Voraussetzung auf einem isolierten Server selbst herstellt (Lisa verbirgt ihren Ort). Gegenprobe: ohne den Bereich „ohne freigegebenen Ort“ schlägt der Test an.
