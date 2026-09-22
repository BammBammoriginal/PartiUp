# BottomUpParti v0.8.6 – Messaging Core

## Neu
- 1:1-Direktnachrichten zwischen Nutzern.
- Gruppenchats mit mehreren Teilnehmern.
- Kontext-Chats für Community, Projekt oder Event.
- Temporäre Unterhaltungen mit optionalem Ablaufdatum.
- Ungelesen-/Gelesen-Status.
- Antworten auf Nachrichten und Reaktionen.
- Privacy-Regeln `dm_permission` und `group_invites` werden serverseitig geprüft.
- Blockierungen verhindern neue bzw. weitere private Kommunikation.
- Private Chat-Medien sind vom öffentlichen Upload-Bereich getrennt und nur über eine authentifizierte, teilnehmergeprüfte API abrufbar.
- Nachrichten und Medien sind in einem anbieterneutralen internen Modell angelegt; spätere Matrix-/andere Adapter bleiben möglich.

## Bewusst noch nicht vollständig
- Keine Voice-/Video-Calls.
- Kein Federation-/Matrix-Write-back.
- Kurze Videos/Datei-Uploads im Chat bleiben für einen nächsten Media-Hardening-Schritt vorgesehen, sofern die aktuelle UI sie noch nicht vollständig anbietet.

## QA
Die QA-/Regression-Infrastruktur aus v0.8.5.5 wurde übernommen und um einen Messaging-Preflight ergänzt.
