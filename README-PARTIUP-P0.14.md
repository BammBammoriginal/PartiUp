# PartiUp P0.14

P0.14 ergänzt eine sichere Media-Federation-Basis für ActivityPub.

Lokale öffentliche/föderierbare Posts und Kommentare können ihre vorhandenen Bildanhänge als ActivityStreams `attachment` ausgeben. Events können ihr vorhandenes Titelbild als `image` ausgeben. Eingehende Fediverse-Inhalte dürfen Bild- und Video-Metadaten mitbringen; PartiUp validiert und speichert nur die für die Darstellung notwendigen Metadaten.

Bilder externer Instanzen werden nicht direkt im Browser hotgelinkt. Für akzeptierte und weiterhin sichtbare Remote-Objekte existiert ein begrenzter Same-Origin-Bildproxy. Dadurch erhält die externe Medienquelle nicht automatisch die IP-Adresse des betrachtenden PartiUp-Nutzers. Videos werden noch nicht geproxyt oder transkodiert, sondern bewusst nur als externer Medienlink angeboten.

## Start unter Windows

```powershell
.\setup.bat
.\start-local.bat
```

LAN:

```powershell
.\start-network.bat
```

## Noch offen
Ein realer Cross-Server-Test gegen Pixelfed und PeerTube ist weiterhin Teil der späteren Federation-Matrix. P0.14 behauptet daher keine vollständige App-Kompatibilität.
