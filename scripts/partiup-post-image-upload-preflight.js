const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');
const mediaRoute=server.slice(server.indexOf("/api/communities/:id/posts-with-media"),server.indexOf("/api/posts/:id/federation"));
const checks=[
 ['dedicated atomic-ish post media route',server.includes("/api/communities/:id/posts-with-media")&&server.includes("media_links(media_id,entity_type,entity_id,role)")],
 ['media linked before federation queue',mediaRoute.indexOf("media.id,'post',postId,'attachment'")>=0&&mediaRoute.indexOf("media.id,'post',postId,'attachment'")<mediaRoute.indexOf("queueActivityForFollowers")],
 ['image required on media route',server.includes("Bitte ein unterstütztes Bild auswählen.")],
 ['composer preview exists',app.includes('newPostImagePreview')&&app.includes('composer-image-preview-card')],
 ['file captured before async create',app.includes("file=$('#newPostImage')?.files?.[0]||null")],
 ['multipart route used when image exists',app.includes("posts-with-media`)" )||app.includes("posts-with-media`,")||app.includes("posts-with-media" )],
 ['client validates supported mime types',app.includes('image\\/(jpeg|png|webp|heic|heif)')],
 ['client validates 12 MB limit',app.includes('12*1024*1024')],
 ['remove selected image supported',app.includes('removeNewPostImage')],
 ['preview blob CSP supported',server.includes("img-src 'self' data: blob:")],
 ['responsive preview css',css.includes('.composer-image-preview-card')&&css.includes('@media(max-width:620px)')],
 ['legacy media endpoint retained',server.includes("/api/posts/:id/media")]
];
let ok=0;for(const [n,v] of checks){console.log((v?'PASS':'FAIL')+' '+n);if(v)ok++}console.log(`PartiUp post image upload preflight: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
