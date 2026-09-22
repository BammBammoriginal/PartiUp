# PartiUp p0.5 — ActivityPub User Privacy Boundary Hardening

## Scope
This hardening separates three independent dimensions:

1. internal PartiUp profile/access visibility;
2. content/space visibility;
3. ActivityPub federation/publication.

`PARTIUP_BASE_URL` only makes the instance technically federation-capable. It never opts a user into federation.

## User federation settings
`user_preferences` now contains:

- `federation_enabled` — default `0`; explicit user opt-in required for a local Person actor.
- `federation_discoverable` — default `0`; controls the Actor `discoverable` hint independently.
- `federated_profile_fields` — JSON allow-list, default `[]`; currently supports `name`, `bio`, `avatar`, `interests`.

These are server-side authorization/privacy controls. A UI may expose them later, but the ActivityPub boundary does not depend on client behavior.

## Effective Actor policy
If `federation_enabled = 0`, the local user is not exposed through WebFinger, Actor, outbox, followers, following, or inbox endpoints. No handle or actor signing key is created merely because a public base URL exists.

If `federation_enabled = 1`, PartiUp publishes only the minimal protocol identity required for an interoperable actor:

- Actor URL/id
- Person type
- federation handle / `preferredUsername`
- WebFinger acct identifier
- inbox/outbox/followers/following URLs
- actor URL
- public signing key
- explicit `discoverable` value

This minimal identity is inherently public once federation is enabled. Enabling federation therefore needs an informed-product UX before production defaults are finalized.

### Optional profile fields
Name, bio and avatar are included only if BOTH:

1. the field is explicitly selected in `federated_profile_fields`; and
2. `profile_visibility = public`.

Interests are included only if BOTH:

1. `interests` is explicitly selected in `federated_profile_fields`; and
2. `interests_visibility = public`.

`memberships_visibility` and `follows_visibility` never cause membership/follow graph data to be copied into the ActivityPub Actor. This is intentionally conservative.

## Follow privacy
`allow_followers = 0` causes incoming ActivityPub Follow requests to be rejected server-side. The `/followers` and `/following` collections currently expose empty collections and do not disclose remote follower identities, follower counts, or PartiUp's internal follow graph.

This design is deliberately stricter than the internal visibility settings until a specific cross-protocol sharing model is approved.

## Federated authorship
A post may be eligible under its Space/content federation policy and still fail user federation eligibility. A user-authored Note is federated only if the author has explicitly enabled user federation.

Therefore:

- Space federation does not activate a Person actor.
- Post federation does not activate a Person actor.
- Knowing an actor id does not bypass the federation preference.
- `PARTIUP_BASE_URL` does not activate a Person actor.

When a user explicitly federates authored content, the minimal Actor identity above becomes public because ActivityPub needs a resolvable author identity. Rich PartiUp profile data remains separately gated.

## Endpoint enforcement
The following user federation endpoints now share the same opt-in boundary:

- `/.well-known/webfinger`
- `/ap/actors/users/:id`
- `/ap/actors/users/:id/outbox`
- `/ap/actors/users/:id/followers`
- `/ap/actors/users/:id/following`
- `/ap/actors/users/:id/inbox`

Outbound user delivery and follower queues also refuse to operate for federation-disabled users.

## Disabling federation
When the user explicitly disables federation through the preferences API, PartiUp removes local user federation state that would otherwise keep the actor discoverable or usable:

- federation followers
- pending user delivery queue rows
- actor signing key
- federation handle

Existing copies already delivered to remote servers cannot be guaranteed to disappear solely through local deletion. A production-grade ActivityPub account-disable/delete workflow still needs a separately approved remote Delete/Tombstone/retry policy.

## Interaction matrix

| Internal setting | Federation consequence |
|---|---|
| `profile_visibility=private` | Actor may exist only after explicit federation opt-in; name/bio/avatar suppressed |
| `profile_visibility=members` | Actor may exist only after explicit federation opt-in; name/bio/avatar suppressed |
| `profile_visibility=public` | selected name/bio/avatar may federate |
| `interests_visibility=private/members` | interests never included in Actor |
| `interests_visibility=public` | interests included only when explicitly selected |
| `memberships_visibility=*` | memberships are not federated by current model |
| `follows_visibility=*` | internal follow graph is not federated by current model |
| `allow_followers=false` | inbound ActivityPub Follow is rejected |
| `federation_discoverable=false` | Actor says `discoverable=false` |
| `federation_enabled=false` | no public user actor boundary at all |

## Product decisions still required before final UX defaults
The code intentionally chooses restrictive technical defaults, but product/legal/UX owners still need to decide before production UX is finalized:

1. whether enabling federation should be a single master opt-in or a staged flow (actor first, posting later);
2. the exact informed-consent copy explaining that a handle, actor URL and public key become publicly retrievable;
3. whether `discoverable` should be a separate opt-in toggle (current backend supports this and defaults off);
4. which profile fields should be eligible for explicit federation and whether any should require extra confirmation;
5. whether users should be allowed to federate a field even when its internal PartiUp visibility is `members` or `private` (current implementation says no);
6. whether remote follower lists/counts should ever be exposed (current implementation says no);
7. whether disabling federation should send ActivityPub Delete/Tombstone to known remote servers and what retry/retention semantics apply;
8. how already-federated posts should be treated when the author later disables federation;
9. whether remote follow approval should gain a separate manual-approval setting beyond `allow_followers`.

No legal guarantee is made by these defaults. A production privacy notice and retention/federation policy should be reviewed separately.

## Tests
Added:

- `scripts/user-federation-privacy-preflight.js`
- `tests/integration/user-federation-privacy.integration.js`

The integration test covers federation off/on, public/members/private profiles, explicit field release, interests privacy, WebFinger, Actor, outbox, followers/following, and opt-out behavior.
