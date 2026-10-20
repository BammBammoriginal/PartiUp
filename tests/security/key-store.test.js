'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
const Database=require('better-sqlite3');

test('encrypted key migration, rotation, mismatch and wrong-key recovery fail closed',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'partiup-key-test-'));
 const filename=path.join(directory,'keys.db'),db=new Database(filename);
 const pair=require('crypto').generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 db.exec('CREATE TABLE federation_actor_keys(user_id TEXT PRIMARY KEY,public_key_pem TEXT,private_key_pem TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
 db.prepare('INSERT INTO federation_actor_keys(user_id,public_key_pem,private_key_pem) VALUES (?,?,?)').run('test-user',pair.publicKey,pair.privateKey);
 const invoke=(source,master='ab'.repeat(32))=>spawnSync(process.execPath,['-e',source],{encoding:'utf8',env:{...process.env,NODE_ENV:'test',PARTIUP_FEDERATION_KEY_STORE:'encrypted-file',PARTIUP_FEDERATION_KEY_DIR:path.join(directory,'encrypted'),PARTIUP_FEDERATION_MASTER_KEY:master,TEST_KEY_DB:filename}});
 const setup="const db=new (require('better-sqlite3'))(process.env.TEST_KEY_DB);const store=require('./server/federation/key-store');";
 try{
  let r=invoke(setup+"store.ensureKey(db,'users','test-user');db.close()");assert.equal(r.status,0,r.stderr);
  assert.equal(db.prepare('SELECT private_key_pem FROM federation_actor_keys').get().private_key_pem,'');
  const files=fs.readdirSync(path.join(directory,'encrypted','users'));assert.equal(files.length,1);
  assert(!fs.readFileSync(path.join(directory,'encrypted','users',files[0]),'utf8').includes('PRIVATE KEY'));
  r=invoke(setup+"store.ensureKey(db,'users','test-user')",'cd'.repeat(32));assert.notEqual(r.status,0);
  r=invoke(setup+"store.rotateKey(db,'users','test-user');store.ensureKey(db,'users','test-user');db.close()");assert.equal(r.status,0,r.stderr);
  assert.notEqual(db.prepare('SELECT public_key_pem FROM federation_actor_keys').get().public_key_pem,pair.publicKey);
  db.prepare('UPDATE federation_actor_keys SET public_key_pem=?').run(pair.publicKey);
  r=invoke(setup+"store.ensureKey(db,'users','test-user')");assert.notEqual(r.status,0);assert(r.stderr.includes('mismatch'));
 }finally{db.close();fs.rmSync(directory,{recursive:true,force:true})}
});
