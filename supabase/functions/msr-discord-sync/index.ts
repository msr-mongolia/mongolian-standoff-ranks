const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
async function db(path:string,init:RequestInit={}){const r=await fetch(base+'/rest/v1/'+path,{...init,headers:{...headers,...init.headers}});if(!r.ok)throw Error('database_'+r.status);const body=await r.text();return body?JSON.parse(body):null;}
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function parse(content:string){
 const lines=content.replace(/[*\x60]/g,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const clean=(s:string)=>s.replace(/^[\s✔✓✅️🇲🇳🇨🇳<>\-]+/gu,'').replace(/^[\s#•\-–—:：『』【】<>👑]+|[\s『』【】]+$/gu,'').trim();
 const lead=(s:string)=>clean(clean(s).replace(/^(?:\[\s*[xX✔✓]?\s*\]|["'“”«»])\s*/u,''));
 const namePattern=/^(?:(?:clan|team)\s*name|name|team|багийн\s*нэр|баг|bagiin\s*ner|bagiin\s*name)\s*[:：=\/\-]\s*(.*)$/i;
 let name='';
 for(let i=0;i<lines.length;i++){const m=lead(lines[i]).match(namePattern);if(m){name=clean(m[1]||lines[i+1]||'');break;}}
 if(!name && lines[0] && !/\d{5,}|https?:|captain|roster|main|sub|бүртгэл|registration/i.test(lines[0])) name=clean(lines[0]);
 const tag=lines.map(s=>clean(s).match(/^(?:(?:clan|team|bagiin|багийн)\s*)?(?:tag|таг)\s*[:：=\/\-]\s*(.+)$/i)).find(Boolean)?.[1]?.replace(/[『』\[\]]/g,'').trim()||'';
 if(!name||name.length>100||!norm(name))return null;
 name=name.replace(/[👑亗乂]/gu,'').replace(/\s*\[[^\]]{1,20}\]\s*$/,'').trim();
 const roster:string[]=[]; const player_ids:Record<string,string>={};
 function nickname(prefix:string){
  return clean(prefix)
   .replace(/^(?:\[\s*\]\s*)?(?:(?:team\s*)?captain|main|sub(?:stitute)?s?|player|тоглогч|ахлагч)\s*\d*\s*[:：–—-]?\s*/i,'')
   .replace(/^(?:【\s*\d+\s*】|S?\d{1,2}\s*】|[([]?\d{1,2}[)\].:-])\s*[×x]?\s*/,'')
   .split(/\s*[-–—]?\s*\bdev(?:ice)?\s*[-:：]?/i)[0]
   .split(/\b(?:iphone|ipad|ip\s*\d|ios|honor|redmi|samsung|poco|rog|realme|lenovo|tecno|infinix|red\s*magic)/i)[0]
   .replace(/^(?:ign)\s*[-:：]?\s*/i,'').replace(/[亗乂]/gu,'').replace(/\s+\d{1,2}\s*(?:pro|max|plus|pm)\b.*$/i,'')
   .replace(/\b[A-Z0-9]{8,}\b/g,s=>/\d/.test(s)&&/[A-Z]/.test(s)?'':s)
   .replace(/[\s–—:/~-]*\bID\s*[:：-]?\s*$/i,'')
   .replace(/[\s–—:/~\-\[\]]+$/g,'').replace(/^[\s–—:/~\-\[\]>＞›»]+/g,'').trim();
 }
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  const match=line.match(/\b\d{5,12}\b/);
  if(!match)continue;
  let prefix=line.slice(0,match.index);
  const brackets=line.match(/\[([^\]]{1,40})\]\s*\[\d{5,12}\]/);
  if(brackets)prefix=brackets[1];
  else if(/^\s*(?:[-#•~]\s*)?ID\s*[:：-]?\s*[—–-]?\s*$/i.test(prefix)) prefix=lines[i-1]||'';
  const nick=nickname(prefix);
  if(!nick||nick.length>40||/https?:|clan|captain|roster|^main$|^sub$|name\s*:/i.test(nick)||/\d{5,}/.test(nick))continue;
  if(!roster.includes(nick))roster.push(nick); player_ids[nick]=match[0];
 }
 if(roster.length<5||roster.length>12)return null;
 return {name,tag:tag.slice(0,30),name_key:norm(name),roster,player_ids};
}
async function logo(attachments:any[],id:string,embeds:any[]=[]){
 const candidates=[...(attachments||[]).map(a=>({url:a.url,mime:a.content_type,filename:a.filename,size:a.size})),...(embeds||[]).flatMap(e=>[e.image?.url,e.thumbnail?.url].filter(Boolean).map(url=>({url,mime:'',filename:new URL(url).pathname.split('/').pop(),size:0})))];
 for(const a of candidates){
  try{
   const u=new URL(a.url);
   if(u.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(u.hostname)||!u.pathname.startsWith('/attachments/'))continue;
   if(a.size>2097152)continue;
   const r=await fetch(u,{redirect:'error'});if(!r.ok)continue;
   const mime=(r.headers.get('content-type')||a.mime||'').split(';')[0];
   if(!['image/png','image/jpeg','image/webp'].includes(mime))continue;
   const bytes=await r.arrayBuffer();if(bytes.byteLength>2097152||!bytes.byteLength)continue;
   const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
   const path=id+'.'+ext;
   const up=await fetch(base+'/storage/v1/object/team-logos/'+path,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':mime,'x-upsert':'true'},body:bytes});
   if(up.ok)return base+'/storage/v1/object/public/team-logos/'+path;
  }catch(_e){continue;}
 }
 return null;
}


function parseRel(content:string){
 const lines=content.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines.filter(s=>/\bvs\b/i.test(s)).length!==1)return null;
 const versus=lines[0]?.match(/^(.+?)\s+vs\s+(.+?)(?:\s+(\d{1,2}:\d{2}))?$/i);
 if(!versus)return null;
 const map=(s:string)=>{const n=s.toLowerCase().replace(/[^a-z]/g,'');return ({dune:'Dune',rust:'Rust',breeze:'Breeze',hanami:'Hanami',prison:'Prison',sakura:'Sakura',prov:'Province',provice:'Province',province:'Province',sandstone:'Sandstone'} as Record<string,string>)[n]||null;};
 const clean=(s:string)=>s.replace(/^\d+[.]\s*/,'').replace(/[-:\s]*pick[-:\s]*/ig,'').replace(/^[-:\s]+|[-:\s]+$/g,'');
 const picks:any[]=[];let decider=null,time=versus[3]||null;
 for(const line of lines.slice(1)){
  const tm=line.match(/^(?:(?:time|tsag)\s*:?\s*)?(\d{1,2}:\d{2}|\d{1,2})$/i);if(tm){time=tm[1];continue;}
  const evening=line.match(/^oroini\s+(\d{1,2})\s*tsgaas$/i);if(evening){const hour=Number(evening[1]);if(hour>=1&&hour<=11)time=String(hour+12)+':00';continue;}
  const dm=line.match(/^(?:decider|dec)\s*[-:]?\s*(.+)$/i)||line.match(/^(.+?)\s+(?:decider|dec)$/i);if(dm){decider=map(dm[1]);continue;}
  const pm=line.match(/^(.+?)\s*(?:[-:]\s*|\s+)([a-z]+)$/i);
  if(pm&&map(pm[2])){picks.push({team:clean(pm[1]),map:map(pm[2])});continue;}
  const reverse=line.match(/^([a-z]+)\s*[-: ]\s*(.+)$/i);
  if(reverse&&map(reverse[1]))picks.push({team:clean(reverse[2]),map:map(reverse[1])});
 }
 if(picks.length!==2||!decider)return null;
 return {team_a:versus[1].trim().slice(0,100),team_b:versus[2].trim().slice(0,100),time_label:time,picks,decider};
}

async function syncRel(bot:string){
 const channels=["1566481823515549736","1566482961619222649","1566481893338128495","1566483021689913384","1566481922656444467","1566483063255601294","1566481953052426250","1566483106137903214","1566481985331794091","1566483155404456016","1566482016206323852","1566483232080273529"];
 for(const channel of channels){
  let status='ok',scanned=0;
  try{
   const response=await fetch('https://discord.com/api/v10/channels/'+channel+'/messages?limit=100',{headers:{Authorization:'Bot '+bot}});
   if(!response.ok){status='discord_'+response.status;}
   else{
    const messages=await response.json();
    if(!Array.isArray(messages))throw Error('invalid_response');
    scanned=messages.length;
    const rows=messages.map((m:any)=>{const src=m.message_snapshots?.[0]?.message||m;return {message_id:m.id,channel_id:channel,content:String(src.content||'').slice(0,12000),attachments:[...(src.attachments||[]),...(src.embeds||[]).flatMap((e:any)=>e.image?[{url:e.image.url,content_type:'image/unknown'}]:[])].map((a:any)=>({url:a.url,filename:a.filename||'',content_type:a.content_type||'',size:a.size||0})),source_timestamp:m.edited_timestamp||m.timestamp,updated_at:new Date().toISOString()};});
    if(rows.length)await db('msr_discord_rel_inbox?on_conflict=message_id',{method:'POST',body:JSON.stringify(rows),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
    const matches=rows.flatMap((row:any)=>{const parsed=parseRel(row.content);return parsed?[{message_id:row.message_id,source_timestamp:row.source_timestamp,...parsed}]:[];});
    if(matches.length)await db('msr_discord_rel_matches?on_conflict=message_id',{method:'POST',body:JSON.stringify(matches),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});

   }
  }catch(_e){status='read_failed';}
  await db('msr_discord_rel_state?on_conflict=channel_id',{method:'POST',body:JSON.stringify({channel_id:channel,last_checked:new Date().toISOString(),last_status:status,scanned}),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
 }
}

Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const states=await db('msr_discord_sync_state?select=token_hash&id=eq.true');
 if(!token||digest!==states[0]?.token_hash)return new Response('Unauthorized',{status:401});
 let imported=0,seen=0,skipped=0;let before='';
 try{
  const bot=Deno.env.get('DISCORD_BOT_TOKEN');if(!bot)throw Error('missing_bot_token');
  await syncRel(bot);
  const known=await db('msr_discord_teams?select=id,name,name_key,tag,source_message_id,source_timestamp,player_ids,roster,logo_url');
  const map=new Map(known.map((x:any)=>[x.name_key,x]));
  for(let page=0;page<10;page++){
   const r=await fetch('https://discord.com/api/v10/channels/1563893301269237812/messages?limit=100'+(before?'&before='+before:''),{headers:{Authorization:'Bot '+bot}});
   if(!r.ok)throw Error('discord_'+r.status);
   const msgs=await r.json();if(!Array.isArray(msgs))throw Error('invalid_discord_response');
   for(const m of msgs){
    seen++;const snapshot=m.message_snapshots?.[0]?.message; const source=snapshot||m; const team=parse(source.content||'');if(!team){skipped++;continue;}
    const prev:any=map.get(team.name_key)||known.find((x:any)=>x.source_message_id===m.id);
    const timestamp=m.edited_timestamp||m.timestamp;
    // Preserve newer roster corrections until the Discord post is edited again.
    if(prev && Date.parse(prev.source_timestamp)>Date.parse(timestamp))continue;
    if(prev && prev.source_message_id!==m.id && Date.parse(prev.source_timestamp)>=Date.parse(timestamp))continue;
    if(prev && prev.logo_url && JSON.stringify(prev.roster)===JSON.stringify(team.roster) && prev.name===team.name && (team.tag||prev.tag)===prev.tag && Object.keys(prev.player_ids||{}).length && Date.parse(prev.source_timestamp) >= Date.parse(timestamp)) continue;
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(team.name_key)))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
    const id=prev?.id||'ds_'+hash;
    const attachments=[...(source.attachments||[]),...(m.attachments||[])];const embeds=[...(source.embeds||[]),...(m.embeds||[])];
    let image=await logo(attachments,id,embeds).catch(()=>null);
    if(team.name_key==='wonderart'&&!image){
      const imageLinks=[...(source.content||'').matchAll(/https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/[^\s<>]+/g)].map(x=>x[0]);
      image=await logo(imageLinks.map(url=>({url})),id).catch(()=>null);
      console.log('wonderart_logo_diagnostic',JSON.stringify({attachments:attachments.map(a=>({type:a.content_type,size:a.size,filename:a.filename,host: (()=>{try{return new URL(a.url).hostname}catch{return ''}})()})),embeds:embeds.length,imageLinks:imageLinks.length,snapshot:!!snapshot,uploaded:!!image}));
    }
    const row={...team,tag:team.tag||prev?.tag||'',source_message_id:m.id,source_timestamp:timestamp,updated_at:new Date().toISOString(),...(image?{logo_url:image}:{})};
    if(prev)await db('msr_discord_teams?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(row),headers:{Prefer:'return=minimal'}});
    else await db('msr_discord_teams',{method:'POST',body:JSON.stringify({id,...row}),headers:{Prefer:'return=minimal'}});
    map.set(team.name_key,{id,...row});imported++;
   }
   if(msgs.length<100)break;
   before=msgs[msgs.length-1].id;
  }
  await db('msr_discord_sync_state?id=eq.true',{method:'PATCH',body:JSON.stringify({last_success:new Date().toISOString(),last_status:'ok; scanned='+seen+'; skipped='+skipped,imported}),headers:{Prefer:'return=minimal'}});
  return Response.json({ok:true,imported,scanned:seen,skipped});
 }catch(e){
  console.error('sync_error_type',e?.name); const status=String(e.message).match(/^(missing_bot_token|discord_\d+|database_\d+|invalid_discord_response)$/)?.[0]||'sync_failed';
  await db('msr_discord_sync_state?id=eq.true',{method:'PATCH',body:JSON.stringify({last_status:status}),headers:{Prefer:'return=minimal'}});
  return Response.json({ok:false,error:status},{status:503});
 }
});