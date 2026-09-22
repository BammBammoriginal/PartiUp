# BottomUpParti Design-System — v0.8.3

## Prinzip
Farben werden nicht als Produktlogik behandelt. Die UI verwendet semantische CSS-Variablen, damit Branding, Kontrast, Dark Mode oder eine spätere App-Palette zentral angepasst werden können.

Die zentrale Quelle ist der `:root`-Block am Anfang von `public/style.css`.

### Kernfamilien
- `--color-brand-*`: BottomUpParti-Grün in Abstufungen
- `--color-neutral-*`: Hintergründe, Text, Linien
- `--color-info*`: neutrale Information / Vertrauenshinweise
- `--color-success*`: positive Zustände / Pro
- `--color-warning*`: Warnung / besondere Kennzeichnung
- `--color-danger*`: Fehler / Contra / kritische Aktionen

### Semantische Aliase
Die Komponenten verwenden bevorzugt `--bg`, `--panel`, `--ink`, `--muted`, `--line`, `--accent`, `--accent2`, `--sidebar-*`. Dadurch kann eine spätere Palette geändert werden, ohne jede Komponente einzeln umzuschreiben.

## UX-Regeln
- Farbe ist nie der einzige Informationsträger.
- Status, Verifikation und Autorisierung bleiben zusätzlich textlich beschriftet.
- Kontrast und Touch-/Mobile-Regeln werden im Preflight mitgeführt.
- Pro/Contra nutzt semantische Farben, aber immer zusätzlich die Wörter „Pro“ und „Contra“.
