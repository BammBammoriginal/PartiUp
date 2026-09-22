# PartiUp P0.4 – föderierte Posts und Replies

P0.4 erweitert den sicheren P0.3.x-Federation-Core um einen kontrollierten Content-Vertical-Slice.

## Federation-Governance

Federation wird nicht automatisch allein aus der Sichtbarkeit eines Spaces abgeleitet.

### Space-Ebene
Administratoren mit `space.manage_access` wählen:
- `off`: Alles bleibt lokal.
- `public`: Öffentliche Beiträge dürfen standardmäßig föderieren; einzelne Beiträge können deaktiviert werden.
- `selected`: Nur ausdrücklich freigegebene Beiträge dürfen föderieren.

Nichtöffentliche (`unlisted`/`private`) Spaces können nicht föderieren. Wird ein öffentlicher Space nachträglich nichtöffentlich, wird sein Federation-Modus automatisch auf `off` gesetzt.

### Beitragsebene
Autoren oder Space-Administratoren können pro Beitrag setzen:
- `inherit`: Space-Regel übernehmen.
- `enabled`: ausdrücklich freigeben, soweit der Space Federation erlaubt.
- `disabled`: ausdrücklich lokal halten.

Die restriktivere Regel gewinnt immer. Eine Beitragsfreigabe kann niemals einen deaktivierten oder nichtöffentlichen Space überstimmen.

## P0.4 Content-Federation
- lokale freigegebene Posts -> ActivityStreams `Note` + `Create`
- Kommentare -> `Note` mit `inReplyTo`, sofern der Elternbeitrag föderieren darf
- Änderungen -> `Update`
- Löschungen -> `Delete`/`Tombstone`
- persistente Delivery Queue mit Retry
- signierte eingehende öffentliche `Create`, `Update`, `Delete` für `Note`
- Remote-Objekte bleiben getrennt von lokalen PartiUp-Inhalten
- Remote-HTML wird vor lokaler Nutzung auf begrenzten Plaintext normalisiert

## Bewusst noch nicht Teil von P0.4
- Remote-Inhalte in der normalen PartiUp-UX
- ausgehendes Folgen fremder Accounts
- Likes/Boosts
- Group Federation
- Event Federation
- RFC-9421 Message Signatures

## Start
PowerShell:

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```

Federation-Test mit stabiler HTTPS-Adresse:

```powershell
.\start-federation-test.bat https://DEINE-DOMAIN
.\federation-selftest.bat https://DEINE-DOMAIN max
```
