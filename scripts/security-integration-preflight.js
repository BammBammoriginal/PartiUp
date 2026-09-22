const fs=require('fs');
const p='tests/integration/security-permissions.integration.js';
const s=fs.readFileSync(p,'utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[
 ['integration test file exists',fs.existsSync(p)],
 ['unauthenticated access covered',s.includes('Unauthenticated permissions are blocked')&&s.includes('Unauthenticated moderation queue is blocked')],
 ['owner/admin/moderator/member/guest covered',['owner','admin','moderator','member','guest'].every(x=>s.includes(x))],
 ['role escalation covered',s.includes('Moderator cannot assign roles')&&s.includes('Admin still cannot reassign roles')],
 ['task authorization covered',s.includes('Guest cannot create project task')&&s.includes('Assigned member can update own task')],
 ['space boundary covered',s.includes('Moderator rights do not leak to another community')],
 ['moderation flow covered',s.includes('Moderator sees newly created report')&&s.includes('mark report for review')],
 ['CSRF covered',s.includes('without CSRF is rejected')],
 ['cross-origin covered',s.includes('Cross-origin state-changing request is rejected')],
 ['package exposes security integration',pkg.scripts?.['security-integration']?.includes('security-permissions.integration.js')],
 ['fast QA includes security integration',pkg.scripts?.['qa:fast']?.includes('qa:security')]
];
for(const [n,ok] of checks)console.log(`${ok?'✓':'✗'} ${n}`);
const bad=checks.filter(x=>!x[1]);if(bad.length){console.error(`Security-Integration-Preflight: ${checks.length-bad.length}/${checks.length} bestanden`);process.exit(1)}
console.log(`Security-Integration-Preflight: ${checks.length}/${checks.length} bestanden`);
