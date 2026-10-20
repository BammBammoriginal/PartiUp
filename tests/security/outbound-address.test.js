'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const dns=require('dns').promises;
const {isForbiddenIp,resolvePublicHttps}=require('../../server/federation/protocol');

test('SSRF boundary blocks private, documentation and IP transition ranges',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.0.0.1','192.0.2.1','198.51.100.1','203.0.113.1','::','::1','::ffff:127.0.0.1','64:ff9b::7f00:1','2002:7f00:1::','2001:db8::1','fc00::1','fe80::1','invalid'])assert.equal(isForbiddenIp(ip),true,ip);
 for(const ip of ['8.8.8.8','1.1.1.1','2001:4860:4860::8888'])assert.equal(isForbiddenIp(ip),false,ip);
});
test('DNS pinning rejects mixed public/private answers and URL credentials',async()=>{
 const original=dns.lookup;
 try{
  dns.lookup=async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}];
  await assert.rejects(resolvePublicHttps('https://example.test/actor'));
  await assert.rejects(resolvePublicHttps('https://user:password@example.test/actor'));
  await assert.rejects(resolvePublicHttps('http://example.test/actor'));
  dns.lookup=async()=>[{address:'8.8.8.8',family:4}];
  const pinned=await resolvePublicHttps('https://example.test/actor');assert.equal(pinned.address,'8.8.8.8');
 }finally{dns.lookup=original}
});
