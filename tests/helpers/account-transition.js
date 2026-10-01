const { test, expect } = require('@playwright/test');
const { waitForApp, openIdentity, closeMobileDrawer, go, fillObjectForm, openCreation, assertNoHorizontalOverflow, captureRuntimeFailures } = require('./gold');

module.exports = function registerAccountTransition() {
  test.setTimeout(30_000);
  test('Kontowechsel entfernt Verwaltung und private Ansichten; Anmeldung per Enter', async ({ browser, viewport }) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100', viewport, storageState: { cookies: [], origins: [] } });
    try {
      const page = await context.newPage();
      const guard = captureRuntimeFailures(page);
      await waitForApp(page);
      await openIdentity(page);
      await page.locator('#showRegistration').click();
      const email = `transition-${Date.now()}@example.test`, password = 'Sicheres-Testpasswort-2026';
      await page.locator('#registerName').fill('Kontowechsel QA');
      await page.locator('#registerEmail').fill(email);
      await page.locator('#registerPassword').fill(password);
      await page.locator('#register').click();
      await expect(page.locator('#userName')).toHaveText('Kontowechsel QA');
      if (await page.locator('.app').evaluate(el => el.classList.contains('menu-open'))) await closeMobileDrawer(page);
      await openCreation(page, 'community');
      await fillObjectForm(page, 'community', `Private Übergabe ${Date.now()}`);
      await page.locator('#formVisibility').selectOption('private');
      await page.locator('#saveCreate').click();
      await expect(page.locator('#community-space')).toHaveClass(/active/);
      const gear = page.locator('[data-ctab="admin"]');
      await expect(gear).toBeVisible();
      await gear.click();
      await expect(page.locator('[data-permission-box]')).toContainText('Personen & Rollen');
      await assertNoHorizontalOverflow(page);
      await openIdentity(page);
      await page.locator('#logout').click();
      await expect(page.locator('#userName')).toHaveText('Nicht angemeldet');
      await expect(page.locator('#home')).toHaveClass(/active/);
      await expect(page.locator('#communitySpaceContent')).toBeEmpty();
      await expect(page.locator('#modalContent')).toBeEmpty();
      expect(await page.evaluate(() => location.hash)).toBe('');
      await openIdentity(page);
      await page.locator('#loginEmail').fill(email);
      const input = page.locator('#loginPassword');
      await input.focus();
      await input.press('ControlOrMeta+A');
      await input.press('Backspace');
      await expect(input).toHaveValue('');
      await input.fill(password);
      await input.press('Enter');
      await expect(page.locator('#userName')).toHaveText('Kontowechsel QA');
      await expect(page.locator('#home')).toHaveClass(/active/);
      await expect(page.locator('#communitySpaceContent')).toBeEmpty();
      guard.assertClean();
    } finally { await context.close(); }
  });
};
