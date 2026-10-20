# Rückwirkender Core-Abgleich: 20.10.2026

## Verifizierter Ausgangspunkt

- Repository: BammBammoriginal/PartiUp; `main` steht auf
  `f185fcb404a4de80ce1139123d1b30dcaf6e0a90`, Paketversion 0.16.28.
- PR #16 und #17 sind zum Prüfzeitpunkt **offen**, nicht in main enthalten.
  #17 (`6a1bbc5633a67875f0543a8b02d6c80284ac3244`) enthält #16 und wurde als
  Grundlage dieser Nachrüstung verwendet. Die Nachrüstung wird gegen main
  angeboten und enthält die Vorgängerkorrekturen; kein separater Merge nötig.
- Frühere Testergebnisse werden nicht als neue Freigabe übernommen. Maßgeblich
  ist der vollständige neue Lauf auf dem Head der Nachrüstungs-PR.
- Verbindliche Quelle: ausdrücklicher Nutzerauftrag vom 20.10.2026 einschließlich
  rückwirkender Geltung; vorhandene Architektur-, Security-, Privacy- und QA-Dokumente.
  Die Verlaufssuche war nur teilweise verfügbar; daraus wird keine Vollständigkeit
  zusätzlicher, außerhalb dieses Auftrags nicht vorliegender Chatentscheidungen behauptet.

## Geprüfter Bestand

Server/API und SQLite-Schema/Projektionen; Anmeldung, Registrierung, Sessions und
CSRF; Community-/Projekt-/Event-/Beteiligungsrechte; persönliche Privacy und
soziale Verbindungen; Medien und Chats; ActivityPub-Profile, Inbox, Outbox,
Versandwarteschlangen, SSRF, Peer-Policies und Schlüssel; statische Erweiterungs-,
Connector- und Integrationskataloge; Frontend-Verwaltung und Mobile-Gates;
Lockfile, Build-/Setup-/Release-Skripte und die automatisierten Testgruppen.

## Befunde und rückwirkende Anpassungen

Die Einstufung beschreibt die Abweichung im Ausgangscode, nicht einen schon
produktiv ausgerollten Fix. „Korrigiert“ bedeutet im Änderungsvorschlag umgesetzt;
Abnahme erst nach dem vollständigen Lauf und Merge.

| ID | Einstufung | Ausgangsabweichung | Nachrüstung / Nachweis |
|---|---|---|---|
| R01 | kritisch – sofort anpassen | Private Space-/Projekt-/Profilbilder wurden über `express.static` ohne Objektprüfung ausgeliefert. Ein bekannter Link umging die Privacy-Grenze. | Medien erben die aktuelle Sichtbarkeit ihres verknüpften Objekts, kein öffentlicher Cache; ausdrücklich veröffentlichte Föderationsanhänge bleiben erreichbar. HTTP-Negativtests und Widerruf desselben Links. |
| R02 | kritisch – sofort anpassen | Öffentliche Projekt-/Event-/Beteiligungsübersichten konnten Namen/IDs privater verknüpfter Objekte zeigen. | Zielobjekte und Community-Relationen durch bestehende Typ-Policies filtern; Aufgaben nur mit `task.view`. Öffentliche und berechtigte Gegenproben. |
| R03 | kritisch – sofort anpassen | Profilbearbeitung diente als Sammelrecht für Zugang, Aufnahmeentscheidungen und Einrichtung; spätere Bearbeitung eigener Beiträge umging entzogene Schreibrechte. | Getrennte Aktionsrechte plus aktuelle Sichtbarkeit. Server-Negativtests, effektive Mitgliedsrollen und Rechte in allen Detail-/Mutationsantworten. |
| R04 | kritisch – sofort anpassen | Scope-Leserechte wurden nicht von allen Listen/Feeds berücksichtigt. | Gemeinsame Scope-Entscheidung in Detail, Projektion, Relationen und lokalem Feed. Lese-Widerruf mit Bootstrap-Gegenprobe. |
| R05 | kritisch – sofort anpassen | Wartende Veröffentlichungen versendeten alte JSON-Kopien trotz geändertem Inhalt oder widerrufener Freigabe. | Veröffentlichung direkt vor Versand neu aufbauen/prüfen; entzogene Freigaben terminal verwerfen und Warteschlangeninhalt leeren. Test ohne externen Netzwerkzugriff. |
| R06 | kritisch – sofort anpassen | Kommentare erbten die Veröffentlichbarkeit des Elternbeitrags auch bei persönlichem Opt-out bzw. innerhalb geschlossener Spaces. | Eigene persönliche Föderationsfreigabe erforderlich; geschlossene Antworten werden ohne eigene Objektfreigabe nicht föderiert. Interne Kommentarfunktion bleibt erhalten. |
| R07 | relevant – vor nächstem Release anpassen | Private Group-Profile und automatisch aus Namen gebildete Handles konnten interne Namen/Beschreibungen nach außen tragen. | Minimale private Group-Metadaten, nicht entdeckbar, opaker Handle; kanonische Actor-URI bleibt unverändert. Bereits externe Kopien werden dadurch nicht rückholbar. |
| R08 | kritisch – sofort anpassen | Selbstlöschung entfernte eigene User-Queues, aber nicht zwingend verschachtelte eigene Inhalte in Group-Queues/Aktivitäten. | Strukturierte Subject-/Objektzuordnung auch in Group-Payloads, transaktionales Entfernen. Löschintegration prüft Originalinhalt in beiden Ablagen. |
| R09 | relevant – vor nächstem Release anpassen | Gemeinsame Kontakte konnten eine dritte Person trotz ihrer eigenen Privacy-Einstellung identifizieren; öffentlich freigegebene Follow-Graphen prüften private Zielobjekte nicht erneut; Medienprojektionen enthielten Originaldateinamen/Storage-Schlüssel. | Dritte Person separat prüfen; Medien-Daten minimieren. Versteckte und ausdrücklich sichtbare Kontakte getestet. |
| R10 | relevant – vor nächstem Release anpassen | Bekannte private Bildlinks und Reaktionen konnten eine abgelaufene Unterhaltung überleben. | Ablauf auch an Medien-/Reaktionsgrenze prüfen; Mitglieder verlieren den Zugriff bei Ablauf. Eigene Löschmöglichkeit bleibt bestehen. |
| R11 | relevant – vor nächstem Release anpassen | Manuelle SSRF-IP-Liste deckte reservierte/IPv6-Übergangsbereiche nicht vollständig ab. | Bereits vorhandenes, nun direkt gepinntes `ipaddr.js` statt Spezialliste; öffentliche, private, gemischte DNS- und Übergangsadressen getestet. |
| R12 | relevant – vor nächstem Release anpassen | Allgemeine Rate-Limit-Map hatte keine harte Obergrenze für lebende Schlüssel. | Speicher begrenzen, ohne laufende Quoten durch Verdrängung zurückzusetzen; Last-/Ablauf-Unit-Test. Bestehende Login-/Schreiblimits nicht erhöht. |
| R13 | kritisch – sofort anpassen | Produktionsmodus erlaubte explizite Rückkehr zu SQLite-Privatschlüsseln; unbekannter Store-Modus konnte Rotation auf Klartext zurückfallen lassen. | Produktions- und Modusprüfung, Public-/Private-Key-Abgleich, keine stille Ersatzgenerierung. Verschlüsselte Migration, Rotation, falscher Master-Key und Inkonsistenz getestet. KMS/HSM wird nicht als implementiert ausgewiesen. |
| R14 | relevant – vor nächstem Release anpassen | Unvollständige/fehlerhafte Zugangs-Patches konnten Sichtbarkeit wieder auf öffentlich setzen. | Fehlende Felder erhalten den aktuellen Wert, ungültige Regeln werden abgewiesen; Community- und Event-Gegenprobe. |
| R15 | relevant – vor nächstem Release anpassen | Lokaler Remote-Objekt-Inspektionsendpunkt zeigte auch moderierte/inaktive Inhalte. | Dieselbe Aktiv-/Moderationsgrenze am Inspektionsendpunkt. Negativtest. |
| R16 | relevant – vor nächstem Release anpassen | UI bot teilweise Konfiguration, Uploads und Hintergrundanfragen ohne entsprechendes Einzelrecht an. Mutationsantworten konnten Rechte verlieren. | Capabilities in allen Objektantworten; Verwaltung und Nutzerfunktionen getrennt; Module, Zugänge, Erweiterungen und Uploads gezielt anzeigen. Zwei echte Konten mit Profilbearbeitungsrecht ohne Konfigurationsrechte auf Desktop/Mobil. |
| R17 | relevant – vor nächstem Release anpassen | CI-Goldlauf ließ Audit, Signaturen und zusätzliche Smoke-/Layout-/DOM-Gates aus; App-Runtime noch Node 22. | Node 24, Signaturen/Audits vor nativem Build, vollständige relevante Tests; bestehende 43 Goldfälle bleiben erhalten/werden inhaltlich erweitert. |
| R18 | kritisch – sofort anpassen | Setups benutzten `npm install` und unbeschränkte Installationsskripte; native Zweitdownloads waren nicht durch das Lockfile abgesichert. | `npm ci --ignore-scripts`, Signaturen und exakte Lock-/Origin-/Integrity-Policies; nur SQLite gezielt aus geprüftem Quellpaket bauen. Windows-Buildvoraussetzungen offen benannt. |
| R19 | relevant – vor nächstem Release anpassen | Keine verbindliche Release-Authentizitätsprüfung, Inventarliste oder erzwungene Signatur vor Verteilung. | Manueller, nach Tests getrennter Attestationsjob; Quellpaket/SBOM/Manifest, exakter freigegebener Commit, keine Daten/Secrets, kein unsignierter Fallback. Tatsächlicher Signierbetrieb bleibt gesondert offen. |

## Bereits korrekt abgedeckt und beibehalten

- Serverseitige Passwortprüfung mit scrypt; zufällige, in der DB gehashte
  Sitzungstoken, Rotation beim Login, SameSite=Strict, Secure in Produktion.
  Login-CSRF und gleiche Login-Fehlermeldung, Anmeldung im echten Browser.
- Restriktive persönliche Privacy-/Föderations-Defaults, separate Objekt-/Space-
  Veröffentlichung, explizite Freigabe einzelner Inhalte geschlossener Spaces.
- Inbox-Signatur-/Digest-/Actor-Prüfungen, Replay-/Ressourcengrenzen, HTTPS,
  gepinnte DNS-Antwort und begrenzte Remote-Größen/Timeouts; keine Redirect-Kette.
- Export ohne Passwort-/Sitzungs-/private Signierschlüssel; transaktionale
  Löschmatrix und wiederaufnehmbare physische Dateilöschung; Erhalt fremder Inhalte.
- CSP, Ausgabe-Escaping, gespeicherte XSS-Payloadtests, Bild-Reencoding/
  Pixelgrenzen und getrennte private Chatmedien.
- Action-Commit-Pins, Read-only-Testtoken, keine Checkout-Credentials,
  keine Produktions-Secrets in PR-Tests; neue Signierrechte nur im separaten Job.
- Verfügbare Erweiterung ist ein fest versionierter First-party-Linkbaustein.
  Fremde Connectoren/Plugins sind geplant und nicht installierbar/ausführbar.
  Capability-/Datenzugriffsbeschreibungen sind keine behauptete Code-Sandbox.
- Produktion verweigert Demo-Konten und unbewusst aktiviertes SQLite; diese
  Schranken werden für die Tests nicht gelockert.

## Offen / weitere Prüfung nötig – keine Freigabebehauptung

1. GitHub-Branch-/Environment-Schutz und verpflichtende Review-Regeln konnten
   mit der Integration nicht gelesen werden (403). Betreiber muss diese tatsächlich
   einrichten und nachweisen; eine CODEOWNERS-/Workflow-Datei ersetzt die Einstellung nicht.
2. GitHub-Attestationen für private Repositories setzen laut Hersteller Enterprise
   Cloud voraus. Konto-/Planfähigkeit, geschütztes `release-signing`-Environment,
   erster signierter Release und unabhängige Verifikation sind noch nicht belegt.
   Unsigned ZIPs und nackte Checksummen sind kein Ersatz.
3. Alle alten Komponenten müssen zusätzlich zur aktuellen Audit-Datenbank weiterhin
   gegen aktiv ausgenutzte Probleme, Herkunft und Maintainer-/Kanal-Kompromittierung
   bewertet werden. Registry-Signatur und Provenienz beweisen keine Harmlosigkeit.
4. Betreiber-Wiederherstellung auf realem verschlüsseltem Speicher, Master-Key-
   Escrow, Aufbewahrungs-/Löschfristen, Rollback über unterschiedliche Schemaversionen
   und Disaster-Recovery-Zeitziele sind nicht durch einen synthetischen Test bewiesen.
   Der Test prüft SQLite-Snapshot, verschlüsselte Actor-Keys und Medienkopie gemeinsam.
5. Echte Instanz-zu-Instanz-Interoperabilität über eigene HTTPS-Domain, reale Peers
   und Schlüsselwechsel ist nicht in einer lokalen Suite nachgewiesen.
   Entfernte Kopien und bereits exponierte Metadaten können nicht zurückgeholt werden.
6. Ownership-Übergabe bei Löschung des letzten Space-Owners, rechtlich/fachlich
   gewollte Retention gemeinsamer Inhalte und Fresh Authentication für sensitive
   Verwaltungsaktionen brauchen eine ausdrückliche Betriebs-/Produktfestlegung.
   Es wird kein automatischer neuer Owner und keine neue Identitätslogik erfunden.
7. Externe ausführbare Plugins bleiben gesperrt. Vor einem Loader sind Herkunfts-
   und Signaturprüfung, konkrete Laufzeit-Isolation, Capability-Enforcement,
   Berechtigungswiderruf und getesteter Update-/Rollback-Pfad erforderlich.
8. Windows-/Android-Tastaturlayout (insbesondere Strg+Alt+Q), echte Screenreader,
   visuelle Baseline-Abnahme, Produktionslast, parallele Upload-/Backup-Last und
   PostgreSQL-Migration bleiben eigene Nachweise. DOM-Tests sind kein WCAG-Audit.
9. Die früher gemeldeten Benachrichtigungsaktionen, vollständige Stimmrücknahme
   und Geräteaktualisierung werden durch dieses Security-Retrofit nicht als erledigt
   ausgegeben. Der fachliche Ausbau der README-Modulgrenzen bleibt separat.

## Test- und Goldnachweis

Der aktuelle PR-Head muss `preflight`, Registry-Signaturen, beide Audits,
`qa:security` einschließlich Retrofit-/Key-/Recovery-Tests, `qa:gold`, Smoke,
Layout und Accessibility bestehen. Einzeltests/alte Runs sind kein Gesamtnachweis.
Der konkrete erfolgreiche Run und Commit werden an der PR und im Abschlussbericht
benannt. Ein solcher Prototyp-Goldstand ist ausdrücklich keine Produktions-,
DSGVO-, WCAG-, Supply-Chain- oder Live-Föderationszertifizierung.

## Manuelle Abnahme nach Merge

Zwei Browser/Konten, zusätzlich ein Mobilgerät: Rolle auf Gast setzen und alte
Schreib-/Abstimmungsansicht benutzen; Profilbearbeitung ohne Zugangs-/Modulrechte
prüfen; privates Bild im berechtigten Konto öffnen, denselben Link unangemeldet
prüfen, Sichtbarkeit wechseln und erneut prüfen; öffentliche/versteckte verknüpfte
Objekte vergleichen; Kontowechsel mit offenem Space/Chat durchführen; private
Kommentare an explizit veröffentlichten Elternbeiträgen extern gegenprüfen.

## Verwendete Standards / Primärquellen

- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html
- https://docs.npmjs.com/verifying-registry-signatures
- https://docs.npmjs.com/cli/v11/commands/npm-ci/
- https://docs.npmjs.com/cli/v11/commands/npm-sbom/
- https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
- https://cli.github.com/manual/gh_attestation_verify
- https://theupdateframework.io/
