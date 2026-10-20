'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {execFileSync}=require('child_process');
const assert=require('node:assert/strict');

function validateReleasePaths(files){
 for(const name of files){
  assert(!/^(?:data|uploads|backups|node_modules|test-results|playwright-report|tests\/\.auth)(?:\/|$)/.test(name),`Runtime/test data cannot enter a release: ${name}`);
  assert(!/(?:^|\/)\.env(?:\.|$)|\.(?:pem|key|db|sqlite|sqlite3)(?:$|-)/i.test(name),`Secrets/database cannot enter a release: ${name}`);
 }
}
function build(){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const expected=process.env.PARTIUP_APPROVED_RELEASE_SHA||'';
 assert(/^[a-f0-9]{40}$/.test(expected)&&head===expected,'An independently approved exact commit is required');
 if(process.env.GITHUB_ACTIONS){assert.equal(process.env.GITHUB_REF,'refs/heads/main');assert.equal(process.env.GITHUB_SHA,head)}
 execFileSync('git',['diff','--exit-code','HEAD']);
 const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);validateReleasePaths(files);
 const directory=path.resolve('release-evidence');fs.mkdirSync(directory,{recursive:true});
 const artifact='partiup-source.tar.gz';
 execFileSync('git',['archive','--format=tar.gz','--prefix=partiup/','--output='+path.join(directory,artifact),head]);
 const sbom=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['sbom','--package-lock-only','--omit=dev','--sbom-format=cyclonedx'],{maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(directory,'sbom.cdx.json'),sbom);
 const sha256=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,name))).digest('hex');
 fs.writeFileSync(path.join(directory,'release-manifest.json'),JSON.stringify({source_commit:head,package_version:require('../package.json').version,node_version:process.version,artifacts:[artifact,'sbom.cdx.json'].map(name=>({name,sha256:sha256(name)})),distribution:'source-only; runtime data and credentials excluded'},null,2)+'\n');
 console.log('Release candidate prepared for mandatory attestation:',head);
}
if(require.main===module)build();
module.exports={validateReleasePaths};
