const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const server = read('server/server.js');
const html = read('public/index.html');
const localBat = read('start-local.bat');
const networkBat = read('start-network.bat');
const setupBat = read('setup.bat');
const setupQaBat = read('setup-qa.bat');
const runtimeFiles = [server, html, localBat, networkBat, setupBat, setupQaBat];
const hardcodedRuntimeVersion = /v\d+\.\d+\.\d+(?:\.\d+)?/;
const checks = [
  ['package.json hat gültige Version', /^\d+\.\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/.test(version)],
  ['Health-API nutzt package.json als Source of Truth', server.includes("const pkg = require('../package.json');") && server.includes('version:pkg.version')],
  ['PartiUp-Server-Start nutzt package.json als Source of Truth', server.includes('PartiUp v${pkg.version}')],
  ['UI enthält keine hartcodierte Release-Version', !hardcodedRuntimeVersion.test(html)],
  ['Start-/Setup-Skripte enthalten keine hartcodierte Release-Version', ![localBat,networkBat,setupBat,setupQaBat].some(x=>hardcodedRuntimeVersion.test(x))],
  ['Produkt-Preflight ist dynamisch', read('scripts/preflight.js').includes('Versionskonsistenz dynamisch') && read('scripts/preflight.js').includes('pkg.version')]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) { console.error(`\n${failed} Versionsprüfung(en) fehlgeschlagen.`); process.exit(1); }
console.log(`\nVersion-Preflight bestanden (${version}); package.json ist die einzige Runtime-Quelle.`);
