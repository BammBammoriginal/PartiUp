# ADR-0001: Content-Grenze zwischen PartiUp, Drupal und Open Social

**Status:** Verbindliche Architekturentscheidung  
**Datum:** 28. September 2026  
**Geltungsbereich:** PartiUp-Core, redaktionelle Inhalte, Integrationen und künftige CMS-Auswahl

## Entscheidung in einem Satz

PartiUp bleibt fachlich führend für Spaces, Beziehungen, Interaktionen, Beteiligung und Föderation; ein schlankes, headless betriebenes Drupal darf künftig ausschließlich klar abgegrenzte Redaktionsinhalte führen. Open Social wird nicht als zweiter Community-Core eingeführt, sondern bleibt Vergleichs-, Migrations- und möglicher Integrationskandidat.

## Ausgangslage

PartiUp ist keine allgemeine Website und kein klassisches soziales Netzwerk. Der Produktkern ist die gleichwertige Vernetzung von Orten, Themen, Communities, Menschen sowie den Space-Ausprägungen Veranstaltung, Projekt und Beteiligungsvorgang. Rechte, Sichtbarkeit, Herkunft, Föderation und Datenschutz müssen dabei über alle relevanten Space-Typen konsistent bleiben.

Gleichzeitig fehlen einem selbst entwickelten Produkt derzeit typische Funktionen eines ausgereiften Content-Management-Systems (CMS), insbesondere:

- redaktionelle Seiten und strukturierte Artikel,
- Entwurf, Revision, Prüfung und Veröffentlichung,
- Mehrsprachigkeit,
- Medienbibliothek für redaktionelle Inhalte,
- zeitgesteuerte Veröffentlichung,
- redaktionelle Rollen und nachvollziehbare Workflows.

Diese Fähigkeiten selbst zu entwickeln würde viel Aufwand erzeugen, ohne PartiUps Alleinstellungsmerkmal zu stärken.

## Übernommene Architekturregeln

1. **Reuse → Integrate → Federate → erst dann selbst entwickeln.**
2. **Internal model first – external mappings second.** Externe Systeme bestimmen nicht das interne PartiUp-Modell.
3. **Eine kanonische Quelle pro Objekt.** Ein Objekt darf nicht gleichzeitig in PartiUp und Drupal fachlich führend sein.
4. **Herkunft bleibt sichtbar.** Externe ID, kanonische URL, Anbieter, Synchronisationsstatus, Verifikation und Löschstatus werden erhalten.
5. **Read-only first.** Neue Integrationen lesen zunächst nur ausdrücklich freigegebene Daten. Rückschreiben benötigt einen eigenen, dokumentierten Rechte- und Konfliktentscheid.
6. **Föderation ist nicht gleich Sichtbarkeit.** Space-, Objekt- und Federationseinstellungen bleiben getrennt.
7. **Privacy und Security by Design.** Eine Integration darf lokale Rechte, Sichtbarkeit, Löschung, Export oder Moderation nicht umgehen.
8. **Eine Nutzeroberfläche.** Nutzer sehen PartiUp; Drupal erhält keine parallele öffentliche Community-Oberfläche.

## Begriffliche Grenze

### Redaktionsinhalt

Ein Redaktionsinhalt ist ein vergleichsweise langlebiger Informationsinhalt, dessen zentrale Anforderungen Versionierung, Übersetzung, Freigabe und publizistische Pflege sind. Beispiele: Hilfeseite, Vereinsporträt, redaktioneller Artikel, Handbuch, FAQ oder offizielle Informationsseite.

### PartiUp-Produktobjekt

Ein PartiUp-Produktobjekt ist Bestandteil des sozialen oder demokratischen Zustandsmodells. Es beeinflusst Beziehungen, Rechte, Mitgliedschaften, Interaktionen, Prozesse, Benachrichtigungen, Föderation oder den vernetzten Space-Graphen. Beispiele: Space, Mitgliedschaft, Veranstaltung, Projekt, Beteiligungsvorgang, Vorschlag, Abstimmung, Beitrag, Kommentar, Nachricht oder Follow-Beziehung.

### Externe Fachquelle

Eine externe Fachquelle bleibt für einen spezialisierten Prozess oder Datensatz verantwortlich, etwa Decidim, Consul Democracy, WeChange oder eine öffentliche Demokratie-Datenquelle. PartiUp referenziert oder synchronisiert nur ausdrücklich definierte Ausschnitte und zeigt die Herkunft an.

## Vergleich

| Kriterium | PartiUp nativ | Drupal | Open Social | Begrenzter Hybrid |
|---|---|---|---|---|
| PartiUp-Space- und Vernetzungslogik | Passgenau und führend | Nur durch umfangreiche Eigenmodule | Gruppenmodell vorhanden, aber andere Semantik | PartiUp bleibt führend |
| Beteiligung als Funktion aller Space-Typen | Bestandteil des Produktkerns | Müsste weitgehend individuell gebaut werden | Keine gleichwertige PartiUp-Engine | PartiUp bleibt führend |
| ActivityPub und provider-neutrale Integrationen | Bereits als eigene Schichten angelegt | Zusätzliche Module und Anpassungen nötig | Nicht deckungsgleich mit PartiUps Federation-first-Modell | PartiUp bleibt Federation-Gateway |
| Redaktionelle Seiten, Artikel und Medien | Hoher unnötiger Eigenaufwand | Sehr stark | Stark, weil auf Drupal aufgebaut | Drupal übernimmt nur diesen Bereich |
| Revisionen und Freigabeworkflows | Noch nicht vorhanden | Kernstärke | Vorhanden, aber mit größerem Gesamtpaket | Drupal übernimmt nur diesen Bereich |
| Mehrsprachigkeit | Noch nicht vollständig | Kernfunktionen vorhanden | Vorhanden | Drupal für Redaktionsinhalt; PartiUp separat für Produkt-UI/-Objekte |
| Community, Profile, Gruppen, Events, Feed, Chat | PartiUp-spezifisch | Erfordert Eigenentwicklung | Bereits vorhanden, aber konkurriert mit PartiUp | Keine doppelte Community-Domäne |
| Umstellungsaufwand | Kein Plattformwechsel | Vollumbau bei Drupal-only | Vollumbau plus Semantikmigration | Schrittweise, reversibel |
| Betriebs- und Supply-Chain-Fläche | Eine Node-Anwendung | Zusätzlicher PHP-/Composer-Stack | Großer Drupal-Distributionsstack | Zusatzstack nur bei nachgewiesenem Nutzen |
| Lock-in-Risiko | Eigene Verantwortung | Offenes System und Standards | Open Source plus optionale kommerzielle Erweiterungen | Adapter bleibt austauschbar |
| Gesamturteil | Core beibehalten | Als begrenztes CMS geeignet | Nicht als PartiUp-Core geeignet | **Gewählte Zielrichtung** |

## Verbindliche Objektzuordnung

| Objekt / Funktion | Kanonische Quelle | Begründung |
|---|---|---|
| Identität, Profil-Kern, Datenschutz- und Kommunikationseinstellungen | PartiUp | Rechte, Beziehungen, Export und Föderationsgrenze |
| Orte und Themen als Vernetzungsachsen | PartiUp | Bestandteil des Alleinstellungsmerkmals und des Space-Graphen |
| Communities und Unterräume | PartiUp | Mitgliedschaft, Rollen, Module und Vererbung |
| Veranstaltungen | PartiUp | Space-Ausprägung mit Zugang, Teilnahme, Beziehungen und Föderation |
| Projekte und Aufgaben | PartiUp | Space-Ausprägung mit Rollen, Beziehungen und Zusammenarbeit |
| Beteiligungsvorgänge, Phasen, Vorschläge, Pro/Contra, Abstimmungen und Ergebnisse | PartiUp | Prozessintegrität, Nachvollziehbarkeit, Rechte und demokratische Semantik |
| Beiträge, Kommentare, Reaktionen, Nachrichten und Benachrichtigungen | PartiUp | Laufende Interaktion, Privacy, Moderation und Echtzeitzustand |
| Follows, Freundschaften, Mitgliedschaften und Blockierungen | PartiUp | Sicherheits- und Beziehungsgraph |
| Föderationsobjekte, Provenienz und externe Mappings | PartiUp | PartiUp bleibt das Interoperabilitäts-Gateway |
| Rechtstexte, Hilfe, FAQ, Handbücher und redaktionelle Landingpages | Drupal | Revisionen, Übersetzung und Freigabeworkflow |
| Redaktionelle News, Magazine und kuratierte Wissensartikel | Drupal | Klassische CMS-Aufgabe ohne sozialen Transaktionszustand |
| Redaktionelle Medienbibliothek | Drupal | Nur für Drupal-geführte Redaktionsinhalte |
| Medien an Nachrichten, Beiträgen, Spaces, Veranstaltungen oder Beteiligung | PartiUp | Folgen dem Lebenszyklus und den Rechten des Produktobjekts |
| Offizielle redaktionelle News eines Spaces | Drupal, in PartiUp referenziert | Klare Kennzeichnung als redaktioneller Inhalt und Space-Zuordnung |
| Nutzerbeitrag im selben Space | PartiUp | Sozialer Inhalt mit Interaktion und Moderation |
| Langer „Über uns“- oder Wissensbereich eines Spaces | Drupal-Block, an PartiUp-Space angeheftet | Space-Identität bleibt nativ; redaktionelle Langform wird ausgelagert |
| Kernbeschreibung, Status, Zugangsregel und Verantwortliche eines Spaces | PartiUp | Muss auch ohne CMS verfügbar und rechtlich konsistent sein |
| Zusatzinformationen zu einem Beteiligungsverfahren | PartiUp, soweit verfahrensrelevant | Verfahrenskontext und Ergebnis dürfen nicht vom CMS-Zustand abhängen |
| Allgemeines Hintergrunddossier zu einem Thema | Drupal, in PartiUp referenziert | Redaktioneller Wissensinhalt ohne Verfahrenszustand |
| Kommentare zu Drupal-Artikeln | PartiUp-Diskussion mit Referenz auf den Artikel | Keine zweite Kommentar-, Moderations- oder Identitätsdomäne |
| Einheitliche Suche | PartiUp-Aggregation | Drupal liefert freigegebene Suchdokumente; Rechte und Herkunft bleiben sichtbar |

## Entscheidungsregel für neue Objekte

Ein neues Objekt bleibt **nativ in PartiUp**, wenn mindestens eine der folgenden Fragen mit Ja beantwortet wird:

1. Verändert es Rechte, Rollen, Mitgliedschaften oder Beziehungen?
2. Ist es Teil eines Space-, Beteiligungs- oder Moderationsprozesses?
3. Erzeugt es Interaktionen, Benachrichtigungen oder personenbezogene Zustände?
4. Muss es über ActivityPub oder andere PartiUp-Adapter föderiert werden?
5. Muss es auch ohne externes CMS vollständig funktionsfähig bleiben?

Ein Objekt kann **Drupal-geführt** sein, wenn alle folgenden Bedingungen erfüllt sind:

1. Sein Hauptzweck ist redaktionelle Information.
2. Revision, Übersetzung oder Freigabe sind wichtiger als soziale Transaktion.
3. Es enthält keine eigenständige PartiUp-Mitgliedschaft oder Zugangslogik.
4. PartiUp kann es als unveränderliche Referenz beziehungsweise kontrollierten Read-Only-Ausschnitt darstellen.
5. Ausfall oder Trennung von Drupal beschädigt keine Kernprozesse und keine Rechteentscheidung.

## Warum Open Social nicht als Core gewählt wird

Open Social liefert bereits Gruppen, Events, Profile, Feeds, Beiträge, Nachrichten und weitere Community-Funktionen. Genau diese Breite wäre bei PartiUp kein neutraler Unterbau, sondern ein zweites fachliches Modell. Daraus entstünden:

- doppelte Identitäten und Berechtigungen,
- konkurrierende Gruppen-/Space-Semantik,
- doppelte Event-, Feed-, Nachrichten- und Moderationslogik,
- schwierige Synchronisations- und Löschkonflikte,
- Abhängigkeit von einer großen Drupal-Distribution und ihren Modulen,
- das Risiko, PartiUps USP an Open-Social-Konventionen anzupassen.

Open Social bleibt trotzdem relevant:

- als Benchmark für Community- und Redaktionsfunktionen,
- als mögliche Quelle für einen späteren Import-/Migrationsadapter,
- als Integrationspartner für Organisationen, die Open Social bereits betreiben,
- als Referenz für UX-, Rollen- und Community-Management-Muster.

## Zielarchitektur des Hybrids

- PartiUp ist alleinige öffentliche Produktoberfläche und fachlicher Core.
- Drupal läuft als separater, minimaler Contentdienst mit eigener Redaktionsoberfläche.
- PartiUp greift ausschließlich über einen expliziten `drupal-content`-Adapter zu.
- Der Adapter startet read-only und verwendet einen minimal berechtigten technischen Zugriff.
- Übernommen werden nur freigegebene Content-Typen und Felder.
- Jeder Datensatz behält Drupal-ID, kanonische URL, Sprache, Revisions-/Änderungsstand und Synchronisationsstatus.
- HTML wird nicht ungeprüft übernommen; Ausgabe wird erlaubt-listenbasiert bereinigt oder strukturiert gerendert.
- Keine gemeinsamen Datenbanken und keine direkten Tabellenzugriffe.
- Kein automatisches Spiegeln von Nutzern, Gruppen, Kommentaren, Events oder Nachrichten.
- Single Sign-on für Redakteure ist eine spätere Betriebsentscheidung, keine Voraussetzung der Content-Integration.

## Datenschutz, Sicherheit und Betrieb

1. Drupal enthält zunächst nur öffentliche oder ausdrücklich für die Darstellung freigegebene Redaktionsinhalte.
2. Personenbezogene PartiUp-Daten werden nicht an Drupal repliziert.
3. API-Zugriffe folgen minimalen Berechtigungen; Schreibzugriff bleibt deaktiviert, solange kein eigener Use Case und Threat Model beschlossen ist.
4. Drupal, PHP, Composer und eingesetzte Module erhalten eigene Lockfiles, Sicherheitsupdates, SBOM (Software-Stückliste), Scans und Update-Gates.
5. Nur stabile, sicherheitsunterstützte Module dürfen produktiv eingesetzt werden.
6. Ausfälle werden fehlertolerant behandelt: PartiUp-Kernfunktionen bleiben erreichbar; redaktionelle Inhalte zeigen einen klaren temporären Status.
7. Cache und Suchindex dürfen keine nachträglich entzogenen Inhalte dauerhaft ausliefern.
8. Löschung und Depublikation werden als Zustände synchronisiert; nicht nur Erstellung und Aktualisierung.

## Nicht entschieden und bewusst vertagt

- konkrete Drupal-Distribution und Hostingform,
- Authentifizierung von Redakteuren und mögliches Single Sign-on,
- Schreibzugriff von PartiUp nach Drupal,
- vollständige Suchtechnologie,
- Import vorhandener Open-Social-Instanzen,
- redaktionelle Terminplanung als kommerzielle oder freie Erweiterung,
- produktiver Betrieb eines zweiten Stacks vor einem begrenzten Proof of Concept.

## Nächster technischer Schritt

Kein sofortiger Plattformumbau. Zunächst wird ein isolierter Proof of Concept definiert:

1. drei Drupal-Content-Typen: `page`, `article`, `space_resource`;
2. ein read-only Adapter mit expliziter Feld-Allowlist;
3. Herkunft, Sprache, Revision, Änderungszeit und Löschstatus;
4. Darstellung innerhalb einer bestehenden PartiUp-Space-Seite;
5. keine Nutzer-, Gruppen-, Event-, Kommentar- oder Rechte-Synchronisation;
6. Tests für Ausfall, Depublikation, XSS, Rechte-Caching und Datenminimierung;
7. anschließende Aufwand-/Nutzenentscheidung, bevor Drupal Teil der Produktlaufzeit wird.

## Primärquellen für die Entscheidung

- Drupal Content Moderation: https://www.drupal.org/docs/8/core/modules/content-moderation/overview
- Drupal Content Translation: https://www.drupal.org/docs/8/core/modules/content-translation
- Drupal Layout Builder: https://www.drupal.org/docs/8/core/modules/layout-builder
- Drupal JSON:API: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module
- JSON:API Security Considerations: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/security-considerations
- Drupal Security Advisories: https://www.drupal.org/security
- Open Social Distribution: https://www.drupal.org/project/social
- Open Social Releases: https://www.drupal.org/project/social/releases
- Open Social Quellcode: https://github.com/goalgorilla/open_social

