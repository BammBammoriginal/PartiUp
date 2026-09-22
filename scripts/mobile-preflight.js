const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const checks=[
 ['Viewport inkl. safe-area vorbereitet',html.includes('viewport-fit=cover')&&css.includes('safe-area-inset-bottom')],
 ['Mobile Bottom Navigation',html.includes('mobile-bottom-nav')&&css.includes('.mobile-bottom-nav')],
 ['Mobile Drawer mit Backdrop',html.includes('navBackdrop')&&app.includes('setMobileMenu')&&css.includes('.nav-backdrop')],
 ['Touch-Ziele mindestens 44px vorgesehen',css.includes('min-height:44px')&&css.includes('@media(pointer:coarse)')],
 ['Keine Hover-only Kernnavigation',app.includes("[data-page]")&&html.includes('mobile-bottom-nav')],
 ['Mobile Formulare verhindern iOS Zoom',css.includes('font-size:16px')],
 ['Modale Dialoge mobil als Bottom Sheet',css.includes('border-radius:20px 20px 0 0')&&css.includes('92dvh')],
 ['Horizontale Filter scrollbar statt Umbruch-Chaos',css.includes('.filters{flex-wrap:nowrap;overflow-x:auto')],
 ['Mobile Karten einspaltig',css.includes('.discover-grid')&&css.includes('grid-template-columns:1fr')],
 ['Responsive Desktop/Mobile Breakpoint',css.includes('@media(max-width:850px)')],
 ['Reduced Motion respektiert',css.includes('prefers-reduced-motion')],
 ['Keyboard-Fokus sichtbar',css.includes(':focus-visible')],
 ['Skip-Link vorhanden',html.includes('skip-link')&&html.includes('mainContent')],
 ['ARIA für mobile Navigation/Dialog',html.includes('aria-expanded')&&html.includes('aria-label="Dialog schließen"')],
 ['Bilder lazy + async decoding',app.includes('loading="lazy"')&&app.includes('decoding="async"')],
 ['PWA Manifest vorbereitet',html.includes('manifest.webmanifest')&&fs.existsSync(path.join(root,'public','manifest.webmanifest'))],
 ['App Theme/Standalone Metadaten',html.includes('theme-color')&&html.includes('apple-mobile-web-app-capable')],
 ['Mobile Navigation berücksichtigt Safe Area',css.includes('env(safe-area-inset-bottom)')],
 ['Toast kollidiert mobil nicht mit Bottom Nav',css.includes('bottom:calc(78px + env(safe-area-inset-bottom))')],
 ['320px Mindestbreite unterstützt',css.includes('min-width:320px')]
];let bad=0;for(const [n,ok] of checks){console.log(`${ok?'OK':'FAIL'}  ${n}`);if(!ok)bad++}console.log(`\nMobile/App preflight: ${checks.length-bad}/${checks.length} bestanden.`);if(bad)process.exit(1);
