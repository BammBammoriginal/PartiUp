# BottomUpParti v0.8.8

## Modulare Projekt- und Veranstaltungs-Spaces
- Projekte und Veranstaltungen nutzen jetzt eine eigene modulare Space-Navigation statt einer einzelnen, wenig aussagekräftigen Detailansicht.
- Projekte: Übersicht, Einrichten, Aufgaben, Updates, Termine, Beteiligung, Diskussion, Dateien, Team, Über, Vertrauen & Herkunft.
- Veranstaltungen: Übersicht, Einrichten, Aufgaben, Teilnahme, Projekte, Diskussion, Dateien, Über, Vertrauen & Herkunft.
- Module können beim Anlegen gewählt und später vom Ersteller ein-/ausgeschaltet werden.
- Die Architektur bleibt provider-neutral und ausbaufähig; Projekte sind bewusst auf späteren Coworking-Ausbau vorbereitet.

## Gemeinsames Aufgabenmodul
- Generisches Task-Modell für Projekte und Veranstaltungen.
- Aufgabe, Beschreibung, Verantwortliche Person, Priorität, Fälligkeit und Status.
- Status: Offen, In Arbeit, Erledigt.
- Kein separates Event-/Projekt-Task-Datenmodell: ein gemeinsamer Kern.

## Projekt ↔ Veranstaltung
- Veranstaltungen können bereits beim Erstellen mit Projekten verknüpft werden.
- Projekt-Spaces zeigen direkt verknüpfte Termine; Event-Spaces zeigen verbundene Projekte.

## Vertrauen & Herkunft
- Eigenes Register bei Communities, Projekten, Veranstaltungen und Beteiligungsräumen.
- Darstellung bewusst kompakter.
- Erstellerprofil ist anklickbar.
- Klare Trennung zwischen `User · Verifizierungsstufe` und `Offiziell` für bestätigte Organisations-/Institutionsbezüge.
- Karten verwenden dieselbe kompakte Unterscheidung; offizielle Autorisierung wird nicht aus der User-Verifizierungsstufe abgeleitet.

## Scope
- Diskussion, Dateien und Updates sind in v0.8.8 als modulare Bereiche strukturell vorbereitet; der vollwertige Funktionsausbau folgt schrittweise.
- Aufgaben sind in dieser Version bereits funktional.
- Orte bleiben aktuell System-/Kontextebenen und haben deshalb noch kein künstlich erzeugtes Erstellerprofil.
