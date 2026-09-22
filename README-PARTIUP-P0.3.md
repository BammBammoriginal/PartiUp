# PartiUp P0.3

ParticipationUpwards – Federation-first Ableitung aus BottomUpParti.

## Lokal starten
```bat
setup.bat
start-local.bat
```
Dann: http://localhost:3000

## Im LAN
```bat
start-network.bat
```

## Echter Fediverse-Test
Eine öffentliche HTTPS-Adresse ist erforderlich. `PARTIUP_BASE_URL` muss exakt auf diese kanonische Adresse zeigen. Details: `PARTIUP-P0.3-FEDERATION.md`.

## Prüfen
```bat
npm run partiup-federation-protocol-preflight
npm run check
```
