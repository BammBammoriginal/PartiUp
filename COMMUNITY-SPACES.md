# Community-Spaces – Architektur v0.8.4

## Grundregel
Eine Community, ein Verein, eine Gruppe, ein Team oder eine Initiative ist technisch weiterhin eine `community` mit Typ, Beziehungen und Zugangsregeln. Hierarchien entstehen über `parent_id` und Beziehungen – nicht über getrennte Spezialtabellen.

Beispiel:

Sport & Bewegung
- Feierabend-Laufrunde (Gruppe)
- Basketball-Team (Team / Mannschaft)

Jeder Unterraum besitzt wiederum Feed, Events, Projekte, Beteiligung, Umfragen und eigene Zugangsregeln.

## Warum so?
- schlankes Datenmodell;
- nachvollziehbar für Ersteller;
- APIs bleiben konsistent;
- externe Systeme lassen sich leichter abbilden;
- Unterräume können später auch aus WeChange, Matrix Spaces oder anderen Quellen repräsentiert werden.

## Privacy
Eltern-/Kind-Beziehungen heben Sichtbarkeitsregeln nicht auf. Ein privater oder nicht gelisteter Unterraum wird nicht allein deshalb öffentlich, weil sein Eltern-Space öffentlich ist.
