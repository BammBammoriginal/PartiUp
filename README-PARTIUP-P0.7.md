# PartiUp P0.7

P0.7 adds the first ActivityPub Event vertical slice on top of the P0.6 security-hardened group federation.

## Important privacy rule

Event access and federation are separate. Participant lists are never federated. Non-public events require an explicit Event-level opt-in, and the owning Space must itself allow federation. Incoming remote Events are disabled by default per Space.

## Start on Windows / PowerShell

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```

Public federation test (stable hostname recommended):

```powershell
.\start-federation-test.bat https://YOUR-HOST.example
```
