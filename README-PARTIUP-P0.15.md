# PartiUp P0.15

P0.15 establishes the CivicTech / Democracy integration layer.

The important architectural distinction is now explicit:

- ActivityPub/Fediverse → `server/federation/`
- generic non-ActivityPub adapters → `server/connectors/`
- domain-specific CivicTech/Democracy integrations → `server/integrations/`

Decidim, Consul Democracy, public democracy data and WeChange are represented as planned adapters with explicit capabilities. P0.15 does not claim complete API interoperability with any of them yet.

## Start on Windows

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```
