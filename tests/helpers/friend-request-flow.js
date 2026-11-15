const { test, expect } = require('@playwright/test');
const { waitForApp, assertNoHorizontalOverflow } = require('./gold');
const { startIsolatedServer } = require('./isolated-server');
const { loginAs } = require('./join-request-flow');

// A friendship request and the requester's profile are separate decisions:
// a private profile stays hidden (404), but the request itself can be
// answered right from the notification list.
async function csrfOf(context) {
  return (await (await context.request.get('/api/security/csrf')).json()).csrf;
}
async function makeProfilePrivate(context) {
  const response = await context.request.put('/api/preferences', {
    headers: { 'X-BUP-CSRF': await csrfOf(context) },
    data: { profile_visibility: 'private', dm_permission: 'all', group_invites: 'all', notify_comments: true, notify_mentions: true, notify_messages: true, notify_events: true }
  });
  expect(response.status()).toBe(200);
}
async function requestFriendship(context, targetId) {
  const response = await context.request.post(`/api/friends/${targetId}/request`, { headers: { 'X-BUP-CSRF': await csrfOf(context) } });
  expect(response.status()).toBe(201);
}
async function openBell(page) {
  await page.locator('#notificationButton').click();
  await expect(page.locator('.notification-list')).toBeVisible();
}

module.exports = registerFriendRequestFlow;
function registerFriendRequestFlow() {
  test.setTimeout(45_000);
  test('Freundschaftsanfrage aus der Benachrichtigung annehmen, ablehnen oder blockieren, ohne das private Profil zu öffnen', async ({ browser, viewport }) => {
    const isolated = await startIsolatedServer('friend-request');
    const contexts = [];
    const newContext = async () => { const c = await browser.newContext({ baseURL: isolated.baseURL, viewport, storageState: { cookies: [], origins: [] } }); contexts.push(c); return c; };
    try {
      // Max and Lisa hide their profiles and ask Anna for friendship.
      const maxContext = await newContext();
      await loginAs(maxContext, 'max@bottomupparti.local', 'Max');
      await makeProfilePrivate(maxContext);
      await requestFriendship(maxContext, 'u-anna');
      const lisaContext = await newContext();
      await loginAs(lisaContext, 'lisa@bottomupparti.local', 'Lisa');
      await makeProfilePrivate(lisaContext);
      await requestFriendship(lisaContext, 'u-anna');

      const annaContext = await newContext();
      const anna = await loginAs(annaContext, 'anna@bottomupparti.local', 'Anna');
      const page = anna.page;
      // The private profile itself stays closed for Anna.
      expect((await annaContext.request.get('/api/users/u-max')).status()).toBe(404);

      // The request offers its decisions right in the list.
      await openBell(page);
      await expect(page.getByRole('button', { name: 'Max annehmen' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Anfrage von Max ablehnen' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Max blockieren' })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      // Tapping the request text leads to the friends area, not to the hidden profile.
      await page.getByRole('button', { name: /Neue Freundschaftsanfrage.*Max/ }).click();
      await expect(page.locator('#modalContent h2')).toHaveText('Freunde & Personenbeziehungen');
      await expect(page.locator('#modalContent')).toContainText('Anfragen an dich');
      await expect(page.locator('#modalContent')).toContainText('Max');
      await expect(page.locator('#toast')).not.toContainText('Profil nicht gefunden');
      await page.locator('#closeModal').click();

      // Accept Max from the list: the entry says so and the request is gone.
      await openBell(page);
      await page.getByRole('button', { name: 'Max annehmen' }).click();
      await expect(page.locator('.notification-list')).toContainText('Ihr seid jetzt befreundet');
      await expect(page.getByRole('button', { name: 'Max annehmen' })).toHaveCount(0);
      let network = await (await annaContext.request.get('/api/friends')).json();
      expect(network.friends.some(p => p.id === 'u-max')).toBe(true);

      // Decline Lisa: no friendship, the entry no longer offers decisions.
      await page.getByRole('button', { name: 'Anfrage von Lisa ablehnen' }).click();
      await expect(page.getByRole('button', { name: 'Anfrage von Lisa ablehnen' })).toHaveCount(0);
      network = await (await annaContext.request.get('/api/friends')).json();
      expect(network.incoming.some(p => p.id === 'u-lisa')).toBe(false);
      expect(network.friends.some(p => p.id === 'u-lisa')).toBe(false);
      // An old notification whose request is closed explains that instead of failing.
      await page.getByRole('button', { name: /Neue Freundschaftsanfrage.*Lisa/ }).first().click();
      await expect(page.locator('#toast')).toHaveText('Diese Anfrage ist nicht mehr offen.');
      await expect(page.locator('.notification-list')).toBeVisible();

      // Lisa asks again; Anna blocks her directly from the list.
      await requestFriendship(lisaContext, 'u-anna');
      await page.locator('#closeModal').click();
      await openBell(page);
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Lisa blockieren' }).first().click();
      await expect(page.getByRole('button', { name: 'Lisa blockieren' })).toHaveCount(0);
      const blocks = await (await annaContext.request.get('/api/blocks')).json();
      expect(blocks.some(p => p.id === 'u-lisa')).toBe(true);
      network = await (await annaContext.request.get('/api/friends')).json();
      expect(network.incoming.some(p => p.id === 'u-lisa')).toBe(false);

      // Answered requests no longer count as unread.
      await expect(page.locator('.notification-item.unread').filter({ hasText: 'Freundschaftsanfrage' })).toHaveCount(0);
      await assertNoHorizontalOverflow(page);
      anna.guard.assertClean();
    } finally {
      for (const c of contexts) await c.close();
      await isolated.stop();
    }
  });
}
