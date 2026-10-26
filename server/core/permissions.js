// One resource-scoped RBAC decision for HTTP actions and database projections.
// Existing roles and inheritance modes are preserved; assignments are read per request.
function createPermissionService(db){
function mustBeMember(userId,id){return db.prepare('SELECT role FROM memberships WHERE user_id=? AND community_id=?').get(userId,id)}
const PERMISSION_GROUPS={space:['space.view','space.edit_profile','space.configure_modules','space.manage_access','space.manage_roles','space.manage_members'],content:['content.create','content.comment','content.moderate','content.publish_external'],tasks:['task.view','task.create','task.update_own','task.update_all','task.self_assign','task.assign','task.delete'],events:['event.manage_participants'],participation:['participation.interact','participation.manage_access'],moderation:['moderation.review','moderation.act']};
const ALL_PERMISSIONS=Object.values(PERMISSION_GROUPS).flat();
const ROLE_DEFAULTS={owner:new Set(ALL_PERMISSIONS),admin:new Set(ALL_PERMISSIONS.filter(p=>p!=='space.manage_roles')),moderator:new Set(['space.view','content.create','content.comment','content.moderate','task.view','task.create','task.update_own','task.update_all','task.self_assign','task.assign','event.manage_participants','moderation.review','moderation.act']),member:new Set(['space.view','content.create','content.comment','task.view','task.create','task.update_own','task.self_assign','participation.interact']),guest:new Set(['space.view'])};
function scopeRow(type,id){if(type==='community')return db.prepare("SELECT id,created_by,NULL owner_space_id,'mapped' role_inheritance FROM communities WHERE id=?").get(id)||null;if(type==='project')return db.prepare('SELECT id,created_by,owner_space_id,role_inheritance FROM projects WHERE id=?').get(id)||null;if(type==='event')return db.prepare('SELECT id,created_by,owner_space_id,role_inheritance FROM events WHERE id=?').get(id)||null;if(type==='participation')return db.prepare('SELECT id,created_by,owner_space_id,role_inheritance FROM participation WHERE id=?').get(id)||null;return null}
function mappedLegacyRole(role){return role==='admin'?'admin':role==='moderator'?'moderator':role==='member'?'member':null}
function inheritedChildRole(userId,row){if(!row?.owner_space_id||row.role_inheritance==='none')return 'guest';const parent=roleFor(userId,'community',row.owner_space_id);if(parent==='guest')return 'guest';if(row.role_inheritance==='mapped')return parent==='owner'?'admin':parent;return 'member'}
function roleFor(userId,type,id){if(!userId)return 'guest';const existing=scopeRow(type,id);if(!existing)return 'guest';const explicit=db.prepare('SELECT role FROM role_assignments WHERE scope_type=? AND scope_id=? AND user_id=?').get(type,id,userId)?.role;if(explicit)return explicit;const row=scopeRow(type,id);if(!row)return 'guest';if(row.created_by===userId)return 'owner';if(type==='community')return mappedLegacyRole(mustBeMember(userId,id)?.role)||'guest';return inheritedChildRole(userId,row)}
function hasPermission(userId,type,id,permission){if(!scopeRow(type,id)||!ALL_PERMISSIONS.includes(permission))return false;const role=roleFor(userId,type,id);if(role==='owner')return true;const override=db.prepare('SELECT effect FROM permission_overrides WHERE scope_type=? AND scope_id=? AND role=? AND permission=?').get(type,id,role,permission)?.effect;if(override)return override==='allow';return ROLE_DEFAULTS[role]?.has(permission)||false}

function hasRoleContext(userId,type,id){
 const row=scopeRow(type,id);if(!row||!userId)return false;
 if(row.created_by===userId||db.prepare('SELECT 1 FROM role_assignments WHERE scope_type=? AND scope_id=? AND user_id=?').get(type,id,userId))return true;
 if(type==='community')return !!mustBeMember(userId,id);
 return !!(row.owner_space_id&&hasRoleContext(userId,'community',row.owner_space_id));
}
return {PERMISSION_GROUPS,ALL_PERMISSIONS,ROLE_DEFAULTS,scopeRow,roleFor,hasPermission,hasRoleContext};
}
module.exports={createPermissionService};
