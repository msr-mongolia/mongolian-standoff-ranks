// Safe player-stat updates from verified screenshot extraction.
// A player missing from the screenshot must never receive invented zero stats.
export function buildPlayerStatUpdates({recognizedPlayers=[],roster=[],matchId,reviewApproved=false}={}){
 if(!reviewApproved)return {updates:[],skipped:[],reason:'Admin review required'};
 const byId=new Map(roster.filter(p=>p.standoffId).map(p=>[String(p.standoffId),p]));
 const updates=[],skipped=[];
 for(const row of recognizedPlayers){
  const id=String(row.standoffId||'');
  const player=byId.get(id);
  if(!player){skipped.push({id,reason:'Player not matched to roster'});continue;}
  if(!Number.isInteger(row.kills)||!Number.isInteger(row.deaths)||row.kills<0||row.deaths<0){
   skipped.push({id,reason:'Stats missing or uncertain'});continue;
  }
  updates.push({matchId,playerId:player.id,kills:row.kills,deaths:row.deaths});
 }
 return {updates,skipped,reason:'Only explicitly recognized players receive updates. Never reset absent players.'};
}
