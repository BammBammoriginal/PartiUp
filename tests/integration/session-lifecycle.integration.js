// Session boundaries on the API: after logout, after a user switch in the same browser and
// after expiry, an old session cookie opens nothing. Logout ends only the current device.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const port=36600+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`session-lifecycle-${process.pid}-${Date.now()}.db`);
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const server=spawn(process.execPath,['server/server.js'],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1'},
  stdio:['ignore','pipe','pipe']
});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);

function jar(){return {cookies:new Map(),csrf:null,setCookies:[]}}
function copy(j){return {cookies:new Map(j.cookies),csrf:j.csrf,setCookies:[]}}
function absorb(j,res){for(const raw of res.headers.getSetCookie?.()||[]){j.setCookies.push(String(raw));const first=String(raw).split(';',1)[0];const i=first.indexOf('=');if(i>0){const k=first.slice(0,i),v=first.slice(i+1);if(v)j.cookies.set(k,v);else j.cookies.delete(k);}}}
async function req(j,method,url,body,{csrf=true}={}){
  const headers={Accept:'application/json',Origin:base};
  if(body!==undefined)headers['Content-Type']='application/json';
  const c=[...j.cookies].map(([k,v])=>`${k}=${v}`).join('; ');if(c)headers.Cookie=c;
  if(method!=='GET'&&csrf&&j.csrf)headers['X-BUP-CSRF']=j.csrf;
  const res=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  absorb(j,res);
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(data?.csrf)j.csrf=data.csrf;
  return {status:res.status,data,text};
}
async function login(j,email){await req(j,'GET','/api/security/csrf');const r=await req(j,'POST','/api/login',{email,password:'demo123'});if(r.status!==200)throw new Error(`Login ${email}: ${r.status}`);return j;}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start\n'+serverOut)}
const passed=[];
function check(name,ok,detail=''){if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`);passed.push(name);console.log(`✓ ${name}`)}

// Protected reads and writes that must fail without a valid session.
const PROTECTED=[
  ['GET','/api/notifications'],
  ['GET','/api/messages/conversations'],
  ['GET','/api/preferences'],
  ['GET','/api/privacy/export'],
  ['GET','/api/private-media/unknown'],
  ['PUT','/api/preferences',{language:'de'}],
  ['POST','/api/notifications/read',{}],
  ['POST','/api/communities',{name:'Nach Logout',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'public',join_policy:'open'}]
];
async function assertLockedOut(label,j){
  for(const [method,url,body] of PROTECTED){
    const r=await req(j,method,url,body);
    check(`${label}: ${method} ${url} is refused`,r.status===401,`got ${r.status}`);
  }
  const me=await req(j,'GET','/api/me');check(`${label}: /api/me is anonymous`,me.status===200&&me.data?.user===null,JSON.stringify(me.data));
  const boot=await req(j,'GET','/api/bootstrap');check(`${label}: bootstrap is anonymous`,boot.status===200&&!boot.data?.user&&!(boot.data?.message_recipients||[]).length,JSON.stringify(boot.data?.user));
}

(async()=>{
  let sql;
  try{
    await ready();
    const Database=require('better-sqlite3');
    sql=new Database(dbPath);sql.pragma('busy_timeout=5000');

    // Login: cookie flags and storage.
    const device=jar();await login(device,'max@bottomupparti.local');
    const sessionCookie=device.setCookies.find(c=>c.startsWith('bup_session='))||'';
    check('Session cookie is HttpOnly, SameSite=Strict and site-wide',/HttpOnly/i.test(sessionCookie)&&/SameSite=Strict/i.test(sessionCookie)&&/Path=\//.test(sessionCookie),sessionCookie);
    const token=device.cookies.get('bup_session');
    const stored=sql.prepare('SELECT token FROM sessions WHERE user_id=?').all('u-max').map(r=>r.token);
    check('The database stores only a hash of the session token',!stored.includes(token)&&stored.includes(crypto.createHash('sha256').update(token).digest('hex')));
    const notifications=await req(device,'GET','/api/notifications');check('Logged-in person reads own notifications',notifications.status===200);

    // Logout: a copied cookie (other tab, stolen cookie, browser back) opens nothing afterwards.
    const copied=copy(device), otherDevice=jar();await login(otherDevice,'max@bottomupparti.local');
    const crossSite=await req(device,'POST','/api/logout',{}, {csrf:false});
    check('Logout without security token is refused and keeps the session',crossSite.status===403&&(await req(device,'GET','/api/notifications')).status===200,`got ${crossSite.status}`);
    const out=await req(device,'POST','/api/logout',{});
    check('Logout succeeds and clears the cookie',out.status===200&&!device.cookies.has('bup_session'));
    check('Logout removes the session server-side',!sql.prepare('SELECT 1 FROM sessions WHERE token=?').get(crypto.createHash('sha256').update(token).digest('hex')));
    await assertLockedOut('After logout with the old cookie',copied);
    check('Logout ends only this device',(await req(otherDevice,'GET','/api/notifications')).status===200);

    // User switch in the same browser: the previous account's session is gone.
    const shared=jar();await login(shared,'max@bottomupparti.local');
    const maxInShared=copy(shared);
    const maxNotice=sql.prepare("INSERT INTO notifications(id,user_id,type,title) VALUES ('n-session-max','u-max','system','MAX_ONLY_NOTICE')");maxNotice.run();
    await login(shared,'anna@bottomupparti.local');
    const annaBoot=await req(shared,'GET','/api/bootstrap');
    check('After a switch the browser acts as the new person',annaBoot.data?.user?.id==='u-anna',JSON.stringify(annaBoot.data?.user));
    const annaNotes=await req(shared,'GET','/api/notifications');
    check('The new person does not see the previous person\'s notifications',annaNotes.status===200&&!annaNotes.text.includes('MAX_ONLY_NOTICE'));
    await assertLockedOut('After a user switch with the previous cookie',maxInShared);

    // Expiry is enforced server-side, independent of the cookie lifetime.
    const expired=jar();await login(expired,'lisa@bottomupparti.local');
    sql.prepare("UPDATE sessions SET expires_at=datetime('now','-1 minute') WHERE token=?").run(crypto.createHash('sha256').update(expired.cookies.get('bup_session')).digest('hex'));
    await assertLockedOut('After expiry',expired);

    console.log(`\nSession lifecycle integration: ${passed.length}/${passed.length} checks passed.`);
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
