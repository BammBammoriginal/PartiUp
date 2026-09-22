const fs=require('fs');
const css=fs.readFileSync('public/style.css','utf8');
const app=fs.readFileSync('public/app.js','utf8');
const checks=[
 ['post images do not force full width',/\.post-media\{[^}]*width:auto/.test(css)],
 ['post images respect container width',/\.post-media\{[^}]*max-width:100%/.test(css)],
 ['post images keep proportional height',/\.post-media\{[^}]*height:auto/.test(css)],
 ['post images use contain instead of destructive crop',/\.post-media\{[^}]*object-fit:contain/.test(css)],
 ['post images have bounded desktop height',/\.post-media\{[^}]*max-height:420px/.test(css)],
 ['unified feed has tighter media bound',/\.feed-item \.post-media\{[^}]*max-height:380px/.test(css)],
 ['mobile post media is bounded',/@media\(max-width:620px\)\{\.post-media-grid\{grid-template-columns:1fr\}\.post-media,\.feed-item \.post-media\{[^}]*max-height:320px/.test(css)],
 ['media grid aligns intrinsic images instead of stretching',/\.post-media-grid\{[^}]*align-items:start/.test(css)],
 ['home feed outputs intrinsic media dimensions',/Number\(m\.width\)/.test(app)&&/Number\(m\.height\)/.test(app)],
 ['space feed outputs intrinsic media dimensions',/Number\(mm\.width\)/.test(app)&&/Number\(mm\.height\)/.test(app)]
];
let ok=0; for(const [name,pass] of checks){console.log((pass?'OK  ':'FAIL')+' '+name);if(pass)ok++;}
console.log(`\nMedia presentation: ${ok}/${checks.length} bestanden.`); if(ok!==checks.length)process.exit(1);
