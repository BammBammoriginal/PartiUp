# PartiUp P0.12.2 – Einheitliche Follow- und Personeninteraktionen

- Zentrale wiederverwendbare Follow-Komponente für Personen, Communities, Orte und Themen.
- `☆` = nicht gefolgt, `★` = gefolgt; Zustand zusätzlich als Text, `aria-pressed`, `aria-label` und Tooltip.
- Dezente Stern-Animation mit `prefers-reduced-motion`-Fallback.
- Optimistic UI mit sauberem Rollback bei API-Fehlern und Reconciliation über die Serverantwort.
- Bestehende serverseitige Follow-API/Berechtigungen bleiben maßgeblich.
- Follow und Friendship bleiben getrennte Beziehungen.
- Personenprofil fokussiert primär Nachricht, Follow und Freundschaftsstatus; seltene Aktionen bleiben im Sekundärmenü.
- Mobile Touch-Targets und Tastatur-Fokus wurden gehärtet.
- Regression behoben: Follow-Handler referenzierte zuvor die nicht vorhandene Funktion `renderAll()`.
