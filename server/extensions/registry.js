const crypto = require('crypto');

const CAPABILITIES = Object.freeze({
  'space.read':'Darf öffentlich bzw. im Space verfügbare Basisinformationen des Spaces lesen.',
  'extension.config.write':'Darf die eigene Erweiterungskonfiguration dieses Spaces speichern.',
  'external_link.render':'Darf von Space-Admins hinterlegte HTTPS-Links als Nutzerfunktion darstellen.',
  'participation.read':'Darf Beteiligungsverfahren dieses Spaces lesen.',
  'participation.manage':'Darf – nach zusätzlicher Rollenprüfung – Beteiligungsverfahren verwalten.',
  'verification.read':'Darf für freigegebene Verfahren notwendige Verifizierungsstufen auswerten.',
  'connector.remote.read':'Darf Daten von einer ausdrücklich konfigurierten externen Quelle lesen.',
  'connector.remote.write':'Darf Daten an eine ausdrücklich konfigurierte externe Quelle übertragen.'
});

const CATALOG = Object.freeze([
  {
    id:'partiup.resources',
    name:'Ressourcen & Links',
    version:'0.1.0',
    provider:'PartiUp',
    kind:'first_party',
    availability:'available',
    userSurface:'function',
    summary:'Bündelt wichtige Links und Ressourcen direkt als normale Space-Funktion.',
    explanation:'Nach der Aktivierung erscheint „Ressourcen“ wie eine normale PartiUp-Funktion. Es gibt keinen separaten Plugin-Bereich für Nutzer.',
    capabilities:['space.read','extension.config.write','external_link.render'],
    dataAccess:['Space-Basisdaten','vom Space-Admin eingetragene Ressourcen'],
    networkAccess:'Keine automatischen externen Netzwerkzugriffe. Externe HTTPS-Links werden nur geöffnet, wenn ein Nutzer sie anklickt.',
    defaultConfig:{title:'Ressourcen',description:'',links:[]}
  },
  {
    id:'municipal.participation',
    name:'Kommunale Beteiligung',
    version:'planned',
    provider:'PartiUp',
    kind:'first_party',
    availability:'planned',
    userSurface:'function',
    summary:'Erweitert den Participation Core um offizielle kommunale Beteiligungsprozesse und Verwaltungsanforderungen.',
    explanation:'Geplant für Kommunen: verständliche Prozessphasen, formelle Rollen, Nachvollziehbarkeit, barrierearme Verfahren und anschlussfähige Verwaltungsprozesse.',
    capabilities:['space.read','participation.read','participation.manage','verification.read'],
    dataAccess:['Beteiligungsverfahren','Rollen und Berechtigungen','für das Verfahren erforderliche Verifizierungsinformationen'],
    networkAccess:'Externe Schnittstellen werden später separat und transparent freigegeben.',
    defaultConfig:{}
  },
  {
    id:'connector.decidim',
    name:'Decidim-Anbindung',
    version:'planned',
    provider:'PartiUp',
    kind:'connector',
    availability:'planned',
    userSurface:'background',
    summary:'Soll Decidim-Verfahren in die PartiUp-Oberfläche einbinden, ohne eine zweite Nutzeroberfläche zu erzeugen.',
    explanation:'Technischer Connector; Nutzer sehen weiterhin PartiUp. Quelle, Datenfluss und Verantwortlichkeit bleiben sichtbar.',
    capabilities:['participation.read','connector.remote.read','connector.remote.write'],
    dataAccess:['freigegebene Beteiligungsdaten'],
    networkAccess:'Nur zur vom Admin konfigurierten Decidim-Instanz.',
    defaultConfig:{}
  }
]);

function manifest(id){return CATALOG.find(x=>x.id===id)||null;}
function publicManifest(m){return {...m,capabilityDetails:m.capabilities.map(id=>({id,description:CAPABILITIES[id]||id}))};}
function catalog(){return CATALOG.map(publicManifest);}

function installExtensionSchema(db){
  db.exec(`
  CREATE TABLE IF NOT EXISTS space_extensions (
    space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    extension_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL DEFAULT '{}',
    capabilities_snapshot_json TEXT NOT NULL DEFAULT '[]',
    enabled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    enabled_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(space_id,extension_id)
  );
  CREATE TABLE IF NOT EXISTS extension_audit_log (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    extension_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('enable','disable','configure')),
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    capabilities_snapshot_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_extension_audit_space ON extension_audit_log(space_id,created_at);
  `);
}

function parseConfig(raw){try{return JSON.parse(raw||'{}')}catch{return {}}}
function normalizeResourcesConfig(input={}){
  const title=String(input.title||'Ressourcen').trim().slice(0,80)||'Ressourcen';
  const description=String(input.description||'').trim().slice(0,600);
  const links=[];
  for(const row of Array.isArray(input.links)?input.links:[]){
    if(links.length>=12)break;
    const label=String(row?.label||'').trim().slice(0,100);
    const url=String(row?.url||'').trim().slice(0,1000);
    if(!label||!url)continue;
    let parsed;try{parsed=new URL(url)}catch{continue}
    if(parsed.protocol!=='https:'||parsed.username||parsed.password)continue;
    links.push({label,url:parsed.toString()});
  }
  return {title,description,links};
}
function normalizeConfig(extensionId,input){
  if(extensionId==='partiup.resources')return normalizeResourcesConfig(input);
  return {};
}

function extensionsForSpace(db,spaceId,{includeDisabled=false}={}){
  const rows=db.prepare('SELECT * FROM space_extensions WHERE space_id=?').all(spaceId);
  const byId=new Map(rows.map(r=>[r.extension_id,r]));
  return CATALOG.map(m=>{
    const r=byId.get(m.id);const enabled=!!r?.enabled;
    if(!includeDisabled&&!enabled)return null;
    return {...publicManifest(m),enabled,config:r?parseConfig(r.config_json):m.defaultConfig,enabled_at:r?.enabled_at||null};
  }).filter(Boolean);
}
function activeExtensionsForSpace(db,spaceId){return extensionsForSpace(db,spaceId,{includeDisabled:false});}

function setSpaceExtension(db,{spaceId,extensionId,enabled,config,actorId}){
  const m=manifest(extensionId);if(!m)throw Object.assign(new Error('Unbekannte Erweiterung.'),{code:'EXTENSION_UNKNOWN'});
  if(m.availability!=='available')throw Object.assign(new Error('Diese Erweiterung ist noch nicht verfügbar.'),{code:'EXTENSION_UNAVAILABLE'});
  for(const c of m.capabilities)if(!CAPABILITIES[c])throw new Error(`Unknown extension capability: ${c}`);
  const normalized=normalizeConfig(extensionId,config||{});
  const previous=db.prepare('SELECT enabled FROM space_extensions WHERE space_id=? AND extension_id=?').get(spaceId,extensionId);
  const wasEnabled=!!previous?.enabled;
  const capabilities=JSON.stringify(m.capabilities);
  const now=new Date().toISOString();
  db.transaction(()=>{
    db.prepare(`INSERT INTO space_extensions(space_id,extension_id,enabled,config_json,capabilities_snapshot_json,enabled_by,enabled_at,updated_at)
      VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(space_id,extension_id) DO UPDATE SET enabled=excluded.enabled,config_json=excluded.config_json,capabilities_snapshot_json=excluded.capabilities_snapshot_json,enabled_by=excluded.enabled_by,enabled_at=CASE WHEN excluded.enabled=1 AND space_extensions.enabled=0 THEN excluded.enabled_at ELSE space_extensions.enabled_at END,updated_at=CURRENT_TIMESTAMP`)
      .run(spaceId,extensionId,enabled?1:0,JSON.stringify(normalized),capabilities,actorId,enabled?now:null);
    const action=enabled&&!wasEnabled?'enable':!enabled&&wasEnabled?'disable':'configure';
    db.prepare('INSERT INTO extension_audit_log(id,space_id,extension_id,action,actor_id,capabilities_snapshot_json) VALUES (?,?,?,?,?,?)')
      .run('extlog-'+crypto.randomUUID(),spaceId,extensionId,action,actorId,capabilities);
  })();
  return extensionsForSpace(db,spaceId,{includeDisabled:true}).find(x=>x.id===extensionId);
}

module.exports={CAPABILITIES,catalog,manifest,installExtensionSchema,extensionsForSpace,activeExtensionsForSpace,setSpaceExtension};
