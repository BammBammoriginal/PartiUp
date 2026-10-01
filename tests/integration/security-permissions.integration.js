const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const port=32100+Math.floor(Math.random()*500);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`security-integration-${process.pid}-${Date.now()}.db`);
const server=spawn(process.execPath,['server/server.js'],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1'},
  stdio:['ignore','pipe','pipe']
});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);

function cookieJar(){return {cookies:new Map(),csrf:null};}
function absorbCookies(jar,res){
  const arr=typeof res.headers.getSetCookie==='function'?res.headers.getSetCookie():[];
  for(const raw of arr){const first=String(raw).split(';',1)[0];const i=first.indexOf('=');if(i>0)jar.cookies.set(first.slice(0,i),first.slice(i+1));}
  if(!arr.length){const raw=res.headers.get('set-cookie');if(raw){for(const part of raw.split(/,(?=\s*[^;=]+=[^;]+)/)){const first=part.trim().split(';',1)[0];const i=first.indexOf('=');if(i>0)jar.cookies.set(first.slice(0,i),first.slice(i+1));}}}
}
function cookieHeader(jar){return [...jar.cookies.entries()].map(([k,v])=>`${k}=${v}`).join('; ')}
async function req(jar,method,url,body,opts={}){
  const headers={Accept:'application/json',...(opts.headers||{})};
  if(body!==undefined){headers['Content-Type']='application/json';}
  if(jar){const c=cookieHeader(jar);if(c)headers.Cookie=c;if(!['GET','HEAD','OPTIONS'].includes(method)&&opts.csrf!==false&&jar.csrf)headers['X-BUP-CSRF']=jar.csrf;}
  if(opts.origin)headers.Origin=opts.origin;
  if(opts.fetchSite)headers['Sec-Fetch-Site']=opts.fetchSite;
  const res=await fetch(base+url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  if(jar)absorbCookies(jar,res);
  let data=null;const text=await res.text();try{data=text?JSON.parse(text):null}catch{data=text}
  return {status:res.status,data,headers:res.headers};
}
async function csrf(jar){const r=await req(jar,'GET','/api/security/csrf');if(r.status!==200)throw new Error(`CSRF bootstrap failed ${r.status}`);jar.csrf=r.data.csrf;return jar.csrf;}
async function login(email){const jar=cookieJar();await csrf(jar);const r=await req(jar,'POST','/api/login',{email,password:'demo123'});if(r.status!==200)throw new Error(`Login ${email} failed: ${r.status} ${JSON.stringify(r.data)}`);if(!r.data?.csrf)throw new Error('Login response did not return rotated CSRF token');jar.csrf=r.data.csrf;return jar;}
async function waitReady(){for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Test server did not become ready.\n'+serverOut)}
const checks=[];function check(name,ok,detail=''){checks.push([name,!!ok,detail]);if(!ok)throw new Error(`${name}${detail?`: ${detail}`:''}`)}
async function status(name,promise,expected){const r=await promise;check(name,r.status===expected,`expected ${expected}, got ${r.status}: ${JSON.stringify(r.data)}`);return r;}

(async()=>{
  try{
    await waitReady();
    const anon=cookieJar();
    await csrf(anon);
    await status('Unauthenticated permissions are blocked',req(anon,'GET','/api/permissions/community/jugend'),401);
    await status('Unauthenticated moderation queue is blocked',req(anon,'GET','/api/moderation/community/jugend/reports'),401);

    const max=await login('max@bottomupparti.local');
    const lisa=await login('lisa@bottomupparti.local');
    const anna=await login('anna@bottomupparti.local');

    const privateCommunity=await status('Owner can create private community',req(max,'POST','/api/communities',{name:'Private QA Space',type:'Community',places:['erl'],topics:['Demokratie'],visibility:'private',join_policy:'invite'}),201);
    const privateId=privateCommunity.data.id;
    const privatePost=await status('Owner can create post in private community',req(max,'POST',`/api/communities/${privateId}/posts`,{body:'PRIVATE-QA-MARKER'}),201);
    check('Private post was created',!!privatePost.data.postId,String(privatePost.data.postId||''));
    const anonBootstrap=await status('Anonymous bootstrap loads',req(anon,'GET','/api/bootstrap'),200);
    check('Private community is absent from anonymous bootstrap',!(anonBootstrap.data.communities||[]).some(x=>x.id===privateId));
    check('Private community post is absent from anonymous feed',!(anonBootstrap.data.feed||[]).some(x=>x.body==='PRIVATE-QA-MARKER'));
    const ownerBootstrap=await status('Owner bootstrap loads',req(max,'GET','/api/bootstrap'),200);
    check('Private community remains visible to owner',(ownerBootstrap.data.communities||[]).some(x=>x.id===privateId));
    check('Private post remains visible to owner',(ownerBootstrap.data.feed||[]).some(x=>x.body==='PRIVATE-QA-MARKER'));
    check('Anonymous bootstrap exposes no message recipients',(anonBootstrap.data.message_recipients||[]).length===0);
    const recipientIds=new Set((ownerBootstrap.data.message_recipients||[]).map(x=>x.id));
    check('Shared-Space members are selectable for messaging',recipientIds.has('u-anna')&&recipientIds.has('u-lisa'),[...recipientIds].join(','));
    check('Message recipients expose no email or profile details',(ownerBootstrap.data.message_recipients||[]).every(x=>!('email' in x)&&!('bio' in x)&&!('place' in x)));

    const childProject=await status('Owner can create project in parent space',req(max,'POST','/api/projects',{name:'Inheritance QA Project',places:['erl'],topics:['Demokratie'],owner_space_id:'jugend',visibility:'private',modules:{tasks:true}}),201);
    const lisaChild=await status('Parent moderator can inspect child permission scope',req(lisa,'GET',`/api/permissions/project/${childProject.data.id}`),200);
    check('Parent moderator does not inherit elevated child role',lisaChild.data.my_role==='member',String(lisaChild.data.my_role));
    await status('Parent moderator cannot configure child modules without explicit assignment',req(lisa,'PUT',`/api/objects/project/${childProject.data.id}/modules`,{modules:{tasks:false}}),403);

    const maxJugend=await status('Owner permission snapshot loads',req(max,'GET','/api/permissions/community/jugend'),200);
    check('Creator resolves to owner',maxJugend.data.my_role==='owner',String(maxJugend.data.my_role));
    const lisaJugend=await status('Moderator permission snapshot loads',req(lisa,'GET','/api/permissions/community/jugend'),200);
    check('Legacy moderator resolves to moderator',lisaJugend.data.my_role==='moderator',String(lisaJugend.data.my_role));
    const annaJugend=await status('Guest permission snapshot loads',req(anna,'GET','/api/permissions/community/jugend'),200);
    check('Non-member resolves to guest',annaJugend.data.my_role==='guest',String(annaJugend.data.my_role));

    await status('Moderator cannot assign roles',req(lisa,'PUT','/api/permissions/community/jugend/role/u-anna',{role:'admin'}),403);
    await status('Owner can assign admin role',req(max,'PUT','/api/permissions/community/jugend/role/u-anna',{role:'admin'}),200);
    const annaAdmin=await status('Assigned admin is effective',req(anna,'GET','/api/permissions/community/jugend'),200);
    check('Anna now resolves to admin',annaAdmin.data.my_role==='admin',String(annaAdmin.data.my_role));
    await status('Admin still cannot reassign roles',req(anna,'PUT','/api/permissions/community/jugend/role/u-lisa',{role:'member'}),403);

    const p1Max=await status('Project member permission snapshot loads',req(max,'GET','/api/permissions/project/p1'),200);
    check('Parent membership maps Max to project member',p1Max.data.my_role==='member',String(p1Max.data.my_role));
    await status('Project member cannot configure modules',req(max,'PUT','/api/objects/project/p1/modules',{modules:{tasks:true}}),403);
    await status('Guest cannot create project task',req(anna,'POST','/api/objects/project/p1/tasks',{title:'Should fail'}),403);
    const created=await status('Project owner can create assigned task',req(lisa,'POST','/api/objects/project/p1/tasks',{title:'Integration task',assignee_user_id:'u-max'}),201);
    const task=(created.data.tasks||[]).find(x=>x.title==='Integration task');
    check('Created task is returned',!!task,JSON.stringify(created.data.tasks||[]));
    await status('Assigned member can update own task',req(max,'PUT',`/api/objects/project/p1/tasks/${task.id}`,{status:'in_progress'}),200);
    await status('Unrelated guest cannot update task',req(anna,'PUT',`/api/objects/project/p1/tasks/${task.id}`,{status:'done'}),403);

    await status('Moderator can read own-space moderation queue',req(lisa,'GET','/api/moderation/community/jugend/reports'),200);
    await status('Moderator rights do not leak to another community',req(lisa,'GET','/api/moderation/community/sport/reports'),403);
    const report=await status('Authenticated guest can report space content',req(anna,'POST','/api/reports',{target_type:'community',target_id:'jugend',reason:'other',details:'Integration test'}),201);
    const queue=await status('Moderator sees newly created report',req(lisa,'GET','/api/moderation/community/jugend/reports'),200);
    check('Report is present in moderation queue',(queue.data.reports||[]).some(x=>x.id===report.data.id));
    await status('Moderator can mark report for review',req(lisa,'PUT',`/api/moderation/community/jugend/reports/${report.data.id}`,{action:'review',note:'Integration'}),200);


    const scope=await status('Create isolated role scope',req(max,'POST','/api/communities',{name:'Role withdrawal QA',places:['erl']}),201);
    const scopeId=scope.data.id;
    await status('Member joins isolated scope',req(anna,'POST',`/api/communities/${scopeId}/join`,{}),200);
    const projection=await status('Community capabilities are projected',req(anna,'GET',`/api/communities/${scopeId}`),200);
    check('Community projection uses effective member role',projection.data.authz.my_role==='member');
    const post=await status('Member can write before demotion',req(anna,'POST',`/api/communities/${scopeId}/posts`,{body:'Before demotion'}),201);
    const legacy=await status('Owner creates legacy poll fixture',req(max,'POST',`/api/communities/${scopeId}/polls`,{question:'Legacy role gate',options:['A','B']}),201);
    const core=await status('Owner creates members participation',req(max,'POST','/api/participation',{name:'Role gate participation',places:['erl'],owner_space_id:scopeId,access_policy:'members',modules:{poll:true},poll:{question:'Role gate',options:['A','B']}}),201);
    const detail=await status('Member opens participation before role change',req(anna,'GET',`/api/participation/${core.data.id}`),200);
    const q=detail.data.questions[0],option=q.options[0].id;
    await status('Member votes before role change',req(anna,'POST',`/api/participation/${core.data.id}/questions/${q.id}/vote`,{optionId:option}),200);
    const project=await status('Create inherited project scope',req(max,'POST','/api/projects',{name:'Inherited role QA',places:['erl'],owner_space_id:scopeId}),201);
    const event=await status('Create inherited event scope',req(max,'POST','/api/events',{name:'Inherited event QA',places:['erl'],owner_space_id:scopeId,start_at:'2026-10-20T18:00:00+02:00',end_at:'2026-10-20T20:00:00+02:00'}),201);
    await status('Owner demotes member to guest',req(max,'PUT',`/api/permissions/community/${scopeId}/role/u-anna`,{role:'guest'}),200);
    for(const [type,id] of [['community',scopeId],['project',project.data.id],['event',event.data.id],['participation',core.data.id]]){
      const snap=await status(`Effective guest role in ${type}`,req(anna,'GET',`/api/permissions/${type}/${id}`),200);
      check(`Guest cannot create or participate in ${type}`,snap.data.my_role==='guest'&&!snap.data.my_permissions.includes('content.create')&&!snap.data.my_permissions.includes('participation.interact'));
    }
    await status('Demotion blocks new posts without re-login',req(anna,'POST',`/api/communities/${scopeId}/posts`,{body:'Forbidden'}),403);
    await status('Demotion blocks comments without re-login',req(anna,'POST',`/api/posts/${post.data.postId}/comments`,{body:'Forbidden'}),403);
    await status('Demotion blocks a previously opened participation vote',req(anna,'POST',`/api/participation/${core.data.id}/questions/${q.id}/vote`,{optionId:option}),403);
    await status('Demotion blocks project task creation',req(anna,'POST',`/api/objects/project/${project.data.id}/tasks`,{title:'Forbidden'}),403);
    await status('Demotion blocks event task creation',req(anna,'POST',`/api/objects/event/${event.data.id}/tasks`,{title:'Forbidden'}),403);
    const legacyDetail=await req(max,'GET',`/api/communities/${scopeId}`);
    const legacyPoll=legacyDetail.data.polls[0];
    await status('Demotion also blocks legacy votes',req(anna,'POST',`/api/polls/${legacyPoll.id}/vote`,{optionId:legacyPoll.options[0].id}),403);
    await status('Owner restores member',req(max,'PUT',`/api/permissions/community/${scopeId}/role/u-anna`,{role:'member'}),200);
    await status('Restored role works in existing session',req(anna,'POST',`/api/participation/${core.data.id}/questions/${q.id}/vote`,{optionId:option}),200);
    await status('Explicit child demotion can restrict inherited role',req(max,'PUT',`/api/permissions/participation/${core.data.id}/role/u-anna`,{role:'guest'}),200);
    await status('Child guest assignment blocks participation',req(anna,'POST',`/api/participation/${core.data.id}/questions/${q.id}/vote`,{optionId:option}),403);
    const open=await status('Create intentionally open public participation',req(max,'POST','/api/participation',{name:'Public role QA',places:['erl'],modules:{poll:true},poll:{question:'Open',options:['A','B']}}),201);
    const openDetail=await req(anna,'GET',`/api/participation/${open.data.id}`);
    await status('Unrelated public participant remains eligible',req(anna,'POST',`/api/participation/${open.data.id}/questions/${openDetail.data.questions[0].id}/vote`,{optionId:openDetail.data.questions[0].options[0].id}),200);

    const noCsrfJar=await login('max@bottomupparti.local');
    noCsrfJar.csrf=null;
    await status('State-changing request without CSRF is rejected',req(noCsrfJar,'POST','/api/notifications/read',{}, {csrf:false}),403);
    await status('Cross-origin state-changing request is rejected',req(max,'POST','/api/notifications/read',{}, {origin:'https://evil.example',fetchSite:'cross-site'}),403);
    await status('Unknown API route stays JSON 404',req(max,'GET','/api/does-not-exist'),404);

    console.log('\nPermission & Abuse Integration Tests');
    for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
    console.log(`\nSecurity integration: ${checks.length}/${checks.length} bestanden`);
  }catch(err){
    console.error('\nSecurity integration FAILED');
    console.error(err.stack||err);
    console.error('\nServer output:\n'+serverOut.slice(-6000));
    process.exitCode=1;
  }finally{
    if(server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>{const t=setTimeout(r,2500);server.once('exit',()=>{clearTimeout(t);r();});});}
    for(const suffix of ['','-wal','-shm']){try{fs.rmSync(dbPath+suffix,{force:true});}catch{}}
  }
})();

