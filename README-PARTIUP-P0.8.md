# PartiUp P0.8 – Federation Governance & Trust

P0.8 führt eine gemeinsame Governance-Schicht zwischen ActivityPub-Protokoll und den PartiUp-Spaces ein. Sie ergänzt die bereits vorhandenen Space-/Objektfreigaben um Regeln für externe Fediverse-Server.

## Ziel
Federation soll technisch offen bleiben, aber nicht unkontrolliert sein. Ein Space-Admin kann Verbindungen zu beobachteten Servern verständlich einstufen, ohne ActivityPub-Details kennen zu müssen.

## Regeln

### Instanzweite Modi (Environment)
- `open` (Standard): alle Peers außer Blockliste; Space-Regeln gelten zusätzlich.
- `reviewed`: externe Schreibzugriffe nur von `trusted`/`allowed` Peers; Follow/Lesen bleibt möglich.
- `allowlist`: nur `trusted`/`allowed` Peers dürfen regulär föderieren.

`PARTIUP_FEDERATION_GOVERNANCE_MODE=open|reviewed|allowlist`

Optionale Listen:
- `PARTIUP_FEDERATION_TRUSTED_DOMAINS=example.social,verein.example`
- `PARTIUP_FEDERATION_ALLOWED_DOMAINS=events.example`
- `PARTIUP_FEDERATION_BLOCKED_DOMAINS=bad.example`

### Space-Regeln
- **Standard**: Instanzregel übernehmen.
- **Vertrauenswürdig**: explizit vertrauenswürdige Verbindung.
- **Freigeben**: Verbindung zulassen.
- **Nur lesen/folgen**: Follow/Empfang bleibt möglich, externe Schreibaktivitäten werden abgewiesen.
- **Blockieren**: reguläre eingehende und ausgehende Federation mit diesem Server wird gestoppt.

Eine Space-Regel kann eine instanzweite Blockierung oder Allowlist nicht unsicher überstimmen.

## Datenschutz/Sicherheit
Signierte `Delete`/`Undo`-Aktivitäten dürfen auch von inzwischen blockierten Peers noch verarbeitet werden. Das verhindert, dass eine Blockierung notwendige Lösch-/Aufräumvorgänge unterbindet. Signatur-, SSRF-, Replay-, Payload- und Rate-Limit-Härtungen aus P0.5–P0.7 bleiben unverändert aktiv.

## UX
Normale Nutzer sehen weiterhin PartiUp-Inhalte und keine technische Plugin-/Serververwaltung. Die neuen Server-Regeln liegen ausschließlich bei der administrativen Federation-Einstellung eines Spaces und verwenden verständliche Zustände statt ActivityPub-Fachbegriffe.

## Windows
```powershell
.\setup.bat
.\start-local.bat
```

LAN:
```powershell
.\start-network.bat
```
