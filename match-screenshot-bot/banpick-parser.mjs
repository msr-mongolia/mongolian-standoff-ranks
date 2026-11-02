// Parse short, separate MSL Discord messages. Times are proposals until confirmed.
const mapNames=new Set(['sandstone','rust','dune','province','zone 7','zone7','sakura','breeze','firing range','training outside']);
export function parseBanPickMessage(message){
 const text=String(message||'').normalize('NFKC').trim().toLowerCase();
 const action=text.match(/^(ban|pick)\s*[:：-]?\s*(.+?)\s*[.!]?$/i);
 if(action){
  const map=action[2].trim();
  return mapNames.has(map)?{type:action[1],map}:null;
 }
 const hhmm=text.match(/^(?:цаг|time|at)?\s*([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:цагт)?$/i);
 if(hhmm)return {type:'time_proposal',time:hhmm[1].padStart(2,'0')+':'+hhmm[2]};
 const hours=text.match(/^(?:цаг|time|at)?\s*([01]?\d|2[0-3])\s*(?:цаг|цагт)?$/i);
 if(hours)return {type:'time_proposal',time:hours[1].padStart(2,'0')+':00'};
 const compact=text.match(/^([01]?\d|2[0-3])([0-5]\d)$/);
 if(compact)return {type:'time_proposal',time:compact[1].padStart(2,'0')+':'+compact[2]};
 return null;
}
export function summarizeBanPick(messages){
 const ordered=[...messages].sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0));
 const bans=[],picks=[],proposals=[];
 for(const m of ordered){
  const item=parseBanPickMessage(m.content);if(!item)continue;
  if(item.type==='ban'||item.type==='pick') (item.type==='ban'?bans:picks).push({map:item.map,author:m.authorId||null});
  else proposals.push({time:item.time,author:m.authorId||null});
 }
 const uniqueTimes=[...new Set(proposals.map(x=>x.time))];
 return {bans,picks,proposedTimes:uniqueTimes,agreedTime:null,threeMaps:[],status:'needs_admin_review',notes:'A short time message alone is not proof of agreement. Determine three maps only after full ban/pick rules and team confirmations are known.'};
}
