const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow, assertNoOverlaps } = require('../helpers/app');

const views = [
  ['discover', '#discover-list > *'],
  ['communities', '#communities-list .community'],
  ['events', '#events-list .event'],
  ['projects', '#projects-list .project-card'],
  ['participation', '#participation-list > *']
];

test.describe('layout regression guards', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  for (const [pageId, cards] of views) {
    test(`${pageId}: cards remain inside viewport and do not overlap`, async ({ page }) => {
      await go(page, pageId);
      await assertNoHorizontalOverflow(page);
      const count = await page.locator(cards).count();
      expect(count, `${pageId} should contain seeded content`).toBeGreaterThan(0);
      await assertNoOverlaps(page, cards);
      const bad = await page.locator(cards).evaluateAll(nodes => nodes.map(n => {
        const r = n.getBoundingClientRect();
        return { text:(n.textContent||'').trim().slice(0,40), left:r.left, right:r.right, width:r.width, height:r.height };
      }).filter(r => r.left < -2 || r.right > innerWidth + 2 || r.width < 80 || r.height < 24));
      expect(bad).toEqual([]);
    });
  }

  test('creator metadata stays inside cards', async ({ page }) => {
    for (const [pageId, cardSelector] of [['events','.event'],['projects','.project-card'],['communities','.community']]) {
      await go(page, pageId);
      const bad = await page.locator(cardSelector).evaluateAll(cards => cards.flatMap(card => {
        const cr = card.getBoundingClientRect();
        return [...card.querySelectorAll('.creator-compact,.creator-link,.creator-meta')].filter(x => {
          const r=x.getBoundingClientRect(); return r.left < cr.left-2 || r.right > cr.right+2 || r.top < cr.top-2 || r.bottom > cr.bottom+2;
        }).map(x => (x.textContent||'').trim());
      }));
      expect(bad, `${pageId} creator metadata escaped card`).toEqual([]);
    }
  });

  test('navigation adapts cleanly to desktop and mobile viewport', async ({ page }, testInfo) => {
    await assertNoHorizontalOverflow(page);
    if (testInfo.project.name === 'mobile') {
      await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
      await expect(page.locator('#appSidebar')).not.toBeVisible();
      const navBox = await page.locator('.mobile-bottom-nav').boundingBox();
      expect(navBox.height).toBeLessThanOrEqual(90);
    } else {
      await expect(page.locator('.mobile-bottom-nav')).not.toBeVisible();
      await expect(page.locator('#appSidebar')).toBeVisible();
    }
  });
});
