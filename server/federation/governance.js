'use strict';

function normalizeHost(value){
  const raw=String(value||'').trim().toLowerCase();
  if(!raw)return '';
  try{
    const u=/^https?:\/\//.test(raw)?new URL(raw):new URL(`https://${raw}`);
    if(u.protocol!=='https:'||u.username||u.password)return '';
    return u.hostname.toLowerCase().replace(/\.$/,'');
  }catch{return ''}
}

function csvHosts(name){
  return new Set(String(process.env[name]||'').split(',').map(normalizeHost).filter(Boolean));
}

function globalMode(){
  const raw=String(process.env.PARTIUP_FEDERATION_GOVERNANCE_MODE||'reviewed').trim().toLowerCase();
  return ['open','reviewed','allowlist'].includes(raw)?raw:'reviewed';
}

function installGovernanceSchema(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS federation_peer_policies (
      scope_type TEXT NOT NULL CHECK(scope_type IN ('community')),
      scope_id TEXT NOT NULL,
      host TEXT NOT NULL,
      policy TEXT NOT NULL DEFAULT 'inherit' CHECK(policy IN ('inherit','trusted','allowed','limited','blocked')),
      note TEXT NOT NULL DEFAULT '',
      updated_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(scope_type,scope_id,host)
    );
    CREATE INDEX IF NOT EXISTS idx_federation_peer_policies_host ON federation_peer_policies(host,policy);
    CREATE TABLE IF NOT EXISTS federation_peer_observations (
      host TEXT PRIMARY KEY,
      first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_inbound_at TEXT,
      last_outbound_at TEXT,
      inbound_count INTEGER NOT NULL DEFAULT 0,
      outbound_count INTEGER NOT NULL DEFAULT 0,
      last_activity_type TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS federation_space_peer_observations (
      local_space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      host TEXT NOT NULL,
      first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      inbound_count INTEGER NOT NULL DEFAULT 0,
      outbound_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(local_space_id,host)
    );
  `);
}

function environmentPolicy(host){
  const h=normalizeHost(host);if(!h)return 'blocked';
  if(csvHosts('PARTIUP_FEDERATION_BLOCKED_DOMAINS').has(h))return 'blocked';
  if(csvHosts('PARTIUP_FEDERATION_TRUSTED_DOMAINS').has(h))return 'trusted';
  if(csvHosts('PARTIUP_FEDERATION_ALLOWED_DOMAINS').has(h))return 'allowed';
  return 'inherit';
}

function spacePolicy(db,spaceId,host){
  const h=normalizeHost(host);if(!spaceId||!h)return 'inherit';
  return db.prepare("SELECT policy FROM federation_peer_policies WHERE scope_type='community' AND scope_id=? AND host=?").get(String(spaceId),h)?.policy||'inherit';
}

function effectivePolicy(db,{host,spaceId=null}={}){
  const h=normalizeHost(host);if(!h)return {host:'',policy:'blocked',source:'invalid'};
  const env=environmentPolicy(h);
  if(env==='blocked')return {host:h,policy:'blocked',source:'instance'};
  const scoped=spacePolicy(db,spaceId,h);
  if(scoped!=='inherit')return {host:h,policy:scoped,source:'space'};
  if(env!=='inherit')return {host:h,policy:env,source:'instance'};
  return {host:h,policy:'inherit',source:'default'};
}

function evaluatePeer(db,{uri,host,spaceId=null,direction='inbound',action='write'}={}){
  const h=normalizeHost(host||uri);
  const effective=effectivePolicy(db,{host:h,spaceId});
  const mode=globalMode(),instancePolicy=environmentPolicy(h);
  const cleanup=action==='cleanup';
  if(cleanup)return {allowed:true,reason:'signed_cleanup_allowed',mode,instancePolicy,...effective};
  if(effective.policy==='blocked')return {allowed:false,reason:'peer_blocked',mode,instancePolicy,...effective};
  // In allowlist mode only instance operators may admit a domain. A Space admin
  // may still make an allowed domain stricter, but cannot widen the instance boundary.
  if(mode==='allowlist'&&!['trusted','allowed'].includes(instancePolicy))return {allowed:false,reason:'instance_allowlist_requires_approved_peer',mode,instancePolicy,...effective};
  if(direction==='inbound'&&action==='write'&&effective.policy==='limited')return {allowed:false,reason:'peer_limited_read_only',mode,instancePolicy,...effective};
  if(mode==='reviewed'&&direction==='inbound'&&action==='write'&&!['trusted','allowed'].includes(effective.policy))return {allowed:false,reason:'instance_reviewed_requires_approved_writer',mode,instancePolicy,...effective};
  return {allowed:true,reason:effective.policy==='trusted'?'trusted_peer':effective.policy==='allowed'?'approved_peer':effective.policy==='limited'?'limited_peer':'default_peer',mode,instancePolicy,...effective};
}

function setSpacePeerPolicy(db,{spaceId,host,policy='inherit',note='',updatedBy=null}){
  const h=normalizeHost(host);if(!h)throw new Error('Ungültige Server-Domain.');
  const p=['inherit','trusted','allowed','limited','blocked'].includes(policy)?policy:null;if(!p)throw new Error('Ungültige Server-Regel.');
  if(p==='inherit'){
    db.prepare("DELETE FROM federation_peer_policies WHERE scope_type='community' AND scope_id=? AND host=?").run(String(spaceId),h);
    return {host:h,policy:'inherit'};
  }
  db.prepare(`INSERT INTO federation_peer_policies(scope_type,scope_id,host,policy,note,updated_by)
    VALUES ('community',?,?,?,?,?)
    ON CONFLICT(scope_type,scope_id,host) DO UPDATE SET policy=excluded.policy,note=excluded.note,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .run(String(spaceId),h,p,String(note||'').slice(0,500),updatedBy||null);
  return {host:h,policy:p};
}

function recordPeerObservation(db,{uri,host,spaceId=null,direction='inbound',activityType=''}={}){
  const h=normalizeHost(host||uri);if(!h)return;
  const inbound=direction==='inbound';
  db.prepare(`INSERT INTO federation_peer_observations(host,last_inbound_at,last_outbound_at,inbound_count,outbound_count,last_activity_type)
    VALUES (?,${inbound?'CURRENT_TIMESTAMP':'NULL'},${inbound?'NULL':'CURRENT_TIMESTAMP'},?,?,?)
    ON CONFLICT(host) DO UPDATE SET last_seen_at=CURRENT_TIMESTAMP,
      last_inbound_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE last_inbound_at END,
      last_outbound_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE last_outbound_at END,
      inbound_count=inbound_count+?,outbound_count=outbound_count+?,last_activity_type=excluded.last_activity_type`)
    .run(h,inbound?1:0,inbound?0:1,String(activityType||'').slice(0,80),inbound?1:0,inbound?0:1,inbound?1:0,inbound?0:1);
  if(spaceId){
    db.prepare(`INSERT INTO federation_space_peer_observations(local_space_id,host,inbound_count,outbound_count)
      VALUES (?,?,?,?) ON CONFLICT(local_space_id,host) DO UPDATE SET last_seen_at=CURRENT_TIMESTAMP,
      inbound_count=inbound_count+?,outbound_count=outbound_count+?`)
      .run(String(spaceId),h,inbound?1:0,inbound?0:1,inbound?1:0,inbound?0:1);
  }
}

function listSpacePeers(db,spaceId){
  const observed=db.prepare(`SELECT o.host,o.first_seen_at,o.last_seen_at,o.inbound_count,o.outbound_count,
      COALESCE(p.policy,'inherit') policy,COALESCE(p.note,'') note
    FROM federation_space_peer_observations o LEFT JOIN federation_peer_policies p
      ON p.scope_type='community' AND p.scope_id=o.local_space_id AND p.host=o.host
    WHERE o.local_space_id=? ORDER BY datetime(o.last_seen_at) DESC,o.host`).all(String(spaceId));
  const configured=db.prepare(`SELECT host,created_at first_seen_at,updated_at last_seen_at,0 inbound_count,0 outbound_count,policy,note
    FROM federation_peer_policies p WHERE p.scope_type='community' AND p.scope_id=?
      AND NOT EXISTS (SELECT 1 FROM federation_space_peer_observations o WHERE o.local_space_id=p.scope_id AND o.host=p.host)
    ORDER BY host`).all(String(spaceId));
  return [...observed,...configured].map(x=>({...x,effective:evaluatePeer(db,{host:x.host,spaceId,direction:'inbound',action:'write'})}));
}

function governanceSnapshot(db){
  return {
    mode:globalMode(),
    modes:{open:'Offen – bekannte Blockierungen gelten',reviewed:'Geprüft – externe Schreibzugriffe nur von freigegebenen Servern',allowlist:'Vertrauensnetz – Federation nur mit freigegebenen Servern'},
    configuredCounts:{trusted:csvHosts('PARTIUP_FEDERATION_TRUSTED_DOMAINS').size,allowed:csvHosts('PARTIUP_FEDERATION_ALLOWED_DOMAINS').size,blocked:csvHosts('PARTIUP_FEDERATION_BLOCKED_DOMAINS').size},
    observedPeers:Number(db.prepare('SELECT COUNT(*) n FROM federation_peer_observations').get()?.n||0)
  };
}

module.exports={normalizeHost,globalMode,installGovernanceSchema,effectivePolicy,evaluatePeer,setSpacePeerPolicy,recordPeerObservation,listSpacePeers,governanceSnapshot};
