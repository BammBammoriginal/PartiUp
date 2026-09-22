# PartiUp P0.10 – Extension Architecture + Transparency & Control

P0.10 schafft die technische Basis für Erweiterungen, ohne die PartiUp-UX in einzelne Plugin-Welten zu zerlegen.

## Grundprinzip

**Technisch modular, UX-seitig integriert, jederzeit transparent.**

Normale Nutzer sehen aktivierte Erweiterungen als normale Space-Funktionen. Administration, Berechtigungen und technische Details liegen getrennt unter **⚙ Einstellungen**. Herkunft, aktive Erweiterungen und Datenzugriffe bleiben unter **ⓘ Info** nachvollziehbar.

## Extension Registry

Jede Erweiterung besitzt ein Manifest mit:
- stabiler ID, Name, Version und Anbieter,
- verständlicher Funktionsbeschreibung,
- Capability-Liste,
- beschriebenem Datenzugriff,
- beschriebenem Netzwerkzugriff,
- vorgesehenen UI-Flächen,
- Verfügbarkeitsstatus.

Beim Aktivieren wird ein Capability-Snapshot gespeichert und die Änderung auditierbar protokolliert. Geplante Erweiterungen können nicht versehentlich aktiviert werden.

## Referenz-Erweiterung

`partiup.resources` demonstriert die Architektur als erste First-Party-Erweiterung. Nach Aktivierung erscheint **Ressourcen** als normale Space-Funktion. Admins können HTTPS-Ressourcen hinterlegen. Es gibt keinen Download- oder Fremd-App-Flow.

## Bereits vorgemerkt

- `municipal.participation` – kommunales Beteiligungspaket auf dem Participation Core; noch nicht aktivierbar.
- `connector.decidim` – spätere Decidim-Anbindung; noch nicht aktivierbar.

## UX-Trennung

Space-Funktionen bleiben in der Funktionsnavigation. Administration und Transparenz sind davon getrennt:
- **⚙ Einstellungen:** Module, Erweiterungen, Zugang, Rollen, Moderation, Federation.
- **ⓘ Info:** Einordnung, Herkunft, Vertrauen, aktive Erweiterungen und deren Zweck.

## Start unter Windows PowerShell

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```
