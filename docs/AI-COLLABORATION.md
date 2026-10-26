# PartiUp – Zusammenarbeit zwischen Mensch, ChatGPT/Work und Claude Code

Stand: 2026-10-26 · Status: vorgeschlagener Arbeitsprozess; maßgebliche technische Regeln stehen in `AGENTS.md` und bestehender Projektdokumentation.

## Rollen
- **Projektverantwortliche Person:** bestimmt Produktziele, Prioritäten und gibt Merges/Releases frei.
- **ChatGPT / Work:** Anforderungen konkretisieren, technische Alternativen und Risiken prüfen, vorhandene GitHub-Dateien und PR-Diffs unabhängig bewerten. Darf bei geeignetem Zugriff ebenfalls isolierte Änderungen in eigenen Branches vorbereiten.
- **Claude Code:** standardmäßig ausführender Coding-Agent; implementiert, testet, dokumentiert und erstellt PRs.
- **GitHub:** verbindlicher Stand für Code, Branches, PRs, Kommentare, Tests und Änderungsnachweise. Keine zusätzliche Codex-Nutzung erforderlich.

## Standardablauf
1. **Aufgabe:** Ein Ziel + konkrete Akzeptanzkriterien; bei größeren Vorhaben zuerst in kleine unabhängige Teilaufgaben schneiden.
2. **Bestandsprüfung:** aktueller `main`-Commit, offene PRs, betroffene Dateien/Module und bisherige Architekturentscheidungen.
3. **Branch:** `feature/<thema>`, `fix/<thema>` oder `docs/<thema>`; keine unkoordinierte Parallelbearbeitung derselben Dateien.
4. **Umsetzung durch Claude oder ChatGPT/Work:** nur der vereinbarte Umfang, mit Test- und Dokumentationsnachweis.
5. **Pull Request:** Änderung und Gründe offenlegen. Review bevorzugt durch die andere KI; prüfende KI prüft tatsächlichen Diff plus relevante umliegende Logik, nicht bloß die PR-Beschreibung.
6. **Freigabe:** nur nach passenden real ausgeführten Prüfungen und expliziter menschlicher Entscheidung. Fehlende Browserprüfung blockiert einen Gold-/Release-Anspruch.
7. **Handover:** wichtige Entscheidungen und offene Fragen in `docs/PROJECT-REGISTER.md`, längere Befunde in referenzierten Fachdateien.

## PR-Vorlage (inhaltlich)
- Aufgabe / erwartetes Nutzerverhalten:
- Ausgangsbranch und Ausgangs-Commit:
- Geänderte Komponenten und fachliche Querverbindungen:
- Security-/Privacy-/Federation-Auswirkungen:
- Tests **ausgeführt** (Kommando, Ergebnis, Umgebung):
- Tests **nicht ausgeführt** (Grund):
- Offene Risiken und Rückfallmöglichkeit:
- Dokumentationsänderung / Entscheidungsreferenz:
- Freigabestatus: offen / menschlich freigegeben

## Sonderfälle
- **Hotfix:** so eng wie möglich, Regression gezielt absichern, dokumentierte Tests nicht stillschweigend auslassen.
- **Parallele Agenten:** unterschiedliche Branches und Aufgabengebiete; nach Merge anderer Änderungen neu abgleichen. Vor dem Start mit `gh pr list` und dem Projektregister prüfen, ob ein offener PR dieselben Dateien ändert. Wer einen fremden PR-Branch weiterbearbeitet, vermerkt das im PR als Kommentar; pro Branch arbeitet zur selben Zeit nur ein Agent. Regeldateien (`AGENTS.md`, `CLAUDE.md`, `docs/*`) werden nur in einem Docs-PR gleichzeitig geändert.
- **Mehrere Merges hintereinander:** Die CI prüft jeden PR einzeln, nicht das Ergebnis auf `main`. Nach einer Merge-Serie laufen die Gates einmal auf dem neuen `main`; offene PRs werden danach mit `main` abgeglichen.
- **Widersprüchliche KI-Aussagen:** den tatsächlichen Code und Testnachweise prüfen, Unsicherheit kennzeichnen.
- **ChatGPT im normalen Chat:** kann planen und bei verbundenen Werkzeugen GitHub lesen/ändern. Work ist für umfangreichere mehrstufige Aufgaben geeignet; Codex ist optional, nicht Pflicht.
