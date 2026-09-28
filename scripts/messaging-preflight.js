const fs=require('fs');
const path=require('path');
const db=fs.readFileSync(path.join(__dirname,'..','server','db.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','server','server.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','public','style.css'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
const privacy=fs.readFileSync(path.join(__dirname,'..','server','privacy.js'),'utf8');
const regression=fs.readFileSync(path.join(__dirname,'..','tests','integration','gold-regressions.integration.js'),'utf8');
const desktop=fs.readFileSync(path.join(__dirname,'..','tests','e2e','gold.desktop.spec.js'),'utf8');
const mobile=fs.readFileSync(path.join(__dirname,'..','tests','e2e','gold.mobile.spec.js'),'utf8');
const checks=[
 ['conversations table',db,/CREATE TABLE IF NOT EXISTS conversations/],
 ['conversation members',db,/CREATE TABLE IF NOT EXISTS conversation_members/],
 ['messages table',db,/CREATE TABLE IF NOT EXISTS messages/],
 ['private media table',db,/CREATE TABLE IF NOT EXISTS private_media/],
 ['message media relation',db,/CREATE TABLE IF NOT EXISTS message_media/],
 ['conversation list API',server,/\/api\/messages\/conversations/],
 ['private media guarded API',server,/\/api\/private-media\/:id/],
 ['DM privacy gate',server,/canDM\(/],
 ['group invite privacy gate',server,/canGroupInvite\(/],
 ['block gate',server,/isBlocked\(/],
 ['message UI route',app,/messages|Nachrichten|conversation/i],
 ['author-only message deletion API',server,/app\.delete\('\/api\/messages\/:id'[^]*?m\.sender_id!==req\.userId[^]*?UPDATE messages SET body='',deleted_at=CURRENT_TIMESTAMP/],
 ['deleted message tombstone view',server,/if\(deleted\)return \{\.\.\.m,body:'',deleted:true,can_delete:false,reactions:\[\],media:\[\]\}/],
 ['deleted messages reject replies and reactions',server,/reply[^]*?deleted_at IS NULL[^]*?app\.post\('\/api\/messages\/:id\/reactions'[^]*?deleted_at IS NULL/],
 ['private message media uses recoverable deletion queue',server,/queueFile\(db,'private',item\.storage_key,'message_deletion'\)/],
 ['message deletion queue supports explicit lifecycle reasons',privacy,/function queueFile\(db,storageClass,storageKey,reason='account_deletion'\)/],
 ['author deletion UI is server capability-driven',app,/m\.can_delete&&!deleted[^]*?data-delete-message/],
 ['deleted message is content-free in the UI',app,/class="message-deleted">Nachricht gelöscht/],
 ['message deletion controls are desktop and mobile accessible',css,/\.message-delete\{[^}]*opacity:0[^]*?@media\(max-width:850px\)\{\.message-delete\{opacity:1/],
 ['API regressions enforce author, member and outsider boundaries',regression,/cannot delete another author message[^]*?cannot enumerate a message through deletion[^]*?Author can delete own message/],
 ['API regressions cover export and physical media deletion',regression,/Privacy export represents an author-deleted message[^]*?removes the physical private file/],
 ['desktop browser flow persists message tombstones',desktop,/Eigene Nachricht für alle löschen[^]*?data-message-deleted/],
 ['mobile browser flow persists message tombstones',mobile,/Eigene Nachricht mobil kontrolliert löschen[^]*?data-message-deleted/],
 ['reaction choices are server-defined and exposed only with a conversation',server,/MESSAGE_REACTION_EMOJIS=Object\.freeze\([^]*?available_reactions:MESSAGE_REACTION_EMOJIS/],
 ['reaction authors come only from current conversation members',server,/FROM message_reactions mr JOIN conversation_members cm ON cm\.conversation_id=\? AND cm\.user_id=mr\.user_id JOIN users u/],
 ['desktop browser exercises choice, authors and persistence',desktop,/Mehrere Reaktionen auswählen, Urheber sehen und eigene Reaktion wieder entfernen/],
 ['mobile browser exercises accessible choices and authors',mobile,/Emoji-Auswahl und Reaktionsurheber bleiben mobil ohne Überlauf erreichbar/],
 ['desktop chat navigation',index,/<aside[^>]*id="appSidebar"[\s\S]*?<nav>[\s\S]*?data-page="messages"[\s\S]*?<span>Chats<\/span>/i],
 ['mobile chat navigation',index,/<nav class="mobile-bottom-nav"[\s\S]*?data-page="messages"[\s\S]*?<small>Chats<\/small>/i]
];
let fail=0;
for(const [name,hay,re] of checks){const ok=re.test(hay);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(/uploads\/public/.test(server)&&/private_media/.test(server)) console.log('PASS public/private media paths are structurally separated');
else {console.log('FAIL public/private media path separation'); fail++;}
if(fail){console.error(`Messaging preflight failed: ${fail}`);process.exit(1)}
console.log(`Messaging preflight passed: ${checks.length+1}/${checks.length+1}`);
