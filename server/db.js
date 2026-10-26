const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const {installFederationSchema,backfillLocalEntities} = require('./federation/store');
const {installProtocolSchema,ensureFederationHandle,ensureSpaceFederationHandle} = require('./federation/protocol');
const {installGovernanceSchema,effectivePolicy} = require('./federation/governance');
const {installExtensionSchema,activeExtensionsForSpace} = require('./extensions/registry');
const {installMediaFederationSchema,remoteMediaForObject} = require('./federation/media');

const dbPath = process.env.BUP_DB_PATH ? path.resolve(process.env.BUP_DB_PATH) : path.join(__dirname, '..', 'data', 'bottomupparti.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
const permissionService=require('./core/permissions').createPermissionService(db);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');


function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}
function verifyPassword(password, salt, hash) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

db.exec(`
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT DEFAULT '', parent_id TEXT REFERENCES places(id)
);
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, avatar TEXT DEFAULT 'U',
  trust_level INTEGER NOT NULL DEFAULT 1, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '', place_id TEXT REFERENCES places(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY, icon TEXT DEFAULT '✦', name TEXT NOT NULL, type TEXT NOT NULL,
  description TEXT DEFAULT '', source TEXT NOT NULL DEFAULT 'native' CHECK(source IN ('native','external')),
  source_label TEXT DEFAULT '', created_by TEXT REFERENCES users(id), parent_id TEXT REFERENCES communities(id),
  entity_verification_status TEXT NOT NULL DEFAULT 'unverified',
  officially_managed INTEGER NOT NULL DEFAULT 0, verified_organization_name TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','unlisted','private')),
  join_policy TEXT NOT NULL DEFAULT 'open' CHECK(join_policy IN ('open','approval','invite','trust')),
  min_trust_level INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS community_places (
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY (community_id, place_id)
);
CREATE TABLE IF NOT EXISTS community_topics (
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (community_id, topic_id)
);
CREATE TABLE IF NOT EXISTS community_relations (
  from_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  PRIMARY KEY (from_id, to_id, relation_type)
);
CREATE TABLE IF NOT EXISTS memberships (
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','moderator','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (community_id, user_id)
);
CREATE TABLE IF NOT EXISTS community_join_requests (
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT, decided_by TEXT REFERENCES users(id),
  PRIMARY KEY(community_id,user_id)
);
CREATE TABLE IF NOT EXISTS community_invites (
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(community_id,user_id)
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, date_label TEXT NOT NULL, name TEXT NOT NULL, meta TEXT DEFAULT '', description TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'native' CHECK(source IN ('native','external')),
  created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','unlisted','private')),
  attendance_policy TEXT NOT NULL DEFAULT 'open' CHECK(attendance_policy IN ('open','approval','invite','members','trust')),
  min_trust_level INTEGER NOT NULL DEFAULT 1, max_participants INTEGER
);
CREATE TABLE IF NOT EXISTS event_places (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, place_id)
);
CREATE TABLE IF NOT EXISTS event_topics (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, topic_id)
);
CREATE TABLE IF NOT EXISTS event_communities (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  PRIMARY KEY(event_id, community_id)
);
CREATE TABLE IF NOT EXISTS event_attendance (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('going','maybe','requested','waitlist')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,user_id)
);
CREATE TABLE IF NOT EXISTS event_invites (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, invited_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(event_id,user_id)
);
CREATE TABLE IF NOT EXISTS event_remote_attendance (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  remote_actor_uri TEXT NOT NULL,
  remote_inbox_uri TEXT DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('requested','going','waitlist','rejected')),
  join_activity_uri TEXT DEFAULT '',
  join_activity_json TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,remote_actor_uri)
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, icon TEXT DEFAULT '◆', name TEXT NOT NULL, owner TEXT NOT NULL,
  description TEXT DEFAULT '', supporters INTEGER NOT NULL DEFAULT 0, progress INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id), entity_verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','unlisted','private')),
  access_policy TEXT NOT NULL DEFAULT 'open' CHECK(access_policy IN ('open','approval','invite','trust')),
  min_trust_level INTEGER NOT NULL DEFAULT 1,
  officially_managed INTEGER NOT NULL DEFAULT 0, verified_organization_name TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS project_places (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY(project_id, place_id)
);
CREATE TABLE IF NOT EXISTS project_topics (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY(project_id, topic_id)
);
CREATE TABLE IF NOT EXISTS project_communities (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  PRIMARY KEY(project_id, community_id)
);
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY, community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, question TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS poll_options (
  id TEXT PRIMARY KEY, poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE, label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_votes (
  option_id TEXT NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(option_id, user_id)
);
CREATE TABLE IF NOT EXISTS participation (
  id TEXT PRIMARY KEY, icon TEXT DEFAULT '🏛️', name TEXT NOT NULL, meta TEXT DEFAULT '',
  place TEXT NOT NULL DEFAULT '', level TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'Beteiligung',
  institution TEXT DEFAULT '', status TEXT DEFAULT 'offen', deadline TEXT DEFAULT '', description TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'native' CHECK(source IN ('native','external')), source_label TEXT DEFAULT '', source_url TEXT DEFAULT '',
  created_by TEXT REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  officially_managed INTEGER NOT NULL DEFAULT 0, verified_organization_name TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS participation_topics (
  participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY(participation_id, topic_id)
);
CREATE TABLE IF NOT EXISTS participation_places (
  participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY(participation_id, place_id)
);
CREATE TABLE IF NOT EXISTS participation_communities (
  participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  PRIMARY KEY(participation_id, community_id)
);
CREATE TABLE IF NOT EXISTS participation_projects (
  participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY(participation_id, project_id)
);
CREATE TABLE IF NOT EXISTS participation_info (
  id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Information', body TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS participation_questions (
  id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('poll','vote')), question TEXT NOT NULL,
  description TEXT DEFAULT '', is_binding INTEGER NOT NULL DEFAULT 0,
  closes_at TEXT DEFAULT '', created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS participation_question_options (
  id TEXT PRIMARY KEY, question_id TEXT NOT NULL REFERENCES participation_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS participation_question_votes (
  question_id TEXT NOT NULL REFERENCES participation_questions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES participation_question_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(question_id,user_id)
);
CREATE TABLE IF NOT EXISTS participation_arguments (
  id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK(side IN ('pro','contra')), body TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS participation_argument_support (
  argument_id TEXT NOT NULL REFERENCES participation_arguments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(argument_id,user_id)
);
CREATE TABLE IF NOT EXISTS participation_access (
  participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('requested','invited','approved','rejected')),
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(participation_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_participation_access_user ON participation_access(user_id,status);
CREATE TABLE IF NOT EXISTS participation_phases (
  id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  title TEXT NOT NULL, phase_type TEXT NOT NULL DEFAULT 'information' CHECK(phase_type IN ('information','collection','deliberation','decision','evaluation','results')),
  description TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','completed')),
  starts_at TEXT DEFAULT '', ends_at TEXT DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_participation_phases_process ON participation_phases(participation_id,sort_order);
CREATE TABLE IF NOT EXISTS participation_proposals (
  id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  phase_id TEXT REFERENCES participation_phases(id) ON DELETE SET NULL, title TEXT NOT NULL, body TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','accepted','rejected','implemented')),
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_participation_proposals_process ON participation_proposals(participation_id,status,created_at);
CREATE TABLE IF NOT EXISTS participation_proposal_support (
  proposal_id TEXT NOT NULL REFERENCES participation_proposals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(proposal_id,user_id)
);
CREATE TABLE IF NOT EXISTS participation_outcomes (
  id TEXT PRIMARY KEY, participation_id TEXT NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
  phase_id TEXT REFERENCES participation_phases(id) ON DELETE SET NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','in_progress','implemented')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_participation_outcomes_process ON participation_outcomes(participation_id,status,created_at);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY, owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'image' CHECK(kind IN ('image','video','file')),
  mime_type TEXT NOT NULL, original_name TEXT DEFAULT '', size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER, height INTEGER, storage_key TEXT NOT NULL, variants_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media_links (
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'attachment',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(media_id, entity_type, entity_id, role)
);
CREATE INDEX IF NOT EXISTS idx_media_links_entity ON media_links(entity_type,entity_id,role);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT DEFAULT '', entity_type TEXT DEFAULT '', entity_id TEXT DEFAULT '',
  read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read_at,created_at);
CREATE TABLE IF NOT EXISTS privacy_file_deletion_queue (
  id TEXT PRIMARY KEY,
  storage_class TEXT NOT NULL CHECK(storage_class IN ('private','public')),
  storage_key TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'account_deletion',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  UNIQUE(storage_class,storage_key)
);

CREATE TABLE IF NOT EXISTS user_follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('community','place','topic','person','event','project','participation')),
  target_id TEXT NOT NULL,
  notification_level TEXT NOT NULL DEFAULT 'feed' CHECK(notification_level IN ('feed','important','all','muted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,target_type,target_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id,target_type);

CREATE TABLE IF NOT EXISTS user_friendships (
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_a,user_b),
  CHECK(user_a<>user_b)
);
CREATE INDEX IF NOT EXISTS idx_user_friendships_status ON user_friendships(status,updated_at);

CREATE TABLE IF NOT EXISTS user_profile_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK(target_type IN ('community','event','project','topic','participation')),
  target_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','members','private')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id,target_type,target_id)
);
CREATE INDEX IF NOT EXISTS idx_user_profile_activity_user ON user_profile_activity(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS profile_visibility_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK(scope IN ('profile_preferences','profile_activity')),
  field_name TEXT NOT NULL,
  old_value TEXT NOT NULL DEFAULT '',
  new_value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_profile_visibility_audit_user ON profile_visibility_audit(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dm_permission TEXT NOT NULL DEFAULT 'members' CHECK(dm_permission IN ('all','members','nobody')),
  group_invites TEXT NOT NULL DEFAULT 'members' CHECK(group_invites IN ('all','members','nobody')),
  notify_comments INTEGER NOT NULL DEFAULT 1, notify_mentions INTEGER NOT NULL DEFAULT 1,
  notify_messages INTEGER NOT NULL DEFAULT 1, notify_events INTEGER NOT NULL DEFAULT 1,
  profile_visibility TEXT NOT NULL DEFAULT 'members' CHECK(profile_visibility IN ('public','members','private')),
  place_visibility TEXT NOT NULL DEFAULT 'private' CHECK(place_visibility IN ('public','members','private')),
  memberships_visibility TEXT NOT NULL DEFAULT 'private' CHECK(memberships_visibility IN ('public','members','private')),
  follows_visibility TEXT NOT NULL DEFAULT 'private' CHECK(follows_visibility IN ('public','members','private')),
  event_attendance_visibility TEXT NOT NULL DEFAULT 'private' CHECK(event_attendance_visibility IN ('public','members','private')),
  interests_visibility TEXT NOT NULL DEFAULT 'members' CHECK(interests_visibility IN ('public','members','private')),
  created_content_visibility TEXT NOT NULL DEFAULT 'public' CHECK(created_content_visibility IN ('public','members','private')),
  allow_followers INTEGER NOT NULL DEFAULT 1,
  federation_enabled INTEGER NOT NULL DEFAULT 0,
  federation_discoverable INTEGER NOT NULL DEFAULT 0,
  federated_profile_fields TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('direct','group','context')),
  title TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT CHECK(context_type IN ('community','project','event') OR context_type IS NULL),
  context_id TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member')),
  last_read_at TEXT,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(conversation_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id,conversation_id);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(message_id,user_id,emoji)
);
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(blocker_id,blocked_id),
  CHECK(blocker_id<>blocked_id)
);
CREATE TABLE IF NOT EXISTS private_media (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'image',
  mime_type TEXT NOT NULL,
  original_name TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS message_media (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES private_media(id) ON DELETE CASCADE,
  PRIMARY KEY(message_id,media_id)
);


CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event')),
  scope_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('post','comment','community','project','event','user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('spam','harassment','hate','misinformation','privacy','illegal','other')),
  details TEXT NOT NULL DEFAULT '',
  target_label TEXT NOT NULL DEFAULT '',
  content_excerpt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolution TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_reports_scope ON content_reports(scope_type,scope_id,status,created_at);
CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  report_id TEXT REFERENCES content_reports(id) ON DELETE SET NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event')),
  scope_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('review','dismiss','hide','restore','remove','note')),
  note TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_scope ON moderation_actions(scope_type,scope_id,created_at);
CREATE TABLE IF NOT EXISTS moderation_content_state (
  target_type TEXT NOT NULL CHECK(target_type IN ('post','comment')),
  target_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event')),
  scope_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','hidden','removed')),
  updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(target_type,target_id)
);

CREATE TABLE IF NOT EXISTS user_topics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id,topic_id)
);
`);


// v0.8.4.1: modular Spaces + neutral import/provenance foundation.
db.exec(`
CREATE TABLE IF NOT EXISTS space_modules (
  space_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  visibility TEXT NOT NULL DEFAULT 'members' CHECK(visibility IN ('public','members','admins')),
  permissions_json TEXT NOT NULL DEFAULT '{}',
  config_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY(space_id,module_type)
);
CREATE TABLE IF NOT EXISTS object_modules (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('project','event')),
  entity_id TEXT NOT NULL,
  module_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY(entity_type,entity_id,module_type)
);
CREATE TABLE IF NOT EXISTS role_assignments (
  scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event')),
  scope_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner','admin','moderator','member','guest')),
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(scope_type,scope_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_role_assignments_scope ON role_assignments(scope_type,scope_id,role);
CREATE TABLE IF NOT EXISTS permission_overrides (
  scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event')),
  scope_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','admin','moderator','member','guest')),
  permission TEXT NOT NULL,
  effect TEXT NOT NULL CHECK(effect IN ('allow','deny')),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(scope_type,scope_id,role,permission)
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('project','event')),
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
  due_at TEXT DEFAULT '',
  assignee_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(entity_type,entity_id,status);
CREATE TABLE IF NOT EXISTS event_projects (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY(event_id,project_id)
);
CREATE TABLE IF NOT EXISTS external_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'generic',
  protocol TEXT NOT NULL DEFAULT 'api',
  base_url TEXT DEFAULT '',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  auth_method TEXT NOT NULL DEFAULT 'none',
  sync_mode TEXT NOT NULL DEFAULT 'read',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS object_source_links (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES external_sources(id) ON DELETE CASCADE,
  external_id TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  sync_mode TEXT NOT NULL DEFAULT 'read',
  last_synced_at TEXT,
  is_source_of_truth INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(entity_type,entity_id,source_id,external_id)
);
CREATE INDEX IF NOT EXISTS idx_object_source_entity ON object_source_links(entity_type,entity_id);
`);

// v0.8.9: explicit scoped owner assignments; legacy memberships remain compatible.
db.exec(`
INSERT OR IGNORE INTO role_assignments(scope_type,scope_id,user_id,role,assigned_by)
SELECT 'community',id,created_by,'owner',created_by FROM communities WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO role_assignments(scope_type,scope_id,user_id,role,assigned_by)
SELECT 'project',id,created_by,'owner',created_by FROM projects WHERE created_by IS NOT NULL;
INSERT OR IGNORE INTO role_assignments(scope_type,scope_id,user_id,role,assigned_by)
SELECT 'event',id,created_by,'owner',created_by FROM events WHERE created_by IS NOT NULL;
`);



function ensureColumn(table, column, definition) {
  const cols=db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name);
  if(!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
ensureColumn('communities','entity_verification_status',"TEXT NOT NULL DEFAULT 'unverified'");
ensureColumn('communities','officially_managed','INTEGER NOT NULL DEFAULT 0');
ensureColumn('communities','verified_organization_name',"TEXT DEFAULT ''");
ensureColumn('projects','entity_verification_status',"TEXT NOT NULL DEFAULT 'unverified'");
ensureColumn('participation','type',"TEXT NOT NULL DEFAULT 'Beteiligung'");
ensureColumn('participation','institution',"TEXT DEFAULT ''");
ensureColumn('participation','officially_managed',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('participation','verified_organization_name',"TEXT DEFAULT ''");
ensureColumn('events','officially_managed',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('events','verified_organization_name',"TEXT DEFAULT ''");
ensureColumn('projects','officially_managed',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('projects','verified_organization_name',"TEXT DEFAULT ''");
ensureColumn('participation','status',"TEXT DEFAULT 'offen'");
ensureColumn('participation','deadline',"TEXT DEFAULT ''");
ensureColumn('participation','description',"TEXT DEFAULT ''");
ensureColumn('participation','source_label',"TEXT DEFAULT ''");
ensureColumn('participation','source_url',"TEXT DEFAULT ''");
ensureColumn('participation','created_by',"TEXT REFERENCES users(id)");
ensureColumn('participation','created_at',"TEXT");
ensureColumn('participation','enable_info',"INTEGER NOT NULL DEFAULT 1");
ensureColumn('participation','enable_poll',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('participation','enable_vote',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('participation','enable_pro_contra',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('participation','min_participant_trust',"INTEGER NOT NULL DEFAULT 1");
ensureColumn('participation','result_note',"TEXT DEFAULT ''");
ensureColumn('participation','visibility',"TEXT NOT NULL DEFAULT 'public'");
ensureColumn('participation','access_policy',"TEXT NOT NULL DEFAULT 'open'");
ensureColumn('participation','min_trust_level',"INTEGER NOT NULL DEFAULT 1");
ensureColumn('participation','role_inheritance',"TEXT NOT NULL DEFAULT 'member'");
ensureColumn('participation','enable_proposals',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('participation','process_model',"TEXT NOT NULL DEFAULT 'participation'");
ensureColumn('participation','phase_mode',"TEXT NOT NULL DEFAULT 'simple'");


ensureColumn('communities','visibility',"TEXT NOT NULL DEFAULT 'public'");
ensureColumn('communities','join_policy',"TEXT NOT NULL DEFAULT 'open'");
ensureColumn('communities','min_trust_level','INTEGER NOT NULL DEFAULT 1');
ensureColumn('communities','federation_mode',"TEXT NOT NULL DEFAULT 'off'");
ensureColumn('communities','federation_inbound_mode',"TEXT NOT NULL DEFAULT 'off'");
ensureColumn('posts','federation_state',"TEXT NOT NULL DEFAULT 'inherit'");
// Mastodon-compatible audience of an outward publication: public (feeds, search) or quiet (profile and link only).
ensureColumn('posts','federation_audience',"TEXT NOT NULL DEFAULT 'public' CHECK(federation_audience IN ('public','quiet'))");
ensureColumn('communities','setup_completed','INTEGER NOT NULL DEFAULT 1');
ensureColumn('communities','template_key',"TEXT DEFAULT ''");
ensureColumn('events','visibility',"TEXT NOT NULL DEFAULT 'public'");
ensureColumn('events','attendance_policy',"TEXT NOT NULL DEFAULT 'open'");
ensureColumn('events','min_trust_level','INTEGER NOT NULL DEFAULT 1');
ensureColumn('events','max_participants','INTEGER');
ensureColumn('events','source_label',"TEXT DEFAULT ''");
ensureColumn('events','start_at',"TEXT DEFAULT ''");
ensureColumn('events','end_at',"TEXT DEFAULT ''");
ensureColumn('events','timezone',"TEXT NOT NULL DEFAULT 'Europe/Berlin'");
ensureColumn('events','federation_state',"TEXT NOT NULL DEFAULT 'inherit'");
ensureColumn('events','remote_uri',"TEXT DEFAULT NULL");
ensureColumn('events','remote_actor_uri',"TEXT DEFAULT ''");
ensureColumn('events','remote_location_name',"TEXT DEFAULT ''");
ensureColumn('events','federation_lifecycle_state',"TEXT NOT NULL DEFAULT 'active'");
ensureColumn('events','federation_moderation_state',"TEXT NOT NULL DEFAULT 'active'");
ensureColumn('event_attendance','federation_state',"TEXT NOT NULL DEFAULT 'local'");
ensureColumn('event_attendance','join_activity_uri',"TEXT DEFAULT ''");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_events_remote_uri ON events(remote_uri) WHERE remote_uri IS NOT NULL AND remote_uri<>'';");
ensureColumn('communities','federation_events_inbound',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('projects','visibility',"TEXT NOT NULL DEFAULT 'public'");
ensureColumn('projects','access_policy',"TEXT NOT NULL DEFAULT 'open'");
ensureColumn('projects','min_trust_level','INTEGER NOT NULL DEFAULT 1');
ensureColumn('user_preferences','profile_visibility',"TEXT NOT NULL DEFAULT 'members'");
ensureColumn('user_preferences','place_visibility',"TEXT NOT NULL DEFAULT 'private'");
ensureColumn('user_preferences','memberships_visibility',"TEXT NOT NULL DEFAULT 'private'");
ensureColumn('user_preferences','follows_visibility',"TEXT NOT NULL DEFAULT 'private'");
ensureColumn('user_preferences','event_attendance_visibility',"TEXT NOT NULL DEFAULT 'private'");
ensureColumn('users','bio',"TEXT DEFAULT ''");
ensureColumn('users','place_id','TEXT REFERENCES places(id)');
ensureColumn('users','account_status',"TEXT NOT NULL DEFAULT 'active'");
ensureColumn('users','deleted_at','TEXT');
ensureColumn('user_preferences','interests_visibility',"TEXT NOT NULL DEFAULT 'members'");
ensureColumn('user_preferences','created_content_visibility',"TEXT NOT NULL DEFAULT 'public'");
ensureColumn('user_preferences','allow_followers',"INTEGER NOT NULL DEFAULT 1");
ensureColumn('user_preferences','federation_enabled',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('user_preferences','federation_discoverable',"INTEGER NOT NULL DEFAULT 0");
ensureColumn('user_preferences','federated_profile_fields',"TEXT NOT NULL DEFAULT '[]'");

// PartiUp P0.12.7: privacy audiences distinguish accepted friends (network) from any signed-in member.
// Existing `members` values historically meant shared-community visibility; migrate them conservatively to `network`
// so an upgrade never broadens an existing user's audience by surprise.
const prefSql=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_preferences'").get()?.sql||'';
if(prefSql && !prefSql.includes("'network'")){
  db.exec(`PRAGMA foreign_keys=OFF;
  ALTER TABLE user_preferences RENAME TO user_preferences_p0126;
  CREATE TABLE user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dm_permission TEXT NOT NULL DEFAULT 'members' CHECK(dm_permission IN ('all','members','nobody')),
    group_invites TEXT NOT NULL DEFAULT 'members' CHECK(group_invites IN ('all','members','nobody')),
    notify_comments INTEGER NOT NULL DEFAULT 1, notify_mentions INTEGER NOT NULL DEFAULT 1,
    notify_messages INTEGER NOT NULL DEFAULT 1, notify_events INTEGER NOT NULL DEFAULT 1,
    profile_visibility TEXT NOT NULL DEFAULT 'network' CHECK(profile_visibility IN ('public','members','network','private')),
    bio_visibility TEXT NOT NULL DEFAULT 'network' CHECK(bio_visibility IN ('public','members','network','private')),
    place_visibility TEXT NOT NULL DEFAULT 'private' CHECK(place_visibility IN ('public','members','network','private')),
    memberships_visibility TEXT NOT NULL DEFAULT 'private' CHECK(memberships_visibility IN ('public','members','network','private')),
    follows_visibility TEXT NOT NULL DEFAULT 'private' CHECK(follows_visibility IN ('public','members','network','private')),
    event_attendance_visibility TEXT NOT NULL DEFAULT 'private' CHECK(event_attendance_visibility IN ('public','members','network','private')),
    interests_visibility TEXT NOT NULL DEFAULT 'network' CHECK(interests_visibility IN ('public','members','network','private')),
    projects_visibility TEXT NOT NULL DEFAULT 'network' CHECK(projects_visibility IN ('public','members','network','private')),
    shared_connections_visibility TEXT NOT NULL DEFAULT 'network' CHECK(shared_connections_visibility IN ('public','members','network','private')),
    profile_activity_visibility TEXT NOT NULL DEFAULT 'network' CHECK(profile_activity_visibility IN ('public','members','network','private')),
    profile_activity_default_visibility TEXT NOT NULL DEFAULT 'network' CHECK(profile_activity_default_visibility IN ('public','members','network','private')),
    created_content_visibility TEXT NOT NULL DEFAULT 'network' CHECK(created_content_visibility IN ('public','members','network','private')),
    allow_followers INTEGER NOT NULL DEFAULT 1,
    federation_enabled INTEGER NOT NULL DEFAULT 0,
    federation_discoverable INTEGER NOT NULL DEFAULT 0,
    federated_profile_fields TEXT NOT NULL DEFAULT '[]'
  );
  INSERT INTO user_preferences(user_id,dm_permission,group_invites,notify_comments,notify_mentions,notify_messages,notify_events,profile_visibility,bio_visibility,place_visibility,memberships_visibility,follows_visibility,event_attendance_visibility,interests_visibility,projects_visibility,shared_connections_visibility,profile_activity_visibility,profile_activity_default_visibility,created_content_visibility,allow_followers,federation_enabled,federation_discoverable,federated_profile_fields)
  SELECT user_id,dm_permission,group_invites,notify_comments,notify_mentions,notify_messages,notify_events,
    CASE WHEN profile_visibility='members' THEN 'network' ELSE profile_visibility END,
    CASE WHEN profile_visibility='members' THEN 'network' ELSE profile_visibility END,
    CASE WHEN place_visibility='members' THEN 'network' ELSE place_visibility END,
    CASE WHEN memberships_visibility='members' THEN 'network' ELSE memberships_visibility END,
    CASE WHEN follows_visibility='members' THEN 'network' ELSE follows_visibility END,
    CASE WHEN event_attendance_visibility='members' THEN 'network' ELSE event_attendance_visibility END,
    CASE WHEN interests_visibility='members' THEN 'network' ELSE interests_visibility END,
    CASE WHEN created_content_visibility='members' THEN 'network' ELSE created_content_visibility END,
    'network','network','network',
    CASE WHEN created_content_visibility='members' THEN 'network' ELSE created_content_visibility END,
    allow_followers,federation_enabled,federation_discoverable,federated_profile_fields
  FROM user_preferences_p0126;
  DROP TABLE user_preferences_p0126;
  PRAGMA foreign_keys=ON;`);
}
// New installs already have the old CREATE TABLE above, so ensure any P0.12.7 columns also exist after migration.
ensureColumn('user_preferences','bio_visibility',"TEXT NOT NULL DEFAULT 'network'");
ensureColumn('user_preferences','projects_visibility',"TEXT NOT NULL DEFAULT 'network'");
ensureColumn('user_preferences','shared_connections_visibility',"TEXT NOT NULL DEFAULT 'network'");
ensureColumn('user_preferences','profile_activity_visibility',"TEXT NOT NULL DEFAULT 'network'");
ensureColumn('user_preferences','profile_activity_default_visibility',"TEXT NOT NULL DEFAULT 'network'");

const profileActivitySql=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_profile_activity'").get()?.sql||'';
if(profileActivitySql && !profileActivitySql.includes("'network'")){
  db.exec(`PRAGMA foreign_keys=OFF;
  ALTER TABLE user_profile_activity RENAME TO user_profile_activity_p0126;
  CREATE TABLE user_profile_activity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('community','event','project','topic','participation')),
    target_id TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'network' CHECK(visibility IN ('public','members','network','private')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id,target_type,target_id)
  );
  INSERT INTO user_profile_activity(id,user_id,target_type,target_id,note,visibility,created_at,updated_at)
  SELECT id,user_id,target_type,target_id,note,CASE WHEN visibility='members' THEN 'network' ELSE visibility END,created_at,updated_at FROM user_profile_activity_p0126;
  DROP TABLE user_profile_activity_p0126;
  CREATE INDEX IF NOT EXISTS idx_user_profile_activity_user ON user_profile_activity(user_id,created_at DESC);
  PRAGMA foreign_keys=ON;`);
}

// PartiUp P0.2: federation identity registry. No network federation is enabled yet.
installFederationSchema(db);
installGovernanceSchema(db);
installProtocolSchema(db);
installMediaFederationSchema(db);
installExtensionSchema(db);
// User federation identities are opt-in and MUST NOT be auto-created from PARTIUP_BASE_URL.
for (const row of db.prepare('SELECT id FROM communities').all()) ensureSpaceFederationHandle(db,row.id);
backfillLocalEntities(db, process.env.PARTIUP_BASE_URL || '');

// v0.8.5 migration: older databases restricted user_follows to community/place/topic.
const followSql=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_follows'").get()?.sql||'';
if(followSql && (!followSql.includes("'person'") || !followSql.includes("'event'") || !followSql.includes("'project'") || !followSql.includes("'participation'"))){
  db.exec(`PRAGMA foreign_keys=OFF;
  ALTER TABLE user_follows RENAME TO user_follows_old;
  CREATE TABLE user_follows (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('community','place','topic','person','event','project','participation')),
    target_id TEXT NOT NULL,
    notification_level TEXT NOT NULL DEFAULT 'feed' CHECK(notification_level IN ('feed','important','all','muted')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id,target_type,target_id)
  );
  INSERT INTO user_follows(user_id,target_type,target_id,notification_level,created_at)
    SELECT user_id,target_type,target_id,notification_level,created_at FROM user_follows_old;
  DROP TABLE user_follows_old;
  CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id,target_type);
  PRAGMA foreign_keys=ON;`);
}


// Participation becomes a first-class RBAC scope. Rebuild legacy CHECK constraints once.
const roleAssignmentsSql=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='role_assignments'").get()?.sql||'';
if(roleAssignmentsSql && !roleAssignmentsSql.includes("'participation'")){
  db.exec(`PRAGMA foreign_keys=OFF;
  ALTER TABLE role_assignments RENAME TO role_assignments_old;
  CREATE TABLE role_assignments (
    scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event','participation')),
    scope_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','moderator','member','guest')),
    assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(scope_type,scope_id,user_id));
  INSERT INTO role_assignments SELECT * FROM role_assignments_old;DROP TABLE role_assignments_old;
  CREATE INDEX IF NOT EXISTS idx_role_assignments_scope ON role_assignments(scope_type,scope_id,role);
  PRAGMA foreign_keys=ON;`);
}
const permissionOverridesSql=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='permission_overrides'").get()?.sql||'';
if(permissionOverridesSql && !permissionOverridesSql.includes("'participation'")){
  db.exec(`PRAGMA foreign_keys=OFF;
  ALTER TABLE permission_overrides RENAME TO permission_overrides_old;
  CREATE TABLE permission_overrides (
    scope_type TEXT NOT NULL CHECK(scope_type IN ('community','project','event','participation')),
    scope_id TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','admin','moderator','member','guest')),
    permission TEXT NOT NULL,effect TEXT NOT NULL CHECK(effect IN ('allow','deny')),
    updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(scope_type,scope_id,role,permission));
  INSERT INTO permission_overrides SELECT * FROM permission_overrides_old;DROP TABLE permission_overrides_old;
  PRAGMA foreign_keys=ON;`);
}
// Backfill Participation owners after the scope migration.
db.exec(`INSERT OR IGNORE INTO role_assignments(scope_type,scope_id,user_id,role,assigned_by)
SELECT 'participation',id,created_by,'owner',created_by FROM participation WHERE created_by IS NOT NULL;`);

ensureColumn('events','owner_space_id','TEXT REFERENCES communities(id)');
ensureColumn('events','propagation_scope',"TEXT NOT NULL DEFAULT 'own'");
ensureColumn('events','role_inheritance',"TEXT NOT NULL DEFAULT 'member'");
ensureColumn('projects','owner_space_id','TEXT REFERENCES communities(id)');
ensureColumn('projects','propagation_scope',"TEXT NOT NULL DEFAULT 'own'");
ensureColumn('projects','role_inheritance',"TEXT NOT NULL DEFAULT 'member'");
ensureColumn('participation','owner_space_id','TEXT REFERENCES communities(id)');
ensureColumn('participation','propagation_scope',"TEXT NOT NULL DEFAULT 'own'");
ensureColumn('polls','propagation_scope',"TEXT NOT NULL DEFAULT 'own'");

// Backfill a primary owning Space from existing relation tables. Objects remain linked to all contexts.
db.exec(`
UPDATE events SET owner_space_id=(SELECT community_id FROM event_communities x WHERE x.event_id=events.id ORDER BY rowid LIMIT 1) WHERE owner_space_id IS NULL;
UPDATE projects SET owner_space_id=(SELECT community_id FROM project_communities x WHERE x.project_id=projects.id ORDER BY rowid LIMIT 1) WHERE owner_space_id IS NULL;
UPDATE participation SET owner_space_id=(SELECT community_id FROM participation_communities x WHERE x.participation_id=participation.id ORDER BY rowid LIMIT 1) WHERE owner_space_id IS NULL;
`);

// v0.9.3: clean generic/scoped rows that cannot be protected by SQLite polymorphic foreign keys.
function cleanupOrphanedScopedData(){
  const changes={};
  const run=(name,sql)=>{changes[name]=db.prepare(sql).run().changes};
  db.transaction(()=>{
    run('project_modules',"DELETE FROM object_modules WHERE entity_type='project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id=object_modules.entity_id)");
    run('event_modules',"DELETE FROM object_modules WHERE entity_type='event' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id=object_modules.entity_id)");
    run('project_tasks',"DELETE FROM tasks WHERE entity_type='project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id=tasks.entity_id)");
    run('event_tasks',"DELETE FROM tasks WHERE entity_type='event' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id=tasks.entity_id)");
    run('community_roles',"DELETE FROM role_assignments WHERE scope_type='community' AND NOT EXISTS (SELECT 1 FROM communities c WHERE c.id=role_assignments.scope_id)");
    run('project_roles',"DELETE FROM role_assignments WHERE scope_type='project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id=role_assignments.scope_id)");
    run('event_roles',"DELETE FROM role_assignments WHERE scope_type='event' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id=role_assignments.scope_id)");
    run('community_overrides',"DELETE FROM permission_overrides WHERE scope_type='community' AND NOT EXISTS (SELECT 1 FROM communities c WHERE c.id=permission_overrides.scope_id)");
    run('project_overrides',"DELETE FROM permission_overrides WHERE scope_type='project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id=permission_overrides.scope_id)");
    run('event_overrides',"DELETE FROM permission_overrides WHERE scope_type='event' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id=permission_overrides.scope_id)");
    run('project_sources',"DELETE FROM object_source_links WHERE entity_type='project' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id=object_source_links.entity_id)");
    run('event_sources',"DELETE FROM object_source_links WHERE entity_type='event' AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id=object_source_links.entity_id)");
  })();
  return changes;
}
cleanupOrphanedScopedData();


function ensureTopic(name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  db.prepare('INSERT OR IGNORE INTO topics(name) VALUES (?)').run(clean);
  return db.prepare('SELECT id FROM topics WHERE name=?').get(clean).id;
}
function createUser(id, name, email, avatar, password='demo123') {
  const {salt, hash}=hashPassword(password);
  db.prepare('INSERT INTO users(id,name,email,avatar,trust_level,password_salt,password_hash) VALUES (?,?,?,?,?,?,?)')
    .run(id,name,email,avatar,1,salt,hash);
}

function seed() {
  if(process.env.NODE_ENV==='production' && process.env.BUP_SEED_DEMO!=='1') return;
  const count = db.prepare('SELECT COUNT(*) AS n FROM places').get().n;
  if (count) return;
  db.transaction(() => {
    [['de','Deutschland','🇩🇪',null],['by','Bayern','🏔','de'],['nue','Nürnberg','📍','by'],['erl','Erlangen','📍','by']]
      .forEach(x=>db.prepare('INSERT INTO places(id,name,icon,parent_id) VALUES (?,?,?,?)').run(...x));
    ['Politik','Demokratie','Sport','Kultur','Umwelt','Verkehr','Bildung','Nachbarschaft','Gesundheit'].forEach(ensureTopic);
    createUser('u-max','Max','max@bottomupparti.local','M');
    createUser('u-anna','Anna','anna@bottomupparti.local','A');
    createUser('u-lisa','Lisa','lisa@bottomupparti.local','L');
    // Explicitly open only the built-in demo identities in newly seeded databases.
    // Account defaults and existing databases remain privacy-preserving.
    const demoVisibilityFields = [
      'profile_visibility','bio_visibility','place_visibility',
      'memberships_visibility','interests_visibility','projects_visibility',
      'event_attendance_visibility','shared_connections_visibility',
      'profile_activity_visibility','profile_activity_default_visibility',
      'follows_visibility','created_content_visibility'
    ];
    const openDemo = db.prepare(`UPDATE user_preferences SET
      ${demoVisibilityFields.map(field => `${field}='public'`).join(', ')},
      dm_permission='all',group_invites='all',allow_followers=1 WHERE user_id=?`);
    for (const id of ['u-max','u-anna','u-lisa']) {
      db.prepare('INSERT OR IGNORE INTO user_preferences(user_id) VALUES (?)').run(id);
      openDemo.run(id);
    }

    db.prepare('UPDATE users SET trust_level=? WHERE id=?').run(2,'u-max');
    db.prepare('UPDATE users SET trust_level=? WHERE id=?').run(3,'u-anna');
    db.prepare('UPDATE users SET trust_level=? WHERE id=?').run(3,'u-lisa');
    db.prepare("UPDATE users SET bio=?,place_id=? WHERE id=?").run('Sport, Nachbarschaft und lokale Projekte.','erl','u-max');
    db.prepare("UPDATE users SET bio=?,place_id=? WHERE id=?").run('Kultur, Stadtentwicklung und gemeinschaftliche Projekte.','erl','u-anna');
    db.prepare("UPDATE users SET bio=?,place_id=? WHERE id=?").run('Mobilität, Umwelt und Beteiligung.','erl','u-lisa');
    const ut=db.prepare('INSERT OR IGNORE INTO user_topics(user_id,topic_id) VALUES (?,?)');
    [['u-max','Sport'],['u-max','Nachbarschaft'],['u-anna','Kultur'],['u-anna','Umwelt'],['u-lisa','Verkehr'],['u-lisa','Umwelt'],['u-lisa','Demokratie']].forEach(([u,t])=>ut.run(u,ensureTopic(t)));

    const communities = [
      ['rad-erl','🚲','Fahrradstadt Erlangen','Initiative','Gemeinsam für sichere, alltagstaugliche Radwege in Erlangen.','native','', 'u-lisa',['erl','by'],['Politik','Verkehr','Umwelt'],['rad-de']],
      ['rad-de','🚴','Bundesweites Fahrradnetz','Organisation','Bundesweites Netzwerk rund um Radverkehr und Mobilität.','external','Partnernetzwerk',null,['de'],['Verkehr','Umwelt','Sport'],['rad-erl']],
      ['sport','🏀','Sport & Bewegung','Community','Lokale Community für Bewegung, Training und Vereinssport.','native','', 'u-max',['erl','by'],['Sport','Gesundheit'],['sportbund']],
      ['essbar','🌱','Essbare Stadt','Projekt-Community','Urban Gardening, essbare Flächen und Nachbarschaftsprojekte.','native','', 'u-anna',['erl'],['Umwelt','Nachbarschaft'],['klima']],
      ['klima','🌍','Klima-Initiativen','Netzwerk','Vernetzte Klima-Initiativen aus Bayern und Deutschland.','external','WeChange / Demo',null,['by','de'],['Umwelt','Politik'],['essbar']],
      ['kultur','🎭','Kultur in Erlangen','Verein','Kulturtermine, Projekte und Austausch in Erlangen.','native','', 'u-anna',['erl'],['Kultur'],[]],
      ['jugend','🧑‍🤝‍🧑','Jugend macht Politik','Initiative','Politische Bildung und Beteiligung für junge Menschen.','native','', 'u-max',['erl','by','de'],['Demokratie','Politik','Bildung'],[]],
      ['sportbund','🏅','Deutscher Sportbund','Organisation','Bundesweite Sportorganisation – externe Referenz.','external','Externe Quelle',null,['de'],['Sport'],['sport']]
    ];
    const ic=db.prepare('INSERT INTO communities(id,icon,name,type,description,source,source_label,created_by) VALUES (?,?,?,?,?,?,?,?)');
    const cp=db.prepare('INSERT OR IGNORE INTO community_places(community_id,place_id) VALUES (?,?)');
    const ct=db.prepare('INSERT OR IGNORE INTO community_topics(community_id,topic_id) VALUES (?,?)');
    for (const [id,icon,name,type,description,source,sourceLabel,createdBy,pls,tps] of communities) {
      ic.run(id,icon,name,type,description,source,sourceLabel,createdBy);
      pls.forEach(p=>cp.run(id,p)); tps.forEach(t=>ct.run(id,ensureTopic(t)));
    }
    // Demo-Unterräume: dieselbe Community-Struktur wird verschachtelt statt als Parallelmodell dupliziert.
    ic.run('sport-lauf','🏃','Feierabend-Laufrunde','Gruppe','Offene Laufgruppe innerhalb von Sport & Bewegung.','native','', 'u-max');
    ic.run('sport-basket','🏀','Basketball-Team','Team / Mannschaft','Organisation von Trainings und Spielen innerhalb von Sport & Bewegung.','native','', 'u-max');
    db.prepare('UPDATE communities SET parent_id=? WHERE id IN (?,?)').run('sport','sport-lauf','sport-basket');
    ['sport-lauf','sport-basket'].forEach(cid=>{cp.run(cid,'erl');ct.run(cid,ensureTopic('Sport'));});

    const cv=db.prepare('UPDATE communities SET entity_verification_status=?, officially_managed=?, verified_organization_name=? WHERE id=?');
    cv.run('creator_verified',0,'','rad-erl');
    cv.run('creator_verified',0,'','sport');
    cv.run('creator_verified',0,'','essbar');
    cv.run('official',1,'Kultur in Erlangen e.V.','kultur');
    cv.run('creator_verified',0,'','jugend');
    const cr=db.prepare('INSERT OR IGNORE INTO community_relations(from_id,to_id,relation_type) VALUES (?,?,?)');
    for (const [id,,,,,,,,,,rels] of communities) rels.forEach(r=>cr.run(id,r,'related'));

    const mem=db.prepare('INSERT OR IGNORE INTO memberships(community_id,user_id,role) VALUES (?,?,?)');
    [['rad-erl','u-lisa','admin'],['rad-erl','u-max','member'],['sport','u-max','admin'],['sport','u-anna','member'],['essbar','u-anna','admin'],['essbar','u-max','member'],['kultur','u-anna','admin'],['jugend','u-max','admin'],['jugend','u-lisa','moderator'],['sport-lauf','u-max','admin'],['sport-basket','u-max','admin']].forEach(x=>mem.run(...x));

    const post=db.prepare('INSERT INTO posts(id,community_id,author_id,body,created_at) VALUES (?,?,?,?,?)');
    post.run('post1','rad-erl','u-lisa','Wir sammeln Vorschläge für sichere Radwege rund um den Bahnhof. Welche Stelle fehlt euch noch?','2026-09-02 15:20:00');
    post.run('post2','sport','u-max','Wer hat Interesse an einer offenen Feierabend-Laufrunde? Tempo und Strecke stimmen wir gemeinsam ab.','2026-09-02 16:10:00');
    post.run('post3','essbar','u-anna','Für den nächsten Pflanztag suchen wir noch zwei Hochbeete und Erde.','2026-09-01 18:30:00');
    const comment=db.prepare('INSERT INTO comments(id,post_id,author_id,body,created_at) VALUES (?,?,?,?,?)');
    comment.run('com1','post1','u-max','Die Kreuzung am Bahnhofsvorplatz wäre für mich ganz oben auf der Liste.','2026-09-02 15:42:00');
    comment.run('com2','post1','u-anna','Ich würde zusätzlich die Verbindung Richtung Südstadt aufnehmen.','2026-09-02 16:03:00');

    const events=[
      ['ev1','SA · 05.09. · 10:00','Repair-Café','Erlangen · PartiUp','Gemeinsam reparieren statt wegwerfen.','native','u-anna',['erl'],['Umwelt','Nachbarschaft'],['essbar']],
      ['ev2','SO · 06.09. · 15:00','Stadtteil-Fahrradtour','Erlangen · Mobilizon','Gemeinsame Tour durch Erlangen.','external',null,['erl'],['Sport','Verkehr'],['rad-erl']],
      ['ev3','DI · 08.09. · 19:00','Stadtentwicklung diskutieren','Erlangen · Decidim','Offener Austausch zur Stadtentwicklung.','external',null,['erl','by'],['Politik','Verkehr'],['rad-erl']],
      ['ev4','SA · 12.09. · 11:00','Bundesweiter Aktionstag Fahrrad','Deutschland · externe Quelle','Aktionstag mit lokalen Ablegern.','external',null,['de','by','erl'],['Verkehr','Umwelt','Sport'],['rad-de','rad-erl']]
    ];
    const ie=db.prepare('INSERT INTO events(id,date_label,name,meta,description,source,created_by) VALUES (?,?,?,?,?,?,?)');
    const ep=db.prepare('INSERT INTO event_places(event_id,place_id) VALUES (?,?)');
    const et=db.prepare('INSERT INTO event_topics(event_id,topic_id) VALUES (?,?)');
    const ec=db.prepare('INSERT INTO event_communities(event_id,community_id) VALUES (?,?)');
    for(const [id,date,name,meta,description,source,createdBy,pls,tps,cs] of events){ie.run(id,date,name,meta,description,source,createdBy);pls.forEach(p=>ep.run(id,p));tps.forEach(t=>et.run(id,ensureTopic(t)));cs.forEach(c=>ec.run(id,c));}

    const projects=[
      ['p1','🚲','Sicherer Radweg Bahnhof – Innenstadt','Fahrradstadt Erlangen','Gemeinsame Sammlung, Priorisierung und Umsetzung konkreter Verbesserungen.',42,68,'u-lisa',['erl'],['Verkehr','Politik'],['rad-erl']],
      ['p2','🌳','Mehr Schattenplätze am Spielplatz','Nachbarschaft Süd','Ideen und Unterstützer für mehr Schatten im Quartier.',18,35,'u-anna',['erl'],['Umwelt','Nachbarschaft'],['essbar']],
      ['p3','♻️','Reparieren statt Wegwerfen','Klima-Initiativen','Repair-Angebote sichtbar machen und lokale Gruppen verbinden.',31,82,'u-anna',['erl','by'],['Umwelt'],['essbar','klima']]
    ];
    const ipr=db.prepare('INSERT INTO projects(id,icon,name,owner,description,supporters,progress,created_by) VALUES (?,?,?,?,?,?,?,?)');
    const pp=db.prepare('INSERT INTO project_places(project_id,place_id) VALUES (?,?)');
    const pt=db.prepare('INSERT INTO project_topics(project_id,topic_id) VALUES (?,?)');
    const pc=db.prepare('INSERT INTO project_communities(project_id,community_id) VALUES (?,?)');
    for(const [id,icon,name,owner,description,supp,prog,createdBy,pls,tps,cs] of projects){ipr.run(id,icon,name,owner,description,supp,prog,createdBy);pls.forEach(p=>pp.run(id,p));tps.forEach(t=>pt.run(id,ensureTopic(t)));cs.forEach(c=>pc.run(id,c));}
    db.prepare("UPDATE projects SET entity_verification_status='creator_verified' WHERE created_by IS NOT NULL").run();

    const pollId='poll1';
    db.prepare('INSERT INTO polls(id,community_id,author_id,question) VALUES (?,?,?,?)').run(pollId,'rad-erl','u-lisa','Welche Verbindung sollen wir als Nächstes priorisieren?');
    [['po1','Bahnhof → Innenstadt'],['po2','Südstadt → Zentrum'],['po3','Bruck → Innenstadt']].forEach(x=>db.prepare('INSERT INTO poll_options(id,poll_id,label) VALUES (?,?,?)').run(x[0],pollId,x[1]));
    db.prepare('INSERT INTO poll_votes(option_id,user_id) VALUES (?,?)').run('po1','u-max');

    const placeNameSeed=id=>({de:'Deutschland',by:'Bayern',nue:'Nürnberg',erl:'Erlangen'}[id]||id);
    const parts=[
      ['pa1','🏛️','Stadtentwicklung 2035','Beteiligungsverfahren','Kommune','Bürgerbeteiligung','Stadt Erlangen','offen','30.09.2026','Ideen und Stellungnahmen zur langfristigen Stadtentwicklung.','external','Decidim','erl',['Politik','Verkehr'],['rad-erl'],['p1']],
      ['pa2','🗳️','Verkehrskonzept Bayern','Anhörung','Land','Anhörung','Bayerisches Staatsministerium','offen','15.10.2026','Landesweite Rückmeldungen zur zukünftigen Mobilitätspolitik.','external','Landesportal / Demo','by',['Verkehr','Politik'],['rad-de'],[]],
      ['pa3','📋','Jugendbeteiligung Erlangen','PartiUp Beteiligung','Kommune','Abstimmung','Jugend macht Politik','offen','20.09.2026','Jugendliche priorisieren Themen für die nächste lokale Projektphase.','native','PartiUp','erl',['Demokratie','Bildung'],['jugend'],[]],
      ['pa4','🇩🇪','Bundestag: Mobilitätsdatengesetz','Parlamentsvorgang','Bund','Gesetz / Vorlage','Deutscher Bundestag','laufend','','Informationsansicht zu einem bundespolitischen Vorgang mit späterer Democracy-Anbindung.','external','Democracy-Logik · Demo','de',['Politik','Demokratie','Verkehr'],['rad-de'],[]],
      ['pa5','🏙️','Radverkehr Bahnhofsvorplatz','Stadtratsvorgang','Kommune','Ratsvorgang','Stadtrat Erlangen','in Beratung','22.09.2026','Kommunaler Vorgang, verknüpft mit Initiative und Projekt.','external','Ratsinfo · Demo','erl',['Politik','Verkehr'],['rad-erl'],['p1']]
    ];
    const ipa=db.prepare('INSERT INTO participation(id,icon,name,meta,level,type,institution,status,deadline,description,source,source_label,place,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const pat=db.prepare('INSERT INTO participation_topics(participation_id,topic_id) VALUES (?,?)');
    const pap=db.prepare('INSERT INTO participation_places(participation_id,place_id) VALUES (?,?)');
    const pac=db.prepare('INSERT INTO participation_communities(participation_id,community_id) VALUES (?,?)');
    const papr=db.prepare('INSERT INTO participation_projects(participation_id,project_id) VALUES (?,?)');
    for(const [id,icon,name,meta,level,type,institution,status,deadline,description,source,sourceLabel,placeId,tps,cs,prs] of parts){
      const createdBy=id==='pa3'?'u-max':null;
      ipa.run(id,icon,name,meta,level,type,institution,status,deadline,description,source,sourceLabel,placeNameSeed(placeId),createdBy);
      pap.run(id,placeId);tps.forEach(t=>pat.run(id,ensureTopic(t)));cs.forEach(c=>pac.run(id,c));prs.forEach(pr=>papr.run(id,pr));
    }
    db.prepare("UPDATE participation SET enable_info=1,enable_poll=1,enable_vote=1,enable_pro_contra=1,min_participant_trust=1 WHERE id='pa3'").run();
    db.prepare('INSERT INTO participation_info(id,participation_id,title,body,author_id) VALUES (?,?,?,?,?)').run('pai1','pa3','Worum geht es?','Die Jugendbeteiligung sammelt Prioritäten für die nächste lokale Projektphase. Informationen, Meinungsbild, Abstimmung und strukturierte Argumente werden in einem Vorgang gebündelt.','u-max');
    db.prepare('INSERT INTO participation_questions(id,participation_id,kind,question,description,is_binding,created_by) VALUES (?,?,?,?,?,?,?)').run('paq1','pa3','poll','Welches Thema braucht kurzfristig mehr Aufmerksamkeit?','Unverbindliches Meinungsbild der Teilnehmenden.',0,'u-max');
    [['paq1o1','Bezahlbare Freizeitangebote'],['paq1o2','Mobilität am Abend'],['paq1o3','Mehr Jugendräume']].forEach((x,i)=>db.prepare('INSERT INTO participation_question_options(id,question_id,label,sort_order) VALUES (?,?,?,?)').run(x[0],'paq1',x[1],i));
    db.prepare('INSERT INTO participation_questions(id,participation_id,kind,question,description,is_binding,created_by) VALUES (?,?,?,?,?,?,?)').run('paq2','pa3','vote','Soll „Mehr Jugendräume“ als priorisiertes Projekt weiterverfolgt werden?','PartiUp-Abstimmung; im Demo-Vorgang ausdrücklich als unverbindlich gekennzeichnet.',0,'u-max');
    [['paq2o1','Ja'],['paq2o2','Nein'],['paq2o3','Enthaltung']].forEach((x,i)=>db.prepare('INSERT INTO participation_question_options(id,question_id,label,sort_order) VALUES (?,?,?,?)').run(x[0],'paq2',x[1],i));
    db.prepare('INSERT INTO participation_arguments(id,participation_id,side,body,author_id) VALUES (?,?,?,?,?)').run('paa1','pa3','pro','Eigene Jugendräume schaffen dauerhaft Platz für selbstorganisierte Angebote.','u-max');
    db.prepare('INSERT INTO participation_arguments(id,participation_id,side,body,author_id) VALUES (?,?,?,?,?)').run('paa2','pa3','contra','Vor neuen Räumen sollte geprüft werden, ob bestehende Einrichtungen besser ausgelastet werden können.','u-anna');
  })();
}


const SPACE_MODULES=['feed','spaces','events','projects','participation','polls','members'];
function ensureSpaceModules(spaceId, inheritFrom=null){
  const ins=db.prepare('INSERT OR IGNORE INTO space_modules(space_id,module_type,enabled,visibility,permissions_json,config_json) VALUES (?,?,?,?,?,?)');
  for(const moduleType of SPACE_MODULES){
    let src=inheritFrom?db.prepare('SELECT enabled,visibility,permissions_json,config_json FROM space_modules WHERE space_id=? AND module_type=?').get(inheritFrom,moduleType):null;
    ins.run(spaceId,moduleType,src?.enabled??1,src?.visibility||'members',src?.permissions_json||'{}',src?.config_json||'{}');
  }
}

seed();
// Seed data is inserted after schema migrations. Apply ownership backfills again so
// a fresh database receives the same parent-Space role inheritance as an upgraded DB.
db.exec(`
UPDATE events SET owner_space_id=(SELECT community_id FROM event_communities x WHERE x.event_id=events.id ORDER BY rowid LIMIT 1) WHERE owner_space_id IS NULL;
UPDATE projects SET owner_space_id=(SELECT community_id FROM project_communities x WHERE x.project_id=projects.id ORDER BY rowid LIMIT 1) WHERE owner_space_id IS NULL;
UPDATE participation SET owner_space_id=(SELECT community_id FROM participation_communities x WHERE x.participation_id=participation.id ORDER BY rowid LIMIT 1) WHERE owner_space_id IS NULL;
`);
// User federation identities are opt-in and MUST NOT be auto-created from PARTIUP_BASE_URL.
for (const row of db.prepare('SELECT id FROM communities').all()) ensureSpaceFederationHandle(db,row.id);
// Existing databases are migrated without reset.
for(const {id} of db.prepare('SELECT id FROM communities').all()) ensureSpaceModules(id);
db.prepare(`INSERT OR IGNORE INTO external_sources(id,name,source_type,protocol,base_url,capabilities_json,auth_method,sync_mode) VALUES ('demo-sports-source','Verbandsspielplan · Demo','sports_schedule','ical','', '["events","updates"]','none','read')`).run();
if(db.prepare("SELECT 1 FROM communities WHERE id='sport-basket'").get() && !db.prepare("SELECT 1 FROM events WHERE id='ev-team-fixture-demo'").get()){
  db.prepare("INSERT INTO events(id,date_label,name,meta,description,source,source_label,created_by,visibility,attendance_policy,min_trust_level,owner_space_id,propagation_scope) VALUES ('ev-team-fixture-demo','SA · 19.09. · 18:00','Basketball: Heimspiel gegen Nürnberg','Verbandsspielplan · Demo','Importierter Spieltermin als Beispiel für spätere Verbands-Synchronisation.','external','Verbandsspielplan · Demo',NULL,'public','open',1,'sport-basket','root')").run();
  db.prepare("INSERT OR IGNORE INTO event_places(event_id,place_id) VALUES ('ev-team-fixture-demo','erl')").run();
  db.prepare("INSERT OR IGNORE INTO event_topics(event_id,topic_id) VALUES ('ev-team-fixture-demo',?)").run(ensureTopic('Sport'));
  db.prepare("INSERT OR IGNORE INTO event_communities(event_id,community_id) VALUES ('ev-team-fixture-demo','sport-basket')").run();
  db.prepare("INSERT OR IGNORE INTO object_source_links(id,entity_type,entity_id,source_id,external_id,source_url,sync_mode,last_synced_at,is_source_of_truth,metadata_json) VALUES ('osl-team-fixture','event','ev-team-fixture-demo','demo-sports-source','fixture-001','', 'read',CURRENT_TIMESTAMP,1,'{\"demo\":true}')").run();
}
function ensureParticipationDemoModules(){
  const exists=db.prepare("SELECT 1 FROM participation WHERE id='pa3'").get();if(!exists)return;
  db.prepare("UPDATE participation SET enable_info=1,enable_poll=1,enable_vote=1,enable_pro_contra=1,min_participant_trust=1 WHERE id='pa3'").run();
  if(!db.prepare("SELECT 1 FROM participation_info WHERE participation_id='pa3' LIMIT 1").get())db.prepare('INSERT INTO participation_info(id,participation_id,title,body,author_id) VALUES (?,?,?,?,?)').run('pai1','pa3','Worum geht es?','Die Jugendbeteiligung sammelt Prioritäten für die nächste lokale Projektphase. Informationen, Meinungsbild, Abstimmung und strukturierte Argumente werden in einem Vorgang gebündelt.','u-max');
  if(!db.prepare("SELECT 1 FROM participation_questions WHERE participation_id='pa3' AND kind='poll' LIMIT 1").get()){
    db.prepare('INSERT INTO participation_questions(id,participation_id,kind,question,description,is_binding,created_by) VALUES (?,?,?,?,?,?,?)').run('paq1','pa3','poll','Welches Thema braucht kurzfristig mehr Aufmerksamkeit?','Unverbindliches Meinungsbild der Teilnehmenden.',0,'u-max');
    [['paq1o1','Bezahlbare Freizeitangebote'],['paq1o2','Mobilität am Abend'],['paq1o3','Mehr Jugendräume']].forEach((x,i)=>db.prepare('INSERT OR IGNORE INTO participation_question_options(id,question_id,label,sort_order) VALUES (?,?,?,?)').run(x[0],'paq1',x[1],i));
  }
  if(!db.prepare("SELECT 1 FROM participation_questions WHERE participation_id='pa3' AND kind='vote' LIMIT 1").get()){
    db.prepare('INSERT INTO participation_questions(id,participation_id,kind,question,description,is_binding,created_by) VALUES (?,?,?,?,?,?,?)').run('paq2','pa3','vote','Soll „Mehr Jugendräume“ als priorisiertes Projekt weiterverfolgt werden?','PartiUp-Abstimmung; im Demo-Vorgang ausdrücklich als unverbindlich gekennzeichnet.',0,'u-max');
    [['paq2o1','Ja'],['paq2o2','Nein'],['paq2o3','Enthaltung']].forEach((x,i)=>db.prepare('INSERT OR IGNORE INTO participation_question_options(id,question_id,label,sort_order) VALUES (?,?,?,?)').run(x[0],'paq2',x[1],i));
  }
  if(!db.prepare("SELECT 1 FROM participation_arguments WHERE participation_id='pa3' LIMIT 1").get()){
    db.prepare('INSERT INTO participation_arguments(id,participation_id,side,body,author_id) VALUES (?,?,?,?,?)').run('paa1','pa3','pro','Eigene Jugendräume schaffen dauerhaft Platz für selbstorganisierte Angebote.','u-max');
    db.prepare('INSERT INTO participation_arguments(id,participation_id,side,body,author_id) VALUES (?,?,?,?,?)').run('paa2','pa3','contra','Vor neuen Räumen sollte geprüft werden, ob bestehende Einrichtungen besser ausgelastet werden können.','u-anna');
  }
}
ensureParticipationDemoModules();

const placesFor=(table,idCol,id)=>db.prepare(`SELECT p.id,p.name,p.icon,p.parent_id FROM places p JOIN ${table} x ON x.place_id=p.id WHERE x.${idCol}=?`).all(id);
const topicsFor=(table,idCol,id)=>db.prepare(`SELECT t.name FROM topics t JOIN ${table} x ON x.topic_id=t.id WHERE x.${idCol}=? ORDER BY t.name`).all(id).map(x=>x.name);
const communitiesFor=(table,idCol,id,userId=null)=>db.prepare(`SELECT c.* FROM communities c JOIN ${table} x ON x.community_id=c.id WHERE x.${idCol}=?`).all(id).filter(c=>canViewCommunityRow(c,userId)).map(({id,name,icon,type,source})=>({id,name,icon,type,source}));

function mediaFor(entityType,entityId,role=null){
  let sql=`SELECT m.*,l.role FROM media m JOIN media_links l ON l.media_id=m.id WHERE l.entity_type=? AND l.entity_id=?`;
  const args=[entityType,entityId]; if(role){sql+=' AND l.role=?';args.push(role)} sql+=' ORDER BY datetime(l.created_at) DESC';
  return db.prepare(sql).all(...args).map(m=>{let variants={};try{variants=JSON.parse(m.variants_json||'{}')}catch{}return {id:m.id,kind:m.kind,mime_type:m.mime_type,size_bytes:m.size_bytes,width:m.width,height:m.height,role:m.role,created_at:m.created_at,variants}});
}
function mediaOne(entityType,entityId,role){return mediaFor(entityType,entityId,role)[0]||null;}
function creatorSafe(id){if(!id)return null;const u=db.prepare('SELECT id,name,avatar,trust_level FROM users WHERE id=?').get(id)||null;if(u)u.profile_image=mediaOne('user',u.id,'avatar');return u;}

function followsForUser(userId){
  const rows=userId?db.prepare('SELECT target_type,target_id,notification_level,created_at FROM user_follows WHERE user_id=? ORDER BY datetime(created_at) DESC').all(userId):[];
  return {
    communities:rows.filter(x=>x.target_type==='community').map(x=>({id:x.target_id,notification_level:x.notification_level})),
    places:rows.filter(x=>x.target_type==='place').map(x=>({id:x.target_id,notification_level:x.notification_level})),
    topics:rows.filter(x=>x.target_type==='topic').map(x=>({id:x.target_id,notification_level:x.notification_level})),
    people:rows.filter(x=>x.target_type==='person').map(x=>({id:x.target_id,notification_level:x.notification_level})),
    events:rows.filter(x=>x.target_type==='event').map(x=>({id:x.target_id,notification_level:x.notification_level})),
    projects:rows.filter(x=>x.target_type==='project').map(x=>({id:x.target_id,notification_level:x.notification_level})),
    participation:rows.filter(x=>x.target_type==='participation').map(x=>({id:x.target_id,notification_level:x.notification_level}))
  };
}
function isFollowing(userId,type,id){return !!(userId&&db.prepare('SELECT 1 FROM user_follows WHERE user_id=? AND target_type=? AND target_id=?').get(userId,type,String(id)));}

function modulesForSpace(spaceId){ensureSpaceModules(spaceId);return Object.fromEntries(db.prepare('SELECT module_type,enabled,visibility,permissions_json,config_json FROM space_modules WHERE space_id=?').all(spaceId).map(x=>[x.module_type,{enabled:!!x.enabled,visibility:x.visibility,permissions:JSON.parse(x.permissions_json||'{}'),config:JSON.parse(x.config_json||'{}')}]))}
function parentIdOf(spaceId){return db.prepare('SELECT parent_id FROM communities WHERE id=?').get(spaceId)?.parent_id||null;}
function isAncestorSpace(ancestorId,spaceId){let cur=parentIdOf(spaceId),guard=0;while(cur&&guard++<20){if(cur===ancestorId)return true;cur=parentIdOf(cur)}return false;}
function visibleInSpace(ownerSpaceId,targetSpaceId,scope='own'){
  if(!ownerSpaceId)return false;if(ownerSpaceId===targetSpaceId)return true;
  if(scope==='parent')return parentIdOf(ownerSpaceId)===targetSpaceId;
  if(scope==='root')return isAncestorSpace(targetSpaceId,ownerSpaceId);
  return false;
}
function originFor(ownerSpaceId,targetSpaceId){if(!ownerSpaceId)return null;const r=db.prepare('SELECT id,name,icon,type,parent_id FROM communities WHERE id=?').get(ownerSpaceId);return r?{...r,inherited:ownerSpaceId!==targetSpaceId}:null;}
function provenanceFor(entityType,entityId){return db.prepare(`SELECT l.*,s.name source_name,s.source_type,s.protocol,s.base_url,s.capabilities_json,s.auth_method FROM object_source_links l JOIN external_sources s ON s.id=l.source_id WHERE l.entity_type=? AND l.entity_id=? ORDER BY l.is_source_of_truth DESC,l.rowid`).all(entityType,entityId).map(x=>({...x,capabilities:JSON.parse(x.capabilities_json||'[]')}));}


const OBJECT_MODULE_DEFAULTS={
  project:{tasks:true,updates:true,events:true,participation:true,discussion:true,files:true,members:true},
  event:{tasks:true,participants:true,projects:true,discussion:true,files:true}
};
function ensureObjectModules(entityType,entityId,overrides=null){
  const defs=OBJECT_MODULE_DEFAULTS[entityType]||{};
  const up=db.prepare(`INSERT INTO object_modules(entity_type,entity_id,module_type,enabled,config_json) VALUES (?,?,?,?,'{}') ON CONFLICT(entity_type,entity_id,module_type) DO UPDATE SET enabled=CASE WHEN ? IS NULL THEN object_modules.enabled ELSE excluded.enabled END`);
  for(const [name,def] of Object.entries(defs)){
    const has=overrides&&Object.prototype.hasOwnProperty.call(overrides,name);
    const val=has?!!overrides[name]:!!def;
    up.run(entityType,entityId,name,val?1:0,has?1:null);
  }
}
function modulesForObject(entityType,entityId){ensureObjectModules(entityType,entityId);return Object.fromEntries(db.prepare('SELECT module_type,enabled,config_json FROM object_modules WHERE entity_type=? AND entity_id=?').all(entityType,entityId).map(x=>[x.module_type,{enabled:!!x.enabled,config:JSON.parse(x.config_json||'{}')}]))}
function tasksForObject(entityType,entityId){return db.prepare(`SELECT t.*,u.name assignee_name,u.avatar assignee_avatar,c.name creator_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_user_id LEFT JOIN users c ON c.id=t.created_by WHERE t.entity_type=? AND t.entity_id=? ORDER BY CASE t.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, CASE t.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, t.due_at, datetime(t.created_at)`).all(entityType,entityId)}
function canViewCommunityRow(row,userId=null){
 if(!row||!permissionService.hasPermission(userId,'community',row.id,'space.view'))return false;
 return row.visibility!=='private'||!!(userId&&(row.created_by===userId||isCommunityMember(userId,row.id)));
}
function canViewScope(userId,type,id){
 const row=permissionService.scopeRow(type,id);if(!row)return false;
 if(type==='community')return canViewCommunityRow(db.prepare('SELECT * FROM communities WHERE id=?').get(id),userId);
 if(type==='project')return canViewProjectRow(db.prepare('SELECT * FROM projects WHERE id=?').get(id),userId);
 if(type==='event')return canViewEventRow(db.prepare('SELECT * FROM events WHERE id=?').get(id),userId);
 if(type==='participation')return canViewParticipation(db.prepare('SELECT * FROM participation WHERE id=?').get(id),userId,{forList:false});
 return false;
}
function scopeCapabilities(userId,type,id){
 const visible=canViewScope(userId,type,id);
 return {my_role:permissionService.roleFor(userId,type,id),my_permissions:visible?permissionService.ALL_PERMISSIONS.filter(p=>permissionService.hasPermission(userId,type,id,p)):[]};
}
function communitySummary(row, userId=null) {
  const memberCount=db.prepare('SELECT COUNT(*) n FROM memberships WHERE community_id=?').get(row.id).n;
  const membership=userId ? db.prepare('SELECT role FROM memberships WHERE community_id=? AND user_id=?').get(row.id,userId) : null;
  const joinRequest=userId ? db.prepare("SELECT status FROM community_join_requests WHERE community_id=? AND user_id=?").get(row.id,userId) : null;
  const invited=userId ? !!db.prepare('SELECT 1 FROM community_invites WHERE community_id=? AND user_id=?').get(row.id,userId) : false;
  return {
    ...row, authz:scopeCapabilities(userId,'community',row.id), member_count:memberCount, membership:membership?permissionService.roleFor(userId,'community',row.id):null, join_request:joinRequest?.status||null, invited, following:isFollowing(userId,'community',row.id), creator:creatorSafe(row.created_by), modules:modulesForSpace(row.id), extensions:activeExtensionsForSpace(db,row.id),
    logo:mediaOne('community',row.id,'logo'), cover:mediaOne('community',row.id,'cover'),
    places:placesFor('community_places','community_id',row.id),
    topics:topicsFor('community_topics','community_id',row.id),
    related:db.prepare(`SELECT c.*,r.relation_type FROM community_relations r JOIN communities c ON c.id=r.to_id WHERE r.from_id=?`).all(row.id).filter(c=>canViewCommunityRow(c,userId)).map(({id,name,icon,type,source,relation_type})=>({id,name,icon,type,source,relation_type}))
  };
}
function listCommunities(userId=null){return db.prepare('SELECT * FROM communities ORDER BY name').all().filter(c=>canViewCommunityRow(c,userId)&&(c.visibility==='public'||(userId&&(c.created_by===userId||isCommunityMember(userId,c.id))))).map(r=>communitySummary(r,userId));}
// Event access is intentionally split into three independent decisions:
// 1) visibility (canViewEventRow), 2) ability to request/join (canRequestEventAttendance),
// 3) approved attendance (hasApprovedEventAttendance). Attendance workflow states are
// never treated as a blanket ACL. In particular, requested/waitlist grant no visibility.
const APPROVED_EVENT_ATTENDANCE_STATUSES=new Set(['going','maybe']);
function eventAttendanceStatus(eventId,userId){
  if(!eventId||!userId)return null;
  return db.prepare('SELECT status FROM event_attendance WHERE event_id=? AND user_id=?').get(eventId,userId)?.status||null;
}
function hasApprovedEventAttendance(eventId,userId){return APPROVED_EVENT_ATTENDANCE_STATUSES.has(eventAttendanceStatus(eventId,userId));}
function isInvitedToEvent(eventId,userId){return !!(eventId&&userId&&db.prepare('SELECT 1 FROM event_invites WHERE event_id=? AND user_id=? LIMIT 1').get(eventId,userId));}
function isEventCommunityMember(r,userId){
  if(!r?.id||!userId)return false;
  if(r.owner_space_id&&isCommunityMember(userId,r.owner_space_id))return true;
  return !!db.prepare(`SELECT 1 FROM event_communities ec JOIN memberships m ON m.community_id=ec.community_id WHERE ec.event_id=? AND m.user_id=? LIMIT 1`).get(r.id,userId);
}
function canViewEventRow(r,userId=null){
  if(!r||!permissionService.hasPermission(userId,'event',r.id,'space.view'))return false;
  if(r.visibility==='public')return true;
  if(!userId)return false;
  if(r.created_by===userId)return true;
  if(hasApprovedEventAttendance(r.id,userId))return true;
  // Invitation and community membership only grant visibility when the configured
  // event policy explicitly uses that principal as an access gate.
  if(r.attendance_policy==='invite'&&isInvitedToEvent(r.id,userId))return true;
  if(r.attendance_policy==='members'&&isEventCommunityMember(r,userId))return true;
  // A trust-gated private/unlisted event may be visible to users satisfying that gate.
  if(r.attendance_policy==='trust'){
    const trust=db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0;
    if(Number(trust)>=Number(r.min_trust_level||1))return true;
  }
  return false;
}
function canRequestEventAttendance(r,userId=null){
  if(!r||!userId)return {ok:false,reason:'auth'};
  if(r.created_by===userId)return {ok:true};
  if(r.attendance_policy==='approval')return {ok:true};
  if(r.attendance_policy==='invite')return isInvitedToEvent(r.id,userId)?{ok:true}:{ok:false,reason:'invite'};
  if(r.attendance_policy==='members')return isEventCommunityMember(r,userId)?{ok:true}:{ok:false,reason:'members'};
  if(r.attendance_policy==='trust'){
    const trust=db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0;
    return Number(trust)>=Number(r.min_trust_level||1)?{ok:true}:{ok:false,reason:'trust'};
  }
  // 'open' controls attendance, not visibility. For non-public events an existing
  // visibility grant is still required; knowing/guessing an ID is never authorization.
  return (r.visibility==='public'||canViewEventRow(r,userId))?{ok:true}:{ok:false,reason:'visibility'};
}
function listEvents(userId=null){return db.prepare("SELECT * FROM events WHERE COALESCE(federation_lifecycle_state,'active')='active' AND COALESCE(federation_moderation_state,'active')='active' ORDER BY created_at DESC").all().filter(r=>canViewEventRow(r,userId)).map(r=>{const attendance=userId?db.prepare('SELECT status FROM event_attendance WHERE event_id=? AND user_id=?').get(r.id,userId):null;const localCounts=Object.fromEntries(db.prepare('SELECT status,COUNT(*) n FROM event_attendance WHERE event_id=? GROUP BY status').all(r.id).map(x=>[x.status,x.n]));const remoteCounts=Object.fromEntries(db.prepare("SELECT status,COUNT(*) n FROM event_remote_attendance WHERE event_id=? AND status IN ('going','requested','waitlist') GROUP BY status").all(r.id).map(x=>[x.status,x.n]));const counts={};for(const k of new Set([...Object.keys(localCounts),...Object.keys(remoteCounts)]))counts[k]=Number(localCounts[k]||0)+Number(remoteCounts[k]||0);return {...r,authz:scopeCapabilities(userId,'event',r.id),item_origin:r.remote_uri?'fediverse':'local',federation_peer_policy:r.remote_actor_uri?effectivePolicy(db,{uri:r.remote_actor_uri,spaceId:r.owner_space_id||null}).policy:'local',creator:creatorSafe(r.created_by),image:mediaOne('event',r.id,'cover'),remote_media:r.remote_uri?remoteMediaForObject(db,r.remote_uri):[],provenance:provenanceFor('event',r.id),places:placesFor('event_places','event_id',r.id),topics:topicsFor('event_topics','event_id',r.id),communities:communitiesFor('event_communities','event_id',r.id,userId),projects:db.prepare(`SELECT p.* FROM projects p JOIN event_projects x ON x.project_id=p.id WHERE x.event_id=? ORDER BY p.name`).all(r.id).filter(p=>canViewProjectRow(p,userId)).map(({id,name,icon})=>({id,name,icon})),modules:modulesForObject('event',r.id),tasks:permissionService.hasPermission(userId,'event',r.id,'task.view')?tasksForObject('event',r.id):[],attendance:attendance?.status||null,attendance_counts:counts}});}
function eventDetail(id,userId=null){
  const r=db.prepare('SELECT * FROM events WHERE id=?').get(id);
  if(!r||!canViewEventRow(r,userId))return null;
  return listEvents(userId).find(e=>e.id===id)||null;
}
function projectSummary(r,userId=null){return {...r,authz:scopeCapabilities(userId,'project',r.id),creator:creatorSafe(r.created_by),image:mediaOne('project',r.id,'cover'),provenance:provenanceFor('project',r.id),places:placesFor('project_places','project_id',r.id),topics:topicsFor('project_topics','project_id',r.id),communities:communitiesFor('project_communities','project_id',r.id,userId),events:db.prepare(`SELECT e.* FROM events e JOIN event_projects x ON x.event_id=e.id WHERE x.project_id=? ORDER BY datetime(e.created_at) DESC`).all(r.id).filter(e=>canViewEventRow(e,userId)).map(({id,name,date_label,meta})=>({id,name,date_label,meta})),participation:db.prepare(`SELECT p.* FROM participation p JOIN participation_projects x ON x.participation_id=p.id WHERE x.project_id=? ORDER BY p.name`).all(r.id).filter(p=>canViewParticipation(p,userId,{forList:true})).map(({id,name,icon,status})=>({id,name,icon,status})),modules:modulesForObject('project',r.id),tasks:permissionService.hasPermission(userId,'project',r.id,'task.view')?tasksForObject('project',r.id):[]};}
function canViewProjectRow(r,userId=null){if(!r||!permissionService.hasPermission(userId,'project',r.id,'space.view'))return false;if(r.visibility==='public')return true;if(!userId)return false;if(r.created_by===userId)return true;const owner=r.owner_space_id;if(owner&&db.prepare('SELECT 1 FROM memberships WHERE community_id=? AND user_id=?').get(owner,userId))return true;return !!db.prepare(`SELECT 1 FROM project_communities pc JOIN memberships m ON m.community_id=pc.community_id WHERE pc.project_id=? AND m.user_id=? LIMIT 1`).get(r.id,userId);}
function listProjects(userId=null){return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all().filter(r=>canViewProjectRow(r,userId)).map(r=>projectSummary(r,userId));}
function projectDetail(id,userId=null){const r=db.prepare('SELECT * FROM projects WHERE id=?').get(id);return r&&canViewProjectRow(r,userId)?projectSummary(r,userId):null;}
function participationSummary(r,userId=null){
  const places=placesFor('participation_places','participation_id',r.id);
  return {...r,authz:scopeCapabilities(userId,'participation',r.id),creator:creatorSafe(r.created_by),provenance:provenanceFor('participation',r.id),places:places.length?places:(r.place?[{id:'',name:r.place,icon:'📍',parent_id:null}]:[]),topics:topicsFor('participation_topics','participation_id',r.id),communities:communitiesFor('participation_communities','participation_id',r.id,userId),projects:db.prepare(`SELECT p.* FROM projects p JOIN participation_projects x ON x.project_id=p.id WHERE x.participation_id=?`).all(r.id).filter(p=>canViewProjectRow(p,userId)).map(({id,name,icon})=>({id,name,icon}))};
}
function participationAccessStatus(participationId,userId){if(!participationId||!userId)return null;return db.prepare('SELECT status FROM participation_access WHERE participation_id=? AND user_id=?').get(participationId,userId)?.status||null;}
function participationOwnerMember(r,userId){if(!r?.owner_space_id||!userId)return false;return isCommunityMember(userId,r.owner_space_id);}
function canViewParticipation(r,userId=null,{forList=false}={}){
  if(!r||!permissionService.hasPermission(userId,'participation',r.id,'space.view'))return false;
  const visibility=['public','unlisted','private'].includes(r.visibility)?r.visibility:'public';
  if(visibility==='public')return true;
  if(visibility==='unlisted'&&!forList)return true;
  if(!userId)return false;
  if(r.created_by===userId)return true;
  const status=participationAccessStatus(r.id,userId);
  if(status==='approved')return true;
  if(r.access_policy==='invite'&&status==='invited')return true;
  if(r.access_policy==='members'&&participationOwnerMember(r,userId))return true;
  if(r.access_policy==='trust'){
    const trust=Number(db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0);
    if(trust>=Number(r.min_trust_level||1))return true;
  }
  return false;
}
function participationCanInteract(userId,r){
  if(!userId||!r)return {ok:false,reason:'auth'};
  if(!canViewParticipation(r,userId,{forList:false}))return {ok:false,reason:'visibility'};
  if(r.source!=='native')return {ok:false,reason:'external'};
  if(r.status==='abgeschlossen')return {ok:false,reason:'closed'};
  if(permissionService.hasRoleContext(userId,'participation',r.id)&&!permissionService.hasPermission(userId,'participation',r.id,'participation.interact'))return {ok:false,reason:'role'};
  if(r.created_by===userId)return {ok:true};
  const participantTrust=Number(db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0);
  if(participantTrust<Number(r.min_participant_trust||1))return {ok:false,reason:'trust'};
  const policy=['open','members','invite','approval','trust'].includes(r.access_policy)?r.access_policy:'open';
  const status=participationAccessStatus(r.id,userId);
  if(policy==='open')return {ok:true};
  if(policy==='members')return participationOwnerMember(r,userId)?{ok:true}:{ok:false,reason:'members'};
  if(policy==='invite')return ['invited','approved'].includes(status)?{ok:true}:{ok:false,reason:'invite'};
  if(policy==='approval')return status==='approved'?{ok:true}:{ok:false,reason:'approval'};
  if(policy==='trust'){
    const trust=Number(db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0);
    return trust>=Number(r.min_trust_level||1)?{ok:true}:{ok:false,reason:'trust'};
  }
  return {ok:false,reason:'policy'};
}
function canRequestParticipationAccess(userId,r){
  if(!userId||!r)return {ok:false,reason:'auth'};
  if(r.created_by===userId)return {ok:true,status:'approved'};
  if(r.access_policy==='approval')return {ok:true,status:'requested'};
  if(r.access_policy==='invite')return participationAccessStatus(r.id,userId)==='invited'?{ok:true,status:'approved'}:{ok:false,reason:'invite'};
  if(r.access_policy==='members')return participationOwnerMember(r,userId)?{ok:true,status:'approved'}:{ok:false,reason:'members'};
  if(r.access_policy==='trust'){
    const trust=Number(db.prepare('SELECT trust_level FROM users WHERE id=?').get(userId)?.trust_level||0);
    return trust>=Number(r.min_trust_level||1)?{ok:true,status:'approved'}:{ok:false,reason:'trust'};
  }
  return canViewParticipation(r,userId,{forList:false})?{ok:true,status:'approved'}:{ok:false,reason:'visibility'};
}
function participationQuestion(q,userId=null){
  const options=db.prepare(`SELECT o.id,o.label,o.sort_order,COUNT(v.user_id) votes FROM participation_question_options o LEFT JOIN participation_question_votes v ON v.option_id=o.id WHERE o.question_id=? GROUP BY o.id,o.label,o.sort_order ORDER BY o.sort_order,o.rowid`).all(q.id);
  const total=options.reduce((n,o)=>n+Number(o.votes||0),0);const mine=userId?db.prepare('SELECT option_id FROM participation_question_votes WHERE question_id=? AND user_id=?').get(q.id,userId)?.option_id:null;
  return {...q,options,total_votes:total,my_option_id:mine};
}
function participationDetail(id,userId=null){
  const r=db.prepare('SELECT * FROM participation WHERE id=?').get(id);if(!r||!canViewParticipation(r,userId,{forList:false}))return null;const base=participationSummary(r,userId);
  const information=db.prepare(`SELECT i.*,u.name author_name,u.trust_level author_trust FROM participation_info i LEFT JOIN users u ON u.id=i.author_id WHERE i.participation_id=? ORDER BY datetime(i.created_at),i.rowid`).all(id);
  const questions=db.prepare('SELECT * FROM participation_questions WHERE participation_id=? ORDER BY datetime(created_at),rowid').all(id).map(q=>participationQuestion(q,userId));
  const arguments=db.prepare(`SELECT a.*,u.name author_name,u.trust_level author_trust,COUNT(s.user_id) supports,MAX(CASE WHEN s.user_id=? THEN 1 ELSE 0 END) supported_by_me FROM participation_arguments a JOIN users u ON u.id=a.author_id LEFT JOIN participation_argument_support s ON s.argument_id=a.id WHERE a.participation_id=? GROUP BY a.id ORDER BY supports DESC,datetime(a.created_at)`).all(userId||'',id);
  const phases=db.prepare('SELECT * FROM participation_phases WHERE participation_id=? ORDER BY sort_order,rowid').all(id);
  const proposals=db.prepare(`SELECT p.*,u.name author_name,u.trust_level author_trust,COUNT(s.user_id) supports,MAX(CASE WHEN s.user_id=? THEN 1 ELSE 0 END) supported_by_me FROM participation_proposals p LEFT JOIN users u ON u.id=p.author_id LEFT JOIN participation_proposal_support s ON s.proposal_id=p.id WHERE p.participation_id=? GROUP BY p.id ORDER BY supports DESC,datetime(p.created_at)`).all(userId||'',id);
  const outcomes=db.prepare("SELECT * FROM participation_outcomes WHERE participation_id=? AND (status<>'draft' OR created_by=?) ORDER BY datetime(created_at),rowid").all(id,userId||'');
  const timeline=[{type:'created',title:'Vorgang erstellt',created_at:r.created_at||''},...phases.map(x=>({type:'phase',title:`Phase: ${x.title} (${x.status})`,created_at:x.created_at})),...information.map(i=>({type:'info',title:`Information: ${i.title}`,created_at:i.created_at})),...questions.map(q=>({type:q.kind,title:`${q.kind==='poll'?'Umfrage':'Abstimmung'}: ${q.question}`,created_at:q.created_at})),...proposals.map(x=>({type:'proposal',title:`Vorschlag: ${x.title}`,created_at:x.created_at})),...arguments.map(a=>({type:'argument',title:`${a.side==='pro'?'Pro':'Contra'}-Argument ergänzt`,created_at:a.created_at})),...outcomes.map(x=>({type:'outcome',title:`Ergebnis: ${x.title}`,created_at:x.created_at}))].sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
  return {...base,access_status:participationAccessStatus(id,userId),can_interact:participationCanInteract(userId,r).ok,information,questions,arguments,phases,proposals,outcomes,timeline};
}
function listParticipation(userId=null){return db.prepare("SELECT * FROM participation ORDER BY CASE level WHEN 'Kommune' THEN 1 WHEN 'Land' THEN 2 WHEN 'Bund' THEN 3 ELSE 4 END, name").all().filter(r=>canViewParticipation(r,userId,{forList:true})).map(r=>participationSummary(r,userId));}
function isCommunityMember(userId, communityId){
  if(!userId||!communityId)return false;
  return !!db.prepare('SELECT 1 FROM memberships WHERE user_id=? AND community_id=? LIMIT 1').get(userId,communityId);
}
function sharesCommunity(a,b){
  if(!a||!b)return false;
  return !!db.prepare(`SELECT 1 FROM memberships x JOIN memberships y ON y.community_id=x.community_id WHERE x.user_id=? AND y.user_id=? LIMIT 1`).get(a,b);
}
function friendshipPair(a,b){const x=String(a||''),y=String(b||'');return x<y?[x,y]:[y,x];}
function friendshipRelation(viewerId,targetId){
  if(!viewerId||!targetId||viewerId===targetId)return {status:'none'};
  const [a,b]=friendshipPair(viewerId,targetId);const r=db.prepare('SELECT * FROM user_friendships WHERE user_a=? AND user_b=?').get(a,b);
  if(!r)return {status:'none'};
  if(r.status==='accepted')return {status:'friends',since:r.updated_at};
  return {status:r.requested_by===viewerId?'outgoing':'incoming',since:r.created_at};
}
function firstSharedCommunity(a,b){
  if(!a||!b)return null;
  return db.prepare(`SELECT c.id,c.name FROM memberships x JOIN memberships y ON y.community_id=x.community_id JOIN communities c ON c.id=x.community_id WHERE x.user_id=? AND y.user_id=? ORDER BY c.name LIMIT 1`).get(a,b)||null;
}
function friendshipNetwork(userId){
  if(!userId)return {friends:[],incoming:[],outgoing:[]};
  const rels=db.prepare(`SELECT * FROM user_friendships WHERE user_a=? OR user_b=? ORDER BY datetime(updated_at) DESC,datetime(created_at) DESC`).all(userId,userId);
  const out={friends:[],incoming:[],outgoing:[]};
  for(const r of rels){
    const otherId=r.user_a===userId?r.user_b:r.user_a;const profile=userProfile(otherId,userId);
    if(!profile){
      // A relationship must remain actionable even when its sender's full
      // profile is private. Only an incoming request discloses the sender's
      // decision identity; an outgoing request must not enumerate a hidden target.
      const bucket=r.status==='accepted'?'friends':r.requested_by===userId?'outgoing':'incoming';
      const incoming=bucket==='incoming';
      const person=incoming?
        db.prepare("SELECT id,name,avatar,trust_level FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(otherId):
        db.prepare("SELECT id FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(otherId);
      if(!person)continue;
      const minimal=incoming?person:{id:person.id,name:'Privates Profil',avatar:'?',trust_level:0};
      out[bucket].push({...minimal,friendship:friendshipRelation(userId,otherId),relationship_only:true});
      continue;
    }
    const shared=firstSharedCommunity(userId,otherId);const item={id:profile.id,name:profile.name,avatar:profile.avatar,trust_level:profile.trust_level,bio:profile.bio,profile_image:profile.profile_image,place:profile.place,interests:profile.interests,following:profile.following,friendship:profile.friendship,shared_context:!!shared,report_scope:shared?{type:'community',id:shared.id,name:shared.name}:null};
    if(r.status==='accepted')out.friends.push(item);else if(r.requested_by===userId)out.outgoing.push(item);else out.incoming.push(item);
  }
  return out;
}
function isAcceptedFriend(a,b){if(!a||!b||a===b)return false;const [x,y]=friendshipPair(a,b);return !!db.prepare("SELECT 1 FROM user_friendships WHERE user_a=? AND user_b=? AND status='accepted'").get(x,y)}
function prefAllows(viewerId,targetId,value){
  if(viewerId===targetId)return true;
  if(value==='public')return true;
  if(value==='members')return !!viewerId;
  if(value==='network')return !!(viewerId&&isAcceptedFriend(viewerId,targetId));
  return false;
}
function canSeeProfileIdentity(viewerId,targetId){
 const pref=db.prepare("SELECT p.profile_visibility FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=? AND COALESCE(u.account_status,'active')='active'").get(targetId);
 return !!pref&&prefAllows(viewerId,targetId,pref.profile_visibility||'network');
}
const privacyRank={public:0,members:1,network:2,private:3};
function stricterVisibility(a='private',b='private'){return (privacyRank[a]??3)>=(privacyRank[b]??3)?a:b}
function visibilityLabel(value){return value==='public'?'Öffentlich':value==='members'?'Angemeldete Mitglieder':value==='network'?'Netzwerk/Freunde':'Privat'}
function publicUserBase(id){const u=db.prepare("SELECT id,name,avatar,trust_level,bio,place_id,created_at FROM users WHERE id=? AND COALESCE(account_status,'active')='active'").get(id)||null;if(!u)return null;u.profile_image=mediaOne('user',u.id,'avatar');return u;}
function profileActivityViewerAllowed(ownerId,viewerId,visibility,profileVisibility='private'){
  return prefAllows(viewerId,ownerId,stricterVisibility(visibility,profileVisibility));
}
function profileActivityTarget(targetType,targetId,viewerId=null){
  if(targetType==='community'){
    const x=communityDetail(targetId,viewerId);if(!x)return null;
    return {type:'community',id:x.id,name:x.name,icon:x.icon||'◈',source_space:x.parent?{id:x.parent.id,name:x.parent.name}:null,places:x.places||[],topics:x.topics||[]};
  }
  if(targetType==='event'){
    const x=eventDetail(targetId,viewerId);if(!x)return null;
    return {type:'event',id:x.id,name:x.name,icon:'◷',source_space:(x.communities||[])[0]||x.origin_space||null,places:x.places||[],topics:x.topics||[]};
  }
  if(targetType==='project'){
    const x=projectDetail(targetId,viewerId);if(!x)return null;
    return {type:'project',id:x.id,name:x.name,icon:x.icon||'◆',source_space:(x.communities||[])[0]||x.origin_space||null,places:x.places||[],topics:x.topics||[]};
  }
  if(targetType==='participation'){
    const x=participationDetail(targetId,viewerId);if(!x)return null;
    return {type:'participation',id:x.id,name:x.name,icon:x.icon||'☑',source_space:(x.communities||[])[0]||null,places:x.places||[],topics:x.topics||[]};
  }
  if(targetType==='topic'){
    const row=db.prepare('SELECT name FROM topics WHERE name=? OR id=?').get(targetId,targetId);if(!row)return null;
    return {type:'topic',id:row.name,name:row.name,icon:'#',source_space:null,places:[],topics:[]};
  }
  return null;
}
function profileActivityForUser(ownerId,viewerId=null){
  const pref=db.prepare('SELECT profile_activity_visibility FROM user_preferences WHERE user_id=?').get(ownerId)||{profile_activity_visibility:'network'};
  return db.prepare('SELECT * FROM user_profile_activity WHERE user_id=? ORDER BY datetime(created_at) DESC').all(ownerId)
    .filter(a=>profileActivityViewerAllowed(ownerId,viewerId,a.visibility,pref.profile_activity_visibility))
    .map(a=>{const target=profileActivityTarget(a.target_type,a.target_id,viewerId);return target?{...a,target,effective_visibility:stricterVisibility(a.visibility,pref.profile_activity_visibility)}:null})
    .filter(Boolean);
}
function userProfile(id,viewerId=null){
  const base=publicUserBase(id);if(!base)return null;
  const pref=db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(id)||{profile_visibility:'network',bio_visibility:'network',place_visibility:'private',memberships_visibility:'private',follows_visibility:'private',event_attendance_visibility:'private',interests_visibility:'network',projects_visibility:'network',shared_connections_visibility:'network',profile_activity_visibility:'network',profile_activity_default_visibility:'network',created_content_visibility:'network',allow_followers:1};
  if(!prefAllows(viewerId,id,pref.profile_visibility))return null;
  base.bio=prefAllows(viewerId,id,pref.bio_visibility||'network')?base.bio:null;
  const place=prefAllows(viewerId,id,pref.place_visibility||'private')&&base.place_id?db.prepare('SELECT id,name,icon FROM places WHERE id=?').get(base.place_id)||null:null;
  const interests=prefAllows(viewerId,id,pref.interests_visibility||'network')?db.prepare('SELECT t.name FROM user_topics ut JOIN topics t ON t.id=ut.topic_id WHERE ut.user_id=? ORDER BY t.name').all(id).map(x=>x.name):null;
  let memberships=null;if(prefAllows(viewerId,id,pref.memberships_visibility||'private')){memberships=db.prepare(`SELECT c.id,c.name,c.icon,c.type,m.role,m.created_at,c.visibility FROM memberships m JOIN communities c ON c.id=m.community_id WHERE m.user_id=? ORDER BY c.name`).all(id).filter(c=>c.visibility==='public'||viewerId===id||!!(viewerId&&isCommunityMember(viewerId,c.id))).filter(c=>canViewScope(viewerId,'community',c.id)).map(({visibility,...x})=>({...x,role:permissionService.roleFor(id,'community',x.id)}))}
  let follows=null,followed_topics=null;if(prefAllows(viewerId,id,pref.follows_visibility||'private')){const f=followsForUser(id);follows={communities:f.communities.filter(x=>canViewScope(viewerId,'community',x.id)).map(x=>x.id),places:f.places.map(x=>x.id),topics:f.topics.map(x=>x.id),people:f.people.filter(x=>canSeeProfileIdentity(viewerId,x.id)).map(x=>x.id)};followed_topics=f.topics.map(x=>({id:x.id,name:x.name||x.id}))}
  const canShowCreated=prefAllows(viewerId,id,pref.created_content_visibility||'network');
  const canShowProjects=prefAllows(viewerId,id,pref.projects_visibility||'network');
  const created={communities:canShowCreated?listCommunities(viewerId).filter(x=>x.created_by===id):null,projects:canShowProjects?listProjects(viewerId).filter(x=>x.created_by===id):null,events:canShowCreated?listEvents(viewerId).filter(x=>x.created_by===id):null,participation:canShowCreated?listParticipation(viewerId).filter(x=>x.created_by===id):null};
  let event_attendance=null;if(prefAllows(viewerId,id,pref.event_attendance_visibility||'private')){const visible=new Map(listEvents(viewerId).map(e=>[e.id,e]));event_attendance=db.prepare(`SELECT event_id,status,created_at FROM event_attendance WHERE user_id=? AND status IN ('going','maybe') ORDER BY datetime(updated_at) DESC`).all(id).map(a=>visible.has(a.event_id)?{...visible.get(a.event_id),attendance_status:a.status,attended_since:a.created_at}:null).filter(Boolean)}
  let shared_connections=null;if(viewerId&&viewerId!==id&&prefAllows(viewerId,id,pref.shared_connections_visibility||'network')){const sharedCommunities=prefAllows(viewerId,id,pref.memberships_visibility||'private')?db.prepare(`SELECT c.id,c.name,c.icon,c.type FROM memberships a JOIN memberships b ON b.community_id=a.community_id JOIN communities c ON c.id=a.community_id WHERE a.user_id=? AND b.user_id=? AND (c.visibility='public' OR EXISTS(SELECT 1 FROM memberships vm WHERE vm.community_id=c.id AND vm.user_id=?)) ORDER BY c.name LIMIT 20`).all(viewerId,id,viewerId).filter(c=>canViewScope(viewerId,'community',c.id)):null;const sharedTopics=prefAllows(viewerId,id,pref.interests_visibility||'network')?db.prepare(`SELECT t.name FROM user_topics a JOIN user_topics b ON b.topic_id=a.topic_id JOIN topics t ON t.id=a.topic_id WHERE a.user_id=? AND b.user_id=? ORDER BY t.name LIMIT 20`).all(viewerId,id).map(x=>({id:x.name,name:x.name})):null;const sharedPeople=db.prepare(`SELECT CASE WHEN f1.user_a=? THEN f1.user_b ELSE f1.user_a END id FROM user_friendships f1 JOIN user_friendships f2 ON (CASE WHEN f1.user_a=? THEN f1.user_b ELSE f1.user_a END)=(CASE WHEN f2.user_a=? THEN f2.user_b ELSE f2.user_a END) WHERE (f1.user_a=? OR f1.user_b=?) AND (f2.user_a=? OR f2.user_b=?) AND f1.status='accepted' AND f2.status='accepted' LIMIT 20`).all(viewerId,viewerId,id,viewerId,viewerId,id,id).filter(x=>{const prefs=db.prepare('SELECT profile_visibility,shared_connections_visibility FROM user_preferences WHERE user_id=?').get(x.id);return prefAllows(viewerId,x.id,prefs?.profile_visibility||'network')&&prefAllows(viewerId,x.id,prefs?.shared_connections_visibility||'network')}).map(x=>publicUserBase(x.id)).filter(Boolean).map(x=>({id:x.id,name:x.name,avatar:x.avatar,profile_image:x.profile_image}));shared_connections={communities:sharedCommunities,topics:sharedTopics,people:sharedPeople}}
  const posts=canShowCreated?feedPosts(viewerId).filter(p=>p.author_id===id).slice(0,20):null;
  const shared=viewerId&&viewerId!==id?firstSharedCommunity(viewerId,id):null;
  const profile_activity=profileActivityForUser(id,viewerId);
  return {...base,place,preferences_public:{allow_followers:!!pref.allow_followers},interests,memberships,follows,followed_topics,created,event_attendance,shared_connections,profile_activity,posts,following:isFollowing(viewerId,'person',id),friendship:friendshipRelation(viewerId,id),shared_context:!!shared,report_scope:shared?{type:'community',id:shared.id,name:shared.name}:null};
}
function listPeople(viewerId=null){return db.prepare("SELECT id FROM users WHERE COALESCE(account_status,'active')='active' ORDER BY name").all().map(x=>userProfile(x.id,viewerId)).filter(Boolean).map(p=>({id:p.id,name:p.name,avatar:p.avatar,trust_level:p.trust_level,bio:p.bio,place:p.place,profile_image:p.profile_image,interests:p.interests,following:p.following,friendship:p.friendship,shared_context:p.shared_context,report_scope:p.report_scope,allow_followers:p.preferences_public.allow_followers}));}
function getUserSafe(id){const u=db.prepare('SELECT id,name,email,avatar,trust_level,bio,place_id,created_at FROM users WHERE id=?').get(id)||null;if(!u)return null;u.profile_image=mediaOne('user',u.id,'avatar');u.place=u.place_id?db.prepare('SELECT id,name,icon FROM places WHERE id=?').get(u.place_id)||null:null;u.interests=db.prepare('SELECT t.name FROM user_topics ut JOIN topics t ON t.id=ut.topic_id WHERE ut.user_id=? ORDER BY t.name').all(u.id).map(x=>x.name);u.preferences=db.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(u.id)||null;return u;}
function feedPosts(userId=null, communityId=null, personalized=false){
  let sql=`SELECT p.*,u.name author_name,u.avatar author_avatar,c.name community_name,c.icon community_icon FROM posts p JOIN users u ON u.id=p.author_id JOIN communities c ON c.id=p.community_id WHERE NOT EXISTS (SELECT 1 FROM moderation_content_state ms WHERE ms.target_type='post' AND ms.target_id=p.id AND ms.state IN ('hidden','removed'))`;
  const args=[];
  // Privacy invariant: a feed item can never be more visible than its owning Community.
  if(userId){sql+=` AND (c.visibility='public' OR c.created_by=? OR EXISTS (SELECT 1 FROM memberships vm WHERE vm.community_id=c.id AND vm.user_id=?))`;args.push(userId,userId);}
  else sql+=` AND c.visibility='public'`;
  if(communityId){sql+=' AND p.community_id=?';args.push(communityId);}
  else if(personalized&&userId){
    sql+=` AND p.community_id IN (
      SELECT community_id FROM memberships WHERE user_id=?
      UNION SELECT target_id FROM user_follows WHERE user_id=? AND target_type='community'
      UNION SELECT cp.community_id FROM community_places cp JOIN user_follows uf ON uf.target_type='place' AND uf.target_id=cp.place_id WHERE uf.user_id=?
      UNION SELECT ct.community_id FROM community_topics ct JOIN topics t ON t.id=ct.topic_id JOIN user_follows uf ON uf.target_type='topic' AND uf.target_id=t.name WHERE uf.user_id=?
    )`;
    args.push(userId,userId,userId,userId);
  }
  sql+=' ORDER BY datetime(p.created_at) DESC';
  return db.prepare(sql).all(...args).filter(p=>canViewScope(userId,'community',p.community_id)).map(p=>({...p,media:mediaFor('post',p.id,'attachment'),comments:db.prepare("SELECT cm.*,u.name author_name,u.avatar author_avatar FROM comments cm JOIN users u ON u.id=cm.author_id WHERE cm.post_id=? AND NOT EXISTS (SELECT 1 FROM moderation_content_state ms WHERE ms.target_type='comment' AND ms.target_id=cm.id AND ms.state IN ('hidden','removed')) ORDER BY datetime(cm.created_at)").all(p.id).map(cm=>({...cm,media:mediaFor('comment',cm.id,'attachment')}))}));
}
function pollsForCommunity(communityId,userId=null){
  return db.prepare('SELECT p.*,u.name author_name FROM polls p JOIN users u ON u.id=p.author_id WHERE p.community_id=? ORDER BY datetime(p.created_at) DESC').all(communityId).map(p=>({
    ...p,
    options:db.prepare(`SELECT o.id,o.label,COUNT(v.user_id) votes,MAX(CASE WHEN v.user_id=? THEN 1 ELSE 0 END) voted FROM poll_options o LEFT JOIN poll_votes v ON v.option_id=o.id WHERE o.poll_id=? GROUP BY o.id,o.label ORDER BY o.rowid`).all(userId||'',p.id)
  }));
}
function federatedItemsForCommunity(communityId){
  try{return db.prepare(`SELECT ro.object_uri,ro.object_type,ro.actor_uri,ro.origin_host,ro.in_reply_to,ro.content_text,ro.published_at,ro.moderation_state,ro.lifecycle_state,sro.relation_kind,sro.received_at,c.name community_name,c.icon community_icon
    FROM federation_space_remote_objects sro JOIN federation_remote_objects ro ON ro.object_uri=sro.object_uri
    JOIN communities c ON c.id=sro.local_space_id
    WHERE sro.local_space_id=? AND ro.lifecycle_state='active' AND ro.moderation_state='active'
    ORDER BY datetime(COALESCE(NULLIF(ro.published_at,''),sro.received_at)) DESC LIMIT 100`).all(communityId).map(x=>({
      ...x,item_origin:'fediverse',item_kind:x.relation_kind==='reply'?'reply':'post',body:x.content_text,created_at:x.published_at||x.received_at,remote_media:remoteMediaForObject(db,x.object_uri),
      federation_peer_policy:effectivePolicy(db,{host:x.origin_host,spaceId:communityId}).policy
    }))}catch{return []}
}
function localFeedItems(userId=null,communityId=null,personalized=false){
  return feedPosts(userId,communityId,personalized).map(p=>({...p,item_origin:'local',item_kind:'post'}));
}
function unifiedFeed(userId=null,communityId=null,personalized=false,limit=100){
  const local=localFeedItems(userId,communityId,personalized);
  let remote=[];
  if(communityId){
    remote=federatedItemsForCommunity(communityId);
  }else{
    const visible=listCommunities(userId).filter(c=>{
      if(!personalized||!userId)return c.visibility==='public';
      if(c.membership||c.created_by===userId||isFollowing(userId,'community',c.id))return true;
      const placeFollow=db.prepare(`SELECT 1 FROM community_places cp JOIN user_follows uf ON uf.target_type='place' AND uf.target_id=cp.place_id WHERE cp.community_id=? AND uf.user_id=? LIMIT 1`).get(c.id,userId);
      const topicFollow=db.prepare(`SELECT 1 FROM community_topics ct JOIN topics t ON t.id=ct.topic_id JOIN user_follows uf ON uf.target_type='topic' AND uf.target_id=t.name WHERE ct.community_id=? AND uf.user_id=? LIMIT 1`).get(c.id,userId);
      return !!(placeFollow||topicFollow);
    });
    remote=visible.flatMap(c=>federatedItemsForCommunity(c.id));
  }
  return [...local,...remote].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,Math.max(1,limit));
}
function communityDetail(id,userId=null){
  const row=db.prepare('SELECT * FROM communities WHERE id=?').get(id); if(!row)return null;
  const isMember=!!(userId&&db.prepare('SELECT 1 FROM memberships WHERE community_id=? AND user_id=?').get(id,userId));
  if(!canViewCommunityRow(row,userId)) return null;
  const base=communitySummary(row,userId);
  const parentRow=row.parent_id?db.prepare('SELECT * FROM communities WHERE id=?').get(row.parent_id):null;
  const parentSummary=parentRow?communitySummary(parentRow,userId):null;
  const parent=parentRow&&canViewCommunityRow(parentRow,userId)?parentSummary:null;
  const children=db.prepare('SELECT * FROM communities WHERE parent_id=? ORDER BY name').all(id).filter(c=>canViewCommunityRow(c,userId)&&(c.visibility==='public'||(userId&&(c.created_by===userId||isCommunityMember(userId,c.id))))).map(r=>communitySummary(r,userId));
  const eventItems=listEvents(userId).filter(e=>visibleInSpace(e.owner_space_id,id,e.propagation_scope)||(e.communities.some(c=>c.id===id)&&!e.owner_space_id)).map(e=>({...e,origin_space:originFor(e.owner_space_id,id)}));
  const projectItems=listProjects(userId).filter(p=>visibleInSpace(p.owner_space_id,id,p.propagation_scope)||(p.communities.some(c=>c.id===id)&&!p.owner_space_id)).map(p=>({...p,origin_space:originFor(p.owner_space_id,id)}));
  const participation=listParticipation(userId).filter(x=>visibleInSpace(x.owner_space_id,id,x.propagation_scope)||(x.communities.some(c=>c.id===id)&&!x.owner_space_id)).map(x=>({...x,origin_space:originFor(x.owner_space_id,id)}));
  const polls=pollsForCommunity(id,userId);
  const members=isMember?db.prepare(`SELECT u.id,u.name,u.avatar,u.trust_level,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.community_id=? ORDER BY CASE m.role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,u.name`).all(id).map(u=>({...u,role:permissionService.roleFor(u.id,'community',id)})):[];
  const posts=feedPosts(userId,id),federated_items=federatedItemsForCommunity(id);const authz=scopeCapabilities(userId,'community',id);return {...base,authz,parent,children,posts,federated_items,feed_items:unifiedFeed(userId,id,false,150),events:eventItems,projects:projectItems,participation,polls,members};
}
function bootstrap(userId=null){const memberships=userId?db.prepare(`SELECT m.community_id,m.role,m.created_at,c.name,c.icon,c.type FROM memberships m JOIN communities c ON c.id=m.community_id WHERE m.user_id=? ORDER BY c.name`).all(userId).map(m=>({...m,role:permissionService.roleFor(userId,'community',m.community_id)})):[];const notification_count=userId?db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL').get(userId).n:0;const following=followsForUser(userId);const friendships=friendshipNetwork(userId);return {notification_count,places:db.prepare('SELECT * FROM places').all(),topics:db.prepare('SELECT name FROM topics ORDER BY name').all().map(x=>x.name),communities:listCommunities(userId),events:listEvents(userId),projects:listProjects(userId),participation:listParticipation(userId),people:listPeople(userId),feed:unifiedFeed(userId,null,!!userId,40),following,friendships,memberships,user:userId?getUserSafe(userId):null};}

module.exports={db,canViewScope,canViewCommunityRow,ensureTopic,bootstrap,communityDetail,eventDetail,projectDetail,participationDetail,getUserSafe,userProfile,listPeople,verifyPassword,hashPassword,mediaFor,mediaOne,followsForUser,isFollowing,friendshipPair,friendshipRelation,friendshipNetwork,firstSharedCommunity,profileActivityTarget,profileActivityForUser,prefAllows,stricterVisibility,visibilityLabel,ensureObjectModules,modulesForObject,tasksForObject,canViewEventRow,canRequestEventAttendance,hasApprovedEventAttendance,canViewProjectRow,canViewParticipation,participationCanInteract,canRequestParticipationAccess,listParticipation,listProjects,listEvents};

