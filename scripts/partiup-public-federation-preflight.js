'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const protocol=read('server/federation/protocol.js');
const server=read('server/server.js');
const selftest=read('scripts/partiup-federation-live-selftest.js');
const checks=[
 ['HTTPS-only remote federation',protocol.includes("u.protocol!=='https:'")],
 ['Private/reserved IP blocking',protocol.includes('isForbiddenIp')&&protocol.includes('Private/reservierte Remote-Adresse blockiert')],
 ['Pinned DNS lookup for HTTPS request',protocol.includes('lookup:(hostname,opts,cb)=>cb(null,target.address,target.family)')],
 ['Remote timeout configured',protocol.includes("envBoundedInt('PARTIUP_FEDERATION_REMOTE_TIMEOUT_MS',8000")||protocol.includes('REMOTE_TIMEOUT_MS=8000')],
 ['Remote response limit configured',protocol.includes("envBoundedInt('PARTIUP_FEDERATION_REMOTE_MAX_BYTES',1024*1024")||protocol.includes('MAX_REMOTE_BYTES=1024*1024')],
 ['Exact keyId/owner validation',protocol.includes("actor.publicKey.id!==sig.keyId||actor.publicKey.owner!==actorUri")],
 ['Signed digest required for bodies',protocol.includes("if(!signedHeaders.includes('digest'))")],
 ['Signature date replay window',protocol.includes('5*60*1000')],
 ['Federation diagnostics endpoint',server.includes("/api/federation/diagnostics")],
 ['Separate public federation handles',protocol.includes('CREATE TABLE IF NOT EXISTS federation_handles')&&protocol.includes('ensureFederationHandle')],
 ['Actor preferredUsername uses public handle',protocol.includes('preferredUsername:handle')],
 ['Actor discoverability is explicit and privacy-aware',protocol.includes('federation_discoverable')&&protocol.includes('discoverable:!!u.federation_discoverable')],
 ['Mastodon-style discovery diagnostics',server.includes('/api/federation/discovery-check')],
 ['Public live selftest checks WebFinger',selftest.includes('/.well-known/webfinger')&&selftest.includes('WebFinger HTTP 200')],
 ['Public live selftest checks actor/outbox',selftest.includes('Actor HTTP 200')&&selftest.includes('Outbox HTTP 200')],
 ['Public live selftest checks WebFinger loopback',selftest.includes('Loopback self zeigt auf denselben Actor')&&selftest.includes('Actor webfinger == acct')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++}
if(failed){console.error(`\n${failed} Public-Federation-Preflight-Pruefung(en) fehlgeschlagen.`);process.exit(1)}
console.log('\nPartiUp P0.3.3 Public-Federation-Preflight bestanden.');
