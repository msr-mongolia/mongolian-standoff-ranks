// Safe player-stat updates from verified screenshot extraction.
// Nicknames, tags, avatars and decorative characters are hints, never identity keys.
export function normalizePlayerName(value) {
 return String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
}
export function classifyScreenshotPlayers({recognizedPlayers=[],roster=[]}={}) {
 const byId=new Map(),byName=new Map(),duplicates=new Set();
 for(const player of roster) {
  const id=String(player.standoffId||'').trim();
  if(id) {
   if(byId.has(id))duplicates.add(id);
   else byId.set(id,player);
  }
  for(const name of [player.nick,player.nickname,player.name,...(Array.isArray(player.aliases)?player.aliases:[])]) {
   const key=normalizePlayerName(name);
   if(key)byName.set(key,[...(byName.get(key)||[]),player]);
  }
 }
 return recognizedPlayers.map(row=>{
  const id=String(row.standoffId||'').trim();
  const name=String(row.nick||row.nickname||row.name||'');
  const matches=byName.get(normalizePlayerName(name))||[];
  if(id&&duplicates.has(id))return {...row,status:'red',reason:'Duplicate Game ID in roster'};
  const player=id?byId.get(id):null;
  if(player) {
   const canonical=player.nick||player.nickname||player.name||'';
   return {...row,status:name===canonical?'green':'yellow',playerId:player.id,canonicalName:canonical,reason:name===canonical?'Exact verified Game ID and name':'Verified Game ID; display name differs'};
  }
  // Even a unique nickname is NOT enough to assign statistics without a stable ID.
  return {...row,status:'red',reason:matches.length?'Name candidate only; Game ID verification required':'Player not found in registered roster',candidatePlayerIds:matches.map(p=>p.id)};
 });
}
export function buildPlayerStatUpdates({recognizedPlayers=[],roster=[],matchId,reviewApproved=false}={}) {
 if(!reviewApproved)return {updates:[],skipped:[],reason:'Admin review required'};
 const classified=classifyScreenshotPlayers({recognizedPlayers,roster});
 const updates=[],skipped=[],seen=new Set();
 for(const row of classified) {
  if(!row.playerId){skipped.push({name:row.nick||row.name||'',id:String(row.standoffId||''),status:row.status,reason:row.reason});continue;}
  if(seen.has(String(row.playerId))){skipped.push({playerId:row.playerId,status:'red',reason:'Duplicate player in screenshot'});continue;}
  if(!Number.isInteger(row.kills)||!Number.isInteger(row.deaths)||!Number.isInteger(row.assists)||row.kills<0||row.deaths<0||row.assists<0){
   skipped.push({playerId:row.playerId,status:'red',reason:'K/D/A missing or uncertain'});continue;
  }
  seen.add(String(row.playerId));
  updates.push({matchId,playerId:row.playerId,kills:row.kills,deaths:row.deaths,assists:row.assists,status:row.status});
 }
 return {updates,skipped,reason:'Only uniquely Game-ID-verified players receive updates; unverified players are never credited.'};
}
