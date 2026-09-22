const fs=require('fs');
const db=fs.readFileSync('server/db.js','utf8');
const server=fs.readFileSync('server/server.js','utf8');
const app=fs.readFileSync('public/app.js','utf8');
const privacy=fs.readFileSync('server/privacy.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const checks=[
 ['generic relation table',db.includes('CREATE TABLE IF NOT EXISTS user_profile_activity')&&db.includes("target_type IN ('community','event','project','topic','participation')")],
 ['no per-type activity tables',!db.includes('user_event_activity')&&!db.includes('user_project_activity')],
 ['original visibility resolver',db.includes('profileActivityTarget')&&db.includes('communityDetail(targetId,viewerId)')&&db.includes('eventDetail(targetId,viewerId)')&&db.includes('projectDetail(targetId,viewerId)')&&db.includes('participationDetail(targetId,viewerId)')],
 ['profile activity filters inaccessible targets',db.includes('.filter(Boolean)')&&db.includes('profileActivityViewerAllowed')],
 ['chronological activity',db.includes('ORDER BY datetime(created_at) DESC')],
 ['share api',server.includes("app.post('/api/profile-activity'")],
 ['edit visibility api',server.includes("app.put('/api/profile-activity/:id'")],
 ['remove api',server.includes("app.delete('/api/profile-activity/:id'")],
 ['no free post composer',!app.includes('Persönliche Aktivität veröffentlichen')&&!server.includes('/api/profile-activity/post')],
 ['activity profile tab',app.includes("['activity','Persönliche Aktivität']")],
 ['share affordance community/event/project/topic/participation',app.includes("shareProfileButton('community'")&&app.includes("shareProfileButton(type,o.id)")&&app.includes("shareProfileButton('topic'")&&app.includes("shareProfileButton('participation'")],
 ['original connection chips',app.includes('profileActivityCard')&&app.includes("connectionChip(t.type,t")],
 ['entry visibility controls',app.includes('data-activity-visibility')&&app.includes("value=\"members\"")],
 ['privacy lifecycle',privacy.includes("user_profile_activity:'DELETE'")&&privacy.includes('profile_activity:rows')],
 ['mobile activity css',css.includes('profile-activity-card')&&css.includes('@media(max-width:700px)')],
 ['no ranking algorithm',!app.includes('activityScore')&&!server.includes('activity_rank')]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(ok)pass++}console.log(`\nP0.12.6 profile activity: ${pass}/${checks.length}`);if(pass!==checks.length)process.exit(1);
