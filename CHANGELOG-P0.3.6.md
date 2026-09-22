# PartiUp P0.3.6

Bugfix fuer den Mastodon-Discovery-Livetest.

- Der Selftest liest den ActivityPub-`self`-Link nun korrekt aus dem geparsten WebFinger-JRD (`wf.json`).
- Zuvor wurde versehentlich der HTTP-Response-Wrapper (`wf`) an `selfLink()` uebergeben; dadurch entstand trotz korrektem WebFinger-HTTP-200 ein falsches FAIL.
- Milestone-/Diagnose-Ausgaben auf P0.3.6 aktualisiert.
- Keine Aenderung am ActivityPub-Protokollverhalten selbst.
