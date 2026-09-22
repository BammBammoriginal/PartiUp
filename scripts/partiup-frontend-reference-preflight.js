const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appPath = process.env.PARTIUP_APP_PATH || path.join(root, 'public', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

function maskCommentsAndStrings(input) {
  let out = '';
  let state = 'code';
  let quote = '';
  let regexClass = false;
  let lastCodeNonSpace = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '/') { out += '  '; i++; state = 'line'; continue; }
      if (ch === '/' && next === '*') { out += '  '; i++; state = 'block'; continue; }
      if (ch === '/' && /[=(:,!&|?{};\[\]]/.test(lastCodeNonSpace)) { out += ' '; state = 'regex'; regexClass = false; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; out += ' '; state = 'string'; continue; }
      out += ch;
      if (!/\s/.test(ch)) lastCodeNonSpace = ch;
      continue;
    }
    if (state === 'line') {
      if (ch === '\n') { out += '\n'; state = 'code'; } else out += ' ';
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') { out += '  '; i++; state = 'code'; }
      else out += ch === '\n' ? '\n' : ' ';
      continue;
    }
    if (state === 'regex') {
      if (ch === '\\') { out += ' '; if (i + 1 < input.length) { out += input[i + 1] === '\n' ? '\n' : ' '; i++; } continue; }
      if (ch === '[') regexClass = true;
      if (ch === ']') regexClass = false;
      if (ch === '/' && !regexClass) { out += ' '; state = 'code'; lastCodeNonSpace = '/'; }
      else out += ch === '\n' ? '\n' : ' ';
      continue;
    }
    if (ch === '\\') { out += ' '; if (i + 1 < input.length) { out += input[i + 1] === '\n' ? '\n' : ' '; i++; } continue; }
    if (ch === quote) { out += ' '; state = 'code'; quote = ''; }
    else out += ch === '\n' ? '\n' : ' ';
  }
  return out;
}

function addCommaSeparatedIdentifiers(target, value) {
  for (const part of value.split(',')) {
    const match = part.trim().match(/^([A-Za-z_$][\w$]*)/);
    if (match) target.add(match[1]);
  }
}

const code = maskCommentsAndStrings(source);
const declared = new Set();

for (const match of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
  declared.add(match[1]);
  addCommaSeparatedIdentifiers(declared, match[2]);
}
for (const match of source.matchAll(/(?:^|[;,])\s*(?:const\s+|let\s+|var\s+)?([A-Za-z_$][\w$]*)\s*=/gm)) declared.add(match[1]);
for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) declared.add(match[1]);
for (const match of code.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) declared.add(match[1]);
for (const match of code.matchAll(/\(([^()]*)\)\s*=>/g)) addCommaSeparatedIdentifiers(declared, match[1]);
for (const match of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*=>/g)) declared.add(match[1]);

const knownGlobals = new Set([
  'Array', 'Blob', 'Boolean', 'Date', 'Error', 'FileReader', 'FormData', 'Intl', 'JSON', 'Map', 'Math',
  'Number', 'Object', 'Promise', 'RegExp', 'Set', 'String', 'TypeError', 'URL', 'URLSearchParams', 'WeakMap',
  'WeakSet', 'alert', 'atob', 'btoa', 'cancelAnimationFrame', 'clearInterval', 'clearTimeout', 'confirm',
  'decodeURIComponent', 'encodeURIComponent', 'fetch', 'getComputedStyle', 'isFinite', 'isNaN', 'matchMedia',
  'parseFloat', 'parseInt', 'prompt', 'queueMicrotask', 'requestAnimationFrame', 'scrollTo', 'setInterval', 'setTimeout',
  'structuredClone'
]);
const syntaxWords = new Set(['async', 'catch', 'for', 'function', 'if', 'return', 'switch', 'while', 'with']);
const referenced = new Map();

function addReference(name, index, kind) {
  if (!referenced.has(name)) referenced.set(name, []);
  const line = source.slice(0, index).split('\n').length;
  referenced.get(name).push(`${kind} at line ${line}`);
}

for (const match of code.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
  if (!syntaxWords.has(match[1]) && !/^[A-ZÄÖÜ]/.test(match[1])) addReference(match[1], match.index, 'call');
}
for (const match of code.matchAll(/\.on(?:click|change|submit|input|keydown|keyup)\s*=\s*([A-Za-z_$][\w$]*)\b/g)) {
  if (!syntaxWords.has(match[1])) addReference(match[1], match.index, 'event binding');
}
for (const match of code.matchAll(/addEventListener\s*\(\s*[^,]+,\s*([A-Za-z_$][\w$]*)\b/g)) {
  addReference(match[1], match.index, 'event listener');
}
for (const match of source.matchAll(/on(?:click|change|submit|input|keydown|keyup)=["']\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
  addReference(match[1], match.index, 'inline event handler');
}

const missing = [...referenced.entries()]
  .filter(([name]) => !declared.has(name) && !knownGlobals.has(name))
  .sort(([a], [b]) => a.localeCompare(b));

if (missing.length) {
  for (const [name, locations] of missing) console.error(`FAIL undefined frontend function ${name}: ${locations.join(', ')}`);
  console.error(`\n${missing.length} undefined frontend function reference(s) found.`);
  process.exit(1);
}

console.log(`Frontend function references: ${referenced.size} names checked; all resolved or explicitly allowed globals.`);
