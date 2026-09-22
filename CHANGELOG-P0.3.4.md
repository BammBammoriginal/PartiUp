# PartiUp P0.3.4

Hotfix for the Windows setup/dependency preflight.

- Corrects `scripts/dependency-preflight.js` to require `sharp 0.35.4` instead of the obsolete vulnerable `0.35.3`.
- Keeps `package.json` and `package-lock.json` aligned with the same safe exact version.
- Bumps the PartiUp development release to `0.3.4`.
- No product, database, ActivityPub, UX, or federation behavior changes.
