# PartiUp P0.3.1

Security maintenance release based on P0.3.

## Changes

- Pins `sharp` to `0.35.4` instead of `0.35.3` to address the high-severity libheif advisories reported by `npm audit` on 2026-09-10.
- Updates package metadata to version `0.3.1`.
- Renames the visible setup banner from `BottomUpParti` to `PartiUp`.
- No intended changes to ActivityPub behavior, UI, participation, spaces, RBAC, trust/provenance, moderation, federation adapters, or connector architecture.

## Security note

Do not use `npm audit fix --force`. The vulnerable direct dependency is upgraded explicitly and pinned.

## Verification

Static syntax and PartiUp preflight checks were run for the modified source. A fresh online `npm audit` must run on the target machine during `setup.bat`; this build environment has no npm-registry network access.
