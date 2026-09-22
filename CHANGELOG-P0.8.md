# PartiUp P0.8

- Federation Governance & Trust Layer eingeführt.
- Instanzweite Modi `open`, `reviewed`, `allowlist` über Environment.
- Instanzweite trusted/allowed/blocked Domainlisten.
- Space-spezifische Peer-Regeln: inherit, trusted, allowed, limited, blocked.
- Inbound User-/Group-Inboxes prüfen Peer-Governance nach erfolgreicher Signaturprüfung.
- Outbound User-/Group-Delivery prüft Governance sowohl beim Queuing als auch vor dem tatsächlichen Versand.
- `Delete`/`Undo` bleiben als signierte Cleanup-Aktivitäten auch nach Blockierung zulässig.
- Beobachtete Peers werden mit minimalen Verbindungsmetadaten registriert.
- Space-Admin-UI für Fediverse-Verbindungen ergänzt.
- Governance-Diagnose/API und eigener P0.8-Preflight ergänzt.
