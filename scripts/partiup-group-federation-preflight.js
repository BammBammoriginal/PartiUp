const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const protocol=fs.readFileSync(path.join(root,'server','federation','protocol.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const pkg=require(path.join(root,'package.json'));
const checks=[
 ['release includes P0.5+ group federation',(()=>{const [a,b]=pkg.version.split('.').map(Number);return a===0&&b>=5})()],
 ['community mapping remains ActivityPub Group',fs.readFileSync(path.join(root,'server','federation','model.js'),'utf8').includes("community: Object.freeze({ activityType: 'Group'")],
 ['space actor id is stable',protocol.includes('/ap/actors/spaces/')&&protocol.includes('spaceActorId')],
 ['space handles are separate and unique',protocol.includes('federation_space_handles')&&protocol.includes('ensureSpaceFederationHandle')],
 ['space actor has own signing key',protocol.includes('federation_space_actor_keys')&&protocol.includes('ensureSpaceActorKey')],
 ['space followers are persisted separately',protocol.includes('federation_space_followers')],
 ['space delivery queue has retry',protocol.includes('federation_space_delivery_queue')&&protocol.includes('flushSpaceDeliveryQueue')],
 ['Group actor document exposed',server.includes("'/ap/actors/spaces/:id'")&&protocol.includes("type:'Group'" )],
 ['Group actor has inbox/outbox/followers/following',protocol.includes('spaceActorDocument')&&protocol.includes('followers:`${id}/followers`')&&protocol.includes('following:`${id}/following`')],
 ['WebFinger resolves space handles',server.includes('spaceIdForHandle')&&server.includes('ensureSpaceFederationHandle')],
 ['disabled federation hides Group actor',protocol.includes("c.federation_mode==='off'")],
 ['community Notes carry audience Group',protocol.includes('audience:group')],
 ['root posts carry conversation context',protocol.includes('context:id')],
 ['replies keep parent context',protocol.includes('context:parent')],
 ['Group announces community posts',protocol.includes('announceActivityForGroup')&&server.includes('groupFederatedDeliveries')],
 ['Group Announce targets public + followers',protocol.includes("type:'Announce'")&&protocol.includes('cc:[`${group}/followers`]')],
 ['Group inbox verifies HTTP signatures',server.includes("app.post('/ap/actors/spaces/:id/inbox'")&&server.includes('await verifyLegacySignature(req,activity)')],
 ['remote Follow to Group supported',server.includes("activity.type==='Follow'&&activity.object===group.id")],
 ['Group Follow accepted with Group signature',server.includes('await deliverSpaceActivity(db,req.params.id,inbox,accept)')],
 ['remote group writes remain deferred by default',server.includes("reason:'group_activity_deferred'")],
 ['all community handles backfilled',db.includes("SELECT id FROM communities")&&db.includes('ensureSpaceFederationHandle(db,row.id)')],
 ['space retry worker enabled',server.includes('flushSpaceDeliveryQueue(db)')],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}
console.log(`\nPartiUp P0.5 Group-Federation-Preflight: ${checks.length-fail}/${checks.length} checks passed.`);if(fail)process.exit(1);
