# BottomUpParti v0.8.6.2 – Profile Runtime Fix

## Behoben
- `sharesCommunity is not defined` in `server/db.js`.
- `server/db.js` verwendet keine nur in `server/server.js` vorhandenen Membership-/Privacy-Helfer mehr.
- Profil-, People- und Bootstrap-Logik besitzen nun ihre benötigten DB-lokalen Helper.

## Prozesshärtung
- Neuer `module-boundary-preflight`: prüft explizit, dass DB-/Profilcode nicht auf server-only Helper verweist.
- Der bestehende echte `profile-runtime-preflight` bleibt Release-Blocker und testet `bootstrap()` + `userProfile()` nach Installation der Dependencies.
- Keine neuen Produktfunktionen gegenüber v0.8.6.1.
