# Pre-Release v0.8.1

Vor Ausspielung werden drei Ebenen automatisch geprüft:

1. Produkt/Architektur (`scripts/preflight.js`)
2. Security/Privacy (`scripts/security-preflight.js`)
3. Mobile/App UX (`scripts/mobile-preflight.js`)

Zusätzlich: Node/Browser-JavaScript-Syntaxprüfung und ZIP-Integrität.

Die Mobile/App-Prüfung umfasst Responsive Layout, Touch-Ziele, Safe Areas, mobile Navigation, Formulare, Dialoge, Accessibility, Reduced Motion, Medien-Lazy-Loading und PWA/App-Readiness.
