'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const federationKeyStore=require('./federation/key-store');

const REDACTED_MESSAGE='[Nachricht des gelöschten Kontos entfernt]';
const REDACTED_POST='[Inhalt des gelöschten Kontos entfernt]';
const REDACTED_COMMENT='[Kommentar des gelöschten Kontos entfernt]';
const REDACTED_ARGUMENT='[Argument des gelöschten Kontos entfernt]';

const PRIVACY_LIFECYCLE_POLICY=Object.freeze({
  users:'ANONYMIZE_TOMBSTONE',sessions:'DELETE',communities:'ANONYMIZE_CREATOR',memberships:'DELETE',community_join_requests:'DELETE_SUBJECT_ANONYMIZE_DECIDER',community_invites:'DELETE_SUBJECT_ANONYMIZE_INVITER',posts:'REDACT_RETAIN_TOMBSTONE_AUTHOR',comments:'REDACT_RETAIN_TOMBSTONE_AUTHOR',events:'ANONYMIZE_CREATOR',event_attendance:'DELETE',event_invites:'DELETE_SUBJECT_ANONYMIZE_INVITER',projects:'ANONYMIZE_CREATOR',polls:'RETAIN_SHARED_TOMBSTONE_AUTHOR',poll_votes:'DELETE',participation:'ANONYMIZE_CREATOR',participation_info:'REDACT_ANONYMIZE_AUTHOR',participation_questions:'ANONYMIZE_CREATOR',participation_question_votes:'DELETE',participation_arguments:'REDACT_RETAIN_TOMBSTONE_AUTHOR',participation_argument_support:'DELETE',participation_proposals:'REDACT_RETAIN_TOMBSTONE_AUTHOR',participation_proposal_support:'DELETE',participation_outcomes:'ANONYMIZE_CREATOR_RETAIN_SHARED',participation_access:'DELETE_SUBJECT_ANONYMIZE_DECIDER',media:'DELETE_DB_AND_FILES',notifications:'DELETE',user_follows:'DELETE',user_friendships:'DELETE',user_profile_activity:'DELETE',profile_visibility_audit:'DELETE',user_preferences:'DELETE',conversations:'RETAIN_SHARED_OR_DELETE_EMPTY',conversation_members:'DELETE',messages:'REDACT_RETAIN_TOMBSTONE_SENDER',message_reactions:'DELETE',user_blocks:'DELETE',private_media:'DELETE_DB_AND_FILES',content_reports:'RETAIN_SAFETY_TOMBSTONE_REPORTER',moderation_actions:'RETAIN_SAFETY_TOMBSTONE_ACTOR',moderation_content_state:'RETAIN_SAFETY_TOMBSTONE_ACTOR',user_topics:'DELETE',role_assignments:'DELETE_SUBJECT_ANONYMIZE_ASSIGNER',permission_overrides:'ANONYMIZE_UPDATER',tasks:'ANONYMIZE_ASSIGNEE_RETAIN_CREATOR_TOMBSTONE',federation_handles:'DELETE',federation_actor_keys:'DELETE',federation_followers:'DELETE',federation_activities:'DELETE_LOCAL_USER_PAYLOADS',federation_delivery_queue:'DELETE',federation_entities:'DELETE_LOCAL_USER_AND_AUTHORED_CONTENT_MAPPINGS',space_extensions:'ANONYMIZE_ENABLER_RETAIN_SPACE_CONFIG',extension_audit_log:'RETAIN_ADMIN_AUDIT_ANONYMIZE_ACTOR'
});

function rows(db,sql,...args){try{return db.prepare(sql).all(...args)}catch{return []}}
function row(db,sql,...args){try{return db.prepare(sql).get(...args)||null}catch{return null}}
function tableExists(db,name){return !!row(db,"SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",name)}
function columns(db,name){try{return db.prepare(`PRAGMA table_info(${name})`).all().map(x=>x.name)}catch{return []}}

function dataInventory(db){
  const aliases=new Set(['user_id','created_by','owner_user_id','author_id','reporter_id','actor_id','assigned_by','updated_by','decided_by','invited_by','sender_id','blocker_id','blocked_id','assigned_to','resolved_by','assignee_user_id','local_user_id','enabled_by','user_a','user_b','requested_by']);
  return rows(db,"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(({name})=>({
    table:name,
    user_reference_columns:columns(db,name).filter(c=>aliases.has(c)),
    lifecycle_policy:PRIVACY_LIFECYCLE_POLICY[name]||null
  })).filter(x=>x.user_reference_columns.length);
}

function safeFederationKeyExport(db,userId){
  const k=row(db,'SELECT public_key_pem,created_at FROM federation_actor_keys WHERE user_id=?',userId);
  if(!k)return null;
  return {...k,private_key_exported:false,private_key_note:'Private signing keys are credential secrets and are intentionally not returned by the privacy export.'};
}

function buildPrivacyExport(db,userId,{privateUploadDir,publicUploadDir}={}){
  const user=row(db,"SELECT id,name,email,avatar,trust_level,bio,place_id,created_at,account_status,deleted_at FROM users WHERE id=?",userId);
  const ownConversations=rows(db,'SELECT id,type,title,context_type,context_id,expires_at,created_at FROM conversations WHERE created_by=?',userId);
  const memberships=rows(db,'SELECT conversation_id,role,last_read_at,joined_at FROM conversation_members WHERE user_id=?',userId);
  const publicMedia=rows(db,'SELECT id,kind,mime_type,original_name,size_bytes,width,height,storage_key,variants_json,created_at FROM media WHERE owner_user_id=?',userId).map(m=>({...m,file_presence:publicMediaPresence(m,publicUploadDir)}));
  const privateMedia=rows(db,'SELECT id,kind,mime_type,original_name,size_bytes,width,height,storage_key,created_at FROM private_media WHERE owner_user_id=?',userId).map(m=>({...m,file_present:!!(privateUploadDir&&fs.existsSync(path.join(privateUploadDir,path.basename(m.storage_key)))),download_url:`/api/private-media/${encodeURIComponent(m.id)}`}));
  return {
    exported_at:new Date().toISOString(),
    scope_note:'Export contains data directly attributable to this account. Authentication secrets such as password hashes, session tokens, CSRF values and federation private signing keys are excluded for security.',
    account:user,
    preferences:row(db,'SELECT * FROM user_preferences WHERE user_id=?',userId),
    memberships:rows(db,'SELECT community_id,role,created_at FROM memberships WHERE user_id=?',userId),
    join_requests:rows(db,'SELECT * FROM community_join_requests WHERE user_id=?',userId),
    join_request_decisions:rows(db,'SELECT community_id,user_id,status,created_at,decided_at FROM community_join_requests WHERE decided_by=?',userId),
    community_invites:rows(db,'SELECT * FROM community_invites WHERE user_id=?',userId),
    community_invites_sent:rows(db,'SELECT community_id,user_id,created_at FROM community_invites WHERE invited_by=?',userId),
    created_communities:rows(db,'SELECT * FROM communities WHERE created_by=?',userId),
    created_projects:rows(db,'SELECT * FROM projects WHERE created_by=?',userId),
    created_events:rows(db,'SELECT * FROM events WHERE created_by=?',userId),
    created_participation:rows(db,'SELECT * FROM participation WHERE created_by=?',userId),
    posts:rows(db,'SELECT * FROM posts WHERE author_id=?',userId),
    comments:rows(db,'SELECT * FROM comments WHERE author_id=?',userId),
    polls:rows(db,'SELECT * FROM polls WHERE author_id=?',userId),
    poll_votes:rows(db,'SELECT pv.* FROM poll_votes pv WHERE pv.user_id=?',userId),
    participation_info:rows(db,'SELECT * FROM participation_info WHERE author_id=?',userId),
    participation_questions:rows(db,'SELECT * FROM participation_questions WHERE created_by=?',userId),
    participation_votes:rows(db,'SELECT * FROM participation_question_votes WHERE user_id=?',userId),
    participation_arguments:rows(db,'SELECT * FROM participation_arguments WHERE author_id=?',userId),
    participation_argument_support:rows(db,'SELECT * FROM participation_argument_support WHERE user_id=?',userId),
    participation_proposals:rows(db,'SELECT * FROM participation_proposals WHERE author_id=?',userId),
    participation_proposal_support:rows(db,'SELECT * FROM participation_proposal_support WHERE user_id=?',userId),
    participation_outcomes:rows(db,'SELECT * FROM participation_outcomes WHERE created_by=?',userId),
    participation_access:rows(db,'SELECT * FROM participation_access WHERE user_id=? OR decided_by=?',userId,userId),
    event_attendance:rows(db,'SELECT * FROM event_attendance WHERE user_id=?',userId),
    event_invites:rows(db,'SELECT * FROM event_invites WHERE user_id=?',userId),
    event_invites_sent:rows(db,'SELECT event_id,user_id,created_at FROM event_invites WHERE invited_by=?',userId),
    notifications:rows(db,'SELECT * FROM notifications WHERE user_id=?',userId),
    follows:rows(db,'SELECT * FROM user_follows WHERE user_id=?',userId),
    friendships:rows(db,'SELECT * FROM user_friendships WHERE user_a=? OR user_b=?',userId,userId),
    profile_activity:rows(db,'SELECT * FROM user_profile_activity WHERE user_id=?',userId),profile_visibility_audit:rows(db,'SELECT scope,field_name,old_value,new_value,created_at FROM profile_visibility_audit WHERE user_id=?',userId),
    topics:rows(db,'SELECT ut.*,t.name FROM user_topics ut JOIN topics t ON t.id=ut.topic_id WHERE ut.user_id=?',userId),
    conversations:{created:ownConversations,memberships,messages:rows(db,'SELECT * FROM messages WHERE sender_id=?',userId),reactions:rows(db,'SELECT * FROM message_reactions WHERE user_id=?',userId),private_media:privateMedia},
    user_blocks:rows(db,'SELECT * FROM user_blocks WHERE blocker_id=?',userId),
    public_media:publicMedia,
    reports:rows(db,'SELECT * FROM content_reports WHERE reporter_id=?',userId),
    moderation_case_assignments:rows(db,'SELECT id,scope_type,scope_id,target_type,target_id,status,resolution,created_at,updated_at FROM content_reports WHERE assigned_to=? OR resolved_by=?',userId,userId),
    moderation_history:{actions:rows(db,'SELECT * FROM moderation_actions WHERE actor_id=?',userId),content_state_updates:rows(db,'SELECT * FROM moderation_content_state WHERE updated_by=?',userId)},
    roles:{assignments:rows(db,'SELECT * FROM role_assignments WHERE user_id=? OR assigned_by=?',userId,userId),permission_changes:rows(db,'SELECT * FROM permission_overrides WHERE updated_by=?',userId)},
    tasks:{created:rows(db,'SELECT * FROM tasks WHERE created_by=?',userId),assigned:rows(db,'SELECT * FROM tasks WHERE assignee_user_id=?',userId)},
    extensions:{enabled_or_configured:rows(db,'SELECT * FROM space_extensions WHERE enabled_by=?',userId),audit:rows(db,'SELECT * FROM extension_audit_log WHERE actor_id=?',userId)},
    federation:{
      handle:row(db,'SELECT * FROM federation_handles WHERE user_id=?',userId),
      actor_key:safeFederationKeyExport(db,userId),
      followers:rows(db,'SELECT * FROM federation_followers WHERE local_user_id=?',userId),
      activities:rows(db,'SELECT * FROM federation_activities WHERE local_user_id=?',userId),
      delivery_queue:rows(db,'SELECT * FROM federation_delivery_queue WHERE local_user_id=?',userId),
      entity:row(db,"SELECT * FROM federation_entities WHERE entity_type='user' AND entity_id=?",userId)
    },
    schema_inventory:dataInventory(db)
  };
}

function publicMediaPresence(m,dir){
  if(!dir)return [];
  const names=new Set();
  if(m.storage_key)names.add(path.basename(m.storage_key));
  try{for(const u of Object.values(JSON.parse(m.variants_json||'{}')))names.add(path.basename(String(u)))}catch{}
  return [...names].map(storage_key=>({storage_key,present:fs.existsSync(path.join(dir,storage_key))}));
}

function queueFile(db,storageClass,storageKey,reason='account_deletion'){
  const safe=path.basename(String(storageKey||''));if(!safe)return;
  db.prepare(`INSERT OR IGNORE INTO privacy_file_deletion_queue(id,storage_class,storage_key,reason,created_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)`).run('pfd-'+crypto.createHash('sha256').update(`${storageClass}:${safe}`).digest('hex').slice(0,32),storageClass,safe,String(reason||'data_deletion').slice(0,80));
}
function queuePublicMediaFiles(db,m){
  if(m.storage_key)queueFile(db,'public',m.storage_key);
  try{for(const u of Object.values(JSON.parse(m.variants_json||'{}')))queueFile(db,'public',path.basename(String(u)))}catch{}
}

function processPrivacyFileDeletionQueue(db,{privateUploadDir,publicUploadDir}={}){
  const dirs={private:privateUploadDir,public:publicUploadDir};
  const pending=rows(db,"SELECT * FROM privacy_file_deletion_queue WHERE deleted_at IS NULL ORDER BY created_at,id");
  const result={deleted:0,missing:0,failed:0};
  for(const q of pending){
    const root=dirs[q.storage_class];
    if(!root){db.prepare('UPDATE privacy_file_deletion_queue SET attempts=attempts+1,last_error=? WHERE id=?').run('storage root unavailable',q.id);result.failed++;continue;}
    const file=path.join(root,path.basename(q.storage_key));
    try{
      if(fs.existsSync(file)){fs.unlinkSync(file);result.deleted++;}else result.missing++;
      db.prepare('UPDATE privacy_file_deletion_queue SET deleted_at=CURRENT_TIMESTAMP,attempts=attempts+1,last_error=\'\' WHERE id=?').run(q.id);
    }catch(e){db.prepare('UPDATE privacy_file_deletion_queue SET attempts=attempts+1,last_error=? WHERE id=?').run(String(e.message||e).slice(0,500),q.id);result.failed++;}
  }
  return result;
}

function deleteAccountData(db,userId,{privateUploadDir,publicUploadDir}={}){
  const publicMedia=rows(db,'SELECT * FROM media WHERE owner_user_id=?',userId);
  const privateMedia=rows(db,'SELECT * FROM private_media WHERE owner_user_id=?',userId);
  const authoredPosts=rows(db,'SELECT id FROM posts WHERE author_id=?',userId).map(x=>x.id);
  const authoredComments=rows(db,'SELECT id FROM comments WHERE author_id=?',userId).map(x=>x.id);
  const authoredArgs=rows(db,'SELECT id FROM participation_arguments WHERE author_id=?',userId).map(x=>x.id);
  const authoredMessages=rows(db,'SELECT id FROM messages WHERE sender_id=?',userId).map(x=>x.id);

  const tx=db.transaction(()=>{
    for(const m of publicMedia)queuePublicMediaFiles(db,m);
    for(const m of privateMedia)queueFile(db,'private',m.storage_key);

    // Direct account/private relationship data: DELETE.
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM notifications WHERE user_id=?').run(userId);
    db.prepare("DELETE FROM user_follows WHERE user_id=? OR (target_type='person' AND target_id=?)").run(userId,userId);
    db.prepare('DELETE FROM user_friendships WHERE user_a=? OR user_b=?').run(userId,userId);
    db.prepare('DELETE FROM user_profile_activity WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM user_preferences WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM user_topics WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM memberships WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM community_join_requests WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM community_invites WHERE user_id=?').run(userId);
    db.prepare('UPDATE community_join_requests SET decided_by=NULL WHERE decided_by=?').run(userId);
    db.prepare('UPDATE community_invites SET invited_by=NULL WHERE invited_by=?').run(userId);
    db.prepare('DELETE FROM event_attendance WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM event_invites WHERE user_id=?').run(userId);
    db.prepare('UPDATE event_invites SET invited_by=NULL WHERE invited_by=?').run(userId);
    db.prepare('DELETE FROM poll_votes WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM participation_question_votes WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM participation_argument_support WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM participation_proposal_support WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM participation_access WHERE user_id=?').run(userId);
    db.prepare('UPDATE participation_access SET decided_by=NULL WHERE decided_by=?').run(userId);
    db.prepare('DELETE FROM message_reactions WHERE user_id=?').run(userId);
    if(authoredMessages.length){const q=authoredMessages.map(()=>'?').join(',');db.prepare(`DELETE FROM message_reactions WHERE message_id IN (${q})`).run(...authoredMessages)}
    db.prepare('DELETE FROM user_blocks WHERE blocker_id=? OR blocked_id=?').run(userId,userId);
    db.prepare('DELETE FROM conversation_members WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM role_assignments WHERE user_id=?').run(userId);
    db.prepare('UPDATE role_assignments SET assigned_by=NULL WHERE assigned_by=?').run(userId);
    db.prepare('UPDATE permission_overrides SET updated_by=NULL WHERE updated_by=?').run(userId);
    db.prepare('UPDATE tasks SET assignee_user_id=NULL WHERE assignee_user_id=?').run(userId);
    db.prepare('UPDATE content_reports SET assigned_to=NULL WHERE assigned_to=?').run(userId);
    db.prepare('UPDATE content_reports SET resolved_by=NULL WHERE resolved_by=?').run(userId);

    // Physical media are queued transactionally before metadata is removed.
    db.prepare('DELETE FROM private_media WHERE owner_user_id=?').run(userId);
    db.prepare('DELETE FROM media WHERE owner_user_id=?').run(userId);

    // Shared histories survive, but the deleting user's authored content is removed.
    db.prepare('UPDATE messages SET body=?,deleted_at=COALESCE(deleted_at,CURRENT_TIMESTAMP) WHERE sender_id=?').run(REDACTED_MESSAGE,userId);
    db.prepare('UPDATE posts SET body=? WHERE author_id=?').run(REDACTED_POST,userId);
    db.prepare('UPDATE comments SET body=? WHERE author_id=?').run(REDACTED_COMMENT,userId);
    db.prepare('UPDATE participation_arguments SET body=? WHERE author_id=?').run(REDACTED_ARGUMENT,userId);
    db.prepare("UPDATE participation_info SET body='[Inhalt des gelöschten Kontos entfernt]',author_id=NULL WHERE author_id=?").run(userId);
    db.prepare('UPDATE participation_questions SET created_by=NULL WHERE created_by=?').run(userId);
    db.prepare("UPDATE participation_proposals SET title='[Vorschlag eines gelöschten Kontos]',body='[Inhalt des gelöschten Kontos entfernt]',author_id=NULL WHERE author_id=?").run(userId);
    db.prepare('UPDATE participation_outcomes SET created_by=NULL WHERE created_by=?').run(userId);

    // Creator metadata can be detached where the schema permits it. Shared objects remain.
    db.prepare('UPDATE communities SET created_by=NULL WHERE created_by=?').run(userId);
    db.prepare('UPDATE projects SET created_by=NULL WHERE created_by=?').run(userId);
    db.prepare('UPDATE events SET created_by=NULL WHERE created_by=?').run(userId);
    db.prepare('UPDATE participation SET created_by=NULL WHERE created_by=?').run(userId);

    // Federation credentials/queues/local identity mappings are removed locally.
    db.prepare('DELETE FROM federation_delivery_queue WHERE local_user_id=?').run(userId);
    db.prepare('DELETE FROM federation_followers WHERE local_user_id=?').run(userId);
    db.prepare('DELETE FROM federation_activities WHERE local_user_id=?').run(userId);
    db.prepare('DELETE FROM federation_actor_keys WHERE user_id=?').run(userId);
    db.prepare('DELETE FROM federation_handles WHERE user_id=?').run(userId);
    db.prepare("DELETE FROM federation_entities WHERE entity_type='user' AND entity_id=?").run(userId);
    if(authoredPosts.length){const q=authoredPosts.map(()=>'?').join(',');db.prepare(`DELETE FROM federation_entities WHERE entity_type='post' AND entity_id IN (${q})`).run(...authoredPosts)}
    if(authoredComments.length){const q=authoredComments.map(()=>'?').join(',');db.prepare(`DELETE FROM federation_entities WHERE entity_type='comment' AND entity_id IN (${q})`).run(...authoredComments)}

    // Delete empty conversations after membership removal; preserve those shared with others.
    db.prepare('DELETE FROM conversations WHERE NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=conversations.id)').run();

    // Safety/moderation history and creator refs that cannot be detached are retained only
    // against this irreversible tombstone identity, not the former profile identity.
    const salt=crypto.randomBytes(16).toString('hex');
    const hash=crypto.randomBytes(64).toString('hex');
    db.prepare(`UPDATE users SET name='Gelöschtes Konto',email=?,avatar='–',trust_level=0,password_salt=?,password_hash=?,bio='',place_id=NULL,account_status='deleted',deleted_at=CURRENT_TIMESTAMP WHERE id=?`).run(`deleted-${crypto.randomUUID()}@invalid.local`,salt,hash,userId);
  });
  tx();
  federationKeyStore.deletePrivateMaterial('users',userId);
  const files=processPrivacyFileDeletionQueue(db,{privateUploadDir,publicUploadDir});
  return {ok:true,account_state:'deleted_anonymized_tombstone',files,retained:{moderation_history:true,shared_object_structure:true,shared_conversation_structure:true,task_creator_audit:true},redacted_counts:{posts:authoredPosts.length,comments:authoredComments.length,participation_arguments:authoredArgs.length,messages:authoredMessages.length}};
}

function residualPersonalDataAudit(db,userId,{privateUploadDir,publicUploadDir}={}){
  const checks={
    active_identity:row(db,"SELECT id,name,email,bio,place_id,account_status,deleted_at FROM users WHERE id=?",userId),
    sessions:rows(db,'SELECT token FROM sessions WHERE user_id=?',userId).length,
    memberships:rows(db,'SELECT 1 FROM memberships WHERE user_id=?',userId).length,
    event_attendance:rows(db,'SELECT 1 FROM event_attendance WHERE user_id=?',userId).length,
    participation_votes:rows(db,'SELECT 1 FROM participation_question_votes WHERE user_id=?',userId).length,
    participation_support:rows(db,'SELECT 1 FROM participation_argument_support WHERE user_id=?',userId).length,
    participation_access:rows(db,'SELECT 1 FROM participation_access WHERE user_id=?',userId).length,
    conversation_memberships:rows(db,'SELECT 1 FROM conversation_members WHERE user_id=?',userId).length,
    reactions:rows(db,'SELECT 1 FROM message_reactions WHERE user_id=?',userId).length,
    friendships:rows(db,'SELECT 1 FROM user_friendships WHERE user_a=? OR user_b=?',userId,userId).length,
    profile_activity:rows(db,'SELECT 1 FROM user_profile_activity WHERE user_id=?',userId).length,
    private_media_rows:rows(db,'SELECT storage_key FROM private_media WHERE owner_user_id=?',userId),
    public_media_rows:rows(db,'SELECT storage_key FROM media WHERE owner_user_id=?',userId),
    federation_handles:rows(db,'SELECT 1 FROM federation_handles WHERE user_id=?',userId).length,
    federation_keys:rows(db,'SELECT 1 FROM federation_actor_keys WHERE user_id=?',userId).length,
    federation_followers:rows(db,'SELECT 1 FROM federation_followers WHERE local_user_id=?',userId).length,
    federation_queue:rows(db,'SELECT 1 FROM federation_delivery_queue WHERE local_user_id=?',userId).length,
    pending_file_deletions:rows(db,'SELECT storage_class,storage_key,last_error FROM privacy_file_deletion_queue WHERE deleted_at IS NULL')
  };
  checks.pass=checks.active_identity?.account_status==='deleted' && !checks.active_identity?.bio && !checks.active_identity?.place_id && ['sessions','memberships','event_attendance','participation_votes','participation_support','participation_access','conversation_memberships','reactions','friendships','profile_activity','federation_handles','federation_keys','federation_followers','federation_queue'].every(k=>checks[k]===0) && checks.private_media_rows.length===0 && checks.public_media_rows.length===0 && checks.pending_file_deletions.length===0;
  return checks;
}

module.exports={PRIVACY_LIFECYCLE_POLICY,dataInventory,buildPrivacyExport,deleteAccountData,processPrivacyFileDeletionQueue,queueFile,residualPersonalDataAudit,REDACTED_MESSAGE,REDACTED_POST,REDACTED_COMMENT,REDACTED_ARGUMENT};
