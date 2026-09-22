const { test, expect } = require('@playwright/test');
const {
  waitForApp,
  loginAsMax,
  go,
  uniqueName,
  captureRuntimeFailures,
  openIdentity,
  fillObjectForm,
  createGlobalObject,
  createParticipation,
  openOwnedCommunity,
  openVisibleOtherPerson,
  blockOpenPerson,
  downloadPrivacyExport
} = require('../helpers/gold');

test.setTimeout(30_000);

test.describe('Goldstandard Desktop: echte Nutzerabläufe', () => {
  test.beforeEach(async ({ page }) => {
    page.__goldGuard = captureRuntimeFailures(page);
    await loginAsMax(page);
  });

  test.afterEach(async ({ page }) => page.__goldGuard.assertClean());

  test('Anmeldung, Reload, vollständige Abmeldung und erneute Anmeldung', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width: 1440, height: 1000 },
      storageState: { cookies: [], origins: [] }
    });
    const authPage = await context.newPage();
    const guard = captureRuntimeFailures(authPage);
    await loginAsMax(authPage);
    await authPage.reload();
    await expect(authPage.locator('#userName')).toHaveText('Max');

    await openIdentity(authPage);
    await expect(authPage.locator('#logout')).toBeVisible();
    await expect(authPage.locator('#saveCommunication')).toBeVisible();
    await expect(authPage.locator('#dmPermission option[value="members"]')).toHaveText('Freunde oder Menschen aus gemeinsamen Communities');
    await authPage.locator('#logout').click();
    await expect(authPage.locator('#modal')).not.toHaveClass(/show/);
    await expect(authPage.locator('#userName')).toHaveText('Nicht angemeldet');
    await expect(authPage.locator('#userMeta')).toHaveText('Anmelden');

    await authPage.locator('#quickCreate').click();
    await expect(authPage.locator('#loginEmail')).toBeVisible();
    await expect(authPage.locator('[data-create-type]')).toHaveCount(0);
    await authPage.locator('#loginEmail').fill('max@bottomupparti.local');
    await authPage.locator('#loginPassword').fill('demo123');
    await authPage.locator('#login').click();
    await expect(authPage.locator('#userName')).toHaveText('Max');
    guard.assertClean();
    await context.close();
  });

  for (const [type, pageId, list] of [
    ['event', 'events', '#events-list'],
    ['project', 'projects', '#projects-list']
  ]) {
    test(`${type}: global erstellen, öffnen und nach Reload wiederfinden`, async ({ page }) => {
      const name = uniqueName(`Gold ${type}`);
      await createGlobalObject(page, type, name);
      await page.reload();
      await go(page, pageId);
      await expect(page.locator(list)).toContainText(name);
      await page.getByText(name, { exact: true }).last().click();
      await expect(page.locator('#modalContent')).toContainText(name);
      const follow = page.locator(`[data-follow-type="${type}"][data-follow-id]`).first();
      await expect(follow).toBeVisible();
      await follow.click();
      await expect(follow).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await go(page, pageId);
      await page.getByText(name, { exact: true }).last().click();
      await expect(page.locator(`[data-follow-type="${type}"][aria-pressed="true"]`)).toBeVisible();
      await expect(page.locator('[data-otab="tasks"]')).toBeVisible();
      const trustSurface = page.locator('[data-otab="trust"], [data-otab="info"]').first();
      await expect(trustSurface).toBeVisible();
      await trustSurface.click();
      await expect(page.locator('#modalContent')).toContainText('Vertrauen & Herkunft');
    });
  }

  test('Beteiligung global erstellen, öffnen und nach Reload wiederfinden', async ({ page }) => {
    const name = uniqueName('Gold Beteiligung');
    await createParticipation(page, name);
    await page.reload();
    await go(page, 'participation');
    await expect(page.locator('#participation-list')).toContainText(name);
    await page.getByText(name, { exact: true }).last().click();
    await expect(page.locator('#modalContent')).toContainText(name);
    const follow = page.locator('[data-follow-type="participation"][data-follow-id]').first();
    await expect(follow).toBeVisible();
    await follow.click();
    await expect(follow).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await go(page, 'participation');
    await page.getByText(name, { exact: true }).last().click();
    await expect(page.locator('[data-follow-type="participation"][aria-pressed="true"]')).toBeVisible();
  });

  for (const [type, tab, button, listSelector] of [
    ['event', 'events', '#createSpaceEvent', '.event-clickable'],
    ['project', 'projects', '#createSpaceProject', '.project-clickable']
  ]) {
    test(`${type}: im Community-Space erstellen und sofort eingebettet sehen`, async ({ page }) => {
      const name = uniqueName(`Space ${type}`);
      await openOwnedCommunity(page);
      await page.locator(`[data-ctab="${tab}"]`).click();
      await page.locator(button).click();
      await fillObjectForm(page, type, name);
      await page.locator('#saveCreate').click();
      await expect(page.locator('#community-space')).toHaveClass(/active/);
      await expect(page.locator('#communitySpaceContent')).toContainText(name);
      await page.reload();
      await openOwnedCommunity(page);
      await page.locator(`[data-ctab="${tab}"]`).click();
      await expect(page.locator(`#communitySpaceContent ${listSelector}`).filter({ hasText: name })).toHaveCount(1);
    });
  }

  test('Beteiligung im Community-Space erstellen und eingebettet wiederfinden', async ({ page }) => {
    const name = uniqueName('Space Beteiligung');
    await openOwnedCommunity(page);
    await page.locator('[data-ctab="participation"]').click();
    await page.locator('#createSpaceParticipation').click();
    await expect(page.locator('#creationOwnerSpace')).toHaveValue(/.+/);
    expect(await page.locator('input[name="place"]:checked').count()).toBeGreaterThan(0);
    await page.locator('#formName').fill(name);
    await page.locator('#formDescription').fill('Beteiligung mit identischer Space-Logik.');
    await page.locator('#initialInfoBody').fill('Community-Kontext muss erhalten bleiben.');
    await page.locator('#saveParticipation').click();
    await expect(page.locator('#community-space')).toHaveClass(/active/);
    await expect(page.locator('#communitySpaceContent')).toContainText(name);
    await page.reload();
    await openOwnedCommunity(page);
    await page.locator('[data-ctab="participation"]').click();
    await expect(page.locator('#communitySpaceContent')).toContainText(name);
  });

  test('Unterraum anlegen und dort dasselbe Projekt-Verhalten nutzen', async ({ page }) => {
    const subspace = uniqueName('Gold Unterraum');
    const project = uniqueName('Unterraum Projekt');
    await openOwnedCommunity(page);
    await page.locator('[data-ctab="spaces"]').click();
    await page.locator('#createSubspace').click();
    await page.locator('#subspaceName').fill(subspace);
    await page.locator('#subspaceDescription').fill('Goldstandard-Unterraum');
    await page.locator('#saveSubspace').click();
    await expect(page.locator('#communitySpaceContent')).toContainText(subspace);
    await page.locator('[data-ctab="projects"]').click();
    await page.locator('#createSpaceProject').click();
    await fillObjectForm(page, 'project', project);
    await page.locator('#saveCreate').click();
    await expect(page.locator('#communitySpaceContent')).toContainText(project);
  });

  test('Lokal: gefülltes Ortsmenü, Ortswechsel und Themenverknüpfung', async ({ page }) => {
    await go(page, 'discover');
    await page.locator('[data-discover-tab="local"]').click();
    const select = page.locator('#discoverLocalPlace');
    await expect(select).toBeVisible();
    expect(await select.locator('option').count()).toBeGreaterThan(1);
    const values = await select.locator('option').evaluateAll(options => options.map(o => o.value));
    await select.selectOption(values[1]);
    const selectedName = await select.locator('option:checked').textContent();
    await expect(page.locator('#discoverHeading')).toContainText(selectedName.trim());
    await expect(page.locator('#discoverLocalPlaceName')).toHaveText(selectedName.trim());
    await expect(page.locator('#discover-list')).not.toBeEmpty();
    const topic = page.locator('#discoverContextOverview [data-context-topic]').first();
    await expect(topic).toBeVisible();
    await expect(topic).toHaveAttribute('data-context-place-filter', values[1]);
    await topic.click();
    await expect(page.locator('#topics')).toHaveClass(/active/);
    await expect(page.locator('#topic-grid .topic-detail')).toBeVisible();
  });

  test('Vernetzte Navigation über Ort, Thema, Community, Person und Hauptlisten', async ({ page }) => {
    await go(page, 'places');
    await page.locator('[data-place]').first().click();
    await expect(page.locator('#place-results .context-overview')).toBeVisible();
    await page.locator('#place-results [data-context-topic]').first().click();
    await expect(page.locator('#topic-grid .topic-detail')).toBeVisible();

    await go(page, 'communities');
    await page.locator('#communities-list .community').first().click();
    await expect(page.locator('#community-space')).toHaveClass(/active/);

    await go(page, 'people');
    await page.locator('#people-list .person-card').first().click();
    await expect(page.locator('#person-space')).toHaveClass(/active/);
  });

  test('Unterhaltung starten, Nachricht senden und nach Reload wiederfinden', async ({ page }) => {
    const message = uniqueName('Gold Nachricht');
    await go(page, 'messages');
    await page.locator('#createConversation').click();
    const recipient = await page.locator('#conversationPeople option').first().getAttribute('value');
    await page.locator('#conversationPeople').selectOption(recipient);
    await page.locator('#saveConversation').click();
    await expect(page.locator('#messageComposer')).toBeVisible();
    await page.locator('#messageBody').fill(message);
    await page.locator('#messageComposer button[type="submit"]').click();
    await expect(page.locator('#messageThread')).toContainText(message);
    await page.reload();
    await go(page, 'messages');
    await page.locator('#conversationList [data-conversation]').first().click();
    await expect(page.locator('#messageThread')).toContainText(message);
  });

  test('Projektrolle wird aus dem übergeordneten Space sicher abgeleitet', async ({ page }) => {
    const response = await page.request.get('/api/permissions/project/p1');
    expect(response.status()).toBe(200);
    const permissions = await response.json();
    expect(permissions.my_role).toBe('member');
  });

  test('Blockierte Personen zentral verwalten und kontrolliert entblocken', async ({ page }) => {
    const target = await openVisibleOtherPerson(page);
    await blockOpenPerson(page, target.id);

    await page.locator('#manageBlockedPeople').click();
    const blockedList = page.locator('#blockedPeopleList');
    const blockedPerson = blockedList.locator(`[data-unblock-user="${target.id}"]`);
    await expect(blockedList).toContainText(target.name);
    await expect(blockedPerson).toBeVisible();
    await expect(blockedList).not.toContainText('@bottomupparti.local');
    const unblockWarning = blockedList.locator('.notice');
    await expect(unblockWarning).toContainText('Freundschaften und Folgen');
    await expect(unblockWarning).toContainText('nicht automatisch wieder her');
    await expect(unblockWarning).toContainText('ausdrücklich neu aufgebaut');

    page.once('dialog', dialog => dialog.accept());
    await blockedPerson.click();
    await expect(blockedList.locator(`[data-unblock-user="${target.id}"]`)).toHaveCount(0);
    await expect(blockedList).toContainText('Keine Personen blockiert');
  });

  test('Datenschutzexport über das persönliche Privacy-Center herunterladen', async ({ page }) => {
    const exported = await downloadPrivacyExport(page);
    expect(exported.exported_at).toBeTruthy();
    expect(exported.schema_inventory).toBeInstanceOf(Array);
  });

  test('Benachrichtigung lesen aktualisiert Liste und Zähler ohne Seitenreload', async ({ page, browser }) => {
    await page.locator('#notificationButton').click();
    await expect(page.locator('.notification-list')).toBeVisible();
    if (await page.locator('#readAll').count()) await page.locator('#readAll').click();
    await expect(page.locator('#notificationCount')).toBeHidden();
    await page.locator('#closeModal').click();

    await go(page, 'people');
    const annaCard = page.locator('#people-list .person-card[data-user="u-anna"]');
    await expect(annaCard).toBeVisible();
    await annaCard.click();
    await page.locator('[data-friend-request="u-anna"]').click();
    await expect(page.locator('.friendship-state')).toContainText('Anfrage gesendet');

    const annaContext = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width: 1440, height: 1000 },
      storageState: { cookies: [], origins: [] }
    });
    try {
      const anna = await annaContext.newPage();
      await waitForApp(anna);
      await openIdentity(anna);
      await anna.locator('#loginEmail').fill('anna@bottomupparti.local');
      await anna.locator('#loginPassword').fill('demo123');
      await anna.locator('#login').click();
      await expect(anna.locator('#userName')).toHaveText('Anna');
      await anna.locator('#myFriendsLink').click();
      await expect(anna.locator('[data-friend-accept="u-max"]')).toBeVisible();
      await anna.locator('[data-friend-accept="u-max"]').click();
      await expect(anna.locator('#modalContent')).toContainText('Befreundet');
    } finally {
      await annaContext.close();
    }

    await page.locator('#notificationButton').click();
    const notice = page.locator('.notification-item.unread').filter({ hasText: 'Freundschaftsanfrage angenommen' });
    await expect(notice).toBeVisible();
    await expect(page.locator('#notificationCount')).toHaveText('1');
    await notice.click();
    await expect(page.locator('.notification-item.unread')).toHaveCount(0);
    await expect(page.locator('#notificationCount')).toBeHidden();
    await page.locator('#closeModal').click();
    await expect(page.locator('.friendship-state')).toContainText('Befreundet');
  });
});

test.describe('Goldstandard Desktop: anonymer Zustand', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('anonymer Start bleibt unangemeldet und geschützt', async ({ page }) => {
    const guard = captureRuntimeFailures(page);
    await waitForApp(page);
    await expect(page.locator('#userName')).toHaveText('Nicht angemeldet');
    await page.locator('#quickCreate').click();
    await expect(page.locator('#loginEmail')).toBeVisible();
    guard.assertClean();
  });
});
