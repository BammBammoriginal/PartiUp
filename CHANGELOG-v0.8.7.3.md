# v0.8.7.3 – QA Auth & Mobile Navigation Fix

Diese Patch-Version ändert keine Produktfunktion. Sie korrigiert die Browser-QA strukturell:

- Playwright meldet sich pro Testlauf nur noch einmal an und teilt den Session-State mit Desktop- und Mobile-Projekten.
- Dadurch läuft die QA nicht mehr in das produktive Login-Rate-Limit.
- Mobile Tests öffnen für Navigationsziele außerhalb der Bottom-Navigation automatisch den Drawer.
- Der Navigationstest prüft Desktop und Mobile passend zum jeweiligen Projekt statt eines Mobile-Checks im Desktop-Lauf.
- QA-Static-Preflight blockiert künftig wiederholte Login-Hooks und fehlende Mobile-Drawer-Navigation.

Ursache der zuvor vielen roten Tests war überwiegend die Testinfrastruktur, nicht ein gleichzeitiger Defekt aller Produktseiten.
