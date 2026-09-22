# PartiUp P0.3.2 – erster kontrollierter Mastodon-Livetest

P0.3.2 ist der Test-Build fuer Discovery + Actor + Follow/Accept. Noch keine fremden Posts werden in PartiUp gespeichert.

## Empfohlener Ablauf mit Cloudflare Quick Tunnel

1. Einmalig `setup.bat` ausfuehren. Das Security-Gate muss gruen sein.
2. Terminal A: `start-local.bat` starten.
3. Terminal B: `cloudflare-quick-tunnel.bat` starten und die angezeigte `https://...trycloudflare.com` URL kopieren. Terminal B offen lassen.
4. Terminal A mit Strg+C beenden.
5. Terminal A neu: `start-federation-test.bat https://DEINE-URL.trycloudflare.com`
6. Terminal C: `federation-selftest.bat https://DEINE-URL.trycloudflare.com u-max`
7. Nur wenn der Selftest komplett PASS meldet, in Mastodon nach `@u-max@DEINE-DOMAIN` suchen und folgen.
8. Danach in PartiUp/Logs pruefen, ob die Inbox den Follow akzeptiert und die signierte Accept-Activity ausgeliefert wurde.

Hinweis: `u-max` ist nur der lokale Demo-User des Entwicklungsstands. Spaeter bekommt PartiUp eigene vernuenftige, unveraenderliche Handles; die interne Datenbank-ID soll nicht dauerhaft das Produkt-Handle bleiben.

## Sicherheit
Der Testserver bindet bei `start-federation-test.bat` nur an 127.0.0.1. Der Tunnel ist der einzige oeffentliche Zugang. Remote Federation Requests duerfen nur HTTPS-Ziele im oeffentlichen Netz ansprechen; private/LAN-Ziele werden blockiert.

## Wenn Mastodon den Account nicht findet
Zuerst `federation-selftest.bat` erneut ausfuehren. Wenn der Selftest gruen ist, sind WebFinger und Actor von aussen erreichbar. Dann sind Mastodon-Serverlogs bzw. Unterschiede bei Signaturen/Actor-Interpretation der naechste Diagnosepunkt.
