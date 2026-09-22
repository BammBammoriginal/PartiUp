# PartiUp P0.10.4

## Space UX consistency
- Community, Projekt, Veranstaltung und Beteiligung trennen Nutzerfunktionen von Meta-/Adminbereichen.
- Nutzerfunktionen bleiben in der Funktionsnavigation.
- `ⓘ Info` bündelt Transparenz, Herkunft und Vertrauensinformationen.
- `⚙ Einstellungen` bündelt Konfiguration, Rollen/Rechte, Moderation und technische Space-Einstellungen.
- Bestehende Legacy-Ansichten bleiben intern kompatibel, werden aber nicht mehr als normale Funktions-Tabs angeboten.

## Aufgaben: freiwillige Selbstzuweisung
- Neue Permission `task.self_assign`.
- Mitglieder dürfen standardmäßig freie Aufgaben selbst übernehmen und eigene Zuweisungen wieder freigeben.
- Fremdzuweisung bleibt separat über `task.assign` geschützt.
- Bereits anderweitig belegte Aufgaben können ohne `task.assign` nicht übernommen werden.
- Auch die Zuweisung beim Erstellen einer Aufgabe wird serverseitig gegen diese Rechte geprüft.
- UI: `Ich übernehme` / `Freigeben` direkt an der Aufgabe.

## QA
- Neuer P0.10.4 Space-/Task-Preflight.
- Veraltete Object-Space- und Moderations-Preflights auf die neue Informationsarchitektur aktualisiert.
