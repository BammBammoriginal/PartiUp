const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go, assertNoHorizontalOverflow } = require('../helpers/app');

test.describe('core product smoke paths', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  for (const pageId of ['home','discover','communities','people','events','projects','participation']) {
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
    const first = page.locator('#communities-list .community').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.locator('#community-space')).toHaveClass(/active/);
    await expect(page.locator('#communitySpaceContent')).toContainText(/Übersicht|Feed/);
  });

  test('person profile opens from people list', async ({ page }) => {
    await go(page, 'people');
    const person = page.locator('#people-list .person-card').first();
    await expect(person).toBeVisible();
    await person.click();
    await expect(page.locator('#person-space')).toHaveClass(/active/);
    await expect(page.locator('#personSpaceContent')).toContainText(/NUTZERPROFIL|Verifizierungsstufe/);
  });

  test('event can be opened and has participation action', async ({ page }) => {
    await go(page, 'events');
    const event = page.locator('#events-list .event-clickable').first();
    await expect(event).toBeVisible();
    await event.click();
    await expect(page.locator('#modal')).toHaveClass(/show/);
    await expect(page.locator('#modalContent')).toContainText(/Nehme teil|Teilnahme/);
  });
});
