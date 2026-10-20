# PartiUp: verbindliche Regeln für bestehende und neue Implementierungen

Die Nutzeranforderungen vom 20.10.2026 gelten rückwirkend. Vor Änderungen die
betroffenen Space-Typen, vernetzten Ansichten, bestehenden Daten, Rechte,
Privacy- und Föderationsgrenzen benennen. Gleiche fachliche Aktionen verwenden
dieselben serverseitigen Entscheidungen; begründete Typunterschiede dokumentieren.

## Zielgruppe und UI/UX (vorrangig)

PartiUp richtet sich an Menschen ohne Technik- oder Fachkenntnisse. Sie nutzen
heute Big-Tech-Apps, weil diese schnell und bequem sind, und wären offen für
Alternativen. Funktionen gibt es anderswo schon; PartiUp unterscheidet sich
durch Attraktivität, Zugänglichkeit und Erklärbarkeit.

- Maßstab ist ein Mensch ohne Fachwissen: technisch korrekt, aber umständlich,
  unverständlich oder unattraktiv ist ein Mangel, nicht Kosmetik.
- Technik bleibt unsichtbar. Föderation, Erweiterungen, Connectoren und Rollen
  erscheinen als normale Funktionen in Alltagssprache; Details liegen unter
  Einstellungen bzw. Info.
- Schneller Einstieg: kurze Abläufe, gute Voreinstellungen, Komplexität erst
  bei Bedarf. Bewährte Bedienmuster verbreiteter Apps aufgreifen, ohne
  Privacy- oder Space-Regeln aufzugeben.
- Folgenreiche Aktionen erklären vorher verständlich ihre Wirkung.
- Mobile gleichwertig oder vorrangig; Barrierefreiheit ist Pflicht.

## Schlanker Core, offen in alle Richtungen

Der Core bleibt klein und stabil. Neue Fachfunktionen kommen als Modul oder
Erweiterung (reuse → integrate → federate → erst dann selbst entwickeln).
ActivityPub (`server/federation/`), Connectoren für andere Netze
(`server/connectors/`) und CivicTech-Integrationen wie Decidim oder Consul
(`server/integrations/`) bleiben getrennte Schichten. Internes Modell zuerst,
Herkunft sichtbar, read-only first, keine Integration erweitert lokale Rechte.

## Sicherheit, Privacy, Abhängigkeiten

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

## Robuste Tests statt starrer Tests

Rote Tests nach korrekten Änderungen kosten Zeit und verdecken echte Fehler.
Tests prüfen deshalb Verhalten, nicht Formulierungen im Quelltext.

- Neue Prüfungen testen beobachtbare Wirkung: HTTP-Status, Antwortdaten,
  gespeicherten Zustand, sichtbares Ergebnis im Browser. Keine neuen Checks, die
  Quelltext nach Zeichenketten durchsuchen (`app.includes('…')`), außer für
  Invarianten, die anders nicht prüfbar sind; dann den Grund kommentieren.
- Browser-Tests bedienen wie ein Mensch: Rolle und zugänglicher Name, sichtbarer
  Titel oder ausdrücklich als Testvertrag gedachte `data-*`-Attribute; nicht
  Kartenmitte, CSS-Klassen, DOM-Position oder Tabnamen. Fachlich gleichwertige
  Umbenennungen oder Umgliederungen dürfen keinen Test rot machen.
- Wird ein Test nach einer Änderung rot: zuerst einordnen (Produkt, Test,
  Umgebung). Ist er an die Umsetzung gekoppelt, auf Verhalten umschreiben statt
  die neue Zeichenkette nachzutragen.
- Bestehende Zeichenketten-Preflights schrittweise ersetzen, wenn der Bereich
  ohnehin geändert wird; keine Großumstellung in einem Schritt.
- Flexibler heißt nie schwächer: Sicherheits-, Privacy- und Rechteaussagen
  bleiben mindestens gleich streng, möglichst als echte Negativtests.

Prüfungen: `npm run preflight`, `npm run qa:security`, `npm run qa:gold`,
`npm run qa:smoke`, `npm run qa:layout`, `npm run qa:accessibility`,
`npm run audit:prod`, `npm run audit:all`, `npm audit signatures`.
Nach einer relevanten Korrektur einen passenden Verhaltens-/Negativtest ergänzen.
Fehlende Browser, externe Prüfungen oder offene Befunde ausdrücklich kennzeichnen.
Ein bestandener Prototyp-Goldlauf ist keine automatische Produktionsfreigabe.

Details: `RETROFIT-REVIEW-2026-10-20.md`, `SECURITY-UPDATE-AND-RECOVERY.md`,
`QA-RELEASE-PROCESS.md`.
