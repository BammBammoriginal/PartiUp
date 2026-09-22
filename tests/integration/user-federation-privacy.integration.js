'use strict';
const {spawn}=require('child_process');
const fs=require('fs');const path=require('path');const Database=require('better-sqlite3');
const port=33400+Math.floor(Math.random()*250),httpBase=`http://127.0.0.1:${port}`,publicBase='https://federation.example.test';
const stamp=`${process.pid}-${Date.now()}`,dbPath=path.join(process.cwd(),'data',`user-fed-privacy-${stamp}.db`);
const server=spawn(process.execPath,['server/server.js'],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'test',PORT:String(port),BIND_HOST:'127.0.0.1',BUP_DB_PATH:dbPath,BUP_SEED_DEMO:'1',PARTIUP_BASE_URL:publicBase},stdio:['ignore','pipe','pipe']});
let out='';server.stdout.on('data',d=>out+=d);server.stderr.on('data',d=>out+=d);
function assert(v,m){if(!v)throw new Error(m);console.log('✓ '+m)}
async function ready(){for(let i=0;i<80;i++){try{if((await fetch(httpBase+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('server not ready\n'+out)}
async function get(url){const r=await fetch(httpBase+url,{headers:{Accept:'application/activity+json'}});let b=null;try{b=await r.json()}catch{}return {status:r.status,body:b}}
(async()=>{let db;try{
 await ready();db=new Database(dbPath);db.pragma('busy_timeout=5000');
 db.prepare('INSERT OR IGNORE INTO user_preferences(user_id) VALUES (?)').run('u-max');
 const set=(profile,fed,disc,fields,interests='members',allow=1,bio='network')=>db.prepare(`UPDATE user_preferences SET profile_visibility=?,bio_visibility=?,interests_visibility=?,memberships_visibility='public',follows_visibility='public',allow_followers=?,federation_enabled=?,federation_discoverable=?,federated_profile_fields=? WHERE user_id='u-max'`).run(profile,bio,interests,allow,fed,disc,JSON.stringify(fields));
 set('public',0,1,['name','bio','avatar','interests'],'public');
 let r=await get('/ap/actors/users/u-max');assert(r.status===404,'federation off hides actor even when internal profile is public');
 r=await get('/ap/actors/users/u-max/outbox');assert(r.status===404,'federation off hides outbox');
 r=await get('/ap/actors/users/u-max/followers');assert(r.status===404,'federation off hides followers endpoint');
 assert(db.prepare("SELECT COUNT(*) n FROM federation_handles WHERE user_id='u-max'").get().n===0,'base URL alone did not create a federation handle');

 set('private',1,0,['name','bio','avatar','interests'],'private');
 r=await get('/ap/actors/users/u-max');assert(r.status===200,'explicit federation opt-in creates minimal actor for private profile');
 assert(!('name' in r.body)&&!('summary' in r.body)&&!('icon' in r.body)&&!('tag' in r.body),'private profile fields are absent from actor despite requested fields');
 assert(r.body.discoverable===false,'discoverability remains independently off');
 const handle=r.body.preferredUsername;
 let wf=await fetch(`${httpBase}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${handle}@federation.example.test`)}`);assert(wf.status===200,'WebFinger works only after explicit federation opt-in');

 set('members',1,1,['name','bio','avatar','interests'],'public');
 r=await get('/ap/actors/users/u-max');assert(r.status===200&&r.body.discoverable===true,'discoverability is explicit and independent of members profile');
 assert(!('name' in r.body)&&!('summary' in r.body)&&!('icon' in r.body),'members-only profile fields are not federated');
 assert(Array.isArray(r.body.tag)&&r.body.tag.length>0,'public interests may federate when explicitly selected even if base profile is members-only');
 assert(!('memberships' in r.body)&&!('followingItems' in r.body),'memberships and follow lists are never copied into actor document');

 set('public',1,1,['name','bio','interests'],'public',1,'network');
 r=await get('/ap/actors/users/u-max');assert(r.status===200&&r.body.name==='Max'&&!('summary' in r.body),'granular bio visibility still blocks federation when bio is not public');
 set('public',1,1,['name','bio','interests'],'public',1,'public');
 r=await get('/ap/actors/users/u-max');assert(r.status===200&&r.body.name==='Max'&&typeof r.body.summary==='string','public profile exposes only explicitly selected safe profile fields');
 assert(!('icon' in r.body),'unselected avatar is not federated');
 r=await get('/ap/actors/users/u-max/followers');assert(r.status===200&&r.body.totalItems===0&&Array.isArray(r.body.orderedItems)&&r.body.orderedItems.length===0,'followers collection does not leak follower identities or count');
 r=await get('/ap/actors/users/u-max/following');assert(r.status===200&&r.body.totalItems===0,'following collection does not leak local follow graph');
 r=await get('/ap/actors/users/u-max/outbox');assert(r.status===200,'enabled actor has a reachable outbox');

 set('public',0,0,[],'public');
 wf=await fetch(`${httpBase}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${handle}@federation.example.test`)}`);assert(wf.status===404,'WebFinger stops resolving an opted-out user');
 r=await get('/ap/actors/users/u-max');assert(r.status===404,'actor endpoint stops exposing opted-out user');
 console.log('\nUser federation privacy integration: PASS');
}catch(e){console.error('\nUser federation privacy integration FAILED\n'+(e.stack||e)+'\n\nServer output:\n'+out.slice(-5000));process.exitCode=1}finally{try{db?.close()}catch{}if(server.exitCode===null){server.kill('SIGTERM');await new Promise(r=>setTimeout(r,250))}for(const x of ['','-wal','-shm'])try{fs.rmSync(dbPath+x,{force:true})}catch{}}})();
