'use strict';
const crypto=require('crypto');
const dns=require('dns').promises;
const https=require('https');
const net=require('net');
const {normalizeBaseUrl}=require('./model');
const {remoteFetch,actorLookup,getCachedActor,cacheActor,isNegativeActorCached,cacheNegativeActor,invalidateActor}=require('./security');
const federationKeyStore=require('./key-store');
const {evaluatePeer,recordPeerObservation}=require('./governance');
const {attachmentDocumentsForEntity,primaryImageForEntity}=require('./media');
const AS='https://www.w3.org/ns/activitystreams';
const AP_ACCEPT=['application/activity+json','application/ld+json; profile="https://www.w3.org/ns/activitystreams"'];
function envBoundedInt(name,fallback,min,max){const n=Number.parseInt(process.env[name]||'',10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
const REMOTE_TIMEOUT_MS=envBoundedInt('PARTIUP_FEDERATION_REMOTE_TIMEOUT_MS',8000,1000,15000);
const MAX_REMOTE_BYTES=envBoundedInt('PARTIUP_FEDERATION_REMOTE_MAX_BYTES',1024*1024,64*1024,2*1024*1024);
const MAX_ACTOR_BYTES=envBoundedInt('PARTIUP_FEDERATION_ACTOR_MAX_BYTES',256*1024,32*1024,512*1024);
function remoteFetchPolicy(){return {httpsOnly:true,redirects:false,privateNetworksBlocked:true,timeoutMs:REMOTE_TIMEOUT_MS,maxBytes:MAX_REMOTE_BYTES,actorMaxBytes:MAX_ACTOR_BYTES};}
function baseUrl(){return normalizeBaseUrl(process.env.PARTIUP_BASE_URL||'');}
function requirePublicBase(){
  const b=baseUrl();if(!b)throw new Error('PARTIUP_BASE_URL ist nicht gesetzt.');
  const u=new URL(b);
  if((process.env.NODE_ENV==='production'||process.env.PARTIUP_FEDERATION_TEST==='1')&&u.protocol!=='https:')throw new Error('Federation-Test/Production erfordert HTTPS.');
  return b;
}
function actorId(userId){return `${requirePublicBase()}/ap/actors/users/${encodeURIComponent(userId)}`;}
function spaceActorId(spaceId){return `${requirePublicBase()}/ap/actors/spaces/${encodeURIComponent(spaceId)}`;}
function normalizeHandle(raw){return String(raw||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,30);}
function defaultHandleForUser(userId){const id=String(userId||'').replace(/^u[-_]/i,'');return normalizeHandle(id)||('user'+crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0,8));}
function userFederationSettings(db,userId){
  const row=db.prepare(`SELECT u.id,u.name,u.bio,u.avatar,u.account_status,
    COALESCE(p.profile_visibility,'network') profile_visibility,
    COALESCE(p.bio_visibility,'network') bio_visibility,
    COALESCE(p.interests_visibility,'network') interests_visibility,
    COALESCE(p.memberships_visibility,'private') memberships_visibility,
    COALESCE(p.follows_visibility,'private') follows_visibility,
    COALESCE(p.allow_followers,1) allow_followers,
    COALESCE(p.federation_enabled,0) federation_enabled,
    COALESCE(p.federation_discoverable,0) federation_discoverable,
    COALESCE(p.federated_profile_fields,'[]') federated_profile_fields
    FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=?`).get(userId);
  if(!row||row.account_status!=='active')return null;
  let fields=[];try{const parsed=JSON.parse(row.federated_profile_fields||'[]');if(Array.isArray(parsed))fields=parsed.filter(x=>['name','bio','avatar','interests'].includes(x))}catch{}
  return {...row,fields:[...new Set(fields)]};
}
function isUserFederationEnabled(db,userId){return !!userFederationSettings(db,userId)?.federation_enabled;}
function ensureFederationHandle(db,userId){if(!isUserFederationEnabled(db,userId))return null;let row=db.prepare('SELECT handle FROM federation_handles WHERE user_id=?').get(userId);if(row?.handle)return row.handle;let base=defaultHandleForUser(userId), candidate=base, n=2;while(db.prepare('SELECT 1 FROM federation_handles WHERE handle=?').get(candidate)){candidate=`${base}${n++}`.slice(0,30)}db.prepare('INSERT INTO federation_handles(user_id,handle) VALUES (?,?)').run(userId,candidate);return candidate;}
function userIdForHandle(db,handle){const h=normalizeHandle(handle);if(!h)return null;return db.prepare(`SELECT fh.user_id FROM federation_handles fh JOIN users u ON u.id=fh.user_id JOIN user_preferences p ON p.user_id=fh.user_id WHERE fh.handle=? AND COALESCE(u.account_status,'active')='active' AND COALESCE(p.federation_enabled,0)=1`).get(h)?.user_id||null;}
function defaultHandleForSpace(name,spaceId){const base=normalizeHandle(String(name||'').replace(/\s+/g,'_'));return base||('space'+crypto.createHash('sha256').update(String(spaceId)).digest('hex').slice(0,8));}
function ensureSpaceFederationHandle(db,spaceId){let row=db.prepare('SELECT handle FROM federation_space_handles WHERE community_id=?').get(spaceId);if(row?.handle)return row.handle;const space=db.prepare('SELECT name FROM communities WHERE id=?').get(spaceId);if(!space)return null;let base=defaultHandleForSpace(space.name,spaceId),candidate=base,n=2;while(db.prepare('SELECT 1 FROM federation_handles WHERE handle=? UNION SELECT 1 FROM federation_space_handles WHERE handle=?').get(candidate,candidate)){const suffix=String(n++);candidate=(base.slice(0,Math.max(1,30-suffix.length))+suffix)}db.prepare('INSERT INTO federation_space_handles(community_id,handle) VALUES (?,?)').run(spaceId,candidate);return candidate;}
function spaceIdForHandle(db,handle){const h=normalizeHandle(handle);if(!h)return null;return db.prepare('SELECT community_id FROM federation_space_handles WHERE handle=?').get(h)?.community_id||null;}
function installProtocolSchema(db){db.exec(`
CREATE TABLE IF NOT EXISTS federation_handles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, handle TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS federation_actor_keys(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, public_key_pem TEXT NOT NULL, private_key_pem TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS federation_space_handles(community_id TEXT PRIMARY KEY REFERENCES communities(id) ON DELETE CASCADE, handle TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS federation_space_actor_keys(community_id TEXT PRIMARY KEY REFERENCES communities(id) ON DELETE CASCADE, public_key_pem TEXT NOT NULL, private_key_pem TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS federation_space_followers(local_space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, remote_actor_uri TEXT NOT NULL, remote_inbox_uri TEXT NOT NULL DEFAULT '', accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(local_space_id,remote_actor_uri));
CREATE TABLE IF NOT EXISTS federation_space_delivery_queue(id TEXT PRIMARY KEY, local_space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE, remote_actor_uri TEXT NOT NULL, inbox_uri TEXT NOT NULL, activity_uri TEXT NOT NULL DEFAULT '', payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','retry','sent','failed')), attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS federation_followers(local_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, remote_actor_uri TEXT NOT NULL, remote_inbox_uri TEXT NOT NULL DEFAULT '', accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(local_user_id,remote_actor_uri));
CREATE TABLE IF NOT EXISTS federation_activities(id TEXT PRIMARY KEY, activity_uri TEXT DEFAULT '', direction TEXT NOT NULL CHECK(direction IN ('in','out')), activity_type TEXT NOT NULL, actor_uri TEXT NOT NULL, local_user_id TEXT, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'accepted', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(activity_uri));
CREATE TABLE IF NOT EXISTS federation_delivery_queue(id TEXT PRIMARY KEY, local_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, remote_actor_uri TEXT NOT NULL, inbox_uri TEXT NOT NULL, activity_uri TEXT NOT NULL DEFAULT '', payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','retry','sent','failed')), attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_federation_delivery_due ON federation_delivery_queue(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_federation_space_delivery_due ON federation_space_delivery_queue(status,next_attempt_at);
`)}
function ensureActorKey(db,userId){if(!isUserFederationEnabled(db,userId))return null;return federationKeyStore.ensureKey(db,'users',userId)}
function ensureSpaceActorKey(db,spaceId){return federationKeyStore.ensureKey(db,'spaces',spaceId)}
function rotateActorKey(db,userId){if(!isUserFederationEnabled(db,userId))return null;return federationKeyStore.rotateKey(db,'users',userId)}
function rotateSpaceActorKey(db,spaceId){return federationKeyStore.rotateKey(db,'spaces',spaceId)}
function actorDocument(db,userId){
  const u=userFederationSettings(db,userId);if(!u||!u.federation_enabled)return null;
  const id=actorId(userId),key=ensureActorKey(db,userId),handle=ensureFederationHandle(db,userId);if(!key||!handle)return null;
  const host=new URL(requirePublicBase()).host;
  const profilePublic=u.profile_visibility==='public';
  const allowField=f=>profilePublic&&u.fields.includes(f);
  const actor={'@context':[AS,'https://w3id.org/security/v1',{webfinger:'https://w3id.org/fep/2c59/webfinger',discoverable:'toot:discoverable',toot:'http://joinmastodon.org/ns#'}],id,type:'Person',preferredUsername:handle,webfinger:`acct:${handle}@${host}`,discoverable:!!u.federation_discoverable,inbox:`${id}/inbox`,outbox:`${id}/outbox`,followers:`${id}/followers`,following:`${id}/following`,url:id,publicKey:{id:`${id}#main-key`,owner:id,publicKeyPem:key.public_key_pem}};
  if(allowField('name')&&u.name)actor.name=u.name;
  if(allowField('bio')&&u.bio_visibility==='public'&&u.bio)actor.summary=u.bio;
  if(allowField('avatar')&&u.avatar)actor.icon={type:'Image',url:u.avatar};
  if(u.interests_visibility==='public'&&u.fields.includes('interests')){const interests=db.prepare('SELECT t.name FROM user_topics ut JOIN topics t ON t.id=ut.topic_id WHERE ut.user_id=? ORDER BY t.name').all(userId).map(x=>x.name);if(interests.length)actor.tag=interests.map(name=>({type:'Hashtag',name:'#'+name.replace(/\s+/g,'')}));}
  return actor;
}
function spaceActorDocument(db,spaceId){const c=db.prepare('SELECT id,name,description,icon,visibility,federation_mode FROM communities WHERE id=?').get(spaceId);if(!c||c.federation_mode==='off')return null;const id=spaceActorId(spaceId),key=ensureSpaceActorKey(db,spaceId),handle=ensureSpaceFederationHandle(db,spaceId),host=new URL(requirePublicBase()).host;return {'@context':[AS,'https://w3id.org/security/v1',{webfinger:'https://w3id.org/fep/2c59/webfinger',discoverable:'toot:discoverable',toot:'http://joinmastodon.org/ns#'}],id,type:'Group',preferredUsername:handle,webfinger:`acct:${handle}@${host}`,name:c.name,summary:c.description||'',discoverable:true,inbox:`${id}/inbox`,outbox:`${id}/outbox`,followers:`${id}/followers`,following:`${id}/following`,url:id,publicKey:{id:`${id}#main-key`,owner:id,publicKeyPem:key.public_key_pem}}}

function orderedCollection(id,total,items=[]){return {'@context':AS,id,type:'OrderedCollection',totalItems:Number(total||0),orderedItems:items}}
function parseSignatureHeader(v){const out={};String(v||'').replace(/([\w-]+)="([^"]*)"/g,(_,k,val)=>(out[k]=val));return out}
function isForbiddenIp(address){
  let ip=String(address||'').toLowerCase();
  if(ip.startsWith('::ffff:')) ip=ip.slice(7);
  if(net.isIP(ip)===4){
    const p=ip.split('.').map(Number);const [a,b]=p;
    return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19));
  }
  if(net.isIP(ip)===6){
    return ip==='::'||ip==='::1'||ip.startsWith('fc')||ip.startsWith('fd')||/^fe[89ab]/.test(ip)||ip.startsWith('ff');
  }
  return true;
}
async function resolvePublicHttps(raw){
  const u=new URL(raw);
  if(u.protocol!=='https:')throw new Error('Remote Federation URL muss HTTPS verwenden');
  if(u.username||u.password)throw new Error('Credentials in Remote URL sind nicht erlaubt');
  const host=u.hostname.toLowerCase();
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local'))throw new Error('Lokale Remote-Ziele sind blockiert');
  const answers=await dns.lookup(host,{all:true,verbatim:true});
  const usable=answers.filter(a=>!isForbiddenIp(a.address));
  if(!answers.length||usable.length!==answers.length)throw new Error('Private/reservierte Remote-Adresse blockiert');
  return {url:u,address:usable[0].address,family:usable[0].family};
}
async function safeHttpsRequest(raw,{method='GET',headers={},body=null,maxBytes=MAX_REMOTE_BYTES}={}){
  return remoteFetch(async()=>{
  const target=await resolvePublicHttps(raw);
  return await new Promise((resolve,reject)=>{
    const req=https.request({protocol:'https:',hostname:target.url.hostname,port:target.url.port||443,path:`${target.url.pathname}${target.url.search}`,method,headers,servername:target.url.hostname,lookup:(hostname,opts,cb)=>cb(null,target.address,target.family),timeout:REMOTE_TIMEOUT_MS},res=>{
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){req.destroy(new Error('Remote response zu gross'));return;}chunks.push(chunk)});
      res.on('end',()=>resolve({status:res.statusCode||0,headers:res.headers,body:Buffer.concat(chunks)}));
    });
    req.on('timeout',()=>req.destroy(new Error('Remote request timeout')));
    req.on('error',reject);
    if(body)req.write(body);req.end();
  });
  });
}
function minimalRemoteActor(j,uri){
  const keyId=String(j?.publicKey?.id||''),owner=String(j?.publicKey?.owner||''),pem=String(j?.publicKey?.publicKeyPem||'');
  const inbox=typeof j?.inbox==='string'?j.inbox:'';const shared=typeof j?.endpoints?.sharedInbox==='string'?j.endpoints.sharedInbox:'';
  if(!j?.id||j.id!==uri||!keyId||keyId.length>2048||owner!==uri||pem.length<100||pem.length>16384||inbox.length>2048||shared.length>2048)throw new Error('Remote actor/key ungueltig');
  return {id:uri,inbox,publicKey:{id:keyId,owner,publicKeyPem:pem},endpoints:shared?{sharedInbox:shared}:{}};
}
async function fetchActor(uri,{forceRefresh=false}={}){
  if(!forceRefresh){const cached=getCachedActor(uri);if(cached)return {actor:cached,fromCache:true};if(isNegativeActorCached(uri))throw new Error('Remote actor temporarily unavailable');}
  return actorLookup(async()=>{
    if(!forceRefresh){const cached=getCachedActor(uri);if(cached)return {actor:cached,fromCache:true};}
    try{
      const r=await safeHttpsRequest(uri,{headers:{Accept:AP_ACCEPT[0]},maxBytes:MAX_ACTOR_BYTES});
      if(r.status<200||r.status>=300){const e=new Error(`Remote actor fetch failed (${r.status})`);e.remoteStatus=r.status;throw e;}
      let j;try{j=JSON.parse(r.body.toString('utf8'))}catch{throw new Error('Remote actor JSON ungueltig')}
      const actor=minimalRemoteActor(j,uri);cacheActor(uri,actor);return {actor,fromCache:false};
    }catch(e){if(!forceRefresh&&(e?.remoteStatus===404||e?.remoteStatus===410))cacheNegativeActor(uri);throw e}
  });
}

async function verifyLegacySignature(req,activity){
  const sig=parseSignatureHeader(req.get('signature'));
  if(!sig.keyId||!sig.signature||!sig.headers)throw new Error('HTTP Signature fehlt oder ist unvollstaendig');
  const actorUri=typeof activity.actor==='string'?activity.actor:activity.actor?.id;if(!actorUri)throw new Error('Activity actor fehlt');
  let fetched=await fetchActor(actorUri);let actor=fetched.actor;
  if(actor.publicKey.id!==sig.keyId||actor.publicKey.owner!==actorUri){
    if(fetched.fromCache){invalidateActor(actorUri);fetched=await fetchActor(actorUri,{forceRefresh:true});actor=fetched.actor;}
    if(actor.publicKey.id!==sig.keyId||actor.publicKey.owner!==actorUri)throw new Error('keyId/owner gehoert nicht exakt zum Actor');
  }
  const signedHeaders=sig.headers.trim().toLowerCase().split(/\s+/);
  for(const required of ['(request-target)','host','date'])if(!signedHeaders.includes(required))throw new Error(`Pflicht-Signaturheader fehlt: ${required}`);
  const dateRaw=req.get('date');const dateMs=Date.parse(dateRaw);if(!Number.isFinite(dateMs)||Math.abs(Date.now()-dateMs)>5*60*1000)throw new Error('Signaturdatum ausserhalb des erlaubten Fensters');
  const lines=[];
  for(const h of signedHeaders){if(h==='(request-target)')lines.push(`(request-target): ${req.method.toLowerCase()} ${req.originalUrl}`);else {const val=req.get(h);if(!val)throw new Error(`Signierter Header fehlt: ${h}`);lines.push(`${h}: ${val}`)}}
  if(req.rawBody&&req.rawBody.length){
    if(!signedHeaders.includes('digest'))throw new Error('Digest muss signiert sein');
    const digest=req.get('digest');if(!digest)throw new Error('Digest fehlt');
    const expected='SHA-256='+crypto.createHash('sha256').update(req.rawBody).digest('base64');
    if(!crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(expected)))throw new Error('Digest ungueltig');
  }
  const verifyWith=publicKeyPem=>{const verify=crypto.createVerify('RSA-SHA256');verify.update(lines.join('\n'));verify.end();return verify.verify(publicKeyPem,Buffer.from(sig.signature,'base64'))};
  if(!verifyWith(actor.publicKey.publicKeyPem)){
    if(fetched.fromCache){invalidateActor(actorUri);const fresh=await fetchActor(actorUri,{forceRefresh:true});actor=fresh.actor;if(actor.publicKey.id!==sig.keyId||actor.publicKey.owner!==actorUri||!verifyWith(actor.publicKey.publicKeyPem))throw new Error('HTTP Signature ungueltig');}
    else throw new Error('HTTP Signature ungueltig');
  }
  return actor;
}
function signLegacyRequest({method,url,body='',keyId,privateKeyPem}){const u=new URL(url);const date=new Date().toUTCString();const headers={'Host':u.host,'Date':date,'Content-Type':'application/activity+json'};const signed=['(request-target)','host','date'];if(body){headers.Digest='SHA-256='+crypto.createHash('sha256').update(body).digest('base64');signed.push('digest')}
const lines=signed.map(h=>h==='(request-target)'?`(request-target): ${method.toLowerCase()} ${u.pathname}${u.search}`:`${h}: ${headers[Object.keys(headers).find(k=>k.toLowerCase()===h)]}`);const signer=crypto.createSign('RSA-SHA256');signer.update(lines.join('\n'));signer.end();headers.Signature=`keyId="${keyId}",headers="${signed.join(' ')}",signature="${signer.sign(privateKeyPem).toString('base64')}"`;return headers}
async function deliverActivity(db,localUserId,inbox,activity){
  if(!isUserFederationEnabled(db,localUserId))throw new Error('User federation is disabled');
  const policy=evaluatePeer(db,{uri:inbox,direction:'outbound',action:'deliver'});if(!policy.allowed)throw new Error(`Federation policy blocked delivery: ${policy.reason}`);
  await resolvePublicHttps(inbox);
  const key=ensureActorKey(db,localUserId);const body=JSON.stringify(activity);const id=actorId(localUserId);
  const headers=signLegacyRequest({method:'POST',url:inbox,body,keyId:`${id}#main-key`,privateKeyPem:key.private_key_pem});
  const r=await safeHttpsRequest(inbox,{method:'POST',headers,body});
  if(r.status<200||r.status>=300)throw new Error(`Delivery failed (${r.status})`);recordPeerObservation(db,{uri:inbox,direction:'outbound',activityType:activity?.type||''});return r.status;
}

function publicAudience(){return 'https://www.w3.org/ns/activitystreams#Public';}
function stripRemoteHtml(value,max=5000){
  const s=String(value||'');
  return s.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n').trim().slice(0,max);
}
function isPublicObject(obj){
  const vals=[];
  for(const k of ['to','cc']){const v=obj?.[k];if(Array.isArray(v))vals.push(...v);else if(v)vals.push(v)}
  return vals.includes(publicAudience());
}
function federationDecisionForPost(db,postId){
  const p=db.prepare(`SELECT p.id,p.author_id,p.federation_state,c.visibility community_visibility,c.federation_mode FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.id=?`).get(postId);
  if(!p)return {allowed:false,reason:'post_not_found'};
  if(!isUserFederationEnabled(db,p.author_id))return {allowed:false,reason:'author_federation_disabled'};
  const mode=['off','public','selected'].includes(p.federation_mode)?p.federation_mode:'off';
  const state=['inherit','enabled','disabled'].includes(p.federation_state)?p.federation_state:'inherit';
  if(mode==='off')return {allowed:false,reason:'space_federation_off',mode,state,communityVisibility:p.community_visibility};
  if(state==='disabled')return {allowed:false,reason:'post_disabled',mode,state,communityVisibility:p.community_visibility};
  // Access to a Space and publication to the Fediverse are separate concerns.
  // In non-public Spaces, only an explicit per-post opt-in may cross the boundary.
  if(p.community_visibility!=='public'){
    if(mode!=='selected')return {allowed:false,reason:'nonpublic_space_requires_selected_mode',mode,state,communityVisibility:p.community_visibility};
    if(state!=='enabled')return {allowed:false,reason:'nonpublic_post_requires_explicit_opt_in',mode,state,communityVisibility:p.community_visibility};
    return {allowed:true,reason:'explicit_public_federation_from_nonpublic_space',mode,state,communityVisibility:p.community_visibility};
  }
  if(mode==='selected'&&state!=='enabled')return {allowed:false,reason:'post_not_selected',mode,state,communityVisibility:p.community_visibility};
  return {allowed:true,reason:state==='enabled'?'post_enabled':'space_public_default',mode,state,communityVisibility:p.community_visibility};
}
function noteForLocalPost(db,postId){
  const decision=federationDecisionForPost(db,postId);if(!decision.allowed)return null;
  const p=db.prepare(`SELECT p.* FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND COALESCE(u.account_status,'active')='active'`).get(postId);
  const author=actorId(p.author_id), id=`${requirePublicBase()}/ap/objects/posts/${encodeURIComponent(p.id)}`;
  const group=spaceActorId(p.community_id);const obj={'@context':AS,id,type:'Note',attributedTo:author,content:p.body,published:p.created_at,context:id,audience:group,to:[publicAudience()],cc:[`${author}/followers`,`${group}/followers`]};const attachment=attachmentDocumentsForEntity(db,'post',p.id,requirePublicBase());if(attachment.length)obj.attachment=attachment;return obj;
}
function noteForLocalComment(db,commentId){
  const c=db.prepare(`SELECT cm.*,p.community_id,p.id post_id FROM comments cm JOIN posts p ON p.id=cm.post_id JOIN users u ON u.id=cm.author_id WHERE cm.id=? AND COALESCE(u.account_status,'active')='active'`).get(commentId);
  if(!c||!federationDecisionForPost(db,c.post_id).allowed)return null;
  const author=actorId(c.author_id), id=`${requirePublicBase()}/ap/objects/comments/${encodeURIComponent(c.id)}`;
  const parent=`${requirePublicBase()}/ap/objects/posts/${encodeURIComponent(c.post_id)}`,group=spaceActorId(c.community_id);const obj={'@context':AS,id,type:'Note',attributedTo:author,content:c.body,published:c.created_at,inReplyTo:parent,context:parent,audience:group,to:[publicAudience()],cc:[`${author}/followers`,`${group}/followers`]};const attachment=attachmentDocumentsForEntity(db,'comment',c.id,requirePublicBase());if(attachment.length)obj.attachment=attachment;return obj;
}
function isoDateTimeWithZone(value){
  const raw=String(value||'').trim();
  if(!raw||raw.length>80||!/T/.test(raw)||!/(Z|[+-]\d\d:\d\d)$/.test(raw))return '';
  const ms=Date.parse(raw);return Number.isFinite(ms)?raw:'';
}
function eventFederationDecision(db,eventId){
  const e=db.prepare(`SELECT e.*,c.visibility owner_visibility,c.federation_mode FROM events e LEFT JOIN communities c ON c.id=e.owner_space_id WHERE e.id=?`).get(eventId);
  if(!e)return {allowed:false,reason:'event_not_found'};
  if(e.source!=='native')return {allowed:false,reason:'remote_event'};
  const start=isoDateTimeWithZone(e.start_at),end=isoDateTimeWithZone(e.end_at);
  if(!start||!end||Date.parse(end)<Date.parse(start))return {allowed:false,reason:'event_requires_machine_readable_times'};
  const state=['inherit','enabled','disabled'].includes(e.federation_state)?e.federation_state:'inherit';
  if(state==='disabled')return {allowed:false,reason:'event_disabled',state};
  if(e.owner_space_id){
    const mode=['off','public','selected'].includes(e.federation_mode)?e.federation_mode:'off';
    if(mode==='off')return {allowed:false,reason:'owner_space_federation_off',state,mode};
    if(e.visibility!=='public'||e.owner_visibility!=='public'||mode==='selected'){
      if(state!=='enabled')return {allowed:false,reason:'event_requires_explicit_opt_in',state,mode};
    }
    return {allowed:true,reason:state==='enabled'?'explicit_event_opt_in':'owner_space_public_default',state,mode,actorType:'space',actorRef:e.owner_space_id};
  }
  if(e.visibility!=='public'||state!=='enabled')return {allowed:false,reason:'standalone_event_requires_public_explicit_opt_in',state};
  if(!e.created_by||!isUserFederationEnabled(db,e.created_by))return {allowed:false,reason:'creator_federation_disabled',state};
  return {allowed:true,reason:'standalone_event_explicit_opt_in',state,actorType:'user',actorRef:e.created_by};
}
function eventForLocalEvent(db,eventId){
  const decision=eventFederationDecision(db,eventId);if(!decision.allowed)return null;
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(eventId);if(!e)return null;
  const attributedTo=decision.actorType==='space'?spaceActorId(decision.actorRef):actorId(decision.actorRef);
  const id=`${requirePublicBase()}/ap/objects/events/${encodeURIComponent(e.id)}`;
  const places=db.prepare(`SELECT p.name FROM places p JOIN event_places ep ON ep.place_id=p.id WHERE ep.event_id=? ORDER BY p.name LIMIT 1`).all(e.id);
  const locationName=String(e.remote_location_name||places[0]?.name||'').trim();
  const joinMode=e.attendance_policy==='open'?'free':e.attendance_policy==='invite'?'invite':'restricted';
  const context=[AS,{mz:'https://joinmobilizon.org/ns#',sc:'http://schema.org#',joinMode:{'@id':'mz:joinMode','@type':'mz:joinModeType'},maximumAttendeeCapacity:'sc:maximumAttendeeCapacity',location:'sc:location'}];
  const obj={'@context':context,id,type:'Event',name:String(e.name||'').slice(0,160),content:String(e.description||'').slice(0,10000),attributedTo,startTime:isoDateTimeWithZone(e.start_at),endTime:isoDateTimeWithZone(e.end_at),published:e.created_at,url:id,joinMode,to:[publicAudience()]};
  if(locationName)obj.location={type:'Place',name:locationName.slice(0,240)};
  if(e.max_participants)obj.maximumAttendeeCapacity=Math.max(1,Math.min(100000,Number(e.max_participants)||1));
  if(e.owner_space_id)obj.audience=spaceActorId(e.owner_space_id);
  const image=primaryImageForEntity(db,'event',e.id,requirePublicBase(),'cover');if(image)obj.image=image;
  return obj;
}
function createActivityForEvent(eventObj){return {'@context':eventObj['@context']||AS,id:`${eventObj.attributedTo}/activities/${crypto.randomUUID()}`,type:'Create',actor:eventObj.attributedTo,published:new Date().toISOString(),object:eventObj,to:eventObj.to||[publicAudience()]};}
function joinActivityForEvent(localUserId,remoteEventUri,remoteActorUri){const actor=actorId(localUserId);return {'@context':AS,id:`${actor}/activities/join-${crypto.randomUUID()}`,type:'Join',actor,object:remoteEventUri,target:remoteActorUri,to:[remoteActorUri],published:new Date().toISOString()};}
function leaveActivityForEvent(localUserId,remoteEventUri,remoteActorUri,previousJoinUri=''){const actor=actorId(localUserId);return {'@context':AS,id:`${actor}/activities/leave-${crypto.randomUUID()}`,type:'Leave',actor,object:remoteEventUri,target:remoteActorUri,origin:previousJoinUri||undefined,to:[remoteActorUri],published:new Date().toISOString()};}
function attendanceDecisionActivity(localActorUri,remoteActorUri,joinActivity,decision){return {'@context':AS,id:`${localActorUri}/activities/${String(decision).toLowerCase()}-${crypto.randomUUID()}`,type:decision,actor:localActorUri,object:joinActivity,to:[remoteActorUri],published:new Date().toISOString()};}
function updateActivityForEvent(eventObj){return {'@context':eventObj['@context']||AS,id:`${eventObj.attributedTo}/activities/${crypto.randomUUID()}`,type:'Update',actor:eventObj.attributedTo,published:new Date().toISOString(),object:eventObj,to:eventObj.to||[publicAudience()]};}
function deleteActivityForEvent(db,eventId,previousActorRef=null){
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(eventId);if(!e&&!previousActorRef)return null;
  const actor=e?.owner_space_id?spaceActorId(e.owner_space_id):actorId(e?.created_by||previousActorRef);
  const objectId=`${requirePublicBase()}/ap/objects/events/${encodeURIComponent(eventId)}`;
  return {'@context':AS,id:`${actor}/activities/${crypto.randomUUID()}`,type:'Delete',actor,object:{id:objectId,type:'Tombstone'},to:[publicAudience()]};
}
function queueEventFederation(db,eventId,kind='Create'){
  const eventObj=eventForLocalEvent(db,eventId);if(!eventObj)return {queued:0,reason:eventFederationDecision(db,eventId).reason};
  const activity=kind==='Update'?updateActivityForEvent(eventObj):createActivityForEvent(eventObj);
  const e=db.prepare('SELECT owner_space_id,created_by FROM events WHERE id=?').get(eventId);
  const queued=e.owner_space_id?queueActivityForSpaceFollowers(db,e.owner_space_id,activity):queueActivityForFollowers(db,e.created_by,activity);
  return {queued,reason:'ok',activity};
}

function createActivityForNote(note){return {'@context':AS,id:`${note.attributedTo}/activities/${crypto.randomUUID()}`,type:'Create',actor:note.attributedTo,published:new Date().toISOString(),object:note,to:note.to||[publicAudience()],cc:note.cc||[]};}
function updateActivityForNote(note){return {'@context':AS,id:`${note.attributedTo}/activities/${crypto.randomUUID()}`,type:'Update',actor:note.attributedTo,published:new Date().toISOString(),object:note,to:note.to||[publicAudience()],cc:note.cc||[]};}
function deleteActivityForObject(localUserId,objectId){const actor=actorId(localUserId);return {'@context':AS,id:`${actor}/activities/${crypto.randomUUID()}`,type:'Delete',actor,object:{id:objectId,type:'Tombstone'},to:[publicAudience()]};}
function queueActivityForFollowers(db,localUserId,activity){
  if(!isUserFederationEnabled(db,localUserId))return 0;
  const rows=db.prepare(`SELECT remote_actor_uri,remote_inbox_uri FROM federation_followers WHERE local_user_id=? AND remote_inbox_uri<>''`).all(localUserId).filter(row=>evaluatePeer(db,{uri:row.remote_actor_uri||row.remote_inbox_uri,direction:'outbound',action:'deliver'}).allowed);
  const ins=db.prepare(`INSERT INTO federation_delivery_queue(id,local_user_id,remote_actor_uri,inbox_uri,activity_uri,payload_json,status,next_attempt_at) VALUES (?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`);
  const tx=db.transaction(()=>{db.prepare(`INSERT OR IGNORE INTO federation_activities(id,activity_uri,direction,activity_type,actor_uri,local_user_id,payload_json,status) VALUES (?,?,?,?,?,?,?,'queued')`).run('act-'+crypto.randomUUID(),String(activity.id||''),'out',String(activity.type||''),String(activity.actor||actorId(localUserId)),localUserId,JSON.stringify(activity));for(const row of rows)ins.run('delivery-'+crypto.randomUUID(),localUserId,row.remote_actor_uri,row.remote_inbox_uri,String(activity.id||''),JSON.stringify(activity))});tx();
  setImmediate(()=>flushDeliveryQueue(db).catch(e=>console.warn('Federation delivery queue:',e.message)));
  return rows.length;
}
async function flushDeliveryQueue(db,limit=20){
  const rows=db.prepare(`SELECT * FROM federation_delivery_queue WHERE status IN ('pending','retry') AND datetime(next_attempt_at)<=datetime('now') ORDER BY created_at LIMIT ?`).all(limit);
  for(const row of rows){
    try{const activity=JSON.parse(row.payload_json);await deliverActivity(db,row.local_user_id,row.inbox_uri,activity);db.prepare(`UPDATE federation_delivery_queue SET status='sent',last_error='',attempts=attempts+1,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(row.id);}
    catch(e){const attempts=Number(row.attempts||0)+1,status=attempts>=5?'failed':'retry',delay=Math.min(3600,30*Math.pow(2,Math.min(attempts,6)));db.prepare(`UPDATE federation_delivery_queue SET status=?,last_error=?,attempts=?,next_attempt_at=datetime('now', ?),updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status,String(e.message||'delivery failed').slice(0,500),attempts,`+${delay} seconds`,row.id)}
  }
  return rows.length;
}


function announceActivityForGroup(db,spaceId,note){const group=spaceActorId(spaceId);return {'@context':AS,id:`${group}/activities/${crypto.randomUUID()}`,type:'Announce',actor:group,published:new Date().toISOString(),object:note,audience:group,to:[publicAudience()],cc:[`${group}/followers`]};}
async function deliverSpaceActivity(db,spaceId,inbox,activity){const policy=evaluatePeer(db,{uri:inbox,spaceId,direction:'outbound',action:'deliver'});if(!policy.allowed)throw new Error(`Federation policy blocked delivery: ${policy.reason}`);await resolvePublicHttps(inbox);const key=ensureSpaceActorKey(db,spaceId),body=JSON.stringify(activity),id=spaceActorId(spaceId);const headers=signLegacyRequest({method:'POST',url:inbox,body,keyId:`${id}#main-key`,privateKeyPem:key.private_key_pem});const r=await safeHttpsRequest(inbox,{method:'POST',headers,body});if(r.status<200||r.status>=300)throw new Error(`Space delivery failed (${r.status})`);recordPeerObservation(db,{uri:inbox,spaceId,direction:'outbound',activityType:activity?.type||''});return r.status;}
function queueActivityForSpaceFollowers(db,spaceId,activity){const rows=db.prepare(`SELECT remote_actor_uri,remote_inbox_uri FROM federation_space_followers WHERE local_space_id=? AND remote_inbox_uri<>''`).all(spaceId).filter(row=>evaluatePeer(db,{uri:row.remote_actor_uri||row.remote_inbox_uri,spaceId,direction:'outbound',action:'deliver'}).allowed);const ins=db.prepare(`INSERT INTO federation_space_delivery_queue(id,local_space_id,remote_actor_uri,inbox_uri,activity_uri,payload_json,status,next_attempt_at) VALUES (?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`);const tx=db.transaction(()=>{db.prepare(`INSERT OR IGNORE INTO federation_activities(id,activity_uri,direction,activity_type,actor_uri,local_user_id,payload_json,status) VALUES (?,?,?,?,?,?,?,'queued')`).run('act-'+crypto.randomUUID(),String(activity.id||''),'out',String(activity.type||''),String(activity.actor||spaceActorId(spaceId)),null,JSON.stringify(activity));for(const row of rows)ins.run('space-delivery-'+crypto.randomUUID(),spaceId,row.remote_actor_uri,row.remote_inbox_uri,String(activity.id||''),JSON.stringify(activity))});tx();setImmediate(()=>flushSpaceDeliveryQueue(db).catch(e=>console.warn('Space federation delivery queue:',e.message)));return rows.length;}
async function flushSpaceDeliveryQueue(db,limit=20){const rows=db.prepare(`SELECT * FROM federation_space_delivery_queue WHERE status IN ('pending','retry') AND datetime(next_attempt_at)<=datetime('now') ORDER BY created_at LIMIT ?`).all(limit);for(const row of rows){try{const activity=JSON.parse(row.payload_json);await deliverSpaceActivity(db,row.local_space_id,row.inbox_uri,activity);db.prepare(`UPDATE federation_space_delivery_queue SET status='sent',last_error='',attempts=attempts+1,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(row.id)}catch(e){const attempts=Number(row.attempts||0)+1,status=attempts>=5?'failed':'retry',delay=Math.min(3600,30*Math.pow(2,Math.min(attempts,6)));db.prepare(`UPDATE federation_space_delivery_queue SET status=?,last_error=?,attempts=?,next_attempt_at=datetime('now', ?),updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(status,String(e.message||'delivery failed').slice(0,500),attempts,`+${delay} seconds`,row.id)}}return rows.length;}

module.exports={AS,AP_ACCEPT,remoteFetchPolicy,baseUrl,requirePublicBase,actorId,spaceActorId,fetchActor,normalizeHandle,defaultHandleForUser,userFederationSettings,isUserFederationEnabled,ensureFederationHandle,userIdForHandle,defaultHandleForSpace,ensureSpaceFederationHandle,spaceIdForHandle,installProtocolSchema,ensureActorKey,ensureSpaceActorKey,rotateActorKey,rotateSpaceActorKey,actorDocument,spaceActorDocument,orderedCollection,verifyLegacySignature,deliverActivity,deliverSpaceActivity,resolvePublicHttps,safeHttpsRequest,isForbiddenIp,publicAudience,stripRemoteHtml,isPublicObject,federationDecisionForPost,noteForLocalPost,noteForLocalComment,eventFederationDecision,eventForLocalEvent,createActivityForEvent,joinActivityForEvent,leaveActivityForEvent,attendanceDecisionActivity,updateActivityForEvent,deleteActivityForEvent,queueEventFederation,isoDateTimeWithZone,createActivityForNote,updateActivityForNote,deleteActivityForObject,announceActivityForGroup,queueActivityForFollowers,queueActivityForSpaceFollowers,flushDeliveryQueue,flushSpaceDeliveryQueue};
