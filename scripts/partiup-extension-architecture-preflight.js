'use strict';
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json')),db=read('server/db.js'),srv=read('server/server.js'),ui=read('public/app.js'),css=read('public/style.css'),reg=read('server/extensions/registry.js'),privacy=read('server/privacy.js');
const checks=[
 ['Extension Architecture bleibt ab P0.10 enthalten',/^0\.(?:1[0-9]|[2-9][0-9])\./.test(pkg.version)],
 ['Extension Registry existiert',reg.includes('CATALOG')&&reg.includes('CAPABILITIES')],
 ['Capabilities werden zentral beschrieben',reg.includes("'space.read'")&&reg.includes("'extension.config.write'")],
 ['Space-Extension-Schema existiert',reg.includes('CREATE TABLE IF NOT EXISTS space_extensions')],
 ['Extension-Audit existiert',reg.includes('CREATE TABLE IF NOT EXISTS extension_audit_log')],
 ['Extension-Schema wird installiert',db.includes('installExtensionSchema(db)')],
 ['Aktive Extensions sind Teil des Space-Modells',db.includes('extensions:activeExtensionsForSpace')],
 ['Katalog-API vorhanden',srv.includes("app.get('/api/extensions/catalog'")],
 ['Space-Extension-API vorhanden',srv.includes("app.get('/api/communities/:id/extensions'")],
 ['Änderungen benötigen configure_modules',srv.includes("'space.configure_modules'")&&srv.includes('Erweiterungen zu verwalten')],
 ['Unbekannte Extensions werden abgelehnt',reg.includes('EXTENSION_UNKNOWN')],
 ['Geplante Extensions können nicht aktiviert werden',reg.includes('EXTENSION_UNAVAILABLE')],
 ['Capability-Snapshot wird gespeichert',reg.includes('capabilities_snapshot_json')],
 ['Aktivierung wird protokolliert',reg.includes("'enable'")&&reg.includes('extension_audit_log')],
 ['Deaktivierung wird protokolliert',reg.includes("'disable'")],
 ['Konfigurationsänderung wird protokolliert',reg.includes("'configure'")],
 ['Referenz-Erweiterung Ressourcen vorhanden',reg.includes("id:'partiup.resources'")],
 ['Ressourcen akzeptieren nur HTTPS',reg.includes("parsed.protocol!=='https:'")],
 ['Ressourcen begrenzen Link-Anzahl',reg.includes('links.length>=12')],
 ['Kommunale Beteiligung als geplante Extension modelliert',reg.includes("id:'municipal.participation'")],
 ['Decidim als Connector modelliert',reg.includes("id:'connector.decidim'")],
 ['UX trennt Space-Funktionen von Meta-Aktionen',ui.includes('space-function-tabs')&&ui.includes('space-meta-actions')],
 ['Info-Bereich ist explizit',ui.includes('Information & Transparenz')&&ui.includes("data-ctab=\"info\"")],
 ['Admin-Bereich ist explizit',ui.includes('⚙ Administration')&&ui.includes("data-ctab=\"admin\"")],
 ['Extension-Transparenz zeigt Daten/Rechte',ui.includes('Daten & Berechtigungen')&&ui.includes('capabilityDetails')],
 ['Aktive Extension erscheint als native Funktion',ui.includes("defs.push(['resources','Ressourcen'])")],
 ['Ressourcen-UI kennzeichnet Zusatzfunktion transparent',ui.includes('Zusätzliche Funktion · bereitgestellt von PartiUp')],
 ['Mobile Trennung gestylt',css.includes('.space-nav-row')&&css.includes('.space-meta-actions')],
 ['Privacy Lifecycle kennt Extensions',privacy.includes("space_extensions:'ANONYMIZE_ENABLER_RETAIN_SPACE_CONFIG'")],
 ['Privacy Export enthält Extension-Audit',privacy.includes('extensions:{enabled_or_configured')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${n}`);if(!ok)fail++;}if(fail){console.error(`\n${fail}/${checks.length} P0.10-Prüfungen fehlgeschlagen.`);process.exit(1)}console.log(`\nP0.10 Extension Architecture: ${checks.length}/${checks.length} bestanden.`);
