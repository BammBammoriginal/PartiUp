const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const checks=[
 ['Default bind is localhost only', /BIND_HOST \|\| '127\.0\.0\.1'/.test(server)],
 ['LAN requires explicit opt-in', /set BIND_HOST=0\.0\.0\.0/.test(fs.readFileSync(path.join(root,'start-network.bat'),'utf8'))],
 ['Security headers present', /Content-Security-Policy/.test(server)&&/X-Content-Type-Options/.test(server)&&/X-Frame-Options/.test(server)],
 ['API responses no-store', /Cache-Control','no-store/.test(server)],
 ['JSON request size limited', /JSON_BODY_MAX_BYTES/.test(server)&&/express\.json\(\{limit:`\$\{JSON_BODY_MAX_BYTES\}b`/.test(server)],
 ['Login rate limit enabled', /loginLimit/.test(server)&&/15\*60_000/.test(server)],
 ['Write rate limit enabled', /writeLimit/.test(server)],
 ['CSRF protection enabled', /csrfGuard/.test(server)&&/X-BUP-CSRF/.test(app)],
 ['SameSite Strict session cookie', /SameSite=Strict/.test(server)],
 ['Secure cookie in production', /IS_PROD\?'Secure; '/.test(server)],
 ['Session tokens hashed at rest', /sessionKey\(token\)/.test(server)&&/createHash\('sha256'\)/.test(server)],
 ['Passwords use scrypt', /scryptSync/.test(db)],
 ['Password verification timing-safe', /timingSafeEqual/.test(db)],
 ['Upload file size limited', /12\*1024\*1024/.test(server)],
 ['Upload pixel limit enabled', /40_000_000/.test(server)],
 ['Original image not publicly retained', /uploads','public','media/.test(server)&&/webp/.test(server)],
 ['Private media not routed through generic public path', !/app\.use\('\/uploads',/.test(server)],
 ['Data export endpoint exists', /\/api\/privacy\/export/.test(server)],
 ['Account deletion/anonymization endpoint exists', /\/api\/privacy\/delete-account/.test(server)],
 ['No request-body logging', !/console\.log\(req\.body/.test(server)],
 ['Privacy defaults restriktiv', db.includes("memberships_visibility TEXT NOT NULL DEFAULT 'private'")&&db.includes("follows_visibility TEXT NOT NULL DEFAULT 'private'")&&db.includes("event_attendance_visibility TEXT NOT NULL DEFAULT 'private'")],
 ['Private Community Zugriff backendseitig geprüft', (db.includes("function canViewCommunityRow")&&db.includes("if(!canViewCommunityRow(row,userId)) return null"))],
 ['Access Control wird serverseitig erzwungen', server.includes('communityAccessDecision')&&server.includes('canRequestEventAttendance')&&db.includes('hasApprovedEventAttendance')],
 ['Frontend HTML escapes user text', /function esc\(/.test(app)],
 ['Concrete XSS render paths hardened', /function connectionChip\(type,entity,opts=\{\}\).*escAttr\(String\(id\)\).*esc\(label\)/.test(app)&&/function relationPills\(o\).*connectionGroup\('place'/.test(app)&&/safeIcon\(c\.icon/.test(app)&&/safeIcon\(p\.icon/.test(app)],
 ['CSP script-src has no unsafe-inline', /script-src 'self'/.test(server)&&!/script-src[^;]*unsafe-inline/.test(server)],
 ['Server validates UI icons', /SAFE_INPUT_ICONS/.test(server)&&/validatedIcon/.test(server)]
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'}  ${name}`);if(!ok)bad++}
console.log(`\nSecurity preflight: ${checks.length-bad}/${checks.length} bestanden.`);if(bad)process.exit(1);
