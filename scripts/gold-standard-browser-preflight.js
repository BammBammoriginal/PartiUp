const fs = require('fs');

const config = fs.readFileSync('playwright.config.js', 'utf8');
const desktop = fs.readFileSync('tests/e2e/gold.desktop.spec.js', 'utf8');
const messaging = fs.readFileSync('tests/e2e/messaging.gold.desktop.spec.js', 'utf8');
const mobile = fs.readFileSync('tests/e2e/gold.mobile.spec.js', 'utf8');
const auth = fs.readFileSync('tests/auth.setup.js', 'utf8');
const helper = fs.readFileSync('tests/helpers/gold.js', 'utf8');
const appHelper = fs.readFileSync('tests/helpers/app.js', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const server = fs.readFileSync('server/server.js', 'utf8');
const regressions = fs.readFileSync('tests/integration/gold-regressions.integration.js', 'utf8');
const privacyLifecycle = fs.readFileSync('tests/integration/privacy-data-lifecycle.integration.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const all = `${desktop}\n${mobile}\n${helper}\n${messaging}`;

const checks = [
  ['isolated QA database', /qa-bottomupparti-\$\{qaRunId\}\.db/.test(config)],
  ['gold desktop project', /name:\s*'gold-desktop'/.test(config)],
  ['gold mobile project', /name:\s*'gold-mobile'/.test(config)],
  ['one shared desktop viewport for setup and suites',
    /const desktopViewport\s*=\s*\{\s*width:\s*1440,\s*height:\s*1000\s*\}/.test(config) &&
    (config.match(/viewport:\s*desktopViewport/g) || []).length === 3],
  ['mobile viewport 412x915', /width:\s*412,\s*height:\s*915/.test(config)],
  ['visible login fields', /#loginEmail/.test(auth) && /#loginPassword/.test(auth)],
  ['login control must be visible and inside viewport', /toBeVisible\(\)/.test(auth) && /toBeInViewport\(\)/.test(auth)],
  ['QA waits for bootstrap and rendered identity before login', /waitForResponse/.test(appHelper) && /\/api\/bootstrap/.test(appHelper) && /#friendCount/.test(appHelper) && /#friendCount/.test(auth)],
  ['QA navigation after reload waits for rendered bootstrap', /async function go\(page, target\)\s*\{\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*await expect\(page\.locator\('#friendCount'\)\)\.not\.toHaveText\('–'\)/.test(appHelper)],
  ['authentication setup has dedicated timeout', /setup\.setTimeout\(20_000\)/.test(auth)],
  ['real session cookie assertion', /bup_session/.test(auth)],
  ['no test login bypass', !/test-login|qa-login|login-test/i.test(auth + config)],
  ['public communication fixtures use real accounts', ['anna@bottomupparti.local','lisa@bottomupparti.local','max@bottomupparti.local'].every(email => auth.includes(email)) && /#profileVisibility/.test(auth) && /selectOption\('public'\)/.test(auth) && /#dmPermission/.test(auth) && /selectOption\('all'\)/.test(auth) && /#savePrefs/.test(auth)],
  ['runtime page errors captured', /pageerror/.test(helper)],
  ['runtime failed requests captured', /requestfailed/.test(helper)],
  ['runtime server errors captured', /status\(\)\s*>=\s*500/.test(helper)],
  ['login/logout/relogin flow', /vollständige Abmeldung/.test(desktop) && /#logout/.test(desktop)],
  ['desktop logout uses isolated browser context', /vollständige Abmeldung[^]*async \(\{ browser \}\)/.test(desktop) && /viewport:\s*\{ width:\s*1440, height:\s*1000 \}/.test(desktop) && /storageState:\s*\{ cookies:\s*\[\], origins:\s*\[\] \}/.test(desktop)],
  ['mobile logout uses isolated browser context', /Bottom-Navigation[^]*async \(\{ browser \}\)/.test(mobile) && /viewport:\s*\{ width:\s*412, height:\s*915 \}/.test(mobile) && /storageState:\s*\{ cookies:\s*\[\], origins:\s*\[\] \}/.test(mobile)],
  ['mobile login opens visible navigation before identity', /matchMedia\('\(max-width: 850px\)'\)/.test(appHelper) && /#mobileMore/.test(appHelper) && /toBeInViewport\(\)/.test(appHelper)],
  ['mobile profile and logout use viewport-safe identity navigation', /async function openIdentity/.test(helper) && /const drawerOpen/.test(helper) && /isMobile && !drawerOpen/.test(helper) && /toBeInViewport\(\)/.test(helper)],
  ['event persistence flow', /\['event',\s*'events'/.test(desktop) && /createGlobalObject/.test(desktop)],
  ['project persistence flow', /\['project',\s*'projects'/.test(desktop) && /createGlobalObject/.test(desktop)],
  ['participation persistence flow', /Beteiligung global erstellen/.test(desktop)],
  ['cross-space follow persists in browser', /data-follow-type/.test(desktop) && /aria-pressed/.test(desktop)],
  ['community-space creation flows', /#createSpaceEvent/.test(desktop) && /#createSpaceProject/.test(desktop) && /#createSpaceParticipation/.test(desktop)],
  ['subspace flow', /#createSubspace/.test(desktop)],
  ['place selector and combined context', /#discoverLocalPlace/.test(desktop) && /data-context-place-filter/.test(desktop)],
  ['place/topic/community/person navigation', /Vernetzte Navigation über Ort, Thema, Community, Person/.test(desktop)],
  ['message persistence flow', /Nachricht senden und nach Reload/.test(all)],
  ['profile message flow reaches another account and survives reload', /Öffentliches Profil: Nachricht aus Personenansicht zwischen zwei echten Konten/.test(messaging) && /#startDmFromProfile/.test(messaging) && /#messageComposer/.test(messaging) && /anna\.reload\(\)/.test(messaging)],
  ['chat media is bounded without cropping or aspect-ratio loss', /assertChatMediaLayout/.test(helper) && /expectedRatio/.test(helper) && /object-fit:contain/.test(css) && /max-height:360px/.test(css)],
  ['chat media has an accessible explicit large viewer', /openAndCloseChatMediaViewer/.test(helper) && /id="messageMediaViewer"/.test(app) && /data-close-message-media/.test(app)],
  ['mobile chat switches between list and focused thread', /#backToConversations/.test(mobile) && /has-active-thread/.test(app) && /messages-layout\.has-active-thread \.conversation-list\{display:none\}/.test(css)],
  ['message deletion is server-authorized and capability-driven', /app\.delete\('\/api\/messages\/:id'/.test(server) && /m\.sender_id!==req\.userId/.test(server) && /m\.can_delete&&!deleted/.test(app)],
  ['message deletion keeps a content-free participant tombstone', /body:'',deleted:true,can_delete:false,reactions:\[\],media:\[\]/.test(server) && /Nachricht gelöscht/.test(app) && /data-message-deleted/.test(all)],
  ['desktop and mobile exercise persistent author deletion', /Eigene Nachricht für alle löschen/.test(desktop) && /fremde Nachricht unverändert schützen/.test(desktop) && /Eigene Nachricht mobil kontrolliert löschen/.test(mobile) && /DELETE/.test(desktop + mobile)],
  ['mobile drawer/backdrop/bottom navigation', /#mobileMore/.test(mobile) && /#navBackdrop/.test(mobile) && /mobile-bottom-nav/.test(mobile)],
  ['horizontal overflow guard', /assertNoHorizontalOverflow/.test(mobile)],
  ['gold command enforces its preflight first', /^npm run qa:gold:preflight\s*&&/.test(pkg.scripts['qa:gold'] || '')],
  ['gold command includes API regressions', /qa:gold:regressions/.test(pkg.scripts['qa:gold'] || '')],
  ['private objects cannot be enumerated through follow', /cannot be followed or enumerated/.test(regressions)],
  ['blocked-person management browser flow', /Blockierte Personen zentral verwalten/.test(desktop) && /manageBlockedPeople/.test(app) && /data-unblock-user/.test(app)],
  ['blocked-person management mobile flow', /Blockierte Personen mobil verwalten/.test(mobile) && /#mobileMore/.test(mobile) && /assertNoHorizontalOverflow/.test(mobile)],
  ['blocked-person browser target is dynamic and non-self', /async function openVisibleOtherPerson/.test(helper) && /person-card:not\(\[data-user="u-max"\]\)/.test(helper) && !/filter\(\{ hasText: 'Anna' \}\)/.test(desktop + mobile)],
  ['person card test clicks the visible name rather than a nested action', /person\.locator\('\.grow > b'\)\.click\(\)/.test(helper) && !/await person\.click\(\)/.test(helper)],
  ['blocked-person action opens the real overflow menu', /async function blockOpenPerson/.test(helper) && /details\.network-more/.test(helper) && /summary\.click\(\)/.test(helper) && /toHaveAttribute\('open', ''\)/.test(helper) && /toBeVisible\(\)/.test(helper) && !/#blockPerson'\)\.click/.test(desktop + mobile)],
  ['unblock warning asserts the actual safety semantics', ['Freundschaften und Folgen','nicht automatisch wieder her','ausdrücklich neu aufgebaut'].every(text => app.includes(text) && desktop.includes(text)) && !desktop.includes('nicht automatisch wiederhergestellt')],
  ['blocked-person management is privacy-minimal and owner-scoped', /minimal person data/.test(regressions) && /cannot remove another user block/.test(regressions)],
  ['privacy export is a visible personal-account action', /id="downloadPrivacyExport"/.test(app) && /href="\/api\/privacy\/export"/.test(app) && /Eigene Daten herunterladen/.test(app)],
  ['privacy export uses a real browser download on desktop and mobile', /waitForEvent\('download'\)/.test(helper) && /Datenschutzexport über das persönliche Privacy-Center/.test(desktop) && /Datenschutzexport mobil erreichbar/.test(mobile)],
  ['privacy export verifies filename, ownership and secret exclusion', /partiup-meine-daten\.json/.test(helper) && /account\?\.id/.test(helper) && /password_hash/.test(helper) && /private_key_pem/.test(helper)],
  ['privacy export API regression covers authentication and secret exclusion', /Privacy export requires authentication/.test(regressions) && /Own privacy export is available/.test(regressions) && /excludes authentication and private-key secrets/.test(regressions)],
  ['account deletion UI requires consequence preview, acknowledgement, password and cancel', /id="openDeleteAccount"/.test(app) && /id="deleteAccountPassword"/.test(app) && /id="deleteAccountAcknowledge"/.test(app) && /id="cancelDeleteAccount"/.test(app) && /Fediverse-Server/.test(app)],
  ['account deletion has complete desktop and mobile browser flows', /Kontolöschung zeigt Folgen, erlaubt Abbruch/.test(desktop) && /Kontolöschung bleibt mobil vollständig kontrollierbar/.test(mobile) && /async function submitAccountDeletion/.test(helper)],
  ['destructive account fixtures preserve later cross-project safety flows', /lisa@bottomupparti\.local/.test(desktop) && /Anna must remain available for the later\s*\/\/ mobile block\/unblock flow/.test(desktop)],
  ['destructive mobile account deletion remains the final mobile gold case', mobile.lastIndexOf("test('Kontolöschung bleibt mobil") === mobile.lastIndexOf('test(')],
  ['account deletion API rejects wrong password and is separately rate limited', /incorrect password|falsches Passwort|wrong password/i.test(privacyLifecycle) && /failed password confirmation preserves the active session/.test(privacyLifecycle) && /deleteAccountLimit/.test(server)],
  ['notification browser checks real cross-session friendship and unread badge', /Benachrichtigung lesen aktualisiert Liste und Zähler/.test(desktop) && /anna@bottomupparti\.local/.test(desktop) && /data-friend-accept/.test(desktop) && /#notificationCount/.test(desktop)],
  ['notification mobile modal checks narrow viewport', /Benachrichtigungsliste und Zähler bleiben mobil bedienbar/.test(mobile) && /assertNoHorizontalOverflow/.test(mobile)]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
console.log(`\nGoldstandard-Browser-Preflight: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
