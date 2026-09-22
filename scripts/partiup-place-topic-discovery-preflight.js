const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const checks=[
 ['place context derives existing relations',app.includes('function contextItemsForPlace(id)')&&app.includes('placeMatches(x,id)')],
 ['topic context derives existing relations',app.includes('function contextItemsForTopic(topic)')&&app.includes("(x.topics||[]).includes(topic)")],
 ['no new ranking algorithm',!app.includes('recommendation_score')&&!app.includes('engagement_score')&&!app.includes('rankScore')],
 ['place detail has context overview',app.includes('ORTSKONTEXT')&&app.includes('Lokal entdecken')],
 ['place detail exposes related topics',app.includes('Starke Themenverbindungen')&&app.includes("contextTopicLinks(items,'',id)")],
 ['topic detail has context overview',app.includes('THEMENKONTEXT')&&app.includes('In Entdecken öffnen')],
 ['topic detail exposes places',app.includes('Orte zu diesem Thema')&&app.includes("contextPlaceLinks(items,topicFilter=context.topicId||'')")],
 ['topic detail exposes related topics',app.includes('Verwandte Themen')&&app.includes('rankedContextTopics(items,t,8)')],
 ['discover has dedicated context overview',html.includes('id="discoverContextOverview"')&&app.includes('function renderDiscoverContextOverview()')],
 ['local discovery summary uses place relations',app.includes("if(discoverTab==='local')")&&app.includes('contextItemsForPlace(context.placeId)')&&app.includes("contextTopicLinks(items,'',context.placeId)")],
 ['topics discovery summary is relationship based',app.includes('THEMENLANDSCHAFT')&&app.includes('flattenContextItems(contextItemsForTopic(t)).length')],
 ['community discovery shows place/topic axes',app.includes('COMMUNITY-NETZWERK')&&app.includes('rankedContextPlaces(state.communities,6)')&&app.includes("rankedContextTopics(state.communities,'',6)")],
 ['context chips navigate through central place/topic paths',app.includes("data-context-topic")&&app.includes("openTopic(b.dataset.contextTopic)")&&app.includes("navigateConnection('place',b.dataset.contextPlace)")],
 ['discover local jump preserves chosen place',app.includes('data-context-discover-local')&&app.includes("setDiscoverTab('local')")],
 ['discover topic jump opens topics tab',app.includes('data-context-discover-topic')&&app.includes("setDiscoverTab('topics')")],
 ['mobile context layout exists',css.includes('@media(max-width:850px)')&&css.includes('.context-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}')],
 ['context content reuses existing cards',app.includes('groups.communities.map(communityCard)')&&app.includes('groups.events.map(eventCard)')&&app.includes('groups.projects.map(projectCard)')&&app.includes('groups.participation.map(participationCard)')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`PartiUp P0.16 Places / Topics / Discovery: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
