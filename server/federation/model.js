'use strict';

/**
 * PartiUp P0.2 – provider-neutral ActivityPub model boundary.
 *
 * P0.2 deliberately does NOT implement inbox/outbox delivery yet. It creates the
 * stable mapping that P0.3 can expose as real ActivityPub actors/objects.
 */
const ACTIVITYSTREAMS_CONTEXT = 'https://www.w3.org/ns/activitystreams';

const ENTITY_MAPPINGS = Object.freeze({
  user: Object.freeze({ activityType: 'Person', kind: 'actor', path: id => `/ap/actors/users/${encodeURIComponent(id)}` }),
  community: Object.freeze({ activityType: 'Group', kind: 'actor', path: id => `/ap/actors/spaces/${encodeURIComponent(id)}` }),
  post: Object.freeze({ activityType: 'Note', kind: 'object', path: id => `/ap/objects/posts/${encodeURIComponent(id)}` }),
  comment: Object.freeze({ activityType: 'Note', kind: 'object', path: id => `/ap/objects/comments/${encodeURIComponent(id)}` }),
  event: Object.freeze({ activityType: 'Event', kind: 'object', path: id => `/ap/objects/events/${encodeURIComponent(id)}` })
});

const TABLE_BY_ENTITY = Object.freeze({
  user: 'users', community: 'communities', post: 'posts', comment: 'comments', event: 'events'
});

function normalizeBaseUrl(value){
  const raw=String(value||'').trim().replace(/\/+$/,'');
  if(!raw) return '';
  let parsed;
  try{ parsed=new URL(raw); }catch{ throw new Error('PARTIUP_BASE_URL muss eine absolute http(s)-URL sein.'); }
  if(!['http:','https:'].includes(parsed.protocol)) throw new Error('PARTIUP_BASE_URL muss http oder https verwenden.');
  return parsed.toString().replace(/\/$/,'');
}

function localPath(entityType, entityId){
  const mapping=ENTITY_MAPPINGS[entityType];
  if(!mapping) throw new Error(`Nicht unterstützter Federation-Entitätstyp: ${entityType}`);
  return mapping.path(String(entityId));
}

function canonicalId(entityType, entityId, baseUrl=process.env.PARTIUP_BASE_URL||''){
  const base=normalizeBaseUrl(baseUrl);
  return base ? `${base}${localPath(entityType,entityId)}` : null;
}

function describeEntity(entityType, entityId, baseUrl=process.env.PARTIUP_BASE_URL||''){
  const mapping=ENTITY_MAPPINGS[entityType];
  if(!mapping) return null;
  return {
    entityType,
    entityId:String(entityId),
    kind:mapping.kind,
    activityType:mapping.activityType,
    context:ACTIVITYSTREAMS_CONTEXT,
    localPath:localPath(entityType,entityId),
    canonicalId:canonicalId(entityType,entityId,baseUrl)
  };
}

function modelSnapshot(baseUrl=process.env.PARTIUP_BASE_URL||''){
  const normalized=normalizeBaseUrl(baseUrl);
  return {
    milestone:'P0.2',
    protocol:'ActivityPub',
    context:ACTIVITYSTREAMS_CONTEXT,
    baseUrl:normalized||null,
    baseUrlConfigured:!!normalized,
    mappings:Object.fromEntries(Object.entries(ENTITY_MAPPINGS).map(([entityType,m])=>[
      entityType,{activityType:m.activityType,kind:m.kind,examplePath:m.path('{id}')}
    ])),
    deferred:[
      'HTTP delivery/inbox/outbox','WebFinger','HTTP signatures','federated Group permissions/FEPs',
      'remote content rendering','remote moderation policy enforcement'
    ]
  };
}

module.exports={ACTIVITYSTREAMS_CONTEXT,ENTITY_MAPPINGS,TABLE_BY_ENTITY,normalizeBaseUrl,localPath,canonicalId,describeEntity,modelSnapshot};
