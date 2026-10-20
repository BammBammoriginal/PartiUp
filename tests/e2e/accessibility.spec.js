const { test, expect } = require('@playwright/test');
const { assertAuthenticated, go } = require('../helpers/app');

test.describe('lightweight accessibility / DOM integrity gates', () => {
  test.beforeEach(async ({ page }) => assertAuthenticated(page));

  test('profile card primary action is a native keyboard control',async({page})=>{
    await go(page,'people');
    const title=page.locator('#people-list .person-card button.card-primary').first();
    await expect(title).toBeVisible();const name=await title.textContent();
    await title.focus();await title.press('Enter');
    await expect(page.locator('#person-space')).toHaveClass(/active/);
    await expect(page.locator('#personSpaceContent h2')).toHaveText(name);
  });

  test('no duplicate IDs on main screens', async ({ page }) => {
    for (const p of ['home','discover','communities','people','events','projects','participation']) {
      if (p !== 'home') await go(page,p);
      const duplicates = await page.evaluate(() => {
        const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
      });
      expect(duplicates, `duplicate IDs on ${p}`).toEqual([]);
    }
  });

  test('no nested interactive controls', async ({ page }) => {
    for (const p of ['discover','communities','people','events','projects','participation']) {
      await go(page,p);
      const nested = await page.evaluate(() => [...document.querySelectorAll('button button, button a, a button, a a, [role="button"] button, [role="button"] a')].map(x => x.outerHTML.slice(0,180)));
      expect(nested, `nested interactive controls on ${p}`).toEqual([]);
    }
  });

  test('visible buttons have accessible names', async ({ page }) => {
    await go(page,'events');
    const unnamed = await page.locator('button:visible').evaluateAll(btns => btns.filter(b => !(b.getAttribute('aria-label') || b.getAttribute('title') || (b.textContent||'').trim())).map(b=>b.outerHTML.slice(0,150)));
    expect(unnamed).toEqual([]);
  });

  test('images expose alt attributes', async ({ page }) => {
    await go(page,'discover');
    const missing = await page.locator('img').evaluateAll(imgs => imgs.filter(i => !i.hasAttribute('alt')).map(i=>i.outerHTML.slice(0,150)));
    expect(missing).toEqual([]);
  });
});
