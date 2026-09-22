const fs=require('fs');
const html=fs.readFileSync('public/index.html','utf8');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const data=JSON.parse(fs.readFileSync('public/data/fediverse-apps.json','utf8'));
const checks=[
 ['five Discover tabs',['for-you','local','communities','topics','fediverse'].every(x=>html.includes(`data-discover-tab="${x}"`))],
 ['Fediverse remains inside Discover',/<section id="discover"[\s\S]+id="fediverseDiscover"/.test(html)],
 ['existing Discover search retained',html.includes('id="search"')&&html.includes('id="discover-list"')],
 ['hero only in Fediverse panel',html.includes('OFFEN. VERNETZT. GEMEINSAM STÄRKER.')&&html.includes('id="fediverseDiscover"')],
 ['curated JSON source',Array.isArray(data)&&data.length>=6&&data.every(x=>x.name&&x.slug&&x.shortDescription&&x.category&&x.externalUrl)],
 ['no crawler or scraping implementation',!app.includes('crawler')&&!app.includes('scrape')&&!app.includes('fediverse.party')],
 ['six popular applications',['Mastodon','Mobilizon','PeerTube','Pixelfed','Lemmy','Friendica'].every(x=>data.some(a=>a.name===x))],
 ['all-apps toggle is lightweight',app.includes('fediverseShowAll')&&app.includes('showAllFediverseApps')],
 ['external links hardened',app.includes('target="_blank" rel="noopener noreferrer"')],
 ['accessible Discover tabs',html.includes('role="tablist"')&&html.includes('aria-selected="true"')],
 ['responsive app cards',css.includes('.fediverse-app-grid')&&css.includes('@media(max-width:700px)')&&css.includes('grid-template-columns:1fr')],
 ['supporting info column',html.includes('Was ist das Fediverse?')&&html.includes('Das passt zu PartiUp, weil')],
 ['Fediverse does not replace core view',app.includes("$('#discoverCore').hidden=fed")&&app.includes("$('#fediverseDiscover').hidden=!fed")],
 ['topics use real topic navigation',app.includes('discoverTopicCard')&&app.includes('openTopic(x.dataset.topic)')],
 ['no ranking language or mechanics',html.includes('ohne algorithmisches Ranking')&&!app.includes('engagementScore')]
];
let ok=0;for(const [n,v] of checks){console.log(`${v?'PASS':'FAIL'} ${n}`);if(v)ok++;}console.log(`PartiUp P0.12.8 Fediverse Discover: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
