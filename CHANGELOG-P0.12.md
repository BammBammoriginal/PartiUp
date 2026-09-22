# PartiUp P0.12 – Event-Teilnahme & Federation

- Sichtbarkeit, Teilnahmeberechtigung und bestätigte Teilnahme bleiben getrennte Prozesse.
- Lokale Events unterstützen offene Teilnahme, Freigabe, Einladung, Community-Mitgliedschaft, Vertrauensstufe und Kapazität.
- `event.manage_participants` steuert die Teilnahmeverwaltung serverseitig.
- Föderierte Remote-Events: signiertes `Join`/`Leave` über die lokale Person-Identität; `Accept`/`Reject` werden verarbeitet.
- Native PartiUp-Events nehmen signierte `Join`/`Leave` an der tatsächlich zuständigen User- oder Space-Inbox an.
- Föderierte Teilnehmer werden separat gespeichert; lokale Konten und Remote-Actor werden nicht vermischt.
- Teilnehmeridentitäten werden nicht öffentlich über Event-API oder ActivityPub-Eventobjekte ausgegeben.
- Kapazitätszählung berücksichtigt lokale und föderierte bestätigte Teilnahmen.
- Mobile Teilnahmeverwaltung verwendet Touch-Ziele und responsive Stacking.
- Layout-/Designänderungen bleiben von Prozesslogik getrennt und werden durch P0.12-Regressionchecks abgesichert.
