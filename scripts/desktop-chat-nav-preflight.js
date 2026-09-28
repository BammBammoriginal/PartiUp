const fs=require('fs');
const path=require('path');
const index=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const smoke=fs.readFileSync(path.join(__dirname,'..','tests','e2e','smoke.desktop.spec.js'),'utf8');
const checks=[
 ['Desktop-Sidebar enthält Chats', /<aside[^>]*id="appSidebar"[\s\S]*?<nav>[\s\S]*?data-page="messages"[\s\S]*?<span>Chats<\/span>/i.test(index)],
 ['Mobile Bottom Navigation enthält Chats', /<nav class="mobile-bottom-nav"[\s\S]*?data-page="messages"[\s\S]*?<small>Chats<\/small>/i.test(index)],
 ['Messages-Seite existiert', /<section id="messages" class="page">/.test(index)],
 ['go(messages) lädt Unterhaltungen, gezieltes Öffnen lädt nur einmal', /if\(p==='messages'&&loadMessages\)loadConversations\(\)/.test(app)&&/go\('messages',\{loadMessages:false\}\);\s*await loadConversations\(\);\s*await openConversation\(c\.id\)/.test(app)],
 ['Desktop-Smoke testet messages', /'messages'/.test(smoke)]
];
let fail=0;
for(const [name,ok] of checks){console.log(`${ok?'OK':'FAIL'} ${name}`); if(!ok)fail++;}
if(fail){console.error(`${fail} Desktop-Chat-Navigationsprüfung(en) fehlgeschlagen`);process.exit(1)}
console.log(`Desktop-Chat-Nav-Preflight: ${checks.length}/${checks.length} bestanden.`);
