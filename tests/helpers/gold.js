const { expect } = require('@playwright/test');
const { waitForApp, loginAsMax, go, assertNoHorizontalOverflow } = require('./app');

function uniqueName(prefix) {
  return `${prefix} ${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function captureRuntimeFailures(page) {
  const failures = [];
  page.on('pageerror', error => failures.push(`pageerror: ${error.message || error}`));
  page.on('requestfailed', request => {
    const reason = request.failure()?.errorText || 'unknown';
    if (!/ERR_ABORTED/i.test(reason)) failures.push(`requestfailed: ${request.method()} ${request.url()} (${reason})`);
  });
  page.on('response', response => {
    if (response.status() >= 500) failures.push(`response ${response.status()}: ${response.request().method()} ${response.url()}`);
  });
  return {
    failures,
    assertClean() {
      expect(failures, 'Unbehandelte Browser-/Serverfehler').toEqual([]);
    }
  };
}

async function openIdentity(page) {
  const identity = page.locator('#identityButton');
  const isMobile = await page.evaluate(() => matchMedia('(max-width: 850px)').matches);
  const drawerOpen = await page.locator('.app').evaluate(el => el.classList.contains('menu-open'));
  if (isMobile && !drawerOpen) {
    await page.locator('#mobileMore').click();
    await expect(page.locator('.app')).toHaveClass(/menu-open/);
  }
  if (!(await identity.isVisible())) {
    await page.locator('#mobileMenu').click();
    await expect(identity).toBeVisible();
  }
  await expect(identity).toBeInViewport();
  await identity.click();
}

async function closeMobileDrawer(page) {
  const point = await page.evaluate(() => {
    const backdrop = document.querySelector('#navBackdrop');
    const sidebar = document.querySelector('#appSidebar');
    if (!backdrop || !sidebar) return null;
    const right = sidebar.getBoundingClientRect().right;
    const xs = [Math.min(innerWidth - 8, right + 24), innerWidth - 8];
    const ys = [innerHeight / 3, innerHeight / 2, innerHeight * 0.7];
    for (const x of xs) for (const y of ys) {
      const hit = document.elementFromPoint(x, y);
      if (hit === backdrop || hit?.closest?.('#navBackdrop')) return { x, y };
    }
    return null;
  });
  expect(point, 'Kein frei bedienbarer Punkt auf dem mobilen Backdrop').toBeTruthy();
  // Use the real backdrop control after selecting a point outside the drawer.
  // Coordinate-only clicks can land on a transformed sibling during the
  // mobile drawer transition even though the backdrop is visible.
  await page.locator('#navBackdrop').click({ force: true });
  await expect(page.locator('.app')).not.toHaveClass(/menu-open/);
}

async function openCreation(page, type) {
  await page.locator('#quickCreate').click();
  await expect(page.locator('[data-create-type]')).toHaveCount(4);
  await page.locator(`[data-create-type="${type}"]`).click();
  await expect(page.locator('#formName')).toBeVisible();
}

async function chooseFirst(page, name) {
  const input = page.locator(`input[name="${name}"]`).first();
  if (await input.count()) await input.check();
}

async function fillObjectForm(page, type, name) {
  await page.locator('#formName').fill(name);
  await page.locator('#formDescription').fill(`Goldstandard-Prüfung für ${name}`);
  await chooseFirst(page, 'place');
  await chooseFirst(page, 'topic');
  if (type === 'event') {
    await page.locator('#formStartAt').fill('2026-10-20T18:00:00+02:00');
    await page.locator('#formEndAt').fill('2026-10-20T20:00:00+02:00');
  }
}

async function createGlobalObject(page, type, name) {
  await openCreation(page, type);
  await fillObjectForm(page, type, name);
  await page.locator('#saveCreate').click();
  await expect(page.locator('#modal')).toHaveClass(/show/);
  await expect(page.locator('#modalContent')).toContainText(name);
}

async function createParticipation(page, name) {
  await openCreation(page, 'participation');
  await page.locator('#formName').fill(name);
  await page.locator('#formDescription').fill(`Goldstandard-Prüfung für ${name}`);
  await page.locator('#initialInfoBody').fill('Nach Neuladen weiterhin auffindbar.');
  await chooseFirst(page, 'place');
  await chooseFirst(page, 'topic');
  await page.locator('#saveParticipation').click();
  await expect(page.locator('#participation')).toHaveClass(/active/);
  await expect(page.locator('#participation-list')).toContainText(name);
}

async function openOwnedCommunity(page) {
  await go(page, 'communities');
  const card = page.locator('#communities-list .community[data-mine="1"]').filter({ hasText: /admin|moderator/ }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('#community-space')).toHaveClass(/active/);
  return page.locator('#communitySpaceContent h2').first().textContent();
}

async function openVisibleOtherPerson(page) {
  await go(page, 'people');
  const person = page.locator('#people-list .person-card:not([data-user="u-max"])').first();
  await expect(person, 'Keine andere ausdrücklich sichtbare Person für den Sicherheitsablauf').toBeVisible();
  const id = await person.getAttribute('data-user');
  const name = (await person.locator('b').first().textContent()).trim();
  expect(id, 'Sichtbare Person hat keine stabile ID').toBeTruthy();
  expect(name, 'Sichtbare Person hat keinen Namen').toBeTruthy();
  // The card contains independent follow/status actions. Click the visible
  // name so viewport/layout changes cannot trigger a nested control.
  await person.locator('.grow > b').click();
  await expect(page.locator('#person-space')).toHaveClass(/active/);
  await expect(page.locator('#personSpaceContent h2')).toHaveText(name);
  return { id, name };
}

async function blockOpenPerson(page, personId) {
  const actions = page.locator('#personSpaceContent details.network-more');
  const summary = actions.locator('summary');
  const block = actions.locator('#blockPerson');
  await expect(summary, 'Menü „Weitere Aktionen“ ist nicht sichtbar').toBeVisible();
  await summary.click();
  await expect(actions).toHaveAttribute('open', '');
  await expect(block, 'Blockieren ist im geöffneten Aktionsmenü nicht sichtbar').toBeVisible();
  const blocked = page.waitForResponse(response =>
    response.url().endsWith(`/api/users/${encodeURIComponent(personId)}/block`) &&
    response.request().method() === 'POST'
  );
  page.once('dialog', dialog => dialog.accept());
  await block.click();
  expect((await blocked).status()).toBe(200);
  await expect(page.locator('#toast')).toHaveText('Person blockiert');
}

async function downloadPrivacyExport(page) {
  await openIdentity(page);
  const link = page.locator('#downloadPrivacyExport');
  await expect(link, 'Datenschutzexport ist im persönlichen Privacy-Center nicht erreichbar').toBeVisible();
  await expect(link).toHaveAttribute('href', '/api/privacy/export');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    link.click()
  ]);
  expect(download.suggestedFilename()).toBe('partiup-meine-daten.json');
  const stream = await download.createReadStream();
  let raw = '';
  for await (const chunk of stream) raw += chunk.toString('utf8');
  const data = JSON.parse(raw);
  expect(data.account?.id).toBe('u-max');
  const serialized = JSON.stringify(data);
  for (const secret of ['password_hash', 'password_salt', 'session_token', 'csrf_token', 'private_key_pem']) {
    expect(serialized).not.toContain(`"${secret}"`);
  }
  return data;
}

module.exports = {
  expect,
  waitForApp,
  loginAsMax,
  go,
  assertNoHorizontalOverflow,
  uniqueName,
  captureRuntimeFailures,
  openIdentity,
  closeMobileDrawer,
  openCreation,
  fillObjectForm,
  createGlobalObject,
  createParticipation,
  openOwnedCommunity,
  openVisibleOtherPerson,
  blockOpenPerson,
  downloadPrivacyExport
};
