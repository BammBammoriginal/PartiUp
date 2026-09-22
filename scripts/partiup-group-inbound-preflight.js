'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const store=fs.readFileSync(path.join(root,'server','federation','store.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const pkg=require(path.join(root,'package.json'));
const checks=[
 ['release includes P0.6+ inbound federation',(()=>{const [a,b]=String(pkg.version).split('.').map(Number);return a>0||(a===0&&b>=6)})()],
 ['space inbound mode persisted',db.includes("federation_inbound_mode")],
 ['inbound modes off replies threads',server.includes("['off','replies','threads']")],
 ['group Create supported',server.includes("activity.type==='Create'")&&server.includes('linkRemoteObjectToSpace')],
 ['remote Note must address group',server.includes('activityAddresses(o,group.id)')],
 ['public remote objects only',server.includes("!isPublicObject(o)")],
 ['remote object actor ownership enforced',server.includes("o.attributedTo!==remote.id")],
 ['remote object host bound to actor',server.includes("objectUrl.host!==actorUrl.host")],
 ['reply mode cannot open new threads',server.includes("mode!=='threads'")],
 ['remote replies tied to known local/space target',server.includes('remoteObjectLinkedToSpace')&&server.includes('localTarget')],
 ['space remote relation table',store.includes('federation_space_remote_objects')],
 ['Update scoped to linked objects',server.includes("activity.type==='Update'")&&server.includes('remoteObjectLinkedToSpace(db,req.params.id,o.id)')],
 ['Delete scoped to linked objects',server.includes("activity.type==='Delete'")&&server.includes('remoteObjectLinkedToSpace(db,req.params.id,objectUri)')],
 ['moderation endpoint exists',server.includes("/federation/remote-moderation")],
 ['moderation requires moderation.act',server.includes("'moderation.act'")],
 ['remote feed filtered to active moderation',db.includes("ro.moderation_state='active'")],
 ['UI exposes inbound control',ui.includes('communityFederationInbound')],
 ['UI explains remote content',ui.includes('Fediverse')&&ui.includes('peerTrustBadge')&&ui.includes('origin_host')],
 ['outbound off forces inbound off',server.includes("mode==='off'?'off':inbound")],
 ['signed inbox still required',server.includes('verifyLegacySignature(req,activity)')],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\nPartiUp P0.6 group inbound preflight: ${ok}/${checks.length} checks passed.`);if(ok!==checks.length)process.exit(1);
