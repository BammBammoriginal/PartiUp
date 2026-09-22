# PartiUp P0.7 – Event Federation

- ActivityPub `Event` export with `name`, `startTime`, `endTime`, `location` and capacity.
- Mobilizon-compatible `joinMode` baseline and Schema.org-style location/capacity fields.
- Local event Create/Update delivery through existing signed user/group queues.
- Remote public Event Create/Update/Delete via a Space inbox, opt-in per Space.
- Remote events are stored as external events with source actor/URI and native PartiUp rendering.
- Event federation can be controlled per Event; non-public events require explicit opt-in.
- Participant lists are never included in the federated Event object.
- Remote-event lifecycle and moderation states are separated from local event content.
