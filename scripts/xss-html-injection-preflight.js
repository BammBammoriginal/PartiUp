const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const checks=[
 ['relationPills escapes place names through connectionChip', app.includes("connectionGroup('place',o.places||[]")&&app.includes('esc(label)')],
 ['relationPills escapes topics through connectionChip', app.includes("connectionGroup('topic',o.topics||[]")&&app.includes('esc(label)')],
 ['community icon constrained', /safeIcon\(c\.icon,'✦'\)/.test(app)],
 ['project icon constrained', /safeIcon\(p\.icon,'◆'\)/.test(app)],
 ['participation icon constrained', /safeIcon\(p\.icon,'☑'\)/.test(app)],
 ['place icon constrained and name escaped', /safeIcon\(p\.icon,'📍'\)[\s\S]*esc\(p\.name\)/.test(app)],
 ['message reaction emoji constrained', /safeIcon\(r\.emoji,'👍'\)/.test(app)],
 ['media URLs validated before attribute interpolation', /safeMediaUrlValue/.test(app)&&/mediaSrc/.test(app)&&!/src="\$\{mediaUrl\(/.test(app)],
 ['dynamic ids escaped in card attributes', /data-id="\$\{escAttr\(c\.id\)\}"/.test(app)&&/data-event="\$\{escAttr\(e\.id\)\}"/.test(app)&&/data-project="\$\{escAttr\(p\.id\)\}"/.test(app)],
 ['dynamic class source uses allowlist', /safeClassToken\(o\?\.source,\['external','native'\],'native'\)/.test(app)],
 ['progress style numeric-clamped', /Math\.max\(0,Math\.min\(100,Number\(p\.progress\)\|\|0\)\)/.test(app)],
 ['server validates icon allowlist', /SAFE_INPUT_ICONS/.test(server)&&/validatedIcon/.test(server)],
 ['server validates user text shape/control chars', /validatedUserText/.test(server)&&/u0000/.test(server)],
 ['community create uses validated icon/text', /cleanIcon=validatedIcon\(icon,'✦'\)/.test(server)&&/cleanName=validatedUserText\(name,160/.test(server)],
 ['project create uses validated icon/text', /cleanIcon=validatedIcon\(icon,'◆'\)/.test(server)],
 ['CSP script-src remains self only', /script-src 'self'/.test(server)&&!/script-src[^;]*unsafe-inline/.test(server)],
 ['no document.write or insertAdjacentHTML with raw unescaped space id', !/document\.write/.test(app)&&!/value="\$\{c\.id\}"/.test(app)],
 ['known raw icon sinks absent', !/\$\{c\.icon\}/.test(app)&&!/\$\{p\.icon\|\|/.test(app)],
];
let bad=0; for(const [n,ok] of checks){console.log(`${ok?'OK':'FAIL'}  ${n}`);if(!ok)bad++}
console.log(`\nXSS/HTML injection preflight: ${checks.length-bad}/${checks.length} bestanden.`); if(bad)process.exit(1);
