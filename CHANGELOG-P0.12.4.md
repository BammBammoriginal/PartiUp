# PartiUp P0.12.4 – Cross-Space & Cross-Level Consistency

## Ziel
Die in P0.12.1–P0.12.3 eingeführten Netzwerk-, Follow- und Connection-Muster werden nicht nur lokal, sondern über relevante Ansichten, Ebenen und Spaces konsistent angewendet.

## Änderungen
- „Gefolgte Bereiche“ zählt und zeigt nur Orte, Themen und Communities; Personen-Follows bleiben im Menschen-/Freunde-Kontext.
- Personen-Karten nutzen überall die zentrale ☆/★-Follow-Komponente.
- Community-Karten nutzen überall dieselbe zentrale ☆/★-Follow-Komponente.
- Personenprofile zeigen Ort und Interessen als echte Connection-Chips – sowohl in Übersicht als auch Interessen-Tab.
- Freundekarten verlinken den Ort über dieselbe Connection-Chip-Komponente.
- Themenkarten verlinken ihre Community-Bezüge als echte Connections statt als statischen Text.
- Dynamisch neu gerenderte Listen (Personen, Entdecken, Communities, Beteiligung) verdrahten zentrale Follow-/Connection-Komponenten erneut.
- Card-Navigation ignoriert bewusst verschachtelte Buttons/Connections, damit Interaktionen nicht versehentlich die übergeordnete Karte öffnen.
- Mobile Layouts für Follow-/Connection-Aktionen gehärtet.
- Veraltete sichtbare BottomUpParti-Bezeichnungen in aktuellen UI-/Demo-Pfaden auf PartiUp korrigiert.

## Release-Gate
Neuer Preflight `partiup-cross-space-consistency-preflight.js` prüft Cross-Space-/Cross-Level-Konsistenz als eigenes Release-Gate.

## Unverändert
Keine Änderung an Friendship-, Membership-, Federation-, RBAC- oder fachlicher Prozesslogik.
