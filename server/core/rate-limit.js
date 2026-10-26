'use strict';
const sharedBuckets=new Map();

// Keep the existing fixed-window policy, with a hard bound on live IP keys.
// Never evict a live key: that would let traffic reset an existing quota.
function createRateLimiter({name,limit,windowMs,clientKey,buckets=sharedBuckets,maxEntries=5000,now=Date.now}){
 return (req,res,next)=>{
  const at=now(),key=`${name}:${clientKey(req)}`;
  let bucket=buckets.get(key);
  if(!bucket||at>=bucket.reset){
   for(const [k,value] of buckets)if(at>=value.reset)buckets.delete(k);
   if(!buckets.has(key)&&buckets.size>=maxEntries){res.setHeader('Retry-After',String(Math.ceil(windowMs/1000)));return res.status(429).json({error:'Zu viele Anfragen. Bitte kurz warten.'})}
   bucket={n:0,reset:at+windowMs};buckets.set(key,bucket);
  }
  bucket.n++;res.setHeader('X-RateLimit-Limit',String(limit));
  if(bucket.n>limit){res.setHeader('Retry-After',String(Math.ceil((bucket.reset-at)/1000)));return res.status(429).json({error:'Zu viele Anfragen. Bitte kurz warten.'})}
  next();
 };
}
module.exports={createRateLimiter};
