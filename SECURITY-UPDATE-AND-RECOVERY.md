# Geprüfte Updates, Release-Vertrauen und Wiederherstellung

## Bedrohungsmodell und Freigabe

Ein Angreifer kann einen offiziellen Download-/Registry-/Update-Kanal, einen
Maintainer-Account oder eine Build-Abhängigkeit kompromittieren. HTTPS, eine
Prüfsumme aus demselben ZIP und eine Registry-Signatur allein genügen deshalb
nicht. Ein aus anderem, geprüftem Kanal festgehaltener erwarteter Source-Commit,
zulässige Builder-Identität und die Tests dieses Commits gehören zur Entscheidung.

Es gibt aktuell keinen automatischen Updater und keinen externen Code-Plugin-
Installer. Diese Wege bleiben geschlossen. Bei künftigem automatischem Update
eine vorhandene TUF-/Sigstore-Lösung verwenden, einschließlich unabhängiger
Vertrauenswurzel und Schutz vor Rollback-/Freeze-Angriffen, statt eigener Signatur-
oder Versionsprotokolle.

Der Testjob besitzt nur `contents: read`, kein Release-Secret und keine
Signierrechte. `npm ci --ignore-scripts` installiert nur das Lockfile. Danach
Registry-Signaturen und Audits prüfen. Nur `better-sqlite3` gezielt aus dem
verifizierten Quellpaket bauen; seine zusätzlichen vorgebauten GitHub-Downloads
werden damit nicht als ungeprüfter Zweitkanal ausgeführt. Der optionale
macOS-`fsevents`-Installationshook wird nicht ausgeführt. Keine automatische
Dependency-/Action-Freigabe nur aufgrund eines offiziellen Absendernamens.

## Release-Kandidat

Workflow `PartiUp Goldstandard` auf `main` manuell starten; `release=true` und
den **vorher unabhängig geprüften vollständigen Commit** als `approved_sha`
angeben. Signierung findet erst nach allen Tests im separaten Job statt.
`release-signing` muss Betreiber-Review verlangen; Branch-Schutz und verpflichtende
Checks sind im Repository tatsächlich zu konfigurieren. Vor deren Nachweis gibt
es keine behauptete gehärtete Vertriebsstrecke.

Der Kandidat enthält das exakte versionierte Quellpaket, eine CycloneDX-
Abhängigkeitsliste und ein Manifest. Laufzeitdaten, Uploads, DBs, Sitzungsdateien
und private Schlüssel sind ausgeschlossen. Alle drei Dateien werden attestiert.
Ein Signaturfehler verhindert den Upload als signierten Release; kein unsignierter
Fallback. Für ein privates Repository setzt diese GitHub-Funktion Enterprise
Cloud voraus. Den Tarif nicht stillschweigend ändern oder das Repository öffentlich
schalten; bis zur geklärten Signierfähigkeit bleibt externe Verteilung blockiert.

## Verifikation vor Entpacken oder Ausführen

GitHub CLI aus bereits vertrauenswürdiger Installation verwenden. Niemals zuerst
ein Prüfsystem/Skript aus dem gerade heruntergeladenen ungeprüften Archiv starten.
Den erwarteten Commit nicht allein aus dem heruntergeladenen Manifest übernehmen.

```sh
gh attestation verify partiup-source.tar.gz \
  --repo BammBammoriginal/PartiUp \
  --signer-workflow BammBammoriginal/PartiUp/.github/workflows/goldstandard.yml \
  --source-ref refs/heads/main \
  --source-digest VORHER_UNABHAENGIG_GEPRUEFTER_40_STELLIGER_COMMIT \
  --signer-digest VORHER_UNABHAENGIG_GEPRUEFTER_40_STELLIGER_COMMIT \
  --deny-self-hosted-runners
```

Manifest und `sbom.cdx.json` mit denselben Identitäts-/Commit-Parametern separat
verifizieren. Danach die im verifizierten Manifest genannten SHA-256-Werte
vergleichen. Ein gültiger Builder ist kein Malware-Freibrief: Source-/Lock-/Workflow-
Review und Vulnerability-Gates bleiben erforderlich. Alte Artefakte nur als
ausdrücklich freigegebene Rollback-Version verwenden; kein automatisches Downgrade.

## Installation

Node 24 LTS und npm verwenden. Nach erfolgreicher Release-Prüfung:

```sh
npm ci --ignore-scripts
npm run supply-chain-preflight
npm audit signatures
npm run audit:prod
npm run audit:all
npm run deps:build
npm run preflight
npm run qa:full
```

Für native SQLite-Builds benötigt Windows Python und Visual Studio C++ Build Tools,
Linux eine passende C++-Toolchain und Node-Header. Fehlende Voraussetzungen sind
ein Setup-Fehler; kein Grund für `ignore-scripts=false` auf allen Abhängigkeiten
oder einen unkontrollierten Binärdownload. Setups/Buildausgaben enthalten keine
Produktionsdaten. Dependency-/Codeprüfung nicht mit Produktions-Secrets ausführen.

## Backup vor Update / Rollback

1. Dienst kontrolliert stoppen, schreibende Hintergrundjobs beenden; keine laufende
   WAL-Datenbank nur per Dateikopie sichern. Entweder konsistente Volume-Snapshots
   oder die SQLite-Backup-API/CLI verwenden. Beispiel: `sqlite3 QUELLE.db ".backup ZIEL.db"`.
2. Datenbank, dazugehörige privaten und öffentlichen Medien und verschlüsselte
   Actor-Key-Verzeichnisse gemeinsam auf zugriffsbeschränktem, verschlüsseltem
   Speicher sichern. Aktive BUP_DB_PATH-/Key-Dir-Konfiguration berücksichtigen.
3. Master-Key/Secret-Manager-Konfiguration getrennt escrowen und zugriffsbeschränken;
   nicht im selben Archiv, Quellpaket, Git oder Testnachweis speichern. Backup ohne
   wiederherstellbares Schlüsselmaterial ist keine ausreichende Sicherung.
4. Freigegebenen Code-Commit, Lockfile, Schema-/Appversion, Datei-Inventar und
   Digests im vertrauenswürdigen Backup-Katalog festhalten. Retention und sichere
   Löschung dieser personenbezogenen Sicherungen organisatorisch festlegen.
5. Wiederherstellung in isolierter Umgebung üben: SQLite `integrity_check`, reale
   Dateipräsenz, Rollen/Privacy, Anmeldung, Lesen/Schreiben und Actor-Key-Paarung
   prüfen. Die synthetischen Recovery-/Goldtests ergänzen diesen Betriebsnachweis,
   ersetzen aber keine Restore-Übung auf der tatsächlichen Zielinfrastruktur.

## Wiederherstellung / Rollback

Dienst stoppen. Passenden **verifizierten** Code und das zugehörige DB-/Medien-/
Key-Backup in ein neues isoliertes Verzeichnis/Volume wiederherstellen. Master-Key
über Secret-Manager bereitstellen; Digest-/Schema-/Integritäts- und Funktionstests
vor Umschaltung ausführen. Erst danach kontrolliert umschalten. Nicht ein neues
Schema blind mit altem Code öffnen; dokumentierte kompatible Migration oder
vollständige zusammengehörige Sicherung verwenden. Keine automatische neue
Actor-Identität/kein neues Schlüsselpaar bei verlorenem Material erzeugen.

Nach kompromittiertem Kanal: Verteilung/Updates anhalten, betroffene Artefakte und
Abhängigkeiten identifizieren, Vertrauenswurzel außerhalb dieses Kanals prüfen,
betroffene Credentials/Schlüssel kontrolliert rotieren und einen unabhängig
geprüften, getesteten Stand wiederherstellen. Bereits fremd gespeicherte
Föderationskopien können lokal nicht zuverlässig zurückgerufen werden.

## Noch notwendige Betreiber-Nachweise

Branch-/Environment-Schutz, unabhängige Release-Freigabe, tatsächliche GitHub-
Attestationsfähigkeit oder eine separat freigegebene Standardsignierstrecke,
Schlüssel-Escrow, verschlüsselter Backup-Speicher, Restore-Zeitziele und eine
erfolgreiche Wiederherstellung auf dem Zielsystem. Diese Punkte werden nicht
durch Dokumentation als erledigt deklariert.
