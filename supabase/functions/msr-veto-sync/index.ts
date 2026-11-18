const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
async function db(path:string,init:RequestInit={}){const r=await fetch(base+'/rest/v1/'+path,{...init,headers:{...headers,...init.headers}});if(!r.ok)throw Error('database_'+r.status);const body=await r.text();return body?JSON.parse(body):null;}
// msl-veto, msl-vote and msl-result channels (plus the threads inside them), read with the MSR Official Bot: raw messages (text + attachment links) go to msr_discord_rel_inbox; veto posts (bans / picks / decider / time) are parsed into msr_discord_rel_matches, which the site reads.
// Fixed MSL channels plus every guild channel whose name contains "veto" or "vote" (VOID, SPS, ... found automatically).
const FIXED=['1571086314294485022','1571110242102808586','1571086271026036816'];
const GUILD='1568348065595785316';

function parseRel(content:string){
 const lines=content.replace(/\u{1F19A}️?/gu,' vs ').split(/\r?\n/).map(s=>s.replace(/(\d)\s*:\s*(\d)/g,'$1:$2').replace(/\s+/g,' ').trim()).filter(Boolean);
 const vsLines=lines.filter(s=>/\bvs\b/i.test(s));
 if(vsLines.length!==1)return null;
 const versus=vsLines[0].match(/^(.+?)\s+vs\s+(.+?)(?:\s+(\d{1,2}:\d{2}))?$/i);
 if(!versus)return null;
 const aliases:Record<string,string>={dune:'Dune',rust:'Rust',breeze:'Breeze',breez:'Breeze',hanami:'Hanami',prison:'Prison',sakura:'Sakura',prov:'Province',provice:'Province',province:'Province',sandstone:'Sandstone',sand:'Sandstone'};
 const map=(s:string)=>aliases[s.toLowerCase().replace(/[^a-z]/g,'')]||null;
 const findMap=(line:string)=>{for(const t of line.toLowerCase().split(/[^a-z]+/)){if(aliases[t])return {token:t,name:aliases[t]};}return null;};
 const clean=(s:string)=>s.replace(/^\d+[.]\s*/,'').replace(/[-:\s]*pick[-:\s]*/ig,'').replace(/[()]/g,' ').replace(/\s+(?:1st|2nd|3rd|first|second|third)\b/ig,' ').replace(/\s+/g,' ').replace(/^[-:\s]+|[-:\s]+$/g,'');
 const picks:any[]=[],legacy:any[]=[],bans:any[]=[];let decider:string|null=null,bare:string|null=null,time=versus[3]||null;
 const vi=lines.indexOf(vsLines[0]);
 for(const line of lines.slice(vi+1)){
  if(/^[-=_~\s]+$/.test(line))continue;
  const tm=line.match(/^(?:(?:time|tsag)\s*:?\s*)?(\d{1,2}:\d{2}|\d{1,2})$/i)||line.match(/^(?:time|tsag)\s*:?\s*(\d{1,2})(?::(\d{2}))?:?\s*$/i);
  if(tm){const raw=tm[2]?tm[1]+':'+tm[2]:tm[1];time=raw.includes(':')?raw:raw+':00';continue;}
  const dt=line.match(/^(\d{1,2}:\d{2})\s+\d{1,2}[\/.]\d{1,2}$/)||line.match(/^\d{1,2}[\/.]\d{1,2}\s+(\d{1,2}:\d{2})$/);
  if(dt){time=dt[1];continue;}
  const ap=line.match(/^(?:(?:time|tsag)\s*:?\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if(ap){let hr=Number(ap[1])%12;if(ap[3].toLowerCase()==='pm')hr+=12;time=String(hr)+':'+(ap[2]||'00');continue;}
  const evening=line.match(/^oroini\s+(\d{1,2})\s*tsgaas$/i);if(evening){const hour=Number(evening[1]);if(hour>=1&&hour<=11)time=String(hour+12)+':00';continue;}
  if(/\bbans?\b/i.test(line)){
   const bm=line.match(/^(.*?)\s*\bbans?\b\s*[:\-]?\s*(.*)$/i);
   if(bm){
    const after=findMap(bm[2]||''),before=findMap(bm[1]||'');
    if(after&&bm[1]&&!before){const team=clean(bm[1]);if(team)bans.push({team,map:after.name});}
    else if(before&&bm[2]){const team=clean(bm[2]);if(team)bans.push({team,map:before.name});}
   }
   continue;
  }
  const found=findMap(line);
  const dm=line.match(/^(?:decider|dec)\b[\s\w]*?[-:]?\s*(.+)$/i)||line.match(/^(.+?)\s+(?:decider|dec)$/i);
  if(/\bdec(?:ider)?\b/i.test(line)&&found){decider=found.name;continue;}
  if(dm&&map(dm[1])){decider=map(dm[1]);continue;}
  if(/pick/i.test(line)&&found){
   const team=clean(line.replace(new RegExp('\\b'+found.token+'\\w*','i'),' ').replace(/pick/ig,' ').replace(/\s+/g,' '));
   if(team){picks.push({team,map:found.name});continue;}
  }
  const pm=line.match(/^(.+?)\s*(?:[-:]\s*|\s+)([a-z]+)$/i);
  if(pm&&map(pm[2])){legacy.push({team:clean(pm[1]),map:map(pm[2])});continue;}
  const reverse=line.match(/^([a-z]+)\s*[-: ]\s*(.+)$/i);
  if(reverse&&map(reverse[1])){legacy.push({team:clean(reverse[2]),map:map(reverse[1])});continue;}
  if(map(line)&&!decider){bare=map(line);continue;}
 }
 const finalPicks=picks.length?picks:legacy;
 if(!decider&&bare&&finalPicks.length===2)decider=bare;
 if(finalPicks.length!==2||!decider)return null;
 const ta=versus[1].trim().slice(0,100),tb=versus[2].trim().slice(0,100);
 // A pick/ban owner written as a short prefix of exactly one of the two teams (e.g. "2990" for "2990 white") is the full team name.
 const nk=(s:string)=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const own=(t:string)=>{const x=nk(t),A=nk(ta),B=nk(tb);if(!x||x===A||x===B)return t;const pa=A.startsWith(x),pb=B.startsWith(x);return pa!==pb?(pa?ta:tb):t;};
 return {team_a:ta,team_b:tb,time_label:time,picks:finalPicks.map((p:any)=>({...p,team:p.team?own(p.team):p.team})),decider,bans:bans.map((p:any)=>({...p,team:own(p.team)}))};
}

// Fallback for veto posts without a single "A vs B" line (side-chooser formats).
function parseRelSides(content:string){
 const lines=content.split(/\r?\n/).map((s:string)=>s.replace(/(\d)\s*:\s*(\d)/g,'$1:$2').replace(/\s+/g,' ').trim()).filter(Boolean);
 const aliases:Record<string,string>={dune:'Dune',rust:'Rust',breeze:'Breeze',breez:'Breeze',hanami:'Hanami',prison:'Prison',sakura:'Sakura',prov:'Province',provice:'Province',province:'Province',sandstone:'Sandstone',sand:'Sandstone'};
 const findMap=(line:string)=>{for(const t of line.toLowerCase().split(/[^a-z]+/)){if(aliases[t])return aliases[t];}return null;};
 const hdr=lines.slice(0,3).find((l:string)=>!findMap(l)&&!/\d/.test(l)&&/^[^:()]{1,40}?\s*(?:\bvs\b|:|-|–|\bx\b)\s*[^:()]{1,40}$/i.test(l));
 if(!hdr)return null;
 const hm=hdr.match(/^([^:()]{1,40}?)\s*(?:\bvs\b|:|-|–|\bx\b)\s*([^:()]{1,40})$/i);
 if(!hm)return null;
 const a=hm[1].trim(),b=hm[2].trim();if(!a||!b)return null;
 const same=(x:string,y:string)=>x.toLowerCase().replace(/[^a-z0-9]/g,'')===y.toLowerCase().replace(/[^a-z0-9]/g,'');
 const canon=(n:string)=>same(n,a)?a:same(n,b)?b:null;
 const other=(n:string)=>n===a?b:a;
 let time:string|null=null,decider:string|null=null,bare:string|null=null;const picks:any[]=[];
 for(const line of lines.slice(lines.indexOf(hdr)+1)){
  const tm=line.match(/^(?:(?:time|tsag)\s*:?\s*)?(\d{1,2}:\d{2})$/i);if(tm){time=tm[1];continue;}
  const map=findMap(line);if(!map)continue;
  if(/\bdec(?:ider)?\b/i.test(line)){decider=map;continue;}
  let ct:string|null=null;
  const body=line.replace(/^\s*[a-z]+\s*[:\-–]\s*/i,'');
  const m1=body.match(/\bct\s*\(\s*([^)]+?)\s*\)/i)||body.match(/([^()]+?)\s*\(\s*ct\s*\)/i);
  if(m1){const nm=m1[1].replace(/^.*\bvs\b/i,'').trim();ct=canon(nm.split(/\bvs\b/i).pop()!.trim())||canon(nm);}
  if(!ct){const mt=body.match(/\btr?\s*\(\s*([^)]+?)\s*\)/i)||body.match(/([^()]+?)\s*\(\s*t\s*\)/i);if(mt){const t=canon(mt[1].trim());if(t)ct=other(t);}}
  if(ct){picks.push({team:other(ct),map});continue;}
  if(!bare)bare=map;
 }
 if(picks.length!==2)return null;
 if(!decider&&bare&&!picks.some((p:any)=>p.map===bare))decider=bare;
 if(!decider)return null;
 return {team_a:a.slice(0,100),team_b:b.slice(0,100),time_label:time,picks,decider,bans:[]};
}

// Last fallback: a post with just "A vs B" and the three final maps in order (no bans / no pick owners).
// Map 1 and Map 2 are stored with an empty team (the site then labels them "Map 1" / "Map 2"); the last one is the decider.
function parseMapsOnly(content:string){
 const aliases:Record<string,string>={dune:'Dune',rust:'Rust',breeze:'Breeze',breez:'Breeze',hanami:'Hanami',prison:'Prison',sakura:'Sakura',prov:'Province',provice:'Province',province:'Province',sandstone:'Sandstone',sand:'Sandstone'};
 const lines=content.replace(/\u{1F19A}️?/gu,' vs ').split(/\r?\n/).map(s=>s.replace(/(\d)\s*:\s*(\d)/g,'$1:$2').replace(/\s+/g,' ').trim()).filter(Boolean);
 const vs=lines.filter(s=>/\bvs\b/i.test(s));
 if(vs.length!==1)return null;
 const v=vs[0].match(/^(.+?)\s+vs\s+(.+?)(?:\s+(\d{1,2}:\d{2}))?$/i);if(!v)return null;
 let time=v[3]||null;const maps:string[]=[];
 for(const line of lines.slice(lines.indexOf(vs[0])+1)){
  const tm=line.match(/^(?:(?:time|tsag)\s*:?\s*)?(\d{1,2}:\d{2})$/i);if(tm){time=tm[1];continue;}
  if(/\b(?:ban|pick|dec(?:ider)?)\b/i.test(line))return null;
  const toks=line.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const hits=toks.map(t=>aliases[t]).filter(Boolean);
  if(hits.length&&toks.length<=hits.length+1){for(const m of hits)if(!maps.includes(m))maps.push(m);}
 }
 if(maps.length!==3)return null;
 return {team_a:v[1].trim().slice(0,100),team_b:v[2].trim().slice(0,100),time_label:time,picks:[{team:'',map:maps[0]},{team:'',map:maps[1]}],decider:maps[2],bans:[]};
}

const D='https://discord.com/api/v10';
async function ingest(messages:any[],channel:string,threadName:string|null){
 const rows=messages.map((m:any)=>{const src=m.message_snapshots?.[0]?.message||m;const text=String(src.content||'').slice(0,12000);return {raw:text,row:{message_id:m.id,channel_id:channel,content:(threadName?'[thread: '+threadName+']\n':'')+text,attachments:(src.attachments||[]).map((a:any)=>({url:a.url,filename:a.filename||'',content_type:a.content_type||'',size:a.size||0})),source_timestamp:m.edited_timestamp||m.timestamp,updated_at:new Date().toISOString()}};});
 if(rows.length)await db('msr_discord_rel_inbox?on_conflict=message_id',{method:'POST',body:JSON.stringify(rows.map(x=>x.row)),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
 const matches=rows.flatMap(x=>{const p=parseRel(x.raw)||parseRelSides(x.raw)||parseMapsOnly(x.raw);return p?[{message_id:x.row.message_id,source_timestamp:x.row.source_timestamp,...p}]:[];});
 if(matches.length)await db('msr_discord_rel_matches?on_conflict=message_id',{method:'POST',body:JSON.stringify(matches),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
 return matches.length;
}

Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const states=await db('msr_discord_sync_state?select=token_hash&id=eq.true');
 if(!token||digest!==states[0]?.token_hash)return new Response('Unauthorized',{status:401});
 const bot=Deno.env.get('MSR_BOT_TOKEN')||Deno.env.get('DISCORD_BOT_TOKEN');
 if(!bot)return Response.json({ok:false,error:'missing_bot_token'},{status:503});
 const auth={Authorization:'Bot '+bot};
 const out:any[]=[];
 try{
  const me=await fetch(D+'/users/@me',{headers:auth});
  const j:any=me.ok?await me.json():null;
  await db('msr_discord_rel_state?on_conflict=channel_id',{method:'POST',body:JSON.stringify({channel_id:'bot_identity',last_checked:new Date().toISOString(),last_status:j?('bot='+j.username+' id='+j.id):'users_me_'+me.status,scanned:0}),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
 }catch(_e){}
 let opts:any={};try{opts=await req.json();}catch(_e){}
 const CHANNELS=[...FIXED];const names:Record<string,string>={};
 try{const gr=await fetch(D+'/guilds/'+GUILD+'/channels',{headers:auth});if(gr.ok){const all:any[]=await gr.json();for(const c of all){if(![0,5,15].includes(c.type))continue;const n=String(c.name||'').normalize('NFKC').toLowerCase();names[c.id]=c.name;if(/veto|vote/.test(n)&&!CHANNELS.includes(c.id))CHANNELS.push(c.id);}}}catch(_e){}
 if(opts?.list)return Response.json({ok:true,channels:CHANNELS.map(id=>({id,name:names[id]||null}))});
 let activeThreads:any[]|null=null;
 for(const channel of CHANNELS){
  let status='ok',scanned=0,parsed=0,threads=0;
  try{
   const r=await fetch(D+'/channels/'+channel+'/messages?limit=100',{headers:auth});
   if(!r.ok){status='discord_'+r.status;}
   else{
    const messages=await r.json();
    if(!Array.isArray(messages))throw Error('invalid_response');
    scanned=messages.length;
    parsed+=await ingest(messages,channel,null);
    const list:any[]=[];
    try{
     if(activeThreads===null){
      const info:any=await (await fetch(D+'/channels/'+channel,{headers:auth})).json();
      activeThreads=[];
      if(info?.guild_id){const ar=await fetch(D+'/guilds/'+info.guild_id+'/threads/active',{headers:auth});if(ar.ok){const aj:any=await ar.json();activeThreads=aj.threads||[];}}
     }
     list.push(...activeThreads!.filter((t:any)=>t.parent_id===channel));
     const arc=await fetch(D+'/channels/'+channel+'/threads/archived/public?limit=50',{headers:auth});
     if(arc.ok){const aj:any=await arc.json();for(const t of aj.threads||[])if(!list.some((x:any)=>x.id===t.id))list.push(t);}
    }catch(_e){}
    for(const t of list.slice(0,60)){
     try{
      const tr=await fetch(D+'/channels/'+t.id+'/messages?limit=50',{headers:auth});
      if(!tr.ok)continue;
      const tm=await tr.json();
      if(Array.isArray(tm)&&tm.length){scanned+=tm.length;threads++;parsed+=await ingest(tm,channel,String(t.name||''));}
     }catch(_e){}
    }
   }
  }catch(_e){status='read_failed';}
  await db('msr_discord_rel_state?on_conflict=channel_id',{method:'POST',body:JSON.stringify({channel_id:channel,last_checked:new Date().toISOString(),last_status:status,scanned}),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
  out.push({channel,name:names[channel]||null,status,scanned,parsed,threads});
 }
 return Response.json({ok:true,channels:out});
});
