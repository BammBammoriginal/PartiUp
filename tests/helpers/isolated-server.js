const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Scenarios that need additional visible logins run against their own server
// process: own database, own rate-limit counters, production limits unchanged.
// Same approach as the account transition scenario (tests/helpers/account-transition.js).
async function startIsolatedServer(prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `partiup-${prefix}-`));
  const port = 34500 + Math.floor(Math.random() * 1000);
  const baseURL = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server/server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), BIND_HOST: '127.0.0.1', BUP_DB_PATH: path.join(directory, 'test.db'), BUP_SEED_DEMO: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  server.on('error', error => { output += error.message; });

  async function stop() {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await new Promise(resolve => {
        const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 2500);
        server.once('exit', () => { clearTimeout(timer); resolve(); });
      });
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(baseURL + '/api/health')).ok) return { baseURL, stop }; } catch {}
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await stop();
  throw new Error('Isolated test server did not start: ' + output.slice(-3000));
}

module.exports = { startIsolatedServer };
