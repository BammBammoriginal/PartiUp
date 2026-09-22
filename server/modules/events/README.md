# events module

P0.1 boundary marker. Existing v0.9.3 runtime behaviour remains in server/server.js and server/db.js for compatibility.
The next refactor may move only the events-specific routes/services behind this boundary without changing the public API first.

## PartiUp P0.7 – Federation boundary
- Native events can be represented as ActivityStreams `Event` objects.
- Interoperable federation requires machine-readable `start_at` and `end_at` with timezone designators.
- Event access/attendance and public federation are separate decisions.
- Participant lists are never part of the federated Event payload.
- Remote events are imported only when a Space admin explicitly enables inbound event federation.
- Remote event origin, actor and lifecycle remain visible and separately moderatable.
