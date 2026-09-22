# Privacy-/Security-Invarianten v0.9.3

1. Ein Feed-Objekt darf niemals sichtbarer sein als sein owning Space.
2. Private Spaces/Events/Projekte werden serverseitig gefiltert; UI-Hiding ist keine Sicherheitsgrenze.
3. Parent-Rollen erzeugen in Child-Projekten/-Events standardmäßig keine erhöhten Admin-/Moderationsrechte.
4. Explizite scoped Rollen/Overrides haben Vorrang vor Parent-Zugehörigkeit.
5. Polymorphe Referenzen werden auf verwaiste Datensätze geprüft und bereinigt.
6. Proxy-Header werden nur bei explizitem lokalem Proxy-Trust ausgewertet und validiert.
7. Die Integrationstests müssen Privacy-Leaks und Rechte-Eskalation als Release-Blocker behandeln.
