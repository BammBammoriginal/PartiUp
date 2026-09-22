# BottomUpParti v0.8.7.4 — QA Auth API Fix

## Behoben
- Playwright-QA authentifiziert die Suite nicht mehr durch Klick auf den Sidebar-Login.
- Die QA meldet sich einmalig direkt über `/api/login` im Browser-Kontext an und speichert anschließend den gemeinsamen `storageState`.
- Dadurch hängt der Setup-Test nicht mehr davon ab, ob der Identitätsbutton im jeweiligen Viewport sichtbar bzw. im sichtbaren Bereich liegt.
- Desktop- und Mobile-Projekte verwenden weiterhin dieselbe authentifizierte Session.
- Die optionale Visual-Regression verwendet ebenfalls den vorhandenen Auth-State statt erneut über die UI einzuloggen.

## Prävention
- Neuer `qa-auth-preflight`: blockiert Releases, wenn das QA-Setup wieder den Sidebar-Login anklickt oder der gemeinsame Auth-State nicht gespeichert wird.
- Login-UI und Mobile-Drawer werden weiterhin separat in den eigentlichen Browser-/UX-Tests geprüft; Auth-Provisioning ist davon entkoppelt.
