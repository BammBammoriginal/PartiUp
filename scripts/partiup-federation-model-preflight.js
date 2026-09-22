'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
let failed=0;
function ok(condition,label){console.log(`${condition?'OK  ':'FAIL'} ${label}`);if(!condition)failed++;}
const model=require(path.join(root,'server/federation/model.js'));
const snap=model.modelSnapshot('https://partiup.example');
ok(snap.milestone==='P0.2','P0.2 model milestone');
ok(snap.mappings.user.activityType==='Person','User -> ActivityStreams Person');
ok(snap.mappings.community.activityType==='Group','Community/Space -> ActivityStreams Group');
ok(snap.mappings.post.activityType==='Note'&&snap.mappings.comment.activityType==='Note','Posts/comments -> ActivityStreams Note');
ok(snap.mappings.event.activityType==='Event','Event -> ActivityStreams Event');
ok(model.canonicalId('user','alice','https://partiup.example')==='https://partiup.example/ap/actors/users/alice','Stable absolute actor URI');
ok(fs.readFileSync(path.join(root,'server/federation/store.js'),'utf8').includes('CREATE TABLE IF NOT EXISTS federation_entities') && fs.readFileSync(path.join(root,'server/db.js'),'utf8').includes('installFederationSchema(db)'), 'Federation registry schema installed');
ok(fs.readFileSync(path.join(root,'server/server.js'),'utf8').includes('/api/federation/model'),'Federation model inspection endpoint');
if(failed) process.exit(1);
console.log('\nPartiUp P0.2 federation model preflight bestanden.');
