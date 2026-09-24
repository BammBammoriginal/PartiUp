const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const port = 33600 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const dbPath = path.join(process.cwd(), 'data', `gold-regressions-${process.pid}-${Date.now()}.db`);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
// Start with the historical four-type constraint so this suite also proves the
// in-place migration path, not only creation of a fresh database.
const legacyDb = new Database(dbPath);
legacyDb.exec(`CREATE TABLE user_follows (
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('community','place','topic','person')),
  target_id TEXT NOT NULL,
  notification_level TEXT NOT NULL DEFAULT 'feed' CHECK(notification_level IN ('feed','important','all','muted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,target_type,target_id)
)`);
legacyDb.close();
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    BIND_HOST: '127.0.0.1',
    BUP_DB_PATH: dbPath,
    BUP_SEED_DEMO: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOut = '';
server.stdout.on('data', chunk => { serverOut += chunk; });
server.stderr.on('data', chunk => { serverOut += chunk; });

function jar() {
  return { cookies: new Map(), csrf: null };
}

function absorbCookies(target, response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  for (const raw of values) {
    for (const part of String(raw).split(/,(?=\s*[^;=]+=[^;]+)/)) {
      const first = part.trim().split(';', 1)[0];
      const split = first.indexOf('=');
      if (split > 0) target.cookies.set(first.slice(0, split), first.slice(split + 1));
    }
  }
}

function cookieHeader(target) {
  return [...target.cookies].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function request(target, method, url, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (target) {
    const cookies = cookieHeader(target);
    if (cookies) headers.Cookie = cookies;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && target.csrf) headers['X-BUP-CSRF'] = target.csrf;
  }
  const response = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (target) absorbCookies(target, response);
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: response.status, data };
}

async function multipartRequest(target, url, { name = 'chat.png', mimeType = 'image/png', buffer = Buffer.from('not-an-image') } = {}) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mimeType }), name);
  const headers = { Accept: 'application/json' };
  const cookies = cookieHeader(target);
  if (cookies) headers.Cookie = cookies;
  if (target.csrf) headers['X-BUP-CSRF'] = target.csrf;
  const response = await fetch(base + url, { method: 'POST', headers, body: form });
  absorbCookies(target, response);
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: response.status, data };
}

async function login(email) {
  const target = jar();
  const token = await request(target, 'GET', '/api/security/csrf');
  target.csrf = token.data.csrf;
  const response = await request(target, 'POST', '/api/login', { email, password: 'demo123' });
  if (response.status !== 200) throw new Error(`Login failed for ${email}: ${response.status}`);
  target.csrf = response.data.csrf;
  return target;
}

async function waitReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(base + '/api/health')).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Test server did not become ready.\n${serverOut}`);
}

const failures = [];
function check(name, condition, detail = '') {
  console.log(`${condition ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures.push(name);
}

(async () => {
  try {
    await waitReady();
    const max = await login('max@bottomupparti.local');
    const anna = await login('anna@bottomupparti.local');

    const anonymousExport = await request(null, 'GET', '/api/privacy/export');
    check('Privacy export requires authentication', anonymousExport.status === 401, `HTTP ${anonymousExport.status}`);
    const privacyExport = await request(max, 'GET', '/api/privacy/export');
    check('Own privacy export is available', privacyExport.status === 200 && privacyExport.data?.account?.id === 'u-max', `HTTP ${privacyExport.status}`);
    const privacyJson = JSON.stringify(privacyExport.data || {});
    check('Privacy export excludes authentication and private-key secrets', !['password_hash','password_salt','session_token','csrf_token','private_key_pem'].some(key => privacyJson.includes(`"${key}"`)));

    const preview = await request(max, 'GET', '/api/profile-preview/network');
    check('Server-computed privacy preview works', preview.status === 200, `HTTP ${preview.status}`);

    await request(max, 'POST', '/api/friends/u-anna/request', {});
    const annaPending = await request(anna, 'GET', '/api/friends');
    const incomingMax = annaPending.data?.incoming?.find(person => person.id === 'u-max');
    check('Private-profile sender remains visible as an incoming friendship request', annaPending.status === 200 && !!incomingMax);
    check('Pending relationship exposes only decision identity, not private profile fields', !!incomingMax && ['id','name','avatar','trust_level','friendship','relationship_only'].every(k => k in incomingMax) && !['email','bio','place','interests','profile_image','memberships','created','shared_connections'].some(k => k in incomingMax));
    const hiddenMaxProfile = await request(anna, 'GET', '/api/users/u-max');
    check('Pending request does not unlock sender profile', hiddenMaxProfile.status === 404, `HTTP ${hiddenMaxProfile.status}`);
    await request(anna, 'POST', '/api/friends/u-max/accept', {});
    const profile = await request(max, 'GET', '/api/users/u-anna');
    check('Accepted friend profile with shared connections works', profile.status === 200, `HTTP ${profile.status}`);

    const maxNotices = await request(max, 'GET', '/api/notifications');
    const annaNotices = await request(anna, 'GET', '/api/notifications');
    check('Friend acceptance creates an unread notification for the requester', maxNotices.status === 200 && maxNotices.data.items.some(n => n.type === 'friend_accept' && !n.read_at));
    const annaNotice = annaNotices.data.items.find(n => n.type === 'friend_request');
    check('Friend request creates a private notification for the recipient', annaNotices.status === 200 && !!annaNotice);
    await request(max, 'POST', '/api/notifications/read', { id: annaNotice.id });
    const annaAfterForeignRead = await request(anna, 'GET', '/api/notifications');
    check('Another person cannot mark a private notification as read', annaAfterForeignRead.data.items.some(n => n.id === annaNotice.id && !n.read_at));
    await request(max, 'POST', '/api/notifications/read', { id: maxNotices.data.items.find(n => n.type === 'friend_accept').id });
    const maxAfterRead = await request(max, 'GET', '/api/bootstrap');
    check('Reading own notification updates the unread bootstrap count', maxAfterRead.status === 200 && maxAfterRead.data.notification_count === 0);

    await request(anna, 'POST', '/api/friends/u-lisa/request', {});
    const lisa = await login('lisa@bottomupparti.local');
    await request(lisa, 'POST', '/api/friends/u-anna/accept', {});
    const lisaPrivateRequest = await request(lisa, 'POST', '/api/friends/u-max/request', {});
    const lisaPrivateNetwork = await request(lisa, 'GET', '/api/friends');
    check('Outgoing request to hidden profile cannot enumerate its name', lisaPrivateRequest.status === 201 && lisaPrivateNetwork.data.outgoing.some(person => person.id === 'u-max' && person.name === 'Privates Profil' && !('bio' in person) && !('place' in person)));
    await request(lisa, 'DELETE', '/api/friends/u-max');
    const annaNetwork = await request(anna, 'GET', '/api/bootstrap');
    check('Confirmed friends may communicate without a shared community', (annaNetwork.data.message_recipients || []).some(person => person.id === 'u-lisa'));

    await request(max, 'POST', '/api/follows', { target_type: 'person', target_id: 'u-anna', notification_level: 'feed' });
    await request(anna, 'POST', '/api/follows', { target_type: 'person', target_id: 'u-max', notification_level: 'feed' });
    const imageConversation = await request(max, 'POST', '/api/messages/conversations', { type: 'direct', direct_user_id: 'u-anna' });
    check('Private image security fixture creates a real conversation', imageConversation.status === 201, `HTTP ${imageConversation.status}`);
    const invalidImage = await multipartRequest(max, `/api/messages/conversations/${imageConversation.data.id}/images`, { name: 'not-an-image.txt', mimeType: 'text/plain' });
    check('Unsupported private image type is rejected server-side', invalidImage.status === 400, `HTTP ${invalidImage.status}`);
    const auditBeforeBlock = new Database(dbPath, { readonly: true });
    const privateMediaBeforeBlock = auditBeforeBlock.prepare('SELECT COUNT(*) n FROM private_media WHERE owner_user_id=?').get('u-max').n;
    auditBeforeBlock.close();
    const blocked = await request(max, 'POST', '/api/users/u-anna/block', {});
    check('Blocking succeeds', blocked.status === 200, `HTTP ${blocked.status}`);

    const blockedImage = await multipartRequest(max, `/api/messages/conversations/${imageConversation.data.id}/images`, {
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOIdVv1H4QZYAwATi4JMbpSuiMAAAAASUVORK5CYII=', 'base64')
    });
    check('Blocking prevents private image messages just like text messages', blockedImage.status === 403, `HTTP ${blockedImage.status}`);
    const auditAfterBlock = new Database(dbPath, { readonly: true });
    const privateMediaAfterBlock = auditAfterBlock.prepare('SELECT COUNT(*) n FROM private_media WHERE owner_user_id=?').get('u-max').n;
    auditAfterBlock.close();
    check('Rejected blocked image creates no orphaned private media', privateMediaAfterBlock === privateMediaBeforeBlock);

    const maxState = await request(max, 'GET', '/api/bootstrap');
    const annaState = await request(anna, 'GET', '/api/bootstrap');
    const maxStillFollowsAnna = (maxState.data.following?.people || []).some(item => item.id === 'u-anna');
    const annaStillFollowsMax = (annaState.data.following?.people || []).some(item => item.id === 'u-max');
    check('Blocking removes both directions of person follows', !maxStillFollowsAnna && !annaStillFollowsMax);
    const blockedFollow = await request(anna, 'POST', '/api/follows', { target_type: 'person', target_id: 'u-max', notification_level: 'feed' });
    check('A blocked person cannot recreate a person follow', blockedFollow.status === 403, `HTTP ${blockedFollow.status}`);

    const maxBlocks = await request(max, 'GET', '/api/blocks');
    check('Own block management lists the blocked person', maxBlocks.status === 200 && maxBlocks.data.some(person => person.id === 'u-anna'));
    check('Block management exposes only minimal person data', maxBlocks.status === 200 && maxBlocks.data.every(person => !('email' in person) && !('bio' in person) && !('place_id' in person)));
    await request(anna, 'DELETE', '/api/users/u-max/block');
    const stillBlockedFollow = await request(anna, 'POST', '/api/follows', { target_type: 'person', target_id: 'u-max', notification_level: 'feed' });
    check('Blocked person cannot remove another user block', stillBlockedFollow.status === 403, `HTTP ${stillBlockedFollow.status}`);
    const unblocked = await request(max, 'DELETE', '/api/users/u-anna/block');
    check('Block owner can unblock the person', unblocked.status === 200, `HTTP ${unblocked.status}`);
    const maxBlocksAfter = await request(max, 'GET', '/api/blocks');
    check('Unblocked person disappears from own block management', maxBlocksAfter.status === 200 && !maxBlocksAfter.data.some(person => person.id === 'u-anna'));
    const maxAfterUnblock = await request(max, 'GET', '/api/bootstrap');
    check('Unblocking does not restore the removed person follow', !(maxAfterUnblock.data.following?.people || []).some(person => person.id === 'u-anna'));
    check('Unblocking does not restore the removed friendship', !(maxAfterUnblock.data.friendships?.friends || []).some(person => person.id === 'u-anna'));

    for (const [type, id] of [['event', 'ev1'], ['project', 'p1'], ['participation', 'pa3']]) {
      const followed = await request(max, 'POST', '/api/follows', { target_type: type, target_id: id, notification_level: 'feed' });
      check(`${type} uses the shared follow API`, followed.status === 201, `HTTP ${followed.status}`);
      check(`${type} is returned in its shared follow bucket`, (followed.data.following?.[type === 'participation' ? 'participation' : `${type}s`] || []).some(item => item.id === id));
    }

    const privateObjects = [
      ['event', await request(max, 'POST', '/api/events', { name: 'Private Follow Event', places: ['erl'], visibility: 'private', attendance_policy: 'invite' })],
      ['project', await request(max, 'POST', '/api/projects', { name: 'Private Follow Project', places: ['erl'], visibility: 'private', access_policy: 'invite' })],
      ['participation', await request(max, 'POST', '/api/participation', { name: 'Private Follow Participation', places: ['erl'], visibility: 'private', access_policy: 'invite' })]
    ];
    for (const [type, created] of privateObjects) {
      check(`private ${type} fixture was created`, created.status === 201, `HTTP ${created.status}`);
      const hiddenFollow = await request(anna, 'POST', '/api/follows', { target_type: type, target_id: created.data.id, notification_level: 'feed' });
      check(`invisible private ${type} cannot be followed or enumerated`, hiddenFollow.status === 404, `HTTP ${hiddenFollow.status}`);
    }

    if (failures.length) throw new Error(`${failures.length} Gold regression check(s) failed: ${failures.join(', ')}`);
    console.log('\nGold regression integration: PASS');
  } catch (error) {
    console.error(`\nGold regression integration FAILED\n${error.stack || error}\n\nServer output:\n${serverOut.slice(-6000)}`);
    process.exitCode = 1;
  } finally {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 2500);
        server.once('exit', () => { clearTimeout(timeout); resolve(); });
      });
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.rmSync(dbPath + suffix, { force: true }); } catch {}
    }
  }
})();
