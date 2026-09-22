const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const server=fs.readFileSync(path.join(root,'server/server.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server/db.js'),'utf8');
const tests=[
  ['central follow bucket', app.includes('const FOLLOW_BUCKET=') && app.includes("community:'communities'") && app.includes("person:'people'")],
  ['star states', app.includes("icon:'★'") && app.includes("icon:'☆'")],
  ['persistent accessible state', app.includes('aria-pressed') && app.includes('aria-label') && app.includes('title=')],
  ['visible text state', app.includes("text:'Du folgst'") && app.includes("label||'Folgen'")],
  ['single reusable component', app.includes('const followButton=') && app.includes('function wireFollowButtons')],
  ['optimistic local update', app.includes('setFollowingLocal(type,id,next)') && app.includes('syncFollowButtons(type,id,true)')],
  ['rollback on API error', app.includes('setFollowingLocal(type,id,wasFollowing)') && app.includes('Änderung nicht gespeichert')],
  ['server response reconciled', app.includes('if(result?.following)state.following=result.following')],
  ['API permission path preserved', server.includes("app.post('/api/follows',requireUser") && server.includes("app.delete('/api/follows/:type/:id',requireUser")],
  ['friendship stays separate', db.includes('CREATE TABLE IF NOT EXISTS user_friendships') && db.includes('CREATE TABLE IF NOT EXISTS user_follows')],
  ['all current entity types use component', ['person','community','place','topic','participation'].every(type=>app.includes(`followButton('${type}'`)) && app.includes('followButton(type,o.id')],
  ['keyboard focus visible', css.includes('.follow-button:focus-visible')],
  ['reduced motion respected', css.includes('prefers-reduced-motion:reduce')],
  ['mobile touch target', css.includes('@media(max-width:700px){.follow-button{min-height:44px}')],
  ['no undefined renderAll regression', !app.includes('renderAll()')]
];
let ok=0;
for(const [name,pass] of tests){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\n${ok}/${tests.length} checks passed`);
if(ok!==tests.length)process.exit(1);
