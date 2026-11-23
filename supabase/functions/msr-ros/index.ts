// msr_ros ingest: reads every message (and thread message) of the MSR team-registration channel with the
// MSR Official Bot, stores the raw text in the private msr_ros_inbox table and copies image attachments
// (team logos) to the public team-logos bucket so they never expire. Reconciliation against the site is
// done by the msr_ros command run never automatically here.
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
async function db(path:string,init:RequestInit={}){const r=await fetch(base+'/rest/v1/'+path,{...init,headers:{...headers,...init.headers}});if(!r.ok)throw Error('database_'+r.status+' '+(await r.text()).slice(0,200));const b=await r.text();return b?JSON.parse(b):null;}
const D='https://discord.com/api/v10';
// 1571082373032968294 is the 👑TOUR PRIVATE category; 1570818287086866562 is ROSTER REGISTRATION.
// Every text channel under these categories (plus their threads) is read, plus any *blacklist* channel (ban list).
const CATEGORIES=['1571082373032968294','1570818287086866562'];
async function copyLogo(url:string,key:string){
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(u.hostname))return null;
  const r=await fetch(u,{redirect:'error'});if(!r.ok)return null;
  const mime=(r.headers.get('content-type')||'').split(';')[0];
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(mime))return null;
  const bytes=await r.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>26214400)return null;
  const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'jpg';
  const path='ros/'+key+'.'+ext;
  const up=await fetch(base+'/storage/v1/object/team-logos/'+path,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':mime,'x-upsert':'true'},body:bytes});
  return up.ok?base+'/storage/v1/object/public/team-logos/'+path:null;
 }catch(_e){return null;}
}
Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 // Public, read-only: index of result-channel posts and their stored screenshots (used by the ss-fetch GitHub workflow).
 // Channels come from the latest results-mode run, so new "*result*" channels appear automatically. No Discord call, no secrets.
 const q=new URL(req.url).searchParams;
 if(q.get('mode')==='sslist'){
  const runs:any[]=await db('msr_ros_runs?select=result&order=ran_at.desc&limit=20')||[];
  const run=runs.find((r:any)=>r.result?.mode==='results');
  const chans:any[]=run?.result?.channels||[];
  const ids=chans.map((c:any)=>c.channel).filter((x:any)=>/^\d+$/.test(String(x)));
  const rows:any[]=ids.length?(await db('msr_ros_inbox?select=message_id,channel_id,content,logo_urls,source_timestamp&order=source_timestamp.asc&channel_id=in.('+ids.join(',')+')')||[]):[];
  const cname=(id:string)=>String((chans.find((c:any)=>c.channel===id)||{}).name||'');
  return Response.json({ok:true,posts:rows.map((r:any)=>({id:r.message_id,channel:cname(r.channel_id),time:r.source_timestamp,text:r.content,images:(r.logo_urls||[]).map((u:string)=>String(u).split('/ros/')[1]).filter(Boolean)}))});
 }
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const states=await db('msr_discord_sync_state?select=token_hash&id=eq.true');
 if(!token||digest!==states[0]?.token_hash)return new Response('Unauthorized',{status:401});
 // MSR Official Bot first; fall back to the older registration bot if it cannot see the channel.
 const tokens=[Deno.env.get('MSR_BOT_TOKEN'),Deno.env.get('DISCORD_BOT_TOKEN')].filter(Boolean) as string[];
 if(!tokens.length)return Response.json({ok:false,error:'missing_bot_token'},{status:503});
 const auth={Authorization:'Bot '+tokens[0]};const access:any[]=[];
 // mode 'results': read every text channel whose name contains "result" (any category), messages since `since` (default Nov 12),
 // copying screenshot attachments to team-logos/ros/<messageId>_<i> so they can be read later.
 let opts:any={};try{opts=await req.json();}catch(_e){}
 const RESULTS=opts?.mode==='results';const SINCE=Date.parse(opts?.since||'2026-11-12T00:00:00Z');
 const cat=await (await fetch(D+'/channels/'+CATEGORIES[0],{headers:auth})).json().catch(()=>null);
 const gid=cat?.guild_id||'1568348065595785316';
 const all:any[]=await (await fetch(D+'/guilds/'+gid+'/channels',{headers:auth})).json().catch(()=>[]);
 const nm=(c:any)=>String(c.name||'').normalize('NFKC').toLowerCase();
 const CHANS=(Array.isArray(all)?all:[]).filter((c:any)=>[0,5,15].includes(c.type)&&(RESULTS?/result/.test(nm(c)):(CATEGORIES.includes(c.parent_id)||/black|хар.?жагсаалт/.test(nm(c)))));
 if(opts?.list)return Response.json({ok:true,guild:gid,channels:CHANS.map((c:any)=>({id:c.id,name:c.name,parent:c.parent_id,parentName:(all.find((x:any)=>x.id===c.parent_id)||{}).name||null}))});
 let activeThreads:any[]=[];try{const ar=await fetch(D+'/guilds/'+gid+'/threads/active',{headers:auth});if(ar.ok)activeThreads=(await ar.json()).threads||[];}catch(_e){}
 const known=new Map<string,any>((await db('msr_ros_inbox?select=message_id,logo_urls,source_timestamp')||[]).map((x:any)=>[x.message_id,x]));
 let scanned=0,stored=0,logos=0,threads=0;const errors:string[]=[];
 async function ingest(msgs:any[],threadName:string|null,CHANNEL:string){
  const rows:any[]=[];
  for(const m of msgs){
   scanned++;
   const src=m.message_snapshots?.[0]?.message||m;
   const ts=m.edited_timestamp||m.timestamp;
   const att=[...(src.attachments||[]),...(m.attachments||[])].map((a:any)=>({url:a.url,filename:a.filename||'',content_type:a.content_type||'',size:a.size||0}));
   const emb=[...(src.embeds||[]),...(m.embeds||[])].flatMap((e:any)=>[e.image?.url,e.thumbnail?.url].filter(Boolean)).map((url:string)=>({url,filename:'embed',content_type:'image/unknown',size:0}));
   const all=[...att,...emb];
   const prev=known.get(m.id);
   let logo_urls:any[]=prev&&prev.source_timestamp&&Date.parse(prev.source_timestamp)>=Date.parse(ts)?(prev.logo_urls||[]):[];
   if(!logo_urls.length){
    let i=0;for(const a of all){if(a.content_type&&!/image/.test(a.content_type))continue;const u=await copyLogo(a.url,m.id+'_'+(i++));if(u){logo_urls.push(u);logos++;}}
   }
   rows.push({message_id:m.id,channel_id:CHANNEL,thread_name:threadName,author:m.author?.global_name||m.author?.username||'',content:String(src.content||'').slice(0,12000),attachments:all.map(a=>({filename:a.filename,content_type:a.content_type,size:a.size})),logo_urls,source_timestamp:ts,updated_at:new Date().toISOString()});
  }
  if(rows.length){await db('msr_ros_inbox?on_conflict=message_id',{method:'POST',body:JSON.stringify(rows),headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});stored+=rows.length;}
 }
 async function readAll(channel:string,threadName:string|null,maxPages:number,parent:string){
  let before='';
  for(let p=0;p<maxPages;p++){
   const r=await fetch(D+'/channels/'+channel+'/messages?limit=100'+(before?'&before='+before:''),{headers:auth});
   if(!r.ok){errors.push(channel+':'+r.status);return;}
   let msgs=await r.json();if(!Array.isArray(msgs)||!msgs.length)return;
   const old=RESULTS&&msgs.some((m:any)=>Date.parse(m.timestamp)<SINCE);
   if(RESULTS)msgs=msgs.filter((m:any)=>Date.parse(m.timestamp)>=SINCE);
   if(msgs.length)await ingest(msgs,threadName,parent);
   if(old)return;
   before=msgs[msgs.length-1].id;if(msgs.length<100)return;
  }
 }
 for(const ch of CHANS){
  const before=errors.length,s0=scanned;
  try{
   if(ch.type!==15)await readAll(ch.id,null,30,ch.id);
   const list:any[]=activeThreads.filter((t:any)=>t.parent_id===ch.id);
   try{const arc=await fetch(D+'/channels/'+ch.id+'/threads/archived/public?limit=100',{headers:auth});if(arc.ok){const aj:any=await arc.json();for(const t of aj.threads||[])if(!list.some((x:any)=>x.id===t.id))list.push(t);}}catch(_e){}
   for(const t of list.slice(0,80)){threads++;await readAll(t.id,String(t.name||''),5,ch.id);}
  }catch(e){errors.push(String((e as Error).message||e));}
  access.push({channel:ch.id,name:ch.name,parent:ch.parent_id,read:errors.length===before?'ok':'error',messages:scanned-s0});
 }
 const result={ok:!errors.length||stored>0,mode:RESULTS?'results':'ros',channels:access,scanned,stored,logos,threads,errors};
 await db('msr_ros_runs',{method:'POST',body:JSON.stringify({result}),headers:{Prefer:'return=minimal'}}).catch(()=>null);
 return Response.json(result);
});
