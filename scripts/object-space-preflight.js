const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const db=fs.readFileSync('server/db.js','utf8');
const server=fs.readFileSync('server/server.js','utf8');
const checks=[
 ['Projekt-Tabs modular',app.includes("['tasks','Aufgaben']")&&app.includes('data-otab=\"info\"')&&app.includes('data-otab=\"admin\"')],
 ['Event-Tabs modular',app.includes("['participants','Teilnahme']")&&app.includes("['projects','Projekte']")],
 ['Community Info/Admin getrennt',app.includes('data-ctab=\"info\"')&&app.includes('data-ctab=\"admin\"')],
 ['Beteiligung Info/Admin getrennt',app.includes("['results','Ergebnisse & Wirkung',true]")&&app.includes('data-ptab=\"meta\"')&&app.includes('data-ptab=\"admin\"')],
 ['Generisches Task-Schema',db.includes('CREATE TABLE IF NOT EXISTS tasks')&&db.includes("entity_type TEXT NOT NULL CHECK(entity_type IN ('project','event'))")],
 ['Generische Object-Module',db.includes('CREATE TABLE IF NOT EXISTS object_modules')],
 ['Projekt-Event Relation',db.includes('CREATE TABLE IF NOT EXISTS event_projects')],
 ['Task API',server.includes("app.post('/api/objects/:type/:id/tasks'")&&server.includes("app.put('/api/objects/:type/:id/tasks/:taskId'")],
 ['Modul API',server.includes("app.put('/api/objects/:type/:id/modules'")],
 ['User vs offiziell',app.includes("label:`${o.creator.name} · Stufe ${Number(o.creator.trust_level)||0}`")&&app.includes('✓ Offiziell')],
 ['Ersteller anklickbar',app.includes("connectionChip('person',o.creator")]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`\nObject-Space-Preflight: ${failed}/${checks.length} fehlgeschlagen`);process.exit(1)}
console.log(`\nObject-Space-Preflight bestanden (${checks.length}/${checks.length}).`);
