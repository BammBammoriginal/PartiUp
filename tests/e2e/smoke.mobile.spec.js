const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow } = require('../helpers/app');

test.describe('mobile core smoke paths', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  test('mobile shell is usable', async ({ page }) => {
    await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    const sidebarBox = await page.locator('#appSidebar').boundingBox();
    expect(sidebarBox && sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(2);
    await assertNoHorizontalOverflow(page);
  });

  for (const pageId of ['discover','communities','events','people','projects','participation']) {
    test(`${pageId} is reachable through mobile navigation`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await go(page, pageId);
      await assertNoHorizontalOverflow(page);
      expect(errors).toEqual([]);
    });
  }

  test('community space opens on mobile', async ({ page }) => {
    await go(page, 'communities');
    const first = page.locator('#communities-list .community').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.locator('#community-space')).toHaveClass(/active/);
    await assertNoHorizontalOverflow(page);
  });

  test('project modular tabs remain horizontally usable on mobile', async ({ page }) => {
    await go(page, 'projects');
    const project = page.locator('#projects-list .project-clickable').first();
    await expect(project).toBeVisible();
    await project.click();
    await expect(page.locator('[data-otab="tasks"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test('Fediverse remains a usable Discover sub-area on mobile', async ({ page }) => {
    await go(page, 'discover');
    const tab=page.locator('[data-discover-tab="fediverse"]');
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(page.locator('#fediverseDiscover')).toBeVisible();
    await expect(page.locator('#discoverCore')).toBeHidden();
    await expect(page.locator('#fediverseAppGrid .fediverse-app-card').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.locator('[data-discover-tab="for-you"]').click();
    await expect(page.locator('#discoverCore')).toBeVisible();
    await expect(page.locator('#discover-list')).toBeVisible();
  });

});
