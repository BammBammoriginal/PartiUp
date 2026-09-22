# PartiUp P0.15.1

Bugfix for local post images introduced/exposed around P0.14 media federation.

- selected post image now has an immediate composer preview
- explicit supported local image types and 12 MB client-side guard
- posts with images use one multipart creation path
- image is persisted and linked before ActivityPub Create/Announce is queued
- failed image processing does not intentionally leave a text-only post behind
- existing legacy post-media endpoint remains for compatibility
- no change to CivicTech integration scope
