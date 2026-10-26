# PartiUp – verbindliche Regeln für Menschen und KI-Assistenten

Stand: 2026-10-26. Gilt für jede Analyse und Änderung im gesamten Repository, rückwirkend auch für bestehenden Code: Kommt eine neue Regel hinzu, wird der Bestand darauf geprüft und angepasst. Es gibt keine Parallelstandards „alt“ und „neu“.

Diese Datei ist die **eine** Regelquelle für ChatGPT, Claude Code und menschliche Entwickler. `CLAUDE.md` bindet sie ein und ergänzt nur Werkzeug-Spezifisches. Ausführliche Begründungen stehen in den verlinkten Fachdokumenten; bei Widerspruch gilt die Fachquelle, und der Widerspruch wird im Projektregister geklärt.

## 0. Quellen und Nachweise

- **GitHub ist maßgeblich** für implementierten Code, Branches, PRs, Tests und den tatsächlichen Versionsstand. Chatverläufe und KI-Zusammenfassungen sind kein Implementierungsnachweis.
- **Entscheidungen** werden verbindlich, wenn die projektverantwortliche Person sie ausdrücklich trifft **und** sie im Projektregister (`docs/PROJECT-REGISTER.md`) mit Datum stehen. Entscheidungen, die nur in früheren Chats vorkommen, gelten als „zu bestätigen“.
- Aussagen werden nach Evidenz gekennzeichnet: **V** verbindlich beschlossen · **M** auf `main` vorhanden · **T** durch konkreten Testlauf belegt (gilt nur für genau diesen Commit) · **PR** nur auf offenem Branch · **B** Idee/Brainstorming, nicht beschlossen · **O** offen.
- Ideen aus dem Brainstorming sind unverbindlich, bis sie ausdrücklich übernommen werden. Einordnen ändert weder Code noch Roadmap.

## 1. Produktziel und Zielgruppe (vorrangig)

PartiUp vernetzt Orte, Themen, Communities und Menschen dort, wo Gemeinschaft ohnehin stattfindet, und führt niedrigschwellig ins Mitwirken und Entscheiden. Die Funktionen gibt es anderswo schon. PartiUp unterscheidet sich durch **Attraktivität, Zugänglichkeit und Erklärbarkeit** für Menschen **ohne Technik- oder Fachkenntnisse**, die heute Big-Tech-Apps nutzen. Ziel ist nicht die größte Funktionsfülle.

Vier feste Prämissen jedes Releases (`QA-RELEASE-PROCESS.md` §7): schlanke, nachvollziehbare Grundstruktur · Interoperabilität und API-Readiness · DSGVO, Privacy- und Security-by-Design · hochwertige Mobile-first-UX und App-Readiness.

**UI/UX-Regeln**
- Maßstab ist ein Mensch ohne Fachwissen. Technisch korrekt, aber umständlich, unverständlich oder unattraktiv ist ein Mangel, keine Kosmetik.
- Technik bleibt unsichtbar: Föderation, Erweiterungen, Connectoren und Rollen erscheinen in Alltagssprache. Funktionen stehen in der Funktionsnavigation, Verwaltung unter `⚙ Einstellungen`, Herkunft und Vertrauen unter `ⓘ Info`.
- Schneller Einstieg: „Erstellen ≠ Konfigurieren“, kurze Abläufe, gute Voreinstellungen, kein erzwungener Einrichtungsassistent (`SPACE-CREATION-FLOW.md`).
- Bewährte Bedienmuster verbreiteter Apps aufgreifen, ohne Privacy- oder Space-Regeln aufzugeben. Folgenreiche Aktionen erklären vorher ihre Wirkung.
- Mobile (412 × 915) ist gleichwertig oder vorrangig. Primäre Aktionen haben komfortable Touch-Ziele (mindestens 40 px).
- Meta-Aktionen wie „Melden“, „Info“ und „Einstellungen“ sind gut sichtbar, aber klein und unauffällig; sie erfüllen mindestens das WCAG-2.2-Minimum von 24 px (Entscheidung vom 2026-10-26).
- Barrierefreiheit: Farbe nie allein, Tastatur und Touch, zugängliche Namen, keine verschachtelten Bedienelemente, Reduced Motion. DOM-Tests ersetzen kein WCAG-Audit.
- Farben nur über Design-Tokens (`DESIGN-SYSTEM.md`). Eine endgültige Farbwelt und ein Branding sind nicht festgelegt.

## 2. Fachlicher Funktionsvertrag

Quellen: `P0.16.0-BIS-P0.16.20-RETROSPEKTIVE.md`, `P0.16-WIEDERHERSTELLUNGSMATRIX.md`, `COMMUNITY-SPACES.md`, `SPACE-MODULES-AND-AGGREGATION.md`, `PARTICIPATION-MODEL.md`.

- Community, Unterraum, Projekt, Veranstaltung und Beteiligungsvorgang sind **Space-Ausprägungen mit derselben Grundlogik** (Identität, Rollen, Sichtbarkeit, Module, Navigation, Beziehungen, Folgen). Abweichungen nur mit dokumentiertem Fachzweck und quer über alle Space-Typen getestet.
- Ein Objekt bleibt **ein** Objekt, auch wenn es mit mehreren Orten, Themen und Communities verknüpft ist. Ort, Thema und Mensch sind gleichwertige Vernetzungsachsen, keine bloßen Filter; Navigation funktioniert in beide Richtungen.
- Unterräume über `parent_id`; ein öffentlicher Elternraum macht einen privaten Unterraum nicht öffentlich.
- Freundschaft, Personen-Follow, Mitgliedschaft und Teilnahme an einer Veranstaltung sind getrennte Beziehungen.
- **Kein algorithmisches Ranking.** Übersichten entstehen chronologisch, aus Beziehungen und Kontext.
- Beteiligung ist Kernfunktion aller Space-Typen; Abstimmungen sind keine rechtsverbindlichen Wahlverfahren.
- Begriffe: UI sagt „Veranstaltung“ (technisch `event`), Einzelobjekt „Beteiligungsvorgang“, Navigation „Beteiligung“.
- Chat-Regeln (Medien, Aktionen, Autorenrechte, generische Reaktionen, Medien-Lebenszyklus): „Messaging- und Chat-Leitlinien“ in `P0.16-WIEDERHERSTELLUNGSMATRIX.md`.
- Keine stille Änderung des Datenmodells, der Föderationssemantik oder bestehender Produktverträge.

## 3. Schlanker Core, Erweiterbarkeit und Interoperabilität

PartiUp ist ein stabiler, bewusst schlanker Kern, der über Erweiterungen wächst, Teil des Fediverse ist und sich mit anderen Systemen verbinden lässt, anbindend wie angebunden. Quellen: `PARTIUP-P0.1-ARCHITECTURE.md`, README P0.2–P0.15, `server/connectors/README.md`, `server/integrations/README.md`.

- Schichten getrennt halten: Core (Identität, Spaces, Beziehungen, Orte/Themen, Rechte, Moderation, Feed, Participation Core) · Module · Föderation (`server/federation/`) · Connectoren für Nicht-ActivityPub-Systeme (`server/connectors/`) · CivicTech-Integrationen wie Decidim oder Consul Democracy (`server/integrations/`) · Erweiterungen mit Manifest (`server/extensions/`).
- Core klein halten. Reihenfolge: **wiederverwenden → integrieren → föderieren → erst dann selbst entwickeln**.
- Internes Modell zuerst; kein Anbieter bestimmt das Datenmodell. Pro Objekt eine kanonische Quelle; Herkunft (Anbieter, externe ID, Original-URL) bleibt sichtbar.
- Anbindungen zuerst nur lesend; Rückschreiben braucht einen eigenen Rechte- und Konfliktentscheid. Kein versteckter Sync, kein Crawler, kein offener Proxy, kein Tracking. Keine Integration erweitert lokale Rechte.
- Föderation ist kontrolliert offen: Instanz- und Space-Regeln, die restriktivere gewinnt; Teilnehmerlisten werden nie föderiert. „Integriert“ heißt erst nach einem Ende-zu-Ende-Test gegen eine echte Gegenstelle.
- Externe ausführbare Plugins bleiben gesperrt, bis Herkunftsprüfung, Isolation, Capability-Durchsetzung und ein Update-/Rollback-Weg existieren.

## 4. Sicherheit, Privacy und Lieferkette (Release-Blocker)

Quellen: `PERMISSIONS-v0.8.9.md`, `PRIVACY-DATA-LIFECYCLE-P0.5.md`, `ACTIVITYPUB-USER-PRIVACY-P0.5.md`, `MODERATION-SAFETY-v0.9.md`, sowie mit PR #20 `SECURITY-UPDATE-AND-RECOVERY.md` und `RETROFIT-REVIEW-2026-10-20.md`.

- Least Privilege und Default Deny: Sichtbarkeit und Aktionsrecht serverseitig auf dem aktuellen Objekt im konkreten Space-Kontext prüfen. UI-Ausblenden ist nur UX. Ein bekannter Bezeichner oder Medienlink ist keine Berechtigung.
- Rechte sind aktionsbezogen (Profil bearbeiten ≠ Zugang konfigurieren ≠ Mitglieder zulassen ≠ extern veröffentlichen). Nutzerfunktionen und Administration bleiben getrennt.
- Fehlendes Recht für Beteiligte → 403; Außenstehende → 404 ohne Sichtbarkeitsleck, einheitlich für Detail, Listen, Suche, Feeds, Verknüpfungen, Medien und Export.
- Space-Sichtbarkeit, persönliche Föderationsfreigabe (Opt-in, Standard aus) und Objektveröffentlichung sind getrennt. Geschlossene Spaces veröffentlichen nur ausdrücklich freigegebene Inhalte; keine impliziten privaten Antworten, Profile oder Mitgliederlisten. Remote-Eingaben sind nicht vertrauenswürdig (Signaturen, SSRF-Schutz, Limits, fail-closed).
- Export und Kontolöschung folgen der Löschmatrix; Inhalte anderer Personen werden nicht mitgelöscht. Moderation trennt Melden, Prüfen und Maßnahme.
- Nutzerinhalte im Frontend immer über `esc()`/`escAttr()` ausgeben.
- Bestehende Bibliotheken und Standards nutzen; keine eigene Identitäts-, Rollen-, Kryptografie- oder Update-Vertrauenslogik erfinden.
- Abhängigkeiten und GitHub Actions exakt pinnen; Lockfile führend. Installation mit `npm ci --ignore-scripts`, danach Registry-Signaturen und Audits prüfen (ab PR #20). `ignore-scripts` nicht global aufheben, nie `npm audit fix --force`. Updates nur nach Prüfung von Herkunft und Diff und mit menschlicher Freigabe; ein kompromittierter offizieller Kanal ist Teil des Bedrohungsmodells.
- Keine Tokens, Kennwörter, personenbezogenen Daten oder vertraulichen Logs committen.

## 5. Arbeitsweise

- `main` nicht direkt ändern. Ein thematisch abgegrenzter Branch und ein Pull Request pro fachlich zusammenhängender Änderung; Merge und Release nur mit menschlicher Freigabe.
- Vor jeder Änderung: aktuellen `main`-Commit, offene PRs und betroffene Dateien prüfen. Dateien, die ein offener PR bereits ändert, nicht parallel in einem zweiten PR ändern, ohne das im Projektregister abzustimmen.
- Vor jeder Änderung benennen: erwartetes Nutzerverhalten, betroffene Space-Typen, Ansichten, Geräte, Rechte-, Privacy- und Föderationsgrenzen, Teststrategie. Fachbegriffe für die projektverantwortliche Person kurz erklären.
- Klein ändern, keine Überschreibung ganzer Dateien, keine unaufgeforderten Refactorings, Versionssprünge oder Massenformatierungen. Ausnahme: Ein berührter Codepfad darf im selben PR verhaltensgleich modernisiert werden, wenn das im PR benannt und getestet ist (siehe §7).
- Rollen, Ablauf und PR-Vorlage: `docs/AI-COLLABORATION.md`. Entscheidungen und Arbeitsschritte: `docs/PROJECT-REGISTER.md` (anhängen, nicht umschreiben).

## 6. Tests und Freigabe

Quellen: `QA-RELEASE-PROCESS.md`, `QA-FAST-FULL.md`, `GOLD-STANDARD-BROWSER-QA-P0.16.0-QA2.md`.

- **Produktfehler zuerst rot reproduzieren**, dann minimal korrigieren, dann grün, dann alle betroffenen Gates. Tritt ein Fehler nur in einer bestimmten Umgebung auf (z. B. nur in der Linux-CI), ersetzt ein gesichertes CI-Artefakt (Screenshot, Trace) den lokalen Rot-Nachweis.
- Jede Störung einordnen: Produkt-, Test-, Umgebungsfehler oder geteilte Ursache, mit Beleg. Eine Testkorrektur darf kein echtes Nutzerproblem verdecken.
- Ehrliche QA: keine Retries, `force`-Klicks, pauschalen Wartezeiten, erhöhten Timeouts, Login-/API-Bypässe oder gelockerten Limits. Bereitschaft am sichtbaren UI-Zustand messen, nicht an HTTP 200.
- **Robuste statt starrer Tests:**
  - Neue Prüfungen testen beobachtbare Wirkung (HTTP-Status, Daten, gespeicherter Zustand, sichtbares Ergebnis). Keine neuen Zeichenkettenprüfungen am Quelltext (`app.includes('…')`), außer für anders nicht prüfbare Invarianten, dann mit Begründung.
  - Browser-Tests bedienen wie ein Mensch: Rolle und zugänglicher Name, sichtbarer Titel oder ausdrücklich als Testvertrag gedachte `data-*`-Attribute; nicht Kartenmitte, CSS-Klassen, DOM-Position oder starre Tabnamen. Karten öffnen über `openCardByTitle` (`tests/helpers/app.js`, ab PR #20).
  - Ist ein roter Test an die Umsetzung gekoppelt, wird er auf Verhalten umgeschrieben statt den neuen Wortlaut nachzutragen. Blockiert ein Zeichenketten-Preflight eine verhaltensgleiche Änderung, wird diese Prüfung im selben PR durch eine Verhaltensprüfung ersetzt.
  - Flexibler heißt nie schwächer: Sicherheits-, Privacy- und Rechteaussagen bleiben mindestens gleich streng. Ein gelockerter Test braucht eine Gegenprobe, die zeigt, dass er noch anschlägt.
- Desktop- und Mobile-Annahmen nie in einem Test mischen. Rechte-/Privacy-Änderungen brauchen einen serverseitigen Negativtest; neue Ansichten einen Smoke- oder Layout-Test.
- Gates vor einem Merge: Lieferkette und Audits, `preflight`, `qa:security`, `qa:smoke`, `qa:layout`, `qa:accessibility`, `qa:gold` auf dem exakten PR-Head. Werden mehrere PRs nacheinander gemergt, laufen die Gates danach einmal auf dem neuen `main`.
- Nicht Ausgeführtes ausdrücklich als **nicht ausgeführt** kennzeichnen. Ohne echten Chromium-Lauf auf Desktop und Mobile keine Freigabe. Ein grüner Prototyp-Goldlauf ist keine Produktions-, DSGVO- oder WCAG-Freigabe.

## 7. Menschliche Übernahme (verbindliches Architekturziel)

PartiUp muss jederzeit von einem qualifizierten menschlichen Team ohne ChatGPT, Claude oder historische Chats weiterentwickelt werden können. Wartbarkeit, Sicherheit und Betriebsfähigkeit sind Qualitätsanforderungen (Orientierung: ISO/IEC 25010, NIST SSDF, OWASP ASVS; Konformität nie ohne Audit behaupten).

- Verantwortungsgrenzen anstreben: Routen, Anwendungsdienste, Fachregeln und Berechtigungen, Datenzugriff, Infrastruktur und Föderation getrennt. `server/server.js` und `server/db.js` **schrittweise und verhaltensgleich** abbauen, keine Komplettneuschreibung.
- Neu extrahierte Fachlogik hängt nicht vom SQLite-Treiber ab; Datenzugriff hinter dokumentierte Repository-/Adapter-Verträge. Ein Datenbankwechsel ist erst vorbereitet, wenn ein zweiter Adapter dieselben Vertragstests besteht.
- Neue Module dokumentieren Schnittstellen, Datenflüsse, Verantwortliche, Fehlerfälle und Tests. Neue Funktionen koppeln sich nach Möglichkeit nicht weiter an die Monolithen.
- Wartbarkeitsaufgaben sind erst erledigt, wenn ein produktiv genutzter Codepfad umgestellt ist und Regressionstests bestehen; Markdown, leere Verzeichnisse oder ungenutzte Abstraktionen zählen nicht.
- Reihenfolge, Abnahmekriterien und Fortschritt: `docs/HUMAN-HANDOVER-ROADMAP.md`. Die Priorität gegenüber Sicherheit, Föderations-PoC und MVP regelt das Projektregister.

## 8. Übergabe

Jeder PR beschreibt nach der Vorlage in `docs/AI-COLLABORATION.md`: Ziel, Ausgangsstand (Branch/Commit), Änderungen, betroffene Bereiche, Security-/Privacy-/Föderationswirkung, ausgeführte Tests mit Ergebnis und Umgebung, nicht ausgeführte Prüfungen, Risiken, offene Punkte und notwendige Freigaben.
