'use strict';
const fs=require('fs');const path=require('path');const root=path.join(__dirname,'..');
const reg=fs.readFileSync(path.join(root,'server','integrations','registry.js'),'utf8');
const readme=fs.readFileSync(path.join(root,'server','integrations','README.md'),'utf8');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const arch=fs.readFileSync(path.join(root,'server','core','architecture.js'),'utf8');
const runtime=require(path.join(root,'server','integrations','registry.js'));
let ref=null,pub=null,rejectHttp=false,rejectCred=false;
try{ref=runtime.normalizeParticipationReference({integrationId:'decidim',externalId:'proc-1',canonicalUrl:'https://demo.example.org/processes/1',title:'Testverfahren'})}catch{}
try{pub=runtime.normalizePublicDataReference({externalId:'vote-1',canonicalUrl:'https://data.example.org/votes/1',entityType:'vote',data:{result:'yes'}})}catch{}
try{runtime.safeHttpsUrl('http://example.org');}catch{rejectHttp=true}
try{runtime.safeHttpsUrl('https://u:p@example.org');}catch{rejectCred=true}
const checks=[
 ['Dedicated integration boundary',fs.existsSync(path.join(root,'server','integrations','registry.js'))&&readme.includes('domain integrations')],
 ['Separated from ActivityPub and generic connectors',readme.includes('server/federation/')&&readme.includes('server/connectors/')],
 ['Decidim catalogued',reg.includes("id:'decidim'")],
 ['Consul Democracy catalogued',reg.includes("id:'consul-democracy'")],
 ['Public democracy data catalogued',reg.includes("id:'democracy-data'")],
 ['WeChange catalogued as domain integration',reg.includes("id:'wechange'")],
 ['Read-only first and explicit writeback policy',reg.includes("writeBack:'disabled_by_default'")&&readme.includes('read-only first')],
 ['Provider-neutral participation normalization',reg.includes('normalizeParticipationReference')&&reg.includes("source:'integration'")],
 ['Public democracy data normalization',reg.includes('normalizePublicDataReference')],
 ['Provenance required',reg.includes('canonical_url')&&reg.includes('external_id')&&reg.includes('integration_id')],
 ['HTTPS-only source guard',reg.includes("u.protocol!=='https:'")],
 ['Embedded credentials rejected',reg.includes('u.username||u.password')],
 ['Existing provider-neutral provenance tables reused',db.includes('CREATE TABLE IF NOT EXISTS external_sources')&&db.includes('CREATE TABLE IF NOT EXISTS object_source_links')&&readme.includes('object_source_links')],
 ['No provider-specific integration tables',!db.includes('decidim_')&&!db.includes('consul_')&&!db.includes('wechange_')],
 ['Public integration catalogue API',server.includes("app.get('/api/integrations/catalog'")],
 ['Integration framework API',server.includes("app.get('/api/integrations/framework'")],
 ['Architecture marks integration foundation',arch.includes("milestone: 'P0.15'")&&arch.includes("integrations: {")&&arch.includes("status: 'foundation-ready'")],
 ['Runtime participation reference is read-only and provenance-rich',ref?.read_only===true&&ref?.provenance?.integration_id==='decidim'&&ref?.canonical_url==='https://demo.example.org/processes/1'],
 ['Runtime public-data reference is read-only and typed',pub?.read_only===true&&pub?.entity_type==='vote'&&pub?.provenance?.integration_id==='democracy-data'],
 ['Runtime unsafe URL guards',rejectHttp&&rejectCred],
 ['No scraping/crawler/full-sync promise',!reg.includes('scrape(')&&!reg.includes('crawler')&&readme.includes('No hidden full sync')],
 ['No tracking enrichment',reg.includes('no-tracking-enrichment')&&readme.includes('behavioural tracking')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`\nP0.15 CivicTech Integrations: ${ok}/${checks.length}`);if(ok!==checks.length)process.exit(1);
