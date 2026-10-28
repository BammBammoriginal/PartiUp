// Permalinks and notification targets: /api/content/:type/:id/location tells where a post or
// comment lives, but only to people who may see it there. A known id is no permission.
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');

const port=37400+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`content-location-${process.pid}-${Date.now()}.db`);
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
const where=(j,type,id)=>req(j,'GET',`/api/content/${type}/${encodeURIComponent(id)}/location`);

(async()=>{
  let sql;
  try{
    await ready();
    const Database=require('better-sqlite3');
    sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
    const anon=jar();await req(anon,'GET','/api/security/csrf');
    const max=await login('max@bottomupparti.local'),anna=await login('anna@bottomupparti.local'),lisa=await login('lisa@bottomupparti.local');

    // Public Space: Max posts, Anna joins and comments.
    const open=await req(max,'POST','/api/communities',{name:'Permalink offen',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'public',join_policy:'open'});
    check('Max creates a public Space',open.status===201);
    const post=await req(max,'POST',`/api/communities/${open.data.id}/posts`,{body:'Ursprungsbeitrag'});
    check('Max posts',post.status===201);
    const postId=post.data.postId;
    check('Anna joins',[200,201].includes((await req(anna,'POST',`/api/communities/${open.data.id}/join`,{})).status));
    await req(max,'POST','/api/notifications/read',{});
    const comment=await req(anna,'POST',`/api/posts/${postId}/comments`,{body:'Antwort von Anna'});
    check('Anna comments',[200,201].includes(comment.status),`${comment.status} ${comment.text}`);
    const commentId=sql.prepare('SELECT id FROM comments WHERE post_id=? ORDER BY rowid DESC').get(postId).id;

    const notes=await req(max,'GET','/api/notifications');
    const note=notes.data.items.find(n=>n.type==='comment');
    check('The comment notification points at the comment itself',note?.entity_type==='comment'&&note?.entity_id===commentId,JSON.stringify(note));

    const postAt=await where(anon,'post',postId);
    check('A public post resolves to its Space for anyone',postAt.status===200&&postAt.data.community_id===open.data.id&&postAt.data.post_id===postId&&postAt.data.comment_id===null,postAt.text);
    const commentAt=await where(max,'comment',commentId);
    check('A comment resolves to its post and Space',commentAt.status===200&&commentAt.data.community_id===open.data.id&&commentAt.data.post_id===postId&&commentAt.data.comment_id===commentId,commentAt.text);
    check('The answer contains only location ids',Object.keys(commentAt.data).sort().join()==='comment_id,community_id,post_id,type'&&!commentAt.text.includes('Antwort von Anna'));

    // Closed Space: only people who can see it learn where its content is.
    const closed=await req(max,'POST','/api/communities',{name:'Permalink geschlossen',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'private',join_policy:'invite'});
    const internal=await req(max,'POST',`/api/communities/${closed.data.id}/posts`,{body:'Intern'});
    const unknown=await where(anon,'post','post-gibt-es-nicht');
    check('Unknown content answers 404',unknown.status===404);
    for(const [label,j] of [['Anonymous visitors',anon],['Non-members',lisa]]){
      const r=await where(j,'post',internal.data.postId);
      check(`${label} cannot locate content of a closed Space`,r.status===404&&r.text===unknown.text,`${r.status} ${r.text}`);
    }
    check('Members can locate content of their closed Space',(await where(max,'post',internal.data.postId)).status===200);

    // Moderated content is no longer reachable by link.
    sql.prepare("INSERT INTO moderation_content_state(target_type,target_id,scope_type,scope_id,state,updated_by) VALUES ('comment',?,'community',?,'hidden','u-max')").run(commentId,open.data.id);
    check('A hidden comment cannot be located',(await where(anna,'comment',commentId)).status===404);
    sql.prepare("INSERT INTO moderation_content_state(target_type,target_id,scope_type,scope_id,state,updated_by) VALUES ('post',?,'community',?,'removed','u-max')").run(postId,open.data.id);
    check('A removed post cannot be located',(await where(anon,'post',postId)).status===404);
    check('Other content types are not resolved',(await where(max,'community',open.data.id)).status===404);

    console.log(`\nContent location integration: ${passed.length}/${passed.length} checks passed.`);
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
