const { test, expect } = require('@playwright/test');
const { waitForApp, loginAsMax, go, uniqueName, captureRuntimeFailures, openIdentity } = require('../helpers/gold');

test.setTimeout(30_000);

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
