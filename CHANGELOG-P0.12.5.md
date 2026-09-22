# PartiUp P0.12.5 – Persönliches Profil als Netzwerkidentität

- Persönliche Profile werden als Netzwerkidentität statt Influencer-/Feed-Profil dargestellt.
- Bestehende Membership-, Follow-, Friendship-, Event- und Project-Daten werden wiederverwendet; keine parallelen Relationship-Tabellen.
- Profilbereiche: Mitgliedschaften, Interessen & gefolgte Themen, Projekte, Veranstaltungen/Teilnahmen, gemeinsame Verbindungen und Info.
- Alle verlinkten Objekte verwenden Connection-Chips.
- Ort erhält eine eigene Privacy-Freigabe (`place_visibility`, Default: private).
- Veranstaltungsteilnahmen respektieren `event_attendance_visibility`; gemeinsame Verbindungen respektieren Membership-/Interessen-Sichtbarkeit.
- Aktivitätsfeed wird im Personenprofil bewusst nicht prominent als eigener Tab geführt.
- Mobile-first Layout und Cross-Level-Navigation bleiben erhalten.
