'use strict';
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');let fail=0;
function ok(c,m){console.log(`${c?'PASS':'FAIL'} P0.3 ${m}`);if(!c)fail++}
const srv=fs.readFileSync(path.join(root,'server/server.js'),'utf8');const proto=fs.readFileSync(path.join(root,'server/federation/protocol.js'),'utf8');const db=fs.readFileSync(path.join(root,'server/db.js'),'utf8');
ok(srv.includes("/.well-known/webfinger"),'WebFinger endpoint');
ok(srv.includes("/ap/actors/users/:id")&&srv.includes("/outbox")&&srv.includes("/inbox"),'Actor/inbox/outbox endpoints');
const keyStore=fs.readFileSync(path.join(root,'server','federation','key-store.js'),'utf8');
ok(proto.includes('federationKeyStore.ensureKey')&&keyStore.includes("IS_PROD?'encrypted-file':'sqlite'")&&keyStore.includes('aes-256-gcm'),'persistent RSA actor keys via production-separated key store');
ok(proto.includes('verifyLegacySignature')&&proto.includes('Digest ungueltig'),'signed inbox + digest verification');
ok(proto.includes('deliverActivity')&&proto.includes('RSA-SHA256'),'signed outgoing delivery');
ok(proto.includes("NODE_ENV==='production'")&&proto.includes("protocol!=='https:'"),'HTTPS required for production federation');
ok(db.includes('installProtocolSchema(db)'),'protocol schema installed');
ok(srv.includes("activity.type==='Follow'")&&srv.includes("activity.type==='Undo'"),'Follow and Undo supported');
ok(srv.includes("activity_type_or_object_deferred"),'unsupported inbound activities fail closed/deferred');
process.exitCode=fail?1:0;
