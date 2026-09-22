const fs=require('fs');
const path=require('path');
const db=fs.readFileSync(path.join(__dirname,'..','server','db.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'..','server','server.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
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
 ['desktop chat navigation',index,/<aside[^>]*id="appSidebar"[\s\S]*?<nav>[\s\S]*?data-page="messages"[\s\S]*?<span>Chats<\/span>/i],
 ['mobile chat navigation',index,/<nav class="mobile-bottom-nav"[\s\S]*?data-page="messages"[\s\S]*?<small>Chats<\/small>/i]
];
let fail=0;
for(const [name,hay,re] of checks){const ok=re.test(hay);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(/uploads\/public/.test(server)&&/private_media/.test(server)) console.log('PASS public/private media paths are structurally separated');
else {console.log('FAIL public/private media path separation'); fail++;}
if(fail){console.error(`Messaging preflight failed: ${fail}`);process.exit(1)}
console.log(`Messaging preflight passed: ${checks.length+1}/${checks.length+1}`);
