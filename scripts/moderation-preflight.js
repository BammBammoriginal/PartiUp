const fs=require('fs');
const files={db:fs.readFileSync('server/db.js','utf8'),server:fs.readFileSync('server/server.js','utf8'),app:fs.readFileSync('public/app.js','utf8')};
const checks=[
 ['Meldungstabelle',files.db.includes('CREATE TABLE IF NOT EXISTS content_reports')],
 ['Moderationsprotokoll',files.db.includes('CREATE TABLE IF NOT EXISTS moderation_actions')],
 ['Inhaltsstatus getrennt gespeichert',files.db.includes('CREATE TABLE IF NOT EXISTS moderation_content_state')],
 ['Melde-API',files.server.includes("app.post('/api/reports'")],
 ['Queue nur mit review-Recht',files.server.includes("'moderation.review'")&&files.server.includes("/api/moderation/:type/:id/reports")],
 ['Maßnahmen nur mit act-Recht',files.server.includes("'moderation.act'")],
 ['Moderation löscht Beiträge nicht hart',(()=>{const start=files.server.indexOf("app.put('/api/moderation/:type/:id/reports/:reportId'");const end=files.server.indexOf("app.get('/api/integrations/capabilities'",start);const route=start>=0?files.server.slice(start,end>start?end:undefined):'';return route.includes('moderation_content_state')&&!/DELETE\s+FROM\s+(posts|comments)/i.test(route);})()],
 ['Verdeckte Posts aus Feed gefiltert',files.db.includes("target_type='post'")&&files.db.includes("ms.state IN ('hidden','removed')")],
 ['Verdeckte Kommentare gefiltert',files.db.includes("target_type='comment'")],
 ['Moderations-UI und Melden vorhanden',files.app.includes('moderationPanel')&&files.app.includes('report-action')&&files.app.includes('data-moderation-box')&&files.app.includes('Moderation')]
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'✓':'✗'} ${name}`);if(pass)ok++;}
console.log(`Moderation-Preflight: ${ok}/${checks.length} bestanden`);if(ok!==checks.length)process.exit(1);
