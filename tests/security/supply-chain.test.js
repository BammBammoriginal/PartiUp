'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const {validateLock}=require('../../scripts/supply-chain-preflight');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
test('lock gate rejects a substituted distribution channel, missing integrity and unexpected install scripts',()=>{
 assert(validateLock(pkg,lock).packages>0);
 const name=Object.keys(lock.packages).find(x=>x);
 for(const change of [p=>{p.resolved='https://mirror.example/package.tgz'},p=>{delete p.integrity},p=>{p.hasInstallScript=true}]){
  const tampered=structuredClone(lock);change(tampered.packages[name]);
  assert.throws(()=>validateLock(pkg,tampered));
 }
 const manifest=structuredClone(pkg);manifest.dependencies.express='^'+manifest.dependencies.express;
 assert.throws(()=>validateLock(manifest,lock));
});
