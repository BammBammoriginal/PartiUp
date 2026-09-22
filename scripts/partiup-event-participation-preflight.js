const fs=require('fs');const path=require('path');const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');const proto=fs.readFileSync(path.join(root,'server','federation','protocol.js'),'utf8');const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');const mobile=fs.readFileSync(path.join(root,'tests','e2e','layout.mobile.spec.js'),'utf8');
const checks=[
 ['remote attendance schema',db.includes('CREATE TABLE IF NOT EXISTS event_remote_attendance')],
 ['attendance privacy manager endpoint',server.includes('/api/events/:id/attendance-management')&&server.includes('event.manage_participants')],
 ['local approval decision',server.includes('/api/events/:id/attendance/:kind/:subject')&&server.includes('Teilnahmeanfrage abgelehnt')],
 ['capacity includes remote attendees',server.includes('event_remote_attendance')&&server.includes("status='going'")],
 ['outbound Join',proto.includes('joinActivityForEvent')&&server.includes('deliverActivity(db,req.userId,inbox,join)')],
 ['outbound Leave',proto.includes('leaveActivityForEvent')&&server.includes("app.delete('/api/events/:id/rsvp'")],
 ['space inbox Join Leave',server.includes("receiverType:'space'")&&server.includes("['Join','Leave'].includes(activity.type)")],
 ['user inbox Join Leave',server.includes("receiverType:'user'")],
 ['inbound Accept Reject',server.includes("['Accept','Reject'].includes(activity.type)")&&server.includes("federation_state='accepted'")],
 ['participant identities not public',!app.includes('Öffentliche Teilnehmerliste')&&app.includes('Personenbezogene Teilnehmerlisten bleiben privat')],
 ['management UX permission',app.includes('Teilnahme verwalten')&&app.includes('event.manage_participants')],
 ['remote pending UX',app.includes('Teilnahme angefragt')&&app.includes("o.source==='external'")],
 ['mobile participation actions',css.includes('.attendance-item')&&css.includes('min-height:44px')],
 ['process isolation guard',server.includes('canRequestEventAttendance')&&server.includes('canViewEventRow')],
 ['mobile E2E event workflow guard',mobile.includes('event participation workflow stays usable on mobile')&&mobile.includes('data-otab=\"participants\"')]
];let ok=0;for(const [n,p] of checks){console.log(`${p?'PASS':'FAIL'} ${n}`);if(p)ok++;}console.log(`PartiUp P0.12 Event Participation: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
