const assert=require('assert');
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const SAFE_ICONS=new Set(['✦','◆','◈','☑','♻️','🇩🇪','🌳','🏙️','🏛️','📋','📍','🗳️','🚲','👤','👥','?']);
const safeIcon=(v,f='✦')=>SAFE_ICONS.has(String(v??'').trim())?String(v).trim():f;
const payloads=[
 '<img src=x onerror=alert(1)>',
 '<style>body{display:none}</style>',
 '<svg><script>alert(1)</script></svg>',
 '\" onmouseover=\"alert(1)',
 "' autofocus onfocus='alert(1)",
 '&lt;img src=x onerror=alert(1)&gt;'
];
for(const p of payloads){const out=esc(p);assert(!/<(?:img|style|svg|script)\b/i.test(out),`markup survived: ${p}`);assert(!out.includes('" onmouseover="'));assert(!out.includes("' autofocus"));}
assert.strictEqual(safeIcon('<svg onload=alert(1)>','◆'),'◆');
assert.strictEqual(safeIcon('◆','✦'),'◆');
console.log(`XSS payload regression: ${payloads.length+2}/${payloads.length+2} bestanden.`);
