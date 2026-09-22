# PartiUp P0.12.9

## Security preflight compatibility fix

- Updated the security-hardening regression check for profile-created participation.
- The production logic was already safe: `userProfile()` derives created participation from `listParticipation(viewerId)` and then filters by creator.
- The previous preflight expected an obsolete object-literal shape and therefore produced a false negative after the profile/privacy refactor.
- No participation visibility, permission, profile privacy, federation, or rendering behavior was loosened or changed.
