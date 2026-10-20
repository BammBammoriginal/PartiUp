'use strict';
const fs=require('fs');
const assert=require('node:assert/strict');

function validateLock(pkg,lock){
 assert.equal(lock.lockfileVersion,3,'A versioned npm lockfile v3 is required');
 for(const section of ['dependencies','devDependencies']){
  for(const [name,version] of Object.entries(pkg[section]||{})){
   assert.match(version,/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/,`${name}: exact version required`);
   assert.equal(lock.packages[''][section]?.[name],version,`${name}: manifest/lock mismatch`);
  }
 }
 const installScripts=[];
 for(const [name,item] of Object.entries(lock.packages||{})){
  if(!name)continue;
  assert(!item.link,`${name}: local/linked dependencies require explicit review`);
  const url=new URL(item.resolved);
  assert.equal(url.origin,'https://registry.npmjs.org',`${name}: unapproved distribution origin`);
  assert(!url.username&&!url.password&&!url.search&&!url.hash,`${name}: invalid tarball URL`);
  assert.match(item.integrity||'',/^sha512-[A-Za-z0-9+/]+={0,2}$/,`${name}: SHA-512 integrity required`);
  if(item.hasInstallScript)installScripts.push(name);
 }
 const reviewed={'node_modules/better-sqlite3':'12.11.1','node_modules/fsevents':'2.3.2'};
 // fsevents is an optional macOS watcher; its install hook remains disabled.
 assert(installScripts.every(name=>lock.packages[name].version===reviewed[name]),`Unreviewed install scripts: ${installScripts}`);
 return {packages:Object.keys(lock.packages).length-1,installScripts};
}
function main(){
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
 const result=validateLock(pkg,lock);
 const config=fs.readFileSync('.npmrc','utf8');assert(/^ignore-scripts=true$/m.test(config),'Dependency install scripts must be off by default');
 console.log('Supply-chain lock policy:',JSON.stringify(result));
}
if(require.main===module)main();
module.exports={validateLock};
