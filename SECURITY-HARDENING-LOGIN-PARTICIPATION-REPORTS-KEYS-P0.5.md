# PartiUp p0.5 – Login CSRF, Participation ACL, Reports IDOR & ActivityPub Key Management

## Login-CSRF
`POST /api/login` now uses `loginLimit` and `csrfGuard`. The CSRF bootstrap remains a read-only `GET /api/security/csrf` endpoint before the global `/api` write guard. A successful login always creates a fresh session token, invalidates an existing session cookie if present, rotates the CSRF token, and returns the new CSRF value to the same-origin client. Session cookies remain `SameSite=Strict`; production cookies remain `Secure`. Unknown-account and wrong-password failures intentionally share the same HTTP status and public message.

## Participation access model
Participation is no longer implicitly public. Fields: `visibility` (`public|unlisted|private`), `access_policy` (`open|members|invite|approval|trust`), `min_trust_level`, `owner_space_id`, `propagation_scope`, `role_inheritance`. `participation_access` stores workflow status (`requested|invited|approved|rejected`).

- `public`: discoverable and directly viewable.
- `unlisted`: omitted from lists/bootstrap/search-like discovery but directly viewable by URL; the identifier is not a secret and does not grant private access.
- `private`: requires creator/approved access or the configured policy grant.
- `requested`: never grants view or interaction.
- `approved`: explicit grant.
- `invite`: an invited user may view/interact only under invite policy.
- `members`: requires membership in `owner_space_id`.
- `trust`: requires the configured trust level.

`canViewParticipation()` and `participationCanInteract()` are the central backend decisions. Bootstrap, profile-created content, community aggregation, detail and write endpoints use the same model. Participation is also a first-class RBAC scope with `participation.interact` and `participation.manage_access` permissions.

## Reports / IDOR
`POST /api/reports` no longer snapshots targets through unrestricted raw DB reads. Posts/comments require the reporter to be able to view the owning Community; projects and events reuse their centralized detail/access policies. Invisible targets return a generic 404. Person reports require a visible Community/Project/Event context plus a real relationship of the target user to that scope. Moderator report queues and moderation actions are unchanged and continue to use `moderation.review` / `moderation.act`.

## ActivityPub production key management
Development default: `PARTIUP_FEDERATION_KEY_STORE=sqlite`, preserving simple local setup.

Production default: `encrypted-file`. SQLite retains public-key metadata but stores no usable private PEM after migration. Private keys are AES-256-GCM encrypted in separate User/Space namespaces. Directories are created with mode 0700 and key files with mode 0600 where supported. The 32-byte master key must be supplied outside the repository through `PARTIUP_FEDERATION_MASTER_KEY` or `PARTIUP_FEDERATION_MASTER_KEY_FILE`. No default/master secret is committed.

Recommended production hierarchy:
1. Container/OS secret manager mounts a master-key file read-only to the application account.
2. Encrypted key files live on a persistent volume separate from the SQLite backup where practical.
3. Backups must include DB + encrypted key volume, but master-key backup/escrow must be separate and access-controlled.
4. User and Space actors have independent key material and can rotate independently.
5. Rotation functions generate a new RSA-2048 keypair and atomically replace encrypted private material plus DB public key. Production UX/operations must coordinate publication of the new public key and remote retry windows.
6. If private material is lost but the actor identity remains, do not silently generate a replacement during normal lookup; require explicit re-key/incident handling. Remote peers may temporarily reject signatures until they refetch the actor.
7. A later `KMS/HSM` backend should implement the same store interface while returning signatures/key references instead of exportable private PEM. This release does not claim HSM support is already implemented.

### Environment
- `PARTIUP_FEDERATION_KEY_STORE=sqlite|encrypted-file`
- `PARTIUP_FEDERATION_KEY_DIR=/persistent/private/path`
- `PARTIUP_FEDERATION_MASTER_KEY=<32-byte hex/base64 secret>`
- `PARTIUP_FEDERATION_MASTER_KEY_FILE=/run/secrets/partiup-federation-master-key`

Do not put the master key in `.env` files committed to source control. Production deployment should prefer a file mounted from the platform secret manager.

## Remaining production decisions
Define operational rotation cadence, emergency compromise/re-key procedure, master-key escrow and access roles, backup retention/destruction, and whether the future KMS/HSM backend is mandatory at a particular scale. These are security/operations decisions, not legal guarantees.
