'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gov=read('server/federation/governance.js'),server=read('server/server.js'),protocol=read('server/federation/protocol.js'),db=read('server/db.js'),ui=read('public/app.js'),pkg=require('../package.json');
const checks=[
 ['P0.8 Governance bleibt ab Version 0.8 aktiv',/^0\.(?:8|9|[1-9][0-9])\./.test(pkg.version)],
 ['Governance-Schema installiert',db.includes('installGovernanceSchema(db)')],
 ['Peer-Policies vorhanden',gov.includes('federation_peer_policies')],
 ['Peer-Beobachtungen vorhanden',gov.includes('federation_peer_observations')&&gov.includes('federation_space_peer_observations')],
 ['Globale Modi open/reviewed/allowlist',gov.includes("['open','reviewed','allowlist']")],
 ['Domain-Policies trusted/allowed/limited/blocked',gov.includes("'trusted','allowed','limited','blocked'")],
 ['Blockierte Peers werden abgewiesen',gov.includes("reason:'peer_blocked'")],
 ['Limited verhindert externe Writes',gov.includes("reason:'peer_limited_read_only'")],
 ['Cleanup bleibt für Delete/Undo möglich',gov.includes("action==='cleanup'")&&gov.includes("signed_cleanup_allowed")],
 ['Allowlist erzwingt Freigabe',gov.includes('instance_allowlist_requires_approved_peer')],
 ['Reviewed erzwingt Freigabe für Writes',gov.includes('instance_reviewed_requires_approved_writer')],
 ['Space Inbox nutzt Governance',server.includes("evaluatePeer(db,{uri:remote.id,spaceId:req.params.id,direction:'inbound'")],
 ['User Inbox nutzt globale Governance',server.includes("evaluatePeer(db,{uri:remote.id,direction:'inbound'")],
 ['Policy-Fehler ist 403',server.includes("FEDERATION_POLICY")&&server.includes("federation_peer_not_allowed")],
 ['Outbound User Delivery wird geprüft',protocol.includes("evaluatePeer(db,{uri:inbox,direction:'outbound',action:'deliver'}")],
 ['Outbound Space Delivery wird geprüft',protocol.includes("evaluatePeer(db,{uri:inbox,spaceId,direction:'outbound',action:'deliver'}")],
 ['Queue filtert blockierte Ziele',protocol.includes('.filter(row=>evaluatePeer')],
 ['Space Peer API vorhanden',server.includes("/api/communities/:id/federation/peers")],
 ['Space Policy API vorhanden',server.includes("/api/communities/:id/federation/peer-policy")],
 ['Policy API ist RBAC-geschützt',server.includes("space.manage_access")],
 ['Governance Diagnose vorhanden',server.includes("/api/federation/governance")&&server.includes('governanceSnapshot(db)')],
 ['UI zeigt Fediverse-Verbindungen',ui.includes('Fediverse-Verbindungen')&&ui.includes('loadFederationPeers')],
 ['UI kennt vertrauen/freigeben/limitieren/blockieren',ui.includes('Vertrauenswürdig')&&ui.includes('Nur lesen/folgen')&&ui.includes('Blockieren')],
 ['Mobile Peer-UI vorhanden',read('public/style.css').includes('.federation-peer-row')],
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'✓':'✗'} ${name}`);if(ok)pass++;}
console.log(`\nP0.8 Federation Governance: ${pass}/${checks.length} bestanden`);if(pass!==checks.length)process.exit(1);
