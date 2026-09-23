# PartiUp P0.16.25 – kontrollierte Kontolöschung

Ausgangspunkt ist die auf GitHub bestätigte P0.16.24-Goldbaseline.

## R8b: Kontolöschung im persönlichen Privacy-Center

- Die bestehende serverseitige Kontolöschung ist jetzt über das persönliche
  Konto erreichbar.
- Vor der Löschung zeigt PartiUp verständlich, welche Daten entfernt,
  anonymisiert oder aus Sicherheits- und Moderationsgründen nur noch gegen
  einen nicht anmeldbaren technischen Tombstone aufbewahrt werden.
- Bereits föderierte Kopien auf fremden Servern werden ausdrücklich als
  Grenze der lokalen Löschung genannt.
- Ein Abbruch führt zurück zum unveränderten Konto.
- Die endgültige Aktion verlangt eine aktive Bestätigung und das aktuelle
  Passwort. Eine falsche Bestätigung lässt Konto und Sitzung unverändert.
- Passwortversuche am Löschendpunkt erhalten ein eigenes enges Rate-Limit.
- Nach erfolgreicher Löschung werden alle Sitzungen beendet und die
  Oberfläche wechselt in den abgemeldeten Zustand.

## Geltungsbereich und Grenzen

- Die Änderung betrifft ausschließlich das persönliche Konto und dessen
  lokalen Datenlebenszyklus auf Desktop und Mobilgeräten.
- Die gemeinsame Logik von Communities, Unterräumen, Projekten,
  Veranstaltungen und Beteiligungsvorgängen bleibt unverändert.
- Rechte, Föderationsfreigaben und Sichtbarkeitsregeln werden nicht erweitert.
  Die bestehende Löschmatrix bleibt maßgeblich.

## Prüfpfade

- API: falsches Passwort wird abgewiesen; Konto und Sitzung bleiben aktiv;
  korrekt bestätigte Löschung durchläuft weiterhin die vollständige
  Datenlebenszyklus- und Restdatenprüfung.
- Desktop: Folgenvorschau, Abbruch, falsches Passwort, erfolgreiche Löschung
  und Abmeldung in einer separaten echten Browsersitzung.
- Mobile: Folgenvorschau, Abbruch, erfolgreiche Löschung und abgemeldeter
  Zustand als letzter destruktiver Goldfall.
- Vollständiger Preflight, Security-/Privacy-Integrationen und der
  Desktop-/Mobile-Goldstandard bleiben Freigabevoraussetzung.
