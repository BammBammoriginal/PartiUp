// Live state for open views: /api/live tells a signed-in person cheaply whether their chats or
// notifications changed, so the app can refresh without a reload. It must reveal nothing beyond
// the person's own conversations and must stop answering after logout.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');

const port=37000+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`live-updates-${process.pid}-${Date.now()}.db`);
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
const server=spawn(process.execPath,['server/server.js'],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1'},
  stdio:['ignore','pipe','pipe']
});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);

function jar(){return {cookies:new Map(),csrf:null}}
function copy(j){return {cookies:new Map(j.cookies),csrf:j.csrf}}
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
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start\n'+serverOut)}
const passed=[];
function check(name,ok,detail=''){if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`);passed.push(name);console.log(`✓ ${name}`)}
async function live(j){const r=await req(j,'GET','/api/live');if(r.status!==200)throw new Error(`/api/live: ${r.status} ${r.text}`);return r.data}

(async()=>{
  try{
    await ready();
    const anon=jar();await req(anon,'GET','/api/security/csrf');
    check('Anonymous visitors get no live state',(await req(anon,'GET','/api/live')).status===401);

    const max=await login('max@bottomupparti.local'),anna=await login('anna@bottomupparti.local'),lisa=await login('lisa@bottomupparti.local');
    await req(anna,'POST','/api/notifications/read',{});
    const annaStart=await live(anna),lisaStart=await live(lisa);
    check('Live state contains only counters and an opaque stamp',Object.keys(annaStart).sort().join()==='message_unread,messages_stamp,notification_count'&&/^[0-9a-f]{16}$/.test(annaStart.messages_stamp),JSON.stringify(annaStart));
    check('Live state is stable without changes',(await live(anna)).messages_stamp===annaStart.messages_stamp);

    // A new conversation is announced to its member, not to outsiders.
    const conv=await req(max,'POST','/api/messages/conversations',{type:'direct',direct_user_id:'u-anna'});
    check('Max starts a conversation with Anna',conv.status===201||conv.status===200,`${conv.status} ${conv.text}`);
    const annaAfterConv=await live(anna);
    check('A new conversation changes the stamp for its member',annaAfterConv.messages_stamp!==annaStart.messages_stamp);
    check('An outsider\'s stamp does not change',(await live(lisa)).messages_stamp===lisaStart.messages_stamp);

    // New message: stamp, unread and notification counter change for the recipient only.
    const sent=await req(max,'POST',`/api/messages/conversations/${conv.data.id}/messages`,{body:'LIVE_HELLO'});
    check('Max sends a message',sent.status===201);
    const annaAfterMsg=await live(anna);
    check('A new message changes the recipient\'s stamp',annaAfterMsg.messages_stamp!==annaAfterConv.messages_stamp);
    check('The recipient has one unread message',annaAfterMsg.message_unread===1,JSON.stringify(annaAfterMsg));
    check('The recipient\'s notification counter grows',annaAfterMsg.notification_count>annaStart.notification_count,JSON.stringify(annaAfterMsg));
    check('An outsider still sees no change',(await live(lisa)).messages_stamp===lisaStart.messages_stamp);
    const thread=await req(anna,'GET',`/api/messages/conversations/${conv.data.id}`);
    check('The recipient loads the new message',thread.status===200&&thread.text.includes('LIVE_HELLO'));

    // Reading the conversation clears its unread messages and its chat notifications.
    await req(anna,'POST',`/api/messages/conversations/${conv.data.id}/read`,{});
    const annaRead=await live(anna);
    check('Reading clears unread messages',annaRead.message_unread===0,JSON.stringify(annaRead));
    check('Reading also clears the chat notifications of this conversation',annaRead.notification_count===annaStart.notification_count,JSON.stringify(annaRead));
    check('Own reading does not trigger another refresh',annaRead.messages_stamp===annaAfterMsg.messages_stamp);

    // Reactions and deletions reach the other side.
    const msgId=sent.data.id;
    await req(max,'POST',`/api/messages/${msgId}/reactions`,{emoji:'👍'});
    const annaReacted=await live(anna);
    check('A reaction changes the stamp',annaReacted.messages_stamp!==annaRead.messages_stamp);
    await req(max,'POST',`/api/messages/${msgId}/reactions`,{emoji:'👍'});
    const annaUnreacted=await live(anna);
    check('Removing a reaction changes the stamp',annaUnreacted.messages_stamp!==annaReacted.messages_stamp);
    const removed=await req(max,'DELETE',`/api/messages/${msgId}`);
    check('Max deletes his message',removed.status===200);
    check('A deletion changes the stamp',(await live(anna)).messages_stamp!==annaUnreacted.messages_stamp);

    // Logout ends live state for every copy of the session cookie.
    const annaCopy=copy(anna);
    check('Anna logs out',(await req(anna,'POST','/api/logout',{})).status===200);
    check('After logout the old cookie gets no live state',(await req(annaCopy,'GET','/api/live')).status===401);

    console.log(`\nLive updates integration: ${passed.length}/${passed.length} checks passed.`);
  }catch(error){
    console.error(`✗ ${error.message}`);
    process.exitCode=1;
  }finally{
    server.kill();
    await new Promise(resolve=>server.once('exit',resolve));
    for(const suffix of ['','-wal','-shm'])fs.rmSync(dbPath+suffix,{force:true});
  }
})();
