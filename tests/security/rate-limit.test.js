'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRateLimiter}=require('../../server/core/rate-limit');

test('live quotas stay bounded and cannot be evicted to bypass a limit',()=>{
 let clock=0;const buckets=new Map();
 const limit=createRateLimiter({name:'login',limit:2,windowMs:1000,clientKey:r=>r.ip,buckets,maxEntries:2,now:()=>clock});
 const send=ip=>{let status=200,called=false;const headers={};const res={setHeader:(k,v)=>{headers[k]=v},status:s=>{status=s;return res},json:()=>null};limit({ip},res,()=>{called=true});return {status,called,headers}};
 assert.equal(send('a').status,200);assert.equal(send('a').status,200);
 assert.equal(send('b').status,200);assert.equal(send('a').status,429);
 for(let i=0;i<100;i++)assert.equal(send('extra-'+i).status,429);
 assert.equal(buckets.size,2);assert.equal(send('a').status,429);
 clock=1000;assert.equal(send('c').status,200);assert.equal(buckets.size,1);
 assert.equal(send('a').status,200);
});
