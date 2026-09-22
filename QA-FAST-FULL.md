# BottomUpParti QA – Fast vs. Full

## Ziel
Die QA soll Fehler früh finden, ohne jeden kleinen Entwicklungszyklus durch lange oder falsch kombinierte Tests zu blockieren.

## Fast Check – Standard im Entwicklungsalltag
`npm.cmd run qa:fast`

Prüft getrennt:
- Desktop Kernnavigation und Kernseiten
- Mobile Shell und echte mobile Navigation
- Community-Space, Profil und Event als zentrale Drill-downs
- JavaScript-Fehler und horizontales Overflow auf Kernpfaden

Desktop und Mobile werden bewusst in getrennten Testdateien und Playwright-Projekten ausgeführt.

## Full Check – vor größeren Releases / Alpha / Beta
`npm.cmd run qa:full`

Enthält zusätzlich:
- Desktop Layout-Regression
- Mobile Layout-Regression
- Accessibility-/DOM-Integritätschecks
- Goldstandard-Nutzerabläufe mit echter Speicherung, Reload und
  Desktop-/Mobile-Endzuständen

Goldstandard separat:
- vollständig: `npm.cmd run qa:gold`
- Desktop: `npm.cmd run qa:gold:desktop`
- Mobile 412 × 915: `npm.cmd run qa:gold:mobile`

Visual Regression bleibt separat:
- Baseline: `npm.cmd run qa:baseline`
- Vergleich: `npm.cmd run qa:visual`

## Release-Gates
- `npm.cmd run release-check` = Security/Preflight + Fast QA
- `npm.cmd run release-check:full` = Security/Preflight + Full QA

## Grundregel
Ein Test darf niemals gleichzeitig Desktop- und Mobile-Annahmen mischen. Mobile Navigation wird über Bottom Navigation / Drawer getestet, Desktop über Sidebar. Ein einzelner Test wartet höchstens 8 Sekunden; Standard-Assertions 3 Sekunden.
