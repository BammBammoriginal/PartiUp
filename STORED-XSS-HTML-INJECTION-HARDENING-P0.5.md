# PartiUp p0.5 – Stored-XSS / HTML-Injection Hardening

## Scope
Basis ist `PartiUp-p0.5-activitypub-inbox-resource-hardened`. Das Hardening prüft API/DB-Daten, die über `innerHTML`, `insertAdjacentHTML` oder Template-Strings in HTML-, Attribut-, URL-, Klassen- oder Style-Kontexte gelangen.

## Rendering-Regeln
- HTML-Text aus API/DB wird mit `esc()` kodiert.
- Attributwerte werden mit `escAttr()` kodiert.
- Medien-URLs werden vor Ausgabe auf lokale, erwartete Pfade begrenzt (`safeMediaUrlValue()` / `mediaSrc()`).
- Dynamische Klassenwerte werden nur aus Allowlist-Werten erzeugt (`safeClassToken()`).
- Icons/Emoji aus Datenquellen werden über `safeIcon()` auf definierte Symbolwerte begrenzt.
- Numerische Style-Werte wie Fortschritt werden in Zahlen umgewandelt und begrenzt.
- Bestehende DOM-API-/`textContent`-Nutzung bleibt bevorzugt, wo kein HTML-Layout benötigt wird.

## Konkret gehärtete Renderpfade
Unter anderem: `relationPills`, Community-/Projekt-/Event-/Beteiligungskarten, Ortsbaum, Themenkarten, Personen-/Mitgliedschaftsansichten, Chatnachrichten/Reaktionen, Participation-Details/Argumente, Objekt-Details, Space-Relations, Rollen-/Permission-Ansichten, Benachrichtigungen, Multi-Select-Optionen und Medien-Attribute.

## Server-side Validation
Normale Textfelder werden nicht pauschal von HTML-Zeichen bereinigt. Zeichen wie `<`, `>` oder `&` dürfen als Textinhalt existieren, werden aber beim HTML-Rendering kodiert. Für relevante Create/Update-Endpunkte werden Typ, Länge und Steuerzeichen serverseitig geprüft (`validatedUserText`). Icons werden serverseitig strikt gegen `SAFE_INPUT_ICONS` validiert (`validatedIcon`). Topics durchlaufen ebenfalls die validierte Textbehandlung.

## CSP
`script-src` bleibt `script-src 'self'`; es wurde kein `unsafe-inline` für Scripts eingeführt. Die bestehende CSP wurde nicht gelockert.

## Regression Payloads
Die Tests prüfen u.a.:
- `<img src=x onerror=alert(1)>`
- `<style>body{display:none}</style>`
- `<svg><script>alert(1)</script></svg>`
- doppelte/einfache Anführungszeichen mit Event-Handler-Attributen
- bereits HTML-entity-kodierte Eingaben
- bösartige Werte im Icon-Kontext

## Security Gates
- `scripts/xss-html-injection-preflight.js`: konkrete gefährliche Renderpfade statt nur Existenz einer Escape-Funktion.
- `tests/security/xss-payloads.test.js`: Payload-Regression für HTML-/Attributzeichen und Icons.
- `scripts/security-preflight.js`: erweitert um konkrete XSS-Pfade, CSP-script-src und serverseitige Icon-Validierung.

## Grenzen
Dieses Hardening schützt die derzeitigen Renderpfade und schafft Release-Gates für die bekannten Sink-Kategorien. Neue `innerHTML`-/Template-Sinks müssen weiterhin im Review geprüft werden. Für langfristige Wartbarkeit ist ein schrittweiser Umbau komplexer UI-Komponenten auf DOM-Erzeugung/`textContent` oder ein templating-System mit Auto-Escaping empfehlenswert.
