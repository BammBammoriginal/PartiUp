'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const reg=fs.readFileSync(path.join(root,'server','connectors','registry.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const arch=fs.readFileSync(path.join(root,'server','core','architecture.js'),'utf8');
const readme=fs.readFileSync(path.join(root,'server','connectors','README.md'),'utf8');
const framework=require(path.join(root,'server','connectors','registry.js'));
let normalized=null, rejectsHttp=false, rejectsCredentials=false;
try{normalized=framework.normalizeExternalEntity({connectorId:'rss-atom',externalId:'entry-1',canonicalUrl:'https://example.org/items/1',entityType:'event',data:{name:'Test'}})}catch{}
try{framework.normalizeSourceConfig('rss-atom',{sourceUrl:'http://example.org/feed'})}catch{rejectsHttp=true}
try{framework.normalizeSourceConfig('rss-atom',{sourceUrl:'https://user:pass@example.org/feed'})}catch{rejectsCredentials=true}
const checks=[
 ['Connector registry exists',reg.includes('CONNECTOR_CATALOG')&&reg.includes('CONNECTOR_CAPABILITIES')],
 ['RSS/Atom manifest',reg.includes("id:'rss-atom'")],
 ['ATProto manifest',reg.includes("id:'atproto'")],
 ['Generic API manifest',reg.includes("id:'generic-api'")],
 ['Federation remains separate',readme.includes('non-ActivityPub')&&readme.includes('server/federation/')],
 ['Explicit capabilities',reg.includes("'remote.read'")&&reg.includes("'remote.write'")&&reg.includes("'provenance.attach'")],
 ['HTTPS source validation',reg.includes("u.protocol!=='https:'")&&reg.includes('u.username||u.password')],
 ['Provider-neutral normalization',reg.includes('normalizeExternalEntity')&&reg.includes("source:'connector'")],
 ['Provenance retained',reg.includes('canonical_url')&&reg.includes('connector_id')&&reg.includes('external_id')],
 ['No generic proxy principle',reg.includes('no-generic-proxy')],
 ['No hidden sync principle',reg.includes('no-hidden-sync')],
 ['Public connector catalogue API',server.includes("app.get('/api/connectors/catalog'")],
 ['Framework API',server.includes("app.get('/api/connectors/framework'")],
 ['Architecture foundation ready',arch.includes("connectors: {")&&arch.includes("status: 'foundation-ready'")&&/milestone:\s*'P0\.\d+(?:\.\d+)?'/.test(arch)],
 ['Adapters not falsely available',reg.includes("availability:'planned_adapter'")&&reg.includes("availability:'framework_only'")],
 ['Runtime normalization retains provenance',normalized?.source==='connector'&&normalized?.provenance?.connector_id==='rss-atom'&&normalized?.canonical_url==='https://example.org/items/1'],
 ['Runtime rejects HTTP sources',rejectsHttp],
 ['Runtime rejects credential URLs',rejectsCredentials]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\nP0.13 Connector Framework: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
