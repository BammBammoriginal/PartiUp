'use strict';
const args=process.argv.slice(2);
function arg(name){const i=args.indexOf(name);return i>=0?args[i+1]:null}
const rawBase=arg('--url')||process.env.PARTIUP_BASE_URL||'';
const handle=(arg('--handle')||arg('--user')||'max').trim().toLowerCase();
if(!rawBase){console.error('FEHLER: --url https://... oder PARTIUP_BASE_URL angeben.');process.exit(2)}
let base;try{base=new URL(rawBase);if(base.protocol!=='https:')throw new Error('HTTPS erforderlich')}catch(e){console.error('FEHLER: Oeffentliche HTTPS-URL ungueltig:',e.message);process.exit(2)}
const root=base.origin+base.pathname.replace(/\/$/,'');
const host=base.host;
const acct=`acct:${handle}@${host}`;
const checks=[];
async function getJson(url,accept='application/json'){
  const c=new AbortController();const t=setTimeout(()=>c.abort(),10000);
  try{const r=await fetch(url,{headers:{Accept:accept},redirect:'error',signal:c.signal});const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{};return {r,text,json}}finally{clearTimeout(t)}
}
function check(name,ok,detail=''){checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${detail?' – '+detail:''}`)}
function selfLink(wf){return wf?.links?.find(x=>x.rel==='self'&&(x.type==='application/activity+json'||String(x.type||'').includes('activitystreams')))}
(async()=>{
  console.log(`PartiUp P0.5 Mastodon-Discovery-Selftest fuer einen explizit federation-enabled User @${handle}@${host}`);
  console.log(`Public base: ${root}\n`);
  try{
    const d=await getJson(`${root}/api/federation/diagnostics`);check('Public diagnostics erreichbar',d.r.ok&&d.json?.configured===true,`HTTP ${d.r.status}`);check('Server meldet HTTPS Federation',d.json?.https===true);
    const localDiag=await getJson(`${root}/api/federation/discovery-check?handle=${encodeURIComponent(handle)}`);
    check('Discovery-Diagnose intern gruen',localDiag.r.status===200&&localDiag.json?.ok===true,`HTTP ${localDiag.r.status}`);
    const wfUrl=`${root}/.well-known/webfinger?resource=${encodeURIComponent(acct)}`;
    const wf=await getJson(wfUrl,'application/jrd+json');
    check('WebFinger HTTP 200',wf.r.status===200,`HTTP ${wf.r.status}`);
    check('WebFinger subject exakt',wf.json?.subject===acct,String(wf.json?.subject||''));
    const self=selfLink(wf.json);check('WebFinger self-Link vorhanden',!!self,self?.href||'');if(!self)throw new Error('Kein ActivityPub self-Link');
    const actor=await getJson(self.href,'application/activity+json');
    check('Actor HTTP 200',actor.r.status===200,`HTTP ${actor.r.status}`);
    check('Actor ID entspricht self-Link',actor.json?.id===self.href,String(actor.json?.id||''));
    check('Actor type Person',actor.json?.type==='Person',String(actor.json?.type||''));
    check('preferredUsername == Handle',actor.json?.preferredUsername===handle,String(actor.json?.preferredUsername||''));
    check('Actor webfinger == acct',actor.json?.webfinger===acct,String(actor.json?.webfinger||''));
    check('discoverable is explicit boolean',typeof actor.json?.discoverable==='boolean',String(actor.json?.discoverable));
    check('Actor url == id',actor.json?.url===actor.json?.id,String(actor.json?.url||''));
    check('Inbox/Outbox vorhanden',!!actor.json?.inbox&&!!actor.json?.outbox);
    check('Public Key Owner == Actor',actor.json?.publicKey?.owner===actor.json?.id);
    // Mastodon-artiger Loopback: Actor nennt acct-Adresse -> WebFinger muss wieder exakt denselben Actor liefern.
    const loopWf=await getJson(`${root}/.well-known/webfinger?resource=${encodeURIComponent(actor.json.webfinger)}`,'application/jrd+json');
    const loopSelf=selfLink(loopWf.json);
    check('WebFinger-Loopback HTTP 200',loopWf.r.status===200,`HTTP ${loopWf.r.status}`);
    check('Loopback subject stabil',loopWf.json?.subject===acct,String(loopWf.json?.subject||''));
    check('Loopback self zeigt auf denselben Actor',loopSelf?.href===actor.json.id,String(loopSelf?.href||''));
    check('WebFinger aliases enthalten Actor',Array.isArray(loopWf.json?.aliases)&&loopWf.json.aliases.includes(actor.json.id));
    const outbox=await getJson(actor.json.outbox,'application/activity+json');
    check('Outbox HTTP 200',outbox.r.status===200,`HTTP ${outbox.r.status}`);
    check('Outbox ist OrderedCollection',outbox.json?.type==='OrderedCollection',String(outbox.json?.type||''));
  }catch(e){console.error('\nSelftest abgebrochen:',e.message)}
  const failed=checks.filter(x=>!x.ok);
  console.log(`\nErgebnis: ${checks.length-failed.length}/${checks.length} Checks bestanden.`);
  if(failed.length){console.log('Noch NICHT zu Mastodon wechseln. Erst FAILs beheben.');process.exit(1)}
  console.log(`Bereit fuer Mastodon-Suche: @${handle}@${host}`);
})().catch(e=>{console.error(e);process.exit(1)});
