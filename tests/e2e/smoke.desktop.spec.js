const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow, openCardByTitle } = require('../helpers/app');

test.describe('desktop core smoke paths', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  for (const pageId of ['home','discover','communities','people','messages','events','projects','participation']) {
    test(`${pageId} renders without page errors`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      if (pageId !== 'home') await go(page, pageId);
      await assertNoHorizontalOverflow(page);
      expect(errors).toEqual([]);
    });
  }

  test('community opens as full space with registers', async ({ page }) => {
    await go(page, 'communities');
    const name = await openCardByTitle(page.locator('#communities-list .community').first());
    await expect(page.locator('#community-space')).toHaveClass(/active/);
    await expect(page.locator('#community-space')).toContainText(name);
  });

  test('person profile opens from people list', async ({ page }) => {
    await go(page, 'people');
    const name = await openCardByTitle(page.locator('#people-list .person-card').first());
    await expect(page.locator('#person-space')).toHaveClass(/active/);
    await expect(page.locator('#person-space')).toContainText(name);
  });

  test('event opens and exposes participation action', async ({ page }) => {
    await go(page, 'events');
    const name = await openCardByTitle(page.locator('#events-list .event-clickable').first());
    await expect(page.locator('#modal')).toHaveClass(/show/);
    await expect(page.locator('#modalContent')).toContainText(name);
    await expect(page.locator('#modalContent')).toContainText(/Nehme teil|Teilnahme/);
  });

  test('project opens as modular space with tasks and trust', async ({ page }) => {
    await go(page, 'projects');
    const name = await openCardByTitle(page.locator('#projects-list .project-clickable').first());
    await expect(page.locator('#modal')).toHaveClass(/show/);
    await expect(page.locator('#modalContent')).toContainText(name);
    await expect(page.locator('[data-otab="tasks"]')).toBeVisible();
    await expect(page.locator('[data-otab="info"]')).toBeVisible();
    await page.locator('[data-otab="info"]').click();
    await expect(page.locator('#modalContent')).toContainText('Vertrauen & Herkunft');
  });

  test('event opens as modular space with tasks and trust', async ({ page }) => {
    await go(page, 'events');
    const name = await openCardByTitle(page.locator('#events-list .event-clickable').first());
    await expect(page.locator('#modalContent')).toContainText(name);
    await expect(page.locator('[data-otab="tasks"]')).toBeVisible();
    await expect(page.locator('[data-otab="info"]')).toBeVisible();
    await page.locator('[data-otab="info"]').click();
    await expect(page.locator('#modalContent')).toContainText('Vertrauen & Herkunft');
  });

  test('Fediverse is a fifth Discover tab without replacing core discovery', async ({ page }) => {
    await go(page, 'discover');
    const tabs=page.locator('[data-discover-tab]');
    await expect(tabs).toHaveCount(5);
    await page.locator('[data-discover-tab="fediverse"]').click();
    await expect(page.locator('#fediverseDiscover')).toBeVisible();
    await expect(page.locator('#fediverseAppGrid .fediverse-app-card').first()).toBeVisible();
    await page.locator('[data-discover-tab="communities"]').click();
    await expect(page.locator('#discoverCore')).toBeVisible();
    await expect(page.locator('#discover-list')).toBeVisible();
  });

});
