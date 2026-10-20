'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {spawnSync}=require('child_process');

test('SQLite snapshot, encrypted actor keys and media restore together after source loss',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'partiup-recovery-'));
 const source=path.join(directory,'source'),backup=path.join(directory,'backup'),restored=path.join(directory,'restored');
 fs.mkdirSync(source,{recursive:true});fs.mkdirSync(backup);fs.mkdirSync(restored);
 const master=crypto.randomBytes(32).toString('hex'); // Escrow stays outside the backup.
 const invoke=(root,code)=>spawnSync(process.execPath,['-e',code],{encoding:'utf8',env:{...process.env,NODE_ENV:'test',BUP_SEED_DEMO:'1',BUP_DB_PATH:path.join(root,'app.sqlite'),PARTIUP_FEDERATION_KEY_STORE:'encrypted-file',PARTIUP_FEDERATION_KEY_DIR:path.join(root,'keys'),PARTIUP_FEDERATION_MASTER_KEY:master,TEST_BACKUP_DB:path.join(backup,'app.sqlite')}});
 try{
  const created=invoke(source,"const {db}=require('./server/db');const store=require('./server/federation/key-store');store.ensureKey(db,'users','u-max');store.ensureKey(db,'spaces','jugend');db.backup(process.env.TEST_BACKUP_DB).then(()=>db.close()).catch(e=>{console.error(e);process.exitCode=1})");
  assert.equal(created.status,0,created.stderr);
  fs.mkdirSync(path.join(source,'media'));fs.writeFileSync(path.join(source,'media','fixture.webp'),'synthetic-media-fixture');
  fs.cpSync(path.join(source,'keys'),path.join(backup,'keys'),{recursive:true});fs.cpSync(path.join(source,'media'),path.join(backup,'media'),{recursive:true});
  const snapshotDigest=crypto.createHash('sha256').update(fs.readFileSync(path.join(backup,'app.sqlite'))).digest('hex');
  fs.rmSync(source,{recursive:true});
  fs.cpSync(backup,restored,{recursive:true});
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(restored,'app.sqlite'))).digest('hex'),snapshotDigest);
  assert.equal(fs.readFileSync(path.join(restored,'media','fixture.webp'),'utf8'),'synthetic-media-fixture');
  const checked=invoke(restored,"const assert=require('assert/strict');const {db,projectDetail}=require('./server/db');assert.equal(db.pragma('integrity_check',{simple:true}),'ok');assert(projectDetail('p1','u-max'));const store=require('./server/federation/key-store');store.ensureKey(db,'users','u-max');store.ensureKey(db,'spaces','jugend');assert.equal(db.prepare(\"SELECT private_key_pem FROM federation_actor_keys WHERE user_id='u-max'\").get().private_key_pem,'');db.close()");
  assert.equal(checked.status,0,checked.stderr);
 }finally{fs.rmSync(directory,{recursive:true,force:true})}
});
