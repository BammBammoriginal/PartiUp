'use strict';

// Inspect ActivityStreams identity/object fields, never arbitrary message text.
function referencesSubject(payload,userId,postIds=[],commentIds=[]){
 const suffixes=[`/ap/actors/users/${encodeURIComponent(userId)}`,...postIds.map(id=>`/ap/objects/posts/${encodeURIComponent(id)}`),...commentIds.map(id=>`/ap/objects/comments/${encodeURIComponent(id)}`)];
 const values=[];
 for(const node of [payload,payload?.object,payload?.object?.object]){
  if(typeof node==='string')values.push(node);
  else if(node&&typeof node==='object')for(const key of ['id','actor','attributedTo'])values.push(...(Array.isArray(node[key])?node[key]:[node[key]]));
 }
 return values.some(value=>typeof value==='string'&&suffixes.some(suffix=>value.endsWith(suffix)));
}
module.exports={referencesSubject};
