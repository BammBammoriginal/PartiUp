# Space Modules & Aggregation

## Grundprinzip
Community, Verein, Team, Gruppe und Arbeitsraum verwenden dasselbe Space-/Community-Modell. Unterräume sind echte Objekte mit `parent_id`, keine Sonderstruktur.

## Inhalte
Events, Projekte und Beteiligung erhalten `owner_space_id` und `propagation_scope`. Dadurch bleibt die Urheberschaft des Raums eindeutig, während Inhalte bei Bedarf nach oben aggregiert werden können.

## Module
Die Tabelle `space_modules` hält pro Space aktivierte Funktionen. Dadurch kann ein Verein andere Module nutzen als eine Initiative oder ein Projektteam, ohne dass neue Sondermodelle entstehen.

## Externe Quellen
`external_sources` beschreibt Systeme/Quellen provider-neutral. `object_source_links` verbindet interne Objekte mit externen IDs und Provenance. Adapter können später APIs, iCal/ICS, ActivityPub, RSS, JSON/CSV oder andere offene Schnittstellen bedienen.

## v0.8.8: Projekte und Veranstaltungen als modulare Spaces

Projekte und Veranstaltungen nutzen nun dieselbe Grundidee wie Community-Spaces: ein schlanker Objekttyp mit aktivierbaren Modulen statt einer starren Sonderseite. Aufgaben werden über ein generisches Task-Modell an `entity_type + entity_id` gebunden. Damit kann derselbe Kern in Projekten und Veranstaltungen genutzt und später auf weitere Space-Typen erweitert werden.

Projektmodule sind bewusst auf einen späteren Coworking-Ausbau vorbereitet. Kanban, Unteraufgaben, Abhängigkeiten, Ressourcen oder externe Projektwerkzeuge sollen später Erweiterungen desselben Modells sein und kein zweites Projektsystem erzeugen.

`Vertrauen & Herkunft` ist eine eigene, kompakte Ebene. User-Verifizierungsstufe und offizielle Organisationsautorisierung bleiben getrennt. Erstellerprofile sind dort direkt aufrufbar.
