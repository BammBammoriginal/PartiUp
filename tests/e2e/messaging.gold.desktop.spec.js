const { test, expect } = require('@playwright/test');
const { waitForApp, loginAsMax, go, uniqueName, captureRuntimeFailures, openIdentity } = require('../helpers/gold');

test.setTimeout(30_000);

test('Chat-Eingabe bleibt bei fehlgeschlagener Lesebestätigung sichtbar und nutzbar', async ({ page }) => {
  await page.setViewportSize({ width: 1114, height: 900 });
  await loginAsMax(page);
  await page.route(url => url.pathname.startsWith('/api/messages/conversations/') && url.pathname.endsWith('/read'), route =>
    route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Zu viele Anfragen.' }) })
  );
  await go(page, 'messages');
  await page.locator('#createConversation').click();
  await page.locator('#conversationPeople').selectOption('u-anna');
  await page.locator('#saveConversation').click();
  await expect(page.locator('#messageComposer')).toBeVisible();
  await expect(page.locator('#messages > .hero')).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#messageBody')).toBeInViewport();
  const body = uniqueName('Eingabe trotz Read-Fehler');
  await page.locator('#messageBody').fill(body);
  await page.locator('#messageComposer button[type="submit"]').click();
  await expect(page.locator('#messageThread')).toContainText(body);
  await page.locator('#backToConversations').evaluate(button => button.click());
  await expect(page.locator('#messages > .hero')).toBeVisible();
  await page.locator('#conversationList [data-conversation]').filter({ hasText: 'Anna' }).first().click();
  await expect(page.locator('#messageComposer')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#messageBody')).toBeInViewport();
});

test('Öffentliches Profil: Nachricht aus Personenansicht zwischen zwei echten Konten', async ({ page, browser }) => {
  const guardMax = captureRuntimeFailures(page);
  await loginAsMax(page);
  const outbound = uniqueName('Max an Anna');
  const reply = uniqueName('Anna an Max');
  await go(page, 'people');
  const annaCard = page.locator('#people-list .person-card[data-user="u-anna"]');
  await expect(annaCard).toBeVisible();
  await annaCard.locator('.grow > b').click();
  await expect(page.locator('#personSpaceContent h2')).toHaveText('Anna');
  await expect(page.locator('#startDmFromProfile')).toBeVisible();
  const created = page.waitForResponse(response =>
    response.url().endsWith('/api/messages/conversations') &&
    response.request().method() === 'POST'
  );
  await page.locator('#startDmFromProfile').click();
  const createdResponse = await created;
  expect(createdResponse.status()).toBeLessThan(300);
  const conversation = await createdResponse.json();
  await expect(page.locator('#messages')).toHaveClass(/active/);
  await expect(page.locator('#messageComposer')).toBeVisible();
  await page.locator('#messageBody').fill(outbound);
  await page.locator('#messageComposer button[type="submit"]').click();
  await expect(page.locator('#messageThread')).toContainText(outbound);
  const outboundBubble = page.locator('.message-bubble').filter({ hasText: outbound });
  await outboundBubble.locator('.message-reaction-picker summary').click();
  await outboundBubble.locator('[data-reaction-choice="❤️"]').click();
  await expect(outboundBubble.locator('.message-reactions > button[data-emoji="❤️"]')).toHaveClass(/active/);
  await page.reload();
  await go(page, 'messages');
  await page.locator(`[data-conversation="${conversation.id}"]`).click();
  await expect(outboundBubble.locator('.message-reactions > button[data-emoji="❤️"]')).toHaveText(/1/);
  await outboundBubble.locator('.message-reactions > button[data-emoji="❤️"]').click();
  await expect(outboundBubble.locator('.message-reactions > button[data-emoji="❤️"]')).toHaveCount(0);

  const annaContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [] }
  });
  try {
    const anna = await annaContext.newPage();
    const guard = captureRuntimeFailures(anna);
    await waitForApp(anna);
    await openIdentity(anna);
    await anna.locator('#loginEmail').fill('anna@bottomupparti.local');
    await anna.locator('#loginPassword').fill('demo123');
    await anna.locator('#login').click();
    await expect(anna.locator('#userName')).toHaveText('Anna');
    await go(anna, 'messages');
    await anna.locator(`[data-conversation="${conversation.id}"]`).click();
    await expect(anna.locator('#messageThread')).toContainText(outbound);
    await anna.locator('#messageBody').fill(reply);
    await anna.locator('#messageComposer button[type="submit"]').click();
    await expect(anna.locator('#messageThread')).toContainText(reply);
    await anna.reload();
    await go(anna, 'messages');
    await anna.locator(`[data-conversation="${conversation.id}"]`).click();
    await expect(anna.locator('#messageThread')).toContainText(outbound);
    await expect(anna.locator('#messageThread')).toContainText(reply);
    guard.assertClean();
  } finally {
    await annaContext.close();
  }

  await page.reload();
  await go(page, 'messages');
  await page.locator(`[data-conversation="${conversation.id}"]`).click();
  await expect(page.locator('#messageThread')).toContainText(reply);
  guardMax.assertClean();
});

test('Zwei Konten sichtbar registrieren und nach Freigabe Nachrichten austauschen', async ({ browser }) => {
  const first = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [] }
  });
  const second = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [] }
  });
  const suffix = Date.now().toString(36);
  const password = 'Testpasswort-2026-lang';
  async function register(context, name) {
    const page = await context.newPage();
    const guard = captureRuntimeFailures(page);
    await waitForApp(page);
    await openIdentity(page);
    await page.locator('#showRegistration').click();
    await expect(page.locator('#registerName')).toBeVisible();
    await page.locator('#registerName').fill(name);
    await page.locator('#registerEmail').fill(`qa-${name.toLowerCase()}-${suffix}@example.test`);
    await page.locator('#registerPassword').fill(password);
    const response = page.waitForResponse(result =>
      result.url().endsWith('/api/register') && result.request().method() === 'POST'
    );
    await page.locator('#register').click();
    expect((await response).status()).toBe(201);
    await expect(page.locator('#userName')).toHaveText(name);
    const cookies = await context.cookies();
    expect(cookies.some(cookie => cookie.name === 'bup_session')).toBeTruthy();
    await openIdentity(page);
    await expect(page.locator('#profileVisibility')).toHaveValue(/^(network|members)$/);
    await expect(page.locator('#dmPermission')).toHaveValue('members');
    await page.locator('#profileVisibility').selectOption('public');
    await page.locator('#dmPermission').selectOption('all');
    const saved = page.waitForResponse(result =>
      result.url().endsWith('/api/preferences') && result.request().method() === 'PUT'
    );
    await page.locator('#savePrefs').click();
    expect((await saved).status()).toBe(200);
    await page.locator('#closeModal').click();
    return { page, guard };
  }
  try {
    const a = await register(first, 'Nora');
    const b = await register(second, 'Tarek');
    const message = uniqueName('Neu registriert');
    await a.page.reload();
    await go(a.page, 'people');
    const recipient = a.page.locator('#people-list .person-card').filter({ hasText: 'Tarek' });
    await expect(recipient).toBeVisible();
    await recipient.locator('.grow > b').click();
    await expect(a.page.locator('#startDmFromProfile')).toBeVisible();
    await a.page.locator('#startDmFromProfile').click();
    await expect(a.page.locator('#messageComposer')).toBeVisible();
    await a.page.locator('#messageBody').fill(message);
    await a.page.locator('#messageComposer button[type="submit"]').click();
    await expect(a.page.locator('#messageThread')).toContainText(message);
    await go(b.page, 'messages');
    await b.page.locator('#conversationList [data-conversation]').first().click();
    await expect(b.page.locator('#messageThread')).toContainText(message);
    await b.page.reload();
    await go(b.page, 'messages');
    await b.page.locator('#conversationList [data-conversation]').first().click();
    await expect(b.page.locator('#messageThread')).toContainText(message);
    a.guard.assertClean();
    b.guard.assertClean();
  } finally {
    await first.close();
    await second.close();
  }
});

test('Chatfenster wächst mit Inhalt und hält lange Verläufe scrollbar', async ({ page }) => {
  await page.setViewportSize({ width: 1114, height: 900 });
  await loginAsMax(page);
  await go(page, 'messages');
  await page.locator('#createConversation').click();
  await page.locator('#conversationType').selectOption('group');
  await page.locator('#conversationTitle').fill(uniqueName('Adaptive Gruppe'));
  const recipient = await page.locator('#conversationPeople option').first().getAttribute('value');
  await page.locator('#conversationPeople').selectOption(recipient);
  await page.locator('#saveConversation').click();
  await expect(page.locator('#messageComposer')).toBeVisible();
  const emptyHeight = (await page.locator('#messageThread').boundingBox()).height;
  expect(emptyHeight).toBeLessThan(440);
  for (let i = 0; i < 5; i++) {
    const body = uniqueName('Verlauf ' + i) + ' ' + 'Eine längere Nachricht für die adaptive Chatansicht. '.repeat(10);
    await page.locator('#messageBody').fill(body);
    await page.locator('#messageComposer button[type="submit"]').click();
    await expect(page.locator('#messageThread')).toContainText(body);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const filledHeight = (await page.locator('#messageThread').boundingBox()).height;
  expect(filledHeight).toBeGreaterThan(emptyHeight);
  const history = await page.locator('#messagesScroll').evaluate(el => ({
    height: el.clientHeight, content: el.scrollHeight, overflow: getComputedStyle(el).overflowY
  }));
  expect(history.content).toBeGreaterThan(history.height);
  expect(history.overflow).toBe('auto');
  await expect(page.locator('#messageBody')).toBeInViewport();
  await expect(page.locator('#messageComposer button[type="submit"]')).toBeInViewport();
});
