# PartiUp P0.15 — CivicTech / Democracy Integrations

- Added a dedicated domain-integration boundary separate from ActivityPub federation and generic connectors.
- Added provider-neutral manifests for Decidim, Consul Democracy, public democracy data and WeChange.
- Added HTTPS-only source validation and provenance-preserving normalization helpers.
- Added read-only-first participation references and public-data references.
- Reused existing `external_sources` / `object_source_links` instead of adding provider-specific Core tables.
- Added public catalogue/framework diagnostics APIs.
- No scraping, crawler, automatic full synchronization or write-back implementation in this milestone.
