const { test, expect } = require('@playwright/test');
const { waitForApp, openIdentity, assertNoHorizontalOverflow, captureRuntimeFailures } = require('../helpers/gold');

test.setTimeout(30_000);

test('Registrierung und Abmeldung mobil', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    storageState: { cookies: [], origins: [] }
  });
  try {
    const page = await context.newPage();
    const guard = captureRuntimeFailures(page);
    const email = `qa-mobile-${Date.now()}@example.test`;
    const password = 'Sicheres-Testpasswort-2026';
    await waitForApp(page);
    await openIdentity(page);
    await page.locator('#showRegistration').click();
    await expect(page.locator('#registerName')).toBeVisible();
    await page.locator('#registerName').fill('Mira');
    await page.locator('#registerEmail').fill(email);
    await page.locator('#registerPassword').fill(password);
    await page.locator('#register').click();
    await expect(page.locator('#userName')).toHaveText('Mira');
    await assertNoHorizontalOverflow(page);
    await openIdentity(page);
    await expect(page.locator('#dmPermission')).toHaveValue('members');
    await page.locator('#logout').click();
    await expect(page.locator('#userName')).toHaveText('Nicht angemeldet');
    guard.assertClean();
  } finally {
    await context.close();
  }
});

test('Mobiler Chat zeigt Eingabe trotz fehlgeschlagener Lesebestätigung', async ({ page }) => {
  const { loginAsMax, go } = require('../helpers/gold');
  await loginAsMax(page);
  await page.route(/\\/api\\/messages\\/conversations\\/[^/]+\\/read$/, route =>
    route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Zu viele Anfragen.' }) })
  );
  await go(page, 'messages');
  await page.locator('#createConversation').click();
  await page.locator('#conversationPeople').selectOption('u-anna');
  await page.locator('#saveConversation').click();
  await expect(page.locator('#messageComposer')).toBeVisible();
  await expect(page.locator('#messageBody')).toBeInViewport();
  await assertNoHorizontalOverflow(page);
});
