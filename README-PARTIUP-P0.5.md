# PartiUp P0.5

P0.5 ist der erste Community-/Group-Federation-Vertical-Slice.

## Was jetzt möglich ist

Ein PartiUp-Space mit aktivierter Federation besitzt einen eigenen ActivityPub-`Group`-Actor und ein eigenes Fediverse-Handle. Remote Actors können dieser Group folgen. Öffentliche, nach der PartiUp-Federation-Policy freigegebene Beiträge und Antworten werden zusätzlich durch die Community als `Announce` an deren föderierte Follower verteilt.

## Was bewusst noch nicht möglich ist

Remote-Nutzer dürfen noch keine neuen Threads oder Antworten direkt in eine PartiUp-Community schreiben. Solche Activities werden `deferred`. Dafür braucht PartiUp eine getrennte, von Space-Admins steuerbare Inbound-Federation-Berechtigung. Diese Sicherheitsgrenze wird nicht implizit aus der Outbound-Federation abgeleitet.

## Lokal starten

```powershell
.\setup.bat
.\start-local.bat
```

## LAN

```powershell
.\start-network.bat
```

## Öffentlicher Federation-Test

Mit einer stabilen öffentlichen HTTPS-Adresse:

```powershell
.\start-federation-test.bat https://DEINE-DOMAIN.example
```
