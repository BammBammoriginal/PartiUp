const { test, expect } = require('@playwright/test');
const { waitForApp, assertNoHorizontalOverflow } = require('./gold');
const { startIsolatedServer } = require('./isolated-server');
const { loginAs } = require('./join-request-flow');

async function openNetworkEntry(page, name) {
  const link = page.getByRole('button', { name });
  // Mobile keeps 'Mein Netzwerk' in the drawer behind 'Mehr' (same rule as the go helper).
  if (await page.evaluate(() => matchMedia('(max-width: 850px)').matches)) {
    await page.locator('#mobileMore').click();
    await expect(page.locator('.app')).toHaveClass(/menu-open/);
  }
  await link.click();
  await expect(page.locator('#modal')).toHaveClass(/show/);
}

module.exports = function registerNetworkFlow() {
  test.setTimeout(30_000);
  test('Mein Netzwerk: gefolgte Bereiche vollständig, Pop-up schließt beim Öffnen, Autoren anklickbar', async ({ browser, viewport }) => {
    const isolated = await startIsolatedServer('network');
    const context = await browser.newContext({ baseURL: isolated.baseURL, viewport, storageState: { cookies: [], origins: [] } });
    try {
      const max = await loginAs(context, 'max@bottomupparti.local', 'Max');
      const csrf = (await (await context.request.get('/api/security/csrf')).json()).csrf;
      const asMax = (method, url, data) => context.request.fetch(url, { method, headers: { 'X-BUP-CSRF': csrf }, data });
      const boot = await (await context.request.get('/api/bootstrap')).json();
      const project = boot.projects[0], event = boot.events[0];
      const space = await (await asMax('POST', '/api/communities', { name: 'Netzwerk-Runde QA', type: 'Community', places: ['erl'], topics: ['Demokratie'], visibility: 'public', join_policy: 'open' })).json();
      await asMax('POST', `/api/communities/${space.id}/posts`, { body: 'Beitrag mit Autorenlink' });
      await asMax('DELETE', `/api/follows/community/${space.id}`);
      // A followed person must not count as a followed area.
      for (const [type, id] of [['project', project.id], ['event', event.id], ['community', space.id], ['person', 'u-anna']]) {
        expect((await asMax('POST', '/api/follows', { target_type: type, target_id: id, notification_level: 'feed' })).status()).toBe(201);
      }
      await max.page.reload();
      await waitForApp(max.page);

      // Every followed Space type is listed, and the count matches the list.
      await openNetworkEntry(max.page, /gefolgte Bereiche/);
      const modal = max.page.locator('#modalContent');
      await expect(modal.getByRole('heading', { name: 'Projekte' })).toBeVisible();
      await expect(modal.getByRole('button', { name: new RegExp(project.name) }).first()).toBeVisible();
      await expect(modal.getByRole('button', { name: new RegExp(event.name) }).first()).toBeVisible();
      const listed = await modal.locator('[data-follow-type]').count();
      await expect(max.page.locator('#followingCount')).toHaveText(String(listed));
      await assertNoHorizontalOverflow(max.page);

      // Opening an entry closes the pop-up and shows the Space.
      await modal.getByRole('button', { name: /Netzwerk-Runde QA/ }).click();
      await expect(max.page.locator('#modal')).not.toHaveClass(/show/);
      await expect(max.page.locator('#community-space')).toHaveClass(/active/);
      await expect(max.page.locator('#title')).toHaveText('Netzwerk-Runde QA');

      // The author name in the Space feed opens the profile.
      await max.page.locator('#community-space').getByRole('button', { name: 'Feed', exact: true }).first().click();
      const post = max.page.locator('#spaceUnifiedFeed article', { hasText: 'Beitrag mit Autorenlink' });
      await post.getByRole('button', { name: 'Max', exact: true }).click();
      await expect(max.page.locator('#person-space')).toHaveClass(/active/);
      await expect(max.page.locator('#person-space').getByRole('heading', { name: 'Max', exact: true })).toBeVisible();

      // Unfollowing in the pop-up updates the count.
      await openNetworkEntry(max.page, /gefolgte Bereiche/);
      const before = Number(await max.page.locator('#followingCount').textContent());
      await modal.locator(`[data-follow-type="project"][data-follow-id="${project.id}"]`).click();
      await expect(max.page.locator('#followingCount')).toHaveText(String(before - 1));
      max.guard.assertClean();
    } finally {
      await context.close();
      await isolated.stop();
    }
  });
};
