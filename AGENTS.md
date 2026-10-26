# PartiUp – verbindliche Regeln für Menschen und KI-Assistenten

Stand: 2026-10-26. Gilt für jede Analyse und Änderung im gesamten Repository, rückwirkend auch für bestehenden Code: Kommt eine neue Regel hinzu, wird der Bestand darauf geprüft und angepasst. Es gibt keine Parallelstandards „alt“ und „neu“.

Diese Datei ist die gemeinsame Regelgrundlage für ChatGPT, Claude Code und menschliche Entwickler. `CLAUDE.md` bindet sie ein und enthält dieselben Regeln ausführlich mit Quellen sowie Claude-Spezifisches; eine Regeländerung wird im selben PR in beiden Dateien vorgenommen. Ausführliche Begründungen stehen in den verlinkten Fachdokumenten; bei Widerspruch gilt die Fachquelle, und der Widerspruch wird im Projektregister geklärt.

## 0. Quellen und Nachweise

- **GitHub ist maßgeblich** für implementierten Code, Branches, PRs, Tests und den tatsächlichen Versionsstand. Chatverläufe und KI-Zusammenfassungen sind kein Implementierungsnachweis.
- **Entscheidungen** werden verbindlich, wenn die projektverantwortliche Person sie ausdrücklich trifft **und** sie im Projektregister (`docs/PROJECT-REGISTER.md`) mit Datum stehen. Entscheidungen, die nur in früheren Chats vorkommen, gelten als „zu bestätigen“.
- Aussagen werden nach Evidenz gekennzeichnet: **V** verbindlich beschlossen · **M** auf `main` vorhanden · **T** durch konkreten Testlauf belegt (gilt nur für genau diesen Commit) · **PR** nur auf offenem Branch · **B** Idee/Brainstorming, nicht beschlossen · **O** offen.
- Ideen aus dem Brainstorming sind unverbindlich, bis sie ausdrücklich übernommen werden. Einordnen ändert weder Code noch Roadmap.
- **Neue oder verkürzte Regeln heben bestehende Regeln nicht auf.** Ausnahme nur, wenn die Änderung aus Entwicklungen im Fachgebiet (Standards, Sicherheitsvorfälle, Security-Releases) folgt oder sicherheitsrelevant ist **und** ausdrücklich angewiesen wurde. Kollidieren zwei Regeln, wird die restriktivere nie eigenmächtig abgeschwächt; der Konflikt wird mit Lösungsvorschlag im Projektregister benannt und entschieden.

## 1. Produktziel und Zielgruppe (vorrangig)

PartiUp ist ein gehärteter Prototyp (Closed Alpha) und **nicht produktionsreif** (`PRODUCTION-READINESS-v0.9.1.md`). Es vernetzt Orte, Themen, Communities und Menschen dort, wo Gemeinschaft ohnehin stattfindet, und führt niedrigschwellig ins Mitwirken und Entscheiden. Die Funktionen gibt es anderswo schon. PartiUp unterscheidet sich durch **Attraktivität, Zugänglichkeit und Erklärbarkeit** für Menschen **ohne Technik- oder Fachkenntnisse**, die heute Big-Tech-Apps nutzen. Ziel ist nicht die größte Funktionsfülle.

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
- „Vertrauen & Herkunft“ liegt unter `ⓘ Info`; die Verifizierungsstufe einer Person und die offizielle Autorisierung einer Organisation bleiben getrennt.
- Templates sind nur Modul-Voreinstellungen, keine eigenen Datenmodelle.
- Chat-Regeln (Medien, Aktionen, Autorenrechte, generische Reaktionen, Medien-Lebenszyklus): „Messaging- und Chat-Leitlinien“ in `P0.16-WIEDERHERSTELLUNGSMATRIX.md`.
- Keine stille Änderung des Datenmodells, der Föderationssemantik oder bestehender Produktverträge.

## 3. Schlanker Core, Erweiterbarkeit und Interoperabilität

PartiUp ist ein stabiler, bewusst schlanker Kern, der über Erweiterungen wächst, Teil des Fediverse ist und sich mit anderen Systemen verbinden lässt, anbindend wie angebunden. Quellen: `PARTIUP-P0.1-ARCHITECTURE.md`, README P0.2–P0.15, `server/connectors/README.md`, `server/integrations/README.md`.

- Schichten getrennt halten: Core (Identität, Spaces, Beziehungen, Orte/Themen, Rechte, Moderation, Feed, Participation Core) · Module · Föderation (`server/federation/`) · Connectoren für Nicht-ActivityPub-Systeme (`server/connectors/`) · CivicTech-Integrationen wie Decidim oder Consul Democracy (`server/integrations/`) · Erweiterungen mit Manifest (`server/extensions/`).
- Core klein halten. Neue Fachfunktionen zuerst als Modul oder Erweiterung auf bestehenden Core-Bausteinen; kommunale Fachverfahren z. B. in ein späteres Paket `municipal.participation`, nicht in den Core. Reihenfolge: **wiederverwenden → integrieren → föderieren → erst dann selbst entwickeln**.
- Internes Modell zuerst; kein Anbieter bestimmt das Datenmodell. Föderations-Metadaten liegen getrennt in `federation_entities`, externe Herkunft anbieterneutral in `external_sources`/`object_source_links`, ohne anbieterspezifische Tabellen. Pro Objekt eine kanonische Quelle; Herkunft (Anbieter, externe ID, Original-URL) bleibt sichtbar. Externe Systeme bekommen keine parallele Community-Oberfläche.
- ActivityPub-Abbildung: Person ↔ Nutzer, Group ↔ Community/Space, Note ↔ Beitrag/Kommentar, Event ↔ Veranstaltung, inklusive Join/Leave/Accept/Reject, Medienanhängen und Tombstones (`PARTIUP-P0.2-ACTIVITYPUB-MODEL.md`). Föderierte Inhalte erscheinen in derselben Oberfläche mit sichtbarer Herkunft.
- Föderation ist kontrolliert offen: Instanz-Governance `open|reviewed|allowlist` plus Peer-Regeln pro Space; eingehende Föderation pro Space getrennt (lesen, Antworten, Threads); die restriktivere Regel gewinnt; Teilnehmerlisten werden nie föderiert.
- Connectoren und Integrationen: zuerst nur lesend, Rückschreiben braucht einen eigenen Rechte- und Konfliktentscheid; Capabilities vorab erklärt, nur HTTPS, Payloads normalisiert. Kein versteckter Sync, kein Crawler, kein offener Proxy, kein Tracking. Keine Integration erweitert lokale Rechte; Decidim und Consul bleiben eigenständige Systeme.
- Erweiterungen haben ein Manifest (Capabilities, Daten- und Netzwerkzugriff, UI-Flächen); Aktivieren wird auditiert; für Nutzer erscheinen sie als normale Funktion und sind unter `ⓘ Info` offengelegt. Externe ausführbare Plugins bleiben gesperrt, bis Herkunftsprüfung, Isolation, Capability-Durchsetzung und ein Update-/Rollback-Weg existieren.
- „Integriert“ heißt erst nach einem Ende-zu-Ende-Test gegen eine echte Gegenstelle; ein Katalogeintrag ist kein Nachweis. Aktueller Umsetzungsstand: Projektregister.

### 3a. Mastodon-/ActivityPub-Kompatibilität (Entscheidung vom 2026-10-26)

- **Etablierte Semantik vor Eigenlogik.** Wo ActivityPub oder Mastodon eine geeignete Semantik bereitstellen, wird keine eigene erfunden. Bestehende ActivityPub-Felder bekommen keine PartiUp-spezifische Bedeutung. Jedes föderierte Objekt muss von Mastodon semantisch korrekt interpretiert und dargestellt werden können.
- **Beitragssichtbarkeit nach Mastodon:** Public (sichtbar, auffindbar, in öffentlichen Feeds, föderierbar) · Quiet public (per Profil/Permalink sichtbar, nicht in Feeds, Explore oder Suche) · Followers (nur Follower und Erwähnte) · Private mention (nur ausdrücklich Adressierte). Vorhandene PartiUp-Stufen werden darauf abgebildet; keine parallelen Sichtbarkeitsklassen.
- **Spaces sind eine zusätzliche, restriktivere Policy-Ebene oberhalb** von ActivityPub/Mastodon, kein Ersatz. Der Space bestimmt, wer grundsätzlich sehen und handeln darf; die Beitragsebene bestimmt, wie ein Inhalt innerhalb dieser Grenzen sichtbar ist und föderiert wird.
- **Prüfkette:** Space-Policy → Rollenberechtigung → Beitragssichtbarkeit → ActivityPub-Adressierung (`to`/`cc`) → tatsächliche Zustellung. Keine nachgeordnete, weniger restriktive Einstellung darf eine übergeordnete aushebeln; keine implizite Eskalation von Sichtbarkeit.
- Geschlossene Spaces bleiben standardmäßig geschlossen. Ihre Inhalte werden nie allein durch eine Beitragseinstellung öffentlich oder föderiert; dafür braucht es eine ausdrücklich erlaubende Space-Policy und eine berechtigte Rolle. Unterräume erben nur, wo das ausdrücklich vorgesehen und nachvollziehbar ist.
- Sehen, Finden und Verteilen bleiben getrennte Fragen. In der Oberfläche heißen sie: „Wer kann diesen Inhalt sehen?“, „Wo kann er gefunden werden?“, „Darf er außerhalb dieses Spaces bzw. ins Fediverse?“.
- Security-, Privacy- und Kompatibilitätsarbeit ist keine Funktionsausweitung: keine neuen Social-Funktionen, kein größerer MVP, kein Mastodon-Nachbau, die Space-Struktur bleibt. Neue Funktionen nur, wenn sie zwingend nötig sind, um eine Lücke, Inkompatibilität oder einen Standardverstoß zu beheben.

## 4. Sicherheit, Privacy und Lieferkette (Release-Blocker)

Quellen: `PERMISSIONS-v0.8.9.md`, `PRIVACY-DATA-LIFECYCLE-P0.5.md`, `ACTIVITYPUB-USER-PRIVACY-P0.5.md`, `MODERATION-SAFETY-v0.9.md`, sowie mit PR #20 `SECURITY-UPDATE-AND-RECOVERY.md` und `RETROFIT-REVIEW-2026-10-20.md`.

- Least Privilege und Default Deny: Sichtbarkeit und Aktionsrecht serverseitig auf dem aktuellen Objekt im konkreten Space-Kontext prüfen (Rollen Owner > Admin > Moderator > Mitglied > Gast). UI-Ausblenden ist nur UX. Ein bekannter Bezeichner oder Medienlink ist keine Berechtigung.
- Rechte sind aktionsbezogen (Profil bearbeiten ≠ Zugang konfigurieren ≠ Mitglieder zulassen ≠ extern veröffentlichen). Nutzerfunktionen und Administration bleiben getrennt.
- Fehlendes Recht für Beteiligte → 403; Außenstehende → 404 ohne Sichtbarkeitsleck, einheitlich für Detail, Listen, Suche, Feeds, Verknüpfungen, Medien und Export.
- Space-Sichtbarkeit, persönliche Föderationsfreigabe (Opt-in, Standard aus) und Objektveröffentlichung sind getrennt. Geschlossene Spaces veröffentlichen nur ausdrücklich freigegebene Inhalte; keine impliziten privaten Antworten, Profile oder Mitgliederlisten. Remote-Eingaben sind nicht vertrauenswürdig (Signaturen, SSRF-Schutz, Limits, fail-closed).
- Export und Kontolöschung folgen der Löschmatrix; Inhalte anderer Personen werden nicht mitgelöscht. Moderation trennt Melden, Prüfen und Maßnahme.
- Nutzerinhalte im Frontend immer über `esc()`/`escAttr()` ausgeben.
- Bestehende Bibliotheken und Standards nutzen; keine eigene Identitäts-, Rollen-, Kryptografie- oder Update-Vertrauenslogik erfinden.
- Abhängigkeiten und GitHub Actions exakt pinnen; Lockfile führend. Installation mit `npm ci --ignore-scripts`, danach Registry-Signaturen und Audits prüfen (ab PR #20). `ignore-scripts` nicht global aufheben, nie `npm audit fix --force`. Updates nur nach Prüfung von Herkunft und Diff und mit menschlicher Freigabe; ein kompromittierter offizieller Kanal ist Teil des Bedrohungsmodells.
- Keine Tokens, Kennwörter, personenbezogenen Daten oder vertraulichen Logs committen.

**Laufzeit und Abhängigkeiten (ergänzt 2026-10-26)**
- Node.js nur in einer unterstützten LTS-Linie und auf dem jeweils abgesicherten Patchstand, exakt festgelegt (CI, `engines`, `.nvmrc`); kein offenes „24“ oder `latest`. Security-Releases werden zeitnah übernommen; Major-Wechsel nie blind. Alte und neue Version samt Grund werden dokumentiert, danach laufen alle Tests.
- Für sicherheitsrelevante Deployments keine ungeprüften `latest`-Tags; Signaturen, Herkunft (Provenance) und Hashes prüfen, reproduzierbare Builds soweit praktikabel, kompromittierte Releases müssen sich schnell sperren lassen. Die Anforderung signierter Pakete bleibt verbindlich.

**Secrets (ergänzt 2026-10-26, Lehre aus dem LiteLLM-Vorfall)**
- Keine Zugangsdaten im Repository, in Logs, in KI-Prompts oder KI-Ausgaben. Bei möglicher Offenlegung nicht nur löschen, sondern **sofort widerrufen bzw. rotieren**.
- Secrets nur mit minimalem Scope; persönliche Owner-Tokens nicht für Automatisierung.

**CI/CD und Release**
- Build und Release getrennt; Veröffentlichungsrechte minimal; Release-Workflows akzeptieren keine fremden Quell-Repositories und sind besonders geschützt.
- Branch-Schutz und vergleichbare Schutzmechanismen dürfen nicht durch normale Entwickler- oder Agentenkonten deaktivierbar sein. Kritische Releases mit getrennten Identitäten bzw. Freigabeschritten.

**Least Privilege rückwirkend für alles**
- Nutzerrollen, Space-Admins, globale Admins, Plugins, Integrationen, ActivityPub-Komponenten, Datenbankzugriffe, Hintergrundprozesse, CI/CD, KI-Agenten, API-Tokens und Service-Accounts erhalten nur die Rechte ihrer konkreten Aufgabe. Die Kompromittierung eines Plugins oder Integrationsdienstes darf nicht automatisch Zugriff auf die gesamte Plattform geben.

**Zugriffsgrenzen und Sitzungen**
- Für jeden Endpunkt ist festgelegt und getestet, ob er öffentlich, nur angemeldet, nur für Space-Mitglieder, nur für bestimmte Rollen oder nur administrativ ist; geprüft werden auch direkte API-Aufrufe, manipulierte URLs, Chat, Dateien, Suche, Benachrichtigungen, Exporte, ActivityPub-Endpunkte und Hintergrund-Requests nach Logout. Ein ausgeblendeter Button ist keine Zugriffskontrolle.
- Nach Logout: Sitzung serverseitig ungültig, geschützte API-Aufrufe scheitern, Chat-Verbindungen getrennt, geschützte Inhalte nicht mehr veränderbar, alte UI-Zustände und Backdrops verschwinden, Browser-Zurück stellt keine Sitzung wieder her. Nutzerwechsel wird ausdrücklich auf Session-Leakage getestet.

**KI-gestützte Entwicklung**
- KI-Agenten gelten als nicht vollständig vertrauenswürdige Werkzeuge: Datei- und Netzwerkzugriff so eng wie praktikabel, keine Produktions-Secrets, keine dauerhaften Owner-Tokens, sensible Ausgaben nicht dauerhaft loggen.
- Codeänderung, Test und Produktionsfreigabe sind getrennt. Ein Agent darf Schutzmechanismen nicht deaktivieren und nicht zugleich Code ändern, Sicherheitskontrollen abschalten und einen Release veröffentlichen.

## 5. Arbeitsweise

- `main` nicht direkt ändern. Ein thematisch abgegrenzter Branch und ein Pull Request pro fachlich zusammenhängender Änderung; Merge und Release nur mit menschlicher Freigabe.
- Vor jeder Aufgabe die relevante Fach-, Architektur- und QA-Dokumentation lesen, beginnend mit `docs/AI-COLLABORATION.md` und `docs/PROJECT-REGISTER.md`. Produkt- und Architekturannahmen mit bestehenden Dokumenten belegen; bei Widersprüchen Implementierung, dokumentierte Entscheidungen und offene PRs vergleichen und Unklarheiten offenlegen.
- Vor jeder Änderung: aktuellen `main`-Commit, offene PRs und betroffene Dateien prüfen; bestehende Arbeiten nicht versehentlich überschreiben. Dateien, die ein offener PR bereits ändert, nicht parallel in einem zweiten PR ändern, ohne das im Projektregister abzustimmen.
- Vor jeder Änderung benennen: erwartetes Nutzerverhalten, betroffene Space-Typen, Ansichten, Geräte, Rechte-, Privacy- und Föderationsgrenzen, Teststrategie. Fachbegriffe für die projektverantwortliche Person kurz erklären.
- Klein ändern, keine Überschreibung ganzer Dateien, keine unaufgeforderten Refactorings, Versionssprünge oder Massenformatierungen. Ausnahme: Ein berührter Codepfad darf im selben PR verhaltensgleich modernisiert werden, wenn das im PR benannt und getestet ist (siehe §7).
- Rollen, Ablauf und PR-Vorlage: `docs/AI-COLLABORATION.md`. Entscheidungen und Arbeitsschritte: `docs/PROJECT-REGISTER.md` (anhängen, nicht umschreiben).

## 6. Tests und Freigabe

Quellen: `QA-RELEASE-PROCESS.md`, `QA-FAST-FULL.md`, `GOLD-STANDARD-BROWSER-QA-P0.16.0-QA2.md`.

- **Produktfehler zuerst rot reproduzieren**, dann minimal korrigieren, dann grün, dann alle betroffenen Gates. Tritt ein Fehler nur in einer bestimmten Umgebung auf (z. B. nur in der Linux-CI), ersetzt ein gesichertes CI-Artefakt (Screenshot, Trace) den lokalen Rot-Nachweis.
- Jede Störung einordnen: Produkt-, Test-, Umgebungsfehler oder geteilte Ursache, mit Beleg. Eine Testkorrektur darf kein echtes Nutzerproblem verdecken.
- Ehrliche QA: keine Retries, `force`-Klicks, pauschalen Wartezeiten, erhöhten Timeouts, Login-/API-Bypässe oder gelockerten Limits. Bereitschaft am sichtbaren UI-Zustand messen, nicht an HTTP 200. Zeitabhängige Fehler werden mit gezielt zurückgehaltenen Antworten reproduziert, nicht mit Wartezeiten.
- **Robuste statt starrer Tests:**
  - Neue Prüfungen testen beobachtbare Wirkung (HTTP-Status, Daten, gespeicherter Zustand, sichtbares Ergebnis). Keine neuen Zeichenkettenprüfungen am Quelltext (`app.includes('…')`), außer für anders nicht prüfbare Invarianten, dann mit Begründung.
  - Browser-Tests bedienen wie ein Mensch: Rolle und zugänglicher Name, sichtbarer Titel oder ausdrücklich als Testvertrag gedachte `data-*`-Attribute; nicht Kartenmitte, CSS-Klassen, DOM-Position oder starre Tabnamen. Karten öffnen über `openCardByTitle` (`tests/helpers/app.js`, ab PR #20).
  - Ist ein roter Test an die Umsetzung gekoppelt, wird er auf Verhalten umgeschrieben statt den neuen Wortlaut nachzutragen. Blockiert ein Zeichenketten-Preflight eine verhaltensgleiche Änderung, wird diese Prüfung im selben PR durch eine Verhaltensprüfung ersetzt.
  - Flexibler heißt nie schwächer: Sicherheits-, Privacy- und Rechteaussagen bleiben mindestens gleich streng. Ein gelockerter Test braucht eine Gegenprobe, die zeigt, dass er noch anschlägt.
- **Security-Regressionstests:** Jede Security-Korrektur bekommt nach Möglichkeit einen Regressionstest, insbesondere für Authentifizierung, Rollen, Sichtbarkeit, Space-Vererbung, Föderation, Blockierung, Nutzerwechsel, Logout, CSRF, Stored XSS, Rate-Limits, Privacy-Export/-Löschung, Plugin-Berechtigungen, ActivityPub-Auslieferung und Secret-Exposure. Getestet wird nicht nur die Oberfläche, sondern auch API, Datenbankzustand und tatsächliche ActivityPub-Auslieferung.
- **Privacy-Boundary-Matrix** (mindestens): öffentlicher Space mit öffentlichem, Quiet-public- und eingeschränktem Beitrag; geschlossener Space mit internem Beitrag, versuchter Veröffentlichung ohne Berechtigung und ausdrücklich erlaubter Veröffentlichung; geschlossener Unterraum in öffentlichem Space; Rollenwechsel nach Veröffentlichung; Mitglied verlässt Space; blockierte Person; anonymer Zugriff; direkter Permalink; Zugriff über ActivityPub bzw. fremde Instanz; Mastodon-Nutzer empfängt öffentlichen Beitrag; Mastodon-Nutzer erhält keinen nicht für ihn bestimmten Inhalt.
- Vorgehen pro Prüfbereich: Ist-Zustand feststellen → Abweichung benennen → Standard/Konvention bestimmen → minimale Änderung → umsetzen → Tests ergänzen → Regressionen ausführen → Nebenwirkungen prüfen → dokumentieren. Keine bestehende Privacy-, Security- oder Föderationsregel stillschweigend entfernen.
- Desktop- und Mobile-Annahmen nie in einem Test mischen (Desktop = Seitenleiste, Mobile = untere Navigation/Drawer). Visual-Baselines nur nach bewusster Sichtprüfung aktualisieren. Rechte-/Privacy-Änderungen brauchen einen serverseitigen Negativtest; neue Ansichten einen Smoke- oder Layout-Test.
- Gates vor einem Merge: Lieferkette und Audits, `preflight`, `qa:security`, `qa:smoke`, `qa:layout`, `qa:accessibility`, `qa:gold` auf dem exakten PR-Head. Werden mehrere PRs nacheinander gemergt, laufen die Gates danach einmal auf dem neuen `main`.
- Nicht Ausgeführtes ausdrücklich als **nicht ausgeführt** kennzeichnen. Ohne echten Chromium-Lauf auf Desktop und Mobile keine Freigabe. Ein grüner Prototyp-Goldlauf ist keine Produktions-, DSGVO- oder WCAG-Freigabe.

## 7. Menschliche Übernahme (verbindliches Architekturziel)

PartiUp muss jederzeit von einem qualifizierten menschlichen Team ohne ChatGPT, Claude oder historische Chats weiterentwickelt werden können. Wartbarkeit, Sicherheit und Betriebsfähigkeit sind Qualitätsanforderungen (Orientierung: ISO/IEC 25010, NIST SSDF, OWASP ASVS; Konformität nie ohne Audit behaupten).

- Verantwortungsgrenzen anstreben: Routen, Anwendungsdienste, Fachregeln und Berechtigungen, Datenzugriff, Infrastruktur und Föderation getrennt. `server/server.js` und `server/db.js` **schrittweise und verhaltensgleich** abbauen, keine Komplettneuschreibung.
- Zielbild: HTTP-Router → Anwendungsdienst → Domain/Policy → Repository-Vertrag → SQLite-Adapter; kein pauschales ORM.
- Neu extrahierte Fachlogik importiert keine SQLite-API und kein SQLite-spezifisches SQL; Datenzugriff hinter dokumentierte Repository-/Adapter-Verträge. Bestehenden SQLite-Code bis zum kontrollierten Ersatz weiter betreiben. Ein Datenbankwechsel ist erst vorbereitet, wenn ein zweiter Adapter dieselben Vertragstests besteht. Migrationen versioniert, mit Integritäts-, Backup-/Restore- und Rückfallstrategie; kein produktiver Datenbankwechsel ohne gesonderte Freigabe.
- Neue Module dokumentieren Schnittstellen, Datenflüsse, Verantwortliche, Fehlerfälle und Tests. Neue Funktionen koppeln sich nach Möglichkeit nicht weiter an die Monolithen.
- Wartbarkeitsaufgaben sind erst erledigt, wenn ein produktiv genutzter Codepfad umgestellt ist und Regressionstests bestehen; Markdown, leere Verzeichnisse oder ungenutzte Abstraktionen zählen nicht.
- Bei jeder neuen Fachfunktion prüfen, ob eine günstige Modernisierung eines berührten Codepfads möglich ist, ohne notwendige Sicherheits- oder Stabilitätsaufgaben zu verdrängen; begründete Ausnahmen im PR benennen.
- Reihenfolge, Abnahmekriterien und Fortschritt: `docs/HUMAN-HANDOVER-ROADMAP.md`. Die Priorität gegenüber Sicherheit, Föderations-PoC und MVP regelt das Projektregister.

## 8. Übergabe

Jeder PR beschreibt nach der Vorlage in `docs/AI-COLLABORATION.md`: Ziel, Ausgangsstand (Branch/Commit), Änderungen, betroffene Bereiche, Security-/Privacy-/Föderationswirkung, ausgeführte Tests mit Ergebnis und Umgebung, nicht ausgeführte Prüfungen, Risiken, offene Punkte und notwendige Freigaben.
