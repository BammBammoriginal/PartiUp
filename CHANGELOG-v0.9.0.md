# BottomUpParti v0.9.0 – Moderation & Safety Baseline

## Neu
- Space-bezogene Meldungen für Beiträge, Kommentare, Communities, Projekte, Veranstaltungen und Personen im Space-Kontext.
- Moderationsregister für Community-, Projekt- und Veranstaltungs-Spaces, nur mit `moderation.review` sichtbar.
- Server-seitig erzwungene Maßnahmen über `moderation.act`.
- Zustände `open`, `reviewing`, `resolved`, `dismissed` für Meldungen.
- Moderations-Audit-Log mit Akteur, Ziel, Aktion, Zeitpunkt und optionaler interner Notiz.
- Beiträge/Kommentare können ausgeblendet, wiederhergestellt oder als entfernt markiert werden, ohne sofortige Hard-Deletes.
- Ausgeblendete/entfernte Beiträge und Kommentare werden aus normalen Feeds/Space-Ansichten herausgefiltert.
- Bereits vorhandenes Nutzer-Blockieren bleibt Teil der Safety-Baseline.

## Bewusste Grenzen
- Noch kein vollständiges DSA-/Beschwerde-/Appeal-System.
- Noch keine automatisierte Inhaltsklassifikation.
- Noch kein globales Trust-&-Safety-Dashboard über alle Spaces.
- Personen-/Account-Sanktionen über Verwarnung/Sperre folgen erst nach sauberer Governance-Entscheidung.
- Private Chats werden nicht pauschal für Space-Moderatoren lesbar gemacht.

## Sicherheitsprinzip
Moderation ist an den jeweiligen Space und dessen RBAC-/Permission-Kontext gebunden. Ein Moderator eines Unterraums erhält dadurch keine Moderationsrechte im Eltern-Space.
