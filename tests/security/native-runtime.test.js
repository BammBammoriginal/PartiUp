'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
test('native SQLite remains stable during GC of real Core projection statements',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'partiup-native-'));
 try{
  const result=spawnSync(process.execPath,['--expose-gc','-e',"require('./scripts/verify-native-runtime');const {db,bootstrap,userProfile}=require('./server/db');try{for(let i=0;i<8;i++){const b=bootstrap('u-max');if(!b.people.length||!userProfile('u-max','u-max'))throw Error('Missing real projections');global.gc();}}finally{db.close();}global.gc();"],{encoding:'utf8',timeout:30000,env:{...process.env,NODE_ENV:'test',BUP_SEED_DEMO:'1',BUP_DB_PATH:path.join(directory,'app.db')}});
  assert.equal(result.status,0,result.stderr||String(result.error));assert.equal(result.signal,null);
 }finally{fs.rmSync(directory,{recursive:true,force:true})}
});
