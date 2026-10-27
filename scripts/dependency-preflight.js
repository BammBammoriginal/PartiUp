const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const expected={
  dependencies:{'ipaddr.js':'1.9.1','better-sqlite3':'13.0.3','express':'4.22.2','multer':'2.5.0','sharp':'0.35.5'},
  devDependencies:{'@playwright/test':'1.64.1'},
  overrides:{'body-parser':'1.20.9','qs':'6.16.0'}
};
let failed=0;
for(const [section,items] of Object.entries(expected)){
  for(const [name,version] of Object.entries(items)){
    const ok=pkg[section]?.[name]===version;
    console.log(`${ok?'OK  ':'FAIL'} ${section} ${name}@${version}`);
    if(!ok)failed++;
  }
}
const lockPath=path.join(root,'package-lock.json');
if(fs.existsSync(lockPath)){
  const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
  const rootPkg=lock.packages?.['']||{};
  const lockVersion=rootPkg.version===pkg.version;
  console.log(`${lockVersion?'OK  ':'FAIL'} package-lock Root-Version entspricht package.json`); if(!lockVersion)failed++;
  const pw=rootPkg.devDependencies?.['@playwright/test']===pkg.devDependencies['@playwright/test'];
  console.log(`${pw?'OK  ':'FAIL'} package-lock Playwright-Anforderung synchron`); if(!pw)failed++;
}else{
  console.log('WARN package-lock.json fehlt; npm install muss vor Release ausgeführt werden.'); failed++;
}
if(failed){console.error(`\n${failed} Dependency-Preflight-Prüfung(en) fehlgeschlagen.`);process.exit(1)}
console.log('\nDependency-Preflight: Kernabhängigkeiten und Lockfile sind synchron.');
