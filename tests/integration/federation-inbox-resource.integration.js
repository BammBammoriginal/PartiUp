'use strict';
const assert=require('assert');
const { _test,isRecentReplay,rememberReplay }=require('../../server/federation/security');
const {remoteFetchPolicy}=require('../../server/federation/protocol');

async function main(){
  // Request flooding / bounded bucket cardinality: no attacker-controlled unbounded Map growth.
  const buckets=new _test.TokenBuckets({maxEntries:32,capacity:4,refillPerMs:1/60000});
  for(let i=0;i<1000;i++)buckets.take(`203.0.113.${i}:actor-${i}`);
  assert.ok(buckets.store.size<=32,'rate bucket store must remain bounded');
  const flood=new _test.TokenBuckets({maxEntries:16,capacity:3,refillPerMs:1/60000});
  assert.equal(flood.take('same-actor'),true);assert.equal(flood.take('same-actor'),true);assert.equal(flood.take('same-actor'),true);assert.equal(flood.take('same-actor'),false,'burst flood must be rejected');

  // Many actor hosts cannot create unbounded memory growth.
  const hostBuckets=new _test.TokenBuckets({maxEntries:25,capacity:2,refillPerMs:1/60000});
  for(let i=0;i<500;i++)hostBuckets.take(`host-${i}.example`);
  assert.ok(hostBuckets.store.size<=25,'many hosts must not create an unbounded map');

  // Concurrency exhaustion rejects immediately rather than building an unbounded wait queue.
  const gate=new _test.ConcurrencyGate(2);let release;const blocker=new Promise(r=>release=r);
  const a=gate.run(()=>blocker);const b=gate.run(()=>blocker);
  await assert.rejects(()=>gate.run(async()=>true),e=>e.code==='FEDERATION_CAPACITY');release();await Promise.all([a,b]);

  // Replay protection is actor+activity scoped and bounded.
  const actor='https://remote.example/users/alice',id='https://remote.example/activities/123';
  assert.equal(isRecentReplay(actor,id),false);rememberReplay(actor,id);assert.equal(isRecentReplay(actor,id),true,'replay must be recognized');
  for(let i=0;i<12000;i++)rememberReplay(`https://h${i}.example/u`, `https://h${i}.example/a/${i}`);
  assert.ok(_test.replayCache.size<=10000,'replay cache must remain bounded at the secure default');

  // Timeout and response-size targets remain conservative.
  const policy=remoteFetchPolicy();
  assert.ok(policy.timeoutMs>=1000&&policy.timeoutMs<=15000,'remote timeout must be bounded');
  assert.ok(policy.maxBytes<=2*1024*1024,'remote response must be bounded');
  assert.ok(policy.actorMaxBytes<=512*1024,'actor document response must be more tightly bounded');
  assert.equal(policy.httpsOnly,true);assert.equal(policy.redirects,false);assert.equal(policy.privateNetworksBlocked,true);
  console.log('Federation inbox resource integration: PASS');
}
main().catch(e=>{console.error(e);process.exit(1)});
