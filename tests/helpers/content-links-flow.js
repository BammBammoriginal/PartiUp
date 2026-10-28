const { test, expect } = require('@playwright/test');
const { waitForApp, assertNoHorizontalOverflow } = require('./gold');
const { go } = require('./app');
const { startIsolatedServer } = require('./isolated-server');
const { loginAs } = require('./join-request-flow');

async function apiSession(context, email) {
  const csrf = async () => (await (await context.request.get('/api/security/csrf')).json()).csrf;
  const login = await context.request.post('/api/login', { headers: { 'X-BUP-CSRF': await csrf() }, data: { email, password: 'demo123' } });
  expect(login.status()).toBe(200);
  const token = await csrf();
  return (method, url, data) => context.request.fetch(url, { method, headers: { 'X-BUP-CSRF': token }, data });
}

module.exports = function registerContentLinksFlow() {
  test.setTimeout(30_000);
  test('Benachrichtigungen und Feed öffnen Kommentar, Beitrag und Chat an ihrem Ort', async ({ browser, viewport }) => {
    const isolated = await startIsolatedServer('content-links');
    const contexts = [];
    const newContext = async () => { const c = await browser.newContext({ baseURL: isolated.baseURL, viewport, storageState: { cookies: [], origins: [] } }); contexts.push(c); return c; };
    try {
      const maxContext = await newContext();
      const max = await loginAs(maxContext, 'max@bottomupparti.local', 'Max');
      const asMax = await apiSession(maxContext, 'max@bottomupparti.local');
      const asAnna = await apiSession(await newContext(), 'anna@bottomupparti.local');

      // Max posts in a public Space; Anna joins, comments and writes him.
      const space = await (await asMax('POST', '/api/communities', { name: 'Permalink-Runde QA', type: 'Community', places: ['erl'], topics: ['Demokratie'], visibility: 'public', join_policy: 'open' })).json();
      const post = await (await asMax('POST', `/api/communities/${space.id}/posts`, { body: 'Ursprungsbeitrag für Links' })).json();
      for (let i = 1; i <= 6; i++) await asMax('POST', `/api/communities/${space.id}/posts`, { body: `Füllbeitrag ${i}` });
      await asMax('POST', '/api/notifications/read', {});
      await asAnna('POST', `/api/communities/${space.id}/join`, {});
      await asAnna('POST', `/api/posts/${post.postId}/comments`, { body: 'Antwort von Anna auf den Beitrag' });

      // The notification opens the comment inside its post, in the Space feed.
      await max.page.reload();
      await waitForApp(max.page);
      await max.page.locator('#notificationButton').click();
      await max.page.getByRole('button', { name: /Neue Antwort auf deinen Beitrag/ }).first().click();
      await expect(max.page.locator('#modal')).not.toHaveClass(/show/);
      await expect(max.page.locator('#community-space')).toHaveClass(/active/);
      const comment = max.page.locator('#spaceUnifiedFeed .comment', { hasText: 'Antwort von Anna auf den Beitrag' });
      await expect(comment).toBeInViewport();
      await expect(comment).toBeFocused();
      await expect(max.page).toHaveURL(/#comment\//);

      // The same link works after a reload (waitForApp would navigate to '/', so wait for the comment itself).
      await max.page.reload();
      await expect(comment).toBeInViewport();

      // Home feed: the post opens where it lives.
      await go(max.page, 'home');
      await max.page.locator('#feed article', { hasText: 'Ursprungsbeitrag für Links' }).getByRole('link', { name: 'Beitrag von Max in Permalink-Runde QA öffnen' }).click();
      const original = max.page.locator('#spaceUnifiedFeed article', { hasText: 'Ursprungsbeitrag für Links' });
      await expect(original).toBeInViewport();
      await expect(max.page).toHaveURL(/#post\//);
      await assertNoHorizontalOverflow(max.page);

      // A link to content that is gone gives a clear answer instead of an empty page.
      await max.page.goto('/#post/beitrag-gibt-es-nicht');
      await expect(max.page.locator('#toast')).toHaveText('Dieser Inhalt ist nicht mehr verfügbar oder für dich nicht sichtbar.');

      // A chat notification opens the conversation.
      const conversation = await (await asAnna('POST', '/api/messages/conversations', { type: 'direct', direct_user_id: 'u-max' })).json();
      await asAnna('POST', `/api/messages/conversations/${conversation.id}/messages`, { body: 'Hast du meine Antwort gesehen?' });
      await max.page.reload();
      await waitForApp(max.page);
      await max.page.locator('#notificationButton').click();
      await max.page.getByRole('button', { name: /Neue Nachricht/ }).first().click();
      await expect(max.page.locator('#messages')).toHaveClass(/active/);
      await expect(max.page.locator('#messagesScroll').getByText('Hast du meine Antwort gesehen?')).toBeVisible();
      max.guard.assertClean();
    } finally {
      for (const c of contexts) await c.close();
      await isolated.stop();
    }
  });
};
