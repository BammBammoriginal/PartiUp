# PartiUp – gemeinsame Anweisungen für KI-Assistenten

Stand: 2026-10-26. Gilt für Code-Analysen und Änderungen im gesamten Repository.

## Arbeitsprinzip
- GitHub ist die maßgebliche Quelle für **implementierten** Code und den tatsächlichen Versionsstand. Chatverläufe oder KI-Zusammenfassungen sind kein Implementierungsnachweis.
- Lies vor jeder Aufgabe die relevante vorhandene Fach-, Architektur- und QA-Dokumentation. Beginne mit `docs/AI-COLLABORATION.md` und `docs/PROJECT-REGISTER.md`.
- Analysiere vor Änderungen Branch, Commit, offene passende Pull Requests und betroffene Komponenten. Bestehende Arbeiten nicht versehentlich überschreiben.
- Ändere `main` nicht direkt. Nutze einen thematisch klar abgegrenzten Branch und einen Pull Request; Merge und Releases benötigen Freigabe.
- Bearbeite pro PR möglichst eine fachlich zusammenhängende Änderung. Keine unaufgeforderten Refactorings, Versionssprünge oder großflächigen Formatierungen.

## Fachliche Leitplanken
- PartiUp verbindet Orte, Themen, Communities, Menschen, Veranstaltungen, Projekte und Beteiligung durch eine gemeinsame Space- und Beziehungslogik; fachliche Identität, Kontextverknüpfungen, Rollen, Rechte und Sichtbarkeit müssen konsistent bleiben.
- Server-seitige Zugriffskontrollen sind verbindlich. Keine Umgehung von Authentifizierung, CSRF, Rollen-/Sichtbarkeitsprüfung oder Privatsphäregrenzen.
- ActivityPub/Federation darf keine privaten Inhalte offenlegen. Sicherheits- und Datenschutzregeln gelten auch für Medien, Suche, Feeds, API und Unterräume.
- Keine stille Änderung des Datenmodells, der Federation-Semantik, der Sicherheitsregeln oder bestehender Produktverträge.
- Produkt- und Architekturannahmen aus bestehenden Dokumenten belegen; bei Widersprüchen aktuelle Implementierung, dokumentierte Entscheidungen und offene PRs vergleichen, Unklarheiten offenlegen.

## Qualität und Nachweise
- Verbindliche Grundlage: `QA-RELEASE-PROCESS.md`, `P0.16.0-BIS-P0.16.20-RETROSPEKTIVE.md` sowie einschlägige Security-/Privacy-Dokumente.
- Fehler zunächst reproduzieren; bei Produktkorrekturen nach Möglichkeit einen fehlschlagenden Regressionstest vor dem Fix erstellen.
- Passende gezielte Tests, anschließend die laut Änderung erforderlichen Preflight-, Integrations- und echten Desktop-/Mobile-Browsertests ausführen.
- Einen nicht ausgeführten Test stets als **nicht ausgeführt** kennzeichnen. Nie aus statischen Tests auf Browser- oder Produktionsfreigabe schließen.
- Keine Testumgehungen wie Login-Bypass, blind erhöhte Timeouts oder geschönte Assertions.

## Übergabe
Jeder PR beschreibt: Ziel, Ausgangsstand (Branch/Commit), Änderungen, betroffene Bereiche, Risiken, ausgeführte Tests mit Resultat, nicht ausgeführte Prüfungen, offene Punkte und notwendige Freigaben.
Entscheidungen/Arbeitsverläufe nach `docs/PROJECT-REGISTER.md` dokumentieren. Keine Tokens, Kennwörter, persönliche Nutzerdaten oder vertrauliche Logdateien committen.


## Verbindliches Architekturziel: menschliche Übernahme
PartiUp muss jederzeit von einem qualifizierten menschlichen Entwicklerteam ohne Abhängigkeit von ChatGPT, Claude oder historischen Chats weiterentwickelt werden können. Wartbarkeit (Modularität, Analysierbarkeit, Änderbarkeit, Testbarkeit), Sicherheit und Betriebsfähigkeit sind ausdrücklich Qualitätsanforderungen. Orientierungen: ISO/IEC 25010, NIST SSDF und OWASP ASVS; Konformität niemals ohne nachgewiesenes Audit behaupten.

- Strikte Verantwortungsgrenzen anstreben: HTTP-Routen/Controller, Anwendungsdienste und Fachregeln, Berechtigungen, Datenzugriff, Infrastruktur/Federation getrennt halten. Bestehende große Dateien (`server/server.js`, `server/db.js`) *schrittweise* und verhaltensgleich abbauen, keine risikoreiche Komplettneuschreibung.
- Fachlogik darf für neu extrahierte Komponenten nicht vom SQLite-Treiber oder SQLite-spezifischem SQL abhängen; Datenzugriff hinter dokumentierte Repository-/Adapter-Verträge legen. Bestehenden SQLite-Code bis zu kontrolliertem Ersatz weiter betreiben.
- Datenbankwechsel ist erst ausreichend vorbereitet, wenn ein zweiter Adapter oder ein nachweisbarer PostgreSQL-Prototyp die relevanten gemeinsamen Vertragstests besteht; reine Interfaces/Dokumentation sind kein Migrationsnachweis.
- Migrationen müssen versioniert, überprüfbar und mit Datenintegritäts-, Backup-/Restore- und Rückfallstrategie geplant werden. Kein produktiver Datenbankwechsel ohne gesonderte Freigabe.
- Für neue Module sind klar benannte öffentliche Schnittstellen, Datenflüsse, Eigentümer/Verantwortlichkeiten, Fehlerfälle und Tests zu dokumentieren. Neue Features dürfen nach Möglichkeit keine weitere direkte Kopplung an monolithische Dateien herstellen; begründete Ausnahmen im PR benennen.
- Maintainability-Aufgaben gelten als **nicht erledigt**, solange nur Prompts, Markdown, leere Verzeichnisse oder ungenutzte Abstraktionen vorliegen. Fertig bedeutet: produktiv genutzter Codepfad ist tatsächlich umgestellt und Regressionstests bestehen.
- Die konkrete Reihenfolge, Abnahmekriterien und Fortschrittsnachweise stehen in `docs/HUMAN-HANDOVER-ROADMAP.md`. Bei jeder neuen Fachfunktion prüfen, ob eine günstige Modernisierung eines berührten Codepfads möglich ist, ohne notwendige Sicherheits-/Stabilitätsaufgaben zu verdrängen.
