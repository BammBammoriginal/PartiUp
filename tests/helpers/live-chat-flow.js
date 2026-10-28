const { test, expect } = require('@playwright/test');
const { assertNoHorizontalOverflow } = require('./gold');
const { go } = require('./app');
const { startIsolatedServer } = require('./isolated-server');
const { loginAs } = require('./join-request-flow');

// The app polls its live state every 15 s, every 5 s while Chats is open. Both pages run on
// Playwright's clock, so the test fast-forwards exactly one interval instead of waiting.
const IDLE_INTERVAL = 15_000;
const CHAT_INTERVAL = 5_000;

module.exports = function registerLiveChatFlow() {
  test.setTimeout(30_000);
  test('Chat: Nachrichten, Reaktionen und Löschungen erscheinen ohne Neuladen', async ({ browser, viewport }) => {
    const isolated = await startIsolatedServer('live-chat');
    const contexts = [];
    const newContext = async () => { const c = await browser.newContext({ baseURL: isolated.baseURL, viewport, storageState: { cookies: [], origins: [] } }); contexts.push(c); return c; };
    try {
      const maxContext = await newContext();
      const max = await loginAs(maxContext, 'max@bottomupparti.local', 'Max', { clock: true });
      const anna = await loginAs(await newContext(), 'anna@bottomupparti.local', 'Anna', { clock: true });
      const csrf = (await (await maxContext.request.get('/api/security/csrf')).json()).csrf;
      const annaRequest = anna.page.context().request;
      await annaRequest.post('/api/notifications/read', { headers: { 'X-BUP-CSRF': (await (await annaRequest.get('/api/security/csrf')).json()).csrf }, data: {} });
      const asMax = (method, url, data) => maxContext.request.fetch(url, { method, headers: { 'X-BUP-CSRF': csrf }, data });

      // Anna has Chats open; Max starts a new conversation. It appears without navigation.
      await go(anna.page, 'messages');
      const conversation = await (await asMax('POST', '/api/messages/conversations', { type: 'direct', direct_user_id: 'u-anna' })).json();
      const first = await (await asMax('POST', `/api/messages/conversations/${conversation.id}/messages`, { body: 'Erste Live-Nachricht' })).json();
      await anna.page.clock.runFor(IDLE_INTERVAL);
      const fromMax = anna.page.locator('#conversationList').getByRole('button', { name: /Max/ });
      await expect(fromMax).toBeVisible();
      await fromMax.click();
      const annaThread = anna.page.locator('#messagesScroll');
      await expect(annaThread.getByText('Erste Live-Nachricht')).toBeVisible();

      // A draft survives incoming messages, reactions and deletions.
      const draft = anna.page.getByRole('textbox', { name: 'Nachricht schreiben' });
      await draft.fill('Entwurf, noch nicht gesendet');
      const second = await (await asMax('POST', `/api/messages/conversations/${conversation.id}/messages`, { body: 'Zweite Live-Nachricht' })).json();
      await anna.page.clock.runFor(CHAT_INTERVAL);
      await expect(annaThread.getByText('Zweite Live-Nachricht')).toBeVisible();
      await asMax('POST', `/api/messages/${second.id}/reactions`, { emoji: '👍' });
      await anna.page.clock.runFor(CHAT_INTERVAL);
      await expect(annaThread.getByRole('button', { name: '👍 1' })).toBeVisible();
      await asMax('DELETE', `/api/messages/${first.id}`);
      await anna.page.clock.runFor(CHAT_INTERVAL);
      await expect(annaThread.getByText('Erste Live-Nachricht')).toHaveCount(0);
      await expect(annaThread.getByText('Nachricht gelöscht')).toBeVisible();
      await expect(draft).toHaveValue('Entwurf, noch nicht gesendet');
      await assertNoHorizontalOverflow(anna.page);

      // Anna answers in the app; Max, with the conversation open, sees it without reload.
      await go(max.page, 'messages');
      await max.page.locator('#conversationList').getByRole('button', { name: /Anna/ }).click();
      await draft.fill('Antwort von Anna');
      await anna.page.getByRole('button', { name: 'Senden' }).click();
      await expect(annaThread.getByText('Antwort von Anna')).toBeVisible();
      await max.page.clock.runFor(CHAT_INTERVAL);
      await expect(max.page.locator('#messagesScroll').getByText('Antwort von Anna')).toBeVisible();

      // Away from Chats, the bell counts a new message without reload.
      await go(anna.page, 'home');
      await expect(anna.page.locator('#notificationCount')).toBeHidden();
      await asMax('POST', `/api/messages/conversations/${conversation.id}/messages`, { body: 'Bist du noch da?' });
      await anna.page.clock.runFor(IDLE_INTERVAL);
      await expect(anna.page.locator('#notificationCount')).toHaveText('1');
      max.guard.assertClean();
      anna.guard.assertClean();
    } finally {
      for (const c of contexts) await c.close();
      await isolated.stop();
    }
  });
};
