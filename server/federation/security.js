'use strict';
const crypto=require('crypto');
const net=require('net');

function envInt(name,fallback,{min=1,max=1000000}={}){
  const n=Number.parseInt(process.env[name]||'',10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function nowMs(){return Date.now()}

class BoundedTtlMap{
  constructor(maxEntries){this.maxEntries=maxEntries;this.map=new Map()}
  get(key){const row=this.map.get(key);if(!row)return null;if(row.expiresAt<=nowMs()){this.map.delete(key);return null}this.map.delete(key);this.map.set(key,row);return row.value}
  set(key,value,ttlMs){if(this.map.has(key))this.map.delete(key);this.map.set(key,{value,expiresAt:nowMs()+ttlMs});while(this.map.size>this.maxEntries)this.map.delete(this.map.keys().next().value)}
  delete(key){this.map.delete(key)}
  get size(){return this.map.size}
}
class TokenBuckets{
  constructor({maxEntries,capacity,refillPerMs}){this.store=new BoundedTtlMap(maxEntries);this.capacity=capacity;this.refillPerMs=refillPerMs;this.ttlMs=Math.ceil(capacity/refillPerMs)*2}
  take(key,cost=1){const now=nowMs();let row=this.store.get(key)||{tokens:this.capacity,at:now};row.tokens=Math.min(this.capacity,row.tokens+Math.max(0,now-row.at)*this.refillPerMs);row.at=now;if(row.tokens<cost){this.store.set(key,row,this.ttlMs);return false}row.tokens-=cost;this.store.set(key,row,this.ttlMs);return true}
}
class ConcurrencyGate{
  constructor(limit){this.limit=limit;this.active=0}
  async run(fn){if(this.active>=this.limit){const e=new Error('federation_capacity');e.code='FEDERATION_CAPACITY';throw e}this.active++;try{return await fn()}finally{this.active--}}
}

const cfg=Object.freeze({
  ipPerMinute:envInt('PARTIUP_FEDERATION_IP_PER_MINUTE',120,{max:10000}),
  ipBurst:envInt('PARTIUP_FEDERATION_IP_BURST',60,{max:2000}),
  actorPerMinute:envInt('PARTIUP_FEDERATION_ACTOR_PER_MINUTE',60,{max:10000}),
  actorBurst:envInt('PARTIUP_FEDERATION_ACTOR_BURST',30,{max:2000}),
  hostPerMinute:envInt('PARTIUP_FEDERATION_HOST_PER_MINUTE',240,{max:20000}),
  hostBurst:envInt('PARTIUP_FEDERATION_HOST_BURST',60,{max:4000}),
  bucketEntries:envInt('PARTIUP_FEDERATION_RATE_BUCKETS',5000,{min:100,max:50000}),
  actorCacheEntries:envInt('PARTIUP_FEDERATION_ACTOR_CACHE_ENTRIES',2000,{min:100,max:20000}),
  actorCacheTtlMs:envInt('PARTIUP_FEDERATION_ACTOR_CACHE_TTL_MS',300000,{min:10000,max:3600000}),
  negativeCacheTtlMs:envInt('PARTIUP_FEDERATION_NEGATIVE_CACHE_TTL_MS',15000,{min:1000,max:60000}),
  remoteFetchConcurrency:envInt('PARTIUP_FEDERATION_REMOTE_FETCH_CONCURRENCY',16,{min:1,max:128}),
  actorLookupConcurrency:envInt('PARTIUP_FEDERATION_ACTOR_LOOKUP_CONCURRENCY',8,{min:1,max:64}),
  replayCacheEntries:envInt('PARTIUP_FEDERATION_REPLAY_CACHE_ENTRIES',10000,{min:100,max:100000}),
  replayCacheTtlMs:envInt('PARTIUP_FEDERATION_REPLAY_CACHE_TTL_MS',600000,{min:60000,max:3600000})
});
const ipBuckets=new TokenBuckets({maxEntries:cfg.bucketEntries,capacity:cfg.ipBurst,refillPerMs:cfg.ipPerMinute/60000});
const actorBuckets=new TokenBuckets({maxEntries:cfg.bucketEntries,capacity:cfg.actorBurst,refillPerMs:cfg.actorPerMinute/60000});
const hostBuckets=new TokenBuckets({maxEntries:cfg.bucketEntries,capacity:cfg.hostBurst,refillPerMs:cfg.hostPerMinute/60000});
const actorCache=new BoundedTtlMap(cfg.actorCacheEntries);
const negativeActorCache=new BoundedTtlMap(Math.max(100,Math.floor(cfg.actorCacheEntries/4)));
const replayCache=new BoundedTtlMap(cfg.replayCacheEntries);
const remoteFetchGate=new ConcurrencyGate(cfg.remoteFetchConcurrency);
const actorLookupGate=new ConcurrencyGate(cfg.actorLookupConcurrency);

function normalizedIp(req){
  const remote=String(req.socket?.remoteAddress||'unknown');
  if(process.env.BUP_TRUST_LOCAL_PROXY==='1' && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote)){
    const cf=String(req.headers['cf-connecting-ip']||'').trim();if(net.isIP(cf))return cf;
    const first=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();if(net.isIP(first))return first;
  }
  return remote;
}
function actorUri(activity){return typeof activity?.actor==='string'?activity.actor:activity?.actor?.id}
function actorHost(uri){try{const u=new URL(uri);return u.protocol==='https:'?u.hostname.toLowerCase():''}catch{return ''}}
function federationInboxIpLimit(req,res,next){if(ipBuckets.take(normalizedIp(req)))return next();res.setHeader('Retry-After','60');return res.status(429).json({error:'federation_rate_limited'})}
function enforceActorHostLimit(activity){const uri=actorUri(activity);const host=actorHost(uri);if(!uri||!host){const e=new Error('invalid_actor');e.code='FEDERATION_INVALID';throw e}if(!actorBuckets.take(uri)||!hostBuckets.take(host)){const e=new Error('federation_rate_limited');e.code='FEDERATION_RATE_LIMIT';throw e}return {uri,host}}
function getCachedActor(uri){return actorCache.get(uri)}
function cacheActor(uri,actor){actorCache.set(uri,actor,cfg.actorCacheTtlMs)}
function isNegativeActorCached(uri){return !!negativeActorCache.get(uri)}
function cacheNegativeActor(uri){negativeActorCache.set(uri,true,cfg.negativeCacheTtlMs)}
function invalidateActor(uri){actorCache.delete(uri);negativeActorCache.delete(uri)}
function actorLookup(fn){return actorLookupGate.run(fn)}
function remoteFetch(fn){return remoteFetchGate.run(fn)}
function replayKey(actor,id){return crypto.createHash('sha256').update(`${actor}\n${id}`).digest('hex')}
function isRecentReplay(actor,id){return !!replayCache.get(replayKey(actor,id))}
function rememberReplay(actor,id){replayCache.set(replayKey(actor,id),true,cfg.replayCacheTtlMs)}
function publicConfig(){return {...cfg,rateBucketEntries:cfg.bucketEntries}}
module.exports={cfg,federationInboxIpLimit,enforceActorHostLimit,getCachedActor,cacheActor,isNegativeActorCached,cacheNegativeActor,invalidateActor,actorLookup,remoteFetch,isRecentReplay,rememberReplay,publicConfig,_test:{BoundedTtlMap,TokenBuckets,ConcurrencyGate,ipBuckets,actorBuckets,hostBuckets,actorCache,negativeActorCache,replayCache,remoteFetchGate,actorLookupGate}};
