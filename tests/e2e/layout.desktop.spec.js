const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow, assertNoOverlaps } = require('../helpers/app');

const views = [
  ['discover', '#discover-list > *'],
  ['communities', '#communities-list .community'],
  ['events', '#events-list .event'],
  ['projects', '#projects-list .project-card'],
  ['participation', '#participation-list > *']
];

test.describe('desktop layout regression guards', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  test('desktop shell uses sidebar and hides bottom nav', async ({ page }) => {
    await expect(page.locator('#appSidebar')).toBeVisible();
    await expect(page.locator('.mobile-bottom-nav')).not.toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  for (const [pageId, cards] of views) {
    test(`${pageId}: cards stay in viewport without overlap`, async ({ page }) => {
      await go(page, pageId);
      await assertNoHorizontalOverflow(page);
      expect(await page.locator(cards).count()).toBeGreaterThan(0);
      await assertNoOverlaps(page, cards);
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
      expect(bad).toEqual([]);
    }
  });
});
