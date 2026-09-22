const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const checks=[
  ['SQLite busy timeout aktiv',db.includes("busy_timeout = 5000")],
  ['Production demo seed standardmäßig aus',db.includes("process.env.NODE_ENV==='production' && process.env.BUP_SEED_DEMO!=='1'")],
  ['Production Origin muss gesetzt sein',server.includes('BUP_PUBLIC_ORIGIN')&&server.includes('Production-Start abgebrochen: BUP_PUBLIC_ORIGIN')],
  ['SQLite Production ist fail-closed',server.includes('BUP_ALLOW_SQLITE_PRODUCTION')],
  ['Demo-Accounts blockieren Production-Start',server.includes('Demo-Accounts in der Datenbank gefunden')],
  ['Sec-Fetch-Site wird gegen Cross-Site geprüft',server.includes("sec-fetch-site")&&server.includes("same-origin','same-site','none")],
  ['Malformed Cookies crashen Parser nicht',server.includes('try{out[decodeURIComponent')&&server.includes('}catch{}')],
  ['API 404 liefert JSON',server.includes("API-Endpunkt nicht gefunden")],
  ['Graceful Shutdown schließt DB',server.includes("db.close()")&&server.includes("SIGTERM")&&server.includes("SIGINT")],
  ['HSTS nur in Production',server.includes("if(IS_PROD) res.setHeader('Strict-Transport-Security'")],
  ['Projektbild nutzt Permission-System',server.includes("hasPermission(req.userId,'project',req.params.id,'space.edit_profile')")],
  ['Public Upload Originalname begrenzt',server.includes("text(file.originalname,180)")],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'✓':'✗'} ${name}`);if(pass)ok++}
console.log(`\nStability/Security-Preflight: ${ok}/${checks.length} bestanden`);
if(ok!==checks.length)process.exit(1);
