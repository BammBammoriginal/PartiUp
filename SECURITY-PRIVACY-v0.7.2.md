# BottomUpParti v0.7.2 – Security & Privacy Baseline

Diese Version setzt die bisher vereinbarten Grundprinzipien für BottomUpParti technisch stärker um: Datenschutz durch Technikgestaltung, Datensparsamkeit, Zweckbindung, minimale zentrale Sammlung, Nutzerkontrolle, sichere Authentifizierung, Rollen/Rechte, zurückhaltendes Logging und sichere Medienverarbeitung.

## Jetzt umgesetzt

- Server bindet standardmäßig nur an `127.0.0.1`; LAN-Zugriff ist ein bewusster Opt-in über `start-network.bat`.
- Sicherheitsheader inkl. CSP, Frame-Schutz, MIME-Sniffing-Schutz, restriktive Referrer- und Permissions-Policy.
- Zustandsändernde API-Aufrufe sind durch Same-Origin-Prüfung + CSRF-Token geschützt.
- Login- und Schreibzugriffe sind rate-limited.
- Session-Cookies: HttpOnly, SameSite=Strict; in Produktion zusätzlich Secure.
- Session-Tokens liegen nur als SHA-256-Hash in SQLite.
- Passwörter bleiben scrypt-gehasht und timing-safe verglichen.
- API-Bodies sind auf 64 KB begrenzt.
- Bilder: max. 12 MB, max. 40 MP, Verarbeitung über Sharp, WebP-Varianten; das hochgeladene Original wird nicht gespeichert.
- Öffentliche Medien liegen explizit unter `uploads/public`; private Chat-Medien dürfen später **nicht** über diese Route ausgeliefert werden.
- Persönlicher Datenexport ist technisch vorhanden: `GET /api/privacy/export`.
- Konto-Löschung/Anonymisierung ist technisch vorhanden und verlangt Passwortbestätigung: `POST /api/privacy/delete-account`.
- Keine generelle Speicherung von IP-Adressen oder Request-Bodies im Anwendungslog.

## Bewusst noch NICHT als „produktionssicher“ behauptet

- SQLite ist lokal nicht anwendungsseitig verschlüsselt. Für lokale Tests sollte Datenträgerverschlüsselung (z. B. BitLocker) genutzt werden. Für Produktion muss die Speicher-/Hostingarchitektur separat entschieden werden.
- HTTPS/TLS ist im lokalen LAN-Prototyp nicht enthalten. Externer Betrieb ohne HTTPS ist nicht zulässig.
- Kein professionelles Secret-Management, keine MFA, keine Recovery-Codes.
- Keine Ende-zu-Ende-Verschlüsselung, weil private Chats noch nicht gebaut sind. Vor privaten Chats muss das Kommunikations- und Verschlüsselungskonzept festgelegt werden.
- Keine automatische Backup-Infrastruktur. Backups müssen später verschlüsselt, zugriffsbeschränkt und mit Löschfristen versehen sein.
- Noch keine vollständige Aufbewahrungs-/Löschfristen-Engine.
- Noch keine DPIA/DSFA-Bewertung, juristische Datenschutzprüfung oder externer Penetrationstest. Diese Punkte sind vor öffentlichem Realbetrieb Pflichtprüfpunkte.

## Datenschutz-Prüffrage für neue Features

Vor jeder neuen Funktion wird geprüft: Ist die Information notwendig? Wer darf sie sehen? Wie lange muss sie bleiben? Kann der Nutzer sie kontrollieren/löschen? Gibt es eine Lösung mit weniger Daten?
