# PartiUp P0.1 – Start & Test

PartiUp P0.1 is a compatibility-first derivative of BottomUpParti v0.9.3.
The existing SQLite runtime and API are retained while Core, Product Modules, Federation,
Connectors and Integrations receive explicit architecture boundaries.

## Windows setup (first run)
```bat
setup.bat
```

## Local start
```bat
start-local.bat
```
Open: http://localhost:3000

## LAN start
```bat
start-network.bat
```
The console prints the LAN URL. Use LAN mode only on a trusted network.

## Terminal / npm alternative
```bash
npm install
npm start
```
For LAN:
```bash
set BIND_HOST=0.0.0.0 && npm start
```
(PowerShell: `$env:BIND_HOST="0.0.0.0"; npm start`)

## Architecture check
```bash
npm run partiup-architecture-preflight
npm run check
```

## Full existing preflight
```bash
npm run preflight
```
This requires the native dependency `better-sqlite3` to be installed by npm/setup.

## P0.1 compatibility note
Existing environment variable names such as `BUP_DB_PATH`, `BUP_PUBLIC_ORIGIN` and cookie names
are intentionally retained in P0.1 so that the working v0.9.3 runtime is not broken merely by rebranding.
They can be migrated later with backward-compatible aliases.
