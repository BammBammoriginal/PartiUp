// "Gefolgte Bereiche": every followable Space type is listed, but only while the person can
// still see it. Profiles behind author links stay protected by the profile rules.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');

const port=37800+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`follow-areas-${process.pid}-${Date.now()}.db`);
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
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('Server did not start\n'+serverOut)}
const passed=[];
function check(name,ok,detail=''){if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`);passed.push(name);console.log(`✓ ${name}`)}
const ids=list=>(list||[]).map(x=>x.id);

(async()=>{
  let sql;
  try{
    await ready();
    const Database=require('better-sqlite3');
    sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
    const anon=jar();await req(anon,'GET','/api/security/csrf');
    check('Anonymous visitors have no followed areas',(await req(anon,'GET','/api/follows/areas')).status===401);
    const anna=await login('anna@bottomupparti.local');

    // Anna follows one object of every Space type, a sub-Space included.
    const boot=(await req(anna,'GET','/api/bootstrap')).data;
    const parent=boot.communities.find(c=>c.visibility==='public'&&!c.parent_id&&c.source==='native');
    sql.prepare("INSERT INTO communities(id,name,type,created_by,visibility,join_policy,parent_id) VALUES ('c-follow-sub','Unterraum zum Folgen','Community','u-max','public','open',?)").run(parent.id);
    const targets={community:[parent.id,'c-follow-sub'],project:[boot.projects[0].id],event:[boot.events[0].id],participation:[boot.participation[0].id]};
    for(const [type,list] of Object.entries(targets))for(const id of list){
      const r=await req(anna,'POST','/api/follows',{target_type:type,target_id:id,notification_level:'feed'});
      check(`Anna follows ${type} ${id}`,r.status===201,`${r.status} ${r.text}`);
    }
    const areas=(await req(anna,'GET','/api/follows/areas')).data;
    check('Communities and sub-Spaces are listed',targets.community.every(id=>ids(areas.communities).includes(id)),JSON.stringify(areas.communities));
    check('The sub-Space is marked with its parent',areas.communities.find(x=>x.id==='c-follow-sub')?.parent_id===parent.id);
    check('Projects are listed',ids(areas.projects).includes(targets.project[0]));
    check('Events are listed',ids(areas.events).includes(targets.event[0]));
    check('Participation is listed',ids(areas.participation).includes(targets.participation[0]));
    check('Entries carry only display fields',Object.keys(areas.communities[0]).sort().join()==='date_label,icon,id,kind,name,parent_id');

    // A followed Space that becomes closed disappears from the list; unfollowing removes it.
    sql.prepare("UPDATE communities SET visibility='private' WHERE id='c-follow-sub'").run();
    check('A followed Space Anna can no longer see is not listed',!ids((await req(anna,'GET','/api/follows/areas')).data.communities).includes('c-follow-sub'));
    await req(anna,'DELETE',`/api/follows/project/${encodeURIComponent(targets.project[0])}`);
    check('Unfollowing removes the entry',!ids((await req(anna,'GET','/api/follows/areas')).data.projects).includes(targets.project[0]));
    check('Following is not membership',!(await req(anna,'GET','/api/bootstrap')).data.memberships.some(m=>m.community_id==='c-follow-sub'));

    // Author links do not open profiles that are not shared with the viewer.
    sql.prepare("UPDATE user_preferences SET profile_visibility='private' WHERE user_id='u-lisa'").run();
    sql.prepare("DELETE FROM user_friendships WHERE user_a IN ('u-anna','u-lisa') AND user_b IN ('u-anna','u-lisa')").run();
    const hidden=await req(anna,'GET','/api/users/u-lisa'),missing=await req(anna,'GET','/api/users/u-niemand');
    check('A private profile looks like a missing one',hidden.status===404&&hidden.text===missing.text,`${hidden.status} ${hidden.text}`);

    console.log(`\nFollowed areas integration: ${passed.length}/${passed.length} checks passed.`);
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
