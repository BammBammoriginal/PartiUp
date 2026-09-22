const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
const checks=[
 ['kein creator-mini Button in Karten', !app.includes('<button class="creator-mini')],
 ['Community-Karte ist kein Button-Wrapper', app.includes('<article class="community clickable"')],
 ['Event-Karte ist kein Button-Wrapper', app.includes('<article class="event event-clickable"')],
 ['Projekt-Karte ist kein Button-Wrapper', app.includes('<article class="project-card project-clickable"')],
 ['Beteiligungskarte ist kein Button-Wrapper', app.includes('<article class="participation-item participation-clickable"')],
 ['Event-Metadaten gebündelt', app.includes('event-card-meta') && css.includes('.event-card-meta')],
 ['Mobile Kartenregeln vorhanden', css.includes('@media(max-width:700px)')]
];
let ok=true;for(const [n,v] of checks){console.log(v?'OK  ':'FAIL',n);if(!v)ok=false}if(!ok)process.exit(1);
