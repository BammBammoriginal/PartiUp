const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const checks=[
 // Behaviour is checked by the browser test (count equals the listed areas while a person is followed); only its existence is guarded here.
 ['Network count is covered by the followed-areas browser test', fs.existsSync('tests/helpers/network-flow.js') && fs.existsSync('tests/e2e/network.gold.desktop.spec.js') && fs.existsSync('tests/e2e/network.gold.mobile.spec.js')],
 ['Person follows live in people network', app.includes('Weitere gefolgte Personen') && app.includes('Personen-Follows findest du unter <b>Freunde & Personenbeziehungen</b>')],
 ['Following areas has no legacy people section', !/Gefolgte Bereiche[\s\S]{0,1800}<h3>Personen<\/h3>/.test(app)],
 ['Legacy follow-item navigation removed', !app.includes('data-follow-place') && !app.includes('data-follow-topic')],
 ['Followed places use connection + central follow', app.includes("connectionChip('place',p,{icon:'📍'})") && app.includes("followButton('place',p.id,'Folgen','follow-button compact')")],
 ['Followed topics use connection + central follow', app.includes("connectionChip('topic',t.id,{icon:'#'})") && app.includes("followButton('topic',t.id,'Folgen','follow-button compact')")],
 ['Person cards use central follow control', /function personCard\(p\)[\s\S]{0,900}followButton\('person'/.test(app)],
 ['Community cards use central follow control', /function communityCard\(c\)[\s\S]{0,1000}followButton\('community'/.test(app)],
 ['Person overview uses connection chips', /active==='overview'[\s\S]{0,1000}connectionChip\('place',p\.place/.test(app) && /active==='overview'[\s\S]{0,1300}connectionChip\('topic',t/.test(app)],
 ['Person interests uses connection chips', /active==='interests'[\s\S]{0,900}profileConnectionList\('topic'/.test(app) && /function profileConnectionList[\s\S]{0,400}connectionChip\(type,x/.test(app)],
 ['Friend card place uses connection chip', /function friendNetworkCard\(p\)[\s\S]{0,900}connectionChip\('place',p\.place/.test(app)],
 ['Topic previews link actual communities', /topic-items[\s\S]{0,400}connectionGroup\('community',cs\.slice/.test(app)],
 ['People list rewires follow and connections', app.includes("wireFollowButtons($('#people-list'));wireConnectionChips($('#people-list'))")],
 ['Discover rewires follow and connections', app.includes("wireFollowButtons($('#discover-list'));wireConnectionChips($('#discover-list'))")],
 ['Community filtering rewires follow controls', app.includes("wireFollowButtons($('#communities-list'));wireConnectionChips($('#communities-list'))")],
 ['Person card navigation protects nested actions', app.includes("e.target.closest('button,a,details,summary,[data-connection-type]')")],
 ['Cross-level mobile layout exists', css.includes('.followed-entity-row') && css.includes('.person-card-status .card-follow')],
 ['PartiUp product name in current UI', app.includes("'PARTIUP SPACE'") && !app.includes('BOTTOMUPPARTI SPACE')],
 ['Network labels still present', html.includes('Freunde') && html.includes('Mitgliedschaften') && html.includes('gefolgte Bereiche')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`PartiUp P0.12.4 Cross-Space Consistency: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
