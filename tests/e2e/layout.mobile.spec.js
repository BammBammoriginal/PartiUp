const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow } = require('../helpers/app');

const views = [
  ['discover', '#discoverLanding .discover-preview-card'],
  ['communities', '#communities-list .community'],
  ['events', '#events-list .event'],
  ['projects', '#projects-list .project-card'],
  ['participation', '#participation-list > *']
];

test.describe('mobile layout regression guards', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  test('mobile shell keeps bottom navigation visible', async ({ page }) => {
    await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
    const sidebarBox = await page.locator('#appSidebar').boundingBox();
    expect(sidebarBox && sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(2);
    const navBox = await page.locator('.mobile-bottom-nav').boundingBox();
    expect(navBox && navBox.height).toBeLessThanOrEqual(90);
    await assertNoHorizontalOverflow(page);
  });

  for (const [pageId, cards] of views) {
    test(`${pageId}: mobile cards stay inside viewport`, async ({ page }) => {
      await go(page, pageId);
      await assertNoHorizontalOverflow(page);
      const count = await page.locator(cards).count();
      expect(count).toBeGreaterThan(0);
      const bad = await page.locator(cards).evaluateAll(nodes => nodes.map(n => {
        const r=n.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width,height:r.height};
      }).filter(r => r.left < -2 || r.right > innerWidth + 2 || r.width < 80 || r.height < 24));
      expect(bad).toEqual([]);
    });
  }

  test('community space tabs and core creation surfaces stay inside viewport', async ({ page }) => {
    await go(page, 'communities');
    const first = page.locator('#communities-list .community').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.locator('#community-space')).toHaveClass(/active/);
    await assertNoHorizontalOverflow(page);
    for (const tab of ['spaces','events','projects','participation']) {
      const button=page.locator(`[data-ctab="${tab}"]`);
      await expect(button).toBeVisible();
      await button.click();
      await assertNoHorizontalOverflow(page);
    }
    const spaces=page.locator('[data-ctab="spaces"]'); await spaces.click();
    await expect(page.locator('#createSubspace')).toBeVisible();
    const events=page.locator('[data-ctab="events"]'); await events.click();
    await expect(page.locator('#createSpaceEvent')).toBeVisible();
    const projects=page.locator('[data-ctab="projects"]'); await projects.click();
    await expect(page.locator('#createSpaceProject')).toBeVisible();
    const participation=page.locator('[data-ctab="participation"]'); await participation.click();
    await expect(page.locator('#createSpaceParticipation')).toBeVisible();
  });

  test('event participation workflow stays usable on mobile', async ({ page }) => {
    await go(page, 'events');
    const first = page.locator('#events-list .event').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.locator('#modal')).toHaveClass(/show/);
    await assertNoHorizontalOverflow(page);
    const participants = page.locator('[data-otab="participants"]');
    await expect(participants).toBeVisible();
    await participants.click();
    await assertNoHorizontalOverflow(page);
    const buttons = page.locator('#modalContent button');
    const bad = await buttons.evaluateAll(nodes => nodes.filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()).filter(r => r.height < 40 || r.right > innerWidth + 2));
    expect(bad).toEqual([]);
  });

  test('Fediverse Discover cards and tabs stay inside viewport', async ({ page }) => {
    await go(page, 'discover');
    await page.locator('[data-discover-tab="fediverse"]').click();
    await expect(page.locator('#fediverseDiscover')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    const cards=page.locator('#fediverseAppGrid .fediverse-app-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
    const bad=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect()).filter(r=>r.left < -2 || r.right > innerWidth + 2 || r.width < 120));
    expect(bad).toEqual([]);
    await expect(page.locator('#showAllFediverseApps')).toBeVisible();
  });

});
