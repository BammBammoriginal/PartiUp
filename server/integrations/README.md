# PartiUp CivicTech / Democracy Integrations — P0.15

This layer is for **domain integrations** such as Decidim, Consul Democracy, public democracy/parliament data and WeChange.
It stays separate from:

- `server/federation/` — ActivityPub/Fediverse interoperability
- `server/connectors/` — generic non-ActivityPub networks, feeds and APIs
- PartiUp Core — local participation, Spaces, permissions and product UX

## P0.15 rules

1. Integrations are **read-only first**. Write-back is disabled unless a later adapter explicitly implements and authorizes it.
2. Every imported/reference record keeps provider, external id and canonical HTTPS source URL.
3. Existing PartiUp permissions remain authoritative for local objects; an integration never widens local access rights.
4. Provider payloads must be normalized before entering PartiUp product flows.
5. No hidden full sync, crawler or scraping is introduced by this foundation.
6. No provider-specific tables are needed for the foundation: `external_sources` and `object_source_links` remain the provider-neutral provenance base.
7. Public democracy data must not become an excuse for behavioural tracking or unnecessary profile enrichment.
8. Decidim/Consul remain external systems. PartiUp does not copy their whole product or administration model into Core.
