# Claude Code – PartiUp

Lies zuerst `AGENTS.md` sowie `docs/AI-COLLABORATION.md` und `docs/PROJECT-REGISTER.md`. Die dortigen gemeinsamen Regeln gelten auch für Claude Code.

## Deine Standardrolle
Du bist zunächst der ausführende Coding-Agent. Plane die kleinste saubere Änderung, überprüfe den aktuellen GitHub-Stand und implementiere nur den vereinbarten Aufgabenumfang. ChatGPT/Work kann Planung und unabhängiges Review übernehmen; Code und Tests haben Vorrang vor KI-Behauptungen.

## Vor jeder Umsetzung
1. Aktuellen Branch/Commit und relevante offene PRs prüfen; nicht auf veralteter Codebasis starten.
2. Produktziel, Akzeptanzkriterien, betroffene Space-Kontexte, Risiken und Teststrategie kurz notieren.
3. Passende vorhandene Dokumente und Tests prüfen. Keine parallele Änderung derselben Dateien ohne Abstimmung.

## Nach jeder Umsetzung
1. Zielgerichtete Tests, notwendige Security-/Privacy-Regressionen sowie erforderliche Gold-Browserstrecken ausführen.
2. Fehlende Browser-/CI-Umgebungen ausdrücklich als noch ungeprüft melden, niemals einen Release behaupten.
3. Einen aussagekräftigen PR erstellen bzw. aktualisieren; Änderungen und Testevidenz im PR dokumentieren.
4. Bei handoff-relevanten Architekturentscheidungen das Projektregister aktualisieren; alte Protokolle nicht überschreiben.

## Grenzen
Kein direkter Push nach `main`, kein eigenmächtiger Merge, kein produktiver Rollout, keine irreversiblen Datenbankaktionen oder Lockerungen der Sicherheit ohne ausdrückliche Freigabe.
