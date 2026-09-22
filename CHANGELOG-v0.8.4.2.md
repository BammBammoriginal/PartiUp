# BottomUpParti v0.8.4.2 – Runtime Initialization Fix

- Behebt den Startabbruch `ReferenceError: Cannot access 'SPACE_MODULES' before initialization`.
- `SPACE_MODULES` und `ensureSpaceModules()` werden nun vor Seed/Migrationsaufrufen initialisiert.
- Neuer `boot-preflight` prüft explizit diese Runtime-Reihenfolge vor Releases.
- Keine Änderung an Space-Modulen, Aggregationslogik, Privacy- oder API-Modell.
