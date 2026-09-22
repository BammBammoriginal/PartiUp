# PartiUp P0.3.5

- Fix: Security-Preflight erkennt das bestehende 64-kB-JSON-Limit auch dann korrekt, wenn `express.json()` zusätzlich einen `verify`-Hook für ActivityPub-Rohdaten verwendet.
- Keine Abschwächung des Limits und keine Änderung am Laufzeitverhalten.
- Release-Version auf 0.3.5 angehoben.
