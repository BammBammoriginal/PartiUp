const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const port=32100+Math.floor(Math.random()*500);
const base=`http://127.0.0.1:${port}`;
const dbPath=path.join(process.cwd(),'data',`security-integration-${process.pid}-${Date.now()}.db`);
const server=spawn(process.execPath,['server/server.js'],{
  cwd:process.cwd(),
  env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1',PARTIUP_BASE_URL:'https://retrofit.example.test'},
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
    await status('Unrelated account cannot read private Space roles',req(anna,'GET',`/api/permissions/community/${privateId}`),404);
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

    // Retroactive checks: old storage/projections and new capability rules must agree.
    const Database=require('better-sqlite3');
    const sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
    const childProcess=require('child_process');
    const publicBase='https://retrofit.example.test';
    process.env.PARTIUP_BASE_URL=publicBase;
    const protocol=require('../../server/federation/protocol');
    try{
      const image=await require('sharp')({create:{width:2,height:2,channels:4,background:{r:1,g:2,b:3,alpha:1}}}).png().toBuffer();
      async function upload(jar,url,fields={}){
        const form=new FormData();for(const [key,value] of Object.entries(fields))form.append(key,value);
        form.append('image',new Blob([image],{type:'image/png'}),'private-file-name.png');
        const result=await fetch(base+url,{method:'POST',headers:{Cookie:cookieHeader(jar),'X-BUP-CSRF':jar.csrf},body:form});
        return {status:result.status,data:await result.json()};
      }
      async function fileStatus(name,url,jar,expected){
        const response=await fetch(base+url,{headers:jar?{Cookie:cookieHeader(jar)}:{}});
        check(name,response.status===expected,`expected ${expected}, got ${response.status}`);
        check(name+' is never publicly cached',response.headers.get('cache-control')==='private, no-store');
        await response.arrayBuffer();
      }
      const photo=await upload(max,`/api/communities/${privateId}/posts-with-media`,{body:'Private media boundary'});
      check('Owner uploads a private-Space image',photo.status===201,JSON.stringify(photo.data));
      const imageUrl=photo.data.media.variants.medium;
      await fileStatus('Owner can read private-Space image',imageUrl,max,200);
      await fileStatus('Anonymous known URL cannot bypass private Space',imageUrl,null,404);
      await fileStatus('Unrelated account cannot bypass private Space media',imageUrl,anna,404);
      const privateProjection=await req(max,'GET',`/api/communities/${privateId}`);
      check('Media projections omit original filenames and storage keys',privateProjection.data.posts.every(post=>(post.media||[]).every(m=>!('original_name' in m)&&!('storage_key' in m))));
      await status('Owner can make test Space public',req(max,'PUT',`/api/communities/${privateId}/access`,{visibility:'public',join_policy:'approval'}),200);
      await fileStatus('Public image remains readable without login',imageUrl,null,200);
      await status('Owner restores private visibility',req(max,'PUT',`/api/communities/${privateId}/access`,{visibility:'private',join_policy:'approval'}),200);
      await fileStatus('Visibility change revokes the same media URL immediately',imageUrl,null,404);

      const visibleProject=await status('Create public relation parent',req(max,'POST','/api/projects',{name:'Retrofit public project',places:['erl']}),201);
      const secretProject=await status('Create private relation target',req(max,'POST','/api/projects',{name:'SECRET_PROJECT_MARKER',places:['erl'],visibility:'private'}),201);
      const secretEvent=await status('Create private linked event',req(max,'POST','/api/events',{name:'SECRET_EVENT_MARKER',places:['erl'],visibility:'private',attendance_policy:'invite',projects:[visibleProject.data.id]}),201);
      const visibleEvent=await status('Create public event with private relation',req(max,'POST','/api/events',{name:'Retrofit public event',places:['erl'],projects:[secretProject.data.id],communities:[privateId]}),201);
      const secretParticipation=await status('Create private linked participation',req(max,'POST','/api/participation',{name:'SECRET_PARTICIPATION_MARKER',places:['erl'],visibility:'private',access_policy:'invite',projects:[visibleProject.data.id]}),201);
      const visibleParticipation=await status('Create public participation with private relations',req(max,'POST','/api/participation',{name:'Retrofit public participation',places:['erl'],projects:[secretProject.data.id],communities:[privateId]}),201);
      await status('Partial Community access update preserves private visibility',req(max,'PUT',`/api/communities/${privateId}/access`,{min_trust_level:2}),200);
      await status('Partial Community update did not make private Space public',req(anon,'GET',`/api/communities/${privateId}`),404);
      await status('Invalid Community visibility is rejected instead of made public',req(max,'PUT',`/api/communities/${privateId}/access`,{visibility:'typo'}),400);
      await status('Partial event access update preserves visibility',req(max,'PUT',`/api/events/${secretEvent.data.id}/access`,{min_trust_level:2}),200);
      await status('Partial event update did not make private event public',req(anon,'GET',`/api/events/${secretEvent.data.id}`),404);
      sql.prepare("INSERT INTO federation_remote_objects(object_uri,object_type,actor_uri,origin_host,content_text,raw_json,moderation_state) VALUES ('https://remote.example/hidden','Note','https://remote.example/actor','remote.example','HIDDEN_REMOTE_MARKER','{}','hidden')").run();
      const remoteList=await req(anon,'GET','/api/federation/remote-objects');check('Moderated remote objects do not leak through the inspection API',!remoteList.data.some(o=>o.content_text==='HIDDEN_REMOTE_MARKER'));
      const publicProjectView=await req(anon,'GET',`/api/projects/${visibleProject.data.id}`);
      check('Public project does not reveal private event or participation',!publicProjectView.data.events.some(e=>e.id===secretEvent.data.id)&&!publicProjectView.data.participation.some(p=>p.id===secretParticipation.data.id));
      const publicEventView=await req(anon,'GET',`/api/events/${visibleEvent.data.id}`);
      check('Public event hides private project and Community relations',!publicEventView.data.projects.some(p=>p.id===secretProject.data.id)&&!publicEventView.data.communities.some(c=>c.id===privateId));
      const publicParticipationView=await req(anon,'GET',`/api/participation/${visibleParticipation.data.id}`);
      check('Public participation hides private project and Community relations',!publicParticipationView.data.projects.some(p=>p.id===secretProject.data.id)&&!publicParticipationView.data.communities.some(c=>c.id===privateId));
      const ownerProjectView=await req(max,'GET',`/api/projects/${visibleProject.data.id}`);
      check('Visible relations are preserved for their authorized owner',ownerProjectView.data.events.some(e=>e.id===secretEvent.data.id)&&ownerProjectView.data.participation.some(p=>p.id===secretParticipation.data.id));
      await status('Create internal project task',req(max,'POST',`/api/objects/project/${visibleProject.data.id}/tasks`,{title:'INTERNAL_TASK_MARKER'}),201);
      const taskView=await req(anon,'GET',`/api/projects/${visibleProject.data.id}`);
      check('Public project does not disclose tasks without task.view',taskView.data.tasks.length===0);
      const ownTaskView=await req(max,'GET',`/api/projects/${visibleProject.data.id}`);
      check('Owner retains task visibility',ownTaskView.data.tasks.some(t=>t.title==='INTERNAL_TASK_MARKER'));
      const privateProjectUpload=await upload(max,`/api/media/project/${secretProject.data.id}`);
      check('Private project image mutation returns its authorized detail',privateProjectUpload.status===201&&privateProjectUpload.data.id===secretProject.data.id&&privateProjectUpload.data.authz.my_permissions.includes('space.edit_profile'));
      const guestSnapshot=await req(anna,'GET',`/api/permissions/project/${visibleProject.data.id}`);
      check('Permission inspection cannot enumerate unrelated principals',guestSnapshot.data.principals.every(p=>p.id==='u-anna'));

      await status('Owner grants only profile-edit capability',req(max,'PUT',`/api/permissions/community/${scopeId}/overrides`,{role:'member',permission:'space.edit_profile',effect:'allow'}),200);
      await status('Profile editor cannot change access rules',req(anna,'PUT',`/api/communities/${scopeId}/access`,{visibility:'private',join_policy:'invite'}),403);
      await status('Profile editor cannot read admission requests',req(anna,'GET',`/api/communities/${scopeId}/join-requests`),403);
      await status('Profile editor cannot approve members',req(anna,'POST',`/api/communities/${scopeId}/join-requests/u-lisa`,{decision:'approve'}),403);
      await status('Profile editor cannot configure setup',req(anna,'PUT',`/api/communities/${scopeId}/setup-status`,{complete:true}),403);
      await status('Owner withdraws member writing again',req(max,'PUT',`/api/permissions/community/${scopeId}/role/u-anna`,{role:'guest'}),200);
      await status('Guest cannot edit a previously authored post',req(anna,'PUT',`/api/posts/${post.data.postId}`,{body:'Forbidden later edit'}),403);
      await status('Owner restores member after author regression',req(max,'PUT',`/api/permissions/community/${scopeId}/role/u-anna`,{role:'member'}),200);
      await status('Owner can deny a read capability',req(max,'PUT',`/api/permissions/community/${scopeId}/overrides`,{role:'member',permission:'space.view',effect:'deny'}),200);
      await status('Visibility and capability checks agree on denied reads',req(anna,'GET',`/api/communities/${scopeId}`),404);
      const deniedFeed=await req(anna,'GET','/api/bootstrap');check('Home feed also honors a revoked Space view',!deniedFeed.data.feed.some(p=>p.community_id===scopeId));
      await status('Denied viewer cannot use profile-edit override',req(anna,'PUT',`/api/communities/${scopeId}/profile`,{name:'Forbidden access'}),403);
      await status('Owner restores scoped read capability',req(max,'PUT',`/api/permissions/community/${scopeId}/overrides`,{role:'member',permission:'space.view',effect:'inherit'}),200);
      await status('Unrelated permissions do not survive self role inspection',req(anna,'GET',`/api/permissions/community/${scopeId}`),200);

      sql.prepare("UPDATE user_preferences SET federation_enabled=1 WHERE user_id='u-max'").run();
      sql.prepare("UPDATE communities SET federation_mode='selected' WHERE id=?").run(privateId);
      sql.prepare("UPDATE posts SET federation_state='enabled' WHERE id=?").run(photo.data.postId);
      await fileStatus('Explicitly public selected attachment still federates',imageUrl,null,200);
      const closedComment=await status('Write internal reply to selected parent',req(max,'POST',`/api/posts/${photo.data.postId}/comments`,{body:'INTERNAL_COMMENT_MARKER'}),201);
      check('Private-Space reply is not implicitly public',protocol.noteForLocalComment(sql,closedComment.data.commentId)===null);
      await status('Private reply is absent from ActivityPub',req(anon,'GET',`/ap/objects/comments/${closedComment.data.commentId}`),404);
      const group=await req(anon,'GET',`/ap/actors/spaces/${privateId}`);
      check('Private Space federation exposes minimal Group metadata',group.status===200&&group.data.name==='PartiUp-Space'&&!group.data.summary&&group.data.discoverable===false&&group.data.preferredUsername.startsWith('space_'));
      sql.prepare("UPDATE communities SET federation_mode='public' WHERE id=?").run(scopeId);
      const parent=await status('Create public federation parent',req(max,'POST',`/api/communities/${scopeId}/posts`,{body:'Original publication'}),201);
      const publicComment=await status('Non-federating member can comment locally',req(anna,'POST',`/api/posts/${parent.data.postId}/comments`,{body:'LOCAL_COMMENT_MARKER'}),201);
      check('Commenter federation opt-out is honored independently of parent',protocol.noteForLocalComment(sql,publicComment.data.commentId)===null);
      sql.prepare("UPDATE user_preferences SET federation_enabled=1 WHERE user_id='u-anna'").run();
      check('Opted-in public reply remains federatable',!!protocol.noteForLocalComment(sql,publicComment.data.commentId));
      const old=protocol.createActivityForNote(protocol.noteForLocalPost(sql,parent.data.postId));
      sql.prepare('UPDATE posts SET body=? WHERE id=?').run('Updated publication',parent.data.postId);
      check('Queued delivery uses current content',protocol.refreshPublicationActivity(sql,old).object.content==='Updated publication');
      sql.prepare("UPDATE posts SET federation_state='disabled' WHERE id=?").run(parent.data.postId);
      check('Queued delivery cannot outlive its publication consent',protocol.refreshPublicationActivity(sql,old)===null);
      sql.prepare("INSERT INTO federation_delivery_queue(id,local_user_id,remote_actor_uri,inbox_uri,payload_json,status) VALUES ('retrofit-revoked','u-max','https://remote.example/actor','https://127.0.0.1/inbox',?,'pending')").run(JSON.stringify(old));
      await protocol.flushDeliveryQueue(sql);
      const discarded=sql.prepare("SELECT status,payload_json FROM federation_delivery_queue WHERE id='retrofit-revoked'").get();
      check('Revoked queue item is terminal and its payload is discarded before network access',discarded.status==='failed'&&discarded.payload_json==='{}');
      const disabledMode=childProcess.spawnSync(process.execPath,['-e',"require('./server/federation/key-store')"],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'production',PARTIUP_FEDERATION_KEY_STORE:'sqlite'},encoding:'utf8'});
      check('Production cannot opt back into plaintext SQLite private keys',disabledMode.status!==0&&disabledMode.stderr.includes('encrypted-file'));
      const invalidMode=childProcess.spawnSync(process.execPath,['-e',"require('./server/federation/key-store')"],{cwd:process.cwd(),env:{...process.env,PARTIUP_FEDERATION_KEY_STORE:'typo'},encoding:'utf8'});
      check('Unknown key-store mode cannot fall back to plaintext rotation',invalidMode.status!==0);
      const beforePrivacy=sql.prepare('SELECT user_id,profile_visibility,shared_connections_visibility,follows_visibility FROM user_preferences WHERE user_id IN (?,?,?)').all('u-max','u-anna','u-lisa');
      for(const [a,b] of [['u-anna','u-lisa'],['u-lisa','u-max']])sql.prepare("INSERT OR REPLACE INTO user_friendships(user_a,user_b,status,requested_by) VALUES (?,?,'accepted',?)").run(a,b,a);
      sql.prepare("UPDATE user_preferences SET profile_visibility='public',shared_connections_visibility='public',follows_visibility='public' WHERE user_id IN ('u-max','u-anna')").run();
      sql.prepare("UPDATE user_preferences SET profile_visibility='private',shared_connections_visibility='private' WHERE user_id='u-lisa'").run();
      sql.prepare("INSERT OR IGNORE INTO user_follows(user_id,target_type,target_id) VALUES ('u-max','community',?)").run(privateId);
      sql.prepare("INSERT OR IGNORE INTO user_follows(user_id,target_type,target_id) VALUES ('u-max','person','u-lisa')").run();
      const hiddenMutual=await req(anna,'GET','/api/users/u-max');
      check('Public profile follow graph respects private targets',!hiddenMutual.data.follows.communities.includes(privateId)&&!hiddenMutual.data.follows.people.includes('u-lisa'));
      check('Mutual connections cannot reveal a third party private identity',hiddenMutual.status===200&&!hiddenMutual.data.shared_connections.people.some(p=>p.id==='u-lisa'));
      sql.prepare("UPDATE user_preferences SET profile_visibility='public',shared_connections_visibility='public' WHERE user_id='u-lisa'").run();
      const visibleMutual=await req(anna,'GET','/api/users/u-max');
      check('Explicitly visible mutual connections are preserved',visibleMutual.data.shared_connections.people.some(p=>p.id==='u-lisa'));
      for(const pref of beforePrivacy)sql.prepare('UPDATE user_preferences SET profile_visibility=?,shared_connections_visibility=?,follows_visibility=? WHERE user_id=?').run(pref.profile_visibility,pref.shared_connections_visibility,pref.follows_visibility,pref.user_id);
      const conversation=await status('Create conversation for expiry boundary',req(max,'POST','/api/messages/conversations',{direct_user_id:'u-anna'}),201);
      const privateImage=await upload(max,`/api/messages/conversations/${conversation.data.id}/images`);
      check('Upload private image before conversation expiry',privateImage.status===201,JSON.stringify(privateImage.data));
      const privateUrl=privateImage.data.media[0].url;
      await fileStatus('Current conversation member can read image',privateUrl,max,200);
      sql.prepare("UPDATE conversations SET expires_at=datetime('now','-1 minute') WHERE id=?").run(conversation.data.id);
      const expired=await fetch(base+privateUrl,{headers:{Cookie:cookieHeader(max)}});
      check('Conversation expiration also revokes known image URLs',expired.status===404);await expired.arrayBuffer();
      await status('Expired conversation cannot receive new reactions',req(max,'POST',`/api/messages/${privateImage.data.id}/reactions`,{emoji:'👍'}),404);
      sql.prepare("UPDATE memberships SET role='admin' WHERE community_id=? AND user_id='u-anna'").run(scopeId);
      await status('Owner records a guest restriction over a legacy admin membership',req(max,'PUT',`/api/permissions/community/${scopeId}/role/u-anna`,{role:'guest'}),200);
      const membershipProjection=await req(anna,'GET','/api/bootstrap');check('Own membership overview uses the effective role',membershipProjection.data.memberships.find(m=>m.community_id===scopeId).role==='guest');
      await status('A demoted legacy admin can leave without an ownership lock',req(anna,'DELETE',`/api/communities/${scopeId}/membership`),200);
      await status('Rejoin does not erase a recorded guest restriction',req(anna,'POST',`/api/communities/${scopeId}/join`,{}),200);
      const rejoined=await req(anna,'GET',`/api/permissions/community/${scopeId}`);check('Leave/rejoin cannot bypass demotion',rejoined.data.my_role==='guest');
      sql.prepare("INSERT INTO memberships(community_id,user_id,role) VALUES (?,'u-lisa','member')").run(scopeId);
      await status('Owner grants scoped administrator fixture',req(max,'PUT',`/api/permissions/community/${scopeId}/role/u-lisa`,{role:'admin'}),200);
      await status('Non-owner administrator may relinquish membership',req(lisa,'DELETE',`/api/communities/${scopeId}/membership`),200);
      const departed=await req(lisa,'GET',`/api/permissions/community/${scopeId}`);check('Departure revokes positive community role grants',departed.data.my_role==='guest');
      await status('Owner cannot silently orphan the Space by leaving',req(max,'DELETE',`/api/communities/${scopeId}/membership`),400);
      const {globalMode}=require('../../server/federation/governance');
      check('Federation peer writes require review by default',globalMode()==='reviewed');
    }finally{sql.close();}

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

