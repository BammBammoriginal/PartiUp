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

  // The built-in demo accounts are public in a newly seeded QA database.
  for (const id of ['u-anna', 'u-lisa']) {
    const profile = await page.request.get(`/api/users/${id}`);
    expect(profile.status()).toBe(200);
  }

  await visibleLogin(page, 'max@bottomupparti.local', 'Max');
  await page.context().storageState({ path: authFile });
});
