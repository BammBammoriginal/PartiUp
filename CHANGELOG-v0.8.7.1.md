# BottomUpParti v0.8.7.1 — QA DB Lock Fix

- Playwright verwendet ab jetzt für jeden QA-Lauf eine eigene SQLite-Testdatenbank.
- Der bisherige feste Pfad `data/qa-bottomupparti.db` wird nicht mehr vor jedem Lauf gelöscht.
- Dadurch kann Windows keinen `EBUSY: resource busy or locked, unlink ...`-Fehler mehr auslösen, wenn ein früherer Prozess die alte Testdatei noch geöffnet hält.
- Der statische QA-Preflight prüft diese Isolationsregel jetzt ausdrücklich.
- Keine Produktfunktion gegenüber v0.8.7 geändert.
