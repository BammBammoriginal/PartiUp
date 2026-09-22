# Space Creation Flow

## Architekturregel

**Erstellen != Konfigurieren.**

1. Minimaler Create-Request erzeugt eine stabile Space-ID.
2. Nutzer landet sofort auf der kanonischen Space-Seite.
3. Module, Beziehungen, Medien, Rollen und Integrationen werden danach schrittweise konfiguriert.
4. Setup muss nicht abgeschlossen werden und bleibt später editierbar.

## Templates
Templates sind ausschließlich Default-Konfigurationen für Module. Sie erzeugen keine separaten Datenmodelle.

- Lokale Community
- Verein
- Bürgerinitiative
- Projekt
- Arbeitsgruppe
- Öffentliche Institution
- Offene Interessengruppe

## Interoperabilität
Space-Typen und Templates enthalten keine Anbieterbindung. Externe Systeme werden weiterhin ausschließlich über generische Provenance-/Adapterstrukturen angebunden.

## UX
Der Create-Flow bleibt auf Desktop und Mobile kurz. Komplexität wird erst nach erfolgreicher Erstellung im Einrichtungsmodus sichtbar.
