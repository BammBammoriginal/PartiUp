# BottomUpParti v0.6

## Civic-/Democracy-Grundschicht

- Beteiligung als echter Objekttyp im Backend und in SQLite ausgebaut.
- Ebenen: Kommune, Land, Bund.
- Vorgangstypen: Bürgerbeteiligung, Abstimmung, Anhörung, Ratsvorgang, Gesetz/Vorlage.
- Beteiligung speichert zuständige Institution, Status, Frist, Beschreibung, Quelle und Herkunft.
- Beteiligung kann mit mehreren Orten, Themen, Communities und Projekten gleichzeitig verknüpft werden.
- Detailansicht zeigt Einordnung, Quelle und verknüpfte Objekte.
- Filter nach Ebene, Typ, Quelle und Suchbegriff.
- Beteiligung erscheint zusätzlich in der globalen Entdecken-Suche.
- Ortseiten zeigen passende Beteiligungsvorgänge entlang der räumlichen Hierarchie.
- Native BottomUpParti-Beteiligungen können als eingeloggter Nutzer angelegt werden.

## Democracy-Vorbereitung

Demo-Daten bilden bewusst drei Klassen ab:

1. native BottomUpParti-Beteiligung,
2. externe Beteiligungsverfahren (z. B. Decidim),
3. politische Informationsvorgänge (Stadtrat/Bundestag; später Democracy.today bzw. weitere Datenquellen).

Die externen Einträge sind weiterhin Demo-/Strukturdaten und noch keine Live-Schnittstellen.
