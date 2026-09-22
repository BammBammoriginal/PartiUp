# PartiUp p0.5 – ActivityPub Inbox DoS / Resource Hardening

## Scope
Server-side hardening for:
- `POST /ap/actors/users/:id/inbox`
- `POST /ap/actors/spaces/:id/inbox`

The existing SSRF policy remains in force: HTTPS only, no redirects, DNS resolution pinned to a validated public address, private/reserved/local networks rejected, credentials in remote URLs rejected.

## Layered limits and safe defaults
All numeric environment settings are bounded in code; invalid values fall back to the safe default.

| Setting | Default | Hard code bounds / purpose |
|---|---:|---|
| `PARTIUP_FEDERATION_IP_PER_MINUTE` | 120 | sustained ingress budget per remote IP |
| `PARTIUP_FEDERATION_IP_BURST` | 60 | allows normal Fediverse batching/shared NAT bursts |
| `PARTIUP_FEDERATION_ACTOR_PER_MINUTE` | 60 | authenticated actor processing budget |
| `PARTIUP_FEDERATION_ACTOR_BURST` | 30 | short actor burst |
| `PARTIUP_FEDERATION_HOST_PER_MINUTE` | 240 | authenticated remote host processing budget |
| `PARTIUP_FEDERATION_HOST_BURST` | 60 | host burst; not a permanent server block |
| `PARTIUP_FEDERATION_REMOTE_FETCH_CONCURRENCY` | 16 | maximum parallel remote HTTPS fetches; no unbounded wait queue |
| `PARTIUP_FEDERATION_ACTOR_LOOKUP_CONCURRENCY` | 8 | maximum parallel actor/public-key lookups |
| `PARTIUP_FEDERATION_ACTOR_CACHE_ENTRIES` | 2000 | bounded LRU-like TTL cache |
| `PARTIUP_FEDERATION_ACTOR_CACHE_TTL_MS` | 300000 | 5 minute positive actor/key TTL |
| `PARTIUP_FEDERATION_NEGATIVE_CACHE_TTL_MS` | 15000 | 15 seconds, only 404/410 actor results |
| `PARTIUP_FEDERATION_REPLAY_CACHE_ENTRIES` | 10000 | bounded recent replay cache |
| `PARTIUP_FEDERATION_REPLAY_CACHE_TTL_MS` | 600000 | 10 minute in-memory replay acceleration; DB remains persistent source |
| `PARTIUP_FEDERATION_REMOTE_TIMEOUT_MS` | 8000 | hard-bounded to 1–15 seconds |
| `PARTIUP_FEDERATION_REMOTE_MAX_BYTES` | 1048576 | general remote response; hard max 2 MiB |
| `PARTIUP_FEDERATION_ACTOR_MAX_BYTES` | 262144 | stricter Actor JSON response; hard max 512 KiB |
| `PARTIUP_JSON_BODY_MAX_BYTES` | 65536 | inbound JSON body; bounded to 16–256 KiB |
| `PARTIUP_FEDERATION_RATE_BUCKETS` | 5000 | maximum rate-bucket cardinality |

### Why IP is not the only limiter
Fediverse installations may share egress IPs through NAT, proxies or hosting providers. The IP default therefore permits a meaningful burst and sustained traffic. Actor and host quotas are applied only after successful signature verification, preventing an unauthenticated attacker from exhausting a legitimate actor's budget merely by spoofing `activity.actor`.

## Actor / public-key cache
Only a minimized actor record is cached: actor id, inbox/sharedInbox and the public-key identity/material needed by signature verification. Profile data is not retained in this cache.

A cached key does not block rotation. If cryptographic verification fails with a cached key, PartiUp invalidates that actor cache entry and performs one forced fresh lookup. The request is accepted only if the fresh key validates the same signed request.

Negative caching is intentionally narrow: only HTTP 404/410 actor responses are cached, for 15 seconds by default. Timeouts, capacity exhaustion, DNS/network errors and 5xx responses are not negative-cached.

## Concurrency / overload behavior
Remote HTTPS operations and actor lookups use fixed concurrency gates with no unbounded pending queue. When capacity is exhausted, the inbox returns:

- `429 {"error":"federation_rate_limited"}` for request/actor/host rate exhaustion.
- `503 {"error":"federation_temporarily_unavailable"}` for concurrency exhaustion.

No internal hostname, actor fetch URL, DNS address, key id or exception text is sent to the remote requester.

## Replay protection
Inbound Activity IDs are now mandatory, <= 2048 characters, absolute HTTPS URLs, and cannot carry URL credentials. Signature verification still occurs before an already-seen Activity is accepted as a replay.

Replay detection is two-layered:
1. bounded 10-minute in-memory actor+Activity-ID cache for fast repeated requests;
2. persistent `federation_activities.activity_uri` uniqueness/database lookup across restarts.

The replay marker is written after the activity record is committed. Existing DB uniqueness remains the durable replay boundary.

## Existing boundaries retained / strengthened
- Signature verification happens before any Activity side effect.
- SSRF defenses are unchanged.
- Remote redirects remain unsupported.
- DNS is resolved and pinned to the validated public address used for the HTTPS connection.
- General remote response remains capped; actor documents have a smaller cap.
- Inbound JSON body remains bounded.
- Remote request timeout remains bounded and configurable.
- Rate/cache data structures have explicit maximum cardinality.
- Logging is intentionally coarse: rejection category/code only, truncated to 80 chars; response bodies do not expose failure internals.

## Tests
`npm run federation-inbox-hardening-preflight`
- route-specific federation limiting
- authenticated Actor/Host limiting
- signature-before-replay ordering
- HTTPS Activity ID requirement
- bounded maps/caches
- cache/key-rotation behavior
- SSRF rules
- body/remote-size/timeouts
- generic 429/503 responses

`npm run federation-inbox-resource-integration`
- burst flooding
- attacker-controlled many-host cardinality
- concurrency exhaustion without queued growth
- replay recognition and bounded replay cache
- remote timeout/response policy bounds

The resource integration test uses only Node built-ins and can run without the full application dependency tree.

## Operational note
These are conservative development defaults, not universal production capacity numbers. Before a public deployment, measure normal federation traffic and tune within the hard code bounds. Raising limits should be based on observed capacity and should not remove the global concurrency or bounded-memory protections.
