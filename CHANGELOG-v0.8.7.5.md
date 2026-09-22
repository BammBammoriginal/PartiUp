# v0.8.7.5 – QA Fast/Full Split

- QA in schnellen Alltagscheck und vollständiges Release-Gate getrennt.
- Desktop- und Mobile-Smoke-Tests vollständig getrennt.
- Desktop- und Mobile-Layout-Tests vollständig getrennt.
- Mobile Readiness hängt nicht mehr an einem Desktop-spezifisch sichtbaren Titel.
- Playwright-Testtimeout von 30 s auf 8 s reduziert, Expect-Timeout auf 3 s.
- `qa` ist jetzt bewusst der schnelle Smoke-Check.
- `qa:full` enthält Layout + Accessibility.
- `release-check` nutzt Fast QA; `release-check:full` die komplette Suite.
- Visual Regression bleibt bewusster separater Release-Schritt.
