const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go } = require('../helpers/app');

// Optional pixel-level regression suite. Generate/update baselines deliberately with:
// npm run qa:baseline
// Keep this separate from the default QA gate because OS font/emoji rendering differs.
test.describe('visual snapshots', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));
  for (const pageId of ['home','discover','communities','events','projects','participation','people']) {
    test(`${pageId} visual snapshot`, async ({ page }) => {
      if (pageId !== 'home') await go(page, pageId);
      await expect(page).toHaveScreenshot(`${pageId}.png`, { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.02 });
    });
  }
});
