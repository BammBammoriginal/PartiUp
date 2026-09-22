'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const IS_PROD=process.env.NODE_ENV==='production';
const MODE=String(process.env.PARTIUP_FEDERATION_KEY_STORE||'').trim() || (IS_PROD?'encrypted-file':'sqlite');
const ROOT=path.resolve(process.env.PARTIUP_FEDERATION_KEY_DIR||path.join(__dirname,'..','..','data','federation-keys'));

function masterKey(){
  let raw=String(process.env.PARTIUP_FEDERATION_MASTER_KEY||'').trim();
  const f=String(process.env.PARTIUP_FEDERATION_MASTER_KEY_FILE||'').trim();
  if(!raw&&f){try{raw=fs.readFileSync(f,'utf8').trim()}catch{throw new Error('Federation master-key file unavailable')}}
  if(!raw)throw new Error('Production federation key store requires PARTIUP_FEDERATION_MASTER_KEY or PARTIUP_FEDERATION_MASTER_KEY_FILE');
  let b;
  if(/^[0-9a-f]{64}$/i.test(raw))b=Buffer.from(raw,'hex');else {try{b=Buffer.from(raw,'base64')}catch{}}
  if(!b||b.length!==32)throw new Error('Federation master key must decode to exactly 32 bytes');
  return b;
}
function safeId(id){return crypto.createHash('sha256').update(String(id)).digest('hex')}
function keyPath(kind,id){return path.join(ROOT,kind,safeId(id)+'.key')}
function ensureDir(kind){const d=path.join(ROOT,kind);fs.mkdirSync(d,{recursive:true,mode:0o700});try{fs.chmodSync(ROOT,0o700);fs.chmodSync(d,0o700)}catch{}return d}
function encryptPem(pem){const iv=crypto.randomBytes(12),key=masterKey(),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const ct=Buffer.concat([cipher.update(String(pem),'utf8'),cipher.final()]);const tag=cipher.getAuthTag();return JSON.stringify({v:1,alg:'A256GCM',iv:iv.toString('base64'),tag:tag.toString('base64'),ct:ct.toString('base64')})}
function decryptPem(blob){const x=JSON.parse(blob);if(x?.v!==1||x?.alg!=='A256GCM')throw new Error('Unsupported federation key envelope');const d=crypto.createDecipheriv('aes-256-gcm',masterKey(),Buffer.from(x.iv,'base64'));d.setAuthTag(Buffer.from(x.tag,'base64'));return Buffer.concat([d.update(Buffer.from(x.ct,'base64')),d.final()]).toString('utf8')}
function writePrivate(kind,id,pem){ensureDir(kind);const p=keyPath(kind,id),tmp=p+'.tmp-'+process.pid+'-'+crypto.randomBytes(4).toString('hex');fs.writeFileSync(tmp,encryptPem(pem),{encoding:'utf8',mode:0o600,flag:'wx'});try{fs.chmodSync(tmp,0o600)}catch{}fs.renameSync(tmp,p);try{fs.chmodSync(p,0o600)}catch{}return p}
function readPrivate(kind,id){return decryptPem(fs.readFileSync(keyPath(kind,id),'utf8'))}
function removePrivate(kind,id){try{fs.rmSync(keyPath(kind,id),{force:true})}catch{}}
function generate(){return crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}})}
function tableInfo(kind){return kind==='users'?{table:'federation_actor_keys',idcol:'user_id'}:{table:'federation_space_actor_keys',idcol:'community_id'}}
function ensureKey(db,kind,id){
  const {table,idcol}=tableInfo(kind);let row=db.prepare(`SELECT * FROM ${table} WHERE ${idcol}=?`).get(id);
  if(MODE==='sqlite'){
    if(row?.private_key_pem)return row;
    const kp=generate();db.prepare(`INSERT INTO ${table}(${idcol},public_key_pem,private_key_pem) VALUES (?,?,?) ON CONFLICT(${idcol}) DO UPDATE SET public_key_pem=excluded.public_key_pem,private_key_pem=excluded.private_key_pem,created_at=CURRENT_TIMESTAMP`).run(id,kp.publicKey,kp.privateKey);return db.prepare(`SELECT * FROM ${table} WHERE ${idcol}=?`).get(id);
  }
  if(MODE!=='encrypted-file')throw new Error('Unsupported PARTIUP_FEDERATION_KEY_STORE mode');
  // One-time migration: remove legacy private PEM from SQLite after durable encrypted-file write.
  if(row?.private_key_pem&&row.private_key_pem.includes('PRIVATE KEY')){writePrivate(kind,id,row.private_key_pem);db.prepare(`UPDATE ${table} SET private_key_pem='' WHERE ${idcol}=?`).run(id);row={...row,private_key_pem:''};}
  if(row){
    try{return {...row,private_key_pem:readPrivate(kind,id)}}catch(e){if(fs.existsSync(keyPath(kind,id)))throw e;throw new Error('Federation private key material missing; explicit re-key required')}
  }
  const kp=generate();writePrivate(kind,id,kp.privateKey);try{db.prepare(`INSERT INTO ${table}(${idcol},public_key_pem,private_key_pem) VALUES (?,?,?)`).run(id,kp.publicKey,'')}catch(e){removePrivate(kind,id);throw e}return {...db.prepare(`SELECT * FROM ${table} WHERE ${idcol}=?`).get(id),private_key_pem:kp.privateKey};
}
function rotateKey(db,kind,id){const {table,idcol}=tableInfo(kind),kp=generate();if(MODE==='encrypted-file'){writePrivate(kind,id,kp.privateKey);db.prepare(`INSERT INTO ${table}(${idcol},public_key_pem,private_key_pem) VALUES (?,?,?) ON CONFLICT(${idcol}) DO UPDATE SET public_key_pem=excluded.public_key_pem,private_key_pem='',created_at=CURRENT_TIMESTAMP`).run(id,kp.publicKey,'');return {...db.prepare(`SELECT * FROM ${table} WHERE ${idcol}=?`).get(id),private_key_pem:kp.privateKey}}db.prepare(`INSERT INTO ${table}(${idcol},public_key_pem,private_key_pem) VALUES (?,?,?) ON CONFLICT(${idcol}) DO UPDATE SET public_key_pem=excluded.public_key_pem,private_key_pem=excluded.private_key_pem,created_at=CURRENT_TIMESTAMP`).run(id,kp.publicKey,kp.privateKey);return db.prepare(`SELECT * FROM ${table} WHERE ${idcol}=?`).get(id)}
function deleteKey(db,kind,id){const {table,idcol}=tableInfo(kind);db.prepare(`DELETE FROM ${table} WHERE ${idcol}=?`).run(id);if(MODE==='encrypted-file')removePrivate(kind,id)}
function config(){return {mode:MODE,root:MODE==='encrypted-file'?ROOT:null,productionRecommended:'encrypted-file',kmsHsmReady:true}}
module.exports={ensureKey,rotateKey,deleteKey,deletePrivateMaterial:removePrivate,config};
