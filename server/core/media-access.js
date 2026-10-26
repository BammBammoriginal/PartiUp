'use strict';

// Files inherit the current visibility of their linked entity. A storage URL is
// never itself an access grant. Explicitly federated objects remain public.
function createMediaAccess({db,canViewScope,userProfile,federationDecisionForPost,noteForLocalComment,eventFederationDecision}){
  function contentVisible(type,id,userId){
    const comment=type==='comment'?db.prepare('SELECT post_id FROM comments WHERE id=?').get(id):null;
    if(type==='comment'&&!comment)return false;
    const post=db.prepare('SELECT id,community_id FROM posts WHERE id=?').get(comment?comment.post_id:id);
    if(!post)return false;
    for(const [targetType,targetId] of [['post',post.id],...(comment?[['comment',id]]:[])]){
      const state=db.prepare('SELECT state FROM moderation_content_state WHERE target_type=? AND target_id=?').get(targetType,targetId)?.state;
      if(state&&state!=='active')return false;
    }
    if(canViewScope(userId,'community',post.community_id))return true;
    return type==='post'?federationDecisionForPost(db,id).allowed:!!noteForLocalComment(db,id);
  }
  return function canReadMedia(media,userId){
    const links=db.prepare('SELECT entity_type,entity_id FROM media_links WHERE media_id=?').all(media.id);
    if(!links.length)return !!userId&&media.owner_user_id===userId;
    return links.some(({entity_type:type,entity_id:id})=>{
      if(type==='user')return !!userProfile(id,userId);
      if(type==='post'||type==='comment')return contentVisible(type,id,userId);
      if(type==='community'||type==='project')return canViewScope(userId,type,id);
      if(type==='event')return canViewScope(userId,type,id)||eventFederationDecision(db,id).allowed;
      return false;
    });
  };
}
module.exports={createMediaAccess};
