# Rollen- und Rechtemodell

Prinzip: RBAC + scoped permissions + objektbezogene Prüfungen, Default Deny.

Owner > Admin > Moderator > Mitglied > Gast.

Die Oberfläche blendet Funktionen nur aus UX-Gründen aus. Entscheidende Schreibaktionen werden zusätzlich auf dem Server autorisiert. Rechte gelten immer im Kontext des konkreten Spaces; eine Moderatorrolle in einem Unterraum erzeugt keine Adminrechte im Eltern-Space.

`permission_overrides` erlaubt spätere Feinabstufungen pro Rolle und Space. Das Modell bleibt kompatibel mit einer späteren ReBAC/OpenFGA-artigen Autorisierungsschicht.
