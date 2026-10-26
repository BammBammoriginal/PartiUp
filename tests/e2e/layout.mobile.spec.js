const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow, openCardByTitle } = require('../helpers/app');

// Secondary meta actions (Melden, Info, Einstellungen) are deliberately small and
// unobtrusive (owner decision 2026-10-26), but every control must still meet the
// WCAG 2.2 minimum target size of 24 px. Controls inside a horizontally scrollable
// strip may sit outside the viewport; the strip itself must not.
async function assertModalControlsReachable(page) {
  const problems = await page.locator('#modalContent button').evaluateAll(nodes => {
    const scrollStrip = n => {
      for (let el = n.parentElement; el && el.id !== 'modalContent'; el = el.parentElement) {
        const overflowX = getComputedStyle(el).overflowX;
        if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) return el;
      }
      return null;
    };
    const out = [];
    for (const n of nodes.filter(node => node.offsetParent !== null)) {
      const r = n.getBoundingClientRect();
      const name = (n.textContent || n.getAttribute('aria-label') || '').trim().slice(0, 40);
      if (r.height < 24) out.push({ name, issue: 'kleiner als 24 px', height: Math.round(r.height) });
      const strip = scrollStrip(n);
      const box = (strip || n).getBoundingClientRect();
      if (box.left < -2 || box.right > innerWidth + 2) out.push({ name, issue: strip ? 'scrollbare Leiste ragt aus dem Bildschirm' : 'ragt aus dem Bildschirm', right: Math.round(box.right) });
    }
    return out;
  });
  expect(problems).toEqual([]);
}

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
    await openCardByTitle(page.locator('#communities-list .community').first());
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
    await openCardByTitle(page.locator('#events-list .event').first());
    await expect(page.locator('#modal')).toHaveClass(/show/);
    await assertNoHorizontalOverflow(page);
    // Participation is the primary job of this dialog: its actions get a comfortable touch target.
    const actions = page.locator('#modalContent').getByRole('button', { name: /^(Teilnehmen|✓ Teilnahme|⏳ Teilnahme|⏳ Warteliste|✓? ?Vielleicht|Absagen|Bestätigen|Ablehnen)/ });
    expect(await actions.count()).toBeGreaterThan(0);
    const smallActions = await actions.evaluateAll(nodes => nodes.filter(n => n.offsetParent !== null).map(n => ({ name: n.textContent.trim(), height: Math.round(n.getBoundingClientRect().height) })).filter(a => a.height < 40));
    expect(smallActions).toEqual([]);
    const participants = page.locator('[data-otab="participants"]');
    await expect(participants).toBeVisible();
    await participants.click();
    await assertNoHorizontalOverflow(page);
    await assertModalControlsReachable(page);
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
