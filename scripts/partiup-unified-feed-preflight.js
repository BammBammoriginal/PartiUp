'use strict';
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const db=fs.readFileSync(path.join(root,'server','db.js'),'utf8');
const pkg=require(path.join(root,'package.json'));
const checks=[
 ['Version >= 0.11',(()=>{const [a,b]=String(pkg.version||'0.0').split('.').map(Number);return a>0||b>=11})()],
 ['Unified feed server function',/function unifiedFeed\(/.test(db)],
 ['Bootstrap uses unified feed',/feed:unifiedFeed\(/.test(db)],
 ['Community exposes feed_items',/feed_items:unifiedFeed\(/.test(db)],
 ['Remote feed items normalized',/item_origin:'fediverse'/.test(db)&&/item_kind:/.test(db)],
 ['Local feed items normalized',/item_origin:'local'/.test(db)],
 ['Remote peer trust attached',/federation_peer_policy:effectivePolicy/.test(db)],
 ['Remote items scoped to visible communities',/visible=listCommunities\(userId\)/.test(db)],
 ['Unified feed renderer',/function renderUnifiedFeed\(/.test(app)],
 ['Space unified feed renderer',/function renderSpaceUnifiedFeed\(/.test(app)],
 ['Source filters Alle PartiUp Fediverse',/data-feed-origin="all"/.test(app)&&/data-feed-origin="local"/.test(app)&&/data-feed-origin="fediverse"/.test(app)],
 ['Remote provenance shown',/Fediverse ·/.test(app)&&/origin_host/.test(app)],
 ['Remote trust badge shown',/function peerTrustBadge\(/.test(app)],
 ['No separate Fediverse feed box',!/<h3>Aus dem Fediverse<\/h3>/.test(app)],
 ['Local post interactions preserved',/comment-form/.test(app)&&/data-save-post-fed/.test(app)],
 ['Remote moderation preserved',/data-remote-mod/.test(app)],
 ['Federated events carry trust metadata',/item_origin:r\.remote_uri\?'fediverse':'local'/.test(db)],
 ['Event cards show unified Fediverse provenance',/const fed=e\.item_origin==='fediverse'/.test(app)]
];
let pass=0;for(const [name,ok] of checks){console.log(`${ok?'✓':'✗'} ${name}`);if(ok)pass++;}
console.log(`\nP0.11 Unified Feed: ${pass}/${checks.length} bestanden`);if(pass!==checks.length)process.exit(1);
