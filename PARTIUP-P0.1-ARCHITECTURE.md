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

## Content boundary (ADR-0001)

PartiUp remains the canonical system for Spaces, relations, memberships, permissions, participation,
events, projects, social interaction, moderation, notifications and federation. Editorial content such as
help pages, FAQs, handbooks, curated articles, long-form Space information and their editorial media may
later be supplied by a minimal headless Drupal service through an explicit read-only-first adapter.

Open Social is not introduced as a second community core because its groups, events, profiles, feeds,
posts and messaging would duplicate PartiUp's domain and security model. It remains a comparison,
migration and potential external integration candidate. Every object has exactly one canonical source;
external records retain provenance, revision, language, synchronization and deletion state. See
`ADR-0001-CONTENT-GRENZE-DRUPAL-OPEN-SOCIAL.md` for the binding object-by-object allocation.

## P0.1 non-goals
No public ActivityPub inbox/outbox yet; no forced database unification of community/project/event; no third-party plugin marketplace.
P0.1 is deliberately compatibility-first so the next vertical federation slice can be added without rebuilding the product.
