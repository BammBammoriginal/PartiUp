# PartiUp P0.12.1 – Mein Netzwerk & Freunde

## Änderungen
- „Mein Netzwerk“ trennt jetzt klar **Freunde**, **Mitgliedschaften** und **gefolgte Bereiche**.
- „Communities“ wurde im persönlichen Netzwerk durch „Freunde“ ersetzt; die globale Community-Navigation bleibt unverändert.
- Schlankes Friendship-Modell als eigene Beziehung neben bestehendem Follow-Modell.
- Freundschaftsanfrage, Annahme, Ablehnung/Zurückziehen und Entfernen.
- Freunde-Übersicht mit Profil, Direktnachricht, Folgen/Entfolgen und Beziehungstatus.
- Blockieren/Melden liegen bewusst im Sekundärmenü.
- Blockieren löst eine bestehende Freundschaft bzw. offene Anfrage auf.
- Keine Empfehlungsalgorithmen oder Friend-Suggestion-Engine.
- Mobile-first Darstellung der Personenbeziehungen.
- Freundschaftsdaten sind in Datenschutzexport und Kontolöschung integriert.

## Architektur
Freundschaft ist eine symmetrische, bestätigte persönliche Beziehung. Folgen bleibt eine einseitige Beziehung und Mitgliedschaft bleibt eine Space-Beziehung. Die drei Konzepte werden nicht vermischt.
