const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const protocol=fs.readFileSync(path.join(root,'server','federation','protocol.js'),'utf8');
const store=fs.readFileSync(path.join(root,'server','federation','store.js'),'utf8');
const pkg=require(path.join(root,'package.json'));
const checks=[
 ['release is P0.4 or newer',(()=>{const m=String(pkg.version).match(/^0\.(\d+)\.(\d+)$/);return !!m&&Number(m[1])>=4})()],
 ['local posts map to Note',protocol.includes('noteForLocalPost')&&protocol.includes("type:'Note'" )],
 ['comments use inReplyTo',protocol.includes('noteForLocalComment')&&protocol.includes('inReplyTo')],
 ['outgoing public notes cc author followers',protocol.includes('`${author}/followers`')],
 ['outbox contains replies too',server.includes("SELECT id FROM comments WHERE author_id=?")],
 ['Create activity support',protocol.includes('createActivityForNote')&&server.includes("activity.type==='Create'" )],
 ['Update activity support',protocol.includes('updateActivityForNote')&&server.includes("activity.type==='Update'" )],
 ['Delete/Tombstone support',protocol.includes('deleteActivityForObject')&&store.includes('tombstoneRemoteObject')],
 ['remote objects separated from local posts',store.includes('CREATE TABLE IF NOT EXISTS federation_remote_objects')],
 ['delivery queue with retry',protocol.includes('federation_delivery_queue')&&protocol.includes('flushDeliveryQueue')&&protocol.includes("'failed':'retry'")&&server.includes('setInterval(()=>flushDeliveryQueue')],
 ['space federation policy exists',protocol.includes('federationDecisionForPost')&&protocol.includes('space_federation_off')&&protocol.includes('post_not_selected')],
 ['space admin federation API exists',server.includes("'/api/communities/:id/federation'")&&server.includes('space.manage_access')],
 ['post federation override API exists',server.includes("'/api/posts/:id/federation'")&&server.includes("['inherit','enabled','disabled']")],
 ['non-public spaces require explicit selected opt-in',protocol.includes('nonpublic_space_requires_selected_mode')&&protocol.includes('nonpublic_post_requires_explicit_opt_in')&&server.includes('automatische Federation nicht erlaubt')],
 ['incoming public requirement',server.includes('isPublicObject(o)')],
 ['incoming actor/object ownership validation',server.includes("o.attributedTo!==remote.id")&&server.includes('Update actor stimmt nicht')],
 ['unsolicited incoming content deferred',server.includes('!addressed&&!localReply&&!knownReply')],
 ['remote HTML normalized to safe text',server.includes('stripRemoteHtml')&&protocol.includes('replace(/<[^>]*>/g')],
 ['remote-object API exists',server.includes("'/api/federation/remote-objects'")],
 ['private/unlisted objects require explicit public federation',protocol.includes('explicit_public_federation_from_nonpublic_space')&&protocol.includes("mode!=='selected'")&&protocol.includes("state!=='enabled'")],
 ['UI exposes transparent space federation controls',fs.readFileSync(path.join(root,'public','app.js'),'utf8').includes('communityFederationMode')],
 ['UI exposes per-post federation controls',fs.readFileSync(path.join(root,'public','app.js'),'utf8').includes('data-save-post-fed')],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}console.log(`\nPartiUp P0.4 federation content preflight: ${checks.length-fail}/${checks.length} checks passed.`);if(fail)process.exit(1);
