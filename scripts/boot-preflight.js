const fs = require('fs');
const path = require('path');
const dbSource = fs.readFileSync(path.join(__dirname,'..','server','db.js'),'utf8');
const declaration = dbSource.indexOf("const SPACE_MODULES=");
const migrationUse = dbSource.indexOf("for(const {id} of db.prepare('SELECT id FROM communities').all()) ensureSpaceModules(id)");
if (declaration < 0 || migrationUse < 0 || declaration > migrationUse) {
  console.error('FAIL Runtime-Reihenfolge: SPACE_MODULES muss vor Migration/Seed-Nutzung initialisiert sein.');
  process.exit(1);
}
console.log('OK   Runtime-Reihenfolge SPACE_MODULES vor Migration/Seed-Nutzung');
