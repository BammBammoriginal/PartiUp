# PartiUp P0.16.23 – Eigene Daten herunterladen

Ausgangspunkt ist die unveränderlich markierte Baseline `p0.16.22-gold`.

## R8a: Datenschutzexport im persönlichen Privacy-Bereich

- Angemeldete Personen können den bereits vorhandenen serverseitigen Datenschutzexport nun im eigenen Profil über „Eigene Daten herunterladen“ erreichen.
- Der Export wird als maschinenlesbare JSON-Datei `partiup-meine-daten.json` über den authentifizierten Pfad `/api/privacy/export` ausgeliefert.
- Die Oberfläche erklärt verständlich, dass gespeicherte und mit dem Konto verknüpfte Daten exportiert werden.
- Passwortdaten, Sitzungsdaten und private Signaturschlüssel bleiben ausdrücklich ausgeschlossen.
- Die Aktion ist auf Desktop und Mobile gleichwertig erreichbar und besitzt mobil eine mindestens 44 Pixel hohe, vollbreite Bedienfläche.

## Bewusste fachliche und sprachliche Abgrenzung

- Der Export ist eine persönliche Konto- und Datenschutzfunktion, kein eigener Space-Typ.
- Verknüpfte Orte, Themen, Communities, Menschen, Veranstaltungen, Projekte und Beteiligungen werden im bestehenden Exportmodell gleichwertig als Beziehungen beziehungsweise eigene Datensätze behandelt; ihre Rechte- und Sichtbarkeitslogik wird nicht verändert.
- „Eigene Daten herunterladen“ löst keine Kontolöschung aus. Die destruktive Löschoberfläche bleibt eine getrennte spätere Tranche mit Passwortbestätigung, Folgenvorschau und eigenen Goldtests.

## Unverändert

- keine Änderung an Exportinhalt, Datenmodell oder Datenbank,
- keine Änderung an Anmeldung, Sitzung, Rollen oder Berechtigungen,
- keine Änderung an Spaces, Subspaces, Community-, Projekt-, Veranstaltungs- oder Beteiligungslogik,
- keine Änderung an Föderation, Suche, Ranking oder Sichtbarkeit,
- keine neue öffentliche oder fremde Zugriffsmöglichkeit auf personenbezogene Daten.

## Verbindliche Prüfpfade

- nicht angemeldeter API-Zugriff bleibt mit HTTP 401 gesperrt,
- angemeldeter Export gehört zum eigenen Konto,
- Browser lädt die echte Datei über den sichtbaren Profilweg herunter,
- Dateiname und JSON-Lesbarkeit werden geprüft,
- Geheimnisfelder werden in API- und Browserprüfung ausgeschlossen,
- identischer Ablauf auf Desktop und Mobile,
- bestehende Goldstrecken für Space-Gleichwertigkeit, Erstellung, Navigation, Nachrichten, Blockierung und Abmeldung bleiben vollständig bestehen.

## Goldabnahme

Der reale Windows-/Chromium-Lauf von `npm.cmd run qa:gold` wurde vom Nutzer am
22. September 2026 als vollständig fehlerfrei bestätigt. Die ausgelieferte
RC-Datei enthielt den Quellstand `efe314d2eb7034c72969b3bbf9bfc19ec1f6c967`;
nach dem Lauf wurden nur Release-Dokumente ergänzt. Der Goldlauf umfasst 25
Browserprüfungen einschließlich Einrichtung, Desktop und Mobile.

Zusätzlich in der Entwicklungsumgebung bestanden: Gold-Preflight 44/44,
Gold-API-Regressionen 28/28, vollständiger Preflight, Security-Integration
46/46 sowie die Privacy-, Föderations-, Rechte- und XSS-Prüfungen.
