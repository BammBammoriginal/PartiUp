const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const server=fs.readFileSync('server/server.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const pkg=require('../package.json');
const checks=[
 ['comment-media fix version present',(()=>{const v=String(pkg.version||'').split('.').map(Number);return v[0]>0||(v[0]===0&&(v[1]>15||(v[1]===15&&(v[2]||0)>=3)));})()],
 ['comment file input uses supported image types',app.includes('class="comment-image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"')],
 ['comment preview container exists',app.includes('class="comment-image-preview" hidden')],
 ['comment file validates MIME and 12MB',app.includes('/^image\\/(jpeg|png|webp|heic|heif)$/i.test(file.type)') && app.includes('file.size<=12*1024*1024')],
 ['comment preview object URL exists',app.includes('commentPreviewUrl=URL.createObjectURL(file)')],
 ['comment preview can be removed',app.includes('comment-image-remove')],
 ['comment submit uses atomic media route',app.includes('/comments-with-media')],
 ['atomic comment media endpoint exists',server.includes("app.post('/api/posts/:id/comments-with-media'")],
 ['membership checked before comment media create',server.includes("if(!mustBeMember(req.userId,p.community_id))return res.status(403)")],
 ['comment and media link created in one transaction',server.includes("db.transaction(()=>{db.prepare('INSERT INTO comments") && server.includes("'comment',commentId,'attachment'")],
 ['federation occurs after media link',server.indexOf("'comment',commentId,'attachment'") < server.indexOf('noteForLocalComment(db,commentId)',server.indexOf('comments-with-media'))],
 ['comment media proportional presentation',css.includes('.comment-media{display:block;width:auto') && css.includes('object-fit:contain')],
 ['mobile comment media bounded',css.includes('@media(max-width:620px){.comment-image-preview-card')],
];
let passed=0;for(const [name,ok] of checks){console.log(ok?'OK  ':'FAIL',name);if(ok)passed++}
console.log(`\nComment image upload: ${passed}/${checks.length} bestanden.`);if(passed!==checks.length)process.exit(1);
