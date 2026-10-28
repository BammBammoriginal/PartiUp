const express = require('express');
const path = require('path');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const pkg = require('../package.json');
const {architectureSnapshot} = require('./core/architecture');
const {modelSnapshot,describeEntity,ENTITY_MAPPINGS} = require('./federation/model');
const {getFederationEntity,upsertRemoteObject,tombstoneRemoteObject,getRemoteObject,linkRemoteObjectToSpace,remoteObjectLinkedToSpace} = require('./federation/store');
const {AS,remoteFetchPolicy,baseUrl,actorId,spaceActorId,actorDocument,spaceActorDocument,orderedCollection,verifyLegacySignature,deliverActivity,deliverSpaceActivity,ensureActorKey,ensureFederationHandle,ensureSpaceFederationHandle,userFederationSettings,isUserFederationEnabled,userIdForHandle,spaceIdForHandle,isPublicObject,stripRemoteHtml,noteForLocalPost,noteForLocalComment,createActivityForNote,updateActivityForNote,deleteActivityForObject,announceActivityForGroup,queueActivityForFollowers,queueActivityForSpaceFollowers,flushDeliveryQueue,flushSpaceDeliveryQueue,federationDecisionForPost,eventFederationDecision,eventForLocalEvent,createActivityForEvent,joinActivityForEvent,leaveActivityForEvent,attendanceDecisionActivity,updateActivityForEvent,deleteActivityForEvent,queueEventFederation,isoDateTimeWithZone,fetchActor,safeHttpsRequest} = require('./federation/protocol');
const multer = require('multer');
const sharp = require('sharp');
// SVG is not an accepted upload format; block content-sniffed SVG before parsing.
sharp.block({operation:['VipsForeignLoadSvg']});
const {db, canViewScope, bootstrap, ensureTopic, communityDetail, eventDetail, projectDetail, participationDetail, getUserSafe, userProfile, listPeople, verifyPassword, hashPassword, followsForUser,friendshipPair,friendshipRelation,friendshipNetwork,firstSharedCommunity,profileActivityTarget,profileActivityForUser,prefAllows,stricterVisibility,ensureObjectModules,canRequestEventAttendance,canViewEventRow,canViewProjectRow,canViewParticipation,participationCanInteract,canRequestParticipationAccess,listParticipation,listProjects,listEvents} = require('./db');
const {buildPrivacyExport,deleteAccountData,processPrivacyFileDeletionQueue,queueFile} = require('./privacy');
const {federationInboxIpLimit,enforceActorHostLimit,isRecentReplay,rememberReplay,publicConfig:federationSecurityConfig} = require('./federation/security');
const federationKeyStore=require('./federation/key-store');
const {evaluatePeer,setSpacePeerPolicy,recordPeerObservation,listSpacePeers,governanceSnapshot}=require('./federation/governance');
const {catalog:extensionCatalog,extensionsForSpace,setSpaceExtension}=require('./extensions/registry');
const {catalog:connectorCatalog,frameworkSnapshot:connectorFrameworkSnapshot}=require('./connectors/registry');
const {catalog:integrationCatalog,frameworkSnapshot:integrationFrameworkSnapshot}=require('./integrations/registry');
const {replaceRemoteMedia,clearRemoteMedia,remoteMediaForObject,mediaFederationSnapshot,IMAGE_MIME}=require('./federation/media');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.BIND_HOST || '127.0.0.1';
const IS_PROD = process.env.NODE_ENV === 'production';
const PUBLIC_ORIGIN = String(process.env.BUP_PUBLIC_ORIGIN || '').trim();
const DEMO_SEED_ENABLED = !IS_PROD || process.env.BUP_SEED_DEMO === '1';
function envBoundedInt(name,fallback,min,max){const n=Number.parseInt(process.env[name]||'',10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
const JSON_BODY_MAX_BYTES=envBoundedInt('PARTIUP_JSON_BODY_MAX_BYTES',64*1024,16*1024,256*1024);

// Security-by-default: local-only unless start-network.bat explicitly opts into LAN exposure.
app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin');
  if(IS_PROD) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if(req.path.startsWith('/api/')) res.setHeader('Cache-Control','no-store');
  next();
});
app.use(express.json({limit:`${JSON_BODY_MAX_BYTES}b`,verify:(req,res,buf)=>{req.rawBody=Buffer.from(buf)}}));
app.use(express.urlencoded({extended:false,limit:'64kb'}));
app.use(express.static(path.join(__dirname,'..','public'),{maxAge:IS_PROD?'1h':0,etag:true}));
const uploadDir=path.join(__dirname,'..','uploads','public','media');fs.mkdirSync(uploadDir,{recursive:true});
const canReadMedia=require('./core/media-access').createMediaAccess({db,canViewScope,userProfile,federationDecisionForPost,noteForLocalComment,eventFederationDecision});
app.get('/uploads/public/media/:filename',(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const filename=req.params.filename;
  if(path.basename(filename)!==filename)return res.status(404).end();
  const url=`/uploads/public/media/${filename}`;
  const media=db.prepare(`SELECT * FROM media WHERE EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(variants_json) THEN variants_json ELSE '{}' END) WHERE value=?) LIMIT 1`).get(url);
  if(!media||!canReadMedia(media,currentUserId(req)))return res.status(404).end();
  let variants;try{variants=JSON.parse(media.variants_json)}catch{return res.status(404).end()}
  if(!Object.values(variants).includes(url)||!['image/webp','image/jpeg','image/png','image/gif','image/avif'].includes(media.mime_type))return res.status(404).end();
  res.type(media.mime_type).sendFile(path.join(uploadDir,filename),error=>{if(error&&!res.headersSent)res.status(404).end()});
});
app.use('/uploads/public',(req,res)=>res.status(404).end());
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024,files:1,fields:8},fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype))});

const privateUploadDir=path.join(__dirname,'..','data','private-media');fs.mkdirSync(privateUploadDir,{recursive:true});
// Crash-safe retry for file deletions committed by an earlier account-deletion transaction.
try{processPrivacyFileDeletionQueue(db,{privateUploadDir,publicUploadDir:uploadDir})}catch(e){console.warn('Privacy file deletion recovery:',e.message)}
const privateImageUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:4},fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype))});

function federationActivityId(activity){
  const id=String(activity?.id||'').trim();
  if(!id||id.length>2048)throw Object.assign(new Error('invalid_activity_id'),{code:'FEDERATION_INVALID'});
  let u;try{u=new URL(id)}catch{throw Object.assign(new Error('invalid_activity_id'),{code:'FEDERATION_INVALID'})}
  if(u.protocol!=='https:'||u.username||u.password)throw Object.assign(new Error('invalid_activity_id'),{code:'FEDERATION_INVALID'});
  return id;
}
function federationFailure(res,e){
  if(e?.code==='FEDERATION_RATE_LIMIT'){res.setHeader('Retry-After','60');return res.status(429).json({error:'federation_rate_limited'})}
  if(e?.code==='FEDERATION_CAPACITY')return res.status(503).json({error:'federation_temporarily_unavailable'})
  if(e?.code==='FEDERATION_POLICY')return res.status(403).json({error:'federation_peer_not_allowed'})
  return res.status(401).json({error:'invalid_federation_request'});
}


function cookies(req){
  const out={};
  for(const raw of String(req.headers.cookie||'').split(';')){
    const v=raw.trim(); if(!v)continue; const i=v.indexOf('='); if(i<1)continue;
    try{out[decodeURIComponent(v.slice(0,i))]=decodeURIComponent(v.slice(i+1))}catch{}
  }
  return out;
}

function cookieFlags(httpOnly=true){return `Path=/; ${httpOnly?'HttpOnly; ':''}SameSite=Strict; ${IS_PROD?'Secure; ':''}`}
function sessionKey(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex')}
function csrfFor(req,res){
  let token=cookies(req).bup_csrf;
  if(!token){token=crypto.randomBytes(24).toString('hex');res.append('Set-Cookie',`bup_csrf=${token}; ${cookieFlags(false)}Max-Age=86400`)}
  return token;
}
function sameOrigin(req){
  const fetchSite=String(req.headers['sec-fetch-site']||'');
  if(fetchSite && !['same-origin','same-site','none'].includes(fetchSite)) return false;
  const origin=req.headers.origin; if(!origin)return true;
  try{
    const got=new URL(origin);
    if(IS_PROD&&PUBLIC_ORIGIN)return got.origin===new URL(PUBLIC_ORIGIN).origin;
    return got.host===req.headers.host;
  }catch{return false}
}
function csrfGuard(req,res,next){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  if(!sameOrigin(req))return res.status(403).json({error:'Anfrage von fremder Herkunft blockiert.'});
  const expected=cookies(req).bup_csrf, supplied=req.headers['x-bup-csrf'];
  if(!expected||!supplied||expected!==supplied)return res.status(403).json({error:'Sicherheits-Token fehlt oder ist ungültig.'});
  next();
}
const {createRateLimiter}=require('./core/rate-limit');
function clientIp(req){
  const remote=req.socket.remoteAddress||'?';
  if(process.env.BUP_TRUST_LOCAL_PROXY==='1' && (remote==='127.0.0.1'||remote==='::1'||remote==='::ffff:127.0.0.1')){
    const cf=String(req.headers['cf-connecting-ip']||'').trim();
    if(net.isIP(cf))return cf;
    const first=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
    if(net.isIP(first))return first;
  }
  return remote;
}
function rateLimit(name,limit,windowMs){return createRateLimiter({name,limit,windowMs,clientKey:clientIp})}
const readLimit=rateLimit('read',1200,60_000), writeLimit=rateLimit('write',180,60_000), loginLimit=rateLimit('login',10,15*60_000), registrationLimit=rateLimit('registration',8,15*60_000), deleteAccountLimit=rateLimit('delete-account',5,15*60_000), federationMediaLimit=rateLimit('federation-media',120,60_000);
function text(value,max=5000){return String(value??'').trim().slice(0,max)}
const SAFE_INPUT_ICONS=new Set(['✦','◆','◈','☑','♻️','🇩🇪','🌳','🏙️','🏛️','📋','📍','🗳️','🚲']);
function validatedIcon(value,fallback){if(value===undefined||value===null||value==='')return fallback;const v=String(value).trim();return SAFE_INPUT_ICONS.has(v)?v:null}
function validatedUserText(value,max,{required=false}={}){if(value===undefined||value===null)return required?null:'';if(typeof value!=='string')return null;const v=value.trim();if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(v))return null;if(required&&!v)return null;return v.slice(0,max)}
function safeArray(value,max=50){return Array.isArray(value)?value.slice(0,max):[]}
function currentUserId(req){
  const token=cookies(req).bup_session; if(!token)return null;
  const s=db.prepare('SELECT user_id FROM sessions WHERE token=? AND datetime(expires_at)>datetime(\'now\')').get(sessionKey(token));
  return s?.user_id||null;
}
function requireUser(req,res,next){const id=currentUserId(req);if(!id)return res.status(401).json({error:'Bitte zuerst anmelden.'});req.userId=id;next();}
function requireTrust(min){return (req,res,next)=>{const id=req.userId||currentUserId(req);if(!id)return res.status(401).json({error:'Bitte zuerst anmelden.'});if(userTrust(id)<min)return res.status(403).json({error:`Für diese Funktion ist mindestens Verifizierungsstufe ${min} erforderlich.`});req.userId=id;next();}}
function mustBeMember(userId, communityId){return db.prepare('SELECT role FROM memberships WHERE user_id=? AND community_id=?').get(userId,communityId);}
function cleanTopics(topics){return [...new Set(safeArray(topics,30).map(x=>validatedUserText(x,80)).filter(x=>typeof x==='string'&&x.length>0))];}
function cleanPlaces(places){return [...new Set(safeArray(places,30).map(x=>text(x,80)).filter(Boolean))];}


function notify(userId,type,title,body='',entityType='',entityId=''){if(!userId)return;db.prepare('INSERT INTO notifications(id,user_id,type,title,body,entity_type,entity_id) VALUES (?,?,?,?,?,?,?)').run('n-'+crypto.randomUUID(),userId,type,title,body,entityType,entityId)}
function linkMedia(mediaId,entityType,entityId,role){db.prepare('DELETE FROM media_links WHERE entity_type=? AND entity_id=? AND role=?').run(entityType,entityId,role);db.prepare('INSERT INTO media_links(media_id,entity_type,entity_id,role) VALUES (?,?,?,?)').run(mediaId,entityType,entityId,role)}
async function persistImage(file,userId){
  const id='m-'+crypto.randomUUID();const img=sharp(file.buffer,{failOn:'warning',limitInputPixels:40_000_000}).rotate();const meta=await img.metadata();if(!meta.width||!meta.height)return Promise.reject(new Error('Ungültiges Bild'));if(meta.width*meta.height>40_000_000)return Promise.reject(new Error('Bildauflösung zu groß'));
  const variants={};for(const [name,width,quality] of [['thumb',256,78],['medium',720,80],['large',1600,82]]){const f=`${id}-${name}.webp`;await img.clone().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality,effort:4}).toFile(path.join(uploadDir,f));variants[name]=`/uploads/public/media/${f}`}
  const largePath=path.join(uploadDir,`${id}-large.webp`);const size=fs.statSync(largePath).size;
  db.prepare('INSERT INTO media(id,owner_user_id,kind,mime_type,original_name,size_bytes,width,height,storage_key,variants_json) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,userId,'image','image/webp',text(file.originalname,180),size,meta.width||null,meta.height||null,`${id}-large.webp`,JSON.stringify(variants));return {id,variants,size_bytes:size,width:meta.width,height:meta.height};
}
const ROLE_RANK={guest:0,member:1,moderator:2,admin:3,owner:4};
const permissionService=require('./core/permissions').createPermissionService(db);
const {PERMISSION_GROUPS,ALL_PERMISSIONS,ROLE_DEFAULTS,scopeRow,roleFor}=permissionService;
function hasPermission(userId,type,id,permission){return permissionService.hasPermission(userId,type,id,permission)&&canViewScope(userId,type,id)}
function permissionSnapshot(userId,type,id){const row=scopeRow(type,id);if(!row)return null;const role=roleFor(userId,type,id);const overrides=db.prepare('SELECT role,permission,effect FROM permission_overrides WHERE scope_type=? AND scope_id=? ORDER BY role,permission').all(type,id);const users=new Map();if(type==='community'){for(const x of db.prepare(`SELECT u.id,u.name,u.avatar,u.trust_level,m.role legacy_role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.community_id=? ORDER BY u.name`).all(id))users.set(x.id,x)}else{if(row.owner_space_id){for(const x of db.prepare(`SELECT u.id,u.name,u.avatar,u.trust_level,m.role legacy_role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.community_id=? ORDER BY u.name`).all(row.owner_space_id))users.set(x.id,x)}const creator=getUserSafe(row.created_by);if(creator)users.set(creator.id,{...creator,legacy_role:null})}for(const u of db.prepare('SELECT u.id,u.name,u.avatar,u.trust_level FROM role_assignments r JOIN users u ON u.id=r.user_id WHERE r.scope_type=? AND r.scope_id=?').all(type,id))users.set(u.id,u);const principals=[...users.values()].filter(u=>u.id===userId||hasPermission(userId,type,id,'space.manage_roles')||hasPermission(userId,type,id,'space.manage_members')).map(u=>({id:u.id,name:u.name,avatar:u.avatar,trust_level:u.trust_level,role:roleFor(u.id,type,id)}));return {scope_type:type,scope_id:id,my_role:role,my_permissions:ALL_PERMISSIONS.filter(p=>hasPermission(userId,type,id,p)),can_manage_roles:hasPermission(userId,type,id,'space.manage_roles'),can_configure:hasPermission(userId,type,id,'space.configure_modules'),roles:['owner','admin','moderator','member','guest'],permission_groups:PERMISSION_GROUPS,defaults:Object.fromEntries(Object.entries(ROLE_DEFAULTS).map(([r,set])=>[r,ALL_PERMISSIONS.filter(x=>set.has(x))])),overrides,principals}}
function canManageCommunity(userId,id){return hasPermission(userId,'community',id,'space.edit_profile')}

function userTrust(userId){return Number(db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0)}
function communityAccessDecision(userId,c){
  if(!c)return {ok:false,error:'Community nicht gefunden.'};
  if(mustBeMember(userId,c.id))return {ok:true,status:'member'};
  if(c.join_policy==='open')return {ok:true,status:'join'};
  if(c.join_policy==='trust')return userTrust(userId)>=Number(c.min_trust_level||1)?{ok:true,status:'join'}:{ok:false,error:`Mindestens Verifizierungsstufe ${c.min_trust_level} erforderlich.`};
  if(c.join_policy==='invite')return db.prepare('SELECT 1 FROM community_invites WHERE community_id=? AND user_id=?').get(c.id,userId)?{ok:true,status:'join'}:{ok:false,error:'Beitritt nur per Einladung.'};
  return {ok:true,status:'request'};
}

function propagationScope(value,ownerSpaceId){if(['own','parent','root'].includes(value))return value;const parent=ownerSpaceId?db.prepare('SELECT parent_id FROM communities WHERE id=?').get(ownerSpaceId)?.parent_id:null;return parent?'parent':'own';}
function validateOwnedSpace(userId,spaceId){if(!spaceId)return null;const c=db.prepare('SELECT id FROM communities WHERE id=?').get(spaceId);if(!c)return {error:'Space nicht gefunden.'};if(!hasPermission(userId,'community',spaceId,'content.create'))return {error:'Keine Berechtigung, Inhalte für diesen Space anzulegen.'};return {id:spaceId};}

function sharesCommunity(a,b){return !!db.prepare(`SELECT 1 FROM memberships x JOIN memberships y ON y.community_id=x.community_id WHERE x.user_id=? AND y.user_id=? LIMIT 1`).get(a,b)}


function isBlocked(a,b){return !!db.prepare('SELECT 1 FROM user_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1').get(a,b,b,a)}
function prefFor(userId){db.prepare('INSERT OR IGNORE INTO user_preferences(user_id) VALUES (?)').run(userId);return db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(userId)}
function canDM(fromId,toId){if(!toId||fromId===toId||!db.prepare("SELECT 1 FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(toId))return {ok:false,error:'Ungültiger Empfänger.'};if(isBlocked(fromId,toId))return {ok:false,error:'Direktnachricht aufgrund einer Blockierung nicht möglich.'};const p=prefFor(toId);if(p.dm_permission==='nobody')return {ok:false,error:'Diese Person nimmt keine Direktnachrichten an.'};if(p.dm_permission==='members'&&!sharesCommunity(fromId,toId)&&friendshipRelation(fromId,toId).status!=='friends')return {ok:false,error:'Direktnachrichten sind nur für Freunde oder Menschen aus gemeinsamen Communities erlaubt.'};return {ok:true}}
function canGroupInvite(fromId,toId){if(!db.prepare("SELECT 1 FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(toId))return false;if(isBlocked(fromId,toId))return false;const p=prefFor(toId);if(p.group_invites==='nobody')return false;if(p.group_invites==='members'&&!sharesCommunity(fromId,toId)&&friendshipRelation(fromId,toId).status!=='friends')return false;return true}
function messageRecipients(userId){if(!userId)return [];return db.prepare("SELECT id,name,avatar,trust_level FROM users WHERE id<>? AND COALESCE(account_status,'active')='active' ORDER BY name").all(userId).filter(u=>{const contextVisible=!!userProfile(u.id,userId)||sharesCommunity(userId,u.id);return contextVisible&&(canDM(userId,u.id).ok||canGroupInvite(userId,u.id))}).map(u=>({...u,direct_allowed:canDM(userId,u.id).ok,group_allowed:canGroupInvite(userId,u.id)}))}
function conversationMember(userId,id){return db.prepare('SELECT * FROM conversation_members WHERE conversation_id=? AND user_id=?').get(id,userId)}
function activeConversation(id){const c=db.prepare('SELECT * FROM conversations WHERE id=?').get(id);if(!c)return null;if(c.expires_at&&Date.parse(c.expires_at)<=Date.now())return null;return c}
function conversationSummary(c,userId){const members=db.prepare(`SELECT u.id,u.name,u.avatar,u.trust_level,cm.role FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=? ORDER BY u.name`).all(c.id);const last=db.prepare(`SELECT m.id,m.body,m.created_at,m.deleted_at,u.name sender_name,(SELECT COUNT(*) FROM message_media mm WHERE mm.message_id=m.id) media_count FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ORDER BY datetime(m.created_at) DESC,m.rowid DESC LIMIT 1`).get(c.id);const mine=conversationMember(userId,c.id);const unread=db.prepare(`SELECT COUNT(*) n FROM messages WHERE conversation_id=? AND sender_id<>? AND deleted_at IS NULL AND datetime(created_at)>datetime(COALESCE(?, '1970-01-01'))`).get(c.id,userId,mine?.last_read_at).n;return {...c,members,last_message:last||null,unread:Number(unread||0)}}
function messageView(m,userId){const deleted=!!m.deleted_at;if(deleted)return {...m,body:'',deleted:true,can_delete:false,reactions:[],media:[]};const reactions=db.prepare('SELECT emoji,COUNT(*) count,MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END) mine FROM message_reactions WHERE message_id=? GROUP BY emoji ORDER BY emoji').all(userId,m.id);const media=db.prepare('SELECT pm.id,pm.mime_type,pm.width,pm.height,pm.size_bytes FROM message_media mm JOIN private_media pm ON pm.id=mm.media_id WHERE mm.message_id=?').all(m.id).map(x=>({...x,url:`/api/private-media/${x.id}`}));return {...m,deleted:false,can_delete:m.sender_id===userId,reactions,media}}
async function persistPrivateImage(file,userId){const id='pm-'+crypto.randomUUID();const storageKey=`${id}.webp`;const target=path.join(privateUploadDir,storageKey);const img=sharp(file.buffer,{failOn:'warning',limitInputPixels:30_000_000}).rotate();const meta=await img.metadata();if(!meta.width||!meta.height)throw new Error('Ungültiges Bild');if(meta.width*meta.height>30_000_000)throw new Error('Bildauflösung zu groß');await img.resize({width:1440,height:1440,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:4}).toFile(target);const size=fs.statSync(target).size;db.prepare('INSERT INTO private_media(id,owner_user_id,kind,mime_type,original_name,size_bytes,width,height,storage_key) VALUES (?,?,?,?,?,?,?,?,?)').run(id,userId,'image','image/webp',text(file.originalname,180),size,meta.width,meta.height,storageKey);return {id,mime_type:'image/webp',width:meta.width,height:meta.height,size_bytes:size,url:`/api/private-media/${id}`}}

function productionStartupCheck(){
  if(!IS_PROD)return;
  if(!PUBLIC_ORIGIN)throw new Error('Production-Start abgebrochen: BUP_PUBLIC_ORIGIN muss gesetzt sein.');
  const origin=new URL(PUBLIC_ORIGIN);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Production requires a plain HTTPS BUP_PUBLIC_ORIGIN.');
  if(process.env.BUP_ALLOW_SQLITE_PRODUCTION!=='1')throw new Error('Production-Start mit SQLite blockiert. Für einen bewussten Test BUP_ALLOW_SQLITE_PRODUCTION=1 setzen; für echten Betrieb PostgreSQL/Produktionsmigration verwenden.');
  const demo=db.prepare("SELECT id FROM users WHERE lower(email) IN ('max@bottomupparti.local','anna@bottomupparti.local','lisa@bottomupparti.local') LIMIT 1").get();
  if(demo)throw new Error('Production-Start abgebrochen: Demo-Accounts in der Datenbank gefunden.');
}
productionStartupCheck();
try{db.prepare("DELETE FROM sessions WHERE datetime(expires_at)<=datetime('now')").run()}catch{}

function spaceInboundFederationMode(space){
  return ['off','replies','threads'].includes(space?.federation_inbound_mode)?space.federation_inbound_mode:'off';
}
function activityAddresses(activityObject,target){
  const vals=[];for(const key of ['to','cc','audience']){const v=activityObject?.[key];if(Array.isArray(v))vals.push(...v);else if(v)vals.push(v)}
  return vals.includes(target);
}

// PartiUp P0.3 – minimal ActivityPub federation vertical slice.
app.get('/.well-known/webfinger',(req,res)=>{
  try{
    const base=baseUrl(); if(!base)return res.status(404).json({error:'federation_not_configured'});
    const host=new URL(base).host.toLowerCase(); const resource=String(req.query.resource||'');
    const m=resource.match(/^acct:([^@]+)@(.+)$/i); if(!m||m[2].toLowerCase()!==host)return res.status(404).json({error:'not_found'});
    const userId=userIdForHandle(db,m[1]);
    if(userId){const actor=actorDocument(db,userId);if(!actor)return res.status(404).json({error:'not_found'});const handle=actor.preferredUsername,href=actor.id;return res.type('application/jrd+json').json({subject:`acct:${handle}@${host}`,aliases:[href],links:[{rel:'self',type:'application/activity+json',href}]});}
    const spaceId=spaceIdForHandle(db,m[1]);
    if(spaceId){const actor=spaceActorDocument(db,spaceId);if(!actor)return res.status(404).json({error:'not_found'});const handle=ensureSpaceFederationHandle(db,spaceId),href=spaceActorId(spaceId);return res.type('application/jrd+json').json({subject:`acct:${handle}@${host}`,aliases:[href],links:[{rel:'self',type:'application/activity+json',href}]});}
    return res.status(404).json({error:'not_found'});
  }catch(e){res.status(503).json({error:'federation_unavailable'});}
});
app.get('/ap/actors/users/:id',(req,res)=>{
  try{const actor=actorDocument(db,req.params.id);if(!actor)return res.status(404).end();res.type('application/activity+json').json(actor)}catch(e){res.status(503).json({error:'federation_not_configured'})}
});
app.get('/ap/actors/users/:id/outbox',(req,res)=>{
  try{const actor=actorDocument(db,req.params.id);if(!actor)return res.status(404).end();const id=actor.id;const notes=[...db.prepare('SELECT id FROM posts WHERE author_id=? ORDER BY datetime(created_at) DESC LIMIT 20').all(req.params.id).map(p=>noteForLocalPost(db,p.id)),...db.prepare('SELECT id FROM comments WHERE author_id=? ORDER BY datetime(created_at) DESC LIMIT 20').all(req.params.id).map(c=>noteForLocalComment(db,c.id))].filter(Boolean).sort((a,b)=>String(b.published).localeCompare(String(a.published))).slice(0,20);const items=notes.map(note=>({...createActivityForNote(note),id:`${id}/activities/create-${encodeURIComponent(note.id.split('/').pop())}`,published:note.published}));res.type('application/activity+json').json(orderedCollection(`${id}/outbox`,items.length,items))}catch(e){res.status(503).json({error:'federation_not_configured'})}
});
app.get('/ap/actors/users/:id/followers',(req,res)=>{try{const actor=actorDocument(db,req.params.id);if(!actor)return res.status(404).end();res.type('application/activity+json').json(orderedCollection(`${actor.id}/followers`,0,[]))}catch(e){res.status(503).json({error:'federation_not_configured'})}});
app.get('/ap/actors/users/:id/following',(req,res)=>{try{const actor=actorDocument(db,req.params.id);if(!actor)return res.status(404).end();res.type('application/activity+json').json(orderedCollection(`${actor.id}/following`,0,[]))}catch(e){res.status(503).json({error:'federation_not_configured'})}});

app.get('/ap/actors/spaces/:id',(req,res)=>{
  try{const actor=spaceActorDocument(db,req.params.id);if(!actor)return res.status(404).end();res.type('application/activity+json').json(actor)}catch(e){res.status(503).json({error:'federation_not_configured'})}
});
app.get('/ap/actors/spaces/:id/outbox',(req,res)=>{
  try{const group=spaceActorDocument(db,req.params.id);if(!group)return res.status(404).end();const objects=[...db.prepare('SELECT id FROM posts WHERE community_id=? ORDER BY datetime(created_at) DESC LIMIT 20').all(req.params.id).map(p=>noteForLocalPost(db,p.id)),...db.prepare(`SELECT cm.id FROM comments cm JOIN posts p ON p.id=cm.post_id WHERE p.community_id=? ORDER BY datetime(cm.created_at) DESC LIMIT 20`).all(req.params.id).map(c=>noteForLocalComment(db,c.id)),...db.prepare(`SELECT id FROM events WHERE owner_space_id=? AND source='native' ORDER BY datetime(created_at) DESC LIMIT 20`).all(req.params.id).map(e=>eventForLocalEvent(db,e.id))].filter(Boolean).sort((a,b)=>String(b.published||b.startTime||'').localeCompare(String(a.published||a.startTime||''))).slice(0,30);const items=objects.map(obj=>{const a=announceActivityForGroup(db,req.params.id,obj);a.id=`${group.id}/activities/announce-${encodeURIComponent(obj.id.split('/').pop())}`;a.published=obj.published||obj.startTime;return a});res.type('application/activity+json').json(orderedCollection(`${group.id}/outbox`,items.length,items))}catch(e){res.status(503).json({error:'federation_not_configured'})}
});
app.get('/ap/actors/spaces/:id/followers',(req,res)=>{try{const group=spaceActorDocument(db,req.params.id);if(!group)return res.status(404).end();const rows=db.prepare('SELECT remote_actor_uri FROM federation_space_followers WHERE local_space_id=?').all(req.params.id);res.type('application/activity+json').json(orderedCollection(`${group.id}/followers`,rows.length,[]))}catch(e){res.status(503).json({error:'federation_not_configured'})}});
app.get('/ap/actors/spaces/:id/following',(req,res)=>{try{const group=spaceActorDocument(db,req.params.id);if(!group)return res.status(404).end();res.type('application/activity+json').json(orderedCollection(`${group.id}/following`,0,[]))}catch(e){res.status(503).json({error:'federation_not_configured'})}});
app.post('/ap/actors/spaces/:id/inbox',federationInboxIpLimit,async(req,res)=>{
  const activity=req.body||{};try{
    const actId=federationActivityId(activity);
    const space=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);
    const group=spaceActorDocument(db,req.params.id);if(!space||!group)return res.status(404).end();
    const remote=await verifyLegacySignature(req,activity);enforceActorHostLimit({actor:remote.id});const governanceAction=['Delete','Undo'].includes(activity.type)?'cleanup':activity.type==='Follow'?'follow':'write';const governance=evaluatePeer(db,{uri:remote.id,spaceId:req.params.id,direction:'inbound',action:governanceAction});if(!governance.allowed)throw Object.assign(new Error(governance.reason),{code:'FEDERATION_POLICY'});if(isRecentReplay(remote.id,actId)||db.prepare('SELECT 1 FROM federation_activities WHERE activity_uri=?').get(actId))return res.status(202).end();recordPeerObservation(db,{uri:remote.id,spaceId:req.params.id,direction:'inbound',activityType:activity.type});
    let activityStatus='accepted';
    if(activity.type==='Follow'&&activity.object===group.id){db.prepare('INSERT OR REPLACE INTO federation_space_followers(local_space_id,remote_actor_uri,remote_inbox_uri) VALUES (?,?,?)').run(req.params.id,remote.id,remote.inbox||remote.endpoints?.sharedInbox||'');const accept={'@context':AS,id:`${group.id}/activities/${crypto.randomUUID()}`,type:'Accept',actor:group.id,object:activity,to:[remote.id]};const inbox=remote.inbox||remote.endpoints?.sharedInbox;if(inbox)await deliverSpaceActivity(db,req.params.id,inbox,accept);}
    else if(activity.type==='Undo'&&activity.object?.type==='Follow'){const actor=typeof activity.actor==='string'?activity.actor:activity.actor?.id;db.prepare('DELETE FROM federation_space_followers WHERE local_space_id=? AND remote_actor_uri=?').run(req.params.id,actor);}
    else if(['Join','Leave'].includes(activity.type)){const localEventId=localEventIdFromActivityObject(activity.object);const result=localEventId?await handleRemoteEventJoinLeave({activity,remote,localEventId,receiverType:'space',receiverId:req.params.id}):{accepted:false};if(!result.accepted)activityStatus='deferred';}
    else if(activity.type==='Create'){
      const mode=spaceInboundFederationMode(space),o=activity.object;
      if(!o||typeof o!=='object'||!o.id||o.attributedTo!==remote.id||!isPublicObject(o)||!activityAddresses(o,group.id)){activityStatus='deferred';}
      else if(o.type==='Event'){
        if(space.federation_mode==='off'||!space.federation_events_inbound){activityStatus='deferred';}
        else {
          const objectUrl=new URL(o.id),actorUrl=new URL(remote.id);if(objectUrl.protocol!=='https:'||objectUrl.host!==actorUrl.host)throw new Error('Remote Event-ID muss HTTPS verwenden und zum Actor-Host gehoeren');
          const start=isoDateTimeWithZone(o.startTime),end=isoDateTimeWithZone(o.endTime);const eventName=stripRemoteHtml(o.name,160);
          if(!eventName||!start||!end||Date.parse(end)<Date.parse(start)||Date.parse(end)-Date.parse(start)>366*24*60*60*1000){activityStatus='deferred';}
          else {
            const existing=db.prepare('SELECT id FROM events WHERE remote_uri=?').get(o.id);const eventId=existing?.id||('fe-'+crypto.createHash('sha256').update(o.id).digest('hex').slice(0,24));
            const locationName=typeof o.location==='string'?stripRemoteHtml(o.location,240):stripRemoteHtml(o.location?.name,240);
            const joinMode=String(o.joinMode||'');const policy=joinMode==='free'?'open':joinMode==='invite'?'invite':'approval';const capacity=o.maximumAttendeeCapacity?Math.max(1,Math.min(100000,Number(o.maximumAttendeeCapacity)||1)):null;
            db.prepare(`INSERT INTO events(id,date_label,name,meta,description,source,source_label,created_by,visibility,attendance_policy,min_trust_level,max_participants,owner_space_id,propagation_scope,start_at,end_at,timezone,federation_state,remote_uri,remote_actor_uri,remote_location_name,federation_lifecycle_state,federation_moderation_state)
              VALUES (?,?,?,?,?,'external',?,NULL,'public',?,1,?,?,'own',?,?,?,'disabled',?,?,?,'active','active')
              ON CONFLICT(id) DO UPDATE SET date_label=excluded.date_label,name=excluded.name,description=excluded.description,source_label=excluded.source_label,attendance_policy=excluded.attendance_policy,max_participants=excluded.max_participants,start_at=excluded.start_at,end_at=excluded.end_at,remote_actor_uri=excluded.remote_actor_uri,remote_location_name=excluded.remote_location_name,federation_lifecycle_state='active'`).run(eventId,start,eventName,'Fediverse',stripRemoteHtml(o.content,10000),objectUrl.host,policy,capacity,req.params.id,start,end,'UTC',o.id,remote.id,locationName);
            db.prepare('INSERT OR IGNORE INTO event_communities(event_id,community_id) VALUES (?,?)').run(eventId,req.params.id);
            replaceRemoteMedia(db,o.id,o);
          }
        }
      } else if(o.type==='Note'){
        if(mode==='off'){activityStatus='deferred';}
        const objectUrl=new URL(o.id),actorUrl=new URL(remote.id);if(objectUrl.protocol!=='https:'||objectUrl.host!==actorUrl.host)throw new Error('Remote Note-ID muss HTTPS verwenden und zum Actor-Host gehoeren');
        const reply=typeof o.inReplyTo==='string'?o.inReplyTo:'';
        const localPrefix=`${baseUrl()}/ap/objects/`;let relationKind='thread';
        if(reply){
          const localTarget=reply.startsWith(localPrefix);const remoteTarget=remoteObjectLinkedToSpace(db,req.params.id,reply);if(!localTarget&&!remoteTarget){activityStatus='deferred';}
          else relationKind='reply';
        } else if(mode!=='threads') activityStatus='deferred';
        if(activityStatus==='accepted'){
          upsertRemoteObject(db,{objectUri:o.id,objectType:'Note',actorUri:remote.id,contentText:stripRemoteHtml(o.content,5000),inReplyTo:reply,publishedAt:String(o.published||activity.published||''),rawJson:JSON.stringify(o)});
          replaceRemoteMedia(db,o.id,o);
          linkRemoteObjectToSpace(db,req.params.id,o.id,relationKind);
        }
      } else activityStatus='deferred';
    } else if(activity.type==='Update'){
      const o=activity.object,existing=o?.id?getRemoteObject(db,o.id):null;
      if(o?.type==='Event'){
        const event=db.prepare("SELECT * FROM events WHERE source='external' AND remote_uri=? AND owner_space_id=?").get(o.id,req.params.id);
        if(!event||event.remote_actor_uri!==remote.id||!isPublicObject(o)||!space.federation_events_inbound){activityStatus='deferred';}
        else {const start=isoDateTimeWithZone(o.startTime),end=isoDateTimeWithZone(o.endTime),eventName=stripRemoteHtml(o.name,160);if(!start||!end||!eventName||Date.parse(end)<Date.parse(start)){activityStatus='deferred';}else {db.prepare(`UPDATE events SET name=?,description=?,date_label=?,start_at=?,end_at=?,remote_location_name=?,max_participants=?,federation_lifecycle_state='active' WHERE id=?`).run(eventName,stripRemoteHtml(o.content,10000),start,start,end,typeof o.location==='string'?stripRemoteHtml(o.location,240):stripRemoteHtml(o.location?.name,240),o.maximumAttendeeCapacity?Math.max(1,Math.min(100000,Number(o.maximumAttendeeCapacity)||1)):null,event.id);replaceRemoteMedia(db,o.id,o);}}
      } else if(!o||o.type!=='Note'||!existing||existing.actor_uri!==remote.id||!remoteObjectLinkedToSpace(db,req.params.id,o.id)||!isPublicObject(o)){activityStatus='deferred';}
      else {upsertRemoteObject(db,{objectUri:o.id,objectType:'Note',actorUri:remote.id,contentText:stripRemoteHtml(o.content,5000),inReplyTo:typeof o.inReplyTo==='string'?o.inReplyTo:'',publishedAt:String(o.published||existing.published_at||''),rawJson:JSON.stringify(o)});replaceRemoteMedia(db,o.id,o);}
    } else if(activity.type==='Delete'){
      const objectUri=typeof activity.object==='string'?activity.object:activity.object?.id;
      const remoteEvent=objectUri?db.prepare("SELECT * FROM events WHERE source='external' AND remote_uri=? AND owner_space_id=?").get(objectUri,req.params.id):null;
      if(remoteEvent){if(remoteEvent.remote_actor_uri!==remote.id)throw new Error('Delete actor stimmt nicht mit Event-Autor ueberein');db.prepare("UPDATE events SET federation_lifecycle_state='tombstone',description='' WHERE id=?").run(remoteEvent.id);clearRemoteMedia(db,objectUri);}
      else if(!objectUri||!remoteObjectLinkedToSpace(db,req.params.id,objectUri)||!tombstoneRemoteObject(db,objectUri,remote.id))activityStatus='deferred';else clearRemoteMedia(db,objectUri);
    } else activityStatus='deferred';
    db.prepare('INSERT INTO federation_activities(id,activity_uri,direction,activity_type,actor_uri,local_user_id,payload_json,status) VALUES (?,?,?,?,?,?,?,?)').run('act-'+crypto.randomUUID(),actId,'in',String(activity.type||''),remote.id,null,JSON.stringify(activity),activityStatus);rememberReplay(remote.id,actId);
    return res.status(202).json(activityStatus==='accepted'?{accepted:true}:{accepted:false,reason:'group_activity_deferred'});
  }catch(e){console.warn('Space federation inbox rejected:',String(e?.code||e?.message||'rejected').slice(0,80));return federationFailure(res,e);}
});

app.get('/ap/objects/posts/:id',(req,res)=>{try{const note=noteForLocalPost(db,req.params.id);if(!note)return res.status(404).end();res.type('application/activity+json').json(note)}catch(e){res.status(503).json({error:'federation_not_configured'})}});
app.get('/ap/objects/comments/:id',(req,res)=>{try{const note=noteForLocalComment(db,req.params.id);if(!note)return res.status(404).end();res.type('application/activity+json').json(note)}catch(e){res.status(503).json({error:'federation_not_configured'})}});

app.get('/ap/objects/events/:id',(req,res)=>{try{const event=eventForLocalEvent(db,req.params.id);if(!event)return res.status(404).end();res.type('application/activity+json').json(event)}catch(e){res.status(503).json({error:'federation_not_configured'})}});
app.post('/ap/actors/users/:id/inbox',federationInboxIpLimit,async(req,res)=>{
  const activity=req.body||{}; try{
    const actId=federationActivityId(activity);
    const local=db.prepare("SELECT id FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(req.params.id);if(!local||!isUserFederationEnabled(db,local.id))return res.status(404).end();
    const remote=await verifyLegacySignature(req,activity);enforceActorHostLimit({actor:remote.id});const governanceAction=['Delete','Undo'].includes(activity.type)?'cleanup':activity.type==='Follow'?'follow':'write';const governance=evaluatePeer(db,{uri:remote.id,direction:'inbound',action:governanceAction});if(!governance.allowed)throw Object.assign(new Error(governance.reason),{code:'FEDERATION_POLICY'});
    if(isRecentReplay(remote.id,actId)||db.prepare('SELECT 1 FROM federation_activities WHERE activity_uri=?').get(actId))return res.status(202).end();recordPeerObservation(db,{uri:remote.id,direction:'inbound',activityType:activity.type});
    let activityStatus='accepted';
    if(activity.type==='Follow' && activity.object===actorId(local.id)){
      const federationPref=userFederationSettings(db,local.id);if(!federationPref?.allow_followers){activityStatus='rejected';const reject={'@context':AS,id:`${actorId(local.id)}/activities/${crypto.randomUUID()}`,type:'Reject',actor:actorId(local.id),object:activity,to:[remote.id]};const rejectInbox=remote.inbox||remote.endpoints?.sharedInbox;if(rejectInbox)await deliverActivity(db,local.id,rejectInbox,reject);}else{
      db.prepare('INSERT OR REPLACE INTO federation_followers(local_user_id,remote_actor_uri,remote_inbox_uri) VALUES (?,?,?)').run(local.id,remote.id,remote.inbox||remote.endpoints?.sharedInbox||'');
      const accept={ '@context':AS,id:`${actorId(local.id)}/activities/${crypto.randomUUID()}`,type:'Accept',actor:actorId(local.id),object:activity,to:[remote.id]};
      const inbox=remote.inbox||remote.endpoints?.sharedInbox;if(inbox)await deliverActivity(db,local.id,inbox,accept);}
    } else if(activity.type==='Undo' && activity.object?.type==='Follow'){
      const actor=typeof activity.actor==='string'?activity.actor:activity.actor?.id;db.prepare('DELETE FROM federation_followers WHERE local_user_id=? AND remote_actor_uri=?').run(local.id,actor);
    } else if(['Accept','Reject'].includes(activity.type)){
      const obj=activity.object;const joinId=typeof obj==='string'?obj:obj?.id;const row=joinId?db.prepare(`SELECT ea.event_id,ea.user_id,ea.join_activity_uri,e.remote_actor_uri,e.name FROM event_attendance ea JOIN events e ON e.id=ea.event_id WHERE ea.user_id=? AND ea.join_activity_uri=? AND e.source='external'`).get(local.id,joinId):null;if(!row||row.remote_actor_uri!==remote.id)activityStatus='deferred';else if(activity.type==='Accept'){db.prepare("UPDATE event_attendance SET status='going',federation_state='accepted',updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND user_id=?").run(row.event_id,local.id);notify(local.id,'event','Teilnahme bestätigt',row.name,'event',row.event_id);}else{db.prepare('DELETE FROM event_attendance WHERE event_id=? AND user_id=?').run(row.event_id,local.id);notify(local.id,'event','Teilnahmeanfrage abgelehnt',row.name,'event',row.event_id);}
    } else if(['Join','Leave'].includes(activity.type)){
      const localEventId=localEventIdFromActivityObject(activity.object);const result=localEventId?await handleRemoteEventJoinLeave({activity,remote,localEventId,receiverType:'user',receiverId:local.id}):{accepted:false};if(!result.accepted)activityStatus='deferred';
    } else if(activity.type==='Create'){
      const o=activity.object;
      if(!o||typeof o!=='object'||o.type!=='Note'||!o.id||o.attributedTo!==remote.id||!isPublicObject(o)){activityStatus='deferred';}
      else {
        const u=new URL(o.id),au=new URL(remote.id);if(u.protocol!=='https:'||u.host!==au.host)throw new Error('Remote Note-ID muss HTTPS verwenden und zum Actor-Host gehoeren');
        const reply=typeof o.inReplyTo==='string'?o.inReplyTo:'';const addressed=[...(Array.isArray(o.to)?o.to:o.to?[o.to]:[]),...(Array.isArray(o.cc)?o.cc:o.cc?[o.cc]:[])].includes(actorId(local.id));const localReply=reply.startsWith(`${baseUrl()}/ap/objects/`);const knownReply=!!(reply&&getRemoteObject(db,reply));if(!addressed&&!localReply&&!knownReply){activityStatus='deferred';}else {upsertRemoteObject(db,{objectUri:o.id,objectType:'Note',actorUri:remote.id,contentText:stripRemoteHtml(o.content,5000),inReplyTo:reply,publishedAt:String(o.published||activity.published||''),rawJson:JSON.stringify(o)});replaceRemoteMedia(db,o.id,o);}
      }
    } else if(activity.type==='Update'){
      const o=activity.object;
      if(!o||typeof o!=='object'||o.type!=='Note'||!o.id||o.attributedTo!==remote.id||!isPublicObject(o)){activityStatus='deferred';}
      else {const existing=getRemoteObject(db,o.id);if(!existing){activityStatus='deferred';}else if(existing.actor_uri!==remote.id)throw new Error('Update actor stimmt nicht mit Objekt-Autor ueberein');else {upsertRemoteObject(db,{objectUri:o.id,objectType:'Note',actorUri:remote.id,contentText:stripRemoteHtml(o.content,5000),inReplyTo:typeof o.inReplyTo==='string'?o.inReplyTo:'',publishedAt:String(o.published||existing.published_at||''),rawJson:JSON.stringify(o)});replaceRemoteMedia(db,o.id,o);}}
    } else if(activity.type==='Delete'){
      const objectUri=typeof activity.object==='string'?activity.object:activity.object?.id;if(!objectUri||!tombstoneRemoteObject(db,objectUri,remote.id))activityStatus='deferred';else clearRemoteMedia(db,objectUri);
    } else activityStatus='deferred';
    db.prepare('INSERT INTO federation_activities(id,activity_uri,direction,activity_type,actor_uri,local_user_id,payload_json,status) VALUES (?,?,?,?,?,?,?,?)').run('act-'+crypto.randomUUID(),actId,'in',String(activity.type||''),remote.id,local.id,JSON.stringify(activity),activityStatus);rememberReplay(remote.id,actId);
    return res.status(202).json(activityStatus==='accepted'?{accepted:true}:{accepted:false,reason:'activity_type_or_object_deferred'});
  }catch(e){console.warn('Federation inbox rejected:',String(e?.code||e?.message||'rejected').slice(0,80));return federationFailure(res,e);}
});

app.get('/api/health',(req,res)=>res.json({ok:true,app:'PartiUp',meaning:'ParticipationUpwards',milestone:'P0.8',version:pkg.version,database:'sqlite',environment:IS_PROD?'production':'development'}));
app.get('/api/federation/diagnostics',(req,res)=>{
  const configured=!!baseUrl();let scheme=null,host=null;
  try{if(configured){const u=new URL(baseUrl());scheme=u.protocol.replace(':','');host=u.host}}catch{}
  res.json({ok:true,milestone:'P0.8',configured,baseUrl:configured?baseUrl():null,https:scheme==='https',host,testMode:process.env.PARTIUP_FEDERATION_TEST==='1',inboundSignature:'legacy-http-signature-required',rfc9421:'planned-verification-first',remoteFetchPolicy:remoteFetchPolicy(),inboxProtection:federationSecurityConfig(),governance:governanceSnapshot(db)});
});

app.get('/api/federation/discovery-check',(req,res)=>{
  try{
    const configured=!!baseUrl(); if(!configured)return res.status(503).json({ok:false,error:'federation_not_configured'});
    const host=new URL(baseUrl()).host.toLowerCase();
    const requested=String(req.query.handle||'max').trim().toLowerCase();
    // An unknown handle and a person without federation opt-in must look the same (no account enumeration).
    const userId=userIdForHandle(db,requested); if(!userId)return res.status(404).json({ok:false,error:'not_found'});
    const actor=actorDocument(db,userId); if(!actor)return res.status(404).json({ok:false,error:'not_found'}); const handle=actor.preferredUsername; const acct=`acct:${handle}@${host}`;
    const checks={
      handleMapped:handle===requested,
      preferredUsernameMatches:actor.preferredUsername===handle,
      webfingerMatches:actor.webfinger===acct,
      actorIdAbsoluteHttps:String(actor.id||'').startsWith('https://'),
      actorUrlMatchesId:actor.url===actor.id,
      actorInboxAbsoluteHttps:String(actor.inbox||'').startsWith('https://'),
      publicKeyOwnerMatches:actor.publicKey?.owner===actor.id,
      discoverable:actor.discoverable===true
    };
    res.json({ok:Object.values(checks).every(Boolean),milestone:'P0.8',handle,userId,acct,actorId:actor.id,checks});
  }catch(e){res.status(500).json({ok:false,error:'discovery_check_failed'});}
});
app.get('/api/architecture',(req,res)=>res.json(architectureSnapshot()));
app.get('/api/connectors/catalog',(req,res)=>res.json({connectors:connectorCatalog()}));
app.get('/api/connectors/framework',(req,res)=>res.json(connectorFrameworkSnapshot()));
app.get('/api/integrations/catalog',(req,res)=>res.json({integrations:integrationCatalog()}));
app.get('/api/integrations/framework',(req,res)=>res.json(integrationFrameworkSnapshot()));
app.get('/api/federation/media-model',(req,res)=>res.json(mediaFederationSnapshot()));
// A received Fediverse post is shown only where at least one receiving Space is visible to the viewer.
function remoteObjectVisible(objectUri,userId){return db.prepare(`SELECT sro.local_space_id FROM federation_space_remote_objects sro JOIN federation_remote_objects ro ON ro.object_uri=sro.object_uri WHERE sro.object_uri=? AND ro.lifecycle_state='active' AND ro.moderation_state='active'`).all(objectUri).some(r=>canViewScope(userId,'community',r.local_space_id));}
app.get('/api/federation-media/:id',federationMediaLimit,async(req,res)=>{
  try{
    const row=db.prepare(`SELECT id,object_uri,media_url,media_type,kind,name FROM federation_remote_media WHERE id=?`).get(String(req.params.id||''));
    if(!row||row.kind!=='image')return res.status(404).end();
    const visibleRemote=remoteObjectVisible(row.object_uri,currentUserId(req));
    const visibleEvent=db.prepare(`SELECT 1 FROM events WHERE remote_uri=? AND source='external' AND federation_lifecycle_state='active' AND federation_moderation_state='active' AND visibility='public'`).get(row.object_uri);
    if(!visibleRemote&&!visibleEvent)return res.status(404).end();
    const fetched=await safeHttpsRequest(row.media_url,{headers:{Accept:'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8,*/*;q=0.1'},maxBytes:8*1024*1024});
    if(fetched.status<200||fetched.status>=300)return res.status(502).end();
    const contentType=String(fetched.headers['content-type']||row.media_type||'').split(';')[0].trim().toLowerCase();
    if(!IMAGE_MIME.test(contentType))return res.status(415).end();
    res.setHeader('Content-Type',contentType);res.setHeader('Cache-Control','public, max-age=900');res.setHeader('Content-Length',String(fetched.body.length));return res.send(fetched.body);
  }catch(e){console.warn('Federation media proxy:',String(e?.message||'failed').slice(0,100));return res.status(502).end();}
});
app.get('/api/federation/model',(req,res)=>res.json(modelSnapshot()));
// The registry holds every local object, including private ones and people without federation opt-in.
// Describe only what ActivityPub currently publishes (same decision as the /ap endpoints), never remote
// snapshots or internal fields; everything else looks absent.
function federationPublicationExists(type,id){
  try{
    if(type==='user')return !!actorDocument(db,id);
    if(type==='community')return !!spaceActorDocument(db,id);
    if(type==='post')return !!noteForLocalPost(db,id);
    if(type==='comment')return !!noteForLocalComment(db,id);
    if(type==='event')return !!eventForLocalEvent(db,id);
  }catch{return false}
  return false;
}
app.get('/api/federation/entity/:type/:id',(req,res)=>{
  const type=String(req.params.type||'');
  if(!ENTITY_MAPPINGS[type]) return res.status(400).json({error:'unsupported_entity_type'});
  const row=getFederationEntity(db,type,req.params.id);
  if(!row||!row.is_local||!federationPublicationExists(type,req.params.id)) return res.status(404).json({error:'not_found'});
  const {entity_type,entity_id,activity_type,entity_kind,local_path,canonical_uri}=row;
  return res.json({...describeEntity(type,req.params.id),registry:{entity_type,entity_id,activity_type,entity_kind,is_local:1,local_path,canonical_uri}});
});

app.get('/api/bootstrap',(req,res)=>{const userId=currentUserId(req),data=bootstrap(userId);data.message_recipients=messageRecipients(userId);res.json(data)});
app.get('/api/me',(req,res)=>res.json({user:getUserSafe(currentUserId(req))}));
app.get('/api/security/csrf',(req,res)=>res.json({csrf:csrfFor(req,res)}));

app.post('/api/register',registrationLimit,csrfGuard,(req,res)=>{
  if(currentUserId(req))return res.status(409).json({error:'Bitte zuerst abmelden.'});
  const name=validatedUserText(req.body?.name,60,{required:true});
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  const password=req.body?.password;
  if(!name||[...name].length<2||typeof req.body?.name!=='string'||req.body.name.length>60)
    return res.status(400).json({error:'Bitte einen Namen mit 2 bis 60 Zeichen eingeben.'});
  if(email.length>254||!(/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email)))
    return res.status(400).json({error:'Bitte eine gültige E-Mail-Adresse eingeben.'});
  if(typeof password!=='string'||password.length<12||password.length>128)
    return res.status(400).json({error:'Das Passwort muss 12 bis 128 Zeichen lang sein.'});
  // A generic conflict message avoids confirming whether an address is registered.
  if(db.prepare('SELECT 1 FROM users WHERE lower(email)=?').get(email))
    return res.status(409).json({error:'Registrierung mit diesen Angaben nicht möglich.'});
  const id='u-'+crypto.randomUUID(), token=crypto.randomBytes(32).toString('hex');
  const nextCsrf=crypto.randomBytes(24).toString('hex');
  const {salt,hash}=hashPassword(password);
  try{
    db.transaction(()=>{
      db.prepare('INSERT INTO users(id,name,email,avatar,trust_level,password_salt,password_hash) VALUES (?,?,?,?,?,?,?)')
        .run(id,name,email,[...name][0].toUpperCase(),1,salt,hash);
      db.prepare('INSERT INTO user_preferences(user_id) VALUES (?)').run(id);
      db.prepare("INSERT INTO sessions(token,user_id,expires_at) VALUES (?,?,datetime('now','+7 days'))")
        .run(sessionKey(token),id);
    })();
  }catch(err){
    if(err.code?.startsWith('SQLITE_CONSTRAINT'))return res.status(409).json({error:'Registrierung mit diesen Angaben nicht möglich.'});
    throw err;
  }
  res.append('Set-Cookie',`bup_session=${token}; ${cookieFlags(true)}Max-Age=604800`);
  res.append('Set-Cookie',`bup_csrf=${nextCsrf}; ${cookieFlags(false)}Max-Age=86400`);
  res.status(201).json({user:getUserSafe(id),csrf:nextCsrf});
});

app.post('/api/login',loginLimit,csrfGuard,(req,res)=>{
  const {email,password}=req.body||{};
  const u=db.prepare("SELECT * FROM users WHERE lower(email)=lower(?) AND COALESCE(account_status,'active')='active'").get(String(email||''));
  // Deliberately identical response for unknown accounts and wrong passwords.
  if(!u||!verifyPassword(String(password||''),u.password_salt,u.password_hash))return res.status(401).json({error:'E-Mail oder Passwort ist falsch.'});
  const oldToken=cookies(req).bup_session;
  const token=crypto.randomBytes(32).toString('hex');
  const nextCsrf=crypto.randomBytes(24).toString('hex');
  db.transaction(()=>{
    if(oldToken)db.prepare('DELETE FROM sessions WHERE token=?').run(sessionKey(oldToken));
    db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES (?,?,datetime(\'now\',\'+7 days\'))').run(sessionKey(token),u.id);
  })();
  res.append('Set-Cookie',`bup_session=${token}; ${cookieFlags(true)}Max-Age=604800`);
  res.append('Set-Cookie',`bup_csrf=${nextCsrf}; ${cookieFlags(false)}Max-Age=86400`);
  res.json({user:getUserSafe(u.id),csrf:nextCsrf});
});
app.use('/api',csrfGuard,(req,res,next)=>
  (['GET','HEAD','OPTIONS'].includes(req.method)?readLimit:writeLimit)(req,res,next));
app.post('/api/logout',(req,res)=>{const token=cookies(req).bup_session;if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(sessionKey(token));res.append('Set-Cookie',`bup_session=; ${cookieFlags(true)}Max-Age=0`);res.json({ok:true});});

app.get('/api/notifications',requireUser,(req,res)=>{res.json({items:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT 50').all(req.userId),unread:db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL').get(req.userId).n})});
app.post('/api/notifications/read',requireUser,(req,res)=>{const id=String(req.body?.id||'');if(id)db.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?").run(id,req.userId);else db.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE user_id=?").run(req.userId);res.json({ok:true})});

app.post('/api/follows',requireUser,(req,res)=>{
  const type=String(req.body?.target_type||''), id=String(req.body?.target_id||''), level=String(req.body?.notification_level||'feed');
  if(!['community','place','topic','person','event','project','participation'].includes(type))return res.status(400).json({error:'Ungültiges Folge-Ziel.'});
  if(!['feed','important','all','muted'].includes(level))return res.status(400).json({error:'Ungültige Benachrichtigungsstufe.'});
  const exists=type==='community'?communityDetail(id,req.userId):type==='place'?db.prepare('SELECT 1 FROM places WHERE id=?').get(id):type==='topic'?db.prepare('SELECT 1 FROM topics WHERE name=?').get(id):type==='person'?userProfile(id,req.userId):type==='event'?eventDetail(id,req.userId):type==='project'?projectDetail(id,req.userId):participationDetail(id,req.userId);
  if(type==='person'){if(id===req.userId)return res.status(400).json({error:'Du kannst dir nicht selbst folgen.'});if(isBlocked(req.userId,id))return res.status(403).json({error:'Folgen ist aufgrund einer Blockierung nicht möglich.'});const pref=db.prepare('SELECT allow_followers FROM user_preferences WHERE user_id=?').get(id);if(pref&&pref.allow_followers===0)return res.status(403).json({error:'Diese Person erlaubt aktuell keine Follower.'});}
  if(!exists)return res.status(404).json({error:'Ziel nicht gefunden.'});
  db.prepare(`INSERT INTO user_follows(user_id,target_type,target_id,notification_level) VALUES (?,?,?,?) ON CONFLICT(user_id,target_type,target_id) DO UPDATE SET notification_level=excluded.notification_level`).run(req.userId,type,id,level);
  res.status(201).json({ok:true,following:followsForUser(req.userId)});
});
app.delete('/api/follows/:type/:id',requireUser,(req,res)=>{
  if(!['community','place','topic','person','event','project','participation'].includes(req.params.type))return res.status(400).json({error:'Ungültiges Folge-Ziel.'});
  db.prepare('DELETE FROM user_follows WHERE user_id=? AND target_type=? AND target_id=?').run(req.userId,req.params.type,decodeURIComponent(req.params.id));
  res.json({ok:true,following:followsForUser(req.userId)});
});

app.get('/api/friends',requireUser,(req,res)=>res.json(friendshipNetwork(req.userId)));
app.post('/api/friends/:id/request',requireUser,(req,res)=>{
  const id=text(req.params.id,80);if(!id||id===req.userId)return res.status(400).json({error:'Ungültige Freundschaftsanfrage.'});
  const target=db.prepare("SELECT id,name FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(id);if(!target)return res.status(404).json({error:'Person nicht gefunden.'});
  if(isBlocked(req.userId,id))return res.status(403).json({error:'Freundschaftsanfrage aufgrund einer Blockierung nicht möglich.'});
  const [a,b]=friendshipPair(req.userId,id),existing=db.prepare('SELECT * FROM user_friendships WHERE user_a=? AND user_b=?').get(a,b);
  if(existing?.status==='accepted')return res.status(409).json({error:'Ihr seid bereits befreundet.'});
  if(existing?.status==='pending')return res.status(409).json({error:existing.requested_by===req.userId?'Anfrage bereits gesendet.':'Von dieser Person liegt bereits eine Anfrage vor.'});
  db.prepare("INSERT INTO user_friendships(user_a,user_b,requested_by,status) VALUES (?,?,?,'pending')").run(a,b,req.userId);
  notify(id,'friend_request','Neue Freundschaftsanfrage',`${getUserSafe(req.userId)?.name||'Jemand'} möchte sich mit dir verbinden.`,'user',req.userId);
  res.status(201).json({ok:true,friendship:friendshipRelation(req.userId,id)});
});
app.post('/api/friends/:id/accept',requireUser,(req,res)=>{
  const id=text(req.params.id,80);const [a,b]=friendshipPair(req.userId,id);const existing=db.prepare("SELECT * FROM user_friendships WHERE user_a=? AND user_b=? AND status='pending'").get(a,b);
  if(!existing||existing.requested_by===req.userId)return res.status(404).json({error:'Keine passende eingehende Anfrage gefunden.'});
  if(isBlocked(req.userId,id))return res.status(403).json({error:'Freundschaft aufgrund einer Blockierung nicht möglich.'});
  db.prepare("UPDATE user_friendships SET status='accepted',updated_at=CURRENT_TIMESTAMP WHERE user_a=? AND user_b=?").run(a,b);
  notify(id,'friend_accept','Freundschaftsanfrage angenommen',`${getUserSafe(req.userId)?.name||'Jemand'} hat deine Anfrage angenommen.`,'user',req.userId);
  res.json({ok:true,friendship:friendshipRelation(req.userId,id)});
});
app.delete('/api/friends/:id',requireUser,(req,res)=>{
  const id=text(req.params.id,80);if(!id||id===req.userId)return res.status(400).json({error:'Ungültige Personenbeziehung.'});const [a,b]=friendshipPair(req.userId,id);
  db.prepare('DELETE FROM user_friendships WHERE user_a=? AND user_b=?').run(a,b);res.json({ok:true,friendship:{status:'none'}});
});

app.get('/api/preferences',requireUser,(req,res)=>{db.prepare('INSERT OR IGNORE INTO user_preferences(user_id) VALUES (?)').run(req.userId);res.json(db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(req.userId))});
function auditProfileVisibility(userId,scope,fieldName,oldValue,newValue){if(String(oldValue??'')===String(newValue??''))return;db.prepare('INSERT INTO profile_visibility_audit(id,user_id,scope,field_name,old_value,new_value) VALUES (?,?,?,?,?,?)').run('pva-'+crypto.randomUUID(),userId,scope,fieldName,String(oldValue??''),String(newValue??''));}
app.put('/api/preferences',requireUser,(req,res)=>{
  db.prepare('INSERT OR IGNORE INTO user_preferences(user_id) VALUES (?)').run(req.userId);
  const dm=['all','members','nobody'].includes(req.body?.dm_permission)?req.body.dm_permission:'members';
  const gi=['all','members','nobody'].includes(req.body?.group_invites)?req.body.group_invites:'members';
  const vis=(v,fallback='private')=>['public','members','network','private'].includes(v)?v:fallback;
  const previous=db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(req.userId)||{};
  const federationEnabled=Object.prototype.hasOwnProperty.call(req.body||{},'federation_enabled')?(req.body.federation_enabled===true?1:0):Number(previous.federation_enabled||0);
  const federationDiscoverable=federationEnabled?(Object.prototype.hasOwnProperty.call(req.body||{},'federation_discoverable')?(req.body.federation_discoverable===true?1:0):Number(previous.federation_discoverable||0)):0;
  const allowedFederatedFields=['name','bio','avatar','interests'];let requestedFields=[];if(Array.isArray(req.body?.federated_profile_fields))requestedFields=req.body.federated_profile_fields;else try{requestedFields=JSON.parse(previous.federated_profile_fields||'[]')}catch{}const federatedFields=[...new Set(requestedFields.filter(x=>allowedFederatedFields.includes(x)))];
  const next={
    profile_visibility:vis(req.body?.profile_visibility,previous.profile_visibility||'network'),bio_visibility:vis(req.body?.bio_visibility,previous.bio_visibility||'network'),place_visibility:vis(req.body?.place_visibility,previous.place_visibility||'private'),memberships_visibility:vis(req.body?.memberships_visibility,previous.memberships_visibility||'private'),follows_visibility:vis(req.body?.follows_visibility,previous.follows_visibility||'private'),event_attendance_visibility:vis(req.body?.event_attendance_visibility,previous.event_attendance_visibility||'private'),interests_visibility:vis(req.body?.interests_visibility,previous.interests_visibility||'network'),projects_visibility:vis(req.body?.projects_visibility,previous.projects_visibility||'network'),shared_connections_visibility:vis(req.body?.shared_connections_visibility,previous.shared_connections_visibility||'network'),profile_activity_visibility:vis(req.body?.profile_activity_visibility,previous.profile_activity_visibility||'network'),profile_activity_default_visibility:vis(req.body?.profile_activity_default_visibility,previous.profile_activity_default_visibility||'network'),created_content_visibility:vis(req.body?.created_content_visibility,previous.created_content_visibility||'network')
  };
  db.transaction(()=>{db.prepare(`UPDATE user_preferences SET dm_permission=?,group_invites=?,notify_comments=?,notify_mentions=?,notify_messages=?,notify_events=?,profile_visibility=?,bio_visibility=?,place_visibility=?,memberships_visibility=?,follows_visibility=?,event_attendance_visibility=?,interests_visibility=?,projects_visibility=?,shared_connections_visibility=?,profile_activity_visibility=?,profile_activity_default_visibility=?,created_content_visibility=?,allow_followers=?,federation_enabled=?,federation_discoverable=?,federated_profile_fields=? WHERE user_id=?`).run(dm,gi,req.body?.notify_comments?1:0,req.body?.notify_mentions?1:0,req.body?.notify_messages?1:0,req.body?.notify_events?1:0,next.profile_visibility,next.bio_visibility,next.place_visibility,next.memberships_visibility,next.follows_visibility,next.event_attendance_visibility,next.interests_visibility,next.projects_visibility,next.shared_connections_visibility,next.profile_activity_visibility,next.profile_activity_default_visibility,next.created_content_visibility,req.body?.allow_followers===false?0:1,federationEnabled,federationDiscoverable,JSON.stringify(federatedFields),req.userId);for(const [k,v] of Object.entries(next))auditProfileVisibility(req.userId,'profile_preferences',k,previous[k],v);})();
  if(!federationEnabled){db.transaction(()=>{db.prepare('DELETE FROM federation_followers WHERE local_user_id=?').run(req.userId);db.prepare('DELETE FROM federation_delivery_queue WHERE local_user_id=?').run(req.userId);db.prepare('DELETE FROM federation_actor_keys WHERE user_id=?').run(req.userId);db.prepare('DELETE FROM federation_handles WHERE user_id=?').run(req.userId);})();federationKeyStore.deletePrivateMaterial('users',req.userId);}else{ensureFederationHandle(db,req.userId);ensureActorKey(db,req.userId);}
  res.json(db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(req.userId));
});
app.get('/api/profile-visibility/audit',requireUser,(req,res)=>res.json(db.prepare('SELECT scope,field_name,old_value,new_value,created_at FROM profile_visibility_audit WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT 100').all(req.userId)));
app.get('/api/profile-preview/:mode',requireUser,(req,res)=>{
  const mode=req.params.mode;if(!['public','members','network'].includes(mode))return res.status(400).json({error:'Ungültige Vorschau.'});
  const pref=db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(req.userId)||{};
  const allowed=v=>v==='public'||(mode==='members'&&['public','members'].includes(v))||(mode==='network'&&['public','members','network'].includes(v));
  // Preview is deliberately server-computed and conservative: linked objects are additionally restricted to public objects.
  const base=db.prepare('SELECT id,name,avatar,bio,place_id FROM users WHERE id=?').get(req.userId);if(!base)return res.status(404).json({error:'Profil nicht gefunden.'});
  if(!allowed(pref.profile_visibility||'network'))return res.json({mode,visible:false,reason:'Dein gesamtes Profil ist für diese Zielgruppe nicht sichtbar.'});
  const publicCommunities=db.prepare(`SELECT c.id,c.name,c.icon FROM memberships m JOIN communities c ON c.id=m.community_id WHERE m.user_id=? AND c.visibility='public' ORDER BY c.name`).all(req.userId);
  const topics=db.prepare('SELECT t.name FROM user_topics ut JOIN topics t ON t.id=ut.topic_id WHERE ut.user_id=? ORDER BY t.name').all(req.userId).map(x=>x.name);
  const publicProjects=listProjects(null).filter(x=>x.created_by===req.userId);
  const publicEvents=listEvents(null);const attendanceIds=new Set(db.prepare("SELECT event_id FROM event_attendance WHERE user_id=? AND status IN ('going','maybe')").all(req.userId).map(x=>x.event_id));
  const fields={bio:allowed(pref.bio_visibility||'network')?base.bio:null,place:allowed(pref.place_visibility||'private')&&base.place_id?db.prepare('SELECT id,name,icon FROM places WHERE id=?').get(base.place_id)||null:null,memberships:allowed(pref.memberships_visibility||'private')?publicCommunities:null,interests:allowed(pref.interests_visibility||'network')?topics:null,projects:allowed(pref.projects_visibility||'network')?publicProjects:null,event_attendance:allowed(pref.event_attendance_visibility||'private')?publicEvents.filter(x=>attendanceIds.has(x.id)):null,shared_connections:allowed(pref.shared_connections_visibility||'network')?[]:null,profile_activity:allowed(pref.profile_activity_visibility||'network')?profileActivityForUser(req.userId,req.userId).filter(a=>allowed(stricterVisibility(a.visibility,pref.profile_activity_visibility||'network'))&&profileActivityTarget(a.target_type,a.target_id,null)):null};
  res.json({mode,visible:true,profile:{id:base.id,name:base.name,avatar:base.avatar,...fields},note:'Objektberechtigungen bleiben zusätzlich maßgeblich; die Vorschau zeigt nur Objekte, die ohne besonderen Space-Zugriff sichtbar wären.'});
});

app.put('/api/me/profile',requireUser,(req,res)=>{const bio=text(req.body?.bio,1200),placeId=text(req.body?.place_id,80)||null;if(placeId&&!db.prepare('SELECT 1 FROM places WHERE id=?').get(placeId))return res.status(400).json({error:'Ungültiger Ort.'});const topics=cleanTopics(req.body?.interests||[]);db.transaction(()=>{db.prepare('UPDATE users SET bio=?,place_id=? WHERE id=?').run(bio,placeId,req.userId);db.prepare('DELETE FROM user_topics WHERE user_id=?').run(req.userId);const ins=db.prepare('INSERT OR IGNORE INTO user_topics(user_id,topic_id) VALUES (?,?)');topics.forEach(t=>ins.run(req.userId,ensureTopic(t)));})();res.json(getUserSafe(req.userId));});
app.get('/api/people',(req,res)=>res.json(listPeople(currentUserId(req))));
app.get('/api/users/:id',(req,res)=>{const p=userProfile(req.params.id,currentUserId(req));if(!p)return res.status(404).json({error:'Profil nicht gefunden oder nicht für dich sichtbar.'});res.json(p);});
app.get('/api/profile-activity/:userId',(req,res)=>{const owner=db.prepare("SELECT id FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(req.params.userId);if(!owner)return res.status(404).json({error:'Profil nicht gefunden.'});const visible=userProfile(req.params.userId,currentUserId(req));if(!visible)return res.status(404).json({error:'Profil nicht gefunden oder nicht für dich sichtbar.'});res.json(profileActivityForUser(req.params.userId,currentUserId(req)));});
app.post('/api/profile-activity',requireUser,(req,res)=>{
  const targetType=text(req.body?.target_type,40),targetId=text(req.body?.target_id,180),note=text(req.body?.note,500);const pref=db.prepare('SELECT profile_activity_default_visibility FROM user_preferences WHERE user_id=?').get(req.userId)||{profile_activity_default_visibility:'network'};const visibility=['public','members','network','private'].includes(req.body?.visibility)?req.body.visibility:pref.profile_activity_default_visibility;
  if(!['community','event','project','topic','participation'].includes(targetType)||!targetId)return res.status(400).json({error:'Ungültiges Objekt.'});
  const target=profileActivityTarget(targetType,targetId,req.userId);if(!target)return res.status(404).json({error:'Objekt nicht gefunden oder für dich nicht sichtbar.'});
  const id='pa-'+crypto.randomUUID();const previous=db.prepare('SELECT id,visibility FROM user_profile_activity WHERE user_id=? AND target_type=? AND target_id=?').get(req.userId,targetType,targetId);db.transaction(()=>{db.prepare(`INSERT INTO user_profile_activity(id,user_id,target_type,target_id,note,visibility) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,target_type,target_id) DO UPDATE SET note=excluded.note,visibility=excluded.visibility,updated_at=CURRENT_TIMESTAMP`).run(id,req.userId,targetType,targetId,note,visibility);auditProfileVisibility(req.userId,'profile_activity',previous?.id||id,previous?.visibility||'',visibility);})();
  res.status(201).json(profileActivityForUser(req.userId,req.userId));
});
app.put('/api/profile-activity/:id',requireUser,(req,res)=>{const row=db.prepare('SELECT * FROM user_profile_activity WHERE id=? AND user_id=?').get(req.params.id,req.userId);if(!row)return res.status(404).json({error:'Eintrag nicht gefunden.'});const note=Object.prototype.hasOwnProperty.call(req.body||{},'note')?text(req.body.note,500):row.note;const visibility=Object.prototype.hasOwnProperty.call(req.body||{},'visibility')&&['public','members','network','private'].includes(req.body.visibility)?req.body.visibility:row.visibility;db.transaction(()=>{db.prepare('UPDATE user_profile_activity SET note=?,visibility=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(note,visibility,row.id,req.userId);auditProfileVisibility(req.userId,'profile_activity',row.id,row.visibility,visibility);})();res.json(profileActivityForUser(req.userId,req.userId));});
app.delete('/api/profile-activity/:id',requireUser,(req,res)=>{db.prepare('DELETE FROM user_profile_activity WHERE id=? AND user_id=?').run(req.params.id,req.userId);res.json({ok:true,activity:profileActivityForUser(req.userId,req.userId)});});

app.post('/api/media/profile',requireUser,upload.single('image'),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:'Bitte ein Bild auswählen.'});const m=await persistImage(req.file,req.userId);linkMedia(m.id,'user',req.userId,'avatar');res.status(201).json(getUserSafe(req.userId))}catch(e){console.error(e);res.status(400).json({error:'Bild konnte nicht verarbeitet werden.'})}});
app.post('/api/media/community/:id/:role',requireUser,upload.single('image'),async(req,res)=>{try{if(!canManageCommunity(req.userId,req.params.id))return res.status(403).json({error:'Nur Admins/Moderatoren dürfen Community-Medien ändern.'});if(!['logo','cover'].includes(req.params.role))return res.status(400).json({error:'Ungültige Medienrolle.'});if(!req.file)return res.status(400).json({error:'Bitte ein Bild auswählen.'});const m=await persistImage(req.file,req.userId);linkMedia(m.id,'community',req.params.id,req.params.role);res.status(201).json(communityDetail(req.params.id,req.userId))}catch(e){console.error(e);res.status(400).json({error:'Bild konnte nicht verarbeitet werden.'})}});
app.post('/api/media/project/:id',requireUser,upload.single('image'),async(req,res)=>{try{const pr=db.prepare('SELECT created_by FROM projects WHERE id=?').get(req.params.id);if(!pr)return res.status(404).json({error:'Projekt nicht gefunden.'});if(!hasPermission(req.userId,'project',req.params.id,'space.edit_profile'))return res.status(403).json({error:'Keine Berechtigung, das Projektbild zu ändern.'});if(!req.file)return res.status(400).json({error:'Bitte ein Bild auswählen.'});const m=await persistImage(req.file,req.userId);linkMedia(m.id,'project',req.params.id,'cover');res.status(201).json(projectDetail(req.params.id,req.userId))}catch(e){console.error(e);res.status(400).json({error:'Bild konnte nicht verarbeitet werden.'})}});


const SPACE_TEMPLATE_MODULES={
  local_community:{feed:true,spaces:true,events:true,projects:true,participation:true,polls:true,members:true},
  club:{feed:true,spaces:true,events:true,projects:true,participation:false,polls:true,members:true},
  initiative:{feed:true,spaces:true,events:true,projects:true,participation:true,polls:true,members:true},
  project_group:{feed:true,spaces:false,events:true,projects:true,participation:false,polls:true,members:true},
  workgroup:{feed:true,spaces:false,events:true,projects:true,participation:false,polls:true,members:true},
  public_institution:{feed:true,spaces:true,events:true,projects:true,participation:true,polls:true,members:true},
  interest_group:{feed:true,spaces:true,events:true,projects:true,participation:false,polls:true,members:true}
};
function applySpaceTemplate(spaceId,key){
  const modules=SPACE_TEMPLATE_MODULES[key]||SPACE_TEMPLATE_MODULES.local_community;
  const up=db.prepare(`INSERT INTO space_modules(space_id,module_type,enabled,visibility,permissions_json,config_json) VALUES (?,?,?,'members','{}','{}') ON CONFLICT(space_id,module_type) DO UPDATE SET enabled=excluded.enabled`);
  Object.entries(modules).forEach(([name,enabled])=>up.run(spaceId,name,enabled?1:0));
}

app.get('/api/communities/:id',(req,res)=>{const x=communityDetail(req.params.id,currentUserId(req));if(!x)return res.status(404).json({error:'Community nicht gefunden oder nicht sichtbar.'});res.json(x);});
app.get('/api/communities/:id/subspaces',(req,res)=>{const x=communityDetail(req.params.id,currentUserId(req));if(!x)return res.status(404).json({error:'Community nicht gefunden oder nicht sichtbar.'});res.json(x.children||[]);});
app.get('/api/projects/:id',(req,res)=>{const x=projectDetail(req.params.id,currentUserId(req));if(!x)return res.status(404).json({error:'Projekt nicht gefunden.'});res.json(x);});
app.get('/api/events/:id',(req,res)=>{const x=eventDetail(req.params.id,currentUserId(req));if(!x)return res.status(404).json({error:'Veranstaltung nicht gefunden.'});res.json(x);});

app.post('/api/communities',requireUser,(req,res)=>{
  const {name,type='Community',icon='✦',description='',places=[],topics=[],related=[],visibility='public',join_policy='open',min_trust_level=1,template_key='local_community'}=req.body||{};
  const cleanName=validatedUserText(name,160,{required:true}),cleanType=validatedUserText(type,80,{required:true}),cleanDescription=validatedUserText(description,10000),cleanIcon=validatedIcon(icon,'✦');const pls=cleanPlaces(places),tps=cleanTopics(topics);if(!cleanName||!cleanType||cleanDescription===null||!cleanIcon||!pls.length)return res.status(400).json({error:'Ungültige Space-Eingabe.'});
  const validPlaces=db.prepare(`SELECT id FROM places WHERE id IN (${pls.map(()=>'?').join(',')})`).all(...pls).map(x=>x.id);if(validPlaces.length!==pls.length)return res.status(400).json({error:'Mindestens ein Ort ist ungültig.'});
  const vis=['public','unlisted','private'].includes(visibility)?visibility:'public',join=['open','approval','invite','trust'].includes(join_policy)?join_policy:'open',min=Math.max(1,Math.min(3,Number(min_trust_level)||1));const id='c-'+crypto.randomUUID();
  db.transaction(()=>{db.prepare("INSERT INTO communities(id,icon,name,type,description,source,created_by,visibility,join_policy,min_trust_level,setup_completed,template_key) VALUES (?,?,?,?,?,'native',?,?,?,?,0,?)").run(id,cleanIcon,cleanName,cleanType,cleanDescription,req.userId,vis,join,min,text(template_key,60)||'local_community');const cp=db.prepare('INSERT OR IGNORE INTO community_places(community_id,place_id) VALUES (?,?)');pls.forEach(x=>cp.run(id,x));const ct=db.prepare('INSERT OR IGNORE INTO community_topics(community_id,topic_id) VALUES (?,?)');(tps.length?tps:['Allgemein']).forEach(t=>ct.run(id,ensureTopic(t)));db.prepare("INSERT INTO memberships(community_id,user_id,role) VALUES (?,?,'admin')").run(id,req.userId);applySpaceTemplate(id,text(template_key,60)||'local_community');const cr=db.prepare("INSERT OR IGNORE INTO community_relations(from_id,to_id,relation_type) VALUES (?,?,'related')");safeArray(related,30).forEach(r=>{if(db.prepare('SELECT 1 FROM communities WHERE id=?').get(r))cr.run(id,r)});})();ensureSpaceFederationHandle(db,id);res.status(201).json(communityDetail(id,req.userId));
});
app.post('/api/communities/:id/subspaces',requireUser,(req,res)=>{
  const parent=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);if(!parent)return res.status(404).json({error:'Übergeordnete Community nicht gefunden.'});
  if(!canManageCommunity(req.userId,parent.id))return res.status(403).json({error:'Nur Admins/Moderatoren dürfen Unterräume anlegen.'});
  const {name,type='Gruppe',icon='◈',description='',visibility=parent.visibility,join_policy=parent.join_policy,min_trust_level=parent.min_trust_level,places=[],topics=[],template_key='workgroup'}=req.body||{};
  const cleanName=validatedUserText(name,160,{required:true}),cleanType=validatedUserText(type,80,{required:true}),cleanDescription=validatedUserText(description,10000),cleanIcon=validatedIcon(icon,'◈');if(!cleanName||!cleanType||cleanDescription===null||!cleanIcon)return res.status(400).json({error:'Ungültige Space-Eingabe.'});
  const inheritedPlaces=db.prepare('SELECT place_id id FROM community_places WHERE community_id=?').all(parent.id).map(x=>x.id);
  const inheritedTopics=db.prepare(`SELECT t.name FROM community_topics ct JOIN topics t ON t.id=ct.topic_id WHERE ct.community_id=?`).all(parent.id).map(x=>x.name);
  const pls=cleanPlaces(places).length?cleanPlaces(places):inheritedPlaces;const tps=cleanTopics(topics).length?cleanTopics(topics):inheritedTopics;
  const vis=['public','unlisted','private'].includes(visibility)?visibility:parent.visibility;const join=['open','approval','invite','trust'].includes(join_policy)?join_policy:parent.join_policy;const min=Math.max(1,Math.min(3,Number(min_trust_level)||Number(parent.min_trust_level)||1));const id='c-'+crypto.randomUUID();
  db.transaction(()=>{db.prepare("INSERT INTO communities(id,icon,name,type,description,source,created_by,parent_id,visibility,join_policy,min_trust_level,setup_completed,template_key) VALUES (?,?,?,?,?,'native',?,?,?,?,?,0,?)").run(id,cleanIcon,cleanName,cleanType,cleanDescription,req.userId,parent.id,vis,join,min,text(template_key,60)||'workgroup');const cp=db.prepare('INSERT OR IGNORE INTO community_places(community_id,place_id) VALUES (?,?)');pls.forEach(x=>cp.run(id,x));const ct=db.prepare('INSERT OR IGNORE INTO community_topics(community_id,topic_id) VALUES (?,?)');(tps.length?tps:['Allgemein']).forEach(t=>ct.run(id,ensureTopic(t)));db.prepare("INSERT INTO memberships(community_id,user_id,role) VALUES (?,?,'admin')").run(id,req.userId);db.prepare("INSERT OR IGNORE INTO community_relations(from_id,to_id,relation_type) VALUES (?,?,'parent')").run(id,parent.id);db.prepare("INSERT OR IGNORE INTO community_relations(from_id,to_id,relation_type) VALUES (?,?,'child')").run(parent.id,id);const moduleRows=db.prepare('SELECT module_type,enabled,visibility,permissions_json,config_json FROM space_modules WHERE space_id=?').all(parent.id);const sm=db.prepare('INSERT OR IGNORE INTO space_modules(space_id,module_type,enabled,visibility,permissions_json,config_json) VALUES (?,?,?,?,?,?)');moduleRows.forEach(m=>sm.run(id,m.module_type,m.enabled,m.visibility,m.permissions_json,m.config_json));applySpaceTemplate(id,text(template_key,60)||'workgroup');})();
  ensureSpaceFederationHandle(db,id);
  res.status(201).json(communityDetail(id,req.userId));
});


app.put('/api/communities/:id/profile',requireUser,(req,res)=>{
  if(!canManageCommunity(req.userId,req.params.id))return res.status(403).json({error:'Nur Admins/Moderatoren dürfen den Space konfigurieren.'});
  const current=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);if(!current)return res.status(404).json({error:'Space nicht gefunden.'});
  const name=validatedUserText(req.body?.name,160,{required:true}),type=validatedUserText(req.body?.type,80,{required:true}),description=validatedUserText(req.body?.description,10000),icon=validatedIcon(req.body?.icon,current.icon);if(!name||!type||description===null||!icon)return res.status(400).json({error:'Ungültige Space-Eingabe.'});
  const places=cleanPlaces(req.body?.places||[]),topics=cleanTopics(req.body?.topics||[]);
  if(!places.length)return res.status(400).json({error:'Mindestens ein Ort ist erforderlich.'});
  const validPlaces=db.prepare(`SELECT id FROM places WHERE id IN (${places.map(()=>'?').join(',')})`).all(...places).map(x=>x.id);if(validPlaces.length!==places.length)return res.status(400).json({error:'Ungültiger Ort.'});
  db.transaction(()=>{db.prepare('UPDATE communities SET name=?,type=?,description=?,icon=? WHERE id=?').run(name,type,description,icon,req.params.id);db.prepare('DELETE FROM community_places WHERE community_id=?').run(req.params.id);const cp=db.prepare('INSERT INTO community_places(community_id,place_id) VALUES (?,?)');places.forEach(x=>cp.run(req.params.id,x));db.prepare('DELETE FROM community_topics WHERE community_id=?').run(req.params.id);const ct=db.prepare('INSERT INTO community_topics(community_id,topic_id) VALUES (?,?)');(topics.length?topics:['Allgemein']).forEach(t=>ct.run(req.params.id,ensureTopic(t)));})();
  res.json(communityDetail(req.params.id,req.userId));
});
app.put('/api/communities/:id/setup-status',requireUser,(req,res)=>{
  if(!hasPermission(req.userId,'community',req.params.id,'space.configure_modules'))return res.status(403).json({error:'Keine Berechtigung.'});
  db.prepare('UPDATE communities SET setup_completed=? WHERE id=?').run(req.body?.completed?1:0,req.params.id);res.json(communityDetail(req.params.id,req.userId));
});


// PartiUp P0.10: Extensions are technically modular but remain native PartiUp UX.
app.get('/api/extensions/catalog',(req,res)=>res.json({extensions:extensionCatalog()}));
app.get('/api/communities/:id/extensions',(req,res)=>{
  const c=communityDetail(req.params.id,currentUserId(req));if(!c)return res.status(404).json({error:'Community nicht gefunden oder nicht sichtbar.'});
  const canConfigure=!!(req.userId&&hasPermission(req.userId,'community',c.id,'space.configure_modules'));
  res.json({space_id:c.id,can_configure:canConfigure,extensions:extensionsForSpace(db,c.id,{includeDisabled:canConfigure})});
});
app.put('/api/communities/:id/extensions/:extensionId',requireUser,(req,res)=>{
  const c=db.prepare('SELECT id FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});
  if(!hasPermission(req.userId,'community',req.params.id,'space.configure_modules'))return res.status(403).json({error:'Keine Berechtigung, Erweiterungen zu verwalten.'});
  try{
    const extension=setSpaceExtension(db,{spaceId:req.params.id,extensionId:req.params.extensionId,enabled:req.body?.enabled===true,config:req.body?.config||{},actorId:req.userId});
    res.json({ok:true,extension,community:communityDetail(req.params.id,req.userId)});
  }catch(e){if(e.code==='EXTENSION_UNKNOWN')return res.status(404).json({error:e.message});if(e.code==='EXTENSION_UNAVAILABLE')return res.status(409).json({error:e.message});throw e}
});

app.put('/api/communities/:id/modules',requireUser,(req,res)=>{
  if(!hasPermission(req.userId,'community',req.params.id,'space.configure_modules'))return res.status(403).json({error:'Keine Berechtigung, Module zu verwalten.'});
  const allowed=['feed','spaces','events','projects','participation','polls','members'];const mods=req.body?.modules||{};
  const up=db.prepare(`INSERT INTO space_modules(space_id,module_type,enabled,visibility,permissions_json,config_json) VALUES (?,?,?,'members','{}','{}') ON CONFLICT(space_id,module_type) DO UPDATE SET enabled=excluded.enabled`);
  db.transaction(()=>allowed.forEach(m=>{if(Object.prototype.hasOwnProperty.call(mods,m))up.run(req.params.id,m,mods[m]?1:0)}))();
  res.json(communityDetail(req.params.id,req.userId));
});

function objectRow(entityType,id){
  if(entityType==='project')return db.prepare('SELECT id,created_by FROM projects WHERE id=?').get(id)||null;
  if(entityType==='event')return db.prepare('SELECT id,created_by FROM events WHERE id=?').get(id)||null;
  return null;
}
function objectDetail(entityType,id,userId){return entityType==='project'?projectDetail(id,userId):eventDetail(id,userId)}
app.put('/api/objects/:type/:id/modules',requireUser,(req,res)=>{
  const type=req.params.type,row=objectRow(type,req.params.id);if(!row)return res.status(404).json({error:'Objekt nicht gefunden.'});if(!hasPermission(req.userId,type,req.params.id,'space.configure_modules'))return res.status(403).json({error:'Keine Berechtigung, Module zu verwalten.'});
  const allowed=type==='project'?['tasks','updates','events','participation','discussion','files','members']:['tasks','participants','projects','discussion','files'];const mods=req.body?.modules||{};const up=db.prepare(`INSERT INTO object_modules(entity_type,entity_id,module_type,enabled,config_json) VALUES (?,?,?,?,'{}') ON CONFLICT(entity_type,entity_id,module_type) DO UPDATE SET enabled=excluded.enabled`);
  db.transaction(()=>allowed.forEach(m=>{if(Object.prototype.hasOwnProperty.call(mods,m))up.run(type,row.id,m,mods[m]?1:0)}))();res.json(objectDetail(type,row.id,req.userId));
});
app.post('/api/objects/:type/:id/tasks',requireUser,(req,res)=>{
  const type=req.params.type,row=objectRow(type,req.params.id);if(!row)return res.status(404).json({error:'Objekt nicht gefunden.'});if(!hasPermission(req.userId,type,req.params.id,'task.create'))return res.status(403).json({error:'Keine Berechtigung, Aufgaben anzulegen.'});
  const title=text(req.body?.title,180);if(!title)return res.status(400).json({error:'Aufgabentitel fehlt.'});const assignee=text(req.body?.assignee_user_id,120)||null;if(assignee&&!db.prepare('SELECT 1 FROM users WHERE id=?').get(assignee))return res.status(400).json({error:'Zugewiesene Person wurde nicht gefunden.'});
  if(assignee){const canAssign=hasPermission(req.userId,type,row.id,'task.assign'),canSelf=assignee===req.userId&&hasPermission(req.userId,type,row.id,'task.self_assign');if(!canAssign&&!canSelf)return res.status(403).json({error:'Keine Berechtigung, diese Aufgabe zuzuweisen.'});}
  const status=['open','in_progress','done'].includes(req.body?.status)?req.body.status:'open',priority=['low','normal','high'].includes(req.body?.priority)?req.body.priority:'normal';db.prepare('INSERT INTO tasks(id,entity_type,entity_id,title,description,status,priority,due_at,assignee_user_id,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').run('task-'+crypto.randomUUID(),type,row.id,title,text(req.body?.description,3000),status,priority,text(req.body?.due_at,80),assignee,req.userId);res.status(201).json(objectDetail(type,row.id,req.userId));
});
app.put('/api/objects/:type/:id/tasks/:taskId/assignee',requireUser,(req,res)=>{
  const type=req.params.type,row=objectRow(type,req.params.id);if(!row)return res.status(404).json({error:'Objekt nicht gefunden.'});const task=db.prepare('SELECT * FROM tasks WHERE id=? AND entity_type=? AND entity_id=?').get(req.params.taskId,type,row.id);if(!task)return res.status(404).json({error:'Aufgabe nicht gefunden.'});
  const requested=text(req.body?.assignee_user_id,120)||null,canAssign=hasPermission(req.userId,type,row.id,'task.assign'),canSelf=hasPermission(req.userId,type,row.id,'task.self_assign');
  if(requested===req.userId){if(!canAssign&&!canSelf)return res.status(403).json({error:'Keine Berechtigung, Aufgaben selbst zu übernehmen.'});if(task.assignee_user_id&&task.assignee_user_id!==req.userId&&!canAssign)return res.status(409).json({error:'Die Aufgabe ist bereits einer anderen Person zugewiesen.'});}
  else if(requested===null){if(!canAssign&&!(canSelf&&task.assignee_user_id===req.userId))return res.status(403).json({error:'Keine Berechtigung, diese Zuweisung zu lösen.'});}
  else {if(!canAssign)return res.status(403).json({error:'Keine Berechtigung, Aufgaben anderen Personen zuzuweisen.'});if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(requested))return res.status(400).json({error:'Zugewiesene Person wurde nicht gefunden.'});}
  db.prepare('UPDATE tasks SET assignee_user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(requested,task.id);res.json(objectDetail(type,row.id,req.userId));
});
app.put('/api/objects/:type/:id/tasks/:taskId',requireUser,(req,res)=>{
  const type=req.params.type,row=objectRow(type,req.params.id);if(!row)return res.status(404).json({error:'Objekt nicht gefunden.'});const task=db.prepare('SELECT * FROM tasks WHERE id=? AND entity_type=? AND entity_id=?').get(req.params.taskId,type,row.id);if(!task)return res.status(404).json({error:'Aufgabe nicht gefunden.'});const canAll=hasPermission(req.userId,type,row.id,'task.update_all'),canOwn=hasPermission(req.userId,type,row.id,'task.update_own')&&(task.assignee_user_id===req.userId||task.created_by===req.userId);if(!canAll&&!canOwn)return res.status(403).json({error:'Keine Berechtigung, diese Aufgabe zu ändern.'});
  const status=['open','in_progress','done'].includes(req.body?.status)?req.body.status:task.status;db.prepare('UPDATE tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status,task.id);res.json(objectDetail(type,row.id,req.userId));
});

app.get('/api/permissions/:type/:id',requireUser,(req,res)=>{const type=req.params.type;if(!['community','project','event','participation'].includes(type))return res.status(400).json({error:'Ungültiger Space-Typ.'});const visible=type==='community'?communityDetail(req.params.id,req.userId):type==='project'?projectDetail(req.params.id,req.userId):type==='event'?eventDetail(req.params.id,req.userId):participationDetail(req.params.id,req.userId);if(!visible)return res.status(404).json({error:'Space nicht gefunden.'});const snap=permissionSnapshot(req.userId,type,req.params.id);if(!snap)return res.status(404).json({error:'Space nicht gefunden.'});if(!hasPermission(req.userId,type,req.params.id,'space.view'))return res.status(403).json({error:'Kein Zugriff.'});res.json(snap)});
app.put('/api/permissions/:type/:id/role/:userId',requireUser,(req,res)=>{const type=req.params.type,id=req.params.id;if(!['community','project','event','participation'].includes(type)||!scopeRow(type,id))return res.status(404).json({error:'Space nicht gefunden.'});if(!hasPermission(req.userId,type,id,'space.manage_roles'))return res.status(403).json({error:'Nur Owner dürfen Rollen vergeben.'});const role=['admin','moderator','member','guest'].includes(req.body?.role)?req.body.role:null;if(!role)return res.status(400).json({error:'Ungültige Rolle.'});const target=text(req.params.userId,120),row=scopeRow(type,id);if(target===row.created_by)return res.status(400).json({error:'Die Owner-Rolle des Erstellers kann hier nicht entfernt werden.'});if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(target))return res.status(404).json({error:'Person nicht gefunden.'});db.prepare(`INSERT INTO role_assignments(scope_type,scope_id,user_id,role,assigned_by) VALUES (?,?,?,?,?) ON CONFLICT(scope_type,scope_id,user_id) DO UPDATE SET role=excluded.role,assigned_by=excluded.assigned_by,updated_at=CURRENT_TIMESTAMP`).run(type,id,target,role,req.userId);res.json(permissionSnapshot(req.userId,type,id))});
app.put('/api/permissions/:type/:id/overrides',requireUser,(req,res)=>{const type=req.params.type,id=req.params.id;if(!['community','project','event','participation'].includes(type)||!scopeRow(type,id))return res.status(404).json({error:'Space nicht gefunden.'});if(!hasPermission(req.userId,type,id,'space.manage_roles'))return res.status(403).json({error:'Nur Owner dürfen Rechteprofile ändern.'});const role=['admin','moderator','member','guest'].includes(req.body?.role)?req.body.role:null,permission=text(req.body?.permission,120),effect=['allow','deny','inherit'].includes(req.body?.effect)?req.body.effect:null;if(!role||!ALL_PERMISSIONS.includes(permission)||!effect)return res.status(400).json({error:'Ungültige Rechteänderung.'});if(effect==='inherit')db.prepare('DELETE FROM permission_overrides WHERE scope_type=? AND scope_id=? AND role=? AND permission=?').run(type,id,role,permission);else db.prepare(`INSERT INTO permission_overrides(scope_type,scope_id,role,permission,effect,updated_by) VALUES (?,?,?,?,?,?) ON CONFLICT(scope_type,scope_id,role,permission) DO UPDATE SET effect=excluded.effect,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).run(type,id,role,permission,effect,req.userId);res.json(permissionSnapshot(req.userId,type,id))});


function canViewReportScope(userId,scopeType,scopeId){
  if(scopeType==='community')return !!communityDetail(scopeId,userId);
  if(scopeType==='project')return !!projectDetail(scopeId,userId);
  if(scopeType==='event')return !!eventDetail(scopeId,userId);
  if(scopeType==='participation')return !!participationDetail(scopeId,userId);
  return false;
}
function userBelongsToReportScope(targetUserId,scopeType,scopeId){
  if(scopeType==='community')return !!db.prepare('SELECT 1 FROM communities c WHERE c.id=? AND (c.created_by=? OR EXISTS (SELECT 1 FROM memberships m WHERE m.community_id=c.id AND m.user_id=?))').get(scopeId,targetUserId,targetUserId);
  if(scopeType==='project'){const p=db.prepare('SELECT created_by,owner_space_id FROM projects WHERE id=?').get(scopeId);return !!(p&&(p.created_by===targetUserId||(p.owner_space_id&&mustBeMember(targetUserId,p.owner_space_id))||db.prepare("SELECT 1 FROM role_assignments WHERE scope_type='project' AND scope_id=? AND user_id=?").get(scopeId,targetUserId)));}
  if(scopeType==='event'){const e=db.prepare('SELECT created_by FROM events WHERE id=?').get(scopeId);return !!(e&&(e.created_by===targetUserId||db.prepare("SELECT 1 FROM event_attendance WHERE event_id=? AND user_id=? AND status IN ('going','maybe')").get(scopeId,targetUserId)||db.prepare('SELECT 1 FROM event_invites WHERE event_id=? AND user_id=?').get(scopeId,targetUserId)||db.prepare("SELECT 1 FROM role_assignments WHERE scope_type='event' AND scope_id=? AND user_id=?").get(scopeId,targetUserId)));}
  return false;
}
function reportTargetSnapshot(userId,targetType,targetId){
  if(targetType==='post'){const x=db.prepare(`SELECT p.id,p.body,p.community_id scope_id,u.name author_name FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=? AND NOT EXISTS (SELECT 1 FROM moderation_content_state ms WHERE ms.target_type='post' AND ms.target_id=p.id AND ms.state IN ('hidden','removed'))`).get(targetId);if(!x||!communityDetail(x.scope_id,userId))return null;return {scope_type:'community',scope_id:x.scope_id,label:`Beitrag von ${x.author_name}`,excerpt:text(x.body,500)};}
  if(targetType==='comment'){const x=db.prepare(`SELECT cm.id,cm.body,p.community_id scope_id,u.name author_name FROM comments cm JOIN posts p ON p.id=cm.post_id JOIN users u ON u.id=cm.author_id WHERE cm.id=? AND NOT EXISTS (SELECT 1 FROM moderation_content_state ms WHERE (ms.target_type='comment' AND ms.target_id=cm.id OR ms.target_type='post' AND ms.target_id=p.id) AND ms.state IN ('hidden','removed'))`).get(targetId);if(!x||!communityDetail(x.scope_id,userId))return null;return {scope_type:'community',scope_id:x.scope_id,label:`Kommentar von ${x.author_name}`,excerpt:text(x.body,500)};}
  if(targetType==='community'){const x=communityDetail(targetId,userId);return x?{scope_type:'community',scope_id:x.id,label:x.name,excerpt:''}:null;}
  if(targetType==='project'){const x=projectDetail(targetId,userId);return x?{scope_type:'project',scope_id:x.id,label:x.name,excerpt:''}:null;}
  if(targetType==='event'){const x=eventDetail(targetId,userId);return x?{scope_type:'event',scope_id:x.id,label:x.name,excerpt:''}:null;}
  if(targetType==='user'){const x=db.prepare("SELECT id,name FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(targetId);return x?{scope_type:null,scope_id:null,label:x.name,excerpt:''}:null;}
  return null;
}
function moderationQueue(scopeType,scopeId){
  return db.prepare(`SELECT r.*,u.name reporter_name,a.name assigned_name,z.name resolved_name
    FROM content_reports r JOIN users u ON u.id=r.reporter_id
    LEFT JOIN users a ON a.id=r.assigned_to LEFT JOIN users z ON z.id=r.resolved_by
    WHERE r.scope_type=? AND r.scope_id=? ORDER BY CASE r.status WHEN 'open' THEN 1 WHEN 'reviewing' THEN 2 ELSE 3 END, datetime(r.created_at) DESC`).all(scopeType,scopeId);
}
app.post('/api/reports',requireUser,(req,res)=>{
  const targetType=['post','comment','community','project','event','user'].includes(req.body?.target_type)?req.body.target_type:null;
  const targetId=text(req.body?.target_id,120),reason=['spam','harassment','hate','misinformation','privacy','illegal','other'].includes(req.body?.reason)?req.body.reason:'other';
  if(!targetType||!targetId)return res.status(400).json({error:'Meldeziel fehlt.'});
  const snap=reportTargetSnapshot(req.userId,targetType,targetId);if(!snap)return res.status(404).json({error:'Inhalt nicht gefunden.'});
  let scopeType=snap.scope_type,scopeId=snap.scope_id;
  if(targetType==='user'){scopeType=['community','project','event'].includes(req.body?.scope_type)?req.body.scope_type:null;scopeId=text(req.body?.scope_id,120);if(!scopeType||!scopeId){const shared=firstSharedCommunity(req.userId,targetId);if(shared){scopeType='community';scopeId=shared.id;}}if(!scopeType||!scopeId)return res.status(400).json({error:'Für eine Personenmeldung ist derzeit ein gemeinsamer Space-Kontext erforderlich.'});if(!canViewReportScope(req.userId,scopeType,scopeId)||!userBelongsToReportScope(targetId,scopeType,scopeId))return res.status(404).json({error:'Inhalt nicht gefunden.'});}
  else if(!canViewReportScope(req.userId,scopeType,scopeId))return res.status(404).json({error:'Inhalt nicht gefunden.'});
  const duplicate=db.prepare("SELECT id FROM content_reports WHERE reporter_id=? AND target_type=? AND target_id=? AND status IN ('open','reviewing') LIMIT 1").get(req.userId,targetType,targetId);if(duplicate)return res.status(409).json({error:'Du hast diesen Inhalt bereits gemeldet.'});
  const id='report-'+crypto.randomUUID();db.prepare(`INSERT INTO content_reports(id,reporter_id,scope_type,scope_id,target_type,target_id,reason,details,target_label,content_excerpt) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,req.userId,scopeType,scopeId,targetType,targetId,reason,text(req.body?.details,2000),text(snap.label,240),text(snap.excerpt,500));
  res.status(201).json({ok:true,id,status:'open'});
});
app.get('/api/moderation/:type/:id/reports',requireUser,(req,res)=>{const type=req.params.type,id=req.params.id;if(!scopeRow(type,id))return res.status(404).json({error:'Space nicht gefunden.'});if(!hasPermission(req.userId,type,id,'moderation.review'))return res.status(403).json({error:'Keine Berechtigung, Meldungen zu prüfen.'});res.json({reports:moderationQueue(type,id),actions:db.prepare(`SELECT a.*,u.name actor_name FROM moderation_actions a JOIN users u ON u.id=a.actor_id WHERE a.scope_type=? AND a.scope_id=? ORDER BY datetime(a.created_at) DESC LIMIT 50`).all(type,id)});});
app.put('/api/moderation/:type/:id/reports/:reportId',requireUser,(req,res)=>{
  const type=req.params.type,id=req.params.id;if(!scopeRow(type,id))return res.status(404).json({error:'Space nicht gefunden.'});if(!hasPermission(req.userId,type,id,'moderation.act'))return res.status(403).json({error:'Keine Berechtigung für Moderationsmaßnahmen.'});
  const report=db.prepare('SELECT * FROM content_reports WHERE id=? AND scope_type=? AND scope_id=?').get(req.params.reportId,type,id);if(!report)return res.status(404).json({error:'Meldung nicht gefunden.'});
  const action=['review','dismiss','hide','restore','remove','note'].includes(req.body?.action)?req.body.action:null;if(!action)return res.status(400).json({error:'Ungültige Moderationsaktion.'});
  if(['hide','restore','remove'].includes(action)&&!['post','comment'].includes(report.target_type))return res.status(400).json({error:'Diese Inhaltsmaßnahme ist für dieses Meldeziel noch nicht verfügbar.'});
  const note=text(req.body?.note,1000);let status=report.status;if(action==='review')status='reviewing';if(action==='dismiss')status='dismissed';if(['hide','remove'].includes(action))status='resolved';if(action==='restore')status='resolved';
  db.transaction(()=>{if(['hide','restore','remove'].includes(action)){const state=action==='hide'?'hidden':action==='remove'?'removed':'active';db.prepare(`INSERT INTO moderation_content_state(target_type,target_id,scope_type,scope_id,state,updated_by) VALUES (?,?,?,?,?,?) ON CONFLICT(target_type,target_id) DO UPDATE SET state=excluded.state,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).run(report.target_type,report.target_id,type,id,state,req.userId);}db.prepare('UPDATE content_reports SET status=?,assigned_to=?,resolved_by=?,resolution=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status,status==='reviewing'?req.userId:report.assigned_to,['resolved','dismissed'].includes(status)?req.userId:null,note,report.id);db.prepare('INSERT INTO moderation_actions(id,report_id,scope_type,scope_id,target_type,target_id,action,note,actor_id) VALUES (?,?,?,?,?,?,?,?,?)').run('mod-'+crypto.randomUUID(),report.id,type,id,report.target_type,report.target_id,action,note,req.userId);})();
  res.json({ok:true,reports:moderationQueue(type,id)});
});

app.get('/api/integrations/capabilities',(req,res)=>res.json({model:'provider-neutral',protocols:['REST','GraphQL','iCal/ICS','RSS/Atom','ActivityPub','JSON','CSV'],principle:'Adapter/Connectoren statt Anbieterlogik im Kernmodell',sources:db.prepare('SELECT id,name,source_type,protocol,base_url,capabilities_json,auth_method,sync_mode FROM external_sources ORDER BY name').all().map(x=>({...x,capabilities:JSON.parse(x.capabilities_json||'[]')}))}));


app.get('/api/federation/governance',(req,res)=>res.json(governanceSnapshot(db)));
app.get('/api/communities/:id/federation/peers',requireUser,(req,res)=>{
  const c=db.prepare('SELECT id FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});
  if(!hasPermission(req.userId,'community',c.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung, Fediverse-Verbindungen zu verwalten.'});
  res.json({governance:governanceSnapshot(db),peers:listSpacePeers(db,c.id)});
});
app.put('/api/communities/:id/federation/peer-policy',requireUser,(req,res)=>{
  const c=db.prepare('SELECT id FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});
  if(!hasPermission(req.userId,'community',c.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung, Fediverse-Verbindungen zu verwalten.'});
  try{const result=setSpacePeerPolicy(db,{spaceId:c.id,host:req.body?.host,policy:req.body?.policy,note:req.body?.note,updatedBy:req.userId});res.json({ok:true,...result,peers:listSpacePeers(db,c.id)});}catch(e){res.status(400).json({error:String(e.message||'Server-Regel ungültig.')});}
});

app.get('/api/communities/:id/federation-status',(req,res)=>{
  const c=db.prepare('SELECT id,name,visibility,federation_mode,federation_inbound_mode,federation_events_inbound FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});
  const visible=communityDetail(c.id,currentUserId(req));if(!visible)return res.status(404).json({error:'Community nicht gefunden.'});
  const handle=ensureSpaceFederationHandle(db,c.id),configured=!!baseUrl(),enabled=c.federation_mode!=='off';
  res.json({id:c.id,name:c.name,visibility:c.visibility,federation_mode:c.federation_mode,federation_inbound_mode:spaceInboundFederationMode(c),enabled,handle,fediverse_handle:configured&&enabled?`@${handle}@${new URL(baseUrl()).host}`:null,actor:configured&&enabled?spaceActorId(c.id):null,inbound:spaceInboundFederationMode(c),events_inbound:!!c.federation_events_inbound});
});

app.put('/api/communities/:id/federation',requireUser,(req,res)=>{
  const c=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});
  if(!hasPermission(req.userId,'community',c.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung, Federation für diesen Space zu verwalten.'});
  const mode=['off','public','selected'].includes(req.body?.mode)?req.body.mode:null;if(!mode)return res.status(400).json({error:'Ungültiger Federation-Modus.'});
  const inbound=['off','replies','threads'].includes(req.body?.inbound_mode)?req.body.inbound_mode:spaceInboundFederationMode(c);const eventsInbound=req.body?.events_inbound===true?1:req.body?.events_inbound===false?0:Number(c.federation_events_inbound||0);
  if(c.visibility!=='public'&&mode==='public')return res.status(400).json({error:'In nichtöffentlichen Spaces ist automatische Federation nicht erlaubt. Wähle "Nur ausdrücklich ausgewählte Beiträge".'});
  if(mode==='off'&&inbound!=='off')return res.status(400).json({error:'Eingehende Federation setzt einen föderierten Space voraus. Aktiviere zuerst ausgewählte oder öffentliche Federation.'});
  db.prepare('UPDATE communities SET federation_mode=?,federation_inbound_mode=?,federation_events_inbound=? WHERE id=?').run(mode,mode==='off'?'off':inbound,mode==='off'?0:eventsInbound,c.id);
  const handle=ensureSpaceFederationHandle(db,c.id);
  res.json({ok:true,federation_mode:mode,federation_inbound_mode:mode==='off'?'off':inbound,federation_events_inbound:mode==='off'?false:!!eventsInbound,fediverse_handle:baseUrl()&&mode!=='off'?`@${handle}@${new URL(baseUrl()).host}`:null,actor:baseUrl()&&mode!=='off'?spaceActorId(c.id):null,explanation:mode==='off'?'Keine Inhalte dieses Spaces werden föderiert.':mode==='selected'?'Nur ausdrücklich als öffentlich freigegebene Beiträge dürfen föderieren.':'In öffentlichen Spaces dürfen Beiträge standardmäßig föderieren, sofern sie nicht einzeln deaktiviert werden.'});
});

app.put('/api/communities/:id/federation/remote-moderation',requireUser,(req,res)=>{
  const c=db.prepare('SELECT id FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});
  if(!hasPermission(req.userId,'community',c.id,'moderation.act'))return res.status(403).json({error:'Keine Berechtigung für Moderationsmaßnahmen.'});
  const objectUri=String(req.body?.object_uri||'').trim(),action=['hide','remove','restore'].includes(req.body?.action)?req.body.action:null;
  if(!objectUri||!action||!remoteObjectLinkedToSpace(db,c.id,objectUri))return res.status(404).json({error:'Föderierter Inhalt nicht gefunden.'});
  const state=action==='hide'?'hidden':action==='remove'?'removed':'active';db.prepare('UPDATE federation_remote_objects SET moderation_state=?,updated_at=CURRENT_TIMESTAMP WHERE object_uri=?').run(state,objectUri);
  res.json({ok:true,object_uri:objectUri,moderation_state:state});
});

app.post('/api/communities/:id/membership',requireUser,(req,res)=>{const c=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});if(c.source==='external')return res.status(400).json({error:'Externe Community: Mitgliedschaft bleibt bei der Quelle.'});const d=communityAccessDecision(req.userId,c);if(!d.ok)return res.status(403).json({error:d.error});if(d.status==='request'){db.prepare(`INSERT INTO community_join_requests(community_id,user_id,status) VALUES (?,?,'pending') ON CONFLICT(community_id,user_id) DO UPDATE SET status='pending',created_at=CURRENT_TIMESTAMP`).run(c.id,req.userId);return res.status(202).json({membership:null,status:'requested'});}db.prepare("INSERT OR IGNORE INTO memberships(community_id,user_id,role) VALUES (?,?,'member')").run(c.id,req.userId);res.json({membership:'member',status:'joined'});});
app.delete('/api/communities/:id/membership',requireUser,(req,res)=>{
  const m=mustBeMember(req.userId,req.params.id);if(!m)return res.json({membership:null});if(roleFor(req.userId,'community',req.params.id)==='owner')return res.status(400).json({error:'Die Owner-Mitgliedschaft erfordert zuerst eine geregelte Übergabe.'});
  db.transaction(()=>{db.prepare('DELETE FROM memberships WHERE community_id=? AND user_id=?').run(req.params.id,req.userId);db.prepare("DELETE FROM role_assignments WHERE scope_type='community' AND scope_id=? AND user_id=? AND role<>'guest'").run(req.params.id,req.userId)})();res.json({membership:null});
});

app.post('/api/communities/:id/join',requireUser,(req,res)=>{const c=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);const d=communityAccessDecision(req.userId,c);if(!d.ok)return res.status(403).json({error:d.error});if(d.status==='request'){db.prepare(`INSERT INTO community_join_requests(community_id,user_id,status) VALUES (?,?,'pending') ON CONFLICT(community_id,user_id) DO UPDATE SET status='pending',created_at=CURRENT_TIMESTAMP`).run(c.id,req.userId);return res.status(202).json({ok:true,status:'requested'});}db.prepare("INSERT OR IGNORE INTO memberships(community_id,user_id,role) VALUES (?,?,'member')").run(c.id,req.userId);res.json({ok:true,status:'joined'});});
// Explicit Fediverse publication needs two keys, like announcement rights on other platforms:
// the author's consent for this post, and in a non-public Space the Space's external-publication right.
// Restricting (inherit/disabled) stays open to the author and the Space administration.
function postPublicationError(userId,communityId,authorId){
  if(userId!==authorId)return 'Nur wer den Beitrag geschrieben hat, kann ihn nach außen freigeben.';
  const space=db.prepare('SELECT visibility FROM communities WHERE id=?').get(communityId);
  if(space?.visibility!=='public'&&!hasPermission(userId,'community',communityId,'content.publish_external'))return 'Beiträge aus diesem geschlossenen Space darf nur nach außen veröffentlichen, wer dafür im Space berechtigt ist.';
  return null;
}
// Mastodon-compatible outward visibility. Without a choice, closed Spaces default to the more cautious quiet public.
function postFederationAudience(requested,communityId){
  if(['public','quiet'].includes(requested))return requested;
  return db.prepare('SELECT visibility FROM communities WHERE id=?').get(communityId)?.visibility==='public'?'public':'quiet';
}
app.post('/api/communities/:id/posts',requireUser,(req,res)=>{
  if(!mustBeMember(req.userId,req.params.id))return res.status(403).json({error:'Keine Berechtigung zum Schreiben.'});if(!hasPermission(req.userId,'community',req.params.id,'content.create'))return res.status(403).json({error:'Keine Berechtigung zum Schreiben.'});
  const body=text(req.body?.body,5000);if(!body)return res.status(400).json({error:'Der Beitrag ist leer.'});
  const federationState=['inherit','enabled','disabled'].includes(req.body?.federation_state)?req.body.federation_state:'inherit';
  if(federationState==='enabled'){const publicationError=postPublicationError(req.userId,req.params.id,req.userId);if(publicationError)return res.status(403).json({error:publicationError});}
  const audience=postFederationAudience(req.body?.federation_audience,req.params.id);
  const postId='post-'+crypto.randomUUID();db.prepare('INSERT INTO posts(id,community_id,author_id,body,federation_state,federation_audience) VALUES (?,?,?,?,?,?)').run(postId,req.params.id,req.userId,body,federationState,audience);let federated=0,groupFederated=0;try{if(baseUrl()){const note=noteForLocalPost(db,postId);if(note){federated=queueActivityForFollowers(db,req.userId,createActivityForNote(note));groupFederated=queueActivityForSpaceFollowers(db,req.params.id,announceActivityForGroup(db,req.params.id,note));}}}catch(e){console.warn('Post federation enqueue:',e.message)}res.status(201).json({postId,federatedDeliveries:federated,groupFederatedDeliveries:groupFederated,federation:federationDecisionForPost(db,postId),community:communityDetail(req.params.id,req.userId)});
});

app.post('/api/communities/:id/posts-with-media',requireUser,upload.single('image'),async(req,res)=>{
  if(!mustBeMember(req.userId,req.params.id))return res.status(403).json({error:'Keine Berechtigung zum Schreiben.'});if(!hasPermission(req.userId,'community',req.params.id,'content.create'))return res.status(403).json({error:'Keine Berechtigung zum Schreiben.'});
  const body=text(req.body?.body,5000);if(!body)return res.status(400).json({error:'Der Beitrag ist leer.'});
  if(!req.file)return res.status(400).json({error:'Bitte ein unterstütztes Bild auswählen.'});
  const federationState=['inherit','enabled','disabled'].includes(req.body?.federation_state)?req.body.federation_state:'inherit';
  if(federationState==='enabled'){const publicationError=postPublicationError(req.userId,req.params.id,req.userId);if(publicationError)return res.status(403).json({error:publicationError});}
  const audience=postFederationAudience(req.body?.federation_audience,req.params.id);
  const postId='post-'+crypto.randomUUID();let media=null;
  try{
    media=await persistImage(req.file,req.userId);
    db.transaction(()=>{db.prepare('INSERT INTO posts(id,community_id,author_id,body,federation_state,federation_audience) VALUES (?,?,?,?,?,?)').run(postId,req.params.id,req.userId,body,federationState,audience);db.prepare('INSERT INTO media_links(media_id,entity_type,entity_id,role) VALUES (?,?,?,?)').run(media.id,'post',postId,'attachment');})();
  }catch(e){
    if(media?.id){try{db.prepare('DELETE FROM media WHERE id=?').run(media.id)}catch{}for(const u of Object.values(media.variants||{})){try{fs.unlinkSync(path.join(uploadDir,path.basename(u)))}catch{}}}
    console.error('Post media create:',e);return res.status(400).json({error:'Beitrag mit Bild konnte nicht erstellt werden.'});
  }
  let federated=0,groupFederated=0;try{if(baseUrl()){const note=noteForLocalPost(db,postId);if(note){federated=queueActivityForFollowers(db,req.userId,createActivityForNote(note));groupFederated=queueActivityForSpaceFollowers(db,req.params.id,announceActivityForGroup(db,req.params.id,note));}}}catch(e){console.warn('Post federation enqueue:',e.message)}
  res.status(201).json({postId,media,federatedDeliveries:federated,groupFederatedDeliveries:groupFederated,federation:federationDecisionForPost(db,postId),community:communityDetail(req.params.id,req.userId)});
});

app.put('/api/posts/:id/federation',requireUser,(req,res)=>{
  const p=db.prepare('SELECT p.*,c.created_by community_owner FROM posts p JOIN communities c ON c.id=p.community_id WHERE p.id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Beitrag nicht gefunden.'});
  const canAdmin=hasPermission(req.userId,'community',p.community_id,'space.manage_access');if(!(p.author_id===req.userId&&hasPermission(req.userId,'community',p.community_id,'content.create'))&&!canAdmin)return res.status(403).json({error:'Nur Autor oder Space-Administration dürfen die Federation dieses Beitrags ändern.'});
  const state=['inherit','enabled','disabled'].includes(req.body?.state)?req.body.state:null;if(!state)return res.status(400).json({error:'Ungültige Federation-Einstellung.'});
  if(state==='enabled'){const publicationError=postPublicationError(req.userId,p.community_id,p.author_id);if(publicationError)return res.status(403).json({error:publicationError});}
  const before=federationDecisionForPost(db,p.id);let oldNote=null;try{if(before.allowed&&baseUrl())oldNote=noteForLocalPost(db,p.id)}catch{}
  const audience=['public','quiet'].includes(req.body?.audience)?req.body.audience:p.federation_audience;
  // Like Mastodon, the visibility of a published post is fixed; withdraw and publish again to change it.
  if(audience!==p.federation_audience&&before.allowed)return res.status(409).json({error:'Die Sichtbarkeit lässt sich nach der Veröffentlichung nicht mehr ändern. Beitrag zuerst zurückziehen und dann neu veröffentlichen.'});
  db.prepare('UPDATE posts SET federation_state=?,federation_audience=? WHERE id=?').run(state,audience,p.id);const after=federationDecisionForPost(db,p.id);let federated=0;
  try{if(baseUrl()&&!before.allowed&&after.allowed){const note=noteForLocalPost(db,p.id);if(note)federated=queueActivityForFollowers(db,p.author_id,createActivityForNote(note));}else if(baseUrl()&&before.allowed&&!after.allowed&&oldNote){federated=queueActivityForFollowers(db,p.author_id,deleteActivityForObject(p.author_id,oldNote.id));}}catch(e){console.warn('Post federation policy transition:',e.message)}
  res.json({ok:true,state,federation:after,federatedDeliveries:federated});
});

app.post('/api/posts/:id/media',requireUser,upload.single('image'),async(req,res)=>{try{const p=db.prepare('SELECT community_id,author_id FROM posts WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Beitrag nicht gefunden.'});if(p.author_id!==req.userId||!hasPermission(req.userId,'community',p.community_id,'content.create'))return res.status(403).json({error:'Keine Berechtigung, Medien anzuhängen.'});if(!req.file)return res.status(400).json({error:'Bitte ein Bild auswählen.'});const m=await persistImage(req.file,req.userId);db.prepare('INSERT INTO media_links(media_id,entity_type,entity_id,role) VALUES (?,?,?,?)').run(m.id,'post',req.params.id,'attachment');res.status(201).json({ok:true,media:m})}catch(e){console.error(e);res.status(400).json({error:'Bild konnte nicht verarbeitet werden.'})}});

app.post('/api/posts/:id/comments',requireUser,(req,res)=>{
  const p=db.prepare('SELECT community_id FROM posts WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Beitrag nicht gefunden.'});if(!mustBeMember(req.userId,p.community_id))return res.status(403).json({error:'Keine Berechtigung zum Kommentieren.'});if(!hasPermission(req.userId,'community',p.community_id,'content.comment'))return res.status(403).json({error:'Keine Berechtigung zum Kommentieren.'});
  const body=text(req.body?.body,5000);if(!body)return res.status(400).json({error:'Kommentar ist leer.'});
  const commentId='com-'+crypto.randomUUID();db.prepare('INSERT INTO comments(id,post_id,author_id,body) VALUES (?,?,?,?)').run(commentId,req.params.id,req.userId,body);const postMeta=db.prepare('SELECT author_id,community_id FROM posts WHERE id=?').get(req.params.id);const owner=postMeta?.author_id;if(owner&&owner!==req.userId)notify(owner,'comment','Neue Antwort auf deinen Beitrag',`${getUserSafe(req.userId)?.name||'Jemand'} hat kommentiert.`,'post',req.params.id);let federated=0,groupFederated=0;try{if(baseUrl()){const note=noteForLocalComment(db,commentId);if(note){federated=queueActivityForFollowers(db,req.userId,createActivityForNote(note));if(postMeta?.community_id)groupFederated=queueActivityForSpaceFollowers(db,postMeta.community_id,announceActivityForGroup(db,postMeta.community_id,note));}}}catch(e){console.warn('Comment federation enqueue:',e.message)}res.status(201).json({ok:true,commentId,federatedDeliveries:federated,groupFederatedDeliveries:groupFederated});
});

app.post('/api/posts/:id/comments-with-media',requireUser,upload.single('image'),async(req,res)=>{
  const p=db.prepare('SELECT community_id,author_id FROM posts WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Beitrag nicht gefunden.'});if(!mustBeMember(req.userId,p.community_id))return res.status(403).json({error:'Keine Berechtigung zum Kommentieren.'});if(!hasPermission(req.userId,'community',p.community_id,'content.comment'))return res.status(403).json({error:'Keine Berechtigung zum Kommentieren.'});
  const body=text(req.body?.body,5000);if(!body)return res.status(400).json({error:'Kommentar ist leer.'});
  if(!req.file)return res.status(400).json({error:'Bitte ein unterstütztes Bild auswählen.'});
  const commentId='com-'+crypto.randomUUID();let media=null;
  try{
    media=await persistImage(req.file,req.userId);
    db.transaction(()=>{db.prepare('INSERT INTO comments(id,post_id,author_id,body) VALUES (?,?,?,?)').run(commentId,req.params.id,req.userId,body);db.prepare('INSERT INTO media_links(media_id,entity_type,entity_id,role) VALUES (?,?,?,?)').run(media.id,'comment',commentId,'attachment');})();
  }catch(e){
    if(media?.id){try{db.prepare('DELETE FROM media WHERE id=?').run(media.id)}catch{}for(const u of Object.values(media.variants||{})){try{fs.unlinkSync(path.join(uploadDir,path.basename(u)))}catch{}}}
    console.error('Comment media create:',e);return res.status(400).json({error:'Kommentar mit Bild konnte nicht erstellt werden.'});
  }
  const owner=p.author_id;if(owner&&owner!==req.userId)notify(owner,'comment','Neue Antwort auf deinen Beitrag',`${getUserSafe(req.userId)?.name||'Jemand'} hat kommentiert.`,'post',req.params.id);
  let federated=0,groupFederated=0;try{if(baseUrl()){const note=noteForLocalComment(db,commentId);if(note){federated=queueActivityForFollowers(db,req.userId,createActivityForNote(note));groupFederated=queueActivityForSpaceFollowers(db,p.community_id,announceActivityForGroup(db,p.community_id,note));}}}catch(e){console.warn('Comment federation enqueue:',e.message)}
  res.status(201).json({ok:true,commentId,media,federatedDeliveries:federated,groupFederatedDeliveries:groupFederated});
});


app.put('/api/posts/:id',requireUser,(req,res)=>{
  const p=db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Beitrag nicht gefunden.'});if(p.author_id!==req.userId||!hasPermission(req.userId,'community',p.community_id,'content.create'))return res.status(403).json({error:'Keine Berechtigung, den Beitrag zu bearbeiten.'});
  const body=text(req.body?.body,5000);if(!body)return res.status(400).json({error:'Der Beitrag ist leer.'});db.prepare('UPDATE posts SET body=? WHERE id=?').run(body,p.id);let federated=0;try{if(baseUrl()){const note=noteForLocalPost(db,p.id);if(note)federated=queueActivityForFollowers(db,req.userId,updateActivityForNote(note));}}catch(e){console.warn('Post update federation:',e.message)}res.json({ok:true,federatedDeliveries:federated});
});
app.delete('/api/posts/:id',requireUser,(req,res)=>{
  const p=db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Beitrag nicht gefunden.'});if(p.author_id!==req.userId)return res.status(403).json({error:'Nur der Autor darf den Beitrag löschen.'});let activity=null;try{if(baseUrl()&&noteForLocalPost(db,p.id))activity=deleteActivityForObject(req.userId,`${baseUrl()}/ap/objects/posts/${encodeURIComponent(p.id)}`)}catch{}db.prepare('DELETE FROM posts WHERE id=?').run(p.id);let federated=0;try{if(activity)federated=queueActivityForFollowers(db,req.userId,activity)}catch(e){console.warn('Post delete federation:',e.message)}res.json({ok:true,federatedDeliveries:federated});
});
app.put('/api/comments/:id',requireUser,(req,res)=>{
  const c=db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Kommentar nicht gefunden.'});if(c.author_id!==req.userId||!hasPermission(req.userId,'community',db.prepare('SELECT community_id FROM posts WHERE id=?').get(c.post_id)?.community_id,'content.comment'))return res.status(403).json({error:'Keine Berechtigung, den Kommentar zu bearbeiten.'});const body=text(req.body?.body,5000);if(!body)return res.status(400).json({error:'Kommentar ist leer.'});db.prepare('UPDATE comments SET body=? WHERE id=?').run(body,c.id);let federated=0;try{if(baseUrl()){const note=noteForLocalComment(db,c.id);if(note)federated=queueActivityForFollowers(db,req.userId,updateActivityForNote(note));}}catch(e){console.warn('Comment update federation:',e.message)}res.json({ok:true,federatedDeliveries:federated});
});
app.delete('/api/comments/:id',requireUser,(req,res)=>{
  const c=db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Kommentar nicht gefunden.'});if(c.author_id!==req.userId)return res.status(403).json({error:'Nur der Autor darf den Kommentar löschen.'});let activity=null;try{if(baseUrl()&&noteForLocalComment(db,c.id))activity=deleteActivityForObject(req.userId,`${baseUrl()}/ap/objects/comments/${encodeURIComponent(c.id)}`)}catch{}db.prepare('DELETE FROM comments WHERE id=?').run(c.id);let federated=0;try{if(activity)federated=queueActivityForFollowers(db,req.userId,activity)}catch(e){console.warn('Comment delete federation:',e.message)}res.json({ok:true,federatedDeliveries:federated});
});
app.get('/api/federation/remote-objects',(req,res)=>{
  const rows=db.prepare(`SELECT object_uri,object_type,actor_uri,origin_host,in_reply_to,content_text,published_at,lifecycle_state,moderation_state,first_seen_at,updated_at FROM federation_remote_objects WHERE lifecycle_state='active' AND moderation_state='active' ORDER BY datetime(first_seen_at) DESC LIMIT 100`).all();const userId=currentUserId(req);res.json(rows.filter(r=>remoteObjectVisible(r.object_uri,userId)));
});

app.post('/api/communities/:id/polls',requireUser,(req,res)=>{
  if(!mustBeMember(req.userId,req.params.id))return res.status(403).json({error:'Keine Berechtigung zum Erstellen.'});if(!hasPermission(req.userId,'community',req.params.id,'content.create'))return res.status(403).json({error:'Keine Berechtigung zum Erstellen.'});
  const question=text(req.body?.question,500);const options=(Array.isArray(req.body?.options)?req.body.options:[]).map(x=>text(x,300)).filter(Boolean);
  if(!question||options.length<2)return res.status(400).json({error:'Frage und mindestens zwei Antwortoptionen erforderlich.'});
  db.transaction(()=>{const id='poll-'+crypto.randomUUID();db.prepare('INSERT INTO polls(id,community_id,author_id,question) VALUES (?,?,?,?)').run(id,req.params.id,req.userId,question);const io=db.prepare('INSERT INTO poll_options(id,poll_id,label) VALUES (?,?,?)');options.forEach(x=>io.run('opt-'+crypto.randomUUID(),id,x));})();res.status(201).json({ok:true});
});
app.post('/api/polls/:pollId/vote',requireUser,(req,res)=>{
  const optionId=String(req.body?.optionId||'');const x=db.prepare('SELECT p.community_id,o.poll_id FROM poll_options o JOIN polls p ON p.id=o.poll_id WHERE o.id=? AND o.poll_id=?').get(optionId,req.params.pollId);if(!x)return res.status(404).json({error:'Option nicht gefunden.'});if(!mustBeMember(req.userId,x.community_id))return res.status(403).json({error:'Keine Berechtigung zum Abstimmen.'});if(!hasPermission(req.userId,'community',x.community_id,'participation.interact'))return res.status(403).json({error:'Keine Berechtigung zum Abstimmen.'});
  db.transaction(()=>{const opts=db.prepare('SELECT id FROM poll_options WHERE poll_id=?').all(req.params.pollId).map(x=>x.id);if(opts.length)db.prepare(`DELETE FROM poll_votes WHERE user_id=? AND option_id IN (${opts.map(()=>'?').join(',')})`).run(req.userId,...opts);db.prepare('INSERT INTO poll_votes(option_id,user_id) VALUES (?,?)').run(optionId,req.userId);})();res.json({ok:true});
});




app.get('/api/communities/:id/join-requests',requireUser,(req,res)=>{if(!hasPermission(req.userId,'community',req.params.id,'space.manage_members'))return res.status(403).json({error:'Keine Berechtigung.'});res.json(db.prepare(`SELECT r.user_id,r.status,r.created_at,u.name,u.avatar,u.trust_level FROM community_join_requests r JOIN users u ON u.id=r.user_id WHERE r.community_id=? AND r.status='pending' ORDER BY r.created_at`).all(req.params.id));});
app.post('/api/communities/:id/join-requests/:userId',requireUser,(req,res)=>{if(!hasPermission(req.userId,'community',req.params.id,'space.manage_members'))return res.status(403).json({error:'Keine Berechtigung.'});const decision=req.body?.decision==='approve'?'approved':'rejected';db.transaction(()=>{db.prepare('UPDATE community_join_requests SET status=?,decided_at=CURRENT_TIMESTAMP,decided_by=? WHERE community_id=? AND user_id=?').run(decision,req.userId,req.params.id,req.params.userId);if(decision==='approved')db.prepare("INSERT OR IGNORE INTO memberships(community_id,user_id,role) VALUES (?,?,'member')").run(req.params.id,req.params.userId);})();notify(req.params.userId,'membership',decision==='approved'?'Beitritt bestätigt':'Beitrittsanfrage abgelehnt',db.prepare('SELECT name FROM communities WHERE id=?').get(req.params.id)?.name||'Community','community',req.params.id);res.json({ok:true});});
app.put('/api/communities/:id/access',requireUser,(req,res)=>{
  const current=db.prepare('SELECT * FROM communities WHERE id=?').get(req.params.id);if(!current)return res.status(404).json({error:'Community nicht gefunden.'});
  if(!hasPermission(req.userId,'community',current.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung.'});
  const visibility=req.body?.visibility??current.visibility,join=req.body?.join_policy??current.join_policy,min=Number(req.body?.min_trust_level??current.min_trust_level);
  if(!['public','unlisted','private'].includes(visibility)||!['open','approval','invite','trust'].includes(join)||!Number.isInteger(min)||min<1||min>3)return res.status(400).json({error:'Ungültige Zugangsregel.'});
  db.prepare("UPDATE communities SET visibility=?,join_policy=?,min_trust_level=?,federation_mode=CASE WHEN ?='public' THEN federation_mode WHEN federation_mode='public' THEN 'selected' ELSE federation_mode END WHERE id=?").run(visibility,join,min,visibility,current.id);
  res.json(communityDetail(current.id,req.userId));
});
app.put('/api/events/:id/schedule',requireUser,(req,res)=>{
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);if(!e)return res.status(404).json({error:'Veranstaltung nicht gefunden.'});if(!hasPermission(req.userId,'event',e.id,'space.edit_profile'))return res.status(403).json({error:'Keine Berechtigung.'});if(e.source!=='native')return res.status(400).json({error:'Externe Veranstaltungen werden an ihrer Quelle geändert.'});
  const start=isoDateTimeWithZone(req.body?.start_at),end=isoDateTimeWithZone(req.body?.end_at);if(!start||!end||Date.parse(end)<Date.parse(start)||Date.parse(end)-Date.parse(start)>366*24*60*60*1000)return res.status(400).json({error:'Start und Ende müssen gültige ISO-Zeitpunkte mit Zeitzone sein.'});
  const timezone=text(req.body?.timezone,80)||'Europe/Berlin';const label=text(req.body?.date_label,120)||start;db.prepare('UPDATE events SET start_at=?,end_at=?,timezone=?,date_label=? WHERE id=?').run(start,end,timezone,label,e.id);if(baseUrl())queueEventFederation(db,e.id,'Update');res.json(eventDetail(e.id,req.userId));
});
app.put('/api/events/:id/federation',requireUser,(req,res)=>{
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);if(!e)return res.status(404).json({error:'Veranstaltung nicht gefunden.'});if(!hasPermission(req.userId,'event',e.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung.'});if(e.source!=='native')return res.status(400).json({error:'Externe Veranstaltungen werden von ihrer Quelle föderiert.'});
  const state=['inherit','enabled','disabled'].includes(req.body?.state)?req.body.state:null;if(!state)return res.status(400).json({error:'Ungültige Fediverse-Einstellung.'});db.prepare('UPDATE events SET federation_state=? WHERE id=?').run(state,e.id);const decision=eventFederationDecision(db,e.id);if(baseUrl()&&decision.allowed)queueEventFederation(db,e.id,'Update');res.json({ok:true,federation_state:state,decision});
});
app.put('/api/communities/:id/federation/remote-event-moderation',requireUser,(req,res)=>{
  const c=db.prepare('SELECT id FROM communities WHERE id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Community nicht gefunden.'});if(!hasPermission(req.userId,'community',c.id,'moderation.act'))return res.status(403).json({error:'Keine Berechtigung für Moderationsmaßnahmen.'});const eventId=text(req.body?.event_id,120),action=['hide','remove','restore'].includes(req.body?.action)?req.body.action:null;const e=db.prepare("SELECT * FROM events WHERE id=? AND source='external' AND owner_space_id=?").get(eventId,c.id);if(!e||!action)return res.status(404).json({error:'Föderierte Veranstaltung nicht gefunden.'});const state=action==='hide'?'hidden':action==='remove'?'removed':'active';db.prepare('UPDATE events SET federation_moderation_state=? WHERE id=?').run(state,e.id);res.json({ok:true,event_id:e.id,moderation_state:state});
});
function localEventIdFromActivityObject(object){
  const uri=typeof object==='string'?object:object?.id;if(!uri||!baseUrl())return null;
  const prefix=`${baseUrl()}/ap/objects/events/`;if(!uri.startsWith(prefix))return null;
  try{return decodeURIComponent(uri.slice(prefix.length))}catch{return null}
}
function eventFederationActor(e){
  if(!baseUrl())return null;
  return e.owner_space_id?spaceActorId(e.owner_space_id):(e.created_by?actorId(e.created_by):null);
}
async function deliverEventAttendanceDecision(e,row,decision){
  const localActor=eventFederationActor(e);if(!localActor||!row?.remote_inbox_uri)return false;
  let joinObj;try{joinObj=JSON.parse(row.join_activity_json||'{}')}catch{joinObj={id:row.join_activity_uri,type:'Join',actor:row.remote_actor_uri,object:`${baseUrl()}/ap/objects/events/${encodeURIComponent(e.id)}`}}
  const activity=attendanceDecisionActivity(localActor,row.remote_actor_uri,joinObj,decision);
  if(e.owner_space_id)await deliverSpaceActivity(db,e.owner_space_id,row.remote_inbox_uri,activity);else await deliverActivity(db,e.created_by,row.remote_inbox_uri,activity);
  return true;
}
async function handleRemoteEventJoinLeave({activity,remote,localEventId,receiverType,receiverId}){
  const e=db.prepare("SELECT * FROM events WHERE id=? AND source='native'").get(localEventId);if(!e)return {accepted:false,reason:'event_not_found'};
  if(receiverType==='space'&&e.owner_space_id!==receiverId)return {accepted:false,reason:'wrong_space_inbox'};
  if(receiverType==='user'&&(e.owner_space_id||e.created_by!==receiverId))return {accepted:false,reason:'wrong_user_inbox'};
  if(activity.type==='Leave'){
    db.prepare('DELETE FROM event_remote_attendance WHERE event_id=? AND remote_actor_uri=?').run(e.id,remote.id);
    return {accepted:true,status:'left'};
  }
  if(activity.type!=='Join')return {accepted:false,reason:'unsupported'};
  let status='requested';
  if(e.attendance_policy==='open'){
    const count=Number(db.prepare("SELECT COUNT(*) n FROM event_attendance WHERE event_id=? AND status='going'").get(e.id).n||0)+Number(db.prepare("SELECT COUNT(*) n FROM event_remote_attendance WHERE event_id=? AND status='going' AND remote_actor_uri<>?").get(e.id,remote.id).n||0);
    status=e.max_participants&&count>=Number(e.max_participants)?'waitlist':'going';
  } else if(e.attendance_policy!=='approval') status='rejected';
  db.prepare(`INSERT INTO event_remote_attendance(event_id,remote_actor_uri,remote_inbox_uri,status,join_activity_uri,join_activity_json) VALUES (?,?,?,?,?,?) ON CONFLICT(event_id,remote_actor_uri) DO UPDATE SET remote_inbox_uri=excluded.remote_inbox_uri,status=excluded.status,join_activity_uri=excluded.join_activity_uri,join_activity_json=excluded.join_activity_json,updated_at=CURRENT_TIMESTAMP`).run(e.id,remote.id,remote.inbox||remote.endpoints?.sharedInbox||'',status,String(activity.id||''),JSON.stringify(activity));
  const row=db.prepare('SELECT * FROM event_remote_attendance WHERE event_id=? AND remote_actor_uri=?').get(e.id,remote.id);
  if(status==='going')await deliverEventAttendanceDecision(e,row,'Accept');
  if(status==='rejected')await deliverEventAttendanceDecision(e,row,'Reject');
  return {accepted:true,status};
}

app.get('/api/events/:id/attendance-management',requireUser,(req,res)=>{
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);if(!e)return res.status(404).json({error:'Event nicht gefunden.'});
  if(!hasPermission(req.userId,'event',e.id,'event.manage_participants'))return res.status(403).json({error:'Keine Berechtigung zur Teilnahmeverwaltung.'});
  const local=db.prepare(`SELECT a.user_id,a.status,a.created_at,a.updated_at,u.name,u.avatar,u.trust_level FROM event_attendance a JOIN users u ON u.id=a.user_id WHERE a.event_id=? ORDER BY CASE a.status WHEN 'requested' THEN 0 WHEN 'waitlist' THEN 1 ELSE 2 END, datetime(a.created_at)`).all(e.id);
  const remote=db.prepare(`SELECT remote_actor_uri,status,created_at,updated_at FROM event_remote_attendance WHERE event_id=? ORDER BY CASE status WHEN 'requested' THEN 0 WHEN 'waitlist' THEN 1 ELSE 2 END, datetime(created_at)`).all(e.id);
  res.json({event_id:e.id,local,remote,max_participants:e.max_participants||null,attendance_policy:e.attendance_policy});
});
app.put('/api/events/:id/attendance/:kind/:subject',requireUser,async(req,res)=>{
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);if(!e)return res.status(404).json({error:'Event nicht gefunden.'});
  if(!hasPermission(req.userId,'event',e.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung zur Teilnahmeverwaltung.'});
  const decision=req.body?.decision==='approve'?'approve':req.body?.decision==='reject'?'reject':null;if(!decision)return res.status(400).json({error:'Ungültige Entscheidung.'});
  if(req.params.kind==='local'){
    const row=db.prepare('SELECT * FROM event_attendance WHERE event_id=? AND user_id=?').get(e.id,req.params.subject);if(!row)return res.status(404).json({error:'Teilnahmeanfrage nicht gefunden.'});
    if(decision==='reject'){db.prepare('DELETE FROM event_attendance WHERE event_id=? AND user_id=?').run(e.id,req.params.subject);notify(req.params.subject,'event','Teilnahmeanfrage abgelehnt',e.name,'event',e.id);}
    else {let status='going';if(e.max_participants){const n=db.prepare("SELECT COUNT(*) n FROM event_attendance WHERE event_id=? AND status='going' AND user_id<>?").get(e.id,req.params.subject).n;if(n>=e.max_participants)status='waitlist';}db.prepare('UPDATE event_attendance SET status=?,updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND user_id=?').run(status,e.id,req.params.subject);notify(req.params.subject,'event',status==='going'?'Teilnahme bestätigt':'Auf Warteliste gesetzt',e.name,'event',e.id);}
  } else if(req.params.kind==='remote'){
    const actor=req.params.subject;const row=db.prepare('SELECT * FROM event_remote_attendance WHERE event_id=? AND remote_actor_uri=?').get(e.id,actor);if(!row)return res.status(404).json({error:'Föderierte Teilnahmeanfrage nicht gefunden.'});
    let status=decision==='reject'?'rejected':'going';if(decision==='approve'&&e.max_participants){const n=Number(db.prepare("SELECT COUNT(*) n FROM event_attendance WHERE event_id=? AND status='going'").get(e.id).n||0)+Number(db.prepare("SELECT COUNT(*) n FROM event_remote_attendance WHERE event_id=? AND status='going' AND remote_actor_uri<>?").get(e.id,actor).n||0);if(n>=e.max_participants)status='waitlist';}
    db.prepare('UPDATE event_remote_attendance SET status=?,updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND remote_actor_uri=?').run(status,e.id,actor);
    if(status==='going')await deliverEventAttendanceDecision(e,row,'Accept');else if(status==='rejected')await deliverEventAttendanceDecision(e,row,'Reject');
  } else return res.status(400).json({error:'Ungültiger Teilnehmertyp.'});
  res.json({ok:true});
});
app.post('/api/events/:id/rsvp',requireUser,async(req,res)=>{
  const e=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if(!e)return res.status(404).json({error:'Event nicht gefunden.'});
  const access=canRequestEventAttendance(e,req.userId);
  if(!access.ok){
    if(access.reason==='trust')return res.status(403).json({error:`Mindestens Verifizierungsstufe ${e.min_trust_level} erforderlich.`});
    if(access.reason==='members')return res.status(403).json({error:'Teilnahme nur für Mitglieder der verknüpften Community.'});
    if(access.reason==='invite')return res.status(403).json({error:'Teilnahme nur per Einladung.'});
    return res.status(403).json({error:'Keine Berechtigung, für dieses Event eine Teilnahme anzufragen.'});
  }
  let status=['going','maybe'].includes(req.body?.status)?req.body.status:'going';
  if(e.source==='external'&&e.remote_uri&&e.remote_actor_uri){
    if(status==='maybe'){db.prepare(`INSERT INTO event_attendance(event_id,user_id,status,federation_state) VALUES (?,?,?,'local') ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,federation_state='local',updated_at=CURRENT_TIMESTAMP`).run(e.id,req.userId,'maybe');return res.json({ok:true,status:'maybe',federated:false});}
    if(!isUserFederationEnabled(db,req.userId))return res.status(409).json({error:'Für eine föderierte Teilnahme muss dein Fediverse-Profil in den Privatsphäre-Einstellungen aktiviert sein.'});
    const peer=evaluatePeer(db,{uri:e.remote_actor_uri,spaceId:e.owner_space_id||null,direction:'outbound',action:'write'});if(!peer.allowed)return res.status(403).json({error:'Diese Fediverse-Verbindung erlaubt aktuell keine Teilnahmeaktion.'});
    const fetched=await fetchActor(e.remote_actor_uri);const inbox=fetched.actor.inbox||fetched.actor.endpoints?.sharedInbox;if(!inbox)return res.status(502).json({error:'Die Gegenstelle stellt keinen erreichbaren Posteingang bereit.'});
    const join=joinActivityForEvent(req.userId,e.remote_uri,e.remote_actor_uri);await deliverActivity(db,req.userId,inbox,join);
    db.prepare(`INSERT INTO event_attendance(event_id,user_id,status,federation_state,join_activity_uri) VALUES (?,?,'requested','pending',?) ON CONFLICT(event_id,user_id) DO UPDATE SET status='requested',federation_state='pending',join_activity_uri=excluded.join_activity_uri,updated_at=CURRENT_TIMESTAMP`).run(e.id,req.userId,join.id);
    return res.json({ok:true,status:'requested',federated:true});
  }
  if(e.attendance_policy==='approval')status='requested';
  if(status==='going'&&e.max_participants){const n=Number(db.prepare("SELECT COUNT(*) n FROM event_attendance WHERE event_id=? AND status='going' AND user_id<>?").get(e.id,req.userId).n||0)+Number(db.prepare("SELECT COUNT(*) n FROM event_remote_attendance WHERE event_id=? AND status='going'").get(e.id).n||0);if(n>=e.max_participants)status='waitlist';}
  db.prepare(`INSERT INTO event_attendance(event_id,user_id,status,federation_state) VALUES (?,?,?,'local') ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,federation_state='local',updated_at=CURRENT_TIMESTAMP`).run(e.id,req.userId,status);
  res.json({ok:true,status,federated:false});
});
app.delete('/api/events/:id/rsvp',requireUser,async(req,res)=>{const e=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);if(!e)return res.status(404).json({error:'Event nicht gefunden.'});const a=db.prepare('SELECT * FROM event_attendance WHERE event_id=? AND user_id=?').get(e.id,req.userId);if(e.source==='external'&&e.remote_uri&&e.remote_actor_uri&&['pending','accepted'].includes(a?.federation_state)&&isUserFederationEnabled(db,req.userId)){const fetched=await fetchActor(e.remote_actor_uri);const inbox=fetched.actor.inbox||fetched.actor.endpoints?.sharedInbox;if(inbox)await deliverActivity(db,req.userId,inbox,leaveActivityForEvent(req.userId,e.remote_uri,e.remote_actor_uri,a.join_activity_uri||''));}db.prepare('DELETE FROM event_attendance WHERE event_id=? AND user_id=?').run(e.id,req.userId);res.json({ok:true});});
app.put('/api/events/:id/access',requireUser,(req,res)=>{
  const current=db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);if(!current)return res.status(404).json({error:'Veranstaltung nicht gefunden.'});
  if(!hasPermission(req.userId,'event',current.id,'space.manage_access'))return res.status(403).json({error:'Keine Berechtigung, Event-Zugänge zu ändern.'});
  const visibility=req.body?.visibility??current.visibility,policy=req.body?.attendance_policy??current.attendance_policy,min=Number(req.body?.min_trust_level??current.min_trust_level);
  const max=Object.hasOwn(req.body||{},'max_participants')?(req.body.max_participants===null?null:Number(req.body.max_participants)):current.max_participants;
  if(!['public','unlisted','private'].includes(visibility)||!['open','approval','invite','members','trust'].includes(policy)||!Number.isInteger(min)||min<1||min>3||(max!==null&&(!Number.isInteger(max)||max<1||max>100000)))return res.status(400).json({error:'Ungültige Zugangsregel.'});
  db.prepare('UPDATE events SET visibility=?,attendance_policy=?,min_trust_level=?,max_participants=? WHERE id=?').run(visibility,policy,min,max,current.id);
  if(baseUrl())queueEventFederation(db,current.id,'Update');res.json({ok:true});
});
app.post('/api/comments/:id/media',requireUser,upload.single('image'),async(req,res)=>{try{const c=db.prepare('SELECT cm.author_id,p.community_id FROM comments cm JOIN posts p ON p.id=cm.post_id WHERE cm.id=?').get(req.params.id);if(!c)return res.status(404).json({error:'Kommentar nicht gefunden.'});if(c.author_id!==req.userId||!hasPermission(req.userId,'community',c.community_id,'content.comment'))return res.status(403).json({error:'Keine Berechtigung, Medien anzuhängen.'});if(!req.file)return res.status(400).json({error:'Bitte ein Bild auswählen.'});const m=await persistImage(req.file,req.userId);db.prepare('INSERT INTO media_links(media_id,entity_type,entity_id,role) VALUES (?,?,?,?)').run(m.id,'comment',req.params.id,'attachment');res.status(201).json({ok:true,media:m})}catch(e){console.error(e);res.status(400).json({error:'Bild konnte nicht verarbeitet werden.'})}});
app.post('/api/media/event/:id',requireUser,upload.single('image'),async(req,res)=>{try{const ev=db.prepare('SELECT created_by FROM events WHERE id=?').get(req.params.id);if(!ev)return res.status(404).json({error:'Event nicht gefunden.'});if(!hasPermission(req.userId,'event',req.params.id,'space.edit_profile'))return res.status(403).json({error:'Keine Berechtigung, das Eventbild zu ändern.'});if(!req.file)return res.status(400).json({error:'Bitte ein Bild auswählen.'});const m=await persistImage(req.file,req.userId);linkMedia(m.id,'event',req.params.id,'cover');res.status(201).json({ok:true,media:m})}catch(e){console.error(e);res.status(400).json({error:'Bild konnte nicht verarbeitet werden.'})}});

// v0.8.7.1 Space Creation & Modular Setup – private-by-default, server-side access checks.
app.get('/api/messages/conversations',requireUser,(req,res)=>{const rows=db.prepare(`SELECT c.* FROM conversations c JOIN conversation_members cm ON cm.conversation_id=c.id WHERE cm.user_id=? AND (c.expires_at IS NULL OR datetime(c.expires_at)>datetime('now')) ORDER BY COALESCE((SELECT MAX(created_at) FROM messages m WHERE m.conversation_id=c.id),c.created_at) DESC`).all(req.userId);res.json(rows.map(c=>conversationSummary(c,req.userId)))});
app.post('/api/messages/conversations',requireUser,(req,res)=>{const type=['direct','group','context'].includes(req.body?.type)?req.body.type:'direct';let memberIds=[...new Set(safeArray(req.body?.member_ids,30).map(x=>text(x,80)).filter(Boolean))];if(req.body?.direct_user_id)memberIds=[text(req.body.direct_user_id,80)];memberIds=memberIds.filter(x=>x!==req.userId);if(type==='direct'){if(memberIds.length!==1)return res.status(400).json({error:'Für einen Direktchat genau eine Person wählen.'});const gate=canDM(req.userId,memberIds[0]);if(!gate.ok)return res.status(403).json({error:gate.error});const existing=db.prepare(`SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=? JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=? WHERE c.type='direct' AND (SELECT COUNT(*) FROM conversation_members x WHERE x.conversation_id=c.id)=2 LIMIT 1`).get(req.userId,memberIds[0]);if(existing)return res.json(conversationSummary(db.prepare('SELECT * FROM conversations WHERE id=?').get(existing.id),req.userId));}else{const denied=memberIds.filter(id=>!canGroupInvite(req.userId,id));if(denied.length)return res.status(403).json({error:'Mindestens eine Person erlaubt diese Gruppeneinladung nicht.'});}
 const id='cv-'+crypto.randomUUID(),expires=text(req.body?.expires_at,40)||null,title=text(req.body?.title,100);const contextType=['community','project','event'].includes(req.body?.context_type)?req.body.context_type:null,contextId=contextType?text(req.body?.context_id,120):null;db.transaction(()=>{db.prepare('INSERT INTO conversations(id,type,title,created_by,context_type,context_id,expires_at) VALUES (?,?,?,?,?,?,?)').run(id,type,title,req.userId,contextType,contextId,expires);db.prepare("INSERT INTO conversation_members(conversation_id,user_id,role,last_read_at) VALUES (?,?,'owner',CURRENT_TIMESTAMP)").run(id,req.userId);memberIds.forEach(uid=>db.prepare("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES (?,?,'member')").run(id,uid));})();memberIds.forEach(uid=>notify(uid,'message','Neue Unterhaltung',title||'Du wurdest zu einer Unterhaltung hinzugefügt.','conversation',id));res.status(201).json(conversationSummary(db.prepare('SELECT * FROM conversations WHERE id=?').get(id),req.userId))});
app.get('/api/messages/conversations/:id',requireUser,(req,res)=>{const c=activeConversation(req.params.id);if(!c||!conversationMember(req.userId,c.id))return res.status(404).json({error:'Unterhaltung nicht gefunden.'});const messages=db.prepare(`SELECT m.*,u.name sender_name,u.avatar sender_avatar,u.trust_level sender_trust FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=? ORDER BY datetime(m.created_at),m.rowid LIMIT 300`).all(c.id).map(m=>messageView(m,req.userId));res.json({...conversationSummary(c,req.userId),messages})});
app.post('/api/messages/conversations/:id/read',requireUser,(req,res)=>{if(!conversationMember(req.userId,req.params.id))return res.status(404).json({error:'Unterhaltung nicht gefunden.'});db.prepare('UPDATE conversation_members SET last_read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND user_id=?').run(req.params.id,req.userId);res.json({ok:true})});
app.post('/api/messages/conversations/:id/messages',requireUser,(req,res)=>{const c=activeConversation(req.params.id);if(!c||!conversationMember(req.userId,c.id))return res.status(404).json({error:'Unterhaltung nicht gefunden.'});const body=text(req.body?.body,6000);if(!body)return res.status(400).json({error:'Nachricht ist leer.'});const others=db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>?').all(c.id,req.userId);if(others.some(x=>isBlocked(req.userId,x.user_id)))return res.status(403).json({error:'Nachrichten in dieser Unterhaltung sind wegen einer Blockierung nicht möglich.'});const reply=text(req.body?.reply_to_id,120)||null;if(reply&&!db.prepare('SELECT 1 FROM messages WHERE id=? AND conversation_id=? AND deleted_at IS NULL').get(reply,c.id))return res.status(400).json({error:'Antwortreferenz ungültig.'});const id='msg-'+crypto.randomUUID();db.prepare('INSERT INTO messages(id,conversation_id,sender_id,body,reply_to_id) VALUES (?,?,?,?,?)').run(id,c.id,req.userId,body,reply);db.prepare('UPDATE conversation_members SET last_read_at=CURRENT_TIMESTAMP WHERE conversation_id=? AND user_id=?').run(c.id,req.userId);others.forEach(x=>{const p=prefFor(x.user_id);if(p.notify_messages!==0)notify(x.user_id,'message','Neue Nachricht',body.slice(0,120),'conversation',c.id)});res.status(201).json(messageView(db.prepare(`SELECT m.*,u.name sender_name,u.avatar sender_avatar,u.trust_level sender_trust FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?`).get(id),req.userId))});
app.post('/api/messages/conversations/:id/images',requireUser,privateImageUpload.single('image'),async(req,res)=>{try{const c=activeConversation(req.params.id);if(!c||!conversationMember(req.userId,c.id))return res.status(404).json({error:'Unterhaltung nicht gefunden.'});if(!req.file)return res.status(400).json({error:'Bitte ein unterstütztes Bild auswählen.'});const others=db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>?').all(c.id,req.userId);if(others.some(x=>isBlocked(req.userId,x.user_id)))return res.status(403).json({error:'Nachrichten in dieser Unterhaltung sind wegen einer Blockierung nicht möglich.'});const media=await persistPrivateImage(req.file,req.userId);const body=text(req.body?.body,1200);const id='msg-'+crypto.randomUUID();db.transaction(()=>{db.prepare('INSERT INTO messages(id,conversation_id,sender_id,body) VALUES (?,?,?,?)').run(id,c.id,req.userId,body);db.prepare('INSERT INTO message_media(message_id,media_id) VALUES (?,?)').run(id,media.id);})();others.forEach(x=>{const p=prefFor(x.user_id);if(p.notify_messages!==0)notify(x.user_id,'message','Neues Bild in einer Unterhaltung',body.slice(0,100),'conversation',c.id)});res.status(201).json(messageView(db.prepare(`SELECT m.*,u.name sender_name,u.avatar sender_avatar,u.trust_level sender_trust FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?`).get(id),req.userId))}catch(e){console.error(e);res.status(400).json({error:'Privates Bild konnte nicht verarbeitet werden.'})}});
app.get('/api/private-media/:id',requireUser,(req,res)=>{const m=db.prepare('SELECT * FROM private_media WHERE id=?').get(req.params.id);if(!m)return res.status(404).end();const allowed=db.prepare(`SELECT 1 FROM message_media mm JOIN messages msg ON msg.id=mm.message_id JOIN conversation_members cm ON cm.conversation_id=msg.conversation_id JOIN conversations cv ON cv.id=msg.conversation_id WHERE mm.media_id=? AND cm.user_id=? AND msg.deleted_at IS NULL AND (cv.expires_at IS NULL OR datetime(cv.expires_at)>datetime('now')) LIMIT 1`).get(m.id,req.userId);if(!allowed)return res.status(404).end();const file=path.join(privateUploadDir,m.storage_key);if(!fs.existsSync(file))return res.status(404).end();res.setHeader('Cache-Control','private, no-store');res.type(m.mime_type).sendFile(file)});
app.delete('/api/messages/:id',requireUser,(req,res)=>{const m=db.prepare(`SELECT m.*,u.name sender_name,u.avatar sender_avatar,u.trust_level sender_trust FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?`).get(req.params.id);if(!m||!conversationMember(req.userId,m.conversation_id))return res.status(404).json({error:'Nachricht nicht gefunden.'});if(m.sender_id!==req.userId)return res.status(403).json({error:'Nur der Verfasser darf diese Nachricht löschen.'});if(!m.deleted_at){const media=db.prepare(`SELECT pm.id,pm.storage_key FROM message_media mm JOIN private_media pm ON pm.id=mm.media_id WHERE mm.message_id=?`).all(m.id);db.transaction(()=>{media.forEach(item=>queueFile(db,'private',item.storage_key,'message_deletion'));db.prepare('DELETE FROM message_reactions WHERE message_id=?').run(m.id);media.forEach(item=>db.prepare('DELETE FROM private_media WHERE id=?').run(item.id));db.prepare("UPDATE messages SET body='',deleted_at=CURRENT_TIMESTAMP WHERE id=?").run(m.id)})();const files=processPrivacyFileDeletionQueue(db,{privateUploadDir,publicUploadDir:uploadDir});const row=db.prepare(`SELECT m.*,u.name sender_name,u.avatar sender_avatar,u.trust_level sender_trust FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?`).get(m.id);return res.json({ok:true,message:messageView(row,req.userId),media_cleanup:files})}res.json({ok:true,already_deleted:true,message:messageView(m,req.userId)})});
app.post('/api/messages/:id/reactions',requireUser,(req,res)=>{const m=db.prepare('SELECT conversation_id FROM messages WHERE id=? AND deleted_at IS NULL').get(req.params.id);if(!m||!activeConversation(m.conversation_id)||!conversationMember(req.userId,m.conversation_id))return res.status(404).json({error:'Nachricht nicht gefunden.'});const emoji=text(req.body?.emoji,8);if(!['👍','❤️','😂','👏','✅','🤔'].includes(emoji))return res.status(400).json({error:'Reaktion nicht unterstützt.'});const x=db.prepare('SELECT 1 FROM message_reactions WHERE message_id=? AND user_id=? AND emoji=?').get(req.params.id,req.userId,emoji);if(x)db.prepare('DELETE FROM message_reactions WHERE message_id=? AND user_id=? AND emoji=?').run(req.params.id,req.userId,emoji);else db.prepare('INSERT INTO message_reactions(message_id,user_id,emoji) VALUES (?,?,?)').run(req.params.id,req.userId,emoji);res.json({ok:true})});
app.post('/api/users/:id/block',requireUser,(req,res)=>{const id=text(req.params.id,80);if(id===req.userId)return res.status(400).json({error:'Du kannst dich nicht selbst blockieren.'});if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(id))return res.status(404).json({error:'Person nicht gefunden.'});const [a,b]=friendshipPair(req.userId,id);db.transaction(()=>{db.prepare('INSERT OR IGNORE INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)').run(req.userId,id);db.prepare('DELETE FROM user_friendships WHERE user_a=? AND user_b=?').run(a,b);db.prepare("DELETE FROM user_follows WHERE target_type='person' AND ((user_id=? AND target_id=?) OR (user_id=? AND target_id=?))").run(req.userId,id,id,req.userId);})();res.json({ok:true,following:followsForUser(req.userId)})});
app.delete('/api/users/:id/block',requireUser,(req,res)=>{db.prepare('DELETE FROM user_blocks WHERE blocker_id=? AND blocked_id=?').run(req.userId,req.params.id);res.json({ok:true})});
app.get('/api/blocks',requireUser,(req,res)=>res.json(db.prepare(`SELECT u.id,u.name,u.avatar,u.trust_level FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=? ORDER BY u.name`).all(req.userId)));

app.get('/api/participation/:id',(req,res)=>{const x=participationDetail(req.params.id,currentUserId(req));if(!x)return res.status(404).json({error:'Beteiligungsvorgang nicht gefunden.'});res.json(x);});
app.post('/api/participation',requireUser,requireTrust(2),(req,res)=>{
  const {name,type='Beteiligungsprozess',level='Space',institution='',status='offen',deadline='',description='',places=[],topics=[],communities=[],projects=[],modules={},info={},poll=null,vote=null,phases=[],process_model='participation',min_participant_trust=1,visibility='public',access_policy='open',min_trust_level=1,owner_space_id=null,propagation_scope=null}=req.body||{};
  const pls=cleanPlaces(places),tps=cleanTopics(topics);
  if(!text(name,160)||!pls.length)return res.status(400).json({error:'Name und mindestens ein Ort sind erforderlich.'});
  const validPlaces=db.prepare(`SELECT id,name FROM places WHERE id IN (${pls.map(()=>'?').join(',')})`).all(...pls);if(validPlaces.length!==pls.length)return res.status(400).json({error:'Mindestens ein Ort ist ungültig.'});
  const ownerSpace=text(owner_space_id,120)||null;const ownerCheck=validateOwnedSpace(req.userId,ownerSpace);if(ownerCheck?.error)return res.status(403).json({error:ownerCheck.error});const scope=propagationScope(propagation_scope,ownerSpace);
  const id='pa-'+crypto.randomUUID();const enableInfo=modules.info!==false?1:0,enablePoll=modules.poll?1:0,enableVote=modules.vote?1:0,enableProContra=modules.proContra?1:0,enableProposals=modules.proposals?1:0;const minTrust=Math.max(1,Math.min(3,Number(min_participant_trust)||1));const partVisibility=['public','unlisted','private'].includes(visibility)?visibility:'public';const accessPolicy=['open','members','invite','approval','trust'].includes(access_policy)?access_policy:'open';const accessTrust=Math.max(1,Math.min(3,Number(min_trust_level)||1));
  db.transaction(()=>{
    db.prepare(`INSERT INTO participation(id,icon,name,meta,place,level,type,institution,status,deadline,description,source,source_label,created_by,created_at,enable_info,enable_poll,enable_vote,enable_pro_contra,enable_proposals,process_model,phase_mode,min_participant_trust,visibility,access_policy,min_trust_level,owner_space_id,propagation_scope) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,'☑',text(name,160),'PartiUp Beteiligung',validPlaces[0]?.name||'',text(level,80)||'Space',text(type,120)||'Beteiligungsprozess',text(institution,300),status,text(deadline,80),text(description,10000),'native','PartiUp',req.userId,enableInfo,enablePoll,enableVote,enableProContra,enableProposals,['participation','consultation','decision'].includes(process_model)?process_model:'participation',safeArray(phases,12).length?'phased':'simple',minTrust,partVisibility,accessPolicy,accessTrust,ownerSpace,scope);
    const pp=db.prepare('INSERT OR IGNORE INTO participation_places(participation_id,place_id) VALUES (?,?)');pls.forEach(x=>pp.run(id,x));
    const pt=db.prepare('INSERT OR IGNORE INTO participation_topics(participation_id,topic_id) VALUES (?,?)');(tps.length?tps:['Demokratie']).forEach(t=>pt.run(id,ensureTopic(t)));
    const pc=db.prepare('INSERT OR IGNORE INTO participation_communities(participation_id,community_id) VALUES (?,?)');safeArray(communities,50).forEach(c=>{if(db.prepare('SELECT 1 FROM communities WHERE id=?').get(c))pc.run(id,c)});if(ownerSpace)pc.run(id,ownerSpace);
    const pr=db.prepare('INSERT OR IGNORE INTO participation_projects(participation_id,project_id) VALUES (?,?)');safeArray(projects,50).forEach(x=>{if(db.prepare('SELECT 1 FROM projects WHERE id=?').get(x))pr.run(id,x)});
    if(enableInfo&&text(info?.body,12000))db.prepare('INSERT INTO participation_info(id,participation_id,title,body,author_id) VALUES (?,?,?,?,?)').run('pi-'+crypto.randomUUID(),id,text(info?.title,160)||'Information',text(info.body,12000),req.userId);
    const createQuestion=(kind,q)=>{if(!q||!text(q.question,500))return;const opts=safeArray(q.options,12).map(x=>text(x,160)).filter(Boolean);if(opts.length<2)return;const qid='pq-'+crypto.randomUUID();db.prepare('INSERT INTO participation_questions(id,participation_id,kind,question,description,is_binding,closes_at,created_by) VALUES (?,?,?,?,?,?,?,?)').run(qid,id,kind,text(q.question,500),text(q.description,3000),kind==='vote'&&q.is_binding?1:0,text(q.closes_at,80),req.userId);opts.forEach((label,i)=>db.prepare('INSERT INTO participation_question_options(id,question_id,label,sort_order) VALUES (?,?,?,?)').run('pqo-'+crypto.randomUUID(),qid,label,i));};
    if(enablePoll)createQuestion('poll',poll);if(enableVote)createQuestion('vote',vote);
    const cleanPhases=safeArray(phases,12);cleanPhases.forEach((ph,i)=>{const title=text(ph?.title,160);if(!title)return;const phaseType=['information','collection','deliberation','decision','evaluation','results'].includes(ph?.phase_type)?ph.phase_type:'information';const phaseStatus=['planned','active','completed'].includes(ph?.status)?ph.status:(i===0?'active':'planned');db.prepare('INSERT INTO participation_phases(id,participation_id,title,phase_type,description,status,starts_at,ends_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?)').run('pph-'+crypto.randomUUID(),id,title,phaseType,text(ph?.description,3000),phaseStatus,text(ph?.starts_at,80),text(ph?.ends_at,80),i);});
  })();
  res.status(201).json(participationDetail(id,req.userId));
});
function canManageParticipation(userId,id){const p=db.prepare("SELECT * FROM participation WHERE id=? AND source='native'").get(id);return !!(p&&(p.created_by===userId||hasPermission(userId,'participation',id,'participation.manage_access')))}
app.put('/api/participation/:id/access',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p||!canViewParticipation(p,req.userId,{forList:false}))return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!hasPermission(req.userId,'participation',p.id,'participation.manage_access'))return res.status(403).json({error:'Keine Berechtigung.'});const visibility=['public','unlisted','private'].includes(req.body?.visibility)?req.body.visibility:p.visibility;const policy=['open','members','invite','approval','trust'].includes(req.body?.access_policy)?req.body.access_policy:p.access_policy;const min=Math.max(1,Math.min(3,Number(req.body?.min_trust_level)||Number(p.min_trust_level)||1));db.prepare('UPDATE participation SET visibility=?,access_policy=?,min_trust_level=? WHERE id=?').run(visibility,policy,min,p.id);res.json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/access-request',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});const gate=canRequestParticipationAccess(req.userId,p);if(!gate.ok)return res.status(403).json({error:'Keine Berechtigung, Zugang anzufragen.'});db.prepare(`INSERT INTO participation_access(participation_id,user_id,status) VALUES (?,?,?) ON CONFLICT(participation_id,user_id) DO UPDATE SET status=excluded.status,updated_at=CURRENT_TIMESTAMP`).run(p.id,req.userId,gate.status);res.json({ok:true,status:gate.status});});
app.put('/api/participation/:id/access/:userId',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p||!canViewParticipation(p,req.userId,{forList:false}))return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!hasPermission(req.userId,'participation',p.id,'participation.manage_access'))return res.status(403).json({error:'Keine Berechtigung.'});const status=['invited','approved','rejected'].includes(req.body?.status)?req.body.status:null;if(!status)return res.status(400).json({error:'Ungültiger Zugangsstatus.'});const target=text(req.params.userId,120);if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(target))return res.status(404).json({error:'Person nicht gefunden.'});db.prepare(`INSERT INTO participation_access(participation_id,user_id,status,decided_by) VALUES (?,?,?,?) ON CONFLICT(participation_id,user_id) DO UPDATE SET status=excluded.status,decided_by=excluded.decided_by,updated_at=CURRENT_TIMESTAMP`).run(p.id,target,status,req.userId);res.json({ok:true,status});});
app.post('/api/participation/:id/phases',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!canManageParticipation(req.userId,p.id))return res.status(403).json({error:'Keine Berechtigung, Phasen zu verwalten.'});const title=text(req.body?.title,160),phaseType=['information','collection','deliberation','decision','evaluation','results'].includes(req.body?.phase_type)?req.body.phase_type:'information';if(!title)return res.status(400).json({error:'Phasentitel fehlt.'});const n=db.prepare('SELECT COUNT(*) n FROM participation_phases WHERE participation_id=?').get(p.id).n;db.prepare('INSERT INTO participation_phases(id,participation_id,title,phase_type,description,status,starts_at,ends_at,sort_order) VALUES (?,?,?,?,?,?,?,?,?)').run('pph-'+crypto.randomUUID(),p.id,title,phaseType,text(req.body?.description,3000),['planned','active','completed'].includes(req.body?.status)?req.body.status:'planned',text(req.body?.starts_at,80),text(req.body?.ends_at,80),n);db.prepare("UPDATE participation SET phase_mode='phased' WHERE id=?").run(p.id);res.status(201).json(participationDetail(p.id,req.userId));});
app.put('/api/participation/:id/phases/:phaseId',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!canManageParticipation(req.userId,p.id))return res.status(403).json({error:'Keine Berechtigung, Phasen zu verwalten.'});const ph=db.prepare('SELECT * FROM participation_phases WHERE id=? AND participation_id=?').get(req.params.phaseId,p.id);if(!ph)return res.status(404).json({error:'Phase nicht gefunden.'});const status=['planned','active','completed'].includes(req.body?.status)?req.body.status:ph.status;if(status==='active')db.prepare("UPDATE participation_phases SET status='completed' WHERE participation_id=? AND id<>? AND status='active'").run(p.id,ph.id);db.prepare('UPDATE participation_phases SET status=?,starts_at=?,ends_at=? WHERE id=?').run(status,text(req.body?.starts_at,80)||ph.starts_at,text(req.body?.ends_at,80)||ph.ends_at,ph.id);res.json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/proposals',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});const gate=participationCanInteract(req.userId,p);if(!gate.ok)return res.status(gate.reason==='visibility'?404:403).json({error:'Keine Berechtigung zur Beteiligung.'});if(!p.enable_proposals)return res.status(400).json({error:'Vorschläge sind in diesem Beteiligungsraum deaktiviert.'});const title=text(req.body?.title,220),body=text(req.body?.body,6000);if(!title)return res.status(400).json({error:'Vorschlagstitel fehlt.'});let phaseId=text(req.body?.phase_id,120)||null;if(phaseId&&!db.prepare("SELECT 1 FROM participation_phases WHERE id=? AND participation_id=? AND phase_type IN ('collection','deliberation')").get(phaseId,p.id))return res.status(400).json({error:'Ungültige Phase für Vorschläge.'});db.prepare('INSERT INTO participation_proposals(id,participation_id,phase_id,title,body,author_id) VALUES (?,?,?,?,?,?)').run('prp-'+crypto.randomUUID(),p.id,phaseId,title,body,req.userId);res.status(201).json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/proposals/:proposalId/support',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});const gate=participationCanInteract(req.userId,p);if(!gate.ok)return res.status(403).json({error:'Keine Berechtigung zur Beteiligung.'});const proposal=db.prepare('SELECT 1 FROM participation_proposals WHERE id=? AND participation_id=?').get(req.params.proposalId,p.id);if(!proposal)return res.status(404).json({error:'Vorschlag nicht gefunden.'});const exists=db.prepare('SELECT 1 FROM participation_proposal_support WHERE proposal_id=? AND user_id=?').get(req.params.proposalId,req.userId);if(exists)db.prepare('DELETE FROM participation_proposal_support WHERE proposal_id=? AND user_id=?').run(req.params.proposalId,req.userId);else db.prepare('INSERT INTO participation_proposal_support(proposal_id,user_id) VALUES (?,?)').run(req.params.proposalId,req.userId);res.json(participationDetail(p.id,req.userId));});
app.put('/api/participation/:id/proposals/:proposalId/status',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!canManageParticipation(req.userId,p.id))return res.status(403).json({error:'Keine Berechtigung.'});const status=['submitted','under_review','accepted','rejected','implemented'].includes(req.body?.status)?req.body.status:null;if(!status)return res.status(400).json({error:'Ungültiger Vorschlagsstatus.'});const changed=db.prepare('UPDATE participation_proposals SET status=? WHERE id=? AND participation_id=?').run(status,req.params.proposalId,p.id).changes;if(!changed)return res.status(404).json({error:'Vorschlag nicht gefunden.'});res.json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/outcomes',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!canManageParticipation(req.userId,p.id))return res.status(403).json({error:'Keine Berechtigung, Ergebnisse zu veröffentlichen.'});const title=text(req.body?.title,220),body=text(req.body?.body,12000);if(!title||!body)return res.status(400).json({error:'Titel und Ergebnistext sind erforderlich.'});const status=['draft','published','in_progress','implemented'].includes(req.body?.status)?req.body.status:'published';let phaseId=text(req.body?.phase_id,120)||null;if(phaseId&&!db.prepare('SELECT 1 FROM participation_phases WHERE id=? AND participation_id=?').get(phaseId,p.id))phaseId=null;db.prepare('INSERT INTO participation_outcomes(id,participation_id,phase_id,title,body,status,created_by) VALUES (?,?,?,?,?,?,?)').run('pout-'+crypto.randomUUID(),p.id,phaseId,title,body,status,req.userId);res.status(201).json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/info',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!canManageParticipation(req.userId,p.id))return res.status(403).json({error:'Nur der Ersteller darf Informationen ergänzen.'});if(!p.enable_info)return res.status(400).json({error:'Informationsmodul ist deaktiviert.'});const body=text(req.body?.body,12000);if(!body)return res.status(400).json({error:'Informationstext fehlt.'});db.prepare('INSERT INTO participation_info(id,participation_id,title,body,author_id) VALUES (?,?,?,?,?)').run('pi-'+crypto.randomUUID(),p.id,text(req.body?.title,160)||'Information',body,req.userId);res.status(201).json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/questions',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});if(!canManageParticipation(req.userId,p.id))return res.status(403).json({error:'Nur der Ersteller darf Umfragen oder Abstimmungen ergänzen.'});const kind=req.body?.kind==='vote'?'vote':'poll';if((kind==='poll'&&!p.enable_poll)||(kind==='vote'&&!p.enable_vote))return res.status(400).json({error:'Dieses Modul ist deaktiviert.'});const question=text(req.body?.question,500),opts=safeArray(req.body?.options,12).map(x=>text(x,160)).filter(Boolean);if(!question||opts.length<2)return res.status(400).json({error:'Frage und mindestens zwei Optionen sind erforderlich.'});const qid='pq-'+crypto.randomUUID();db.transaction(()=>{db.prepare('INSERT INTO participation_questions(id,participation_id,kind,question,description,is_binding,closes_at,created_by) VALUES (?,?,?,?,?,?,?,?)').run(qid,p.id,kind,question,text(req.body?.description,3000),kind==='vote'&&req.body?.is_binding?1:0,text(req.body?.closes_at,80),req.userId);opts.forEach((label,i)=>db.prepare('INSERT INTO participation_question_options(id,question_id,label,sort_order) VALUES (?,?,?,?)').run('pqo-'+crypto.randomUUID(),qid,label,i));})();res.status(201).json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/questions/:qid/vote',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});const gate=participationCanInteract(req.userId,p);if(!gate.ok)return res.status(gate.reason==='visibility'?404:403).json({error:gate.reason==='visibility'?'Vorgang nicht gefunden.':'Keine Berechtigung zur Interaktion.'});const q=db.prepare('SELECT * FROM participation_questions WHERE id=? AND participation_id=?').get(req.params.qid,p.id);if(!q)return res.status(404).json({error:'Frage nicht gefunden.'});const optionId=text(req.body?.optionId,120);if(!db.prepare('SELECT 1 FROM participation_question_options WHERE id=? AND question_id=?').get(optionId,q.id))return res.status(400).json({error:'Ungültige Option.'});db.prepare(`INSERT INTO participation_question_votes(question_id,option_id,user_id) VALUES (?,?,?) ON CONFLICT(question_id,user_id) DO UPDATE SET option_id=excluded.option_id,created_at=CURRENT_TIMESTAMP`).run(q.id,optionId,req.userId);res.json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/arguments',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});const gate=participationCanInteract(req.userId,p);if(!gate.ok)return res.status(gate.reason==='visibility'?404:403).json({error:gate.reason==='visibility'?'Vorgang nicht gefunden.':'Keine Berechtigung zur Interaktion.'});if(!p.enable_pro_contra)return res.status(400).json({error:'Pro-/Contra-Modul ist deaktiviert.'});const side=req.body?.side==='contra'?'contra':'pro',body=text(req.body?.body,3000);if(!body)return res.status(400).json({error:'Argument fehlt.'});db.prepare('INSERT INTO participation_arguments(id,participation_id,side,body,author_id) VALUES (?,?,?,?,?)').run('pa-'+crypto.randomUUID(),p.id,side,body,req.userId);res.status(201).json(participationDetail(p.id,req.userId));});
app.post('/api/participation/:id/arguments/:argId/support',requireUser,(req,res)=>{const p=db.prepare('SELECT * FROM participation WHERE id=?').get(req.params.id);if(!p)return res.status(404).json({error:'Vorgang nicht gefunden.'});const gate=participationCanInteract(req.userId,p);if(!gate.ok)return res.status(gate.reason==='visibility'?404:403).json({error:gate.reason==='visibility'?'Vorgang nicht gefunden.':'Keine Berechtigung zur Interaktion.'});const a=db.prepare('SELECT 1 FROM participation_arguments WHERE id=? AND participation_id=?').get(req.params.argId,p.id);if(!a)return res.status(404).json({error:'Argument nicht gefunden.'});const exists=db.prepare('SELECT 1 FROM participation_argument_support WHERE argument_id=? AND user_id=?').get(req.params.argId,req.userId);if(exists)db.prepare('DELETE FROM participation_argument_support WHERE argument_id=? AND user_id=?').run(req.params.argId,req.userId);else db.prepare('INSERT INTO participation_argument_support(argument_id,user_id) VALUES (?,?)').run(req.params.argId,req.userId);res.json(participationDetail(p.id,req.userId));});


app.post('/api/events',requireUser,(req,res)=>{
  const {name,date='NEU · Demo',start_at='',end_at='',timezone='Europe/Berlin',federation_state='inherit',places=[],topics=[],communities=[],projects=[],modules={},description='',visibility='public',attendance_policy='open',min_trust_level=1,max_participants=null,owner_space_id=null,propagation_scope=null}=req.body||{};const cleanName=validatedUserText(name,160,{required:true}),cleanDate=validatedUserText(date,120),cleanDescription=validatedUserText(description,10000);const cleanStart=start_at?isoDateTimeWithZone(start_at):'',cleanEnd=end_at?isoDateTimeWithZone(end_at):'';if((start_at||end_at)&&(!cleanStart||!cleanEnd||Date.parse(cleanEnd)<Date.parse(cleanStart)))return res.status(400).json({error:'Ungültiger Start-/Endzeitpunkt.'});const pls=cleanPlaces(places);if(!cleanName||cleanDate===null||cleanDescription===null||!pls.length)return res.status(400).json({error:'Ungültige Event-Eingabe.'});
  const ownerSpace=text(owner_space_id,120)||null;const ownerCheck=validateOwnedSpace(req.userId,ownerSpace);if(ownerCheck?.error)return res.status(403).json({error:ownerCheck.error});const scope=propagationScope(propagation_scope,ownerSpace);const id='e-'+crypto.randomUUID();db.transaction(()=>{db.prepare("INSERT INTO events(id,date_label,name,meta,description,source,created_by,visibility,attendance_policy,min_trust_level,max_participants,owner_space_id,propagation_scope,start_at,end_at,timezone,federation_state) VALUES (?,?,?,?,?,'native',?,?,?,?,?,?,?,?,?,?,?)").run(id,cleanDate,cleanName,'PartiUp',cleanDescription,req.userId,['public','unlisted','private'].includes(visibility)?visibility:'public',['open','approval','invite','members','trust'].includes(attendance_policy)?attendance_policy:'open',Math.max(1,Math.min(3,Number(min_trust_level)||1)),max_participants?Math.max(1,Math.min(100000,Number(max_participants))):null,ownerSpace,scope,cleanStart,cleanEnd,text(timezone,80)||'Europe/Berlin',['inherit','enabled','disabled'].includes(federation_state)?federation_state:'inherit');const ep=db.prepare('INSERT OR IGNORE INTO event_places(event_id,place_id) VALUES (?,?)');pls.forEach(p=>ep.run(id,p));const et=db.prepare('INSERT OR IGNORE INTO event_topics(event_id,topic_id) VALUES (?,?)');cleanTopics(topics).forEach(t=>et.run(id,ensureTopic(t)));const ec=db.prepare('INSERT OR IGNORE INTO event_communities(event_id,community_id) VALUES (?,?)');(Array.isArray(communities)?communities:[]).forEach(c=>{if(db.prepare('SELECT 1 FROM communities WHERE id=?').get(c))ec.run(id,c)});if(ownerSpace)ec.run(id,ownerSpace);const xp=db.prepare('INSERT OR IGNORE INTO event_projects(event_id,project_id) VALUES (?,?)');safeArray(projects,40).forEach(p=>{if(db.prepare('SELECT 1 FROM projects WHERE id=?').get(p))xp.run(id,p)});ensureObjectModules('event',id,modules);})();if(baseUrl())queueEventFederation(db,id,'Create');res.status(201).json({id});
});
app.post('/api/projects',requireUser,(req,res)=>{
  const {name,icon='◆',description='',places=[],topics=[],communities=[],modules={},visibility='public',access_policy='open',min_trust_level=1,owner_space_id=null,propagation_scope=null}=req.body||{};const cleanName=validatedUserText(name,160,{required:true}),cleanDescription=validatedUserText(description,10000),cleanIcon=validatedIcon(icon,'◆');const pls=cleanPlaces(places);if(!cleanName||cleanDescription===null||!cleanIcon||!pls.length)return res.status(400).json({error:'Ungültige Projekt-Eingabe.'});const ownerSpace=text(owner_space_id,120)||null;const ownerCheck=validateOwnedSpace(req.userId,ownerSpace);if(ownerCheck?.error)return res.status(403).json({error:ownerCheck.error});const scope=propagationScope(propagation_scope,ownerSpace);const id='p-'+crypto.randomUUID();
  db.transaction(()=>{db.prepare('INSERT INTO projects(id,icon,name,owner,description,supporters,progress,created_by,visibility,access_policy,min_trust_level,owner_space_id,propagation_scope) VALUES (?,?,?,?,?,0,0,?,?,?,?,?,?)').run(id,cleanIcon,cleanName,getUserSafe(req.userId)?.name||'PartiUp',cleanDescription,req.userId,['public','unlisted','private'].includes(visibility)?visibility:'public',['open','approval','invite','trust'].includes(access_policy)?access_policy:'open',Math.max(1,Math.min(3,Number(min_trust_level)||1)),ownerSpace,scope);const pp=db.prepare('INSERT OR IGNORE INTO project_places(project_id,place_id) VALUES (?,?)');pls.forEach(p=>pp.run(id,p));const pt=db.prepare('INSERT OR IGNORE INTO project_topics(project_id,topic_id) VALUES (?,?)');cleanTopics(topics).forEach(t=>pt.run(id,ensureTopic(t)));const pc=db.prepare('INSERT OR IGNORE INTO project_communities(project_id,community_id) VALUES (?,?)');(Array.isArray(communities)?communities:[]).forEach(c=>{if(db.prepare('SELECT 1 FROM communities WHERE id=?').get(c))pc.run(id,c)});if(ownerSpace)pc.run(id,ownerSpace);ensureObjectModules('project',id,modules);})();res.status(201).json({id});
});


app.get('/api/privacy/export',requireUser,(req,res)=>{
  const data=buildPrivacyExport(db,req.userId,{privateUploadDir,publicUploadDir:uploadDir});
  res.setHeader('Content-Disposition','attachment; filename="partiup-meine-daten.json"');res.json(data);
});
app.post('/api/privacy/delete-account',deleteAccountLimit,requireUser,(req,res)=>{
  const u=db.prepare("SELECT * FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(req.userId);
  if(!u||!verifyPassword(String(req.body?.password||''),u.password_salt,u.password_hash))return res.status(403).json({error:'Passwortbestätigung erforderlich.'});
  const result=deleteAccountData(db,req.userId,{privateUploadDir,publicUploadDir:uploadDir});
  res.append('Set-Cookie',`bup_session=; ${cookieFlags(true)}Max-Age=0`);
  res.json({...result,notice:'Das Konto wurde anonymisiert und personenbezogene/private Daten wurden nach der dokumentierten Löschmatrix entfernt. Bewusst aufbewahrte System-/Moderationsdaten bleiben nur mit Tombstone-Bezug erhalten; bereits föderierte Remote-Kopien liegen außerhalb dieser lokalen Löschung.'});
});

app.use('/api',(req,res)=>res.status(404).json({error:'API-Endpunkt nicht gefunden.'}));
app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);if(req.path.startsWith('/api/'))return res.status(500).json({error:'Interner Serverfehler.'});next(err)});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));
if(baseUrl()){setInterval(()=>flushDeliveryQueue(db).catch(e=>console.warn('Federation retry queue:',e.message)),30_000).unref();setInterval(()=>flushSpaceDeliveryQueue(db).catch(e=>console.warn('Space federation retry queue:',e.message)),30_000).unref();}
const server=app.listen(PORT,HOST,()=>{console.log(`\nPartiUp v${pkg.version} P0.1 läuft.\n`);console.log(`Bind: ${HOST}:${PORT}`);console.log(`Auf diesem PC: http://localhost:${PORT}`);if(HOST==='0.0.0.0'){console.log('ACHTUNG: LAN-Modus aktiv. Zugriff für Geräte im lokalen Netzwerk möglich.');for(const name of Object.keys(os.networkInterfaces()))for(const net of os.networkInterfaces()[name]||[])if(net.family==='IPv4'&&!net.internal)console.log(`Im lokalen Netzwerk: http://${net.address}:${PORT}`)}if(DEMO_SEED_ENABLED&&!IS_PROD)console.log('\nDemo-Login: max@bottomupparti.local / demo123');console.log('\nZum Beenden: Strg+C\n');});
let closing=false;function shutdown(signal){if(closing)return;closing=true;console.log(`\n${signal}: Server wird sauber beendet …`);server.close(()=>{try{db.close()}catch{}process.exit(0)});setTimeout(()=>process.exit(1),5000).unref()}
process.on('SIGINT',()=>shutdown('SIGINT'));process.on('SIGTERM',()=>shutdown('SIGTERM'));

