# PartiUp P0.6 – bidirektionale Group Federation

P0.6 baut direkt auf dem `P0.5-security-hardening-bundle` auf.

## Eingehende Federation
Space-Admins können getrennt von der ausgehenden Veröffentlichung festlegen:

- **Nur lesen (`off`)** – Remote-Nutzer können folgen und freigegebene Inhalte empfangen, aber nicht in den Space schreiben.
- **Antworten (`replies`)** – signierte öffentliche Remote-Notes dürfen auf bekannte Inhalte der Community antworten.
- **Diskussionen + Antworten (`threads`)** – zusätzlich dürfen neue öffentliche Remote-Threads an die Group adressiert werden.

`federation_mode=off` erzwingt auch `federation_inbound_mode=off`. Eingehende Inhalte müssen öffentlich sein, die lokale Group adressieren, dem signierenden Actor gehören und dessen HTTPS-Host verwenden.

Remote-Inhalte werden separat gespeichert, einer Community explizit zugeordnet und in der PartiUp-Oberfläche als föderierte Herkunft dargestellt. Moderatoren können sie ausblenden/entfernen.

## Start
```powershell
.\setup.bat
.\start-local.bat
```

LAN:
```powershell
.\start-network.bat
```
