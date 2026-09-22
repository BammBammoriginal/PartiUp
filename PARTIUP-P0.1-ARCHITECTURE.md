# PartiUp P0.1 — Architektur-Baseline

PartiUp (ParticipationUpwards) is derived from BottomUpParti v0.9.3 without throwing away the working prototype.
P0.1 freezes product behaviour while introducing explicit boundaries for Core, Product Modules, Federation,
Connectors and Domain Integrations.

## Product core
Identity, Spaces, Relations, Places, Topics, Memberships, Permissions/RBAC, Trust & Provenance,
Moderation, Feed, Search and Notifications remain cross-cutting core capabilities.

## Participation
Participation is a core product capability across all space types. Polls, votes, proposals, prioritisation,
pro/con and later procedures are variants of one participation concept. Civic/democratic participation is a use case,
not a separate product silo. Existing community polls and the richer participation tables stay compatible in P0.1;
a destructive database merge is intentionally deferred.

## Modules
Events, Projects, Discussion, Tasks and Media are modular capabilities that share the same Core policies.
Projects and Events already have object_modules in v0.9.3; P0.1 preserves that behaviour.

## Interoperability
- ActivityPub/Fediverse: core interoperability layer, implemented incrementally from P0.2/P0.3.
- Connectors: separate adapters for non-ActivityPub sources/networks such as RSS/Atom, AT Protocol or provider APIs.
- Integrations: Decidim, WeChange and democracy/public-data integrations remain domain-specific adapters.

## P0.1 non-goals
No public ActivityPub inbox/outbox yet; no forced database unification of community/project/event; no third-party plugin marketplace.
P0.1 is deliberately compatibility-first so the next vertical federation slice can be added without rebuilding the product.
