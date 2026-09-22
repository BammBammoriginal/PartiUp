'use strict';
const crypto=require('crypto');
const {ENTITY_MAPPINGS,TABLE_BY_ENTITY,localPath,canonicalId}=require('./model');

function installFederationSchema(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS federation_entities (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('user','community','post','comment','event')),
      entity_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      entity_kind TEXT NOT NULL CHECK(entity_kind IN ('actor','object')),
      is_local INTEGER NOT NULL DEFAULT 1 CHECK(is_local IN (0,1)),
      local_path TEXT DEFAULT '',
      canonical_uri TEXT DEFAULT NULL,
      origin_host TEXT DEFAULT '',
      source_uri TEXT DEFAULT '',
      remote_json TEXT DEFAULT '',
      first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(entity_type,entity_id),
      UNIQUE(canonical_uri)
    );
    CREATE INDEX IF NOT EXISTS idx_federation_entities_origin ON federation_entities(origin_host,is_local);
    CREATE INDEX IF NOT EXISTS idx_federation_entities_source ON federation_entities(source_uri);
    CREATE TABLE IF NOT EXISTS federation_remote_objects (
      object_uri TEXT PRIMARY KEY, object_type TEXT NOT NULL, actor_uri TEXT NOT NULL, origin_host TEXT NOT NULL,
      in_reply_to TEXT NOT NULL DEFAULT '', content_text TEXT NOT NULL DEFAULT '', published_at TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL, lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK(lifecycle_state IN ('active','tombstone')),
      moderation_state TEXT NOT NULL DEFAULT 'active' CHECK(moderation_state IN ('active','hidden','removed')),
      first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_remote_objects_actor ON federation_remote_objects(actor_uri);
    CREATE INDEX IF NOT EXISTS idx_remote_objects_reply ON federation_remote_objects(in_reply_to);
    CREATE TABLE IF NOT EXISTS federation_space_remote_objects (
      local_space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      object_uri TEXT NOT NULL REFERENCES federation_remote_objects(object_uri) ON DELETE CASCADE,
      relation_kind TEXT NOT NULL CHECK(relation_kind IN ('thread','reply')),
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(local_space_id,object_uri)
    );
    CREATE INDEX IF NOT EXISTS idx_federation_space_remote_objects_space ON federation_space_remote_objects(local_space_id,received_at);

  `);
  // P0.4.4: empty string is not a valid canonical identity.
  // SQLite UNIQUE permits multiple NULL values but only one empty string, so
  // legacy local-development rows must be normalized before any backfill.
  db.prepare("UPDATE federation_entities SET canonical_uri=NULL WHERE canonical_uri=''").run();
}

function originHost(uri){
  if(!uri) return '';
  try{return new URL(uri).host.toLowerCase();}catch{return '';}
}

function upsertLocalEntity(db,entityType,entityId,baseUrl=''){
  const mapping=ENTITY_MAPPINGS[entityType];
  if(!mapping) throw new Error(`Unsupported federation entity type: ${entityType}`);
  const path=localPath(entityType,entityId);
  const uri=canonicalId(entityType,entityId,baseUrl)||null;
  const id=`fed_${crypto.createHash('sha256').update(`local:${entityType}:${entityId}`).digest('hex').slice(0,24)}`;
  db.prepare(`INSERT INTO federation_entities
    (id,entity_type,entity_id,activity_type,entity_kind,is_local,local_path,canonical_uri,origin_host,source_uri,remote_json)
    VALUES (?,?,?,?,?,1,?,?,?,?, '')
    ON CONFLICT(entity_type,entity_id) DO UPDATE SET
      activity_type=excluded.activity_type,
      entity_kind=excluded.entity_kind,
      is_local=1,
      local_path=excluded.local_path,
      canonical_uri=excluded.canonical_uri,
      origin_host=excluded.origin_host,
      source_uri=excluded.source_uri,
      updated_at=CURRENT_TIMESTAMP`)
    .run(id,entityType,String(entityId),mapping.activityType,mapping.kind,path,uri,originHost(uri),uri||'');
}

function backfillLocalEntities(db,baseUrl=''){
  const tx=db.transaction(()=>{
    for(const entityType of Object.keys(ENTITY_MAPPINGS)){
      const table=TABLE_BY_ENTITY[entityType];
      const sql=entityType==='user'?`SELECT id FROM ${table} WHERE COALESCE(account_status,'active')='active'`:`SELECT id FROM ${table}`;
      for(const row of db.prepare(sql).all()) upsertLocalEntity(db,entityType,row.id,baseUrl);
    }
  });
  tx();
}

function registerRemoteEntity(db,{entityType,entityId,canonicalUri,sourceUri='',remoteJson=''}){
  const mapping=ENTITY_MAPPINGS[entityType];
  if(!mapping) throw new Error(`Unsupported federation entity type: ${entityType}`);
  const canonical=String(canonicalUri||'').trim();
  if(!canonical || !originHost(canonical)) throw new Error('Remote federation entities require an absolute canonicalUri.');
  const localId=String(entityId||canonical);
  const id=`fed_${crypto.createHash('sha256').update(`remote:${canonical}`).digest('hex').slice(0,24)}`;
  db.prepare(`INSERT INTO federation_entities
    (id,entity_type,entity_id,activity_type,entity_kind,is_local,local_path,canonical_uri,origin_host,source_uri,remote_json)
    VALUES (?,?,?,?,?,0,'',?,?,?,?)
    ON CONFLICT(canonical_uri) DO UPDATE SET
      source_uri=excluded.source_uri,
      remote_json=excluded.remote_json,
      updated_at=CURRENT_TIMESTAMP`)
    .run(id,entityType,localId,mapping.activityType,mapping.kind,canonical,originHost(canonical),sourceUri||canonical,String(remoteJson||''));
  return db.prepare('SELECT * FROM federation_entities WHERE canonical_uri=?').get(canonical);
}

function getFederationEntity(db,entityType,entityId){
  return db.prepare('SELECT * FROM federation_entities WHERE entity_type=? AND entity_id=?').get(entityType,String(entityId));
}


function upsertRemoteObject(db,{objectUri,objectType='Note',actorUri,contentText='',inReplyTo='',publishedAt='',rawJson=''}){
  const host=originHost(objectUri);if(!host)throw new Error('Remote object URI ungueltig');
  db.prepare(`INSERT INTO federation_remote_objects(object_uri,object_type,actor_uri,origin_host,in_reply_to,content_text,published_at,raw_json,lifecycle_state)
    VALUES (?,?,?,?,?,?,?,?,'active') ON CONFLICT(object_uri) DO UPDATE SET object_type=excluded.object_type,actor_uri=excluded.actor_uri,in_reply_to=excluded.in_reply_to,content_text=excluded.content_text,published_at=excluded.published_at,raw_json=excluded.raw_json,lifecycle_state='active',updated_at=CURRENT_TIMESTAMP`)
    .run(objectUri,objectType,actorUri,host,String(inReplyTo||''),String(contentText||''),String(publishedAt||''),String(rawJson||''));
  return db.prepare('SELECT * FROM federation_remote_objects WHERE object_uri=?').get(objectUri);
}
function tombstoneRemoteObject(db,objectUri,actorUri){
  const row=db.prepare('SELECT actor_uri FROM federation_remote_objects WHERE object_uri=?').get(objectUri);if(!row)return false;if(row.actor_uri!==actorUri)throw new Error('Delete actor stimmt nicht mit Objekt-Autor ueberein');
  db.prepare(`UPDATE federation_remote_objects SET lifecycle_state='tombstone',content_text='',raw_json='',updated_at=CURRENT_TIMESTAMP WHERE object_uri=?`).run(objectUri);return true;
}
function getRemoteObject(db,objectUri){return db.prepare('SELECT * FROM federation_remote_objects WHERE object_uri=?').get(objectUri)||null;}
function linkRemoteObjectToSpace(db,spaceId,objectUri,relationKind='thread'){
  const kind=relationKind==='reply'?'reply':'thread';
  db.prepare(`INSERT INTO federation_space_remote_objects(local_space_id,object_uri,relation_kind) VALUES (?,?,?)
    ON CONFLICT(local_space_id,object_uri) DO UPDATE SET relation_kind=excluded.relation_kind`).run(spaceId,objectUri,kind);
}
function remoteObjectLinkedToSpace(db,spaceId,objectUri){return !!db.prepare('SELECT 1 FROM federation_space_remote_objects WHERE local_space_id=? AND object_uri=?').get(spaceId,objectUri)}

module.exports={installFederationSchema,backfillLocalEntities,upsertLocalEntity,registerRemoteEntity,getFederationEntity,upsertRemoteObject,tombstoneRemoteObject,getRemoteObject,linkRemoteObjectToSpace,remoteObjectLinkedToSpace};
