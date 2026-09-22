const { test: setup, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const authFile = path.join(__dirname, '.auth', 'user.json');

setup.setTimeout(20_000);

async function visibleLogin(page, email, expectedName) {
  // Exercise the same visible login, CSRF and session-rotation path as users.
  // QA must not fabricate cookies or use a test-only authentication bypass.
  const identity = page.locator('#identityButton');
  await expect(identity).toBeVisible();
  await expect(identity).toBeInViewport();
  await page.locator('#identityButton').click();
  await expect(page.locator('#loginEmail')).toBeVisible();
  await page.locator('#loginEmail').fill(email);
  await page.locator('#loginPassword').fill('demo123');
  await page.locator('#login').click();

  await expect(page.locator('#userName')).toHaveText(expectedName, { timeout: 5000 });
  const cookies = await page.context().cookies();
  expect(cookies.some(cookie => cookie.name === 'bup_session'), 'QA browser session cookie missing after visible login').toBeTruthy();
}

setup('authenticate once for QA suite', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.goto('/');
  await expect(page.locator('#mainContent')).toBeAttached();
  await expect(page.locator('#friendCount')).not.toHaveText('–');

  // Establish the browser fixture through the public UI. The target profile is
  // deliberately visible to signed-in members, so the block journey never
  // depends on a hard-coded friendship, demo name or a database shortcut.
  await visibleLogin(page, 'anna@bottomupparti.local', 'Anna');
  await page.locator('#identityButton').click();
  await page.locator('#profileVisibility').selectOption('members');
  const saved = page.waitForResponse(response =>
    response.url().endsWith('/api/preferences') &&
    response.request().method() === 'PUT'
  );
  await page.locator('#savePrefs').click();
  expect((await saved).status()).toBe(200);
  await expect(page.locator('#toast')).toHaveText('Einstellungen gespeichert');
  await page.locator('#logout').click();
  await expect(page.locator('#userName')).toHaveText('Nicht angemeldet');

  await visibleLogin(page, 'max@bottomupparti.local', 'Max');
  await page.context().storageState({ path: authFile });
});
