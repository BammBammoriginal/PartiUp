const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');

const port=32600+Math.floor(Math.random()*300);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`event-access-${process.pid}-${Date.now()}.db`);
const server=spawn(process.execPath,['server/server.js'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1'},stdio:['ignore','pipe','pipe']});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);
function jar(){return {cookies:new Map(),csrf:null}}
function absorb(j,res){const raw=res.headers.get('set-cookie');if(!raw)return;for(const p of raw.split(/,(?=\s*[^;=]+=[^;]+)/)){const f=p.trim().split(';',1)[0],i=f.indexOf('=');if(i>0)j.cookies.set(f.slice(0,i),f.slice(i+1));}}
function cookie(j){return [...j.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}
async function req(j,method,url,body){const h={Accept:'application/json'};if(body!==undefined)h['Content-Type']='application/json';if(j){const c=cookie(j);if(c)h.Cookie=c;if(!['GET','HEAD','OPTIONS'].includes(method)&&j.csrf)h['X-BUP-CSRF']=j.csrf;}const r=await fetch(base+url,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});if(j)absorb(j,r);const t=await r.text();let data;try{data=t?JSON.parse(t):null}catch{data=t}return {status:r.status,data}}
async function csrf(j){const r=await req(j,'GET','/api/security/csrf');j.csrf=r.data.csrf;}
async function login(email){const j=jar();await csrf(j);const r=await req(j,'POST','/api/login',{email,password:'demo123'});if(r.status!==200)throw new Error(`login ${email}: ${r.status}`);if(!r.data?.csrf)throw new Error('login did not return rotated csrf');j.csrf=r.data.csrf;return j}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('server not ready\n'+serverOut)}
function assert(ok,msg){if(!ok)throw new Error(msg);console.log('✓ '+msg)}
async function expect(j,m,u,b,s,msg){const r=await req(j,m,u,b);assert(r.status===s,`${msg} (${r.status})`);return r}
(async()=>{let sql;try{
 await ready();sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
 const anon=jar();await csrf(anon);const max=await login('max@bottomupparti.local'),anna=await login('anna@bottomupparti.local'),lisa=await login('lisa@bottomupparti.local');
 const create=async(body)=>(await expect(max,'POST','/api/events',body,201,'owner creates event')).data.id;
 const approval=await create({name:'Private approval QA',places:['erl'],visibility:'private',attendance_policy:'approval'});
 await expect(anon,'GET',`/api/events/${approval}`,undefined,404,'anonymous cannot view private event');
 await expect(anna,'GET',`/api/events/${approval}`,undefined,404,'unrelated authenticated user cannot view private event');
 let boot=await expect(anna,'GET','/api/bootstrap',undefined,200,'bootstrap loads');assert(!boot.data.events.some(e=>e.id===approval),'private event absent from unrelated bootstrap');
 await expect(anna,'POST',`/api/events/${approval}/rsvp`,{status:'going'},200,'approval RSVP request accepted');
 assert(sql.prepare('SELECT status FROM event_attendance WHERE event_id=? AND user_id=?').get(approval,'u-anna').status==='requested','RSVP stored as requested');
 await expect(anna,'GET',`/api/events/${approval}`,undefined,404,'requested attendance grants no detail access');
 boot=await req(anna,'GET','/api/bootstrap');assert(!boot.data.events.some(e=>e.id===approval),'requested attendance grants no list/bootstrap access');
 sql.prepare("UPDATE event_attendance SET status='going' WHERE event_id=? AND user_id=?").run(approval,'u-anna');
 await expect(anna,'GET',`/api/events/${approval}`,undefined,200,'approved participant can view private event');
 sql.prepare("UPDATE event_attendance SET status='waitlist' WHERE event_id=? AND user_id=?").run(approval,'u-anna');
 await expect(anna,'GET',`/api/events/${approval}`,undefined,404,'waitlist grants no private detail access');
 const invite=await create({name:'Private invite QA',places:['erl'],visibility:'private',attendance_policy:'invite'});
 await expect(lisa,'GET',`/api/events/${invite}`,undefined,404,'non-invited user cannot view invite-only private event');
 sql.prepare('INSERT INTO event_invites(event_id,user_id,invited_by) VALUES (?,?,?)').run(invite,'u-lisa','u-max');
 await expect(lisa,'GET',`/api/events/${invite}`,undefined,200,'invited participant can view when invite policy applies');
 const members=await create({name:'Private members QA',places:['erl'],communities:['sport'],owner_space_id:'sport',visibility:'private',attendance_policy:'members'});
 await expect(anna,'GET',`/api/events/${members}`,undefined,200,'community member can view when members policy applies');
 await expect(lisa,'GET',`/api/events/${members}`,undefined,404,'unrelated user cannot view members-only private event');
 const approvalMember=await create({name:'Private approval member QA',places:['erl'],communities:['sport'],owner_space_id:'sport',visibility:'private',attendance_policy:'approval'});
 await expect(anna,'GET',`/api/events/${approvalMember}`,undefined,404,'community membership alone does not bypass approval policy');
 const sportDetail=await expect(anna,'GET','/api/communities/sport',undefined,200,'community detail loads for member');assert(!(sportDetail.data.events||[]).some(e=>e.id===approvalMember),'community event list also enforces event access policy');
 const pub=await create({name:'Public regression QA',places:['erl'],visibility:'public',attendance_policy:'open'});await expect(anon,'GET',`/api/events/${pub}`,undefined,200,'public event remains public');
 const unl=await create({name:'Unlisted regression QA',places:['erl'],visibility:'unlisted',attendance_policy:'approval'});await expect(anon,'GET',`/api/events/${unl}`,undefined,404,'unlisted event remains non-public');await expect(max,'GET',`/api/events/${unl}`,undefined,200,'unlisted event remains visible to owner');
 console.log('\nEvent access integration: PASS');
}catch(e){console.error('\nEvent access integration FAILED\n'+(e.stack||e)+'\n\nServer output:\n'+serverOut.slice(-5000));process.exitCode=1}finally{try{sql?.close()}catch{}if(server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>setTimeout(r,300))}for(const x of ['','-wal','-shm'])try{fs.rmSync(dbPath+x,{force:true})}catch{}}})();
