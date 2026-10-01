const { test, expect } = require('@playwright/test');
const { loginAsMax, waitForApp, go, uniqueName, captureRuntimeFailures, openIdentity, closeMobileDrawer, openCreation, fillObjectForm, assertNoHorizontalOverflow } = require('./gold');

module.exports = function registerSpaceJourney() {
  test.setTimeout(60_000);

test('Space entdecken, beitreten, Beitrag schreiben und Beteiligung starten', async ({ page, browser }) => {
  const guard = captureRuntimeFailures(page);
  await loginAsMax(page);
  const name = uniqueName('Gemeinsamer Ablauf');
  await openCreation(page, 'community');
  await fillObjectForm(page, 'community', name);
  const created = page.waitForResponse(r => r.url().endsWith('/api/communities') && r.request().method() === 'POST');
  await page.locator('#saveCreate').click();
  expect((await created).ok()).toBeTruthy();
  await expect(page.locator('#community-space')).toHaveClass(/active/);
  await page.locator('[data-ctab="overview"]').click();
  await expect(page.locator('.space-journey')).toContainText(/mitwirken/i);
  await expect(page.locator('[data-space-start-participation]')).toBeVisible();
  await assertNoHorizontalOverflow(page);

  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3100', viewport: page.viewportSize(), storageState: { cookies: [], origins: [] } });
  try {
    const member = await context.newPage();
    const memberGuard = captureRuntimeFailures(member);
    await waitForApp(member);
    await openIdentity(member);
    await member.locator('#showRegistration').click();
    await member.locator('#registerName').fill('Neues Mitglied');
    await member.locator('#registerEmail').fill(`journey-${Date.now()}@example.test`);
    await member.locator('#registerPassword').fill('Sicheres-Testpasswort-2026');
    await member.locator('#register').click();
    await expect(member.locator('#userName')).toHaveText('Neues Mitglied');
    if (await member.locator('.app').evaluate(el => el.classList.contains('menu-open'))) await closeMobileDrawer(member);
    await go(member, 'discover');
    await member.locator('[data-discover-tab="communities"]').click();
    await member.locator('#search').fill(name);
    await member.locator('#discover-list .community').filter({ hasText: name }).locator('.grow > b').click();
    await expect(member.locator('[data-space-join]')).toBeVisible();
    await member.locator('[data-space-join]').click();
    await expect(member.locator('[data-space-next-tab="feed"]')).toBeVisible();
    await expect(member.locator('[data-space-start-participation]')).toHaveCount(0);
    await member.locator('[data-space-next-tab="feed"]').click();
    const post = uniqueName('Mein Beitrag');
    await member.locator('#newPostBody').fill(post);
    await member.locator('#publishPost').click();
    await expect(member.locator('#communitySpaceContent')).toContainText(post);

    await page.locator('[data-space-start-participation]').click();
    await expect(page.locator('#creationOwnerSpace')).toHaveValue(/.+/);
    await expect(page.locator('input[name="place"]:checked')).not.toHaveCount(0);
    const participation = uniqueName('Unser Meinungsbild');
    await page.locator('#formName').fill(participation);
    await page.locator('#formDescription').fill('Gemeinsame Entscheidung im Space.');
    await page.locator('#enablePoll').check();
    await page.locator('#initialInfoBody').fill('Welche Idee setzen wir zuerst um?');
    await page.locator('#initialPollQuestion').fill('Welche Idee?');
    await page.locator('#initialPollOptions').fill('Garten\nTreffpunkt');
    await page.locator('#saveParticipation').click();
    await expect(page.locator('#communitySpaceContent')).toContainText(participation);

    await member.reload();
    await expect(member.locator('#communitySpaceContent')).toContainText(post);
    await member.locator('[data-ctab="overview"]').click();
    await member.locator('[data-space-next-tab="participation"]').click();
    await member.locator('#communitySpaceContent .participation-item').filter({ hasText: participation }).locator('h3').click();
    await member.locator('[data-ptab="poll"]').click();
    await member.locator('.vote-option[data-pquestion]').filter({ hasText: 'Garten' }).click();
    await expect(member.locator('.vote-option.selected')).toContainText('Garten');
    await assertNoHorizontalOverflow(member);
    memberGuard.assertClean();
  } finally { await context.close(); }
  guard.assertClean();
});

};
