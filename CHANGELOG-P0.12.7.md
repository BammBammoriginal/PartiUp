# PartiUp P0.12.7 – Profil & Sichtbarkeit

- Zentrale, serverseitig erzwungene Profil-Sichtbarkeit mit `public`, `members`, `network`, `private`.
- Bestehende historische `members`-Werte werden konservativ zu `network` migriert, damit ein Update keine Sichtbarkeit erweitert.
- Granulare Sichtbarkeit für Bio, Ort, Mitgliedschaften, Interessen, Projekte, Event-Teilnahmen, gemeinsame Kontakte und persönliche Aktivität.
- Standard-Sichtbarkeit für neue Profil-Aktivitäten; einzelne Einträge bleiben separat überschreibbar.
- Objektberechtigungen bleiben immer Obergrenze.
- Serverseitige Profil-Vorschau für öffentlich / Mitglied / Netzwerk-Freund.
- Audit der Einstellungsänderungen ohne Profilaufruf-/Tracking-Log.
- Privacy Export und Account-Löschung berücksichtigen das Audit.
- Federation veröffentlicht Bio weiterhin nur bei öffentlichem Profil UND öffentlicher Bio-Freigabe.
