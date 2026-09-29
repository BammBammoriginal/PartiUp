const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const port = 34000 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const dbPath = path.join(process.cwd(), 'data', `registration-${process.pid}-${Date.now()}.db`);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'test', PORT: String(port), BIND_HOST: '127.0.0.1', BUP_DB_PATH: dbPath },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverOut = '';
server.stdout.on('data', chunk => { serverOut += chunk; });
server.stderr.on('data', chunk => { serverOut += chunk; });
const failures = [];
function check(label, ok) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failures.push(label);
}
function jar() { return { cookies: new Map(), csrf: '' }; }
function absorb(j, response) {
  const values = response.headers.getSetCookie?.() || [response.headers.get('set-cookie')].filter(Boolean);
  for (const raw of values) {
    const first = raw.split(';', 1)[0];
    const at = first.indexOf('=');
    if (at > 0) j.cookies.set(first.slice(0, at), first.slice(at + 1));
  }
}
async function call(j, method, endpoint, data, extraHeaders = {}, form = false) {
  const headers = { ...extraHeaders };
  if (data !== undefined) headers['Content-Type'] = form ? 'application/x-www-form-urlencoded' : 'application/json';
  if (j) {
    headers.Cookie = [...j.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (j.csrf) headers['X-BUP-CSRF'] = j.csrf;
  }
  const response = await fetch(base + endpoint, {
    method, headers,
    body: data === undefined ? undefined : form ? new URLSearchParams(data) : JSON.stringify(data)
  });
  if (j) absorb(j, response);
  const result = await response.json();
  if (result.csrf && j) j.csrf = result.csrf;
  return { status: response.status, data: result };
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not start: ' + serverOut);
}
async function newJar() {
  const j = jar();
  await call(j, 'GET', '/api/security/csrf');
  return j;
}
(async () => {
  try {
    await ready();
    const first = await newJar();
    const second = await newJar();
    const p = 'Sicheres-Testpasswort-2026';
    const one = await call(first, 'POST', '/api/register', { name: 'Nora', email: 'NORA@EXAMPLE.TEST', password: p });
    const two = await call(second, 'POST', '/api/register', { name: 'Tarek', email: 'tarek@example.test', password: p });
    check('Two accounts register through the public API', one.status === 201 && two.status === 201 && one.data.user.id !== two.data.user.id);
    check('Registration rotates CSRF and creates distinct sessions', !!first.cookies.get('bup_session') && !!second.cookies.get('bup_session') && first.cookies.get('bup_session') !== second.cookies.get('bup_session') && one.data.csrf === first.csrf);
    const database = new Database(dbPath, { readonly: true });
    const row = database.prepare('SELECT * FROM users WHERE id=?').get(one.data.user.id);
    const pref = database.prepare('SELECT * FROM user_preferences WHERE user_id=?').get(one.data.user.id);
    check('Password is salted and never persisted as plaintext', row.password_hash !== p && row.password_salt && row.password_hash === crypto.scryptSync(p, row.password_salt, 64).toString('hex'));
    check('Email is normalized and trust starts at level one', row.email === 'nora@example.test' && row.trust_level === 1);
    check('New account has restricted visibility and messaging', pref.profile_visibility !== 'public' && pref.dm_permission === 'members' && pref.group_invites === 'members');
    database.close();
    const anonymous = await call(null, 'GET', '/api/users/' + one.data.user.id);
    check('Anonymous visitors cannot open a new private profile', anonymous.status === 404);
    const third = await newJar();
    const duplicate = await call(third, 'POST', '/api/register', { name: 'Other', email: 'Nora@example.test', password: p });
    check('Case-insensitive duplicate email is rejected without revealing the address', duplicate.status === 409 && !JSON.stringify(duplicate.data).includes('nora@example.test'));
    const weak = await call(third, 'POST', '/api/register', { name: 'Other', email: 'other@example.test', password: 'short' });
    check('Weak password is rejected', weak.status === 400);
    const missing = await newJar();
    missing.csrf = '';
    const noCsrf = await call(missing, 'POST', '/api/register', { name: 'Eve', email: 'eve@example.test', password: p });
    check('Missing CSRF token is rejected', noCsrf.status === 403);
    const hostile = await newJar();
    const crossFetch = await call(hostile, 'POST', '/api/register', { name: 'Eve', email: 'eve@example.test', password: p }, { Origin: 'https://attacker.invalid', 'Sec-Fetch-Site': 'cross-site' });
    check('Cross-site fetch is rejected', crossFetch.status === 403);
    const crossForm = await call(hostile, 'POST', '/api/register', { name: 'Eve', email: 'eve@example.test', password: p }, { Origin: 'https://attacker.invalid' }, true);
    check('Cross-site form POST is rejected', crossForm.status === 403);
    const protectedSession = await call(first, 'POST', '/api/register', { name: 'Again', email: 'again@example.test', password: p });
    check('Authenticated account cannot register over an existing session', protectedSession.status === 409);
    const over = await call(third, 'POST', '/api/register', { name: 'Eve', email: 'eve@example.test', password: p });
    check('Registration has a separate bounded rate limit', over.status === 429);
    const beforeLogout = first.cookies.get('bup_session');
    const logout = await call(first, 'POST', '/api/logout', {});
    const login = await call(first, 'POST', '/api/login', { email: 'nora@example.test', password: p });
    check('Registered user can log out and log in with a rotated session', logout.status === 200 && login.status === 200 && first.cookies.get('bup_session') !== beforeLogout);
    if (failures.length) throw new Error(failures.join(', '));
    console.log('Registration integration: PASS');
  } catch (error) {
    console.error(error);
    console.error(serverOut);
    process.exitCode = 1;
  } finally {
    server.kill();
    for (const suffix of ['', '-wal', '-shm']) try { fs.unlinkSync(dbPath + suffix); } catch {}
  }
})();
