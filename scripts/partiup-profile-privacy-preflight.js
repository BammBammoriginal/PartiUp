const fs=require('fs');const db=fs.readFileSync('server/db.js','utf8'),srv=fs.readFileSync('server/server.js','utf8'),ui=fs.readFileSync('public/app.js','utf8'),privacy=fs.readFileSync('server/privacy.js','utf8'),protocol=fs.readFileSync('server/federation/protocol.js','utf8');
const checks=[
 ['four audience levels',db.includes("'public','members','network','private'")&&ui.includes('Netzwerk / Freunde')&&ui.includes('Angemeldete Mitglieder')],
 ['legacy members migration is conservative',db.includes("WHEN profile_visibility='members' THEN 'network'")&&db.includes("WHEN visibility='members' THEN 'network'")],
 ['global profile gate server side',db.includes('prefAllows(viewerId,id,pref.profile_visibility)')],
 ['granular bio/location/memberships/interests',db.includes('bio_visibility')&&db.includes('place_visibility')&&db.includes('memberships_visibility')&&db.includes('interests_visibility')],
 ['projects/events/shared contacts/activity granular',db.includes('projects_visibility')&&db.includes('event_attendance_visibility')&&db.includes('shared_connections_visibility')&&db.includes('profile_activity_visibility')],
 ['new share default visibility',db.includes('profile_activity_default_visibility')&&srv.includes('profile_activity_default_visibility')],
 ['per activity visibility supports network',srv.includes("['public','members','network','private'].includes(req.body?.visibility)")],
 ['original object remains upper bound',db.includes('profileActivityTarget(a.target_type,a.target_id,viewerId)')&&srv.includes('profileActivityTarget(a.target_type,a.target_id,null)')],
 ['profile previews server computed',srv.includes("/api/profile-preview/:mode")&&ui.includes('data-profile-preview="public"')&&ui.includes('data-profile-preview="network"')],
 ['IDOR owner scoped writes',srv.includes("WHERE id=? AND user_id=?")&&srv.includes("WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT 100")],
 ['visibility changes audited without view tracking',db.includes('CREATE TABLE IF NOT EXISTS profile_visibility_audit')&&srv.includes('auditProfileVisibility')&&!srv.includes('profile_view_audit')],
 ['privacy export/delete covers audit',privacy.includes("profile_visibility_audit:'DELETE'")&&privacy.includes('profile_visibility_audit:rows')],
 ['federation bio respects granular public visibility',protocol.includes("u.bio_visibility==='public'")],
 ['privacy center UI fields',ui.includes('Profil & Sichtbarkeit')&&ui.includes('bioVisibility')&&ui.includes('sharedConnectionsVisibility')&&ui.includes('profileActivityDefaultVisibility')],
 ['no analytics/ranking introduced',!db.includes('profile_engagement')&&!db.includes('profile_rank')&&!srv.includes('engagement_score')]
];let ok=0;for(const [n,v] of checks){console.log(`${v?'PASS':'FAIL'} ${n}`);if(v)ok++}console.log(`\nP0.12.7 profile privacy: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
