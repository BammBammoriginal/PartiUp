'use strict';
const assert=require('node:assert/strict'),path=require('path');
const Database=require('better-sqlite3');
assert.equal(require('better-sqlite3/package.json').version,'13.0.3');
const db=new Database(':memory:');
try{assert.equal(db.prepare('SELECT 1 AS value').get().value,1);}
finally{db.close();}
const root=path.dirname(require.resolve('better-sqlite3/package.json'));
const native=Object.keys(require.cache).filter(name=>name.endsWith('.node')&&name.startsWith(root+path.sep));
assert.equal(native.length,1,'One packaged SQLite binding must be loaded');
assert(native[0].startsWith(path.join(root,'prebuilds')+path.sep),'Only the integrity-covered packaged binding is permitted');
console.log('Verified packaged N-API SQLite runtime:',path.basename(native[0]));
