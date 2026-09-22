const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
let fail=0;
const files=[
  'playwright.config.js','tests/auth.setup.js','tests/global-setup.js','tests/helpers/app.js',
  'tests/e2e/smoke.desktop.spec.js','tests/e2e/smoke.mobile.spec.js',
  'tests/e2e/layout.desktop.spec.js','tests/e2e/layout.mobile.spec.js',
  'tests/e2e/accessibility.spec.js','tests/e2e/visual.spec.js'
];
for(const f of files){const ok=fs.existsSync(path.join(root,f));console.log(`${ok?'OK  ':'FAIL'} QA-Datei ${f}`);if(!ok)fail++}
const required=['qa','qa:fast','qa:full','qa:smoke:desktop','qa:smoke:mobile','qa:layout:desktop','qa:layout:mobile','qa:accessibility','qa:visual','qa:baseline','release-check','release-check:full'];
for(const s of required){const ok=!!pkg.scripts?.[s];console.log(`${ok?'OK  ':'FAIL'} QA-Script ${s}`);if(!ok)fail++}
const cfg=fs.readFileSync(path.join(root,'playwright.config.js'),'utf8');
const helper=fs.readFileSync(path.join(root,'tests/helpers/app.js'),'utf8');
const smokeD=fs.readFileSync(path.join(root,'tests/e2e/smoke.desktop.spec.js'),'utf8');
const smokeM=fs.readFileSync(path.join(root,'tests/e2e/smoke.mobile.spec.js'),'utf8');
const layoutD=fs.readFileSync(path.join(root,'tests/e2e/layout.desktop.spec.js'),'utf8');
const layoutM=fs.readFileSync(path.join(root,'tests/e2e/layout.mobile.spec.js'),'utf8');
const auth=fs.readFileSync(path.join(root,'tests/auth.setup.js'),'utf8');
const checks=[
 ['QA nutzt isolierte DB pro Lauf',cfg.includes('qaRunId')&&cfg.includes('qa-bottomupparti-${qaRunId}.db')],
 ['QA authentifiziert über sichtbaren Login',auth.includes("locator('#identityButton').click()")&&auth.includes("locator('#login').click()")&&auth.includes('storageState')],
 ['QA enthält keinen Auth-Bypass',!auth.includes("page.request.post('/api/login'")&&!auth.includes('test-login')],
 ['Fast QA trennt Desktop und Mobile',pkg.scripts['qa:smoke:desktop'].includes('--project=desktop')&&pkg.scripts['qa:smoke:mobile'].includes('--project=mobile')],
 ['Layout QA trennt Desktop und Mobile',pkg.scripts['qa:layout:desktop'].includes('--project=desktop')&&pkg.scripts['qa:layout:mobile'].includes('--project=mobile')],
 ['Mobile Smoke nutzt echten Navigationshelper',smokeM.includes("go(page, pageId)")&&helper.includes('#mobileMore')],
 ['Desktop Layout enthält keine Mobile-Verzweigung',!layoutD.includes("project.name === 'mobile'")],
 ['Mobile Layout enthält keine Desktop-Verzweigung',!layoutM.includes("project.name === 'desktop'")],
 ['Fast QA enthält keine Accessibility-Vollprüfung',!pkg.scripts['qa:fast'].includes('accessibility')],
 ['Full QA enthält Accessibility',pkg.scripts['qa:full'].includes('qa:accessibility')],
 ['Kurzer QA Timeout gesetzt',cfg.includes('timeout: 8_000')],
 ['App readiness hängt nicht an sichtbarem Desktop-Titel',helper.includes("#mainContent")&&!helper.includes("locator('#title')).toBeVisible")],
 ['Desktop Smoke deckt Kernseiten ab',['discover','communities','people','events','projects','participation'].every(x=>smokeD.includes(`'${x}'`))]
];
for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)fail++}
if(fail){console.error(`\n${fail} QA-Preflight-Prüfung(en) fehlgeschlagen.`);process.exit(1)}
console.log('\nQA-Infrastruktur: Fast/Full-Gates statisch vollständig.');
