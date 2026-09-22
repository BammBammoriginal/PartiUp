const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const pkg=require(path.join(root,'package.json'));
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const server=fs.readFileSync(path.join(root,'server','server.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const privacy=fs.readFileSync(path.join(root,'server','privacy.js'),'utf8');
const arch=fs.readFileSync(path.join(root,'server','core','architecture.js'),'utf8');
const checks=[
 ['Participation Core bleibt ab P0.9 enthalten',/^0\.(?:9|[1-9]\d)\./.test(pkg.version)],
 ['Participation bleibt Core-Produkt',/participation:\s*\{\s*coreProduct:\s*true/.test(arch)],
 ['Participation Phasen-Schema vorhanden',db.includes('CREATE TABLE IF NOT EXISTS participation_phases')],
 ['Phasentypen decken Beteiligungszyklus ab',['information','collection','deliberation','decision','evaluation','results'].every(x=>db.includes(`'${x}'`))],
 ['Vorschlags-Schema vorhanden',db.includes('CREATE TABLE IF NOT EXISTS participation_proposals')],
 ['Vorschlags-Unterstützung vorhanden',db.includes('participation_proposal_support')],
 ['Ergebnis-/Wirkungs-Schema vorhanden',db.includes('CREATE TABLE IF NOT EXISTS participation_outcomes')],
 ['Outcome-Status kann Umsetzung abbilden',db.includes("'in_progress','implemented'")],
 ['Core hat eigene Proposal-Capability',db.includes("ensureColumn('participation','enable_proposals'")],
 ['Prozessmodell ist erweiterbar',db.includes("ensureColumn('participation','process_model'")],
 ['Phasenmodus ist erweiterbar',db.includes("ensureColumn('participation','phase_mode'")],
 ['Aktive Teilnahme erzwingt Mindest-Vertrauen',db.includes('participantTrust<Number(r.min_participant_trust||1)')],
 ['API kann Phasen anlegen',server.includes("app.post('/api/participation/:id/phases'")],
 ['API kann Phasenstatus ändern',server.includes("app.put('/api/participation/:id/phases/:phaseId'")],
 ['API kann Vorschläge anlegen',server.includes("app.post('/api/participation/:id/proposals'")],
 ['API kann Vorschläge unterstützen',server.includes('/proposals/:proposalId/support')],
 ['API kann Vorschläge nachvollziehbar bewerten',server.includes('/proposals/:proposalId/status')],
 ['API kann Ergebnisse/Umsetzungsstände veröffentlichen',server.includes("app.post('/api/participation/:id/outcomes'")],
 ['UI zeigt Ablauf/Phasen',ui.includes("['phases','Ablauf',true]")],
 ['UI zeigt Vorschläge',ui.includes("['proposals','Vorschläge',!!p.enable_proposals]")],
 ['UI zeigt Ergebnisse & Wirkung',ui.includes("['results','Ergebnisse & Wirkung',true]")],
 ['Space-Schnellumfrage nutzt Participation Core',ui.includes('Umfragen laufen jetzt über den gemeinsamen PartiUp-Beteiligungskern')],
 ['Legacy-Umfragen bleiben lesbar',ui.includes('Legacy-Umfrage')],
 ['Privacy Export enthält Vorschläge',privacy.includes('participation_proposals:rows')],
 ['Privacy löscht Proposal-Support',privacy.includes('DELETE FROM participation_proposal_support WHERE user_id=?')],
 ['Privacy anonymisiert Vorschlagsautor',privacy.includes('UPDATE participation_proposals SET title=')],
 ['Kommunale Erweiterbarkeit ist Architekturprinzip',arch.includes('municipal-participation-readiness')],
 ['Plugin-/Extension-Readiness ist Architekturprinzip',arch.includes('extension-readiness')]
];
let pass=0;
for(const [name,ok] of checks){console.log(`${ok?'✓':'✗'} ${name}`);if(ok)pass++;}
console.log(`\nP0.9 Participation Core: ${pass}/${checks.length} bestanden`);
if(pass!==checks.length)process.exit(1);
