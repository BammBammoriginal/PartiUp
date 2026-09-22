# BottomUpParti v0.8.4 – Community Spaces

## Neu
- Communities öffnen als eigene Seiten/Spaces statt als Detail-Popup.
- Eigene Space-Navigation: Übersicht, Feed, Gruppen & Teams, Events, Projekte, Beteiligung, Umfragen, Mitglieder, Über.
- Untergruppen/Teams sind keine Sonderdatenstruktur, sondern verschachtelte Communities über `parent_id`.
- Admins/Moderatoren können Unterräume anlegen; Orte/Themen sowie Zugangseinstellungen werden standardmäßig sinnvoll vom Eltern-Space übernommen.
- REST-Endpunkte für Unterräume: `GET/POST /api/communities/:id/subspaces`.
- Community-Deep-Links über `#community/<id>/<tab>` als Vorbereitung für PWA/App-Navigation.
- Mitgliederliste wird aus Datenschutzgründen nur Mitgliedern des jeweiligen Spaces geliefert.
- Demo-Unterräume unter „Sport & Bewegung“ zeigen die Struktur mit Gruppe und Team/Mannschaft.

## Bewusst noch nicht ausgebaut
- keine komplexen frei konfigurierbaren Discord-artigen Rollenmatrizen;
- kein Chat/Voice/Video in Spaces;
- keine separate Datenstruktur für Teams, damit das Modell schlank und interoperabel bleibt.
