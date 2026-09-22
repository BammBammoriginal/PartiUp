const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const checks=[
  ['db.js definiert sharesCommunity lokal',/function\s+sharesCommunity\s*\(/.test(db)],
  ['db.js definiert Membership-Helper lokal',/function\s+isCommunityMember\s*\(/.test(db)],
  ['db.js referenziert keinen server-only mustBeMember-Helper',!/(?<!function\s)mustBeMember\s*\(/.test(db)],
  ['Profil-Sichtbarkeit nutzt lokale Audience-/Friendship-Beziehung',db.includes('function prefAllows')&&db.includes('isAcceptedFriend(viewerId,targetId)')&&db.includes("if(value==='members')return !!viewerId")],
  ['Membership-Sichtbarkeit nutzt lokalen Membership-Helper',db.includes('isCommunityMember(viewerId,c.id)')]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`\n${failed} Modulgrenzen-Prüfung(en) fehlgeschlagen.`);process.exit(1)}
console.log('\nModule-Boundary-Preflight bestanden.');
