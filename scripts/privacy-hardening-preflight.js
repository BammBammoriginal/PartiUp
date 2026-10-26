const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8')+fs.readFileSync(path.join(root,'server','core','permissions.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'tests','integration','security-permissions.integration.js'),'utf8');
const eventAccess=fs.readFileSync(path.join(root,'tests','integration','event-access.integration.js'),'utf8');
const privacyLifecycle=fs.readFileSync(path.join(root,'server','privacy.js'),'utf8');
const checks=[
  ['Anonymous feed is restricted to public communities',db.includes("else sql+=` AND c.visibility='public'`")],
  ['Authenticated feed cannot outrun community visibility',db.includes("c.visibility='public' OR c.created_by=? OR EXISTS")],
  ['Private event access separates approved attendance from workflow states',db.includes('APPROVED_EVENT_ATTENDANCE_STATUSES')&&db.includes('function canRequestEventAttendance')&&db.includes("new Set(['going','maybe'])")],
  ['Project/event role inheritance is explicit',db.includes("role_inheritance")&&server.includes('function inheritedChildRole')],
  ['Safe child-role default is member',db.includes("DEFAULT 'member'")&&server.includes("return 'member'" )],
  ['Polymorphic orphan cleanup exists',db.includes('function cleanupOrphanedScopedData')&&db.includes("DELETE FROM tasks WHERE entity_type='project'")],
  ['Proxy-derived IPs require explicit local-proxy opt-in',server.includes("BUP_TRUST_LOCAL_PROXY==='1'")&&server.includes("cf-connecting-ip")],
  ['Forwarded IP is syntax validated',server.includes('net.isIP(cf)')&&server.includes('net.isIP(first)')],
  ['Integration test checks private feed isolation',integration.includes('Private community post is absent from anonymous feed')],
  ['Integration test checks child privilege containment',integration.includes('Parent moderator does not inherit elevated child role')],
  ['Integration test checks requested/waitlist event isolation',eventAccess.includes('requested attendance grants no detail access')&&eventAccess.includes('waitlist grants no private detail access')],
  ['Account lifecycle covers DB and physical media',privacyLifecycle.includes('privacy_file_deletion_queue')&&privacyLifecycle.includes('deleteAccountData')&&privacyLifecycle.includes('processPrivacyFileDeletionQueue')]
];
console.log('\nPrivacy & Stability Hardening Preflight');
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'✓':'✗'} ${name}`);if(pass)ok++;}
console.log(`\nPrivacy hardening: ${ok}/${checks.length} bestanden`);
if(ok!==checks.length)process.exit(1);
