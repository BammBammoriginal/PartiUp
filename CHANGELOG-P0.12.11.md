# PartiUp P0.12.11

## Discover tab isolation

- Fixes a CSS regression where `.discover-landing`, `.discover-browse` and `.fediverse-discover` could override the native `hidden` attribute and therefore render simultaneously.
- `Für dich`, `Lokal`, `Communities`, `Themen` and `Fediverse` now render mutually exclusive content panes.
- Keeps contextual navigation from the For-you landing into Local/Themen.
- Adds a dedicated regression gate for cross-tab content leakage.
- No changes to permissions, federation, data models, routing semantics or Space processes.
