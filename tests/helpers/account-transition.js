const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { waitForApp, openIdentity, closeMobileDrawer, fillObjectForm, openCreation, assertNoHorizontalOverflow, captureRuntimeFailures, loginAsMax, go } = require('./gold');

module.exports = function registerAccountTransition() {
  test.setTimeout(30_000);
  test('Verspätete Profilantwort darf den Wechsel zu Chats nicht rückgängig machen',async({page})=>{
    await loginAsMax(page);
    let release;const held=new Promise(resolve=>{release=resolve});
    await page.route('**/api/users/u-anna',async route=>{await held;await route.continue()});
    const requested=page.waitForRequest(r=>r.url().endsWith('/api/users/u-anna'));
    const response=page.waitForResponse(r=>r.url().endsWith('/api/users/u-anna'));
    try{
      await page.goto('/#person/u-anna');await requested;
      await go(page,'messages');
      await expect(page.locator('#messages')).toHaveClass(/active/);
      release();const loaded=await response;expect(loaded.status()).toBe(200);await loaded.finished();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await expect(page.locator('#messages')).toHaveClass(/active/);
      await expect(page.locator('#person-space')).not.toHaveClass(/active/);
      expect(await page.evaluate(()=>location.hash)).toBe('');
    }finally{release();await page.unroute('**/api/users/u-anna')}
  });
  test('Kontowechsel entfernt Verwaltung und private Ansichten; Anmeldung per Enter', async ({ browser, viewport }) => {
    // A fresh process gives this scenario its own database and normal rate limits.
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'partiup-account-transition-'));
    const port = 33000 + Math.floor(Math.random() * 1000);
    const baseURL = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ['server/server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test', PORT: String(port), BIND_HOST: '127.0.0.1', BUP_DB_PATH: path.join(directory, 'test.db'), BUP_SEED_DEMO: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '', context;
    server.stdout.on('data', data => { output += data; });
    server.stderr.on('data', data => { output += data; });
    server.on('error', error => { output += error.message; });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 80; attempt++) {
        try { if ((await fetch(baseURL + '/api/health')).ok) { ready = true; break; } } catch {}
        if (server.exitCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!ready) throw new Error('Isolated test server did not start: ' + output.slice(-3000));
      context = await browser.newContext({ baseURL, viewport, storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      const guard = captureRuntimeFailures(page);
      await waitForApp(page);
      await openIdentity(page);
      await page.locator('#showRegistration').click();
      const email = `transition-${Date.now()}@example.test`, password = 'Sicheres-Testpasswort-2026';
      await page.locator('#registerName').fill('Kontowechsel QA');
      await page.locator('#registerEmail').fill(email);
      await page.locator('#registerPassword').fill(password);
      await page.locator('#register').click();
      await expect(page.locator('#userName')).toHaveText('Kontowechsel QA');
      if (await page.locator('.app').evaluate(el => el.classList.contains('menu-open'))) await closeMobileDrawer(page);
      await openCreation(page, 'community');
      await fillObjectForm(page, 'community', `Private Übergabe ${Date.now()}`);
      await page.locator('#formVisibility').selectOption('private');
      await page.locator('#saveCreate').click();
      await expect(page.locator('#community-space')).toHaveClass(/active/);
      const gear = page.locator('[data-ctab="admin"]');
      await expect(gear).toBeVisible();
      await gear.click();
      await page.locator('[data-admin-jump="rights"]').click();
      await expect(page.locator('[data-permission-box]')).toContainText('Personen & Rollen');
      await assertNoHorizontalOverflow(page);
      // Provision only fixture membership; both accounts still log in visibly.
      const communityId=await page.evaluate(()=>decodeURIComponent(location.hash.split('/')[1]));
      const fixtureDb=new (require('better-sqlite3'))(path.join(directory,'test.db'));
      fixtureDb.prepare("INSERT INTO memberships(community_id,user_id,role) VALUES (?,'u-max','member')").run(communityId);
      fixtureDb.close();
      const csrf=(await (await context.request.get('/api/security/csrf')).json()).csrf;
      const granted=await context.request.put(`/api/permissions/community/${communityId}/overrides`,{headers:{'X-BUP-CSRF':csrf},data:{role:'member',permission:'space.edit_profile',effect:'allow'}});
      expect(granted.status()).toBe(200);
      const eventResponse=await context.request.post('/api/events',{headers:{'X-BUP-CSRF':csrf},data:{name:'Editor event QA',places:['erl'],owner_space_id:communityId,communities:[communityId],start_at:'2026-10-20T18:00:00+02:00',end_at:'2026-10-20T20:00:00+02:00'}});
      expect(eventResponse.status()).toBe(201);const editorEvent=await eventResponse.json();
      const eventGrant=await context.request.put(`/api/permissions/event/${editorEvent.id}/overrides`,{headers:{'X-BUP-CSRF':csrf},data:{role:'member',permission:'space.edit_profile',effect:'allow'}});
      expect(eventGrant.status()).toBe(200);
      const editorContext=await browser.newContext({baseURL,viewport,storageState:{cookies:[],origins:[]}});
      try{
        const editor=await editorContext.newPage(),editorGuard=captureRuntimeFailures(editor);
        await waitForApp(editor);await openIdentity(editor);
        await editor.locator('#loginEmail').fill('max@bottomupparti.local');
        await editor.locator('#loginPassword').fill('demo123');await editor.locator('#login').click();
        await expect(editor.locator('#userName')).toHaveText('Max');
        await editor.goto(`/#community/${communityId}/admin`);
        await expect(editor.locator('#community-space')).toHaveClass(/active/);
        await expect(editor.locator('#communityLogoInput').locator('..')).toBeVisible();
        await expect(editor.locator('#saveSpaceModules')).toHaveCount(0);
        await expect(editor.locator('#saveCommunityAccess')).toHaveCount(0);
        await expect(editor.locator('#spaceExtensions')).toHaveCount(0);
        await editor.locator('[data-admin-jump="setup"]').click();
        await expect(editor.locator('#saveSpaceProfile')).toBeVisible();
        await expect(editor.locator('#finishSpaceSetup')).toHaveCount(0);
        await editor.locator('[data-ctab="events"]').click();
        await editor.locator(`#communitySpaceContent [data-event="${editorEvent.id}"]`).first().click();
        await expect(editor.locator('#objectImageInput')).toHaveCount(0);
        await editor.locator('[data-otab="admin"]').click();
        await expect(editor.locator('#objectImageInput').locator('..')).toBeVisible();
        await expect(editor.locator('#saveEventSchedule')).toBeVisible();
        await expect(editor.locator('#saveEventFederation')).toHaveCount(0);
        await expect(editor.locator('#saveObjectModules')).toHaveCount(0);
        await assertNoHorizontalOverflow(editor);editorGuard.assertClean();
      }finally{await editorContext.close()}

      await openIdentity(page);
      await page.locator('#logout').click();
      await expect(page.locator('#userName')).toHaveText('Nicht angemeldet');
      await expect(page.locator('#home')).toHaveClass(/active/);
      await expect(page.locator('#communitySpaceContent')).toBeEmpty();
      await expect(page.locator('#modalContent')).toBeEmpty();
      expect(await page.evaluate(() => location.hash)).toBe('');
      await openIdentity(page);
      await page.locator('#loginEmail').fill(email);
      const input = page.locator('#loginPassword');
      await input.focus();
      await input.press('ControlOrMeta+A');
      await input.press('Backspace');
      await expect(input).toHaveValue('');
      await input.fill(password);
      await input.press('Enter');
      await expect(page.locator('#userName')).toHaveText('Kontowechsel QA');
      await expect(page.locator('#home')).toHaveClass(/active/);
      await expect(page.locator('#communitySpaceContent')).toBeEmpty();
      guard.assertClean();
    } finally {
      try { if (context) await context.close(); }
      finally {
        if (server.exitCode === null) {
          server.kill('SIGTERM');
          await new Promise(resolve => {
            const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 2500);
            server.once('exit', () => { clearTimeout(timer); resolve(); });
          });
        }
        fs.rmSync(directory, { recursive: true, force: true });
      }
    }
  });
};
