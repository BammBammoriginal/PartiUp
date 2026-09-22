const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const must=[
  'server/core/architecture.js','server/federation/README.md','server/connectors/README.md',
  'server/integrations/README.md','PARTIUP-P0.1-ARCHITECTURE.md',
  'server/modules/participation/README.md','server/modules/events/README.md','server/modules/projects/README.md'
];
let failed=0;
for(const rel of must){const ok=fs.existsSync(path.join(root,rel));console.log(`${ok?'OK  ':'FAIL'} ${rel}`);if(!ok)failed++;}
const arch=require(path.join(root,'server','core','architecture.js')).architectureSnapshot();
const semantic=arch.product==='PartiUp'&&/^P0\.\d+(?:\.\d+)?$/.test(String(arch.milestone||''))&&arch.modules.participation?.coreProduct===true&&arch.interoperability.federation.protocol==='ActivityPub'&&!!arch.interoperability.connectors;
console.log(`${semantic?'OK  ':'FAIL'} PartiUp Core/Participation/Federation/Connector semantics`);if(!semantic)failed++;
if(failed)process.exit(1);
console.log('\nPartiUp architecture baseline preflight bestanden.');
