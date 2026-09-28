const { expect } = require('@playwright/test');
const sharp = require('sharp');
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
  await expect(page.locator('#appSidebar')).toHaveCSS('transform', 'none');
  const point = await page.evaluate(() => {
    const backdrop = document.querySelector('#navBackdrop');
    if (!backdrop) return null;
    const xs = [innerWidth - 8];
    const ys = [innerHeight / 3, innerHeight / 2, innerHeight * 0.7];
    for (const x of xs) for (const y of ys) {
      const hit = document.elementFromPoint(x, y);
      if (hit === backdrop || hit?.closest?.('#navBackdrop')) return { x, y };
    }
    return null;
  });
  expect(point, 'Kein frei bedienbarer Punkt auf dem mobilen Backdrop').toBeTruthy();
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.app')).not.toHaveClass(/menu-open/);
}

async function openCreation(page, type) {
  await page.locator('#quickCreate').click();
  await expect(page.locator('[data-create-type]')).toHaveCount(4);
  await page.locator(`[data-create-type="${type}"]`).click();
  await expect(page.locator('#formName')).toBeVisible();
}

async function chooseFirst(page, name) {
  const input = name === 'place' ? page.locator('input[name="place"][value="erl"]') : page.locator(`input[name="${name}"]`).first();
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

async function openAccountDeletion(page) {
  await openIdentity(page);
  await expect(page.locator('#openDeleteAccount'), 'Kontolöschung ist im persönlichen Privacy-Center nicht erreichbar').toBeVisible();
  await page.locator('#openDeleteAccount').click();
  await expect(page.locator('#deleteAccountTitle')).toHaveText('Konto endgültig löschen');
  for (const consequence of ['Anmeldedaten', 'Mitgliedschaften', 'anonymisiert', 'Moderationsnachweise', 'Fediverse-Server']) {
    await expect(page.locator('.privacy-account-deletion')).toContainText(consequence);
  }
  await expect(page.locator('#deleteAccount')).toBeDisabled();
}

async function submitAccountDeletion(page, password) {
  await page.locator('#deleteAccountPassword').fill(password);
  await page.locator('#deleteAccountAcknowledge').check();
  await expect(page.locator('#deleteAccount')).toBeEnabled();
  const response = page.waitForResponse(result =>
    result.url().endsWith('/api/privacy/delete-account') &&
    result.request().method() === 'POST'
  );
  await page.locator('#deleteAccount').click();
  return response;
}

const chatImageFixture = {
  name: 'partiup-chatbild.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWOIdVv1H4QZYAwATi4JMbpSuiMAAAAASUVORK5CYII=', 'base64')
};

async function selectChatImage(page, name = chatImageFixture.name, dimensions = null) {
  const fixture = dimensions
    ? {
        name,
        mimeType: 'image/png',
        buffer: await sharp({
          create: {
            width: dimensions.width,
            height: dimensions.height,
            channels: 4,
            background: dimensions.background || '#8bc8b3'
          }
        }).png().toBuffer()
      }
    : { ...chatImageFixture, name };
  await page.locator('#messageImage').setInputFiles(fixture);
  const preview = page.locator('#messageImagePreview');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(name);
  await expect(preview).toContainText('wird erst beim Senden übertragen');
  await expect(preview.locator('img')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('#removeMessageImage')).toBeVisible();
  return preview;
}

async function assertChatMediaLayout(page, image, { maxWidth = 480, maxHeight = 360, expectedRatio = null } = {}) {
  await expect(image).toBeVisible();
  await expect(image).toHaveCSS('object-fit', 'contain');
  const imageBox = await image.boundingBox();
  const bubbleBox = await image.locator('xpath=ancestor::article[contains(@class,"message-bubble")]').boundingBox();
  const threadBox = await page.locator('#messageThread').boundingBox();
  expect(imageBox, 'Chatbild hat keine messbare Darstellung').toBeTruthy();
  expect(bubbleBox, 'Chatbild liegt nicht in einer Nachrichtenblase').toBeTruthy();
  expect(threadBox, 'Nachrichtenbereich hat keine messbare Darstellung').toBeTruthy();
  expect(imageBox.width).toBeLessThanOrEqual(maxWidth + 1);
  expect(imageBox.height).toBeLessThanOrEqual(maxHeight + 1);
  expect(imageBox.width).toBeLessThanOrEqual(bubbleBox.width + 1);
  expect(bubbleBox.width).toBeLessThanOrEqual(threadBox.width + 1);
  if (expectedRatio) expect(Math.abs((imageBox.width / imageBox.height) - expectedRatio)).toBeLessThan(0.03);
  await expect(page.locator('#messageComposer')).toBeVisible();
}

async function openAndCloseChatMediaViewer(page, image) {
  await image.click();
  const viewer = page.locator('#messageMediaViewer');
  await expect(viewer).toHaveAttribute('open', '');
  await expect(viewer.locator('img')).toHaveAttribute('src', await image.getAttribute('src'));
  await viewer.locator('[data-close-message-media]').click();
  await expect(viewer).not.toHaveAttribute('open', '');
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
  downloadPrivacyExport,
  openAccountDeletion,
  submitAccountDeletion,
  selectChatImage,
  assertChatMediaLayout,
  openAndCloseChatMediaViewer
};
