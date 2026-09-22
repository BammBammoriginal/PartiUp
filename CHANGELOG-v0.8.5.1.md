# BottomUpParti v0.8.5.1 – Dependency Security Fix

Diese Version ändert bewusst keine Produktfunktionen gegenüber v0.8.5.

## Behoben
- Express auf die aktuelle 4.x-Linie `4.22.2` festgesetzt, um keinen unnötigen Major-Versionssprung einzuführen.
- `body-parser` auf die gepatchte Version `1.20.6` festgesetzt.
- `qs` auf die gepatchte Version `6.16.0` erzwungen.
- Multer `2.3.0`, Sharp `0.35.3` und better-sqlite3 `12.11.1` festgesetzt.
- Keine lockere `^`-Auflösung mehr für diese Kernabhängigkeiten.

## Sicherheitsgrund
Die wiederkehrenden npm-Audit-Meldungen stammten aus der Express -> body-parser -> qs-Kette. Die Paketstände wurden gezielt auf gepatchte Versionen gehoben, ohne `npm audit fix --force` zu verwenden.

## Hinweis
Nach `npm.cmd install` bitte weiterhin `npm.cmd audit` ausführen. Sollte npm künftig neue Advisories veröffentlichen, muss eine neue Bewertung erfolgen.
