const fs=require('fs');
const html=fs.readFileSync('public/index.html','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const helper=fs.readFileSync('tests/helpers/app.js','utf8');
const mobileSmoke=fs.readFileSync('tests/e2e/smoke.mobile.spec.js','utf8');
const mobileLayout=fs.readFileSync('tests/e2e/layout.mobile.spec.js','utf8');
const checks=[
  ['dedicated app sidebar id exists', /id="appSidebar" class="app-sidebar"/.test(html)],
  ['desktop sidebar CSS is scoped', /\.app-sidebar\{position:sticky/.test(css)],
  ['mobile sidebar CSS is scoped', /@media\(max-width:850px\)[\s\S]*?\.app-sidebar\{position:fixed/.test(css)],
  ['menu-open only targets app sidebar', /\.menu-open \.app-sidebar\{transform:none\}/.test(css)],
  ['generic aside is not used as app-shell selector', !/(^|[}\s])aside\{position:(sticky|fixed)/m.test(css)],
  ['QA navigation targets app sidebar', /#appSidebar \[data-page=/.test(helper)],
  ['mobile smoke checks off-canvas geometry', /sidebarBox\.x \+ sidebarBox\.width/.test(mobileSmoke)],
  ['mobile layout checks off-canvas geometry', /sidebarBox\.x \+ sidebarBox\.width/.test(mobileLayout)]
];
let failed=0;
for(const [name,ok] of checks){ console.log(ok?'OK  ':'FAIL',name); if(!ok) failed++; }
if(failed){ console.error(`Sidebar-Scope-Preflight: ${failed} fehlgeschlagen.`); process.exit(1); }
console.log(`Sidebar-Scope-Preflight: ${checks.length}/${checks.length} bestanden.`);
