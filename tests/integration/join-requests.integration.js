// Join requests for Spaces that need approval: the people who may decide are told, a request
// is decided exactly once, the requester can withdraw it, and opening the Space admits pending
// requests once without touching visibility or federation.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');

const port=37000+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`join-requests-${process.pid}-${Date.now()}.db`);
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const server=spawn(process.execPath,['server/server.js'],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1'},
  stdio:['ignore','pipe','pipe']
});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);

function jar(){return {cookies:new Map(),csrf:null}}
function absorb(j,res){for(const raw of res.headers.getSetCookie?.()||[]){const first=String(raw).split(';',1)[0];const i=first.indexOf('=');if(i>0){const k=first.slice(0,i),v=first.slice(i+1);if(v)j.cookies.set(k,v);else j.cookies.delete(k);}}}
async function req(j,method,url,body){
  const headers={Accept:'application/json',Origin:base};
  if(body!==undefined)headers['Content-Type']='application/json';
  const c=[...j.cookies].map(([k,v])=>`${k}=${v}`).join('; ');if(c)headers.Cookie=c;
  if(method!=='GET'&&j.csrf)headers['X-BUP-CSRF']=j.csrf;
  const res=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  absorb(j,res);
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(data?.csrf)j.csrf=data.csrf;
  return {status:res.status,data,text};
}
async function login(email){const j=jar();await req(j,'GET','/api/security/csrf');const r=await req(j,'POST','/api/login',{email,password:'demo123'});if(r.status!==200)throw new Error(`Login ${email}: ${r.status}`);return j;}
async function register(name){const j=jar();await req(j,'GET','/api/security/csrf');const r=await req(j,'POST','/api/register',{name,email:`${name.toLowerCase().replace(/\W/g,'')}-${Date.now()}@example.test`,password:'Sicheres-Testpasswort-2026'});if(r.status!==201&&r.status!==200)throw new Error(`Register ${name}: ${r.status} ${r.text}`);j.id=(await req(j,'GET','/api/me')).data.user.id;return j;}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start\n'+serverOut)}
const passed=[];
function check(name,ok,detail=''){if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`);passed.push(name);console.log(`✓ ${name}`)}
async function status(name,promise,expected){const r=await promise;check(name,r.status===expected,`expected ${expected}, got ${r.status}: ${r.text}`);return r}

(async()=>{
  let sql;
  try{
    await ready();
    const Database=require('better-sqlite3');
    sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
    const notices=(userId,type,entityId)=>sql.prepare('SELECT * FROM notifications WHERE user_id=? AND type=? AND entity_id=?').all(userId,type,entityId);
    const isMember=(spaceId,userId)=>sql.prepare('SELECT role FROM memberships WHERE community_id=? AND user_id=?').get(spaceId,userId)?.role||null;

    const max=await login('max@bottomupparti.local'), anna=await login('anna@bottomupparti.local'), lisa=await login('lisa@bottomupparti.local');
    const created=await status('Owner creates a Space that needs approval',req(max,'POST','/api/communities',{name:'Anfrage-Space',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'public',join_policy:'approval'}),201);
    const space=created.data.id;
    // Anna administrates (may decide on requests), Lisa moderates (may not by default).
    sql.prepare("INSERT OR REPLACE INTO memberships(community_id,user_id,role) VALUES (?,'u-anna','admin'),(?,'u-lisa','moderator')").run(space,space);
    sql.prepare("INSERT OR REPLACE INTO role_assignments(scope_type,scope_id,user_id,role) VALUES ('community',?,'u-anna','admin'),('community',?,'u-lisa','moderator')").run(space,space);
    const first=await register('Erste Anfrage'), second=await register('Zweite Anfrage'), third=await register('Dritte Anfrage');

    // 1. A request reaches exactly the people allowed to decide.
    await status('Request is accepted and waits',req(first,'POST',`/api/communities/${space}/join`),202);
    check('Requester sees the pending state after reload',(await req(first,'GET',`/api/communities/${space}`)).data.join_request==='pending');
    check('Owner is told about the request',notices('u-max','membership_request',space).length===1);
    check('Administrator is told about the request',notices('u-anna','membership_request',space).length===1);
    check('Moderator without the member right is not told',notices('u-lisa','membership_request',space).length===0);
    check('The requester is not told about their own request',notices(first.id,'membership_request',space).length===0);
    await status('Repeated click keeps one request',req(first,'POST',`/api/communities/${space}/join`),202);
    check('Repeated click does not notify again',notices('u-max','membership_request',space).length===1);

    // 2. Only people with the member right can see and decide.
    await status('Moderator cannot list requests',req(lisa,'GET',`/api/communities/${space}/join-requests`),403);
    await status('Moderator cannot decide',req(lisa,'POST',`/api/communities/${space}/join-requests/${first.id}`,{decision:'approve'}),403);
    await status('Requester cannot approve themselves',req(first,'POST',`/api/communities/${space}/join-requests/${first.id}`,{decision:'approve'}),403);
    const listed=await status('Administrator lists the request',req(anna,'GET',`/api/communities/${space}/join-requests`),200);
    check('The list shows the request',listed.data.some(r=>r.user_id===first.id));

    // 3. Approving without an open request does not add anyone.
    await status('Approving a person without request is refused',req(max,'POST',`/api/communities/${space}/join-requests/${second.id}`,{decision:'approve'}),409);
    check('That person did not become a member',!isMember(space,second.id));

    // 4. Withdrawing.
    const anon=jar();await req(anon,'GET','/api/security/csrf');
    await status('Anonymous visitors cannot withdraw',req(anon,'DELETE',`/api/communities/${space}/join-request`),401);
    const withdrawn=await status('Requester withdraws',req(first,'DELETE',`/api/communities/${space}/join-request`),200);
    check('Withdrawal is confirmed',withdrawn.data?.withdrawn===true);
    check('Requester sees the start state again',(await req(first,'GET',`/api/communities/${space}`)).data.join_request===null);
    check('Administrators no longer see the request',!(await req(anna,'GET',`/api/communities/${space}/join-requests`)).data.some(r=>r.user_id===first.id));
    await status('A withdrawn request cannot be approved',req(max,'POST',`/api/communities/${space}/join-requests/${first.id}`,{decision:'approve'}),409);
    check('Withdrawn requester did not become a member',!isMember(space,first.id));
    const again=await status('Withdrawing twice is harmless',req(first,'DELETE',`/api/communities/${space}/join-request`),200);
    check('Second withdrawal reports nothing withdrawn',again.data?.withdrawn===false);

    // 5. Two administrators decide on the same request: one wins, one notice.
    await status('Requester asks again',req(first,'POST',`/api/communities/${space}/join`),202);
    await status('Owner approves',req(max,'POST',`/api/communities/${space}/join-requests/${first.id}`,{decision:'approve'}),200);
    await status('Second decision on the same request is refused',req(anna,'POST',`/api/communities/${space}/join-requests/${first.id}`,{decision:'reject'}),409);
    check('Requester became a normal member',isMember(space,first.id)==='member');
    const decided=notices(first.id,'membership',space);
    check('Requester is told exactly once',decided.length===1&&decided[0].title==='Beitritt bestätigt',JSON.stringify(decided.map(n=>n.title)));
    await status('A member cannot withdraw a decided request',req(first,'DELETE',`/api/communities/${space}/join-request`),200);
    check('Membership stays after a late withdrawal',isMember(space,first.id)==='member');

    // 6. Rejection.
    await status('Second person asks',req(second,'POST',`/api/communities/${space}/join`),202);
    await status('Administrator rejects',req(anna,'POST',`/api/communities/${space}/join-requests/${second.id}`,{decision:'reject'}),200);
    check('Rejected person is told',notices(second.id,'membership',space).some(n=>n.title==='Beitrittsanfrage abgelehnt'));
    check('Rejected person sees the decision',(await req(second,'GET',`/api/communities/${space}`)).data.join_request==='rejected');

    // 7. Opening the Space admits pending requests once, never with a privileged role.
    await status('Rejected person asks again',req(second,'POST',`/api/communities/${space}/join`),202);
    await status('Third person asks',req(third,'POST',`/api/communities/${space}/join`),202);
    const gone=await register('Geloeschtes Konto');
    await status('A later deleted account asks',req(gone,'POST',`/api/communities/${space}/join`),202);
    sql.prepare("UPDATE users SET account_status='deleted' WHERE id=?").run(gone.id);
    const before=sql.prepare('SELECT visibility,federation_mode FROM communities WHERE id=?').get(space);
    await status('Moderator cannot change the join rule',req(lisa,'PUT',`/api/communities/${space}/access`,{join_policy:'open'}),403);
    check('Refused change admits nobody',!isMember(space,second.id)&&!isMember(space,third.id));
    await status('Owner opens the Space',req(max,'PUT',`/api/communities/${space}/access`,{join_policy:'open'}),200);
    check('Pending requesters are now normal members',isMember(space,second.id)==='member'&&isMember(space,third.id)==='member');
    check('A deleted account is not admitted',!isMember(space,gone.id));
    check('No request stays pending for admitted people',sql.prepare("SELECT COUNT(*) n FROM community_join_requests WHERE community_id=? AND status='pending' AND user_id IN (?,?)").get(space,second.id,third.id).n===0);
    check('Admitted people are told once',notices(second.id,'membership',space).filter(n=>n.title==='Beitritt bestätigt').length===1&&notices(third.id,'membership',space).length===1);
    const after=sql.prepare('SELECT visibility,federation_mode FROM communities WHERE id=?').get(space);
    check('Opening the join rule keeps visibility and federation',after.visibility===before.visibility&&after.federation_mode===before.federation_mode,JSON.stringify({before,after}));
    await status('Saving the open rule again',req(max,'PUT',`/api/communities/${space}/access`,{join_policy:'open'}),200);
    check('Saving again creates no duplicate notices',notices(third.id,'membership',space).length===1);

    // 8. Closing again keeps existing members; a pending request survives a switch to invitations.
    await status('Owner switches back to approval',req(max,'PUT',`/api/communities/${space}/access`,{join_policy:'approval'}),200);
    check('Existing members stay members',isMember(space,third.id)==='member'&&isMember(space,first.id)==='member');
    const fourth=await register('Vierte Anfrage');
    await status('Fourth person asks',req(fourth,'POST',`/api/communities/${space}/join`),202);
    await status('Owner switches to invitation only',req(max,'PUT',`/api/communities/${space}/access`,{join_policy:'invite'}),200);
    check('Pending request stays open for a decision',sql.prepare('SELECT status FROM community_join_requests WHERE community_id=? AND user_id=?').get(space,fourth.id)?.status==='pending'&&!isMember(space,fourth.id));

    // 9. Sub-Spaces use the same flow; the parent owner is told when they hold the member right there.
    const sub=await status('Owner creates a sub-Space that needs approval',req(max,'POST',`/api/communities/${space}/subspaces`,{name:'Anfrage-Unterraum',type:'Gruppe',visibility:'public',join_policy:'approval'}),201);
    const subId=sub.data.id||sub.data.community?.id;
    await status('Request for the sub-Space',req(fourth,'POST',`/api/communities/${subId}/join`),202);
    check('Sub-Space owner is told',notices('u-max','membership_request',subId).length===1);

    // Requests to a closed Space can be withdrawn by the requester even without view rights.
    const closed=await status('Owner creates a closed Space that needs approval',req(max,'POST','/api/communities',{name:'Geschlossene Anfrage',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'private',join_policy:'approval'}),201);
    await status('Request for the closed Space',req(fourth,'POST',`/api/communities/${closed.data.id}/join`),202);
    const closedWithdraw=await status('Requester withdraws from the closed Space',req(fourth,'DELETE',`/api/communities/${closed.data.id}/join-request`),200);
    check('Withdrawal from the closed Space is confirmed',closedWithdraw.data?.withdrawn===true&&!closedWithdraw.text.includes('Geschlossene Anfrage'));
    await status('Unknown Space cannot be withdrawn from',req(fourth,'DELETE','/api/communities/does-not-exist/join-request'),404);

    // 10. Event participation that needs approval tells the organisers too.
    const event=await status('Owner creates an event that needs approval',req(max,'POST','/api/events',{name:'Anfrage-Veranstaltung',places:['erl'],attendance_policy:'approval',start_at:'2026-12-01T18:00:00+01:00',end_at:'2026-12-01T20:00:00+01:00'}),201);
    const rsvp=await status('Participation request',req(fourth,'POST',`/api/events/${event.data.id}/rsvp`,{status:'going'}),200);
    check('Participation waits for approval',rsvp.data.status==='requested');
    check('Organiser is told about the participation request',notices('u-max','event_request',event.data.id).length===1);
    await status('Repeated participation request',req(fourth,'POST',`/api/events/${event.data.id}/rsvp`,{status:'going'}),200);
    check('Repeated participation request does not notify again',notices('u-max','event_request',event.data.id).length===1);

    console.log(`\nJoin requests integration: ${passed.length}/${passed.length} checks passed.`);
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
