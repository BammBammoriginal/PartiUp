'use strict';
const fs=require('fs');
const files={db:fs.readFileSync('server/db.js','utf8'),protocol:fs.readFileSync('server/federation/protocol.js','utf8'),server:fs.readFileSync('server/server.js','utf8')};
const checks=[
 ['restrictive federation default',/federation_enabled INTEGER NOT NULL DEFAULT 0/.test(files.db)],
 ['restrictive discoverability default',/federation_discoverable INTEGER NOT NULL DEFAULT 0/.test(files.db)],
 ['explicit federated field allowlist',/\['name','bio','avatar','interests'\]/.test(files.protocol)&&/federated_profile_fields/.test(files.db)],
 ['no automatic user handle bootstrap',!files.db.includes('ensureFederationHandle(db,row.id)')],
 ['actor requires federation opt-in',/actorDocument[\s\S]*!u\.federation_enabled/.test(files.protocol)],
 ['profile visibility gates profile fields',/profilePublic=u\.profile_visibility==='public'/.test(files.protocol)],
 ['interests visibility gates federated interests',/u\.interests_visibility==='public'/.test(files.protocol)],
 ['webfinger resolves only enabled users',/userIdForHandle[\s\S]*federation_enabled,0\)=1/.test(files.protocol)],
 ['outbox requires enabled actor',/users\/:id\/outbox[\s\S]*actorDocument\(db,req\.params\.id\)/.test(files.server)],
 ['followers endpoint requires enabled actor',/users\/:id\/followers[\s\S]*actorDocument\(db,req\.params\.id\)/.test(files.server)],
 ['following endpoint requires enabled actor',/users\/:id\/following[\s\S]*actorDocument\(db,req\.params\.id\)/.test(files.server)],
 ['inbox requires federation enabled',/!local\|\|!isUserFederationEnabled\(db,local\.id\)/.test(files.server)],
 ['allow_followers enforced for AP Follow',/!federationPref\?\.allow_followers/.test(files.server)&&/type:'Reject'/.test(files.server)],
 ['post federation requires author opt-in',/author_federation_disabled/.test(files.protocol)],
 ['user delivery refuses federation disabled',/User federation is disabled/.test(files.protocol)],
 ['disabling federation deletes handle and key',/DELETE FROM federation_actor_keys/.test(files.server)&&/DELETE FROM federation_handles/.test(files.server)],
 ['followers collection does not expose identities or counts',/orderedCollection\(`\$\{actor\.id\}\/followers`,0,\[\]\)/.test(files.server)]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'✓':'✗'} ${name}`);if(pass)ok++;}
console.log(`\nUser federation privacy: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
