'use strict';

/**
 * PartiUp P0.13 Connector Framework
 *
 * Connectors are adapters for NON-ActivityPub systems. They are deliberately
 * separated from federation and from product/core models. Provider-specific
 * payloads must be normalized before they enter PartiUp product flows.
 */

const CONNECTOR_CAPABILITIES = Object.freeze({
  'remote.read':'Darf Daten ausschließlich von einer ausdrücklich konfigurierten externen Quelle lesen.',
  'remote.write':'Darf Daten ausschließlich an eine ausdrücklich konfigurierte externe Quelle übertragen.',
  'normalize.entities':'Übersetzt externe Datensätze in provider-neutrale PartiUp-Objekte.',
  'provenance.attach':'Muss Herkunft, Connector und kanonische Quelle an importierten Objekten erhalten.',
  'sync.incremental':'Kann später inkrementelle Synchronisation unterstützen, ohne sie im Core vorauszusetzen.'
});

const CONNECTOR_CATALOG = Object.freeze([
  {
    id:'rss-atom',
    name:'RSS / Atom',
    category:'feed',
    availability:'planned_adapter',
    direction:'inbound',
    summary:'Offene Web-Feeds als externe Quelle einbinden.',
    capabilities:['remote.read','normalize.entities','provenance.attach','sync.incremental'],
    supportedEntityTypes:['post','event'],
    configFields:['sourceUrl'],
    notes:'P0.13 stellt das Framework bereit; Abruf und Feed-Parsing folgen als eigener Adapter.'
  },
  {
    id:'atproto',
    name:'AT Protocol / Bluesky',
    category:'social',
    availability:'planned_adapter',
    direction:'bidirectional',
    summary:'ATProto-basierte Netzwerke über einen eigenen Adapter anbinden.',
    capabilities:['remote.read','remote.write','normalize.entities','provenance.attach','sync.incremental'],
    supportedEntityTypes:['person','post'],
    configFields:['serviceUrl'],
    notes:'Keine ATProto-Logik im PartiUp-Core; Umsetzung später ausschließlich im Adapter.'
  },
  {
    id:'generic-api',
    name:'Generische API',
    category:'api',
    availability:'framework_only',
    direction:'configurable',
    summary:'Grundlage für klar begrenzte, provider-spezifische API-Adapter.',
    capabilities:['remote.read','remote.write','normalize.entities','provenance.attach'],
    supportedEntityTypes:[],
    configFields:['baseUrl'],
    notes:'Kein universeller Proxy. Jeder konkrete Anbieter benötigt einen expliziten Adapter und eine Capability-Prüfung.'
  }
]);

function connector(id){return CONNECTOR_CATALOG.find(x=>x.id===id)||null;}
function publicConnectorManifest(m){
  return {...m,capabilityDetails:m.capabilities.map(id=>({id,description:CONNECTOR_CAPABILITIES[id]||id}))};
}
function catalog(){return CONNECTOR_CATALOG.map(publicConnectorManifest);}
function hasCapability(connectorId,capability){return !!connector(connectorId)?.capabilities.includes(capability);}

function safeHttpsUrl(value,{field='url',max=2048}={}){
  const raw=String(value||'').trim();
  if(!raw||raw.length>max)throw Object.assign(new Error(`Ungültige ${field}.`),{code:'CONNECTOR_INVALID_URL'});
  let u;try{u=new URL(raw)}catch{throw Object.assign(new Error(`Ungültige ${field}.`),{code:'CONNECTOR_INVALID_URL'})}
  if(u.protocol!=='https:'||u.username||u.password||!u.hostname)throw Object.assign(new Error(`${field} muss eine HTTPS-Adresse ohne Zugangsdaten sein.`),{code:'CONNECTOR_INVALID_URL'});
  u.hash='';
  return u.toString();
}

function normalizeSourceConfig(connectorId,input={}){
  const m=connector(connectorId);if(!m)throw Object.assign(new Error('Unbekannter Connector.'),{code:'CONNECTOR_UNKNOWN'});
  if(connectorId==='rss-atom')return {sourceUrl:safeHttpsUrl(input.sourceUrl,{field:'Feed-Adresse'})};
  if(connectorId==='atproto')return {serviceUrl:safeHttpsUrl(input.serviceUrl,{field:'Service-Adresse'})};
  if(connectorId==='generic-api')return {baseUrl:safeHttpsUrl(input.baseUrl,{field:'API-Basisadresse'})};
  return {};
}

const ENTITY_TYPES=new Set(['person','community','post','event','project','topic','participation']);
function normalizeExternalEntity({connectorId,externalId,canonicalUrl,entityType,data={},sourceLabel=''}){
  const m=connector(connectorId);if(!m)throw Object.assign(new Error('Unbekannter Connector.'),{code:'CONNECTOR_UNKNOWN'});
  const type=String(entityType||'').trim();if(!ENTITY_TYPES.has(type))throw Object.assign(new Error('Nicht unterstützter Entity-Typ.'),{code:'CONNECTOR_INVALID_ENTITY'});
  const ext=String(externalId||'').trim();if(!ext||ext.length>2048)throw Object.assign(new Error('Externe ID fehlt oder ist zu lang.'),{code:'CONNECTOR_INVALID_ENTITY'});
  const canonical=safeHttpsUrl(canonicalUrl,{field:'kanonische Quelle'});
  const label=String(sourceLabel||m.name).trim().slice(0,120)||m.name;
  return {
    source:'connector',
    connector_id:m.id,
    external_id:ext,
    canonical_url:canonical,
    entity_type:type,
    provenance:{kind:'connector',connector_id:m.id,connector_name:m.name,source_label:label,canonical_url:canonical},
    data:data&&typeof data==='object'&&!Array.isArray(data)?data:{}
  };
}

function frameworkSnapshot(){
  return {
    status:'foundation-ready',
    separation:'Connectors sind von ActivityPub-Federation und Integrationen getrennt.',
    principles:['explicit-source','least-capability','provider-neutral-normalization','provenance-required','no-generic-proxy','no-hidden-sync'],
    capabilities:CONNECTOR_CAPABILITIES,
    connectors:catalog()
  };
}

module.exports={CONNECTOR_CAPABILITIES,CONNECTOR_CATALOG,catalog,connector,hasCapability,normalizeSourceConfig,normalizeExternalEntity,frameworkSnapshot,safeHttpsUrl};
