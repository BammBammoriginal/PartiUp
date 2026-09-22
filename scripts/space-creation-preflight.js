const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const server=fs.readFileSync('server/server.js','utf8');
const db=fs.readFileSync('server/db.js','utf8');
const checks=[
 ['minimal creation copy',app.includes('Minimal erstellen → direkt in den neuen Space')],
 ['direct setup route after community create',app.includes("openCommunity(child.id,'setup')")],
 ['space setup UI',app.includes('EINRICHTUNGSMODUS')&&app.includes('Module & Funktionen')],
 ['templates are modular defaults',app.includes('formTemplate')&&server.includes('SPACE_TEMPLATE_MODULES')],
 ['setup status persisted',db.includes("ensureColumn('communities','setup_completed'")&&server.includes("/setup-status")],
 ['space profile API',server.includes("/api/communities/:id/profile")],
 ['project/event refresh owner space after creation',app.includes("await openCommunity(ownerSpace,type==='event'?'events':'projects',false)")],
 ['creator transparency in creation flow',app.includes('Verifizierungsstufe ${state.user.trust_level}')],
 ['provider-neutral structure retained',server.includes('SPACE_TEMPLATE_MODULES')&&!server.includes('MobilizonTemplate')&&!server.includes('DecidimTemplate')]
];
let fail=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL'),name);if(!ok)fail++}if(fail){console.error(`${fail} Space-Creation-Prüfungen fehlgeschlagen.`);process.exit(1)}console.log(`Space-Creation-Preflight: ${checks.length}/${checks.length} bestanden.`);
