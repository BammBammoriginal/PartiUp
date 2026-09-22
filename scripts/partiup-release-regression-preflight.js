const fs=require('fs');
const path=require('path');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
const pkg=require('../package.json');
const checks=[
  ['Version >= 0.11.1',(()=>{const [a,b,c]=String(pkg.version||'0.0.0').split('.').map(Number);return a>0||b>11||(b===11&&c>=1)})()],
  ['Community Gruppen/Teams View vorhanden',app.includes("if(active==='spaces')body=`")&&app.includes('id="createSubspace"')],
  ['Community Event View + Erstellung vorhanden',app.includes("if(active==='events')body=`")&&app.includes('id="createSpaceEvent"')],
  ['Community Projekt View + Erstellung vorhanden',app.includes("if(active==='projects')body=`")&&app.includes('id="createSpaceProject"')],
  ['Community Beteiligung View + Erstellung vorhanden',app.includes("if(active==='participation')body=`")&&app.includes('id="createSpaceParticipation"')],
  ['Community Creation Handler verdrahtet',app.includes("if($('#createSpaceEvent'))")&&app.includes("if($('#createSpaceProject'))")&&app.includes("if($('#createSpaceParticipation'))")],
  ['Unterraum/Team Handler verdrahtet',app.includes("if($('#createSubspace'))$('#createSubspace').onclick=()=>subspaceForm(c)")],
  ['Community Moderation verwendet Community authz',app.includes("c.authz?.my_permissions")&&!/api\/moderation\/community\/\$\{c\.id\}\/reports[\s\S]{0,250}\bo\.authz/.test(app)],
  ['Space Container mobile begrenzt',css.includes('.space-page,.community-tab,.space-tab,.space-header,.space-identity')&&css.includes('max-width:100%')],
  ['Space Tabs mobil horizontal scrollbar',css.includes('.space-function-tabs{display:flex;width:100%;max-width:100%;overflow-x:auto')],
  ['Community Grids mobil einspaltig',css.includes('.community-tab .modal-grid,.community-tab .participation-grid,.community-tab .space-child-grid{grid-template-columns:minmax(0,1fr)')],
  ['Mobile Create Button Touch-Ziel',css.includes('.community-tab .section-head>button{width:100%;min-height:44px}')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'✓':'✗'} ${name}`);if(pass)ok++;}
console.log(`\nP0.11+ Release-Regression: ${ok}/${checks.length} bestanden`);if(ok!==checks.length)process.exit(1);
