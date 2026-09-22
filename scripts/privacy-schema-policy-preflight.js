const fs=require('fs');
const {PRIVACY_LIFECYCLE_POLICY}=require('../server/privacy');
const files=['server/db.js','server/federation/protocol.js','server/federation/store.js'];
const aliases=['user_id','created_by','owner_user_id','author_id','reporter_id','actor_id','assigned_by','updated_by','decided_by','invited_by','sender_id','blocker_id','blocked_id','assigned_to','resolved_by','assignee_user_id','local_user_id'];
const found=new Map();
for(const file of files){const src=fs.readFileSync(file,'utf8');const re=/CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([^;]*?)\);/gms;let m;while((m=re.exec(src))){const table=m[1],body=m[2];const cols=aliases.filter(c=>new RegExp(`\\b${c}\\b`).test(body));if(cols.length)found.set(table,cols)}}
// federation_entities has a polymorphic user identity rather than a user_id column.
found.set('federation_entities',['entity_type=user/entity_id']);
const unmapped=[...found.keys()].filter(t=>!PRIVACY_LIFECYCLE_POLICY[t]);
console.log('\nPrivacy schema/policy inventory');for(const [t,c] of [...found].sort())console.log(`${PRIVACY_LIFECYCLE_POLICY[t]?'✓':'✗'} ${t}: ${c.join(', ')} -> ${PRIVACY_LIFECYCLE_POLICY[t]||'UNMAPPED'}`);
if(unmapped.length){console.error(`\nUnmapped personal-data tables: ${unmapped.join(', ')}`);process.exit(1)}
console.log(`\nPrivacy schema policy: ${found.size}/${found.size} mapped`);
