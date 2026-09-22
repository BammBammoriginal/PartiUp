const fs=require('fs');
const html=fs.readFileSync('public/index.html','utf8');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const checks=[
 ['For-you landing is separate from browse results',html.includes('id="discoverLanding"')&&html.includes('id="discoverBrowse"')],
 ['Discover tabs stay five-part',['for-you','local','communities','topics','fediverse'].every(x=>html.includes(`data-discover-tab="${x}"`))],
 ['For-you hero has explicit no-ranking language',html.includes('ohne algorithmisches Ranking')&&html.includes('Entdecke, was zu dir passt')],
 ['Network section exists',html.includes('Aus deinem Netzwerk')&&html.includes('id="discoverNetworkPreview"')],
 ['Nearby section exists and links to local tab',html.includes('In deiner Nähe')&&html.includes('data-discover-jump="local"')],
 ['Topic section exists and links to topics tab',html.includes('Passend zu deinen Themen')&&html.includes('data-discover-jump="topics"')],
 ['Nearby preview switches context before opening',app.includes("openDiscoverPreview(type,id,sourceTab){if(sourceTab==='local'||sourceTab==='topics')setDiscoverTab(sourceTab);navigateConnection(type,id)")],
 ['Topic chip lands in Discover topics tab',app.includes("setDiscoverTab('topics');const s=$('#search')")],
 ['Local tab highlights explicit place selector',html.includes('id="discoverLocalContext"')&&html.includes('id="discoverLocalPlace"')&&app.includes('renderLocalSelector()')],
 ['Local place selector updates existing place context',app.includes('context.placeId=sel.value')&&app.includes('renderPlaces();renderDiscover()')],
 ['Fediverse remains isolated to its tab',app.includes("$('#discoverCore').hidden=fed")&&app.includes("$('#fediverseDiscover').hidden=!fed")],
 ['Fediverse learn-more is secondary',app.includes('class="fediverse-learn-more"')&&css.includes('.fediverse-learn-more{border:0;background:transparent')],
 ['Discover cards are keyboard operable',app.includes("if(e.key==='Enter'||e.key===' ')")&&css.includes('.discover-preview-card:focus-visible')],
 ['Discover landing responsive',css.includes('@media(max-width:700px)')&&css.includes('.discover-preview-grid,.discover-preview-grid.compact{grid-template-columns:1fr}')],
 ['No new recommendation score/ranking machinery',!app.includes('recommendationScore')&&!app.includes('engagementScore')&&!app.includes('rankScore')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`PartiUp P0.12.10 Discover Landing: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
