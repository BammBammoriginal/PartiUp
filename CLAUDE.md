# CLAUDE.md

@AGENTS.md

Leitfaden für Claude Code in diesem Repository. `AGENTS.md` (oben eingebunden) ist die gemeinsame Regelgrundlage für alle KI-Werkzeuge und Menschen; diese Datei enthält dieselben Regeln ausführlich mit Quellen sowie alles Claude-Spezifische. Ändert sich eine Regel, wird sie im selben PR in beiden Dateien angepasst. Lies außerdem `docs/AI-COLLABORATION.md` und `docs/PROJECT-REGISTER.md`. Projektsprache (UI, Doku, Testnamen, PR-Texte) ist Deutsch; Commit-Messages sind kurze englische Imperativsätze.

## Deine Rolle als Claude Code

Du bist standardmäßig der ausführende Coding-Agent: kleinste saubere Änderung planen, aktuellen GitHub-Stand prüfen, nur den vereinbarten Umfang umsetzen, testen, dokumentieren, PR erstellen oder aktualisieren. ChatGPT/Work übernimmt Planung und unabhängiges Review; Code und Testnachweise haben Vorrang vor KI-Behauptungen.

**Vor jeder Umsetzung:** aktuellen Branch/Commit und relevante offene PRs prüfen, nicht auf veralteter Codebasis starten; Produktziel, Akzeptanzkriterien, betroffene Space-Kontexte, Risiken und Teststrategie kurz notieren; keine parallele Änderung derselben Dateien ohne Abstimmung.

**Nach jeder Umsetzung:** gezielte Tests, nötige Security-/Privacy-Regressionen und Gold-Browserstrecken ausführen; fehlende Browser-/CI-Umgebungen ausdrücklich als ungeprüft melden; PR mit Testnachweis erstellen oder aktualisieren; handoff-relevante Entscheidungen im Projektregister anhängen.

**Grenzen:** kein Push nach `main`, kein eigenmächtiger Merge, kein produktiver Rollout, keine irreversiblen Datenbankaktionen, keine Abhängigkeits-Updates und keine Lockerungen der Sicherheit ohne ausdrückliche Freigabe der projektverantwortlichen Person. Liegen Regeldateien noch in einem offenen Dokumentations-PR, den Dokumentationsstand zuerst mit der verantwortlichen Person abstimmen; nie unfreigegebene Änderungen mergen.

**Verbindlicher Modernisierungsauftrag:** Die menschliche Übernahmefähigkeit von PartiUp ist ein aktiver Entwicklungsauftrag (`docs/HUMAN-HANDOVER-ROADMAP.md`, vollständig lesen). Fortschritt jeder Etappe in GitHub-Issues und im Projektregister erfassen. Mit Etappe 1 (Bestandsaufnahme) beginnen, nicht mit einem massiven Refactoring; eine Code-Etappe erst nach Prüfung und Freigabe des vorherigen PR starten. Pro Etappe: Akzeptanzkriterien, betroffene aktive Codepfade, Vorher/Nachher-Testnachweise, Review. Ein Adapter ohne produktiven Aufrufer ist keine Umsetzung. Die Priorität gegenüber Sicherheit, Föderations-PoC und MVP steht im Projektregister.

## Was ist PartiUp?

Beziehungsorientierte Beteiligungs- und Community-Plattform: Orte × Themen × Communities × Menschen × Veranstaltungen × Projekte × Beteiligung, dazu Chats und ActivityPub-Föderation. Status: gehärteter Prototyp / Closed Alpha, **nicht produktionsreif** (`PRODUCTION-READINESS-v0.9.1.md`).

Abgeleitet von BottomUpParti v0.9.3 – deshalb heißen Env-Variablen, Cookies und die Standard-DB noch `BUP_*`, `bup_session`, `bottomupparti.db`. Diese Namen bewusst **nicht** umbenennen (`README-PARTIUP-P0.1.md`). Version kommt ausschließlich aus `package.json` (`version-preflight` verbietet hartcodierte Versionen in UI/Batch-Dateien).

## Zielsetzung und Zielgruppe

Funktionen wie Communities, Beteiligung, Veranstaltungen, Chats und Föderation gibt es bei anderen Anbietern längst. Das eigentliche Problem offener Alternativen ist, dass sie für normale Menschen wenig attraktiv, schwer zugänglich und schlecht erklärt sind. PartiUp richtet sich an Menschen **ohne Technik- oder Fachkenntnisse**. Sie nutzen heute Big-Tech-Apps, weil diese schnell und bequem sind, und wären offen für Alternativen, haben aber keine Zeit und keine Lust auf komplizierte Abläufe oder unattraktive Oberflächen. PartiUp will sich deshalb vor allem durch Attraktivität, Zugänglichkeit und Erklärbarkeit unterscheiden. Mehr Funktionen sind nicht das Ziel. (Nutzervorgabe vom 20.10.2026)

Die vier festen Prämissen jedes Releases (`QA-RELEASE-PROCESS.md` §7):
1. eine logische, schlanke, nachvollziehbare Grundstruktur;
2. Interoperabilität und API-Readiness;
3. DSGVO, Privacy-by-Design und Security-by-Design;
4. hochwertige Mobile-first-UX und App-Readiness.

## Verbindliche Regeln für die Weiterentwicklung

Die Regeln sind über viele Dokumente verteilt; diese Zusammenfassung verweist auf die Quellen. Bei Konflikt gilt die Quelle, und der Widerspruch wird im Projektregister geklärt. Verbindlich sind Entscheidungen der projektverantwortlichen Person, sobald sie mit Datum im Projektregister stehen; GitHub ist maßgeblich für den Implementierungsstand, Chatverläufe sind kein Nachweis.

**Vorrang (Vorgabe vom 26.10.2026):** Neue oder verkürzte Regeln heben bestehende Regeln nicht auf. Ausnahme nur, wenn die Änderung aus Entwicklungen im Fachgebiet (Standards, Sicherheitsvorfälle, Security-Releases) folgt oder sicherheitsrelevant ist **und** ausdrücklich angewiesen wurde. Bei Kollision nie eigenmächtig die restriktivere Regel abschwächen, sondern den Konflikt mit Lösungsvorschlag im Projektregister benennen.

### UI/UX hat Vorrang (Nutzervorgabe vom 20.10.2026; `DESIGN-SYSTEM.md`, `SPACE-CREATION-FLOW.md`, P0.8/P0.10/P0.11)

- **Maßstab ist ein Mensch ohne Fachwissen, der Big-Tech-Apps gewohnt ist.** Eine Funktion ist erst fertig, wenn sie dort ohne Erklärung von außen verstanden und gern benutzt wird. Technisch korrekt, aber umständlich, hässlich oder unverständlich gilt als Mangel, nicht als Kosmetik.
- **Technik bleibt unsichtbar.** ActivityPub, Server-Regeln, Connectors, Erweiterungen und Rollenmodelle erscheinen für Nutzer als normale Funktionen mit Alltagssprache und verständlichen Zuständen, nicht als Fachbegriffe. Technische Details liegen unter `⚙ Einstellungen` bzw. `ⓘ Info`.
- **Schneller Einstieg:** kurze Create-Flows, sinnvolle Voreinstellungen. Komplexität zeigt sich erst danach und nur bei Bedarf („Erstellen ≠ Konfigurieren“). Keine Pflicht-Einrichtung vor dem ersten Nutzen.
- **Bewährte Muster nutzen.** Bekannte Bedienmuster verbreiteter Apps (z. B. Signal, WhatsApp, Telegram, Discord, Element beim Chat) aufgreifen, damit nichts neu gelernt werden muss. Nicht ungeprüft kopieren; Privacy- und Space-Regeln gehen vor.
- **Erklärbarkeit:** Jede Aktion ist klar beschriftet. Folgenreiche Aktionen (Löschen, Veröffentlichen, Föderieren, Rechte) erklären vorher verständlich ihre Wirkung. Herkunft und Vertrauen sind nachvollziehbar, ohne die Oberfläche zu dominieren.
- **Mobile-first und App-Gefühl:** Mobile (412×915) ist gleichwertig oder vorrangig, mit gut erreichbaren Touch-Zielen, ohne horizontales Scrollen, mit PWA-Readiness. Primäre Aktionen mindestens 40 px.
- **Meta-Aktionen** wie „Melden“, „Info“ und „Einstellungen“ sind gut sichtbar, aber klein und unauffällig; Untergrenze ist das WCAG-2.2-Minimum von 24 px (Entscheidung vom 26.10.2026).
- **Ansprechend und ruhig:** konsistente Design-Tokens, klare Hierarchie, keine überladenen Ansichten, Aktionen kontextuell statt dauerhaft sichtbar. Farben nur über CSS-Variablen im `:root` von `style.css`; eine endgültige Farbwelt ist nicht festgelegt.
- **Barrierefreiheit:** Farbe ist nie der einzige Bedeutungsträger, Bedienung per Tastatur und Touch, zugängliche Namen, keine verschachtelten Bedienelemente, Reduced Motion. DOM-Tests ersetzen kein WCAG-Audit.

### Fachlicher Funktionsvertrag (`P0.16.0-BIS-P0.16.20-RETROSPEKTIVE.md`, `P0.16-WIEDERHERSTELLUNGSMATRIX.md`)

- Community, Unterraum, Projekt, Veranstaltung und Beteiligungsvorgang sind **Space-Ausprägungen mit derselben Grundlogik** (Identität, Rollen, Sichtbarkeit, Module, Navigation, Beziehungen, Follow). Abweichungen nur mit dokumentiertem Fachzweck.
- Ein Objekt bleibt **ein** Objekt, auch wenn es mit mehreren Orten, Themen und Communities verknüpft ist. Ort, Thema und Mensch sind gleichwertige Vernetzungsachsen, keine bloßen Filter; Navigation muss in beide Richtungen funktionieren.
- **Kein algorithmisches Ranking** – Übersichten entstehen aus bestehenden Verknüpfungen.
- Unterräume über `parent_id`, keine Spezialtabellen; Eltern-Sichtbarkeit hebt private Kinder nicht auf (`COMMUNITY-SPACES.md`, `SPACE-MODULES-AND-AGGREGATION.md`).
- „Erstellen ≠ Konfigurieren“: minimaler Create-Flow, dann schrittweise Einrichtung; Templates sind nur Modul-Defaults (`SPACE-CREATION-FLOW.md`).
- Funktionen eines Spaces in der Funktionsnavigation; Transparenz/Herkunft („Vertrauen & Herkunft“) unter `ⓘ Info`, Administration unter `⚙ Einstellungen` (`README-PARTIUP-P0.10.4.md`). User-Verifizierungsstufe und offizielle Organisationsautorisierung bleiben getrennt.
- Begriffe: UI sagt „Veranstaltung“ (technisch `event`), Einzelobjekt „Beteiligungsvorgang“, Navigation „Beteiligung“. Freundschaft, Personen-Follow, Mitgliedschaft und Teilnahme sind getrennte Beziehungen.
- Beteiligung ist ein Kernkonzept quer über alle Space-Typen; Abstimmungen sind keine rechtsverbindlichen Wahlverfahren (`PARTICIPATION-MODEL.md`).
- Chat-Regeln (Medien, Aktionen, Autorenrechte, generische Reaktionen, Medien-Lebenszyklus): Abschnitt „Messaging- und Chat-Leitlinien“ in `P0.16-WIEDERHERSTELLUNGSMATRIX.md`.
- Keine stille Änderung des Datenmodells, der Föderationssemantik oder bestehender Produktverträge.

### Security & Privacy (Release-Blocker)

- Privacy-/Security-by-Design, Datenminimierung, **Default Deny**, Rechte immer serverseitig und im konkreten Space-Kontext (Owner > Admin > Moderator > Mitglied > Gast; `PERMISSIONS-v0.8.9.md`). UI-Ausblenden ist nur UX. Rechte sind aktionsbezogen (Profil bearbeiten ≠ Zugang konfigurieren ≠ Mitglieder zulassen ≠ extern veröffentlichen).
- Fehlendes Recht für Beteiligte → 403; Außenstehende → 404 ohne Sichtbarkeitsleck. Ein bekannter Link oder eine bekannte ID ist keine Berechtigung.
- Space-Sichtbarkeit, persönliche Föderationsfreigabe (Opt-in, Default aus) und Objektveröffentlichung sind getrennte Entscheidungen (`ACTIVITYPUB-USER-PRIVACY-P0.5.md`). Remote-Eingaben sind nicht vertrauenswürdig (Signaturen, SSRF-Schutz, fail-closed).
- Export und Kontolöschung folgen der Löschmatrix in `PRIVACY-DATA-LIFECYCLE-P0.5.md`. Moderation: Melden, Prüfen, Maßnahme getrennt; nachvollziehbar statt physisch löschen (`MODERATION-SAFETY-v0.9.md`).
- Nutzerinhalte im Frontend immer über `esc()`/`escAttr()` ausgeben (XSS-Preflight).
- **Node.js** nur in einer unterstützten LTS-Linie auf dem abgesicherten Patchstand, exakt festgelegt (CI, `engines`, `.nvmrc`); kein offenes „24“ oder `latest`. Security-Releases zeitnah übernehmen, Major-Wechsel nie blind, alte/neue Version und Grund dokumentieren, danach alle Tests (Vorgabe vom 26.10.2026).
- **Secrets** (Lehre aus dem LiteLLM-Vorfall, Oktober 2026): nie im Repository, in Logs, KI-Prompts oder KI-Ausgaben; bei möglicher Offenlegung sofort widerrufen bzw. rotieren, nicht nur löschen; minimaler Scope; keine persönlichen Owner-Tokens für Automatisierung.
- **CI/CD und Release:** Build und Release getrennt, minimale Veröffentlichungsrechte, keine fremden Quell-Repositories als Release-Quelle, Release-Workflows besonders geschützt; Branch-Schutz nicht durch Entwickler- oder Agentenkonten abschaltbar; kritische Releases mit getrennten Identitäten bzw. Freigabeschritten. Für sicherheitsrelevante Deployments keine ungeprüften `latest`-Tags; Signaturen, Provenance und Hashes prüfen; reproduzierbare Builds soweit praktikabel; kompromittierte Releases schnell sperrbar. Signierte Pakete bleiben verbindlich.
- **Least Privilege rückwirkend:** Rollen, Space-/globale Admins, Plugins, Integrationen, ActivityPub-Komponenten, DB-Zugriffe, Hintergrundprozesse, CI/CD, KI-Agenten, API-Tokens und Service-Accounts nur mit den Rechten ihrer Aufgabe; ein kompromittiertes Plugin oder eine Integration darf nicht die ganze Plattform öffnen.
- **Zugriffsgrenzen:** Für jeden Endpunkt festgelegt und getestet: öffentlich, angemeldet, Space-Mitglied, bestimmte Rolle oder Administration; auch direkte API-Aufrufe, manipulierte URLs, Chat, Dateien, Suche, Benachrichtigungen, Exporte, ActivityPub-Endpunkte, Hintergrund-Requests nach Logout. Ein ausgeblendeter Button ist keine Zugriffskontrolle.
- **Sitzungen:** Nach Logout ist die Sitzung serverseitig ungültig, geschützte Aufrufe scheitern, Chats getrennt, alte UI-Zustände und Backdrops verschwinden, Browser-Zurück stellt keine Sitzung wieder her; Nutzerwechsel wird auf Session-Leakage getestet.
- **KI-Agenten** (auch Claude Code) gelten als nicht vollständig vertrauenswürdig: enger Datei-/Netzwerkzugriff, keine Produktions-Secrets, keine dauerhaften Owner-Tokens, sensible Ausgaben nicht dauerhaft loggen; Codeänderung, Test und Produktionsfreigabe getrennt; Schutzmechanismen nie selbst deaktivieren.
- Abhängigkeiten und GitHub Actions exakt pinnen, Lockfile führend; nie `npm audit fix --force`. Installation ohne Installationsskripte (`npm ci --ignore-scripts`, ab PR #20), danach Registry-Signaturen und Audits; Updates nur nach Prüfung von Herkunft und Diff und mit menschlicher Freigabe (`SECURITY-UPDATE-AND-RECOVERY.md`, mit PR #20). Keine eigene Krypto-, Rollen- oder Identitätslogik erfinden, sondern bestehende Bibliotheken und Standards nutzen.

### Arbeits- und QA-Regeln (`QA-RELEASE-PROCESS.md`, `QA-FAST-FULL.md`)

- **Eine fachliche Änderung pro Branch/PR.** Vorher betroffene Space-Typen, vernetzte Ansichten, Rechte-, Privacy- und Föderationsgrenzen benennen. Keine unaufgeforderten Refactorings; ein berührter Codepfad darf im selben PR verhaltensgleich modernisiert werden, wenn das benannt und getestet ist.
- Produktfehler zuerst mit einem Test **rot** reproduzieren, minimal korrigieren, Test grün, dann alle Gates laufen lassen und den Git-Diff auf Seiteneffekte prüfen. Tritt ein Fehler nur in einer bestimmten Umgebung auf (z. B. nur in der Linux-CI), ersetzt ein gesichertes CI-Artefakt (Screenshot, Trace) den lokalen Rot-Nachweis.
- Jede Störung einordnen: Produkt-, Test-, Umgebungsfehler oder geteilte Ursache, mit Beleg (Trace/Screenshot). Eine Testkorrektur darf kein echtes Nutzerproblem verdecken.
- Ehrliche QA: keine pauschalen Wartezeiten, `force`-Klicks, Login-/API-Bypässe, höheren Timeouts, Retries oder gelockerten Rate-Limits. Bereitschaft am sichtbaren UI-Zustand messen, nicht nur an HTTP 200. Zeitabhängige Fehler werden mit gezielt zurückgehaltenen Antworten (`page.route`) reproduziert, nicht mit Wartezeiten.
- **Robuste statt starrer Tests** (Nutzervorgabe vom 20.10.2026). Starre Tests, die nach korrekten Änderungen rot werden, waren das wiederkehrende Hauptproblem: Die Preflights enthalten rund 1.000 Zeichenkettenprüfungen auf den Quelltext.
  - Neue Prüfungen testen beobachtbare Wirkung (HTTP-Status, Daten, gespeicherter Zustand, sichtbares Ergebnis), keine neuen `includes()`-Checks auf den Quelltext, außer für anders nicht prüfbare Invarianten (Grund kommentieren).
  - Browser-Tests bedienen wie ein Mensch: Rolle und zugänglicher Name, sichtbarer Titel oder ausdrücklich als Testvertrag gedachte `data-*`-Attribute. Nicht Kartenmitte, CSS-Klassen, DOM-Position oder starre Tabnamen. Karten über `openCardByTitle` (`tests/helpers/app.js`, ab PR #20) öffnen.
  - Wird ein Test rot: erst einordnen. Ist er an die Umsetzung gekoppelt, auf Verhalten umschreiben statt die neue Zeichenkette nachzutragen. Blockiert ein Zeichenketten-Preflight eine verhaltensgleiche Änderung, die Prüfung im selben PR durch eine Verhaltensprüfung ersetzen.
  - Alte Zeichenketten-Preflights schrittweise ersetzen, wenn der Bereich ohnehin angefasst wird.
  - Flexibler heißt nie schwächer: Sicherheits-, Privacy- und Rechteaussagen bleiben mindestens gleich streng. Ein gelockerter Test braucht eine Gegenprobe, die zeigt, dass er noch anschlägt.
- **Security-Regressionstests** für jede Security-Korrektur, insbesondere Authentifizierung, Rollen, Sichtbarkeit, Space-Vererbung, Föderation, Blockierung, Nutzerwechsel, Logout, CSRF, Stored XSS, Rate-Limits, Privacy-Export/-Löschung, Plugin-Berechtigungen, ActivityPub-Auslieferung, Secret-Exposure; geprüft werden UI, API, Datenbankzustand und tatsächliche ActivityPub-Auslieferung.
- **Privacy-Boundary-Matrix** (mindestens): öffentlicher Space mit öffentlichem, Quiet-public- und eingeschränktem Beitrag; geschlossener Space mit internem Beitrag, unberechtigter und ausdrücklich erlaubter Veröffentlichung; geschlossener Unterraum in öffentlichem Space; Rollenwechsel nach Veröffentlichung; Mitglied verlässt Space; blockierte Person; anonymer Zugriff; Permalink; Zugriff über ActivityPub/fremde Instanz; Mastodon-Nutzer erhält öffentlichen Beitrag, aber keinen nicht für ihn bestimmten.
- Vorgehen pro Prüfbereich: Ist-Zustand → Abweichung → Standard/Konvention → minimale Änderung → Umsetzung → Tests → Regressionen → Nebenwirkungen → Dokumentation. Keine Regel stillschweigend entfernen.
- Desktop- und Mobile-Annahmen nie in einem Test mischen (Desktop = Sidebar, Mobile = Bottom-Nav/Drawer `#mobileMore`).
- Rechte-/Privacy-Änderungen brauchen einen serverseitigen Negativtest; neue Ansichten/Kachelvarianten einen Smoke-/Layout-Test.
- Ohne echten Chromium-Lauf (Desktop **und** Mobile) keine Freigabe; nicht Ausgeführtes ausdrücklich als „ungeprüft“ benennen. Visual-Baselines nur nach bewusster Sichtprüfung aktualisieren.
- Werden mehrere PRs nacheinander gemergt, laufen die Gates danach einmal auf dem neuen `main` (die CI prüft nur einzelne PRs).

### Menschliche Übernahme, Modularisierung und Entkopplung von SQLite (`docs/HUMAN-HANDOVER-ROADMAP.md`, `AGENTS.md` §7)

- PartiUp muss jederzeit von einem qualifizierten menschlichen Team ohne ChatGPT, Claude oder historische Chats weiterentwickelt werden können. Wartbarkeit, Sicherheit und Betriebsfähigkeit sind Qualitätsanforderungen (Orientierung ISO/IEC 25010, NIST SSDF, OWASP ASVS; Konformität nie ohne Audit behaupten).
- Zielbild: HTTP-Router → Anwendungsdienst → Domain/Policy (Fachlogik und Autorisierung) → Repository-Vertrag → SQLite-Adapter. `server/server.js` und `server/db.js` schrittweise und verhaltensgleich abbauen, keine Komplettneuschreibung, kein pauschales ORM.
- Neu extrahierte Fachlogik importiert keine SQLite-API und kein SQLite-spezifisches SQL; Datenzugriff hinter dokumentierte Repository-/Adapter-Verträge. Bestehenden SQLite-Code bis zum kontrollierten Ersatz weiter betreiben.
- Ein Datenbankwechsel ist erst vorbereitet, wenn ein zweiter Adapter (z. B. PostgreSQL-Testadapter) dieselben Vertragstests besteht. Migrationen versioniert, mit Integritäts-, Backup-/Restore- und Rückfallstrategie. Kein produktiver Datenbankwechsel ohne gesonderte Freigabe.
- Wartbarkeitsaufgaben sind erst erledigt, wenn ein produktiv genutzter Codepfad umgestellt ist und Regressionstests bestehen; Markdown, leere Verzeichnisse oder ungenutzte Abstraktionen zählen nicht.

### Schlanker Core, Erweiterbarkeit und Interoperabilität in alle Richtungen

PartiUp ist nicht als abgeschlossene Plattform gedacht. Es ist ein stabiler, bewusst schlanker Kern, der über Erweiterungen wächst, Teil des Fediverse ist und sich mit anderen Systemen (CivicTech/GovTech, Feeds, andere Netzwerke) verbinden lässt, sowohl als anbindender als auch als angebundener Teil. Das ist eine tragende Produktsäule und kein Zusatz.

- **Schichten strikt trennen** (`PARTIUP-P0.1-ARCHITECTURE.md`, `README-PARTIUP-P0.15.md`):
  - Core: Identität, Spaces, Beziehungen, Orte/Themen, Rechte, Moderation, Feed, Participation Core.
  - Module: Veranstaltungen, Projekte, Diskussion, Aufgaben, Medien.
  - Föderation: ActivityPub in `server/federation/`.
  - Connectors: Nicht-ActivityPub-Systeme wie RSS/Atom, AT Protocol/Bluesky und generische APIs in `server/connectors/`.
  - Integrations: fachliche CivicTech-Anbindungen wie Decidim, Consul Democracy, WeChange und öffentliche Demokratiedaten in `server/integrations/`.
  - Erweiterungen: Space-Funktionen mit Manifest in `server/extensions/`.
- **Core klein halten.** Neue Fachfunktionen zuerst als Modul oder Erweiterung auf bestehenden Core-Bausteinen bauen, nicht als neue Sonderlogik im Core. Kommunale Fachverfahren gehören z. B. nicht in den Core, sondern in ein späteres Paket `municipal.participation` (`README-PARTIUP-P0.9.md`). Reihenfolge: **wiederverwenden → integrieren → föderieren → erst dann selbst entwickeln**.
- **Internes Modell zuerst, externe Abbildung danach.** Kein Anbieter (Mastodon, Mobilizon, Decidim …) bestimmt das PartiUp-Datenmodell. Föderations-Metadaten liegen getrennt in `federation_entities`, externe Herkunft anbieterneutral in `external_sources`/`object_source_links`, ohne anbieterspezifische Tabellen.
- **ActivityPub-Abbildung:** Person ↔ Nutzer, Group ↔ Community/Space, Note ↔ Beitrag/Kommentar, Event ↔ Veranstaltung, inklusive Join/Leave/Accept/Reject, Medienanhänge und Tombstones (`PARTIUP-P0.2-ACTIVITYPUB-MODEL.md`, P0.3–P0.14). Föderierte Inhalte erscheinen in derselben PartiUp-Oberfläche mit sichtbarer Herkunft, nicht in einem getrennten Fediverse-Bereich (P0.11).
- **Föderation ist kontrolliert offen.**
  - Instanz-Governance `open|reviewed|allowlist` plus Peer-Regeln pro Space (P0.8).
  - Eingehende Föderation pro Space getrennt einstellbar: lesen, Antworten, Threads (P0.6).
  - Teilnehmerlisten werden nie föderiert.
  - Die jeweils restriktivere Regel gewinnt.
- **Erweiterungen:**
  - Jede Erweiterung hat ein Manifest mit Capabilities, Datenzugriff, Netzwerkzugriff und UI-Flächen.
  - Beim Aktivieren wird die Änderung auditiert.
  - Für Nutzer erscheint sie als normale Space-Funktion und ist unter „ⓘ Info“ offengelegt (`README-PARTIUP-P0.10.md`).
  - Externe ausführbare Plugins bleiben gesperrt, bis Herkunftsprüfung, Isolation, Capability-Durchsetzung und ein Update-/Rollback-Weg existieren.
- **Connectors und Integrations:**
  - Read-only first; Rückschreiben nur mit eigenem, dokumentiertem Rechte- und Konfliktentscheid.
  - Capabilities werden vorab erklärt, nur HTTPS, Payloads werden normalisiert.
  - Jede Herkunft bleibt sichtbar (Anbieter, externe ID, kanonische URL).
  - Kein versteckter Sync, kein Crawler, kein offener Proxy, kein Tracking.
  - Eine Integration erweitert nie lokale Rechte. Decidim und Consul bleiben eigenständige Systeme und werden nicht in den Core kopiert (`server/connectors/README.md`, `server/integrations/README.md`).
- **Eine kanonische Quelle pro Objekt, eine Nutzeroberfläche.** Externe Systeme bekommen keine parallele Community-Oberfläche. Die Abgrenzung zu Drupal (nur headless für Redaktionsinhalte) und Open Social (kein zweiter Core) stammt aus ADR-0001; dessen PR #6 wurde geschlossen, nicht gemergt; die Entscheidung ist im Projektregister „zu bestätigen“.
- „Integriert“ heißt erst nach einem Ende-zu-Ende-Test gegen eine echte Gegenstelle. Aktueller Stand (ActivityPub ungetestet gegen echte Instanzen, Connectors/Integrations als `planned_adapter` katalogisiert): siehe Projektregister. Nicht als fertig ausgeben.

### Mastodon-/ActivityPub-Kompatibilität (Vorgabe vom 26.10.2026)

- **Etablierte Semantik vor Eigenlogik:** Wo ActivityPub/Mastodon eine geeignete Semantik bereitstellen, keine eigene erfinden; bestehende ActivityPub-Felder nicht umdeuten; jedes föderierte Objekt muss in Mastodon korrekt interpretiert und dargestellt werden.
- **Beitragssichtbarkeit nach Mastodon:** Public · Quiet public (Profil/Permalink, nicht in Feeds/Explore/Suche) · Followers · Private mention. Vorhandene PartiUp-Stufen darauf abbilden, keine parallelen Klassen.
- **Spaces als zusätzliche, restriktivere Policy-Ebene oberhalb** von ActivityPub/Mastodon, kein Ersatz. Prüfkette: Space-Policy → Rollenberechtigung → Beitragssichtbarkeit → ActivityPub-Adressierung (`to`/`cc`) → tatsächliche Zustellung; keine nachgeordnete Einstellung hebelt eine übergeordnete aus, keine implizite Eskalation.
- Geschlossene Spaces bleiben standardmäßig geschlossen; Veröffentlichung nach außen nur mit ausdrücklich erlaubender Space-Policy und berechtigter Rolle. Unterräume erben nur, wo ausdrücklich vorgesehen.
- Sehen, Finden und Verteilen bleiben getrennt. UI-Fragen: „Wer kann diesen Inhalt sehen?“, „Wo kann er gefunden werden?“, „Darf er außerhalb dieses Spaces bzw. ins Fediverse?“.
- Security-, Privacy- und Kompatibilitätsarbeit ist keine Funktionsausweitung (keine neuen Social-Funktionen, kein größerer MVP, kein Mastodon-Nachbau, Space-Struktur bleibt); neue Funktionen nur, wenn zwingend für eine Lücke, Inkompatibilität oder einen Standardverstoß.
- Ist-Stand 26.10.2026: Beiträge haben keine eigene Sichtbarkeitsstufe; Sichtbarkeit und Föderation folgen aus Space-Sichtbarkeit (`public`/`unlisted`/`private`), Space-Föderationsmodus (`off`/`public`/`selected`), Beitragseinstellung (`inherit`/`enabled`/`disabled`) und persönlichem Opt-in (`federationDecisionForPost` in `server/federation/protocol.js`). Föderiert wird immer als Public (`to: Public`); Followers/Private mention werden nicht föderiert.

## Stack & Struktur

- Node.js mit Express 4, `better-sqlite3` (natives Modul), `multer`, `sharp`. Kein Build-Schritt, kein Frontend-Framework. Laufzeit Node 24 ab PR #20 (`engines`); `main` lief vorher in der CI mit Node 22.
- `server/server.js`: Express-App mit ca. 145 API-Routen, Security-Header, Rate-Limits, CSRF, Sessions (sehr groß, dichte Einzeiler).
- `server/db.js`: Schema (`CREATE TABLE IF NOT EXISTS` plus Migrationen), Demo-Seed, Sichtbarkeits-/Rechtefunktionen (`canView*`, `listEvents` …).
- `server/privacy.js`: Datenexport, Kontolöschung, Datei-Löschwarteschlange.
- `server/federation/`: ActivityPub (protocol, store, governance, key-store, media, security).
- `server/extensions|connectors|integrations/registry.js`: Manifeste/Kataloge; `server/core/architecture.js` liefert den Architektur-Snapshot.
- `server/modules/*/README.md`: nur Grenzmarkierungen; der Modulcode lebt noch in `server.js`/`db.js`.
- `public/index.html`, `public/app.js`, `public/style.css`: Vanilla-JS-SPA (Seiten = `<section class="page">`, Navigation über `data-page`). Farben nur über CSS-Variablen im `:root` von `style.css` (`DESIGN-SYSTEM.md`).
- `data/` (gitignored): SQLite-DBs und private Medien; `uploads/public/`: öffentliche Uploads.
- Die vielen `*.md` im Root sind Release-, Changelog- und Audit-Historie pro Version. Neue Versionen bekommen eigene `CHANGELOG-P0.x.md`/`README-PARTIUP-P0.x.md`; alte nicht umschreiben. Gemeinsame Arbeitsdokumente liegen in `docs/`.

## Befehle

```bash
npm ci --ignore-scripts   # Abhängigkeiten exakt nach Lockfile, ohne Installationsskripte (ab PR #20; vorher: npm ci)
npm run supply-chain-preflight && npm audit signatures && npm run audit:prod && npm run audit:all
npm run deps:build        # prüft das mitgelieferte SQLite-Modul (ab PR #20)
npm run qa:install        # Playwright-Chromium
npm start                 # http://127.0.0.1:3000 (BIND_HOST=0.0.0.0 für LAN)
npm run dev               # node --watch
npm run check             # Syntaxcheck server.js, db.js, app.js
```

Demo-Login (nur außerhalb von Produktion; eine frische DB wird geseedet): `max@bottomupparti.local` / `demo123` (ebenso `anna@…`, `lisa@…`). DB zurücksetzen: `data/bottomupparti.db*` löschen (`reset-database.bat`).

### Test-Gates

CI (`.github/workflows/goldstandard.yml`, jeder PR gegen `main`): auf `main` bisher `preflight` → `qa:security` → `qa:gold`; ab PR #20 zusätzlich Lieferkette, Signaturen, Audits sowie Smoke, Layout und Accessibility. Nach einem Merge läuft die CI nicht automatisch auf `main`.

| Befehl | Inhalt |
|---|---|
| `npm run preflight` | ca. 70 statische Preflight-Skripte (`scripts/*-preflight.js`) plus `check` |
| `npm run qa:security` | Integrationstests `tests/integration/` und XSS-Payloads (starten eigenen Server) |
| `npm run qa:gold` | Gold-Preflights, `gold-regressions.integration.js`, Playwright `gold-desktop` + `gold-mobile` |
| `npm run qa:smoke` / `qa:layout` / `qa:accessibility` | Ergänzende Browser-Suiten, getrennt Desktop/Mobile |
| `npm run qa:full` | smoke + layout + accessibility + gold |

Aktuelle Testergebnisse und bekannte Fehlschläge stehen im Projektregister, nicht hier.

Einzelne Tests:
```bash
node scripts/messaging-preflight.js
node tests/integration/registration.integration.js
npx playwright test tests/e2e/gold.desktop.spec.js --project=gold-desktop -g "Teil des Testnamens"
```

## Wie die Tests funktionieren

- **Preflights** sind statische Checks, die oft per `includes()`/Regex auf konkrete Strings in `server.js`, `app.js`, `style.css`, `index.html` und sogar in Testdateien prüfen. Beim Umbauen von Code schlägt deshalb leicht ein Preflight fehl. Dann den zugehörigen Preflight lesen und **nur bewusst** anpassen (siehe Regeln zu robusten Tests), nie eine Sicherheitsprüfung aufweichen. `scripts/dependency-preflight.js` hält die gepinnten Versionen absichtlich doppelt fest und wird bei freigegebenen Updates mitgezogen.
- **Integrationstests** (`tests/integration/*.js`, `tests/security/*.js`) sind eigenständige Node-Skripte. Sie starten `server/server.js` auf einem Zufallsport mit eigener DB unter `data/` und nutzen `fetch` mit Cookie-Jar und CSRF-Header `X-BUP-CSRF`. Sie geben ✓/✗ aus und enden mit Exitcode ≠ 0 bei Fehlern.
- **Playwright** (`playwright.config.js`): Server auf Port 3100 mit frischer DB, `workers: 1`, `retries: 0`, Test-Timeout 8 s (Gold 30 s), Expect 3 s. Das Projekt `setup` loggt einmal **sichtbar über die UI** als Max ein (`tests/.auth/user.json`). Viewports: Desktop 1440×1000, Mobile Pixel 7 412×915. Helfer liegen in `tests/helpers/app.js` und `tests/helpers/gold.js`. Gold-Tests sammeln `pageerror`, fehlgeschlagene Requests und HTTP 5xx.
- Linux-CI und Windows rendern Schrift unterschiedlich. Ein Test, der nur in der CI scheitert, wird über das Artefakt `gold-browser-failure` (Screenshot, Trace) eingeordnet: `gh run download <run-id>`.
- Testartefakte bei Fehlern lokal: `test-results/` (Trace, Screenshot, Video), Report in `playwright-report/`.

## Git

- Arbeit auf Feature-Branches (`feature/…`, `fix/…`, `ui/…`, `security/…`, `qa/…`, `docs/…`), Merge per PR nach `main`.
- Für Arbeit an einem fremden PR-Branch einen separaten `git worktree` verwenden und die Übernahme im PR kommentieren.
- Commit-Messages: englisch, Imperativ, ohne Präfix (z. B. „Keep mobile chat composer above bottom navigation“), mit Begründung im Text, wenn die Änderung nicht selbsterklärend ist.

## Windows-Hinweise

- Primäre Entwicklungsumgebung ist Windows; in Batch/PowerShell `npm.cmd` verwenden. Python ist nicht installiert. Batch-Skripte: `setup.bat`, `setup-qa.bat`, `start-local.bat`, `start-network.bat`.
- Lädt `better-sqlite3` nicht, ist das ein Befund für `npm run deps:build`; nicht mit `npm rebuild` oder freigegebenen Installationsskripten umgehen.
