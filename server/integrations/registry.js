'use strict';

/**
 * PartiUp P0.15 CivicTech / Democracy Integration Framework
 *
 * Integrations map domain-specific external systems (e.g. Decidim, Consul,
 * public democracy data) into PartiUp without copying those systems into Core.
 * This layer is separate from ActivityPub federation and generic connectors.
 */

const INTEGRATION_CAPABILITIES=Object.freeze({
  'remote.read':'Darf Daten nur von einer ausdrücklich konfigurierten HTTPS-Quelle lesen.',
  'remote.write':'Darf – nur nach separater Freigabe – Daten an die konfigurierte Quelle übertragen.',
  'participation.reference':'Kann externe Beteiligungsverfahren als Referenz in PartiUp abbilden.',
  'participation.map':'Kann externe Beteiligungsdaten in das provider-neutrale PartiUp-Beteiligungsmodell übersetzen.',
  'publicdata.map':'Kann öffentliche Demokratie-/Parlamentsdaten provider-neutral abbilden.',
  'provenance.attach':'Muss Quelle, externe ID und kanonische URL erhalten.',
  'sync.incremental':'Kann später inkrementelle Synchronisation unterstützen, ohne sie im Core vorauszusetzen.'
});

const INTEGRATION_CATALOG=Object.freeze([
  {
    id:'decidim',name:'Decidim',category:'participation',availability:'planned_adapter',direction:'inbound-first',
    summary:'Offene Beteiligungsverfahren aus Decidim referenzieren und später gezielt synchronisieren.',
    capabilities:['remote.read','participation.reference','participation.map','provenance.attach','sync.incremental'],
    supportedEntityTypes:['participation','proposal','event'],configFields:['baseUrl'],writeBack:'disabled_by_default',
    notes:'Keine Decidim-Oberfläche im PartiUp-Core; Quelle und Verantwortlichkeit bleiben sichtbar.'
  },
  {
    id:'consul-democracy',name:'Consul Democracy',category:'participation',availability:'planned_adapter',direction:'inbound-first',
    summary:'Consul-Verfahren provider-neutral in PartiUp referenzieren.',
    capabilities:['remote.read','participation.reference','participation.map','provenance.attach','sync.incremental'],
    supportedEntityTypes:['participation','proposal'],configFields:['baseUrl'],writeBack:'disabled_by_default',
    notes:'P0.15 stellt die Integrationsgrenze bereit; konkrete API-Abdeckung folgt adapterweise.'
  },
  {
    id:'democracy-data',name:'Öffentliche Demokratie-Daten',category:'public-data',availability:'planned_adapter',direction:'inbound',
    summary:'Öffentliche Parlaments-, Abstimmungs- und Demokratiedaten mit klarer Herkunft anbinden.',
    capabilities:['remote.read','publicdata.map','provenance.attach','sync.incremental'],
    supportedEntityTypes:['vote','representative','body','document'],configFields:['apiUrl'],writeBack:'not_applicable',
    notes:'Nur veröffentlichte Datenquellen; keine personenbezogene Profilanreicherung oder Trackingdaten.'
  },
  {
    id:'wechange',name:'WeChange',category:'collaboration',availability:'planned_adapter',direction:'inbound-first',
    summary:'Kooperations- und Projektdaten perspektivisch über eine transparente Integration anbinden.',
    capabilities:['remote.read','provenance.attach','sync.incremental'],
    supportedEntityTypes:['community','project','event'],configFields:['baseUrl'],writeBack:'disabled_by_default',
    notes:'Getrennt von ActivityPub und generischen Social-Connectoren.'
  }
]);

function integration(id){return INTEGRATION_CATALOG.find(x=>x.id===id)||null;}
function catalog(){return INTEGRATION_CATALOG.map(x=>({...x,capabilityDetails:x.capabilities.map(id=>({id,description:INTEGRATION_CAPABILITIES[id]||id}))}));}
function hasCapability(id,cap){return !!integration(id)?.capabilities.includes(cap);}

function safeHttpsUrl(value,{field='Adresse'}={}){
  const raw=String(value||'').trim();
  if(!raw)throw Object.assign(new Error(`${field} fehlt.`),{code:'INTEGRATION_URL_REQUIRED'});
  let u;try{u=new URL(raw)}catch{throw Object.assign(new Error(`${field} ist ungültig.`),{code:'INTEGRATION_URL_INVALID'});}
  if(u.protocol!=='https:'||u.username||u.password)throw Object.assign(new Error(`${field} muss eine HTTPS-Adresse ohne eingebettete Zugangsdaten sein.`),{code:'INTEGRATION_URL_UNSAFE'});
  u.hash='';return u.toString();
}

function normalizeSourceConfig(integrationId,input={}){
  const m=integration(integrationId);if(!m)throw Object.assign(new Error('Unbekannte Integration.'),{code:'INTEGRATION_UNKNOWN'});
  if(m.configFields.includes('baseUrl'))return {baseUrl:safeHttpsUrl(input.baseUrl,{field:'Basisadresse'})};
  if(m.configFields.includes('apiUrl'))return {apiUrl:safeHttpsUrl(input.apiUrl,{field:'API-Adresse'})};
  return {};
}

function normalizeParticipationReference({integrationId,externalId,canonicalUrl,title='',summary='',status='unknown',data={}}){
  const m=integration(integrationId);if(!m)throw Object.assign(new Error('Unbekannte Integration.'),{code:'INTEGRATION_UNKNOWN'});
  if(!hasCapability(integrationId,'participation.reference'))throw Object.assign(new Error('Diese Integration unterstützt keine Beteiligungsreferenzen.'),{code:'INTEGRATION_ENTITY_UNSUPPORTED'});
  const id=String(externalId||'').trim().slice(0,300);if(!id)throw Object.assign(new Error('Externe ID fehlt.'),{code:'INTEGRATION_EXTERNAL_ID_REQUIRED'});
  const url=safeHttpsUrl(canonicalUrl,{field:'Kanonische Quelle'});
  return {
    source:'integration',integration_id:m.id,external_id:id,canonical_url:url,
    entity_type:'participation',title:String(title||'').trim().slice(0,240),summary:String(summary||'').trim().slice(0,1200),
    status:String(status||'unknown').trim().slice(0,80)||'unknown',read_only:true,
    data:data&&typeof data==='object'&&!Array.isArray(data)?data:{},
    provenance:{kind:'integration',integration_id:m.id,integration_name:m.name,canonical_url:url,external_id:id}
  };
}

function normalizePublicDataReference({integrationId='democracy-data',externalId,canonicalUrl,entityType,data={}}){
  const m=integration(integrationId);if(!m||!hasCapability(integrationId,'publicdata.map'))throw Object.assign(new Error('Integration unterstützt keine öffentlichen Demokratiedaten.'),{code:'INTEGRATION_ENTITY_UNSUPPORTED'});
  const allowed=new Set(m.supportedEntityTypes);if(!allowed.has(entityType))throw Object.assign(new Error('Nicht unterstützter Datentyp.'),{code:'INTEGRATION_ENTITY_UNSUPPORTED'});
  const id=String(externalId||'').trim().slice(0,300);if(!id)throw Object.assign(new Error('Externe ID fehlt.'),{code:'INTEGRATION_EXTERNAL_ID_REQUIRED'});
  const url=safeHttpsUrl(canonicalUrl,{field:'Kanonische Quelle'});
  return {source:'integration',integration_id:m.id,external_id:id,canonical_url:url,entity_type:entityType,read_only:true,data:data&&typeof data==='object'&&!Array.isArray(data)?data:{},provenance:{kind:'integration',integration_id:m.id,integration_name:m.name,canonical_url:url,external_id:id}};
}

function frameworkSnapshot(){return {
  milestone:'P0.15',status:'foundation-ready',separation:{activitypub:'server/federation',connectors:'server/connectors',domainIntegrations:'server/integrations'},
  principles:['provider-neutral-mapping','provenance-required','https-only','read-only-first','writeback-explicit-opt-in','no-hidden-sync','no-tracking-enrichment'],
  persistence:'Reuse existing external_sources and object_source_links; no provider-specific core tables required for the foundation.',
  integrations:catalog()
};}

module.exports={INTEGRATION_CAPABILITIES,INTEGRATION_CATALOG,catalog,integration,hasCapability,safeHttpsUrl,normalizeSourceConfig,normalizeParticipationReference,normalizePublicDataReference,frameworkSnapshot};
