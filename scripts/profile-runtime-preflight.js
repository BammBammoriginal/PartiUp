const {bootstrap,userProfile,getUserSafe}=require('../server/db');
try {
  const me=getUserSafe('u-max');
  if(!me) throw new Error('Demo-Nutzer u-max fehlt.');
  const boot=bootstrap('u-max');
  if(!boot || !Array.isArray(boot.people)) throw new Error('Bootstrap/People konnte nicht erzeugt werden.');
  const self=userProfile('u-max','u-max');
  if(!self) throw new Error('Eigenes Profil konnte nicht erzeugt werden.');
  console.log('OK   Profile-Runtime: bootstrap, people und userProfile funktionieren.');
  process.exit(0);
} catch (err) {
  console.error('FAIL Profile-Runtime:', err && err.stack ? err.stack : err);
  process.exit(1);
}
