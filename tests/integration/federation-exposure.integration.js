// Public federation diagnostics must not reveal more than ActivityPub itself publishes:
// no existence oracle for private Spaces, internal posts or people without federation
// opt-in, no remote raw snapshots, and no account enumeration via discovery-check.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');

const port=36100+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const publicBase='https://exposure.example.test';
const dbPath=path.join(process.cwd(),'data',`federation-exposure-${process.pid}-${Date.now()}.db`);
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
  return {status:res.status,data,text};
}
async function login(email){const j=jar();await req(j,'GET','/api/security/csrf');const r=await req(j,'POST','/api/login',{email,password:'demo123'});if(r.status!==200)throw new Error(`Login ${email}: ${r.status}`);return j;}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start\n'+serverOut)}
const passed=[];
function check(name,ok,detail=''){if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`);passed.push(name);console.log(`✓ ${name}`)}
async function status(name,promise,expected){const r=await promise;check(name,r.status===expected,`expected ${expected}, got ${r.status}: ${JSON.stringify(r.data)}`);return r}

const AP_PATH={user:'/ap/actors/users/',community:'/ap/actors/spaces/',post:'/ap/objects/posts/'};

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

    // Fixtures: Max opts into federation, Anna does not; one closed and one public Space.
    sql.prepare("UPDATE user_preferences SET federation_enabled=1 WHERE user_id='u-max'").run();
    sql.prepare("UPDATE user_preferences SET federation_enabled=0 WHERE user_id='u-anna'").run();
    const closed=await status('Owner creates a closed Space',req(max,'POST','/api/communities',{name:'Exposure geschlossen',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'private',join_policy:'invite'}),201);
    const internal=await status('Owner writes an internal post',req(max,'POST',`/api/communities/${closed.data.id}/posts`,{body:'INTERNAL_EXPOSURE'}),201);
    const open=await status('Owner creates a public Space',req(max,'POST','/api/communities',{name:'Exposure offen',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'public',join_policy:'open'}),201);
    sql.prepare("UPDATE communities SET federation_mode='public' WHERE id=?").run(open.data.id);
    const published=await status('Owner writes a published post',req(max,'POST',`/api/communities/${open.data.id}/posts`,{body:'PUBLISHED_EXPOSURE'}),201);
    check('Published post is federated',!!protocol.noteForLocalPost(sql,published.data.postId));
    // On a running instance the boot backfill registers every local object, private ones included;
    // reproduce that state here (a fresh test database registers before the demo seed).
    const store=require('../../server/federation/store');
    for(const [type,id] of [['user','u-max'],['user','u-anna'],['community',closed.data.id],['community',open.data.id],['post',internal.data.postId],['post',published.data.postId]])store.upsertLocalEntity(sql,type,id,publicBase);

    // Invariant: the registry endpoint never answers where ActivityPub answers 404.
    const probes=[['user','u-max'],['user','u-anna'],['community',closed.data.id],['community',open.data.id],['post',internal.data.postId],['post',published.data.postId]];
    for(const [type,id] of probes){
      const entity=await req(anon,'GET',`/api/federation/entity/${type}/${encodeURIComponent(id)}`);
      const ap=await req(anon,'GET',`${AP_PATH[type]}${encodeURIComponent(id)}`);
      check(`Registry for ${type} ${id} reveals no more than ActivityPub`,ap.status===200?entity.status===200:entity.status===404,`entity ${entity.status}, ActivityPub ${ap.status}`);
      if(entity.status===200)check(`Registry for ${type} ${id} omits internal fields`,!('remote_json' in entity.data.registry)&&!('source_uri' in entity.data.registry)&&!('first_seen_at' in entity.data.registry));
    }
    const optOut=await req(anon,'GET','/api/federation/entity/user/u-anna');
    const unknown=await req(anon,'GET','/api/federation/entity/user/u-does-not-exist');
    check('A person without opt-in looks like an unknown person',optOut.status===404&&optOut.text===unknown.text,`${optOut.text} vs ${unknown.text}`);
    const internalEntity=await req(anon,'GET',`/api/federation/entity/post/${encodeURIComponent(internal.data.postId)}`);
    check('Internal post of a closed Space is not revealed',internalEntity.status===404);

    // Remote snapshots are never served.
    sql.prepare("INSERT INTO federation_entities(id,entity_type,entity_id,activity_type,entity_kind,is_local,canonical_uri,origin_host,source_uri,remote_json) VALUES ('remote-exposure','user','remote-exposure-user','Person','actor',0,'https://remote.example/users/x','remote.example','https://remote.example/users/x','REMOTE_SECRET_SNAPSHOT')").run();
    const remote=await req(anon,'GET','/api/federation/entity/user/remote-exposure-user');
    check('Remote registry entries and snapshots are not served',remote.status===404&&!remote.text.includes('REMOTE_SECRET_SNAPSHOT'));

    // discovery-check: no account enumeration.
    const annaHandle=protocol.ensureFederationHandle(sql,'u-anna');
    const optOutHandle=await req(anon,'GET',`/api/federation/discovery-check?handle=${encodeURIComponent(annaHandle)}`);
    const unknownHandle=await req(anon,'GET','/api/federation/discovery-check?handle=niemand-hier-x');
    check('discovery-check answers identically for opt-out and unknown handles',optOutHandle.status===404&&unknownHandle.status===404&&optOutHandle.text===unknownHandle.text,`${optOutHandle.text} vs ${unknownHandle.text}`);
    const maxHandle=protocol.ensureFederationHandle(sql,'u-max');
    const ok=await req(anon,'GET',`/api/federation/discovery-check?handle=${encodeURIComponent(maxHandle)}`);
    // ok also depends on the person's own "discoverable" choice; here only reachability is asserted.
    check('discovery-check still answers for an opted-in person',ok.status===200&&ok.data?.userId==='u-max'&&ok.data?.checks?.handleMapped===true,JSON.stringify(ok.data));

    // Received Fediverse posts are only shown where the receiving Space is visible.
    const anna=await login('anna@bottomupparti.local');
    const insertRemote=sql.prepare("INSERT INTO federation_remote_objects(object_uri,object_type,actor_uri,origin_host,content_text,raw_json) VALUES (?,'Note','https://remote.example/users/r','remote.example',?,'{}')");
    const linkRemote=sql.prepare("INSERT INTO federation_space_remote_objects(local_space_id,object_uri,relation_kind) VALUES (?,?,'thread')");
    const insertMedia=sql.prepare("INSERT INTO federation_remote_media(id,object_uri,media_url,media_type,kind) VALUES (?,?,'https://media.invalid/x.png','image/png','image')");
    insertRemote.run('https://remote.example/notes/closed','REMOTE_IN_CLOSED_SPACE');linkRemote.run(closed.data.id,'https://remote.example/notes/closed');insertMedia.run('rm-closed','https://remote.example/notes/closed');
    insertRemote.run('https://remote.example/notes/open','REMOTE_IN_PUBLIC_SPACE');linkRemote.run(open.data.id,'https://remote.example/notes/open');insertMedia.run('rm-open','https://remote.example/notes/open');
    const remoteText=async j=>(await req(j,'GET','/api/federation/remote-objects')).text;
    const anonRemote=await remoteText(anon), annaRemote=await remoteText(anna), maxRemote=await remoteText(max);
    check('Anonymous visitors do not see posts received by a closed Space',!anonRemote.includes('REMOTE_IN_CLOSED_SPACE'));
    check('Non-members do not see posts received by a closed Space',!annaRemote.includes('REMOTE_IN_CLOSED_SPACE'));
    check('Posts received by a public Space stay listed',anonRemote.includes('REMOTE_IN_PUBLIC_SPACE')&&annaRemote.includes('REMOTE_IN_PUBLIC_SPACE'));
    check('Members still see posts received by their closed Space',maxRemote.includes('REMOTE_IN_CLOSED_SPACE'));
    await status('Images of posts received by a closed Space are not served anonymously',req(anon,'GET','/api/federation-media/rm-closed'),404);
    await status('Images of posts received by a closed Space are not served to non-members',req(anna,'GET','/api/federation-media/rm-closed'),404);
    const openMedia=await req(anon,'GET','/api/federation-media/rm-open');
    // The test host does not resolve, so a visible image ends in 502 instead of 404.
    check('Images of posts received by a public Space are still proxied',openMedia.status===502,`got ${openMedia.status}`);

    console.log(`\nFederation exposure integration: ${passed.length}/${passed.length} checks passed.`);
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
