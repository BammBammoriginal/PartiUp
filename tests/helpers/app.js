const { expect } = require('@playwright/test');

async function waitForApp(page) {
  const bootstrap = page.waitForResponse(response =>
    response.url().endsWith('/api/bootstrap') &&
    response.request().method() === 'GET'
  );
  await page.goto('/');
  expect((await bootstrap).status()).toBe(200);
  await expect(page.locator('#mainContent')).toBeAttached();
  await expect(page.locator('#title')).toHaveText(/.+/);
  // This starts as a static "–" in index.html and changes only after the
  // bootstrap data has been rendered. A 200 response alone is not UI readiness.
  await expect(page.locator('#friendCount')).not.toHaveText('–');
}

async function realBrowserLogin(page) {
  const name = page.locator('#userName');
  if ((await name.textContent()) === 'Max') return;
  await expect(name).toHaveText('Nicht angemeldet');

  const isMobile = await page.evaluate(() => matchMedia('(max-width: 850px)').matches);
  if (isMobile) {
    const more = page.locator('#mobileMore');
    const menu = page.locator('#mobileMenu');
    if (await more.isVisible()) await more.click();
    else {
      await expect(menu).toBeVisible();
      await menu.click();
    }
    await expect(page.locator('.app')).toHaveClass(/menu-open/);
  }

  const identity = page.locator('#identityButton');
  await expect(identity).toBeVisible();
  await expect(identity).toBeInViewport();
  await identity.click();
  await expect(page.locator('#loginEmail')).toBeVisible();
  await page.locator('#loginEmail').fill('max@bottomupparti.local');
  await page.locator('#loginPassword').fill('demo123');
  await page.locator('#login').click();
  await expect(name).toHaveText('Max', { timeout: 5_000 });
  const cookies = await page.context().cookies();
  expect(cookies.some(cookie => cookie.name === 'bup_session'), 'QA browser session cookie missing after visible login').toBeTruthy();

  if (isMobile && await page.locator('.app').evaluate(el => el.classList.contains('menu-open'))) {
    const backdrop = page.locator('#navBackdrop');
    const sidebar = page.locator('#appSidebar');
    await expect(backdrop).toBeVisible();
    await expect(sidebar).toHaveCSS('transform', 'none');
    const point = await page.evaluate(() => {
      const backdropEl = document.querySelector('#navBackdrop');
      if (!backdropEl) return null;
      const xs = [innerWidth - 8];
      const ys = [innerHeight / 3, innerHeight / 2, innerHeight * 0.7];
      for (const x of xs) for (const y of ys) {
        const hit = document.elementFromPoint(x, y);
        if (hit === backdropEl || hit?.closest?.('#navBackdrop')) return { x, y };
      }
      return null;
    });
    expect(point, 'Kein frei bedienbarer Punkt auf dem mobilen Backdrop').toBeTruthy();
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('.app')).not.toHaveClass(/menu-open/);
  }
}

async function assertAuthenticated(page) {
  await waitForApp(page);
  const name = page.locator('#userName');
  if ((await name.textContent()) !== 'Max') await realBrowserLogin(page);
  await expect(name).toHaveText('Max');
}

async function loginAsMax(page) {
  await waitForApp(page);
  const name = page.locator('#userName');
  if ((await name.textContent()) !== 'Max') await realBrowserLogin(page);
  await expect(name).toHaveText('Max');
}

async function go(page, target) {
  // page.reload() resolves before the async bootstrap has restored state.user.
  // Navigating to messages earlier renders the anonymous empty list once;
  // the later bootstrap render does not call loadConversations again.
  await expect(page.locator('#friendCount')).not.toHaveText('–');
  const isMobile = await page.evaluate(() => matchMedia('(max-width: 850px)').matches);

  if (!isMobile) {
    const button = page.locator(`#appSidebar [data-page="${target}"]`).first();
    await expect(button).toBeVisible();
    await button.click();
  } else {
    const direct = page.locator(`.mobile-bottom-nav [data-page="${target}"]`).first();
    if (await direct.count() && await direct.isVisible()) {
      await direct.click();
    } else {
      const more = page.locator('#mobileMore');
      await expect(more).toBeVisible();
      await more.click();
      await expect(page.locator('.app')).toHaveClass(/menu-open/);
      const drawerButton = page.locator(`#appSidebar [data-page="${target}"]`).first();
      await expect(drawerButton).toBeVisible();
      await drawerButton.click();
    }
  }

  await expect(page.locator(`#${target}`)).toHaveClass(/active/);
}

async function assertNoHorizontalOverflow(page) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  expect(result.scrollWidth, `document overflow ${JSON.stringify(result)}`).toBeLessThanOrEqual(result.clientWidth + 2);
  expect(result.bodyScrollWidth, `body overflow ${JSON.stringify(result)}`).toBeLessThanOrEqual(result.clientWidth + 2);
}

async function assertNoOverlaps(page, selector) {
  const overlaps = await page.locator(selector).evaluateAll(nodes => {
    const rs = nodes.filter(n => {
      const s = getComputedStyle(n);
      return s.display !== 'none' && s.visibility !== 'hidden';
    }).map((n, i) => ({ i, r: n.getBoundingClientRect(), text: (n.textContent || '').trim().slice(0, 50) }));
    const out = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i].r, b = rs[j].r;
      const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (ix * iy > 24) out.push([rs[i].text, rs[j].text, Math.round(ix * iy)]);
    }
    return out;
  });
  expect(overlaps, `overlapping elements for ${selector}`).toEqual([]);
}

// Cards carry their own title as a native button that points back at the card's
// object. Tapping it is what a person does; tapping the card centre can land on a
// place/topic chip depending on viewport and font metrics.
const CARD_IDENTITIES = [['id', 'community'], ['event', 'event'], ['project', 'project'], ['participation', 'participation'], ['user', 'person']];

async function openCardByTitle(card) {
  await expect(card).toBeVisible();
  for (const [attribute, type] of CARD_IDENTITIES) {
    const id = await card.getAttribute(`data-${attribute}`);
    if (!id) continue;
    const title = card.locator(`[data-connection-type="${type}"][data-connection-id="${id}"]`);
    await expect(title).toHaveCount(1);
    const name = (await title.innerText()).trim();
    await title.click();
    return name;
  }
  throw new Error('Card has no known object identity attribute');
}

module.exports = { waitForApp, assertAuthenticated, loginAsMax, go, assertNoHorizontalOverflow, assertNoOverlaps, openCardByTitle };
