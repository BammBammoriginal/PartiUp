# PartiUp P0.12.6 – Persönliche Aktivität als kuratierter Objekt-Feed

- Generische `user_profile_activity`-Relation statt separater Tabellen pro Objekttyp.
- Unterstützt Community, Veranstaltung, Projekt, Thema und Beteiligung.
- Profilbereich „Persönliche Aktivität“ ist chronologisch und ohne Ranking.
- Einträge referenzieren ausschließlich bestehende Originalobjekte; kein dupliziertes Content-System.
- Optionaler Begleittext und Sichtbarkeit pro Eintrag (`public`, `members`, `private`).
- Original-Berechtigungen bleiben maßgeblich: nicht mehr sichtbare/gelöschte Objekte werden beim Lesen nicht mehr ausgeliefert.
- Hervorheben aus Community-, Event-, Projekt-, Themen- und Beteiligungsdetailansichten.
- Besitzer können Sichtbarkeit/Begleittext ändern oder Einträge entfernen.
- Privacy-Export und Account-Löschung berücksichtigen die Activity-Relation.
- Interne Struktur ist auf spätere Share/Announce-Abbildung vorbereitet, ohne ActivityPub-Federation jetzt vorwegzunehmen.
