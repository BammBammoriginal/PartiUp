const { test, expect } = require('@playwright/test');
const {
  loginAsMax,
  go,
  assertNoHorizontalOverflow,
  uniqueName,
  captureRuntimeFailures,
  openIdentity,
  closeMobileDrawer,
  createGlobalObject,
  createParticipation,
  openOwnedCommunity,
  openVisibleOtherPerson,
  blockOpenPerson,
  downloadPrivacyExport,
  openAccountDeletion,
  submitAccountDeletion,
  selectChatImage,
  assertChatMediaLayout,
  openAndCloseChatMediaViewer
} = require('../helpers/gold');

test.setTimeout(30_000);

test.describe('Goldstandard Mobile 412x915', () => {
  test.beforeEach(async ({ page }) => {
    page.__goldGuard = captureRuntimeFailures(page);
    await loginAsMax(page);
  });

  test.afterEach(async ({ page }) => page.__goldGuard.assertClean());

  test('Bottom-Navigation, Drawer, Backdrop und Abmeldung bleiben bedienbar', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width: 412, height: 915 },
      storageState: { cookies: [], origins: [] }
    });
    const mobilePage = await context.newPage();
    const guard = captureRuntimeFailures(mobilePage);
    await loginAsMax(mobilePage);
    await expect(mobilePage.locator('.mobile-bottom-nav')).toBeVisible();
    await mobilePage.locator('#mobileMore').click();
    await expect(mobilePage.locator('.app')).toHaveClass(/menu-open/);
    await expect(mobilePage.locator('#navBackdrop')).toBeVisible();
    await closeMobileDrawer(mobilePage);

    await openIdentity(mobilePage);
    await expect(mobilePage.locator('#logout')).toBeVisible();
    await mobilePage.locator('#logout').click();
    await expect(mobilePage.locator('#userName')).toHaveText('Nicht angemeldet');
    await loginAsMax(mobilePage);
    await assertNoHorizontalOverflow(mobilePage);
    guard.assertClean();
    await context.close();
  });

  for (const [type, pageId, list] of [
    ['event', 'events', '#events-list'],
    ['project', 'projects', '#projects-list']
  ]) {
    test(`${type}: mobil erstellen und nach Reload wiederfinden`, async ({ page }) => {
      const name = uniqueName(`Mobile ${type}`);
      await createGlobalObject(page, type, name);
      await assertNoHorizontalOverflow(page);
      await page.reload();
      await go(page, pageId);
      await expect(page.locator(list)).toContainText(name);
      await assertNoHorizontalOverflow(page);
    });
  }

  test('Beteiligung mobil erstellen und nach Reload wiederfinden', async ({ page }) => {
    const name = uniqueName('Mobile Beteiligung');
    await createParticipation(page, name);
    await page.reload();
    await go(page, 'participation');
    await expect(page.locator('#participation-list')).toContainText(name);
    await assertNoHorizontalOverflow(page);
  });

  test('Community-Space und seine gleichwertigen Funktionsbereiche bleiben mobil erreichbar', async ({ page }) => {
    await openOwnedCommunity(page);
    for (const [tab, button] of [
      ['spaces', '#createSubspace'],
      ['events', '#createSpaceEvent'],
      ['projects', '#createSpaceProject'],
      ['participation', '#createSpaceParticipation']
    ]) {
      await page.locator(`[data-ctab="${tab}"]`).click();
      await expect(page.locator(button)).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });

  test('Orts-Dropdown und Ortswechsel funktionieren mobil', async ({ page }) => {
    await go(page, 'discover');
    await page.locator('[data-discover-tab="local"]').click();
    const select = page.locator('#discoverLocalPlace');
    await expect(select).toBeVisible();
    expect(await select.locator('option').count()).toBeGreaterThan(1);
    const values = await select.locator('option').evaluateAll(options => options.map(o => o.value));
    await select.selectOption(values.at(-1));
    const name = (await select.locator('option:checked').textContent()).trim();
    await expect(page.locator('#discoverHeading')).toContainText(name);
    await assertNoHorizontalOverflow(page);
  });

  test('Nachricht mobil senden und nach Reload wiederfinden', async ({ page }) => {
    const message = uniqueName('Mobile Nachricht');
    await go(page, 'messages');
    await page.locator('#createConversation').click();
    const recipient = await page.locator('#conversationPeople option').first().getAttribute('value');
    await page.locator('#conversationPeople').selectOption(recipient);
    await page.locator('#saveConversation').click();
    await page.locator('#messageBody').fill(message);
    await page.locator('#messageComposer button[type="submit"]').click();
    await expect(page.locator('#messageThread')).toContainText(message);
    await page.reload();
    await go(page, 'messages');
    await page.locator('#conversationList [data-conversation]').first().click();
    await expect(page.locator('#messageThread')).toContainText(message);
    await assertNoHorizontalOverflow(page);
  });

  test('Chatbild mobil lokal prüfen, entfernen und bewusst senden', async ({ page }) => {
    const uploads = [];
    page.on('request', request => {
      if (request.method() === 'POST' && /\/api\/messages\/conversations\/[^/]+\/images$/.test(request.url())) uploads.push(request.url());
    });
    await go(page, 'messages');
    await page.locator('#createConversation').click();
    const recipient = await page.locator('#conversationPeople option').first().getAttribute('value');
    await page.locator('#conversationPeople').selectOption(recipient);
    await page.locator('#saveConversation').click();

    await selectChatImage(page, 'mobil-vorschau.png');
    expect(uploads).toHaveLength(0);
    await assertNoHorizontalOverflow(page);
    await page.locator('#removeMessageImage').click();
    await expect(page.locator('#messageImagePreview')).toBeHidden();
    expect(uploads).toHaveLength(0);

    await selectChatImage(page, 'mobil-querformat.png', { width: 1280, height: 720, background: '#dff2eb' });
    const uploaded = page.waitForResponse(response => /\/api\/messages\/conversations\/[^/]+\/images$/.test(response.url()) && response.request().method() === 'POST');
    await page.locator('#messageComposer button[type="submit"]').click();
    const uploadResponse = await uploaded;
    expect(uploadResponse.status()).toBe(201);
    const sent = await uploadResponse.json();
    expect(sent.media?.[0]?.url).toMatch(/^\/api\/private-media\/pm-/);
    const sentImage = () => page.locator(`#messageThread .private-message-image[src="${sent.media[0].url}"]`);
    expect(uploads).toHaveLength(1);
    await expect(sentImage()).toBeVisible();
    await assertChatMediaLayout(page, sentImage(), { maxWidth: 340, maxHeight: 280, expectedRatio: 1280 / 720 });
    await openAndCloseChatMediaViewer(page, sentImage());
    await expect(page.locator('#backToConversations')).toBeVisible();
    await page.locator('#backToConversations').click();
    await expect(page.locator('#conversationList')).toBeVisible();
    await expect(page.locator('#messageThread')).toBeHidden();
    await page.locator('#conversationList [data-conversation]').first().click();
    await expect(sentImage()).toBeVisible();
    await page.reload();
    await go(page, 'messages');
    await page.locator('#conversationList [data-conversation]').first().click();
    await expect(sentImage()).toBeVisible();
    await assertChatMediaLayout(page, sentImage(), { maxWidth: 340, maxHeight: 280, expectedRatio: 1280 / 720 });
    await assertNoHorizontalOverflow(page);
  });

  test('Eigene Nachricht mobil kontrolliert löschen und als Löschhinweis wiederfinden', async ({ page }) => {
    const text = uniqueName('Mobile Löschung');
    await go(page, 'messages');
    await page.locator('#createConversation').click();
    const recipient = await page.locator('#conversationPeople option').first().getAttribute('value');
    await page.locator('#conversationPeople').selectOption(recipient);
    const conversationResponse = page.waitForResponse(response => response.url().endsWith('/api/messages/conversations') && response.request().method() === 'POST');
    await page.locator('#saveConversation').click();
    const conversation = await (await conversationResponse).json();
    await page.locator('#messageBody').fill(text);
    const messageResponse = page.waitForResponse(response => response.url().endsWith(`/api/messages/conversations/${conversation.id}/messages`) && response.request().method() === 'POST');
    await page.locator('#messageComposer button[type="submit"]').click();
    const message = await (await messageResponse).json();
    const bubble = page.locator(`[data-message-id="${message.id}"]`);
    await bubble.locator('.message-reaction-picker summary').click();
    await bubble.locator('[data-reaction-choice="🤔"]').click();
    await expect(bubble.locator('.message-reactions > button[data-emoji="🤔"]')).toHaveClass(/active/);
    await bubble.locator('.message-reactions > button[data-emoji="🤔"]').click();
    await expect(bubble.locator('.message-reactions > button[data-emoji="🤔"]')).toHaveCount(0);
    await expect(bubble.locator('[data-delete-message]')).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    const deleted = page.waitForResponse(response => response.url().endsWith(`/api/messages/${message.id}`) && response.request().method() === 'DELETE');
    await bubble.locator('[data-delete-message]').click();
    expect((await deleted).status()).toBe(200);
    await expect(page.locator(`[data-message-id="${message.id}"][data-message-deleted="true"]`)).toContainText('Nachricht gelöscht');
    await expect(page.locator('#messageThread')).not.toContainText(text);
    await page.reload();
    await go(page, 'messages');
    await page.locator(`[data-conversation="${conversation.id}"]`).click();
    await expect(page.locator(`[data-message-id="${message.id}"][data-message-deleted="true"]`)).toContainText('Nachricht gelöscht');
    await expect(page.locator('#messageThread')).not.toContainText(text);
    await assertNoHorizontalOverflow(page);
  });

  test('Blockierte Personen mobil verwalten und entblocken', async ({ page }) => {
    const target = await openVisibleOtherPerson(page);
    await blockOpenPerson(page, target.id);

    await page.locator('#mobileMore').click();
    await expect(page.locator('.app')).toHaveClass(/menu-open/);
    await page.locator('#manageBlockedPeople').click();
    await expect(page.locator('.app')).not.toHaveClass(/menu-open/);
    const blockedList = page.locator('#blockedPeopleList');
    const blockedPerson = blockedList.locator(`[data-unblock-user="${target.id}"]`);
    await expect(blockedList).toContainText(target.name);
    await expect(blockedPerson).toBeVisible();
    await assertNoHorizontalOverflow(page);

    page.once('dialog', dialog => dialog.accept());
    await blockedPerson.click();
    await expect(blockedList.locator(`[data-unblock-user="${target.id}"]`)).toHaveCount(0);
    await expect(blockedList).toContainText('Keine Personen blockiert');
  });

  test('Datenschutzexport mobil erreichbar und sicher herunterladbar', async ({ page }) => {
    await downloadPrivacyExport(page);
    await assertNoHorizontalOverflow(page);
  });

  test('Benachrichtigungsliste und Zähler bleiben mobil bedienbar', async ({ page }) => {
    await page.locator('#notificationButton').click();
    await expect(page.locator('.notification-list')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    if (await page.locator('#readAll').count()) {
      await page.locator('#readAll').click();
      await expect(page.locator('#notificationCount')).toBeHidden();
    }
  });

  test('Chat-Eingabe mobil auch ohne Lesebestätigung sichtbar', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width: 412, height: 915 },
      isMobile: true,
      hasTouch: true,
      storageState: { cookies: [], origins: [] }
    });
    try {
      const chatPage = await context.newPage();
      await loginAsMax(chatPage);
      await chatPage.route(url => url.pathname.startsWith('/api/messages/conversations/') && url.pathname.endsWith('/read'), route =>
        route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Zu viele Anfragen.' }) })
      );
      await go(chatPage, 'messages');
      await chatPage.locator('#createConversation').click();
      await chatPage.locator('#conversationPeople').selectOption('u-anna');
      await chatPage.locator('#saveConversation').click();
      await expect(chatPage.locator('#messageComposer')).toBeVisible();
      await expect(chatPage.locator('#messageBody')).toBeInViewport();
      await assertNoHorizontalOverflow(chatPage);
    } finally {
      await context.close();
    }
  });

  test('Kontolöschung bleibt mobil vollständig kontrollierbar', async ({ page }) => {
    await openAccountDeletion(page);
    await assertNoHorizontalOverflow(page);
    await page.locator('#cancelDeleteAccount').click();
    await expect(page.locator('#openDeleteAccount')).toBeVisible();

    await page.locator('#openDeleteAccount').click();
    const deleted = await submitAccountDeletion(page, 'demo123');
    expect((await deleted).status()).toBe(200);
    await expect(page.locator('#userName')).toHaveText('Nicht angemeldet');
    await expect(page.locator('#modalContent')).toContainText('Konto gelöscht');
    await assertNoHorizontalOverflow(page);
  });
});
