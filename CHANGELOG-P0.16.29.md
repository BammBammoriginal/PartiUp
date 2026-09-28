# PartiUp P0.16.29 – gemeinsame Orts- und Ebenennavigation

Stand: 28. September 2026

Status: Release Candidate; GitHub-Browserlauf und manuelle Sichtprüfung erforderlich.

## Ausgangsfehler und Bezug zur Vorversion

P0.16.28 hatte eine Ortsauswahl nur in „Entdecken → Lokal“. Die direkt über die Navigation erreichbaren Bereiche verwendeten teils einen statischen Pilotort, teils eigene Filter oder gar keine Ortsauswahl. Ein Wechsel in „Lokal entdecken“ konnte die angezeigte Auswahl von anderen Ansichten entkoppeln. Der Begriff „Alle Ebenen“ bezeichnete in Beteiligung sowohl die räumliche Auswahl als auch Kommune/Land/Bund.

## Änderung

- Ein gemeinsam gesteuerter Ortswähler mit „Alle Ebenen“ und der vorhandenen Ortshierarchie ist im Navigationsbereich sowie in den Übersichten Orte, Themen, Communities, Menschen, Veranstaltungen, Projekte und Beteiligung erreichbar. „Entdecken → Lokal“ benutzt denselben Zustand.
- Beim Wechsel aktualisieren sich die aus sichtbaren Verknüpfungen abgeleiteten Listen. Der gewählte Ort bleibt beim Navigieren und nach einem Reload innerhalb desselben Browser-Tabs bestehen.
- Menschen erscheinen in einem konkreten Ortskontext nur anhand der für den Betrachter freigegebenen Ortsangabe. Die bisherige serverseitige Sichtbarkeitsprüfung bleibt die Grundlage.
- Der bisherige Community-Umfang „direkt auf Ebene“ bleibt erkennbar. Die Aktion „Alle Ebenen anzeigen“ führt nun denselben gemeinsamen Ortswechsel aus.
- Die Verfahrenswahl in der Beteiligung heißt zur Abgrenzung „Alle Beteiligungsebenen“.
- Private Unterhaltungen, persönliche Beziehungen und der persönliche Start-Feed bleiben ortsunabhängig.

## Geprüfte Risiken und Abnahme

Desktop- und Mobile-Goldfälle prüfen Ortswechsel, die einheitliche Anzeige über Bereichswechsel und Reload, Ortsbezug freigegebener Menschenprofile und den weiterhin eigenständigen Chatbereich. Die strukturelle Prüfung des alten „Lokal entdecken“-Selektors wurde auf den gemeinsamen Auswahlmechanismus angepasst. Security-/Privacy-Integration und vollständiger Preflight müssen bestehen. Der Browserlauf auf GitHub und die Sichtprüfung entscheiden über die Freigabe; bis dahin bleibt diese Version ein Release Candidate.

Die mögliche Umordnung von persönlichen Kontakten und Chats sowie ein zusätzlicher Einstieg über ein Sprechblasen-Symbol im Kopfbereich sind als eigenständiger UX-Schritt R6f vermerkt. Diese Version ändert weder Gesprächsrechte noch Chatnavigation, Datenmodell oder Föderationsregeln.
