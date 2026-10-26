// Who may publish a Space post to the Fediverse (owner decision K2, 2026-10-26):
// two keys - the author's consent for the post and, in a non-public Space, the
// Space's external-publication right (content.publish_external). Restricting stays
// open to author and administration. The right is checked on every decision, so a
// later role change or leaving the Space also stops serving the post.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');

const port=35600+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const publicBase='https://publication.example.test';
const dbPath=path.join(process.cwd(),'data',`post-publication-${process.pid}-${Date.now()}.db`);
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const server=spawn(process.execPath,['server/server.js'],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1',PARTIUP_BASE_URL:publicBase},
  stdio:['ignore','pipe','pipe']
});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);

function jar(){return {cookies:new Map(),csrf:null}}
function absorb(j,res){for(const raw of res.headers.getSetCookie?.()||[]){const first=String(raw).split(';',1)[0];const i=first.indexOf('=');if(i>0)j.cookies.set(first.slice(0,i),first.slice(i+1));}}
async function req(j,method,url,body){
  const headers={Accept:'application/json'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(j){const c=[...j.cookies].map(([k,v])=>`${k}=${v}`).join('; ');if(c)headers.Cookie=c;if(method!=='GET'&&j.csrf)headers['X-BUP-CSRF']=j.csrf;}
  const res=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  if(j)absorb(j,res);
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(j&&data?.csrf)j.csrf=data.csrf;
  return {status:res.status,data};
}
async function login(email){const j=jar();await req(j,'GET','/api/security/csrf');const r=await req(j,'POST','/api/login',{email,password:'demo123'});if(r.status!==200)throw new Error(`Login ${email}: ${r.status}`);return j;}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start\n'+serverOut)}
const passed=[];
function check(name,ok,detail=''){if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`);passed.push(name);console.log(`✓ ${name}`)}
async function status(name,promise,expected){const r=await promise;check(name,r.status===expected,`expected ${expected}, got ${r.status}: ${JSON.stringify(r.data)}`);return r}

(async()=>{
  let sql;
  try{
    await ready();
    const Database=require('better-sqlite3');
    sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
    process.env.PARTIUP_BASE_URL=publicBase;
    const protocol=require('../../server/federation/protocol');
    const anon=jar();
    const max=await login('max@bottomupparti.local');
    const anna=await login('anna@bottomupparti.local');

    // Fixtures: Space, membership, personal federation opt-in and Space policy.
    const closed=await status('Owner creates a closed Space',req(max,'POST','/api/communities',{name:'Publikation geschlossen',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'private',join_policy:'invite'}),201);
    const closedId=closed.data.id;
    sql.prepare("INSERT OR IGNORE INTO memberships(community_id,user_id,role) VALUES (?,'u-anna','member')").run(closedId);
    sql.prepare("UPDATE user_preferences SET federation_enabled=1 WHERE user_id IN ('u-max','u-anna')").run();
    sql.prepare("UPDATE communities SET federation_mode='selected' WHERE id=?").run(closedId);

    const capabilities=await status('Member reads the closed Space',req(anna,'GET',`/api/communities/${closedId}`),200);
    check('A member does not hold the external-publication right by default',!(capabilities.data.authz?.my_permissions||[]).includes('content.publish_external'));
    const ownerView=await req(max,'GET',`/api/communities/${closedId}`);
    check('The owner holds the external-publication right',(ownerView.data.authz?.my_permissions||[]).includes('content.publish_external'));

    await status('Member cannot create a closed-Space post that is published outwards',req(anna,'POST',`/api/communities/${closedId}/posts`,{body:'MEMBER_DIRECT_PUBLISH',federation_state:'enabled'}),403);
    check('Rejected publication left no post behind',!sql.prepare("SELECT 1 FROM posts WHERE body='MEMBER_DIRECT_PUBLISH'").get());
    const memberPost=await status('Member writes an internal post',req(anna,'POST',`/api/communities/${closedId}/posts`,{body:'MEMBER_INTERNAL'}),201);
    await status('Member cannot later publish the post outwards',req(anna,'PUT',`/api/posts/${memberPost.data.postId}/federation`,{state:'enabled'}),403);
    await status('Owner cannot publish someone else’s post outwards',req(max,'PUT',`/api/posts/${memberPost.data.postId}/federation`,{state:'enabled'}),403);
    check('Internal member post is not federated',protocol.noteForLocalPost(sql,memberPost.data.postId)===null);
    await status('Internal member post is not served over ActivityPub',req(anon,'GET',`/ap/objects/posts/${memberPost.data.postId}`),404);
    await status('Author may restrict own post',req(anna,'PUT',`/api/posts/${memberPost.data.postId}/federation`,{state:'disabled'}),200);
    await status('Administration may restrict a member’s post',req(max,'PUT',`/api/posts/${memberPost.data.postId}/federation`,{state:'inherit'}),200);

    const ownerPost=await status('Owner publishes own post from the closed Space',req(max,'POST',`/api/communities/${closedId}/posts`,{body:'OWNER_PUBLISHED',federation_state:'enabled'}),201);
    check('Owner publication is federated',protocol.federationDecisionForPost(sql,ownerPost.data.postId).allowed===true);
    await status('Owner publication is served over ActivityPub',req(anon,'GET',`/ap/objects/posts/${ownerPost.data.postId}`),200);

    // A Space can grant the right to a role, e.g. moderators.
    await status('Owner makes Anna a moderator',req(max,'PUT',`/api/permissions/community/${closedId}/role/u-anna`,{role:'moderator'}),200);
    await status('Moderators still lack the right by default',req(anna,'PUT',`/api/posts/${memberPost.data.postId}/federation`,{state:'enabled'}),403);
    await status('Owner grants moderators the external-publication right',req(max,'PUT',`/api/permissions/community/${closedId}/overrides`,{role:'moderator',permission:'content.publish_external',effect:'allow'}),200);
    await status('Authorized author publishes own post',req(anna,'PUT',`/api/posts/${memberPost.data.postId}/federation`,{state:'enabled'}),200);
    check('Authorized publication is federated',protocol.federationDecisionForPost(sql,memberPost.data.postId).allowed===true);
    await status('Authorized publication is served over ActivityPub',req(anon,'GET',`/ap/objects/posts/${memberPost.data.postId}`),200);

    // Role change after publication: the right is re-checked on every decision.
    await status('Owner withdraws the right from moderators',req(max,'PUT',`/api/permissions/community/${closedId}/overrides`,{role:'moderator',permission:'content.publish_external',effect:'inherit'}),200);
    const revoked=protocol.federationDecisionForPost(sql,memberPost.data.postId);
    check('Withdrawn right stops the publication',revoked.allowed===false&&revoked.reason==='author_lacks_publication_right',JSON.stringify(revoked));
    await status('Withdrawn publication is no longer served over ActivityPub',req(anon,'GET',`/ap/objects/posts/${memberPost.data.postId}`),404);

    // Leaving the Space has the same effect.
    await status('Owner grants the right again',req(max,'PUT',`/api/permissions/community/${closedId}/overrides`,{role:'moderator',permission:'content.publish_external',effect:'allow'}),200);
    check('Publication is active again',protocol.federationDecisionForPost(sql,memberPost.data.postId).allowed===true);
    await status('Anna leaves the closed Space',req(anna,'DELETE',`/api/communities/${closedId}/membership`),200);
    check('Leaving the Space stops the publication',protocol.federationDecisionForPost(sql,memberPost.data.postId).allowed===false);
    await status('Post of a former member is not served over ActivityPub',req(anon,'GET',`/ap/objects/posts/${memberPost.data.postId}`),404);

    // Public Space: the author decides about own posts, like Mastodon.
    const open=await status('Owner creates a public Space',req(max,'POST','/api/communities',{name:'Publikation offen',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'public',join_policy:'open'}),201);
    const openId=open.data.id;
    sql.prepare("UPDATE communities SET federation_mode='selected' WHERE id=?").run(openId);
    await status('Anna joins the public Space',req(anna,'POST',`/api/communities/${openId}/membership`,{}),200);
    const openPost=await status('Member writes a post in the public Space',req(anna,'POST',`/api/communities/${openId}/posts`,{body:'OPEN_MEMBER_POST'}),201);
    await status('Owner cannot publish a member’s post in a public Space either',req(max,'PUT',`/api/posts/${openPost.data.postId}/federation`,{state:'enabled'}),403);
    await status('Member publishes own post in a public Space',req(anna,'PUT',`/api/posts/${openPost.data.postId}/federation`,{state:'enabled'}),200);
    check('Own public-Space post is federated',protocol.federationDecisionForPost(sql,openPost.data.postId).allowed===true);
    await status('Administration can still restrict it',req(max,'PUT',`/api/posts/${openPost.data.postId}/federation`,{state:'disabled'}),200);
    check('Restricted post is not federated',protocol.federationDecisionForPost(sql,openPost.data.postId).allowed===false);

    // K7: Mastodon-compatible quiet public (to: followers, cc: Public) next to public (to: Public).
    const PUBLIC='https://www.w3.org/ns/activitystreams#Public';
    const maxActor=protocol.actorId('u-max'),annaActor=protocol.actorId('u-anna');
    const closedGroup=protocol.spaceActorId(closedId),openGroup=protocol.spaceActorId(openId);
    const quietDefault=await status('Owner publishes from the closed Space without choosing a visibility',req(max,'POST',`/api/communities/${closedId}/posts`,{body:'CLOSED_DEFAULT_QUIET',federation_state:'enabled'}),201);
    const quietNote=protocol.noteForLocalPost(sql,quietDefault.data.postId);
    check('Closed-Space publication defaults to quiet public',JSON.stringify(quietNote.to)===JSON.stringify([`${maxActor}/followers`])&&quietNote.cc.includes(PUBLIC)&&!quietNote.to.includes(PUBLIC),JSON.stringify({to:quietNote.to,cc:quietNote.cc}));
    const servedQuiet=await status('Quiet public post is served over ActivityPub',req(anon,'GET',`/ap/objects/posts/${quietDefault.data.postId}`),200);
    check('Served object carries the quiet public addressing',!servedQuiet.data.to.includes(PUBLIC)&&servedQuiet.data.cc.includes(PUBLIC));
    const quietBoost=protocol.announceActivityForGroup(sql,closedId,quietNote);
    check('Group boost keeps quiet public',JSON.stringify(quietBoost.to)===JSON.stringify([`${closedGroup}/followers`])&&JSON.stringify(quietBoost.cc)===JSON.stringify([PUBLIC]));
    check('Create activity uses the note addressing',JSON.stringify(protocol.createActivityForNote(quietNote).to)===JSON.stringify(quietNote.to));

    const loud=await status('Owner may still choose full public from the closed Space',req(max,'POST',`/api/communities/${closedId}/posts`,{body:'CLOSED_EXPLICIT_PUBLIC',federation_state:'enabled',federation_audience:'public'}),201);
    const loudNote=protocol.noteForLocalPost(sql,loud.data.postId);
    check('Explicit public is addressed to the public collection',JSON.stringify(loudNote.to)===JSON.stringify([PUBLIC]));
    check('Group boost of a public post stays public',JSON.stringify(protocol.announceActivityForGroup(sql,closedId,loudNote).to)===JSON.stringify([PUBLIC]));

    const openDefault=await status('Member publishes in the public Space without choosing',req(anna,'POST',`/api/communities/${openId}/posts`,{body:'OPEN_DEFAULT_PUBLIC',federation_state:'enabled'}),201);
    check('Public-Space publication defaults to public',JSON.stringify(protocol.noteForLocalPost(sql,openDefault.data.postId).to)===JSON.stringify([PUBLIC]));

    const openQuiet=await status('Member chooses quiet public in the public Space',req(anna,'POST',`/api/communities/${openId}/posts`,{body:'OPEN_QUIET',federation_state:'enabled',federation_audience:'quiet'}),201);
    const reply=await status('Member replies to the quiet post',req(anna,'POST',`/api/posts/${openQuiet.data.postId}/comments`,{body:'QUIET_REPLY'}),201);
    const replyNote=protocol.noteForLocalComment(sql,reply.data.commentId);
    check('A reply is never more public than its post',replyNote&&JSON.stringify(replyNote.to)===JSON.stringify([`${annaActor}/followers`])&&replyNote.cc.includes(PUBLIC),JSON.stringify(replyNote&&{to:replyNote.to,cc:replyNote.cc}));

    await status('Visibility of a published post cannot change',req(anna,'PUT',`/api/posts/${openQuiet.data.postId}/federation`,{state:'enabled',audience:'public'}),409);
    const queued=protocol.createActivityForNote(protocol.noteForLocalPost(sql,openQuiet.data.postId));
    await status('Author withdraws the post',req(anna,'PUT',`/api/posts/${openQuiet.data.postId}/federation`,{state:'disabled'}),200);
    await status('Withdrawn post may change its visibility and be published again',req(anna,'PUT',`/api/posts/${openQuiet.data.postId}/federation`,{state:'enabled',audience:'public'}),200);
    const refreshed=protocol.refreshPublicationActivity(sql,queued);
    check('A queued activity is re-addressed to the current visibility',JSON.stringify(refreshed.to)===JSON.stringify([PUBLIC])&&JSON.stringify(refreshed.object.to)===JSON.stringify([PUBLIC]));
    check('Group of the public Space is in cc',refreshed.cc.includes(`${openGroup}/followers`));

    console.log(`\nPost publication integration: ${passed.length}/${passed.length} checks passed.`);
  }catch(error){
    console.error(`✗ ${error.message}`);
    process.exitCode=1;
  }finally{
    try{sql?.close()}catch{}
    server.kill();
    await new Promise(resolve=>server.once('exit',resolve));
    for(const suffix of ['','-wal','-shm'])fs.rmSync(dbPath+suffix,{force:true});
  }
})();
