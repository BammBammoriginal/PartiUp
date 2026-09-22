# BottomUpParti v0.9.3 – Stability & Privacy Hardening

Kein Feature-Release. Diese Version schließt vor dem geplanten Architektur-/HumHub-Hybrid-Gate konkrete Privacy- und Rechte-Risiken aus v0.9.2.

## Behoben / gehärtet

- Globaler Feed respektiert jetzt zwingend die Sichtbarkeit der owning Community. Inhalte privater/unlisted Spaces können nicht mehr über den anonymen Feed auslaufen.
- Sichtbarkeitsprüfung für private Events berücksichtigt berechtigte Mitglieder der zugeordneten/owning Spaces konsistent.
- Projekt-/Event-Rollen erben Parent-Rollen nicht mehr implizit mit erhöhten Rechten. Standard ist sichere Herabstufung auf `member`; explizite Child-Rollen bleiben möglich.
- Polymorphe Tabellen (`tasks`, `object_modules`, scoped roles/overrides, Source-Links) erhalten eine Startup-Integrity-Cleanup-Schicht gegen verwaiste Datensätze.
- Rate-Limit-IP-Auflösung unterstützt lokale Reverse-Proxy/Tunnel nur nach explizitem Opt-in `BUP_TRUST_LOCAL_PROXY=1`; Forwarded-IP-Werte werden als IP validiert.
- Security-Integrationstest prüft jetzt zusätzlich Private-Feed-Isolation und Child-Space-Privilege-Containment.
- Neuer `privacy-hardening-preflight` mit 10 statischen Invarianten.

## Architekturstatus

v0.9.3 bleibt Node/Express/SQLite Closed-Alpha-Code. Sie ist der letzte geplante reine Hardening-Schritt vor dem Architektur-Entscheidungsgate für einen möglichen offenen Hybrid-Unterbau (u. a. HumHub über klar getrennte APIs/Adapter).
