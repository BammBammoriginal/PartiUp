'use strict';
const crypto=require('crypto');

const MAX_REMOTE_MEDIA=8;
const MAX_URL_LENGTH=2048;
const IMAGE_MIME=/^image\/(jpeg|png|webp|gif|avif)$/i;
const VIDEO_MIME=/^video\/(mp4|webm|ogg)$/i;

function installMediaFederationSchema(db){
  db.exec(`
  CREATE TABLE IF NOT EXISTS federation_remote_media (
    id TEXT PRIMARY KEY,
    object_uri TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL CHECK(kind IN ('image','video','file')),
    name TEXT NOT NULL DEFAULT '',
    width INTEGER,
    height INTEGER,
    source_host TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(object_uri,media_url)
  );
  CREATE INDEX IF NOT EXISTS idx_federation_remote_media_object ON federation_remote_media(object_uri,position);
  `);
}

function safeHttpsUrl(value){
  const raw=String(value||'').trim();
  if(!raw||raw.length>MAX_URL_LENGTH)return null;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname)return null;
    u.hash='';
    return u.toString();
  }catch{return null}
}
function clampDimension(v){const n=Number(v);return Number.isFinite(n)&&n>0&&n<=20000?Math.round(n):null}
function mediaKind(mediaType=''){
  if(IMAGE_MIME.test(mediaType))return 'image';
  if(VIDEO_MIME.test(mediaType))return 'video';
  return 'file';
}
function candidateUrl(item){
  if(typeof item==='string')return item;
  if(!item||typeof item!=='object')return '';
  if(typeof item.url==='string')return item.url;
  if(Array.isArray(item.url)){
    const u=item.url.find(x=>typeof x==='string'||typeof x?.href==='string');
    return typeof u==='string'?u:(u?.href||'');
  }
  if(typeof item.href==='string')return item.href;
  return '';
}
function sanitizeRemoteMediaObject(item,position=0,forcedKind=''){
  const mediaUrl=safeHttpsUrl(candidateUrl(item));if(!mediaUrl)return null;
  const mediaType=String(item?.mediaType||item?.mimeType||'').trim().toLowerCase().slice(0,120);
  let kind=forcedKind||mediaKind(mediaType);
  if(kind==='file'&&item?.type==='Image')kind='image';
  if(kind==='file'&&item?.type==='Video')kind='video';
  if(kind==='image'&&mediaType&&!IMAGE_MIME.test(mediaType))return null;
  if(kind==='video'&&mediaType&&!VIDEO_MIME.test(mediaType))return null;
  const name=String(item?.name||item?.summary||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
  const u=new URL(mediaUrl);
  return {media_url:mediaUrl,media_type:mediaType,kind,name,width:clampDimension(item?.width),height:clampDimension(item?.height),source_host:u.host.toLowerCase(),position};
}
function remoteMediaFromObject(obj){
  const out=[];const seen=new Set();
  const push=(item,forcedKind='')=>{if(out.length>=MAX_REMOTE_MEDIA)return;const m=sanitizeRemoteMediaObject(item,out.length,forcedKind);if(!m||seen.has(m.media_url))return;seen.add(m.media_url);out.push(m)};
  const attachments=Array.isArray(obj?.attachment)?obj.attachment:(obj?.attachment?[obj.attachment]:[]);
  attachments.forEach(x=>push(x));
  const images=Array.isArray(obj?.image)?obj.image:(obj?.image?[obj.image]:[]);images.forEach(x=>push(x,'image'));
  return out;
}
function replaceRemoteMedia(db,objectUri,obj){
  const uri=String(objectUri||'').trim();if(!safeHttpsUrl(uri))return [];
  const rows=remoteMediaFromObject(obj);
  const tx=db.transaction(()=>{
    db.prepare('DELETE FROM federation_remote_media WHERE object_uri=?').run(uri);
    const ins=db.prepare(`INSERT INTO federation_remote_media(id,object_uri,media_url,media_type,kind,name,width,height,source_host,position) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    rows.forEach((m,i)=>ins.run('frm-'+crypto.createHash('sha256').update(`${uri}\n${m.media_url}`).digest('hex').slice(0,28),uri,m.media_url,m.media_type,m.kind,m.name,m.width,m.height,m.source_host,i));
  });tx();return remoteMediaForObject(db,uri);
}
function clearRemoteMedia(db,objectUri){db.prepare('DELETE FROM federation_remote_media WHERE object_uri=?').run(String(objectUri||''))}
function remoteMediaForObject(db,objectUri){
  return db.prepare(`SELECT id,media_url,media_type,kind,name,width,height,source_host,position FROM federation_remote_media WHERE object_uri=? ORDER BY position,id`).all(String(objectUri||'')).map(x=>({...x,proxy_url:x.kind==='image'?`/api/federation-media/${encodeURIComponent(x.id)}`:''}));
}
function absolutePublicUrl(base,path){
  const rel=String(path||'').trim();if(!rel||!rel.startsWith('/'))return '';
  return `${String(base||'').replace(/\/+$/,'')}${rel}`;
}
function localMediaForEntity(db,entityType,entityId,base){
  const rows=db.prepare(`SELECT m.*,l.role FROM media m JOIN media_links l ON l.media_id=m.id WHERE l.entity_type=? AND l.entity_id=? ORDER BY datetime(l.created_at),m.id`).all(entityType,String(entityId));
  return rows.map(row=>{
    let variants={};try{variants=JSON.parse(row.variants_json||'{}')}catch{}
    const rel=variants.large||variants.medium||variants.thumb||'';const url=absolutePublicUrl(base,rel);if(!url)return null;
    return {type:row.kind==='image'?'Image':row.kind==='video'?'Video':'Document',mediaType:String(row.mime_type||''),url,name:String(row.original_name||'').slice(0,240),width:clampDimension(row.width),height:clampDimension(row.height),role:row.role};
  }).filter(Boolean);
}
function attachmentDocumentsForEntity(db,entityType,entityId,base){return localMediaForEntity(db,entityType,entityId,base).map(({role,...x})=>x)}
function primaryImageForEntity(db,entityType,entityId,base,preferredRole='cover'){
  const rows=localMediaForEntity(db,entityType,entityId,base);const hit=rows.find(x=>x.role===preferredRole&&x.type==='Image')||rows.find(x=>x.type==='Image');if(!hit)return null;const {role,...obj}=hit;return obj;
}
function mediaFederationSnapshot(){return {milestone:'P0.14',maxRemoteAttachments:MAX_REMOTE_MEDIA,remoteImages:'server-proxied-on-demand',remoteVideo:'metadata-and-explicit-external-open',localImages:'ActivityStreams attachment/image metadata',localVideoUpload:false,transcoding:false,cdn:false};}

module.exports={IMAGE_MIME,VIDEO_MIME,MAX_REMOTE_MEDIA,installMediaFederationSchema,safeHttpsUrl,remoteMediaFromObject,replaceRemoteMedia,clearRemoteMedia,remoteMediaForObject,attachmentDocumentsForEntity,primaryImageForEntity,mediaFederationSnapshot};
