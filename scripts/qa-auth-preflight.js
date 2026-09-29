const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const auth = fs.readFileSync(path.join(root, 'tests', 'auth.setup.js'), 'utf8');
const visual = fs.readFileSync(path.join(root, 'tests', 'e2e', 'visual.spec.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server', 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const registration = fs.readFileSync(path.join(root, 'tests', 'e2e', 'messaging.gold.desktop.spec.js'), 'utf8');

const checks = [
  ['QA setup uses visible identity control', /locator\(['\"]#identityButton['\"]\)\.click\(\)/.test(auth)],
  ['QA setup submits visible login form', /locator\(['\"]#login['\"]\)\.click\(\)/.test(auth)],
  ['QA setup does not bypass login through request API', !/page\.request\.post\(['\"]\/api\/login['\"]/.test(auth)],
  ['QA setup verifies the real session cookie', /cookie\.name === ['\"]bup_session['\"]/.test(auth)],
  ['QA setup persists storageState', /storageState\(\{\s*path:\s*authFile\s*\}\)/.test(auth)],
  ['Registration is guarded and separately rate limited', /app\.post\('\/api\/register',registrationLimit,csrfGuard/.test(server)],
  ['Registration is visible and tested with two accounts', /id="showRegistration"/.test(app) && /id="register"/.test(app) && /Zwei Konten sichtbar registrieren/.test(registration)],
  ['Visual suite reuses authenticated state', /assertAuthenticated\(page\)/.test(visual) && !/loginAsMax\(page\)/.test(visual)]
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} QA-Auth-Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log(`\nQA-Auth-Preflight: ${checks.length}/${checks.length} bestanden.`);
