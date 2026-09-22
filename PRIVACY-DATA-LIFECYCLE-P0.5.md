# PartiUp p0.5 – Privacy Data Lifecycle Hardening

Basis: `PartiUp-p0.5-private-event-access-fixed.zip`. Dieses Hardening baut auf dem zuvor behobenen Private-Event-Access-Control-Fix auf.

## Ziel und Sicherheitsmodell

`GET /api/privacy/export` und `POST /api/privacy/delete-account` arbeiten nun gegen ein gemeinsames Datenlebenszyklus-Modell. Die Kontolöschung ist keine pauschale `DELETE users`-Operation: mehrere gemeinsame Datenobjekte besitzen harte Fremdschlüssel und Inhalte anderer Personen. Stattdessen werden direkte private Daten gelöscht, eigene Inhalte dort redigiert, wo ein Cascade andere Nutzer treffen würde, und wenige sicherheits-/systemrelevante Datensätze nur gegen einen nicht mehr anmeldbaren Tombstone erhalten.

Der verbleibende interne `users.id` ist deshalb **kein Beleg vollständiger Anonymität**, sondern ein pseudonymer technischer Tombstone zur referenziellen Integrität. Name, E-Mail, Bio, Ort, Avatar, Trust, Login-Credentials, Sessions, Preferences und Federation-Credentials werden entfernt/ersetzt. `account_status='deleted'` und `deleted_at` verhindern eine erneute Verwendung als aktives Profil.

## Vollständige Dateninventur und Löschmatrix

| Datentyp / Tabelle | Benutzerbezug | Lifecycle bei Konto-Löschung | Zweck / Begründung |
|---|---|---|---|
| `users` | `id` | **ANONYMIZE / TOMBSTONE** | Technische Referenz für gemeinsame Historie; Identitätsfelder und Login werden entfernt. |
| `sessions` | `user_id` | **DELETE** | Keine Sitzung darf fortbestehen. |
| `user_preferences` | `user_id` | **DELETE** | rein kontobezogene Präferenzen. |
| `user_topics` | `user_id` | **DELETE** | persönliche Interessen. |
| `memberships` | `user_id` | **DELETE** | aktive Mitgliedschaft endet. |
| `community_join_requests` | `user_id` | **DELETE** | eigene Anfragen; `decided_by` des gelöschten Moderators wird **ANONYMIZE (NULL)**. |
| `community_invites` | `user_id` | **DELETE** | eigene Einladung; `invited_by` wird bei Einladungen anderer **ANONYMIZE (NULL)**. |
| `communities` | `created_by` | **ANONYMIZE (NULL)** | gemeinsames Space-Objekt bleibt bestehen. Ownership muss organisatorisch neu geklärt werden. |
| `projects` | `created_by` | **ANONYMIZE (NULL)** | gemeinsames Projekt bleibt bestehen. |
| `events` | `created_by` | **ANONYMIZE (NULL)** | gemeinsames Event bleibt bestehen. |
| `participation` | `created_by` | **ANONYMIZE (NULL)** | Beteiligungsvorgang bleibt als gemeinsames/systemisches Objekt bestehen. |
| `posts` | `author_id` | **ANONYMIZE + CONTENT REDACTION** | Post-Struktur bleibt, damit Kommentare anderer nicht durch Cascade gelöscht werden; eigener Body wird entfernt. |
| `comments` | `author_id` | **ANONYMIZE + CONTENT REDACTION** | Inhalt des gelöschten Kontos wird entfernt; Thread-/Moderationsintegrität bleibt. |
| `polls` | `author_id` | **RETAIN WITH SYSTEM REASON** | Poll und Stimmen anderer bilden gemeinsame Historie; Autor zeigt nur noch auf Tombstone. Produkt-/Policy-Entscheidung vor Produktion überprüfen. |
| `poll_votes` | `user_id` | **DELETE** | eigene Stimme wird entfernt. |
| `participation_info` | `author_id` | **ANONYMIZE + CONTENT REDACTION** | Autor wird NULL, eigener Text entfernt. |
| `participation_questions` | `created_by` | **ANONYMIZE (NULL)** | Frage/Abstimmungsstruktur mit Antworten anderer bleibt. |
| `participation_question_votes` | `user_id` | **DELETE** | eigene Beteiligungsstimme. |
| `participation_arguments` | `author_id` | **ANONYMIZE + CONTENT REDACTION** | Unterstützungen anderer werden nicht kaskadierend gelöscht. |
| `participation_argument_support` | `user_id` | **DELETE** | eigene Unterstützung. |
| `event_attendance` | `user_id` | **DELETE** | Anwesenheits-/Teilnahmedatum. |
| `event_invites` | `user_id` | **DELETE** | erhaltene Einladung; `invited_by` anderer Einladung wird **ANONYMIZE (NULL)**. |
| `notifications` | `user_id` | **DELETE** | rein kontobezogen. |
| `user_follows` | `user_id`; `target_type=person,target_id` | **DELETE** | eigene Follows sowie eingehende Follows auf das gelöschte Profil werden entfernt. |
| `conversations` | `created_by` | **RETAIN WITH SYSTEM REASON** wenn andere Mitglieder existieren, sonst **DELETE** | Gemeinsamer Gesprächscontainer darf nicht anderen Teilnehmern entzogen werden. Creator verweist nur noch auf Tombstone. |
| `conversation_members` | `user_id` | **DELETE** | gelöschtes Konto ist kein Gesprächsmitglied mehr. |
| `messages` | `sender_id` | **ANONYMIZE + CONTENT REDACTION** | eigene Nachricht wird inhaltlich entfernt; Platzhalter erhält Reihenfolge/Replies und Gesprächshistorie anderer. |
| `message_reactions` | `user_id` | **DELETE** | eigene Reaktionen. |
| `private_media` | `owner_user_id` | **DELETE DB + DELETE FILE** | private Medien dürfen nicht als Datei zurückbleiben. |
| `message_media` | indirekt über `private_media`/`messages` | **DELETE via FK** für eigene Medien | keine verwaiste Verknüpfung. |
| `user_blocks` | `blocker_id`, `blocked_id` | **DELETE** | aktive Beziehungsdaten werden in beide Richtungen entfernt. |
| `media` | `owner_user_id` | **DELETE DB + DELETE FILE(S)** | öffentliche Uploads und Varianten werden physisch entfernt. |
| `media_links` | indirekt über `media` | **DELETE via FK** | Links auf entfernte Medien verschwinden. |
| `content_reports` | `reporter_id`, `assigned_to`, `resolved_by` | Reporter: **RETAIN WITH SAFETY/SYSTEM REASON** gegen Tombstone; Assignment/Resolver: **ANONYMIZE (NULL)** | Moderations-/Sicherheitsintegrität. Retentionsdauer organisatorisch festlegen. |
| `moderation_actions` | `actor_id` | **RETAIN WITH SAFETY/SYSTEM REASON** gegen Tombstone | nachvollziehbare Moderationshistorie; Retentionsdauer festlegen. |
| `moderation_content_state` | `updated_by` | **RETAIN WITH SAFETY/SYSTEM REASON** gegen Tombstone | aktueller Moderationszustand muss erklärbar bleiben. |
| `role_assignments` | `user_id`, `assigned_by` | eigene Rolle **DELETE**; `assigned_by` **ANONYMIZE (NULL)** | kein aktiver Zugriff bleibt. |
| `permission_overrides` | `updated_by` | **ANONYMIZE (NULL)** | aktuelle Rollenpolicy bleibt systemisch wirksam. |
| `tasks` | `assignee_user_id`, `created_by` | Assignee **ANONYMIZE (NULL)**; Creator **RETAIN WITH SYSTEM REASON** gegen Tombstone | Shared-Task darf nicht verschwinden. Retention/Ownership später produktpolitisch entscheiden. |
| `federation_handles` | `user_id` | **DELETE** | Actor-Discovery wird beendet. |
| `federation_actor_keys` | `user_id` | **DELETE** | insbesondere privater Signaturschlüssel wird vernichtet. |
| `federation_followers` | `local_user_id` | **DELETE** | lokale Followerbeziehung entfernt. |
| `federation_activities` | `local_user_id` | **DELETE LOCAL COPY** | lokale Payloads zum Konto werden entfernt. |
| `federation_delivery_queue` | `local_user_id` | **DELETE** | keine ausstehenden Aktivitäten des gelöschten Actors. |
| `federation_entities` | `entity_type=user`; eigene Posts/Kommentare | **DELETE LOCAL MAPPING** | lokale Actor-/Content-Identity-Map minimiert. |
| `federation_remote_objects` | kein direkter lokaler User-FK | **RETAIN THIRD-PARTY DATA** | Remote-Inhalte gehören nicht automatisch dem löschenden Nutzer; gesonderte Moderations-/Federationsregeln gelten. |
| `federation_space_*` | Space-bezogen | **RETAIN SHARED SYSTEM DATA** | Schlüssel/Follower eines Spaces sind nicht automatisch persönliche Schlüssel des Erstellers. Ownership-Governance erforderlich. |
| `privacy_file_deletion_queue` | zufälliger Storage-Key | **TEMPORARY RETAIN UNTIL FILE REMOVED** | crash-sichere physische Löschung; erfolgreiche Einträge enthalten keine Profilidentität. |

Zusätzlich scannt `dataInventory()` das aktive SQLite-Schema nach allen bekannten Benutzerreferenz-Spalten (`user_id`, `created_by`, `owner_user_id`, `author_id`, `reporter_id`, `actor_id`, `assigned_by`, `updated_by`, `decided_by`, `invited_by`, `sender_id`, `blocker_id`, `blocked_id`, `assigned_to`, `resolved_by`, `assignee_user_id`, `local_user_id`). Das Inventar wird auch dem Export beigefügt, damit neue Tabellen nicht stillschweigend unsichtbar bleiben.

## Exportmodell

`GET /api/privacy/export` enthält jetzt unter anderem:

- Konto- und Preferences-Daten (ohne Password Hash/Salt und Sessions),
- Memberships, Join Requests und erhaltene/versandte Einladungen,
- eigene Communities, Projekte, Events und Beteiligungsvorgänge,
- Posts, Kommentare, Polls und Poll Votes,
- Participation Info, Questions, Votes, Arguments und Support,
- Event Attendance,
- Notifications, Follows, Topics und eigene Blocks,
- Conversation-Erstellung, eigene Memberships, eigene Messages, Reactions und Private-Media-Metadaten,
- öffentliche Media-Metadaten und Dateipräsenz,
- Reports, Moderationsaktionen und Moderationszuweisungen,
- Role Assignments, Permission-Änderungen und Tasks,
- Federation Handle, Public Key, Followers, Activities, Queue und Entity-Mapping,
- aktuelles Schema-Dateninventar.

Private Federation-Signing-Keys werden **nicht exportiert**. Das ist eine bewusste Security-Grenze: private Schlüssel sind Credentials, nicht normale Exportdaten. Der Export dokumentiert, dass ein Schlüssel existiert, liefert den Public Key und markiert den Private Key ausdrücklich als nicht exportiert.

Private Medien erhalten im Manifest einen authentifizierten `download_url`; öffentliche Medien enthalten ihre gespeicherten Varianten. Der aktuelle Endpunkt bleibt JSON-basiert und ist **kein gebündeltes ZIP-Datenportabilitätsarchiv**. Ein produktiver Export-Workflow mit gebündelten Binärdateien ist eine verbleibende Produkt-/Rechtsentscheidung.

## Crash-sichere Dateilöschung

Dateien werden nicht mehr erst nach einer losgelösten DB-Operation "best effort" gelöscht. Während der DB-Transaktion werden alle zu löschenden Storage-Keys in `privacy_file_deletion_queue` geschrieben und anschließend die zugehörigen DB-Metadaten entfernt. Nach Commit wird die Queue abgearbeitet. Falls der Prozess zwischen Commit und `unlink` abstürzt, verarbeitet der Server ausstehende Einträge beim nächsten Start erneut.

Damit kann ein DB-Commit nicht mehr stillschweigend behaupten, die privaten/public Media-Daten seien vollständig entfernt, während die Datei dauerhaft liegenbleibt. Das API-Ergebnis enthält den Zustand der Dateilöschung.

## Federation nach Kontolöschung

- Handle, Actor Key, Followers, lokale Activities und Delivery Queue werden gelöscht.
- Gelöschte Nutzer werden beim Startup-Backfill nicht erneut als Actor registriert.
- `actorDocument()` und direkte User-Actor-/Outbox-Routen akzeptieren nur aktive Accounts.
- Eigene lokale Federation-Entity-Mappings für User, Posts und Comments werden entfernt.
- Bereits an fremde Federation-Server ausgelieferte öffentliche Inhalte können durch diese lokale Operation nicht garantiert von fremden Servern entfernt werden. PartiUp gibt daher **keine Zusicherung** ab, dass externe Kopien verschwunden sind. Ein späterer produktiver Account-Deletion-Workflow sollte ActivityPub-Delete/Tombstone-Zustellung und Retry/Best-Effort-Tracking als eigene Funktion definieren.

## Tests

`tests/integration/privacy-data-lifecycle.integration.js` erzeugt gezielt personenbezogene Testdaten in DB und Dateisystem, ruft Export und Account-Löschung über HTTP auf und prüft danach unter anderem:

- Exportabdeckung der neuen Kategorien,
- kein Leak des Federation Private Keys im Export,
- Tombstone statt aktivem Konto,
- Sessions/Memberships/Attendance/Votes/Support entfernt,
- eigenes Chat- und Post-Material redigiert,
- Nachrichten und Kommentare anderer Teilnehmer erhalten,
- private Medien DB + Datei entfernt,
- öffentliche Media-Varianten DB + Dateien entfernt,
- Federation Handle/Key/Follower/Activity/Queue entfernt,
- Moderationshistorie bewusst nur gegen Tombstone erhalten,
- keine offene `privacy_file_deletion_queue` nach erfolgreichem Lauf.

`scripts/privacy-data-lifecycle-preflight.js` prüft die strukturellen Privacy-Invarianten offline.

## Verbleibende rechtliche / organisatorische Entscheidungen

Diese Implementierung ist Privacy-by-Design-Hardening, **keine Rechtsberatung und keine Zusicherung vollständiger DSGVO-Konformität**. Vor Produktivbetrieb müssen mindestens folgende Punkte verbindlich festgelegt werden:

1. konkrete Aufbewahrungsfristen für Reports, Moderationsaktionen, Moderationszustände und technische Audit-Daten;
2. Rechts-/Zweckgrundlage für jede Retention-Kategorie und dokumentierter Löschfristenprozess;
3. Produktpolicy für Polls, Tasks und sonstige gemeinsam erstellte Civic-Objekte nach Löschung des Erstellers;
4. Governance/Ownership-Transfer für Communities, Projekte, Events und Spaces ohne aktiven Owner;
5. Umgang mit Backups, DB-Snapshots, Logs, Hosting-/Proxy-Logs und externen Observability-Systemen – diese liegen außerhalb des aktuellen SQLite-/Filesystem-Codes;
6. ActivityPub-Delete/Tombstone-Best-Effort-Verfahren für bereits föderierte externe Kopien einschließlich Retry und Transparenz über Grenzen der Fernlöschung;
7. Entscheidung, ob der Privacy Export künftig als gebündeltes Archiv inklusive binärer Medien statt JSON-Manifest bereitgestellt wird;
8. Verifikation, dass neue Tabellen/Plugins in CI zwingend in die Lifecycle-Matrix aufgenommen werden, bevor ein Release freigegeben wird.
