const fs = require('fs');
const html = fs.readFileSync('public/index.html','utf8');
const helper = fs.readFileSync('tests/helpers/app.js','utf8');
const app = fs.readFileSync('public/app.js','utf8');
const checks = [
  ['mobile bottom nav has More', /id="mobileMore"/.test(html)],
  ['mobile bottom nav does not duplicate Events', !/mobile-bottom-nav[\s\S]*data-page="events"/.test(html)],
  ['QA detects mobile viewport', /matchMedia\('\(max-width: 850px\)'\)/.test(helper)],
  ['QA uses mobile bottom nav explicitly', /\.mobile-bottom-nav \[data-page=/.test(helper)],
  ['QA uses drawer fallback', /#appSidebar \[data-page=/.test(helper)],
  ['runtime direct mobile pages are compact set', /\['home','discover','communities','messages'\]/.test(app)]
];
let fail=0; for (const [name,ok] of checks){console.log(ok?'OK  ':'FAIL',name); if(!ok) fail++;}
if(fail){process.exit(1)}
console.log(`Mobile-Nav-QA-Preflight: ${checks.length}/${checks.length} bestanden.`)
