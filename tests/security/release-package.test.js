'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateReleasePaths}=require('../../scripts/build-release');
test('release packaging excludes credentials, user data and private test sessions',()=>{
 validateReleasePaths(['server/server.js','package-lock.json','public/app.js']);
 for(const file of ['.env','config/.env.production','data/production.db','uploads/public/media/photo.webp','backups/copy.tar','tests/.auth/user.json','secret.pem','config/master.key'])assert.throws(()=>validateReleasePaths([file]));
});
