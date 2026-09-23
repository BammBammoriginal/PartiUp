const fs = require('fs');
const sharp = require('sharp');

const app = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const server = fs.readFileSync('server/server.js', 'utf8');
const helper = fs.readFileSync('tests/helpers/gold.js', 'utf8');
const desktop = fs.readFileSync('tests/e2e/gold.desktop.spec.js', 'utf8');
const mobile = fs.readFileSync('tests/e2e/gold.mobile.spec.js', 'utf8');
const regression = fs.readFileSync('tests/integration/gold-regressions.integration.js', 'utf8');

const imageRoute = server.indexOf("app.post('/api/messages/conversations/:id/images'");
const blockGuard = server.indexOf('others.some(x=>isBlocked(req.userId,x.user_id))', imageRoute);
const persistence = server.indexOf('persistPrivateImage(req.file,req.userId)', imageRoute);

const checks = [
  ['chat composer uses an explicit supported image allowlist', /id="messageImage"[^>]+accept="image\/jpeg,image\/png,image\/webp,image\/heic,image\/heif"/.test(app)],
  ['chat image is client-validated against the private 8 MB limit', /file\.size<=8\*1024\*1024/.test(app)],
  ['preview uses a local object URL and revokes it', /URL\.createObjectURL\(file\)/.test(app) && /URL\.revokeObjectURL\(messaging\.previewUrl\)/.test(app)],
  ['preview states that transfer starts only on send', /wird erst beim Senden übertragen/.test(app)],
  ['selected chat image can be removed before send', /id="removeMessageImage"/.test(app) && /clearMessageImageSelection/.test(app)],
  ['preview reuses the responsive composer image component', /id="messageImagePreview" class="composer-image-preview"/.test(app) && /@media\(max-width:620px\)\{\.composer-image-preview-card/.test(css)],
  ['image endpoint applies block policy before private persistence', imageRoute >= 0 && blockGuard > imageRoute && persistence > blockGuard],
  ['unsupported private image produces an explicit client error', /Bitte ein unterstütztes Bild auswählen/.test(server)],
  ['browser fixture is an in-memory image, not a public test upload', /const chatImageFixture/.test(helper) && /setInputFiles/.test(helper) && /toHaveAttribute\('src', \/\^blob:\/\)/.test(helper)],
  ['desktop proves no upload before send, removal and persistence', /Chatbild lokal prüfen, entfernen und erst beim Senden übertragen/.test(desktop) && /expect\(uploads\)\.toHaveLength\(0\)/.test(desktop) && /private-message-image/.test(desktop)],
  ['mobile proves no upload before send, removal, persistence and bounded layout', /Chatbild mobil lokal prüfen, entfernen und bewusst senden/.test(mobile) && /expect\(uploads\)\.toHaveLength\(0\)/.test(mobile) && /assertNoHorizontalOverflow/.test(mobile)],
  ['API regression rejects unsupported and blocked images without orphan media', /Unsupported private image type is rejected server-side/.test(regression) && /Blocking prevents private image messages just like text messages/.test(regression) && /creates no orphaned private media/.test(regression)]
];

async function run() {
  const fixture = helper.match(/const chatImageFixture[^]*?Buffer\.from\('([^']+)', 'base64'\)/)?.[1];
  let fixtureValid = false;
  try {
    const meta = await sharp(Buffer.from(fixture || '', 'base64'), { failOn: 'warning' }).metadata();
    fixtureValid = meta.format === 'png' && meta.width > 0 && meta.height > 0;
  } catch {}
  checks.push(['browser image fixture decodes under the locked server image library', fixtureValid]);

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\nChat image preview preflight: ${checks.length - failed}/${checks.length}`);
  if (failed) process.exit(1);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
