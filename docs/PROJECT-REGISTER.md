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
