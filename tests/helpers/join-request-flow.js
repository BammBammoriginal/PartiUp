const { test, expect } = require('@playwright/test');
const { waitForApp, openIdentity, closeMobileDrawer, captureRuntimeFailures, assertNoHorizontalOverflow } = require('./gold');
const { startIsolatedServer } = require('./isolated-server');

// Two visible logins per run, so the scenario gets its own server and rate-limit counters.
async function loginAs(context, email, name) {
  const page = await context.newPage();
  const guard = captureRuntimeFailures(page);
  await waitForApp(page);
  await openIdentity(page);
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill('demo123');
  await page.locator('#login').click();
  await expect(page.locator('#userName')).toHaveText(name);
  if (await page.locator('.app').evaluate(el => el.classList.contains('menu-open'))) await closeMobileDrawer(page);
  return { page, guard };
}

module.exports = function registerJoinRequestFlow() {
  test.setTimeout(30_000);
  test('Beitrittsanfrage: anfragen, zurückziehen, aus der Benachrichtigung annehmen', async ({ browser, viewport }) => {
    const isolated = await startIsolatedServer('join-request');
    const contexts = [];
    const newContext = async () => { const c = await browser.newContext({ baseURL: isolated.baseURL, viewport, storageState: { cookies: [], origins: [] } }); contexts.push(c); return c; };
    try {
      const maxContext = await newContext();
      const max = await loginAs(maxContext, 'max@bottomupparti.local', 'Max');
      const csrf = (await (await maxContext.request.get('/api/security/csrf')).json()).csrf;
      const created = await maxContext.request.post('/api/communities', { headers: { 'X-BUP-CSRF': csrf }, data: { name: 'Freigabe-Runde QA', type: 'Community', places: ['erl'], topics: ['Demokratie'], visibility: 'public', join_policy: 'approval' } });
      expect(created.status()).toBe(201);
      const spaceId = (await created.json()).id;

      // Anna asks, withdraws through the pending button, and asks again.
      const anna = await loginAs(await newContext(), 'anna@bottomupparti.local', 'Anna');
      await anna.page.goto(`/#community/${spaceId}`);
      await expect(anna.page.locator('#community-space')).toHaveClass(/active/);
      await anna.page.getByRole('button', { name: 'Beitritt anfragen' }).click();
      const pending = anna.page.locator('#community-space summary', { hasText: 'Beitritt angefragt' });
      await expect(pending).toBeVisible();
      await pending.click();
      await anna.page.getByRole('button', { name: 'Beitrittsanfrage zurückziehen' }).click();
      await expect(anna.page.getByRole('button', { name: 'Beitritt anfragen' })).toBeVisible();
      await anna.page.getByRole('button', { name: 'Beitritt anfragen' }).click();
      await expect(pending).toBeVisible();
      await assertNoHorizontalOverflow(anna.page);

      // Max learns about it from the bell and decides in the place the notification opens.
      await max.page.reload();
      await waitForApp(max.page);
      await max.page.locator('#notificationButton').click();
      await max.page.getByRole('button', { name: /Neue Beitrittsanfrage/ }).first().click();
      await expect(max.page.locator('#modal')).not.toHaveClass(/show/);
      await expect(max.page.locator('#community-space')).toHaveClass(/active/);
      const approve = max.page.getByRole('button', { name: 'Anna aufnehmen' });
      await approve.scrollIntoViewIfNeeded();
      await approve.click();
      await expect(max.page.getByRole('button', { name: 'Anna aufnehmen' })).toHaveCount(0);
      await assertNoHorizontalOverflow(max.page);

      // Anna sees the result after reloading.
      await anna.page.reload();
      await waitForApp(anna.page);
      await anna.page.goto(`/#community/${spaceId}`);
      await expect(anna.page.locator('#community-space')).toHaveClass(/active/);
      await expect(anna.page.getByRole('button', { name: /^Mitglied · / })).toBeVisible();
      await expect(pending).toHaveCount(0);
      max.guard.assertClean();
      anna.guard.assertClean();
    } finally {
      for (const c of contexts) await c.close();
      await isolated.stop();
    }
  });
};
