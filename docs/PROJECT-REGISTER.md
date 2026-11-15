# PartiUp – Projektregister, Kompass-Index und Arbeitsprotokoll

Stand: 2026-10-26 · **Index, keine neue fachliche Master-Spezifikation.**

## Zweck und Quellenhierarchie
Dieses Register verhindert Kontextverlust bei Übergaben zwischen Menschen und KI-Agenten. Es soll die bereits ausgearbeiteten Projektkompasse und Fachverträge **referenzieren statt ersetzen**.
- **Implementierungsstand:** aktueller GitHub-Branch/Commit und Quellcode.
- **Verbindliche Fach- und Qualitätsregeln:** vorhandene Architektur-, Safety-/Privacy-, QA- und Projektentscheidungsdokumente; bei Widersprüchen Entscheidung ausdrücklich klären.
- **Geplanter Umfang:** freigegebene Aufgaben/Entscheidungen; Absicht nicht mit Implementierung verwechseln.
- **Historie:** bestehende Changelogs und retrospektive Analysen; ein Changelog beweist keinen erfolgreichen Browsertest.

## Bestätigter Bestand auf `main` bei Anlage
- `package.json`: Projektversion `0.16.28`, Node.js/Express, SQLite (`better-sqlite3`), Playwright.
- Ausgangs-Commit dieses Dokumentationsbranches: `f185fcb404a4de80ce1139123d1b30dcaf6e0a90`.
- Vorhanden: `PARTIUP-P0.1-ARCHITECTURE.md`, `COMMUNITY-SPACES.md`, `PARTICIPATION-MODEL.md`, `SPACE-MODULES-AND-AGGREGATION.md`, `QA-RELEASE-PROCESS.md`, `P0.16.0-BIS-P0.16.20-RETROSPEKTIVE.md`, `P0.16.23-GOLD-RELEASE.md` sowie diverse Security-, Privacy- und Federation-Dokumente.
- Offene Sicherheitsarbeit: [PR #20](https://github.com/BammBammoriginal/PartiUp/pull/20) (Draft am 2026-10-20; vor Änderungen aktuellen Status neu prüfen).
- Ein separat als zusammengeführter „Projektkompass“ benanntes Dokument ist **auf diesem `main`-Stand nicht identifiziert**. Vor einer Konsolidierung andere Branches/PRs und die Originaldokumente prüfen. Nichts als vollständig integriert bezeichnen, solange diese Prüfung fehlt.

## Fachlicher Orientierungspunkt (aus existierender Projektdokumentation)
PartiUp verknüpft Menschen, Orte, Themen, Communities, Veranstaltungen, Projekte und Beteiligungsräume über gemeinsame Identitäts-, Sichtbarkeits-, Beziehungs- und Space-Regeln. Datenschutz, serverseitige Berechtigungen, nachvollziehbare Herkunft und sichere Föderationsgrenzen sind Grundanforderungen. Welche Integrationen real laufen, ist im Code gesondert nachzuweisen.

## Laufendes Arbeitsprotokoll
Neue Einträge **anhängen**, nicht ältere umschreiben. Format:
```
### YYYY-MM-DD – Kurztitel
- Verantwortlich / Agent:
- Issue / PR / Branch / Commit:
- Anlass und Entscheidung:
- Geänderter fachlicher oder technischer Bereich:
- Nachweis: Tests (ausgeführt / nicht ausgeführt), Ergebnis:
- Risiken, offene Fragen und nächster Schritt:
- Referenz auf ausführliche Entscheidung/Datei:
```

### 2026-10-26 – Zusammenarbeit zweier KIs vorbereitet
- Verantwortlich / Agent: ChatGPT, auf Nutzerauftrag.
- Branch: `docs/ai-collaboration-2026-10-26`; Ausgangsstand `main` `f185fcb404a4de80ce1139123d1b30dcaf6e0a90`.
- Entscheidungsvorschlag: Claude Code primär für Umsetzung, ChatGPT/Work für Planung, Review und bei Bedarf eigene Änderungen; keine zusätzliche Codex-Pflicht.
- Umfang: Arbeitsanweisungen und Dokumentationsindex; kein Produktcode.
- Tests: noch keine Laufzeit-, Security- oder Browsertests ausgeführt, da ausschließlich Markdown-Dateien angelegt werden.
- Offene Frage: ursprünglichen zusammengeführten Projektkompass aus Chats/anderen Branches identifizieren und anschließend referenzieren, nicht still ersetzen.

### 2026-10-20 – Einarbeitung Claude Code, CLAUDE.md und Projektkompass
- Verantwortlich / Agent: Claude Code, auf Nutzerauftrag.
- PR: #21 (`docs/claude-md`, gemergt 2026-10-26); Kommentare und Commits auf #20.
- Anlass und Entscheidung: Einarbeitung, Installation, Testlauf; Regeln aus den verstreuten Dokumenten in `CLAUDE.md` gebündelt. Projektkompass erstellt und mit der ChatGPT-Übergabe „PartiUp – Projektkompass und technische Übergabe“ (Stand 2026-10-20) abgeglichen.
- Nachweis: `main` `f185fcb` lokal (Windows, Node 24): preflight, qa:security, qa:gold 39/39 grün; qa:smoke, qa:layout, qa:accessibility mit bekannten Fehlschlägen.
- Antwort auf die offene Frage oben: Der zusammengeführte Kompass existiert als ChatGPT-Übergabedokument (vom Projektverantwortlichen bereitgestellt) und als Claude-Kompass v2 (privates claude.ai-Artifact). **Keiner von beiden liegt im Repository.** Vorschlag: als `docs/PROJEKTKOMPASS.md` aufnehmen, Freigabe offen.

### 2026-10-26 – PR #20 grün, Sicherheitsupdates, Merge-Serie auf `main`
- Verantwortlich / Agent: Claude Code, auf Nutzerauftrag.
- PR: #20, Commits `efd0585`, `1fe4409`, `1d9aba1`, `358e390`; danach Abgleich mit `main` (`747a539`).
- Inhalt: starre Kartenklick-Tests auf Titelklick umgestellt (Beleg: CI-Screenshot, Klick traf Themen-Chip); mobiler Layout-Test prüft Teilnahme-Aktionen ≥ 40 px, übrige Buttons ≥ 24 px, scrollbare Tab-Leisten korrekt; body-parser 1.20.9 und multer 2.5.0 (GHSA-27r3-jxmh-p828, GHSA-q7qp-rjg7-q26m, beide high).
- Nachweis: GitHub-CI Run 40306591134 auf `358e390` grün (Audits 0, Smoke, Layout, Accessibility, Gold 45/45).
- Merge-Serie auf `main` am 2026-10-26 (#21, #16, #13, #17, #19, #18): kombinierter Stand `747a539` lokal nachgetestet. preflight, qa:security, qa:gold 43/43 grün; `audit:prod` 3 × high (body-parser, multer, sharp), smoke/layout/accessibility mit den bekannten, in #20 behobenen Fehlern.
- Offen: Gold-Test „Benachrichtigung lesen aktualisiert Liste und Zähler“ auf #20 sporadisch rot (lokal 2 von 8), Ursache nicht belegt.

### 2026-10-26 – Regeldateien zusammengeführt
- Verantwortlich / Agent: Claude Code, auf Nutzerauftrag („alle Regeln sinnvoll zusammenführen, Widersprüche aufzeigen und Lösungen skizzieren“).
- PR: #22 (`docs/ai-collaboration-2026-10-26`), mit `main` abgeglichen.
- Ergebnis: `AGENTS.md` ist die eine Regelquelle für alle (zusammengeführt aus #22, der `AGENTS.md` aus #20 und `CLAUDE.md` aus #21); `CLAUDE.md` bindet sie per `@AGENTS.md` ein und enthält nur Claude-Spezifisches und Praxis. `AGENTS.md` wird aus #20 entfernt, damit die PRs keine Datei mehr gemeinsam anlegen.
- Tests: keine Laufzeittests nötig (nur Markdown); `preflight` auf dem Branch ausgeführt, siehe PR.

## Entscheidungen der projektverantwortlichen Person
Nur ausdrücklich getroffene Entscheidungen mit Datum. Weitere Entscheidungen aus früheren Chats gelten bis zur Bestätigung als „zu bestätigen“.

| Datum | Entscheidung | Status |
|---|---|---|
| 2026-10-20 | Zielgruppe sind Menschen ohne Technikkenntnisse; UI/UX, Zugänglichkeit und Erklärbarkeit haben Vorrang | V |
| 2026-10-20 | Schlanker Core, Erweiterbarkeit, Föderation und Anbindbarkeit in alle Richtungen (CivicTech/GovTech) sind tragende Säule | V |
| 2026-10-20 | Tests prüfen Verhalten statt Quelltext-Zeichenketten und passen sich verhaltensgleichen Änderungen an | V |
| 2026-10-20 | Zielgruppen- und UX-Vorgabe gehört in die werkzeugübergreifende `AGENTS.md` | V |
| 2026-10-26 | Meta-Aktionen („Melden“, „Info“, „Einstellungen“) gut sichtbar, aber klein und unauffällig | V |
| 2026-10-26 | body-parser 1.20.9 und multer 2.5.0 werden in PR #20 eingespielt | V |
| 2026-10-26 | Alle Regeln werden zusammengeführt | V |
| 2026-10-26 | Ausführliche `CLAUDE.md` aus #21 bleibt erhalten (über ChatGPT-Prüfung weitergegeben) | V |
| 2026-10-26 | Neue oder verkürzte Regeln heben bestehende nicht auf, außer bei fachlicher Entwicklung oder Sicherheitsrelevanz mit ausdrücklicher Anweisung; Kollisionen werden benannt und entschieden | V |
| 2026-10-26 | Mastodon-/ActivityPub-Semantik vor Eigenlogik; Beitragssichtbarkeit nach Mastodon (Public, Quiet public, Followers, Private mention); Spaces als zusätzliche restriktivere Policy-Ebene; Prüfkette Space → Rolle → Beitrag → Adressierung → Zustellung | V |
| 2026-10-26 | W3: Sicherheit, PoC und MVP vor Modernisierung; Bestandsaufnahme parallel · W6: Ausnahme für #20, künftig Bündelung prüfen, riskante Änderungen getrennt · W8: CI nach Merge auf `main` und für gestapelte PRs | V |
| 2026-10-26 | K2: zwei Schlüssel für externe Veröffentlichung (Autor + `content.publish_external` in nichtöffentlichen Spaces) · K5: vorerst akzeptiert, vor Pilot zwingend · K7: Quiet public umsetzen | V |
| 2026-10-26 | Node.js-Security-Releases vom 20./21.10. übernehmen (24.22.1 bzw. 22.23.4), exakter Patchstand, kein blindes Major-Upgrade | V |
| 2026-10-26 | Secrets, CI/CD, Artefakte, Least Privilege (inkl. KI-Agenten), Endpunkt-Matrix, Logout/Sitzungen, Security-Regressionstests, Privacy-Boundary-Matrix verbindlich; keine Funktionsausweitung bei Security-Arbeit | V |
| 2026-10-20 | Aus ChatGPT-Übergabe: Leitsätze „Mehr Raum für uns“, „Social Media kann auch sozial sein“; Namensalternative „Plura“; Drupal nur headless für Redaktionsinhalte, Open Social kein zweiter Core (ADR in PR #6 geschlossen, nicht gemergt) | zu bestätigen |

## Widersprüche zwischen den bisherigen Regelquellen (2026-10-26)
Gefunden beim Zusammenführen von #20, #21 und #22. „Lösung“ ist in `AGENTS.md`/`CLAUDE.md` umgesetzt, sofern nicht „Freigabe offen“ steht.

| Nr. | Widerspruch | Lösung |
|---|---|---|
| W1 | Installation: `CLAUDE.md` (#21) empfahl Node 22, `npm ci` und bei Problemen `npm rebuild better-sqlite3`; #20 verlangt Node 24, `npm ci --ignore-scripts` und keine Installationsskripte. | Regel nach #20; Rebuild-Hinweis entfernt, stattdessen `deps:build`. Bis zum Merge von #20 läuft `main` noch mit Node 22. |
| W2 | Rollen: #22 erlaubt ChatGPT ebenfalls Codeänderungen, ohne Absprache-Regel. Folge: drei PRs legten dieselben Regeldateien an. | Pro Branch zur selben Zeit nur ein Agent, Übernahme im PR vermerken, Regeldateien nur in einem Docs-PR (`docs/AI-COLLABORATION.md`). |
| W3 | Priorität: `HUMAN-HANDOVER-ROADMAP.md` und #22-`CLAUDE.md` nennen die Modernisierung einen aktiven Auftrag „beginne mit Etappe 1“; Kompass und #22-`AGENTS.md` setzen Sicherheit, PoC und MVP zuerst und verbieten unaufgeforderte Refactorings. | Vorschlag: Sicherheit (#20) zuerst, Etappe 1 als reine Bestandsaufnahme parallel, ab Etappe 2 bevorzugt Codepfade, die PoC oder MVP ohnehin anfassen. **Freigabe offen.** |
| W4 | Rot-zuerst: Retrospektive verlangt zwingend einen roten Test vor dem Fix, #22 nur „nach Möglichkeit“. | Zwingend für Produktfehler; bei umgebungsspezifischen Fehlern ersetzt ein CI-Artefakt den lokalen Rot-Nachweis. |
| W5 | „Keine neuen Zeichenkettenprüfungen“ gegenüber rund 1.000 bestehenden; einzelne Preflights prüfen sogar den Wortlaut der Testdateien und können so Testverbesserungen blockieren. | Blockiert ein solcher Preflight eine verhaltensgleiche Änderung, wird die Prüfung im selben PR auf Verhalten umgestellt; sonst schrittweiser Abbau. |
| W6 | „Eine Änderung pro PR“ gegenüber #20 (Sicherheits-Retrofit über viele Dateien, dazu Tests und Abhängigkeiten). | Einmalige, ausdrücklich gebilligte Ausnahme; künftige Retrofits werden aufgeteilt. **Bestätigung offen.** |
| W7 | Quellenhierarchie: #22 erkennt Chats nicht als Nachweis an, die ChatGPT-Übergabe führt Chat-Entscheidungen als verbindlich. | Verbindlich erst mit Eintrag in diesem Register; Chat-Entscheidungen stehen oben als „zu bestätigen“. |
| W8 | Gates: #22 und #21 setzten Tests pro PR voraus, aber die CI läuft nicht nach Merges auf `main`; am 2026-10-26 wurden sechs PRs ohne gemeinsamen Nachtest gemergt. | Nach einer Merge-Serie Gates einmal auf `main`. Vorschlag zusätzlich: Workflow auch bei `push` auf `main` ausführen und in den Branch-Schutzregeln „Branch muss aktuell sein“ aktivieren. **Freigabe offen.** |
| W9 | Layout-Test verlangte 40 px für alle Buttons; Entscheidung vom 2026-10-26: Meta-Aktionen klein. | Primäre Aktionen ≥ 40 px, alle übrigen ≥ 24 px (WCAG 2.2); umgesetzt in #20. |
| W10 | `CLAUDE.md` (#21) enthielt zeitgebundene Statusangaben, die schnell veralten. | Status steht nur noch in diesem Register. |
| W11 | Die erste Zusammenführung kürzte die ausführliche `CLAUDE.md` aus #21 und verlagerte Inhalte nach `AGENTS.md`; dabei gingen Details verloren. Vorgabe des Projektverantwortlichen: die ausführliche `CLAUDE.md` bleibt erhalten. | Ausführliche `CLAUDE.md` wiederhergestellt und nur ergänzt; `AGENTS.md` um die fehlenden Details vervollständigt. Beide enthalten dieselben Regeln (CLAUDE.md ausführlicher). Jede Regeländerung im selben PR in beiden Dateien; Review prüft Gleichlauf. |

### 2026-10-26 – Korrektur: ausführliche CLAUDE.md erhalten, Stand abgeglichen
- Verantwortlich / Agent: Claude Code, auf Nutzerauftrag (Abgleich nach Prüfung durch ChatGPT).
- PR: #22.
- Anlass und Entscheidung: Die ausführliche `CLAUDE.md` aus #21 darf nicht durch eine Kurzfassung ersetzt werden (W11). Wiederhergestellt; ergänzt um Rolle, Grenzen und Modernisierungsauftrag aus #22, die Entscheidungen vom 26.10. sowie W1 (Installation) und W10 (Status ins Register). Zeilenvergleich gegen `main`: Jede nicht wörtlich übernommene Zeile ist erweitert oder bewusst nach W1/W10 geändert.
- Menschliche Übernahme, Modularisierung und Entkopplung von SQLite sind in `AGENTS.md` §7, `CLAUDE.md` und `docs/HUMAN-HANDOVER-ROADMAP.md` verbindlich dokumentiert.
- Tests: nur Markdown; `npm run preflight` auf dem Branch.

## Stand 2026-10-26 (aus `CLAUDE.md` verlagert und aktualisiert)
- **`main`** `747a539`, Version 0.16.28. Lokal kombiniert nachgetestet: preflight, qa:security, qa:gold 43/43 grün; `audit:prod` 3 × high (in #20 behoben); smoke, layout, accessibility mit bekannten, in #20 behobenen Fehlern.
- **Offene PRs:** #20 Sicherheits-Retrofit (enthält Node 24, `npm ci --ignore-scripts`, Signaturen, `RETROFIT-REVIEW-2026-10-20.md`, `SECURITY-UPDATE-AND-RECOVERY.md`); #22 Regeldateien und Register; #8, #9, #10 Entwürfe vom 28.09. (Bewertung siehe unten).
- **Föderation und Anbindungen (Stand seit 2026-10-20 unverändert):** ActivityPub ist umgesetzt, aber noch nicht mit echten Instanzen über eine eigene HTTPS-Domain gegengetestet. Verfügbare Erweiterung: `partiup.resources`. Connectoren (RSS/Atom, ATProto) und Integrationen (Decidim, Consul Democracy, WeChange, Demokratiedaten) sind als `planned_adapter` katalogisiert; das Framework steht, Adapter fehlen. Nicht als fertig ausgeben.
- **ADR-0001** (Drupal headless nur für Redaktionsinhalte, Open Social kein zweiter Core, „wiederverwenden → integrieren → föderieren → selbst entwickeln“): Entwurf auf Branch `docs/content-boundary-drupal-hybrid`, PR #6 geschlossen, nicht gemergt.
- **Entwürfe #8–#10:** #9 (Reaktionen) durch #16, #10 (Chat-Editor) durch #14 und die Lese-/Schreibbudgets auf `main` überholt; nur die sichtbare Fehlermeldung im Chatdialog aus #10 fehlt. #8 (gemeinsame Ortsnavigation, Personen ohne freigegebenen Ort auffindbar) ist nicht auf `main`, basiert auf einem Stand vor zehn Merges und bestand zuletzt 28/35 Browserfälle. Empfehlung: #9 und #10 schließen, #8 auf aktuellem `main` neu aufsetzen. Freigabe offen.
- **GitHub-Schutz:** `main` ist **nicht geschützt**; Branch-Schutz und Rulesets sind für das private Repository im aktuellen Tarif gesperrt (API: 403, „Upgrade to GitHub Pro“). KI-Agenten arbeiten derzeit mit dem persönlichen Owner-Token (`repo`, `workflow`). Siehe K5.
- **Node.js:** lokale Entwicklungsumgebung 24.20.0 (unter dem Security-Stand 24.22.1); CI `node-version: '24'` ohne festen Patchstand. Siehe K4.
- **Keine WebSockets/SSE:** Chats laufen über normale HTTP-Anfragen; Logout-Prüfungen betreffen diese Anfragen.
- **Issue #23 (Architektur-Etappe 1):** offen, noch nicht begonnen. Vorhandene Teilergebnisse: Dateigrößen und Struktur (diese Datei, `CLAUDE.md`), PR-Lage und Teststand (oben). Fehlend: Abhängigkeitskarte, SQLite-Zugriffe und Migrationspunkte, Vorschlag für einen risikoarmen vertikalen Schnitt, Baseline-Metriken.

## Kollisionen der Vorgaben vom 2026-10-26 (Mastodon, Supply Chain, Least Privilege) mit bestehenden Regeln und dem Ist-Stand
Nach der Vorrangregel wird keine restriktivere Regel eigenmächtig abgeschwächt. „Vorschlag“ heißt: Freigabe offen.

| Nr. | Kollision | Lösungsvorschlag |
|---|---|---|
| K1 | Begriff „unlisted“: Bei Spaces bedeutet er „nicht gelistet und nicht föderiert“; bei Mastodon hieß „Unlisted“ das heutige „Quiet public“, das föderiert wird. Gleicher Begriff, gegensätzliche Wirkung. | Space-Semantik unverändert lassen (restriktiver). Intern den Wert behalten, in Oberfläche, Doku und Föderationsabbildung nie „unlisted“ für Spaces verwenden; für Beiträge ausschließlich die Mastodon-Begriffe. |
| K2 | Alte Regel P0.4: „Nichtöffentliche Spaces können nicht föderieren.“ Code seit P0.16.24 (`federationDecisionForPost`): ausdrückliche Freigabe einzelner Beiträge aus nichtöffentlichen Spaces im Modus `selected`. Neue Vorgabe erlaubt das ausdrücklich, aber nur mit erlaubender Space-Policy **und berechtigter Rolle**. | Neue Vorgabe ist die jüngere, ausdrückliche Entscheidung und deckt den Code. Offen und zu prüfen: ob das Setzen von `federation_state='enabled'` an eine eigene Veröffentlichungsberechtigung gebunden ist (PR #20 hat das für Veranstaltungen getrennt). Bis dahin P0.4 als „ersetzt durch Entscheidung 2026-10-26“ markieren. |
| K3 | Mastodon-Sichtbarkeit „Followers“ und „Private mention“ werden bei Mastodon an entfernte Empfänger zugestellt. Bestehende Regel: Private Inhalte und Mitgliederlisten gehen nie automatisch nach außen; föderiert wird nur Public. | Restriktiv bleiben: Inhalte in Spaces werden weiterhin nur als Public bzw. künftig Quiet public föderiert. Followers/Private mention bleiben intern abgebildet und werden **nicht** föderiert, bis für persönliche (spacefreie) Beiträge ein eigenes Opt-in mit Test der Adressierung entschieden ist. |
| K4 | Neue Vorgabe „exakter, abgesicherter Node-Patchstand, keine `latest`-Tags“ gegen CI `node-version: '24'` (immer die neueste 24er) und `engines: >=24 <25`. Lokal 24.20.0 (verwundbar). | CI auf `24.22.1` pinnen, `engines` auf `>=24.22.1 <25`, `.nvmrc` mit `24.22.1`. Lokal Node 24.22.1 installieren (Systemänderung, nur durch dich). Umsetzung als eigener Commit in PR #20, weil dort Node 24 eingeführt wird. |
| K5 | Neue Vorgabe „keine Owner-Tokens für Automatisierung, Schutzmechanismen nicht durch Agentenkonten abschaltbar, Codeänderung und Freigabe getrennt“ gegen Ist-Stand: Agenten nutzen den Owner-Token mit `repo`/`workflow`; `main` ungeschützt; Branch-Schutz im Tarif nicht verfügbar. | (a) GitHub Pro (oder Team) aktivieren, damit Branch-Schutz/Rulesets für `main` und Workflow-Dateien greifen: Pflicht-Review, Pflicht-Checks, kein Force-Push, Admins eingeschlossen. (b) Für Claude Code einen eigenen fine-grained Token nur für dieses Repository (Contents und Pull Requests: write; kein Admin, kein `workflow`). (c) Workflow-Änderungen nur per PR mit menschlicher Prüfung. Alternative „Repository öffentlich machen“ kollidiert mit der Entscheidung, privat zu bleiben. Entscheidung und Kosten bei dir. |
| K6 | Signierte Pakete sind verbindlich, aber GitHub-Attestationen für private Repositories setzen laut Hersteller Enterprise Cloud voraus (bekannt aus `RETROFIT-REVIEW-2026-10-20.md`). | Anforderung bleibt; bis zur geklärten Signierfähigkeit keine externe Verteilung (bestehende Regel). Alternativen (Sigstore/cosign mit eigener Identität) gesondert bewerten. |
| K7 | Neue Vorgabe „keine Funktionsausweitung“ gegen die Mastodon-Stufe „Quiet public“, die es in PartiUp noch nicht gibt. | Quiet public ist eine Adressierungsvariante (`to`: Follower, `cc`: Public) und senkt die Reichweite gegenüber dem heutigen „immer Public“. Vorschlag: als minimale, kompatibilitätsbedingte Ergänzung zulassen, zuerst nur als Option für ausdrücklich freigegebene Beiträge aus geschlossenen Spaces. Freigabe offen. |
| K8 | Neue Vorgabe „Testmatrix inkl. Mastodon-Nutzer empfängt Beitrag“ gegen bestehende Regel „keine Angriffstests gegen fremde Instanzen“ und den fehlenden Föderations-PoC. | Lokal: Zustellung gegen einen Test-Inbox-Stub prüfen (Adressierung, Signatur, kein privater Inhalt). Echte Mastodon-Empfangstests erst im PoC (P2) mit eigener Testinstanz. |
| K9 | Bisherige Arbeitsweise dieses Agenten (Push auf PR-Branches, PR-Kommentare mit Owner-Token) gegen „Agent darf nicht zugleich ändern und freigeben“. | Bisher eingehalten: kein Push auf `main`, kein Merge. Technisch aber nicht verhindert; wird mit K5 abgesichert. |

### 2026-10-26 – Entscheidungen zu K2, K5, K7
- Verantwortlich / Agent: Projektverantwortlicher (Entscheidung), Claude Code (Umsetzung).
- **K2 entschieden und umgesetzt (PR #25, gestapelt auf #20):** Veröffentlichen nach außen braucht zwei Schlüssel wie Ankündigungsrechte auf anderen Plattformen: die Autorin bzw. den Autor des Beitrags und in nichtöffentlichen Spaces das neue Recht `content.publish_external` (Standard: Owner, Admin; per Override vergebbar). Einschränken bleibt Autor und Administration erlaubt. Das Recht wird bei jeder Föderationsentscheidung neu geprüft (Rollenwechsel, Austritt). Regel P0.4 „nichtöffentliche Spaces föderieren nie“ ist damit durch die Entscheidung vom 2026-10-26 ersetzt. Befund vorher: jedes Mitglied konnte Beiträge aus geschlossenen Spaces (Modus „selected“) öffentlich föderieren.
- **K5 vorerst akzeptiert:** Branch-Schutz ist im aktuellen Tarif nicht verfügbar. Einschätzung: Für den Prototyp ohne Produktivbetrieb, ohne echte Nutzerdaten und ohne Produktions-Secrets vertretbar. Zwingend zu lösen vor: erstem Pilot mit echten Daten, automatischem Deployment aus `main`, signierten Releases, weiteren Personen oder Agenten mit Schreibrecht, Veröffentlichung des Repositorys. Kostenlose Zwischenmaßnahmen als Vorschlag: Sperrregeln für Claude Code (kein Push auf `main`, kein Merge, keine Workflow-Änderung ohne Rückfrage), Workflow zusätzlich bei Push auf `main` (W8), Token mit Ablaufdatum und ohne `workflow`-Recht für Agenten.
- **K7 entschieden und umgesetzt (gestapelt auf PR #25):** Quiet public nach Mastodon (`to`: Follower, `cc`: Public; Gruppen-Weitergabe und Antworten nie öffentlicher als der Beitrag). Freigegebene Beiträge aus geschlossenen Spaces sind standardmäßig still öffentlich; voll öffentlich bleibt wählbar. Die Sichtbarkeit ist nach der Veröffentlichung fest; ändern heißt zurückziehen und neu veröffentlichen.

### 2026-10-26 – Entscheidungen zu W3, W6, W8
- Verantwortlich / Agent: Projektverantwortlicher (Entscheidung), Claude Code (Umsetzung).
- **W3 entschieden:** Sicherheit und der Weg zu PoC und MVP haben Vorrang. Etappe 1 der Übergabe-Roadmap (Bestandsaufnahme, Issue #23) läuft parallel; ab Etappe 2 werden bevorzugt Codepfade modernisiert, die für PoC oder MVP ohnehin angefasst werden.
- **W6 entschieden:** PR #20 ist als Sammel-PR einmalig gebilligt. Künftig wird vor jedem PR geprüft, ob eng verwandte, risikoarme Änderungen gebündelt werden, um Aufwand und Token zu sparen. Getrennt bleiben Änderungen, die Funktionen oder Abläufe stören könnten oder manuell geprüft werden müssen. Die Grundregel bleibt bestehen.
- **W8 entschieden und umgesetzt (PR #20, Commit `8fe824a`):** CI läuft zusätzlich nach jedem Merge auf `main` und für gestapelte PRs. Der Signier-Job läuft weiterhin nur bei manuellem Start mit freigegebenem Commit.

### 2026-10-27 – Keine Tests über Tests
- Verantwortlich / Agent: Projektverantwortlicher (Entscheidung „solche Tests und Regeln für die Zukunft anpassen“), Claude Code (Umsetzung).
- Anlass: Beim Nachziehen von PR #8 blockierte eine Preflight-Prüfung, die den Klick-Selektor im Gold-Test als Text vorschrieb, den robusteren Helfer `openCardByTitle`.
- Entscheidung: Preflights legen nicht fest, wie ein Test bedient; erlaubt ist nur der Inventarschutz „Pflicht-Test existiert“. Regel in `AGENTS.md` §6 und `CLAUDE.md`.
- Bestand am 2026-10-27 (Preflights, die Testdateien als Text lesen; Zahl der Zeichenkettenprüfungen in der Datei): `gold-standard-browser-preflight.js` 60, `chat-image-preview-preflight.js` 16, `privacy-data-lifecycle-preflight.js` 15, `qa-static-preflight.js` 13, `security-integration-preflight.js` 10, `sidebar-scope-preflight.js` 8, `mobile-nav-qa-preflight.js` 6. Abbau schrittweise; Sicherheits- und Privacy-Aussagen bleiben dabei mindestens gleich streng.

### 2026-10-27 – Endpunkt-Prüfung: empfangene Fediverse-Beiträge
- Verantwortlich / Agent: Claude Code (Prüfung und Umsetzung), Freigabe offen.
- Geprüft wurden die ohne Anmeldung erreichbaren Routen: WebFinger, ActivityPub-Akteure, Outboxen, Follower-Listen und Objekte, Diagnose, Governance, Kataloge, Detailansichten, Profil-Aktivität, Erweiterungen, Föderationsstatus, Medien-Proxy und Liste empfangener Fediverse-Beiträge.
- **Befund (behoben):** `/api/federation/remote-objects` und der Bild-Proxy `/api/federation-media/:id` lieferten jedem anonymen Abruf alle empfangenen Fediverse-Beiträge und Bilder, auch solche, die nur ein geschlossener Space empfangen hatte. Damit ließ sich ablesen, wem ein geschlossener Space folgt. Korrektur: Ein empfangener Beitrag wird nur gezeigt bzw. sein Bild nur ausgeliefert, wenn mindestens ein empfangender Space für die betrachtende Person sichtbar ist. Regressionstest in `tests/integration/federation-exposure.integration.js`.
- Ohne Befund: ActivityPub-Akteure nur mit Opt-in, Outboxen über die Föderationsentscheidung, Follower-Listen nur als Anzahl, Detailansichten über die Sichtbarkeitsfunktionen, Governance nur als Anzahl.
- Bewusst offen gelassen: `/api/federation/diagnostics` zeigt öffentlich technische Grenzwerte (Zeitlimits, Größen) und die eigene Basis-URL. Das braucht der Live-Selbsttest; Geheimnisse sind nicht enthalten.
- Bekannte Einschränkung: Die Liste begrenzt vor dem Filtern auf 100 Einträge und kann dadurch weniger anzeigen. Die Oberfläche nutzt die Liste nicht.
- Nächster Schritt: Prüfung von Logout, Sitzungen und Nutzerwechsel.

### 2026-10-27 – Prüfung Logout, Sitzungen und Nutzerwechsel
- Verantwortlich / Agent: Claude Code (Prüfung und Tests), Freigabe offen.
- Ist-Zustand, ohne Befund:
  - Sitzungen werden nur als SHA-256-Hash gespeichert.
  - Das Cookie ist `HttpOnly`, `SameSite=Strict` und in Produktion `Secure`.
  - Der Login erneuert Sitzung und Sicherheits-Token und löscht die vorherige Sitzung im selben Browser.
  - Der Logout löscht die Sitzung serverseitig und braucht das Sicherheits-Token.
  - Der Ablauf (7 Tage) wird serverseitig geprüft.
  - API-Antworten sind `no-store`.
  - Kontolöschung entfernt alle Sitzungen.
  - Die Oberfläche bricht beim Logout laufende Anfragen ab und leert private Ansichten (bestehender Gold-Test „Kontowechsel“).
- Neu: `tests/integration/session-lifecycle.integration.js` (39 Prüfungen, in `qa:security`). Nach Logout, nach Nutzerwechsel und nach Ablauf öffnet ein altes Cookie weder Benachrichtigungen, Chats, Einstellungen, Export, private Medien noch Schreibaktionen. Logout ohne Sicherheits-Token wird abgelehnt. Logout beendet nur das aktuelle Gerät. Gegenproben: Ohne serverseitiges Löschen beim Logout bzw. ohne Sitzungswechsel beim Login wird der Test rot.
- Beobachtungen ohne Handlungsbedarf, Entscheidung bei Bedarf:
  - (a) Ein zweiter offener Tab zeigt nach dem Logout die bereits geladenen Inhalte, bis er die nächste Anfrage stellt. Diese wird abgelehnt. Eine tabübergreifende Abmeldung wäre eine neue Funktion.
  - (b) Es gibt kein „Überall abmelden“ und keine Passwortänderung. Beides wird mit einer künftigen Konto- bzw. Sperrfunktion relevant; dann müssen alle Sitzungen der Person enden.
  - (c) `currentUserId` prüft den Kontostatus nicht selbst. Das ist heute unschädlich, weil nur die Kontolöschung den Status ändert und dabei alle Sitzungen löscht. Mit einer künftigen Sperrfunktion muss es nachgezogen werden.

### 2026-10-28 – Stabilitäts- und UX-Paket, Paket A: Beitrittsanfragen
- Verantwortlich / Agent: Projektverantwortlicher (Auftrag nach manuellem Test), Claude Code (Analyse und Umsetzung), Freigabe offen.
- Bestätigte Ursachen:
  - (1) Eine Beitrittsanfrage erzeugte keine Benachrichtigung; der Server speicherte sie nur.
  - (2) Die Entscheidung prüfte den Status nicht. „Genehmigen“ machte auch Personen ohne Anfrage zum Mitglied, zwei Admins lösten doppelte Benachrichtigungen aus, und zurückgezogene oder schon entschiedene Anfragen ließen sich erneut entscheiden.
  - (3) Es gab keinen Rückzug.
  - (4) Ein Wechsel auf „offen“ ließ wartende Anfragen liegen.
  - (5) Teilnahmeanfragen bei Veranstaltungen mit Freigabe benachrichtigten die Veranstalter ebenfalls nicht.
  - (6) Benachrichtigungen ließen sich nur als gelesen markieren und führten nirgendwohin.
- Umsetzung:
  - Zuständig ist, wer im konkreten Space das Recht `space.manage_members` hat, bei Veranstaltungen `event.manage_participants` (`scopeHolders`). Entscheidend ist die Berechtigung, nicht der Rollenname; Moderatoren erhalten die Anfrage nur, wenn ihnen das Recht übertragen wurde.
  - Eine Anfrage wird genau einmal entschieden (bedingtes Update in einer Transaktion, sonst HTTP 409).
  - Rückzug: `DELETE /api/communities/:id/join-request`, nur für eine offene Anfrage, wiederholbar ohne Wirkung, auch ohne Leserecht am Space (eine Anfrage an einen geschlossenen Space bleibt zurückziehbar).
  - In der Oberfläche öffnet „⏳ Beitritt angefragt“ ein kleines Menü mit „Beitrittsanfrage zurückziehen“ (bestehendes „•••“-Muster).
  - Antippen einer Benachrichtigung öffnet Space, Veranstaltung oder Person. Bei Beitrittsanfragen öffnet sich die Verwaltung, bei Teilnahmeanfragen die Teilnehmerliste. Der Server prüft beim Laden erneut.
- Zugangswechsel (gilt für Communities und Unterräume, beide nutzen dieselbe Logik):

  | Wechsel | Bestehende Mitglieder | Wartende Anfragen | Einladungen |
  |---|---|---|---|
  | auf Anfrage → offen | bleiben | Wer nach der neuen Regel direkt beitreten darf und ein aktives Konto hat, wird einmalig normales Mitglied und benachrichtigt. | bleiben |
  | auf Anfrage → Verifizierungsstufe | bleiben | Angenommen wird nur, wer die Mindeststufe erfüllt. Die übrigen bleiben offen. | bleiben |
  | auf Anfrage → nur Einladung | bleiben | Eingeladene werden aufgenommen. Die übrigen Anfragen bleiben zur Entscheidung offen und werden nicht still abgelehnt. | bleiben |
  | offen → auf Anfrage / Einladung | bleiben, kein rückwirkender Entzug | – | bleiben |

  Ein Wechsel der Beitrittsregel ändert weder die Sichtbarkeit noch die Föderation. Rollen über „Mitglied“ werden nie automatisch vergeben.
- Space-Ausprägungen:
  - Communities und Unterräume nutzen denselben Ablauf.
  - Veranstaltungen haben einen eigenen Teilnahmevertrag; sie erhalten nur die fehlende Benachrichtigung der Veranstalter.
  - Projekte haben keinen Beitrittsantrag.
  - Beteiligungsvorgänge haben eine Zugangsanfrage nur über die API, ohne Oberfläche. Das wurde nicht geändert und ist offen.
- Bewusst nicht geändert:
  - Eine abgelehnte Person kann erneut anfragen (bestehendes Verhalten).
  - Space-Sperren gibt es im Modell nicht; ausgeschlossen werden nur gelöschte Konten.
  - Eine bereits verschickte Anfrage-Benachrichtigung bleibt nach einem Rückzug bestehen. Die Verwaltung zeigt dann keine offene Anfrage mehr.
- Testwechsel: Der Gold-Test „Benachrichtigung lesen aktualisiert Liste und Zähler“ erwartete, dass die Liste offen bleibt. Neues, gewünschtes Verhalten: Antippen öffnet den Inhalt, und der Zähler sinkt ohne Neuladen. Dabei fiel ein echter Fehler auf und wurde behoben: Der Zähler blieb zunächst stehen.
- Nachweis:
  - `tests/integration/join-requests.integration.js` (68 Prüfungen, in `qa:security`); vor der Korrektur rot bei „Owner is told about the request“.
  - Browser-Test `join-request.gold.desktop/mobile` mit zwei Konten auf eigenem Server; gegen die Oberfläche von `main` rot.
- Verbleibende Pakete aus dem Auftrag:
  - B: Nachrichten und Zähler ohne Neuladen.
  - C: Ziele für Nachrichten- und Kommentar-Benachrichtigungen, „Mein Feed“.
  - D: „Mein Netzwerk“, gefolgte Bereiche, Autorenlinks.

### 2026-10-28 – Stabilitäts- und UX-Paket, Paket B: Live-Aktualisierung

- Bestätigte Ursache: Der Server liefert neue Nachrichten, Reaktionen und Löschungen korrekt aus. Der Client hatte aber keinen einzigen Aktualisierungsweg (kein Polling, keine Server-Events). Unterhaltungen und Glocken-Zähler wurden nur beim Seitenwechsel oder Neuladen abgefragt. Reaktionen und Löschungen bauten zudem die ganze Unterhaltung neu auf und löschten dabei einen angefangenen Text.
- Entscheidung: bedarfsgerechtes Polling statt Server-Sent Events oder WebSockets. Das passt zu Express/SQLite ohne zusätzliche Dauerverbindungen, Proxy-Einstellungen oder Zustand im Serverprozess; Rechte werden bei jeder Abfrage wie bei jedem anderen API-Aufruf geprüft.
- Umsetzung:
  - `GET /api/live` (nur angemeldet, `Cache-Control: no-store`): ungelesene Benachrichtigungen, ungelesene Nachrichten und ein undurchsichtiger Stempel (gekürzter SHA-256) über die eigenen Unterhaltungen (neue Unterhaltung, Nachricht, Löschung, Reaktion). Keine Inhalte, keine IDs, nichts über fremde Unterhaltungen.
  - Der Client fragt nur bei sichtbarem Tab: alle 5 s auf „Chats“, sonst alle 15 s, sofort beim Zurückkehren in den Tab und nach Netzwerkwiederkehr. Nur bei geändertem Stempel lädt er Liste und offene Unterhaltung nach. Die Nachrichten werden an Ort und Stelle ersetzt: Wer unten liest, bleibt unten, sonst bleibt die Position. Der Entwurf im Eingabefeld bleibt erhalten.
  - Logout, Kontowechsel oder HTTP 401 beenden das Polling; laufende Antworten eines alten Kontos werden verworfen (bestehender `accountGeneration`-Schutz).
  - Lesen einer Unterhaltung markiert auch ihre Chat-Benachrichtigungen als gelesen, damit Glocke und Chat übereinstimmen.
  - Last: eine kleine Leseabfrage pro Tab alle 5–15 s, deutlich unter dem bestehenden Lese-Limit (1.200/min je IP); kein neuer Speicher im Server.
- Space-Ausprägungen: gilt für Direkt-, Gruppen- und Kontextchats gleichermaßen (gleiche Tabellen und Routen).
- Bewusst nicht geändert: keine eigene Zähler-Plakette am Chat-Menüpunkt (neue Oberfläche, nicht verlangt); die Glocke zählt Chat-Benachrichtigungen wie bisher. Eine offene Benachrichtigungsliste aktualisiert sich nicht selbst, nur der Zähler.
- Nachweis:
  - `tests/integration/live-updates.integration.js` (21 Prüfungen, in `qa:security`): anonym 401; Stempel ändert sich bei neuer Unterhaltung, Nachricht, Reaktion, Entfernen der Reaktion und Löschung, aber nicht für Außenstehende und nicht durch eigenes Lesen; Lesen setzt Ungelesen und Chat-Benachrichtigungen zurück; nach Logout 401 auch mit kopiertem Cookie. Vor der Korrektur rot.
  - Browser-Test `live-chat.gold.desktop/mobile` mit zwei Konten auf eigenem Server und Playwright-Uhr (das Intervall wird vorgespult, nicht abgewartet): neue Unterhaltung, Nachricht, Reaktion und Löschung erscheinen ohne Neuladen, der Entwurf bleibt, die Antwort erscheint beim Gegenüber, der Glocken-Zähler steigt. Gegen den vorherigen Stand rot („neue Unterhaltung erscheint nicht“).

### 2026-10-28 – Stabilitäts- und UX-Paket, Paket C: Benachrichtigungs- und Feed-Ziele

- Bestätigte Ursachen:
  - (1) Benachrichtigungen zu Kommentaren (`post`) und Nachrichten (`conversation`) hatten im Client kein Ziel; Antippen markierte sie nur als gelesen.
  - (2) Kommentar-Benachrichtigungen speicherten nur den Beitrag, nicht den Kommentar.
  - (3) Es gab keinen Permalink für Beiträge oder Kommentare und keine Server-Abfrage, wo ein Inhalt liegt. Feed-Karten auf „Meine Startseite“ führten deshalb nirgendwohin.
- Umsetzung:
  - `GET /api/content/:type/:id/location` für `post` und `comment` liefert nur Space-, Beitrags- und Kommentar-ID. Es nutzt die bestehende Prüfung `reportTargetSnapshot` (Space-Sichtbarkeit, ausgeblendete oder entfernte Inhalte); keine zweite Rechtelogik. Unbekannt, ausgeblendet und nicht sichtbar antworten gleich (404).
  - Neue Kommentar-Benachrichtigungen zeigen auf den Kommentar (`entity_type='comment'`). Ältere mit `post` öffnen den Beitrag.
  - Permalinks `#post/<id>` und `#comment/<id>` öffnen den Space-Feed, scrollen zum Inhalt, markieren ihn dezent und setzen den Fokus. Sie funktionieren nach Neuladen sowie mit Zurück und Vor.
  - Feed auf „Meine Startseite“: Die Uhrzeit ist der Link zum Beitrag (Tastatur, beschrifteter Name). Die übrige Kartenfläche öffnet ihn per Maus oder Touch, außer auf Bedienelementen in der Karte; keine verschachtelten Buttons.
  - Chat-Benachrichtigungen öffnen „Chats“ mit der Unterhaltung, unten bei der neuesten Nachricht.
  - Ist ein Inhalt nicht mehr da oder nicht sichtbar, erklärt eine Meldung das.
- Bewusst nicht geändert bzw. offen:
  - Benachrichtigungen speichern keine Nachrichten-ID; die Unterhaltung öffnet bei der neuesten Nachricht, eine einzelne ältere wird nicht hervorgehoben.
  - Ist das Feed-Modul eines Spaces abgeschaltet, kommt die Meldung „hier nicht mehr sichtbar“.
  - Fediverse-Einträge bekommen keinen neuen Link; ihre Herkunft bleibt wie bisher sichtbar.
  - Unterhaltungen sind auf die neuesten 300 Nachrichten begrenzt (bestehend); ältere werden nicht nachgeladen.
- Nachweis:
  - `tests/integration/content-location.integration.js` (15 Prüfungen, in `qa:security`): Kommentar-Benachrichtigung zeigt auf den Kommentar; öffentlicher Beitrag für alle auflösbar; Antwort enthält nur IDs; geschlossener Space für Anonyme und Nichtmitglieder 404 mit gleichem Text wie unbekannt; ausgeblendeter Kommentar und entfernter Beitrag 404. Vor der Korrektur rot.
  - Browser-Test `content-links.gold.desktop/mobile`: Kommentar-Benachrichtigung öffnet den Kommentar im sichtbaren Bereich mit Fokus, auch nach Neuladen; Feed-Link öffnet den Beitrag; ungültiger Link meldet sich verständlich; Chat-Benachrichtigung öffnet die Unterhaltung. Vor der Korrektur rot (Benachrichtigung blieb offen). Eine Testkorrektur: `waitForApp` lädt `/` und verwarf den Hash; nach dem Neuladen wird deshalb direkt auf den Kommentar gewartet.
