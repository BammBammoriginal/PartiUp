const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');
const {residualPersonalDataAudit}=require('../../server/privacy');

const port=33100+Math.floor(Math.random()*300);
const base=`http://127.0.0.1:${port}`;
const stamp=`${process.pid}-${Date.now()}`;
const dbPath=path.join(process.cwd(),'data',`privacy-lifecycle-${stamp}.db`);
const pubDir=path.join(process.cwd(),'uploads','public','media');
const privDir=path.join(process.cwd(),'data','private-media');
fs.mkdirSync(pubDir,{recursive:true});fs.mkdirSync(privDir,{recursive:true});
const pubFiles=[`privacy-${stamp}-thumb.webp`,`privacy-${stamp}-medium.webp`,`privacy-${stamp}-large.webp`];
const privFile=`privacy-${stamp}-private.webp`;
const server=spawn(process.execPath,['server/server.js'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1'},stdio:['ignore','pipe','pipe']});
let serverOut='';server.stdout.on('data',d=>serverOut+=d);server.stderr.on('data',d=>serverOut+=d);
function jar(){return {cookies:new Map(),csrf:null}}
function absorb(j,res){const raw=res.headers.get('set-cookie');if(!raw)return;for(const p of raw.split(/,(?=\s*[^;=]+=[^;]+)/)){const f=p.trim().split(';',1)[0],i=f.indexOf('=');if(i>0)j.cookies.set(f.slice(0,i),f.slice(i+1));}}
function cookie(j){return [...j.cookies].map(([k,v])=>`${k}=${v}`).join('; ')}
async function req(j,method,url,body){const h={Accept:'application/json'};if(body!==undefined)h['Content-Type']='application/json';if(j){const c=cookie(j);if(c)h.Cookie=c;if(!['GET','HEAD','OPTIONS'].includes(method)&&j.csrf)h['X-BUP-CSRF']=j.csrf;}const r=await fetch(base+url,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});if(j)absorb(j,r);const t=await r.text();let data;try{data=t?JSON.parse(t):null}catch{data=t}return {status:r.status,data}}
async function csrf(j){const r=await req(j,'GET','/api/security/csrf');j.csrf=r.data.csrf;}
async function login(){const j=jar();await csrf(j);const r=await req(j,'POST','/api/login',{email:'max@bottomupparti.local',password:'demo123'});if(r.status!==200)throw new Error(`login failed ${r.status}`);if(!r.data?.csrf)throw new Error('login did not return rotated csrf');j.csrf=r.data.csrf;return j}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('server not ready\n'+serverOut)}
function assert(ok,msg){if(!ok)throw new Error(msg);console.log('✓ '+msg)}
(async()=>{let sql;try{
  await ready();sql=new Database(dbPath);sql.pragma('busy_timeout=5000');
  const j=await login();
  const community=sql.prepare('SELECT id FROM communities LIMIT 1').get().id;
  const event=sql.prepare('SELECT id FROM events LIMIT 1').get().id;
  const project=sql.prepare('SELECT id FROM projects LIMIT 1').get().id;
  const question=sql.prepare('SELECT q.id question_id,o.id option_id FROM participation_questions q JOIN participation_question_options o ON o.question_id=q.id LIMIT 1').get();
  const argument=sql.prepare("SELECT id FROM participation_arguments WHERE author_id<>'u-max' LIMIT 1").get();

  sql.transaction(()=>{
    sql.prepare('INSERT INTO conversations(id,type,title,created_by) VALUES (?,?,?,?)').run(`conv-${stamp}`,'direct','Privacy QA','u-max');
    sql.prepare('INSERT INTO conversation_members(conversation_id,user_id,role) VALUES (?,?,?)').run(`conv-${stamp}`,'u-max','owner');
    sql.prepare('INSERT INTO conversation_members(conversation_id,user_id,role) VALUES (?,?,?)').run(`conv-${stamp}`,'u-anna','member');
    sql.prepare('INSERT INTO messages(id,conversation_id,sender_id,body) VALUES (?,?,?,?)').run(`msg-max-${stamp}`,`conv-${stamp}`,'u-max','private personal max');
    sql.prepare('INSERT INTO messages(id,conversation_id,sender_id,body) VALUES (?,?,?,?)').run(`msg-anna-${stamp}`,`conv-${stamp}`,'u-anna','anna must survive');
    sql.prepare('INSERT INTO message_reactions(message_id,user_id,emoji) VALUES (?,?,?)').run(`msg-anna-${stamp}`,'u-max','👍');
    sql.prepare('INSERT INTO private_media(id,owner_user_id,kind,mime_type,original_name,size_bytes,storage_key) VALUES (?,?,?,?,?,?,?)').run(`pm-${stamp}`,'u-max','image','image/webp','secret.webp',4,privFile);
    sql.prepare('INSERT INTO message_media(message_id,media_id) VALUES (?,?)').run(`msg-max-${stamp}`,`pm-${stamp}`);
    sql.prepare('INSERT INTO media(id,owner_user_id,kind,mime_type,original_name,size_bytes,storage_key,variants_json) VALUES (?,?,?,?,?,?,?,?)').run(`m-${stamp}`,'u-max','image','image/webp','public.webp',4,pubFiles[2],JSON.stringify({thumb:`/uploads/public/media/${pubFiles[0]}`,medium:`/uploads/public/media/${pubFiles[1]}`,large:`/uploads/public/media/${pubFiles[2]}`}));
    sql.prepare('INSERT INTO posts(id,community_id,author_id,body) VALUES (?,?,?,?)').run(`post-${stamp}`,community,'u-max','public personal max');
    sql.prepare('INSERT INTO comments(id,post_id,author_id,body) VALUES (?,?,?,?)').run(`comment-anna-${stamp}`,`post-${stamp}`,'u-anna','anna comment must survive');
    sql.prepare('INSERT INTO comments(id,post_id,author_id,body) VALUES (?,?,?,?)').run(`comment-max-${stamp}`,`post-${stamp}`,'u-max','max comment personal');
    sql.prepare('INSERT OR REPLACE INTO event_attendance(event_id,user_id,status) VALUES (?,?,?)').run(event,'u-max','going');
    sql.prepare('INSERT OR REPLACE INTO community_join_requests(community_id,user_id,status) VALUES (?,?,?)').run(community,'u-max','pending');
    if(question)sql.prepare('INSERT OR REPLACE INTO participation_question_votes(question_id,option_id,user_id) VALUES (?,?,?)').run(question.question_id,question.option_id,'u-max');
    if(argument)sql.prepare('INSERT OR REPLACE INTO participation_argument_support(argument_id,user_id) VALUES (?,?)').run(argument.id,'u-max');
    sql.prepare(`INSERT INTO content_reports(id,reporter_id,scope_type,scope_id,target_type,target_id,reason,details,target_label,content_excerpt) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(`report-${stamp}`,'u-max','community',community,'user','u-anna','privacy','retained safety report','Anna','excerpt');
    sql.prepare(`INSERT INTO moderation_actions(id,report_id,scope_type,scope_id,target_type,target_id,action,note,actor_id) VALUES (?,?,?,?,?,?,?,?,?)`).run(`mod-${stamp}`,`report-${stamp}`,'community',community,'user','u-anna','note','retained audit','u-max');
    sql.prepare('INSERT OR REPLACE INTO federation_actor_keys(user_id,public_key_pem,private_key_pem) VALUES (?,?,?)').run('u-max','PUBLIC-QA','PRIVATE-QA');
    sql.prepare('INSERT OR REPLACE INTO federation_followers(local_user_id,remote_actor_uri,remote_inbox_uri) VALUES (?,?,?)').run('u-max','https://remote.example/users/a','https://remote.example/inbox');
    sql.prepare(`INSERT INTO federation_activities(id,activity_uri,direction,activity_type,actor_uri,local_user_id,payload_json,status) VALUES (?,?,?,?,?,?,?,?)`).run(`act-${stamp}`,`https://local.example/a/${stamp}`,'out','Create','https://local.example/u-max','u-max','{"personal":"payload"}','sent');
    sql.prepare(`INSERT INTO federation_delivery_queue(id,local_user_id,remote_actor_uri,inbox_uri,activity_uri,payload_json,status) VALUES (?,?,?,?,?,?,?)`).run(`del-${stamp}`,'u-max','https://remote.example/users/a','https://remote.example/inbox',`https://local.example/a/${stamp}`,'{"personal":"payload"}','pending');
    sql.prepare(`INSERT OR REPLACE INTO role_assignments(scope_type,scope_id,user_id,role,assigned_by) VALUES ('project',?,?,?,?)`).run(project,'u-max','member','u-anna');
    sql.prepare(`INSERT OR REPLACE INTO permission_overrides(scope_type,scope_id,role,permission,effect,updated_by) VALUES ('project',?,'member','task.view','allow',?)`).run(project,'u-max');
    sql.prepare(`INSERT INTO tasks(id,entity_type,entity_id,title,description,created_by,assignee_user_id) VALUES (?,?,?,?,?,?,?)`).run(`task-${stamp}`,'project',project,'Privacy task','shared task','u-max','u-max');
  })();
  fs.writeFileSync(path.join(privDir,privFile),'data');for(const f of pubFiles)fs.writeFileSync(path.join(pubDir,f),'data');

  const groupPayload=JSON.stringify({type:'Announce',actor:`https://test.example/ap/actors/spaces/${community}`,object:{id:`https://test.example/ap/objects/posts/post-${stamp}`,attributedTo:'https://test.example/ap/actors/users/u-max',content:'ORIGINAL_PERSONAL_GROUP_PAYLOAD'}});
  sql.prepare("INSERT INTO federation_space_delivery_queue(id,local_space_id,remote_actor_uri,inbox_uri,payload_json) VALUES (?,?,?,?,?)").run(`group-delivery-${stamp}`,community,'https://remote.example/actor','https://remote.example/inbox',groupPayload);
  sql.prepare("INSERT INTO federation_activities(id,direction,activity_type,actor_uri,payload_json) VALUES (?,'out','Announce',?,?)").run(`group-activity-${stamp}`,`https://test.example/ap/actors/spaces/${community}`,groupPayload);
  const exp=await req(j,'GET','/api/privacy/export');assert(exp.status===200,'privacy export succeeds');
  assert(exp.data.conversations.messages.some(x=>x.id===`msg-max-${stamp}`),'export includes authored messages');
  assert(exp.data.conversations.private_media.some(x=>x.id===`pm-${stamp}`),'export includes private media metadata');
  assert(exp.data.public_media.some(x=>x.id===`m-${stamp}`),'export includes public media metadata');
  assert(exp.data.reports.some(x=>x.id===`report-${stamp}`),'export includes reports');
  assert(exp.data.moderation_history.actions.some(x=>x.id===`mod-${stamp}`),'export includes moderation history');
  assert(exp.data.federation.actor_key.private_key_exported===false && !JSON.stringify(exp.data).includes('PRIVATE-QA'),'export accounts for federation key without leaking private key');
  assert(exp.data.schema_inventory.some(x=>x.table==='private_media'),'export includes schema-level personal-data inventory');

  const rejected=await req(j,'POST','/api/privacy/delete-account',{password:'wrong-password'});assert(rejected.status===403,'account deletion rejects an incorrect password');
  assert(sql.prepare("SELECT account_status FROM users WHERE id=?").get('u-max').account_status==='active','failed password confirmation leaves account active');
  assert(sql.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get('u-max').n===1,'failed password confirmation preserves the active session');
  const del=await req(j,'POST','/api/privacy/delete-account',{password:'demo123'});assert(del.status===200,'account deletion succeeds');
  const u=sql.prepare('SELECT * FROM users WHERE id=?').get('u-max');assert(u.account_status==='deleted'&&u.bio===''&&u.place_id===null&&u.trust_level===0,'identity is tombstoned and profile data cleared');
  assert(sql.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get('u-max').n===0,'sessions deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM conversation_members WHERE user_id=?').get('u-max').n===0,'conversation membership deleted');
  assert(sql.prepare('SELECT body,deleted_at FROM messages WHERE id=?').get(`msg-max-${stamp}`).body.includes('gelöschten Kontos'),'own message content redacted');
  assert(sql.prepare('SELECT body FROM messages WHERE id=?').get(`msg-anna-${stamp}`).body==='anna must survive','other participant message preserved');
  assert(sql.prepare('SELECT body FROM comments WHERE id=?').get(`comment-anna-${stamp}`).body==='anna comment must survive','other participant public comment preserved');
  assert(sql.prepare('SELECT body FROM posts WHERE id=?').get(`post-${stamp}`).body.includes('gelöschten Kontos'),'own public post content redacted');
  assert(sql.prepare('SELECT COUNT(*) n FROM private_media WHERE owner_user_id=?').get('u-max').n===0 && !fs.existsSync(path.join(privDir,privFile)),'private media DB row and physical file deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM media WHERE owner_user_id=?').get('u-max').n===0 && pubFiles.every(f=>!fs.existsSync(path.join(pubDir,f))),'public media DB rows and physical variants deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM event_attendance WHERE user_id=?').get('u-max').n===0,'event attendance deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM participation_question_votes WHERE user_id=?').get('u-max').n===0,'participation votes deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM participation_argument_support WHERE user_id=?').get('u-max').n===0,'participation support deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM federation_handles WHERE user_id=?').get('u-max').n===0,'federation handle deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM federation_actor_keys WHERE user_id=?').get('u-max').n===0,'federation private/public key material deleted');
  assert(sql.prepare('SELECT COUNT(*) n FROM federation_followers WHERE local_user_id=?').get('u-max').n===0,'federation followers deleted locally');
  assert(sql.prepare('SELECT COUNT(*) n FROM federation_activities WHERE local_user_id=?').get('u-max').n===0 && sql.prepare('SELECT COUNT(*) n FROM federation_delivery_queue WHERE local_user_id=?').get('u-max').n===0,'federation activity and delivery payloads deleted locally');
  assert(sql.prepare('SELECT reporter_id FROM content_reports WHERE id=?').get(`report-${stamp}`).reporter_id==='u-max','moderation report retained only against tombstone identity');
  assert(sql.prepare('SELECT actor_id FROM moderation_actions WHERE id=?').get(`mod-${stamp}`).actor_id==='u-max','moderation action retained for safety/audit integrity');
  assert(sql.prepare('SELECT COUNT(*) n FROM privacy_file_deletion_queue WHERE deleted_at IS NULL').get().n===0,'file deletion queue drained successfully');
  assert(!sql.prepare('SELECT 1 FROM federation_space_delivery_queue WHERE id=?').get(`group-delivery-${stamp}`)&&!sql.prepare('SELECT 1 FROM federation_activities WHERE id=?').get(`group-activity-${stamp}`),'nested Group publication payloads are purged together with their deleted subject');
  const audit=residualPersonalDataAudit(sql,'u-max',{privateUploadDir:privDir,publicUploadDir:pubDir});assert(audit.pass,'residual personal-data audit passes after deletion');
  console.log('\nPrivacy data lifecycle integration: PASS');
}catch(e){console.error('\nPrivacy data lifecycle integration FAILED\n'+(e.stack||e)+'\n\nServer output:\n'+serverOut.slice(-6000));process.exitCode=1}finally{try{sql?.close()}catch{}if(server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>setTimeout(r,300))}for(const x of ['','-wal','-shm'])try{fs.rmSync(dbPath+x,{force:true})}catch{}try{fs.rmSync(path.join(privDir,privFile),{force:true})}catch{}for(const f of pubFiles)try{fs.rmSync(path.join(pubDir,f),{force:true})}catch{}}})();
