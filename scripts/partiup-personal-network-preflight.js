const fs=require('fs');
const files={
 html:fs.readFileSync('public/index.html','utf8'),
 app:fs.readFileSync('public/app.js','utf8'),
 css:fs.readFileSync('public/style.css','utf8'),
 db:fs.readFileSync('server/db.js','utf8'),
 server:fs.readFileSync('server/server.js','utf8'),
 privacy:fs.readFileSync('server/privacy.js','utf8')
};
const checks=[
 ['Mein Netzwerk uses Freunde',files.html.includes('id="myFriendsLink"')&&files.html.includes('id="friendCount"')&&!files.html.includes('id="myCommunitiesLink"')],
 ['Memberships remain separate',files.html.includes('id="myMembershipsLink"')&&files.app.includes("personalNetworkModal('memberships')")],
 ['Follows remain separate',files.html.includes('id="myFollowingLink"')&&files.app.includes("personalNetworkModal('following')")],
 ['Friendship model is separate from follows',files.db.includes('CREATE TABLE IF NOT EXISTS user_friendships')&&files.db.includes('CREATE TABLE IF NOT EXISTS user_follows')],
 ['Canonical friendship pair',files.db.includes('function friendshipPair')&&files.db.includes('PRIMARY KEY(user_a,user_b)')],
 ['Friend request endpoint',files.server.includes("/api/friends/:id/request")&&files.server.includes("status='pending'")],
 ['Friend accept endpoint',files.server.includes("/api/friends/:id/accept")&&files.server.includes("status='accepted'")],
 ['Friend removal endpoint',files.server.includes("app.delete('/api/friends/:id'")],
 ['Blocking dissolves friendship',files.server.includes("DELETE FROM user_friendships WHERE user_a=? AND user_b=?")],
 ['Friend state on people/profile',files.db.includes('friendship:friendshipRelation(viewerId,id)')&&files.app.includes('friendshipLabel')],
 ['Friend network has profile/message/follow',files.app.includes('data-network-profile')&&files.app.includes('data-network-message')&&files.app.includes("followButton('person'")],
 ['Secondary safety menu',files.app.includes('network-more')&&files.app.includes('data-block-user')&&files.app.includes('data-report-target="user"')],
 ['No algorithmic recommendation layer',!files.app.includes('friendSuggestions')&&!files.server.includes('/api/friends/recommend')],
 ['Privacy export includes friendships',files.privacy.includes("friendships:rows(db,'SELECT * FROM user_friendships")],
 ['Account deletion removes friendships',files.privacy.includes("DELETE FROM user_friendships WHERE user_a=? OR user_b=?")],
 ['Mobile friend layout',files.css.includes('@media(max-width:700px)')&&files.css.includes('.friend-card-actions{display:grid')]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}console.log(`\nP0.12.1 Personal Network: ${checks.length-fail}/${checks.length}`);if(fail)process.exit(1);
