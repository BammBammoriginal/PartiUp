# PartiUp P0.15.3

## Comment Media Upload & Display Fix
- Kommentare verwenden jetzt denselben Bildfluss wie Beiträge: Auswahl, Vorschau, Validierung, atomare Erstellung und Darstellung.
- Kommentar + Bild werden serverseitig gemeinsam erstellt; bei einem Bildfehler entsteht kein stiller Textkommentar ohne Medium.
- Das Medium ist vor einer möglichen ActivityPub-Federation mit dem Kommentar verknüpft.
- JPG, PNG, WebP, HEIC und HEIF bis 12 MB; bestehende Bildoptimierung bleibt erhalten.
- Kommentar-Medien behalten ihr Seitenverhältnis und werden nicht unnötig hochskaliert.
- Bestehende Membership-/Author-/Security-Prüfungen bleiben serverseitig erhalten.
