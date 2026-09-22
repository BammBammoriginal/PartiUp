const fs=require('fs');
const css=fs.readFileSync('public/style.css','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const checks=[
 ['Discover split is full width', css.includes('.discover-landing-split{display:grid;grid-template-columns:1fr;')],
 ['Wide compact grids use four columns', css.includes('.discover-landing-split .discover-preview-grid.compact{grid-template-columns:repeat(4,minmax(0,1fr))}')],
 ['Medium compact grids collapse to two', css.includes('.discover-landing-split .discover-preview-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}')],
 ['Mobile compact grids remain one column', css.includes('.discover-preview-grid,.discover-preview-grid.compact{grid-template-columns:1fr}')],
 ['More discoveries section still present', html.includes('Weitere Entdeckungen')],
 ['Local jump still present', html.includes('data-discover-jump="local"')],
 ['Topics jump still present', html.includes('data-discover-jump="topics"')]
];
let fail=0;for(const [n,ok] of checks){console.log(ok?'OK  ':'FAIL',n);if(!ok)fail++;}
console.log(`\nP0.12.12 Discover Layout: ${checks.length-fail}/${checks.length} bestanden.`);process.exitCode=fail?1:0;
