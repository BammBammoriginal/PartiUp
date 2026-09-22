const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const db=fs.readFileSync('server/db.js','utf8');
const server=fs.readFileSync('server/server.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const checks=[
 ['network identity header',app.includes('NETZWERKIDENTITÄT')],
 ['profile sections', ['Mitgliedschaften','Interessen & Themen','Projekte','Veranstaltungen','Verbindungen'].every(x=>app.includes(x))],
 ['no influencer activity tab',!app.includes("['activity','Aktivität']")],
 ['connection chips in profile',app.includes("connectionChip('place',p.place")&&app.includes("connectionChip('community',m")&&app.includes("connectionChip('project',pr")&&app.includes("connectionChip('event',e")],
 ['privacy-scoped location schema',db.includes('place_visibility TEXT NOT NULL')&&db.includes("ensureColumn('user_preferences','place_visibility'")],
 ['location privacy enforced',db.includes("prefAllows(viewerId,id,pref.place_visibility")],
 ['event attendance visibility enforced',db.includes("pref.event_attendance_visibility")&&db.includes('event_attendance=')],
 ['membership visibility reused',db.includes("pref.memberships_visibility")],
 ['follow visibility reused',db.includes("followed_topics")&&db.includes("pref.follows_visibility")],
 ['shared connections privacy-aware',db.includes('shared_connections')&&db.includes('sharedCommunities')&&db.includes('sharedTopics')],
 ['existing relationship models reused',db.includes('user_friendships')&&db.includes('user_follows')&&db.includes('memberships')],
 ['preferences endpoint persists location visibility',server.includes('place_visibility=?')],
 ['profile settings expose location visibility',app.includes('id="placeVisibility"')],
 ['mobile responsive profile',css.includes('@media(max-width:700px)')&&css.includes('.profile-network-grid{grid-template-columns:1fr}')],
 ['no duplicate profile relationship tables',!db.includes('CREATE TABLE IF NOT EXISTS user_profile_friend')&&!db.includes('CREATE TABLE IF NOT EXISTS user_profile_follow')&&!db.includes('CREATE TABLE IF NOT EXISTS user_profile_membership')]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)pass++}console.log(`PartiUp P0.12.5 network-profile preflight: ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
