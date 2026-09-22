'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const media=fs.readFileSync(path.join(root,'server','federation','media.js'),'utf8');
const protocol=fs.readFileSync(path.join(root,'server','federation','protocol.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');
const arch=fs.readFileSync(path.join(root,'server','core','architecture.js'),'utf8');
const runtime=require(path.join(root,'server','federation','media.js'));
let rejectsHttp=false,rejectsCred=false,extracts=false,limits=false;
try{rejectsHttp=runtime.safeHttpsUrl('http://example.org/a.jpg')===null}catch{}
try{rejectsCred=runtime.safeHttpsUrl('https://u:p@example.org/a.jpg')===null}catch{}
try{const x=runtime.remoteMediaFromObject({attachment:[{type:'Image',mediaType:'image/jpeg',url:'https://cdn.example.org/a.jpg',name:'Alt'}]});extracts=x.length===1&&x[0].kind==='image'&&x[0].source_host==='cdn.example.org'}catch{}
try{const many=Array.from({length:20},(_,i)=>({type:'Image',mediaType:'image/jpeg',url:`https://cdn.example.org/${i}.jpg`}));limits=runtime.remoteMediaFromObject({attachment:many}).length===runtime.MAX_REMOTE_MEDIA}catch{}
const checks=[
 ['Dedicated federation media boundary',media.includes('installMediaFederationSchema')&&media.includes('federation_remote_media')],
 ['Remote media URLs require HTTPS',media.includes("u.protocol!=='https:'")],
 ['Credential-bearing URLs rejected',media.includes('u.username||u.password')],
 ['Bounded remote attachment count',media.includes('MAX_REMOTE_MEDIA=8')],
 ['Image MIME allowlist',media.includes('IMAGE_MIME')&&media.includes('jpeg|png|webp|gif|avif')],
 ['Video metadata MIME allowlist',media.includes('VIDEO_MIME')&&media.includes('mp4|webm|ogg')],
 ['Local Note attachments federate',protocol.includes("attachmentDocumentsForEntity(db,'post'")&&protocol.includes("attachmentDocumentsForEntity(db,'comment'")],
 ['Local Event cover federates as image',protocol.includes("primaryImageForEntity(db,'event'")&&protocol.includes('obj.image=image')],
 ['Inbound Notes persist safe media metadata',server.includes('replaceRemoteMedia(db,o.id,o)')],
 ['Remote media deleted with remote lifecycle cleanup',server.includes('clearRemoteMedia(db,objectUri)')],
 ['Remote image proxy uses known media id',server.includes("app.get('/api/federation-media/:id'")&&server.includes('FROM federation_remote_media WHERE id=?')],
 ['Remote proxy rechecks object moderation/lifecycle',server.includes("lifecycle_state='active' AND moderation_state='active'")&&server.includes("federation_moderation_state='active'")],
 ['Remote proxy bounded to 8 MiB',server.includes('maxBytes:8*1024*1024')],
 ['Remote proxy verifies response MIME',server.includes('IMAGE_MIME.test(contentType)')],
 ['Unified feed receives remote media metadata',db.includes('remote_media:remoteMediaForObject(db,x.object_uri)')],
 ['Remote media rendered without direct image hotlink',app.includes('remoteMediaHtml')&&app.includes('m.proxy_url')&&css.includes('.remote-media-grid')],
 ['Architecture marks media foundation',arch.includes("status: 'media-foundation-ready'")&&/milestone:\s*'P0\.\d+(?:\.\d+)?'/.test(arch)],
 ['Runtime URL and extraction guards',rejectsHttp&&rejectsCred&&extracts&&limits]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\nP0.14 Media Federation: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
