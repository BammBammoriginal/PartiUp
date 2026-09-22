const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const checks=[
 ['Reusable connection chip component', app.includes('function connectionChip(type,entity,opts={})')],
 ['Central connection navigation', app.includes('function navigateConnection(type,id)')&&app.includes("type==='place'")&&app.includes("type==='topic'")&&app.includes("type==='community'")&&app.includes("type==='person'")],
 ['No topic navigation via discover text search', app.includes('function openTopic(id,push=true)')&&!/topic-open[^\n]+go\('discover'\)/.test(app)],
 ['Places use entity id', app.includes("connectionGroup('place',o.places||[]")],
 ['Topics use stable model identity', app.includes("connectionGroup('topic',o.topics||[]")],
 ['Community relations navigable', app.includes("connectionGroup('community',e.communities")&&app.includes("connectionGroup('community',p.communities")],
 ['Person place/interests navigable', app.includes("connectionChip('place',p.place")&&app.includes("connectionChip('topic',t")],
 ['Participation relations navigable', app.includes("connectionGroup('project',p.projects")&&app.includes("connectionGroup('community',p.communities")],
 ['Status chips remain distinct', app.includes('status-badge')&&app.includes('member-badge')&&!css.includes('.status-badge{cursor:pointer')],
 ['Keyboard focus visible', css.includes('.connection-chip:focus-visible')],
 ['Mobile touch target', css.includes('.connection-chip{min-height:40px')],
 ['Native button semantics', app.includes('class=\"connection-chip\"')],
 ['Connection click stops parent card navigation', app.includes('e.stopPropagation();navigateConnection')],
 ['Topic has direct hash route', app.includes('#topic/${encodeURIComponent(id)}')&&app.includes("location.hash.startsWith('#topic/')")],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}console.log(`PartiUp P0.12.3 Connection Chips: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
