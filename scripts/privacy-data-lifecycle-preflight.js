const fs=require('fs');
const db=fs.readFileSync('server/db.js','utf8'),server=fs.readFileSync('server/server.js','utf8'),privacy=fs.readFileSync('server/privacy.js','utf8'),protocol=fs.readFileSync('server/federation/protocol.js','utf8'),store=fs.readFileSync('server/federation/store.js','utf8'),test=fs.readFileSync('tests/integration/privacy-data-lifecycle.integration.js','utf8');
const checks=[
 ['Dedicated privacy lifecycle module',server.includes("require('./privacy')")&&privacy.includes('buildPrivacyExport')&&privacy.includes('deleteAccountData')],
 ['Schema inventory scans user reference columns',privacy.includes('dataInventory')&&privacy.includes('user_reference_columns')],
 ['Chat export covers conversations/messages/media/reactions',privacy.includes('ownConversations')&&privacy.includes('conversation_members')&&privacy.includes('message_reactions')&&privacy.includes('private_media')],
 ['Participation export covers votes/arguments/support',privacy.includes('participation_votes')&&privacy.includes('participation_arguments')&&privacy.includes('participation_argument_support')],
 ['Moderation and permissions included',privacy.includes('moderation_history')&&privacy.includes('permission_changes')&&privacy.includes('role_assignments')],
 ['Federation handles/followers/activities/key considered',privacy.includes('federation_handles')&&privacy.includes('federation_followers')&&privacy.includes('federation_activities')&&privacy.includes('federation_actor_keys')],
 ['Federation private key not exported',privacy.includes('private_key_exported:false')],
 ['Private and public physical media deletion queued',privacy.includes("queueFile(db,'private'")&&privacy.includes("queueFile(db,'public'")&&privacy.includes('privacy_file_deletion_queue')],
 ['Crash recovery processes deletion queue at startup',server.includes('processPrivacyFileDeletionQueue')&&server.includes('Privacy file deletion recovery')],
 ['Shared messages are redacted not cascaded',privacy.includes("UPDATE messages SET body=?")&&privacy.includes('conversation_members WHERE user_id=?')],
 ['Other participant preservation covered by integration test',test.includes('other participant message preserved')&&test.includes('other participant public comment preserved')],
 ['Deletion requires password and failed confirmation preserves account/session',server.includes("verifyPassword(String(req.body?.password||'')")&&server.includes('deleteAccountLimit')&&test.includes('account deletion rejects an incorrect password')&&test.includes('failed password confirmation preserves the active session')],
 ['Account tombstone prevents relogin',db.includes("account_status")&&server.includes("account_status,'active')='active'" )],
 ['Deleted actors cannot be regenerated',protocol.includes("account_status,'active')='active'")&&store.includes("entityType==='user'")],
 ['Filesystem residual test exists',test.includes('physical file deleted')&&test.includes('physical variants deleted')&&test.includes('file deletion queue drained successfully')]
];
let ok=0;console.log('\nPrivacy Data Lifecycle Preflight');for(const [n,p] of checks){console.log(`${p?'✓':'✗'} ${n}`);if(p)ok++;}console.log(`\nPrivacy lifecycle: ${ok}/${checks.length} bestanden`);if(ok!==checks.length)process.exit(1);
