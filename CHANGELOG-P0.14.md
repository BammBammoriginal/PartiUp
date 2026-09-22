# PartiUp P0.14 – Media Federation

## Ziel
Sichere, provider-neutrale Medienbasis für ActivityPub-Inhalte, ohne bereits einen vollständigen Pixelfed- oder PeerTube-Client zu bauen.

## Umgesetzt
- Eigene Federation-Media-Schicht unter `server/federation/media.js`.
- ActivityStreams `attachment` für Bilder an lokalen Posts und Kommentaren.
- ActivityStreams `image` für lokale Event-Titelbilder.
- Eingehende Bild-/Video-Metadaten werden auf HTTPS, MIME-Typen, URL-Länge, Dimensionen und maximale Anzahl begrenzt.
- Remote-Medien werden getrennt vom lokalen Uploadmodell gespeichert und behalten ihre Herkunft.
- Remote-Bilder werden nicht direkt vom Browser geladen: PartiUp liefert sie nur über einen SSRF-gehärteten Same-Origin-Proxy aus, wenn das zugehörige föderierte Objekt weiterhin aktiv und nicht moderiert/entfernt ist.
- Remote-Videos werden in P0.14 nur als Metadaten plus expliziter externer Link behandelt; kein Streaming-Proxy und keine Transkodierung.
- Unified Feed und externe Events können föderierte Bildmedien darstellen.
- Delete/Tombstone räumt zugehörige Remote-Medienmetadaten auf.

## Bewusst nicht umgesetzt
- eigener Video-Upload / Video-Hosting
- Transkodierung oder Thumbnail-Erzeugung für Remote-Videos
- CDN/Object Storage
- vollständige Pixelfed-/PeerTube-spezifische Features
- automatisches Vorladen externer Medien

## Sicherheitsprinzipien
Remote-Medien sind untrusted input. Es gibt keine frei nutzbare URL-Proxy-API; nur zuvor aus akzeptierten Federation-Objekten gespeicherte Medien-IDs sind abrufbar. Der bestehende Federation-HTTP-Client erzwingt HTTPS, blockiert private Netze und Redirects und verwendet harte Größen-/Timeoutgrenzen.
