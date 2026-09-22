const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const checks=[
 ['five Discover tabs remain', ['for-you','local','communities','topics','fediverse'].every(x=>html.includes(`data-discover-tab="${x}"`))],
 ['For-you landing is its own pane', html.includes('id="discoverLanding"') && html.includes('id="discoverNetworkPreview"') && html.includes('id="discoverLocalPreview"') && html.includes('id="discoverTopicPreview"')],
 ['Browse pane is separate from landing', html.includes('id="discoverBrowse" class="discover-browse" hidden')],
 ['Fediverse pane is separate and initially hidden', html.includes('id="fediverseDiscover" class="fediverse-discover" hidden')],
 ['hidden Discover panes are author-CSS safe', css.includes('.discover-landing[hidden],.discover-browse[hidden],.fediverse-discover[hidden]{display:none!important}')],
 ['tab switch separates fediverse from core', app.includes("$('#discoverCore').hidden=fed") && app.includes("$('#fediverseDiscover').hidden=!fed")],
 ['For-you vs browse switching explicit', app.includes("landing.hidden=!isLanding") && app.includes("browse.hidden=isLanding")],
 ['Local only filters by place', app.includes("if(discoverTab==='local')items=items.filter(discoverItemIsLocal)")],
 ['Communities only filters communities', app.includes("if(discoverTab==='communities')items=items.filter(x=>x.type==='community')")],
 ['Topics has dedicated topic rendering', app.includes("if(discoverTab==='topics'){const topics=state.topics.filter")],
 ['Fediverse render is isolated', app.includes("if(discoverTab==='fediverse'){renderFediverseApps();return}")],
 ['Discover tab navigation itself is not hidden', /<div class="discover-tabs tabs"[^>]*>/.test(html)]
];
let failed=0;
for(const [name,ok] of checks){console.log(ok?'OK  ':'FAIL',name);if(!ok)failed++;}
console.log(`\nP0.12.11 Discover tab isolation: ${checks.length-failed}/${checks.length} bestanden.`);
if(failed)process.exit(1);
