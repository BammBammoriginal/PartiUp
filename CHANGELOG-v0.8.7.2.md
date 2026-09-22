# BottomUpParti v0.8.7.2 — Version Source-of-Truth Fix

- `package.json` ist ab jetzt die einzige Runtime-Quelle für die Versionsnummer.
- Health-API und Server-Start lesen die Version dynamisch aus `package.json`.
- UI und Start-/Setup-Skripte enthalten keine hartcodierten Release-Versionen mehr.
- Der Version-Preflight blockiert künftige hartcodierte Runtime-Versionen.
- Keine Produktfunktion gegenüber v0.8.7.1 geändert.
