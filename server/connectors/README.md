# Connector Layer — P0.13 foundation

PartiUp connectors are adapters for **non-ActivityPub** systems. They are deliberately separate from:

- ActivityPub federation (`server/federation/`)
- product/core modules
- larger civic integrations (`server/integrations/`)

## P0.13 rules

1. A connector declares explicit capabilities before it can read/write external systems.
2. External sources are explicit HTTPS endpoints; credentials embedded in URLs are rejected.
3. Provider-specific payloads must be normalized before entering PartiUp product flows.
4. Normalized records always retain provenance (`connector_id`, external id, canonical source URL).
5. The Core must not become a generic proxy or expose arbitrary remote fetching.
6. There is no hidden synchronization, crawler, analytics or ranking behavior.
7. ActivityPub behavior stays in the Federation Layer; connectors must not duplicate it.

P0.13 provides the framework and public manifest/catalogue. RSS/Atom, ATProto and provider APIs remain separate adapters to be implemented in later scoped steps.
