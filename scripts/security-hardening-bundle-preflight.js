const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const proto=fs.readFileSync(path.join(root,'server','federation','protocol.js'),'utf8');
const ks=fs.readFileSync(path.join(root,'server','federation','key-store.js'),'utf8');
const checks=[
 ['login passes csrfGuard before credential processing',/app\.post\('\/api\/login',loginLimit,csrfGuard/.test(server)],
 ['csrf bootstrap remains GET and before global guard',server.indexOf("app.get('/api/security/csrf'")<server.indexOf("app.use('/api',csrfGuard")],
 ['client sends csrf on login',!/url!=='\/api\/login'/.test(app)&&/X-BUP-CSRF/.test(app)],
 ['login rotates session id',/const oldToken=cookies\(req\)\.bup_session[\s\S]*DELETE FROM sessions[\s\S]*INSERT INTO sessions/.test(server)],
 ['login rotates csrf token',/const nextCsrf=crypto\.randomBytes\(24\)[\s\S]*bup_csrf=\$\{nextCsrf\}/.test(server)],
 ['enumeration-safe login error',server.includes("E-Mail oder Passwort ist falsch.")],
 ['SameSite Strict retained',server.includes('SameSite=Strict')],
 ['Secure production cookie retained',/IS_PROD\?'Secure; '/.test(server)],
 ['production key store defaults encrypted-file',/IS_PROD\?'encrypted-file':'sqlite'/.test(ks)],
 ['master key external only',/PARTIUP_FEDERATION_MASTER_KEY_FILE/.test(ks)&&/PARTIUP_FEDERATION_MASTER_KEY/.test(ks)&&!/const\s+MASTER_KEY\s*=\s*['\"][^'\"]+/.test(ks)],
 ['AES-256-GCM key encryption',/aes-256-gcm/.test(ks)],
 ['key files restrictive permissions',/0o600/.test(ks)&&/0o700/.test(ks)],
 ['legacy sqlite private keys migrate out',/One-time migration/.test(ks)&&/UPDATE \$\{table\} SET private_key_pem=''/.test(ks)],
 ['user and space key namespaces separated',/ensureKey\(db,'users'/.test(proto)&&/ensureKey\(db,'spaces'/.test(proto)],
 ['key rotation functions exist',/rotateActorKey/.test(proto)&&/rotateSpaceActorKey/.test(proto)],
 ['participation visibility/access columns exist',/ensureColumn\('participation','visibility'/.test(db)&&/ensureColumn\('participation','access_policy'/.test(db)&&/ensureColumn\('participation','min_trust_level'/.test(db)],
 ['participation access workflow table exists',/CREATE TABLE IF NOT EXISTS participation_access/.test(db)],
 ['central canViewParticipation exists',/function canViewParticipation/.test(db)],
 ['central participationCanInteract exists',/function participationCanInteract/.test(db)],
 ['requested participation does not grant view',!/status==='requested'\)return true/.test(db)&&/status==='approved'\)return true/.test(db)],
 ['unlisted is excluded from lists',/visibility==='unlisted'&&!forList/.test(db)&&/forList:true/.test(db)],
 ['bootstrap uses filtered participation list',/participation:listParticipation\(userId\)/.test(db)],
 ['community aggregation uses filtered participation list',/const participation=listParticipation\(userId\)\.filter/.test(db)],
 ['profile created participation uses viewer-filtered list',/participation:\s*canShowCreated\?listParticipation\(viewerId\)\.filter\(x=>x\.created_by===id\):null/.test(db)],
 ['participation write endpoints use centralized interaction gate',/participationCanInteract\(req\.userId,p\)/.test(server)],
 ['reports target snapshot receives reporter identity',/reportTargetSnapshot\(req\.userId,targetType,targetId\)/.test(server)],
 ['post/comment reports gate through community detail',/communityDetail\(x\.scope_id,userId\)/.test(server)],
 ['project reports gate through projectDetail',/projectDetail\(targetId,userId\)/.test(server)],
 ['event reports gate through eventDetail',/eventDetail\(targetId,userId\)/.test(server)],
 ['user reports require visible scoped relationship',/userBelongsToReportScope/.test(server)&&/canViewReportScope/.test(server)],
 ['hidden report targets return generic 404',/return res\.status\(404\)\.json\(\{error:'Inhalt nicht gefunden\.'/g.test(server)]
];
let bad=0;for(const [n,ok] of checks){console.log(`${ok?'OK':'FAIL'}  ${n}`);if(!ok)bad++}console.log(`\nSecurity hardening bundle: ${checks.length-bad}/${checks.length} bestanden.`);if(bad)process.exit(1);
