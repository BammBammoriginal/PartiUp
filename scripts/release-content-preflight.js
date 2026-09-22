const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const publicRoot = path.join(root, 'public');
const required = new Set([
  'package.json',
  'package-lock.json',
  'public/index.html',
  'public/app.js',
  'public/style.css'
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function addPublicReference(raw) {
  const clean = raw.split(/[?#]/, 1)[0];
  if (!clean.startsWith('/') || clean.startsWith('/api/') || clean.startsWith('/media/')) return;
  if (!/\.(?:css|js|json|png|jpe?g|webp|svg|ico|webmanifest)$/i.test(clean)) return;
  required.add(path.posix.join('public', clean.slice(1)));
}

for (const file of walk(publicRoot)) {
  if (!/\.(?:html|js|css|webmanifest)$/i.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:fetch\(\s*|\bsrc\s*=\s*|\bhref\s*=\s*|url\(\s*)['"](\/[^'"]+)['"]/g)) {
    addPublicReference(match[1]);
  }
}

const missing = [...required].filter(relative => !fs.existsSync(path.join(root, relative)));
if (missing.length) {
  console.error('Release-Inhaltscheck: referenzierte oder erforderliche Dateien fehlen:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

let gitWorktree = false;
try {
  gitWorktree = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim() === 'true';
} catch {
  // Extracted release packages intentionally have no Git metadata.
}

if (gitWorktree) {
  const untracked = [...required].filter(relative => {
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', '--', relative], {
        cwd: root,
        stdio: 'ignore'
      });
      return false;
    } catch {
      return true;
    }
  });
  if (untracked.length) {
    console.error('Release-Inhaltscheck: benötigte Dateien sind nicht versionsgeführt und würden im Paket fehlen:');
    for (const file of untracked) console.error(`- ${file}`);
    process.exit(1);
  }
}

console.log(`Release-Inhaltscheck bestanden: ${required.size} erforderliche und referenzierte Dateien vorhanden${gitWorktree ? ' und versionsgeführt' : ''}.`);
