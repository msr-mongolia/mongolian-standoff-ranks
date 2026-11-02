// Resolve Discord chat authors to registered MSR teams.
// Identity must be verified with stable Discord user IDs; nicknames are hints only.
export function normalizeNick(value){
 return String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
}
export function resolveDiscordPlayer(author, teams){
 const id=String(author?.id||'');
 const nicknames=[author?.displayName,author?.globalName,author?.username].map(normalizeNick).filter(Boolean);
 const strong=[],weak=[];
 for(const team of teams||[]){
  for(const player of team.players||[]){
   if(id&&String(player.discordId||'')===id)strong.push({teamId:team.id,teamName:team.name,player});
   else if(nicknames.includes(normalizeNick(player.nick||player.nickname||'')))weak.push({teamId:team.id,teamName:team.name,player});
  }
 }
 const distinct=matches=>[...new Set(matches.map(x=>x.teamId))];
 if(distinct(strong).length===1)return {status:'verified',teamId:strong[0].teamId,teamName:strong[0].teamName,method:'discord_id'};
 if(distinct(strong).length>1)return {status:'conflict',reason:'Discord ID appears in multiple teams'};
 if(distinct(weak).length===1)return {status:'unverified',candidateTeamId:weak[0].teamId,candidateTeamName:weak[0].teamName,method:'nickname'};
 return {status:weak.length?'ambiguous':'unknown'};
}
export function identifyMatchFromChat(messages,teams,scheduledMatches){
 const verified=new Set(),candidates=[];
 for(const m of messages||[]){
  const result=resolveDiscordPlayer(m.author,teams);
  if(result.status==='verified')verified.add(String(result.teamId));
  else if(result.status==='unverified')candidates.push(result);
 }
 const ids=[...verified];
 if(ids.length!==2)return {status:'needs_review',reason:'Expected exactly two verified teams',verifiedTeamIds:ids,nicknameCandidates:candidates};
 const matches=(scheduledMatches||[]).filter(m=>ids.includes(String(m.aTeamId))&&ids.includes(String(m.bTeamId)));
 if(matches.length!==1)return {status:'needs_review',reason:'Match not uniquely identified',verifiedTeamIds:ids,matchCandidates:matches.map(m=>m.id)};
 return {status:'matched',matchId:matches[0].id,verifiedTeamIds:ids};
}
