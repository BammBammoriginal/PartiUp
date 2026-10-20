# Aktueller sicherer Installationsweg (20.10.2026)

Node.js 24 LTS verwenden. Vor dem Entpacken eines Releases die Attestation gegen
Repository, Workflow und einen unabhaengig freigegebenen Commit verifizieren:
[Update- und Wiederherstellungsprozess](SECURITY-UPDATE-AND-RECOVERY.md).
`setup.bat` / `setup-qa.bat` verwenden jetzt `npm ci --ignore-scripts`, pruefen
Registry-Signaturen und bauen nur die gepruefte SQLite-Abhaengigkeit aus Quellcode.
Unter Windows braucht dieser native Build Python und Visual Studio Build Tools
mit C++-Workload gemaess [node-gyp](https://github.com/nodejs/node-gyp#on-windows).
Das vermeidet einen ungeprueften zweiten Download fertiger SQLite-Binaerdateien.
Bei einem fehlgeschlagenen Signatur-/Audit-/Build-Gate abbrechen; keine pauschale
Freigabe von Installationsskripten oder `npm audit fix --force` verwenden.
Die folgenden historischen Installationsbeispiele werden dadurch ersetzt.

# BottomUpParti v0.8.7.1 – Space Creation & Modular Setup

Diese Version ergänzt die bestehende Community-/Privacy-/Space-Struktur um sichere Direkt- und Gruppennachrichten. Die QA-/Regression-Gates aus v0.8.5.5 sind enthalten.

## Neu in v0.8.7
- Direktnachrichten
- Gruppenchats
- temporäre Unterhaltungen mit Ablaufdatum
- Kontext-Chats für Community, Projekt oder Event
- gelesen/ungelesen
- Antworten und Reaktionen
- private, komprimierte Chatbilder über geschützte API statt öffentlichem Upload-Pfad
- Privacy-Regeln und Blockierungen werden serverseitig berücksichtigt

## Start
```powershell
npm.cmd install
npm.cmd rebuild better-sqlite3
npm.cmd audit
npm.cmd run preflight
```

Lokal:
```powershell
.\start-local.bat
```

LAN/WLAN:
```powershell
.\start-network.bat
```

Vollständiges QA-Gate nach einmaligem `setup-qa.bat`:
```powershell
npm.cmd run release-check
```

---

# BottomUpParti v0.8.4.2 – Space Modules, Aggregation & Import Readiness

Diese Version korrigiert und vervollständigt die Unterraum-Logik von v0.8.4. Unterräume sind echte Spaces: Sie können eigene Events, Projekte, Umfragen und Beteiligungsräume tragen. Inhalte können kontrolliert in übergeordneten Spaces erscheinen, ohne dupliziert zu werden.

## Einmalig einrichten

Im entpackten Projektordner in VS Code / PowerShell:

```powershell
npm.cmd install
npm.cmd rebuild better-sqlite3
```

## Start nur auf diesem PC

```powershell
.\start-local.bat
```

Danach: `http://localhost:3000`

## Start im lokalen Netzwerk

```powershell
.\start-network.bat
```

Das Terminal zeigt die LAN-Adresse für Smartphone/Tablet an.

## Demo-Login

- E-Mail: `max@bottomupparti.local`
- Passwort: `demo123`

## Neu in v0.8.4.2

- Events, Projekte und Beteiligung direkt in Unterräumen anlegbar.
- Kontrollierte Aggregation nach oben: nur eigener Space / direkter Eltern-Space / bis zur Haupt-Community.
- Herkunft des Inhalts bleibt sichtbar (`aus Basketball-Team` etc.).
- Beispiel: importierter Spieltermin des Basketball-Teams erscheint auch im Eltern-Space `Sport & Bewegung`.
- Modulare Space-Funktionen: Feed, Gruppen & Teams, Events, Projekte, Beteiligung, Umfragen und Mitglieder können von Admins/Moderatoren aktiviert/deaktiviert werden. Übersicht und Über bleiben immer vorhanden.
- Unterräume erben die Modulkonfiguration des Eltern-Space als verständlichen Standard.
- Provider-neutrale Import-/Synchronisationsbasis: `external_sources` + `object_source_links`.
- Vorgesehene Protokolle/Importwege: REST, GraphQL, iCal/ICS, RSS/Atom, ActivityPub, JSON, CSV. Einzelne Anbieter sind nur Adapter, nicht Teil des Kernmodells.
- Externe Herkunft und Source-of-Truth werden separat vom BottomUpParti-Objekt gespeichert.

## Wichtige Architekturregel

Ein Event, Projekt oder Beteiligungsvorgang existiert nur einmal. Beziehungen bestimmen, in welchen Spaces, Orten und Themen es sichtbar ist. Die Aggregation nach oben erzeugt keine Kopien. Private/nicht sichtbare Inhalte dürfen durch Aggregation nicht freigegeben werden.

## Noch bewusst nicht enthalten

- echte Verbands-API/Spielplan-Synchronisation
- vollwertiger Import-Assistent
- Nutzerprofile anderer Personen
- Messaging

Diese Dinge bauen später auf der jetzt vorbereiteten neutralen API-/Adapterstruktur auf.

## Prüfungen

Vor Release laufen:

```powershell
npm.cmd run preflight
```

Der Check umfasst Produkt-/Architekturregeln, Security/Privacy und Mobile/App-Readiness.

## v0.8.5.1 – empfohlener Start

```powershell
npm.cmd install
npm.cmd rebuild better-sqlite3
npm.cmd audit
npm.cmd run preflight
```

Lokal:
```powershell
.\start-local.bat
```

LAN/WLAN:
```powershell
.\start-network.bat
```

## v0.8.7.1 – Minimal Creation & Modular Setup

Neue Spaces werden nur mit den notwendigen Basisdaten erstellt. Danach öffnet BottomUpParti direkt den neuen Space im Register **Einrichten**. Dort können Profil, Orte/Themen, Zugang, Module und weitere Beziehungen schrittweise konfiguriert werden. Die Einrichtung muss nicht abgeschlossen werden und kann später fortgesetzt werden.

Der globale Button **+ Erstellen** öffnet jetzt zunächst eine schlanke Auswahl für Space/Community, Projekt, Veranstaltung oder Beteiligung.

## QA ab v0.8.7.5
Schneller Alltagscheck:
```powershell
npm.cmd run qa:fast
```
Vollständiger Check vor größerem Release:
```powershell
npm.cmd run qa:full
```
Gesamtes Fast-Release-Gate:
```powershell
npm.cmd run release-check
```
Volles Release-Gate:
```powershell
npm.cmd run release-check:full
```


## v0.8.7.7 QA-Hinweis
Die Hauptnavigation ist technisch als `#appSidebar` gescoped. Mobile Tests prüfen Off-Canvas-Geometrie statt generische `<aside>`-Sichtbarkeit.


## v0.8.7.8
Desktop: **Chats** ist wieder als Hauptnavigationspunkt sichtbar. Mobile bleibt Chats in der Bottom Navigation.


## v0.9.1 Sicherheits-/Stabilitätshinweis

Für normale lokale Entwicklung weiterhin `start-local.bat` verwenden. `NODE_ENV=production` ist absichtlich fail-closed: Es benötigt `BUP_PUBLIC_ORIGIN`, blockiert vorhandene Demo-Accounts und akzeptiert SQLite nur mit dem expliziten Staging-Override `BUP_ALLOW_SQLITE_PRODUCTION=1`. Das ist kein Produktionsfreigabe-Schalter. Siehe `PRODUCTION-READINESS-v0.9.1.md`.

## v0.9.3 – Tunnel / Reverse Proxy

Für einen lokalen Cloudflare-Tunnel kann optional `BUP_TRUST_LOCAL_PROXY=1` gesetzt werden, damit Rate Limits die validierte Client-IP aus dem lokalen Proxy übernehmen. Nur setzen, wenn der Reverse Proxy auf demselben Rechner/Loopback läuft. Für normale lokale Entwicklung ist die Variable nicht nötig.
