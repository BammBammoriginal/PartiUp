# PartiUp: verbindliche Regeln für bestehende und neue Implementierungen

Die Nutzeranforderungen vom 20.10.2026 gelten rückwirkend. Vor Änderungen die
betroffenen Space-Typen, vernetzten Ansichten, bestehenden Daten, Rechte,
Privacy- und Föderationsgrenzen benennen. Gleiche fachliche Aktionen verwenden
dieselben serverseitigen Entscheidungen; begründete Typunterschiede dokumentieren.

- Security-/Privacy-by-Design und Least Privilege: Sichtbarkeit und Aktionsrecht
  auf dem aktuellen Objekt prüfen. Ein bekannter Bezeichner/Medienlink ist keine
  Berechtigung. Nutzerfunktionen und Administration bleiben getrennt.
- Space-Sichtbarkeit, persönliche Föderationsfreigabe und Objektveröffentlichung
  sind getrennt. Geschlossene Spaces veröffentlichen nur ausdrücklich freigegebene
  Inhalte; keine impliziten privaten Antworten, Profile oder Mitgliederlisten.
- Bestehende Bibliotheken und Standards verwenden. Keine zusätzliche eigene
  Identitäts-, Rollen-, Kryptografie- oder Update-Vertrauenslogik erfinden.
- Externe Komponenten bleiben ohne geprüfte Herkunft/Integrität, minimale
  Fähigkeiten und kontrollierten Update-/Rollback-Weg gesperrt. Keine dynamische
  Plugin-Installation aus Konfiguration oder Katalogmetadaten ableiten.
- Abhängigkeiten exakt pinnen; Lockfile und Registry-Signaturen prüfen, bevor
  native Komponenten geladen werden. `ignore-scripts` nicht global aufheben.
  Ein kompromittierter offizieller Kanal ist Teil des Bedrohungsmodells.
- Mobile-first erhalten. Rechteänderungen an Server und UI konsistent abbilden.
  Keine Retries, erzwungenen Klicks oder gelockerten Limits als Fehlerbehebung.

Prüfungen: `npm run preflight`, `npm run qa:security`, `npm run qa:gold`,
`npm run qa:smoke`, `npm run qa:layout`, `npm run qa:accessibility`,
`npm run audit:prod`, `npm run audit:all`, `npm audit signatures`.
Nach einer relevanten Korrektur einen passenden Verhaltens-/Negativtest ergänzen.
Fehlende Browser, externe Prüfungen oder offene Befunde ausdrücklich kennzeichnen.
Ein bestandener Prototyp-Goldlauf ist keine automatische Produktionsfreigabe.

Details: `RETROFIT-REVIEW-2026-10-20.md`, `SECURITY-UPDATE-AND-RECOVERY.md`,
`QA-RELEASE-PROCESS.md`.
