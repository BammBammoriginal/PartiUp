# PartiUp P0.4.1

P0.4.1 korrigiert die Federation-Policy von P0.4: Ein geschlossener oder nicht gelisteter Space kann einzelne Inhalte bewusst öffentlich ins Fediverse veröffentlichen.

## Regel

- `off`: keine Federation.
- `public`: nur für öffentliche Spaces; öffentliche Beiträge föderieren standardmäßig.
- `selected`: für alle Space-Sichtbarkeiten möglich; nur Beiträge mit explizitem `enabled` werden föderiert.
- In `private`/`unlisted` Spaces ist `selected + enabled` zwingend.
- Eine Beitragsfreigabe macht nur den konkreten Inhalt öffentlich; sie öffnet weder den Space noch Mitgliederlisten, interne Diskussionen oder Beteiligungsverfahren.

## Windows / PowerShell

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```
