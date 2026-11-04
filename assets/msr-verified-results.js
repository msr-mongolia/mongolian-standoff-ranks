/* MSR verified group-stage results. Only confirmed map scores are published. */
(function(){
'use strict';
const results=[{group:'C',a:'WarKz',b:'4zi',winner:'WarKz',score:'2–1',maps:[['Rust',13,11],['Province',7,13],['Sandstone',13,10]]}];
const verifiedStats={
Rust:{WarKz:[['wu °',23,14,7],['softsyko',20,17,3],['УЙЛАНХАЙТ',19,19,2],['Petisha',14,21,1],['BatiLo',13,17,2]],'4zi':[['Venn',29,16,3],['art_shisu',25,19,3],['RASEL',13,18,1],['FasouXI.666',10,19,3],['lOwzs777',11,19,4]]},
Province:{WarKz:[['wu °',24,15,2],['softsyko',14,16,3],['УЙЛАНХАЙТ',14,17,6],['Petisha',12,18,4],['BatiLo',6,15,1]],'4zi':[['art_shisu',27,12,3],['RASEL',13,15,3],['FasouXI.666',16,16,2],['Venn',13,13,2],['lOwzs777',12,14,4]]},
Sandstone:{WarKz:[['БАТИЛО Prime',22,12,4],['softsyko',23,17,3],['wu °',19,17,4],['Petisha',13,18,3],['УЙЛАНХАЙТ',8,18,3]],'4zi':[['Careley',22,16,3],['RASEL',20,17,3],['art_shisu',14,16,5],['Venn',14,18,0],['FasouXI.666',11,18,3]]}
};
const verifiedElo={WarKz:{before:50,after:66,change:16,w:1,l:0},'4zi':{before:50,after:32,change:-18,w:0,l:1}};
// Historical MSR proxy without demo randomness; this is estimated ADR, not measured damage.
const verifiedRounds={Rust:24,Province:20,Sandstone:23};
const estimatedAdr=(k,a,rounds)=>rounds?Math.round(Math.max(30,22+80*k/rounds+55*a/rounds)):null;
function verifiedMainStandings(){
 const summary=document.querySelector('.msr-rr-summary');
 if(!summary||summary.querySelector('.msr-rr-summary-head em')?.textContent?.trim()!=='C')return;
 const body=summary.querySelector('.msr-rr-table tbody');if(!body)return;
 const rows=[...body.rows];
 const normName=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let changed=false;
 for(const row of rows){
  const name=normName(row.cells[1]?.textContent);
  const win=name==='warriorkingzz'||name==='warkz',lose=name==='toexistwithpurpose'||name==='4zi';
  if(!win&&!lose)continue;
  const values=win?[1,1,0,1,3]:[1,0,1,-1,0];
  for(let i=0;i<5;i++){const cell=row.cells[i+2];if(cell&&cell.textContent.trim()!==String(values[i])){cell.textContent=String(values[i]);changed=true;}}
  const className=win?'msr-standings-win':'msr-standings-loss';
  if(!row.classList.contains(className)){row.classList.add(className);changed=true;}
 }
 const sorted=rows.slice().sort((a,b)=>{
  const points=row=>Number(row.cells[6]?.textContent.trim()||0);
  const p=points(b)-points(a);if(p)return p;
  const w=row=>Number(row.cells[3]?.textContent.trim()||0);
  return w(b)-w(a);
 });
 sorted.forEach((row,i)=>{
  if(body.rows[i]!==row){body.insertBefore(row,body.rows[i]||null);changed=true;}
  if(row.cells[0]&&row.cells[0].textContent!==String(i+1)){row.cells[0].textContent=String(i+1);changed=true;}
 });
}
function verifiedGroupExtras(){
 const group=document.querySelector('.msr-rr-card .msr-zone-title h2');
 document.querySelectorAll('.msr-rr-card').forEach(section=>{
  if(!/GROUP C/i.test(section.querySelector('.msr-zone-title h2')?.textContent||''))return;
  if(section.querySelector('.msr-verified-standings'))return;
  const panel=document.createElement('div');panel.className='msr-verified-standings';
  panel.innerHTML='<strong>GROUP C · CONFIRMED RESULTS</strong><div>WarKz · MP 1 · W 1 · L 0 · RD +1 · PTS 3 · ELO 66 (+16)</div><div>4zi · MP 1 · W 0 · L 1 · RD −1 · PTS 0 · ELO 32 (−18)</div><small>Other Group C matches are pending. Points: 3 per match win. ELO calculated from MSR v2 match formula; initial 50.</small>';
  section.querySelector('.msr-zone-note')?.after(panel);
  const all={};Object.keys(verifiedStats).forEach(map=>Object.keys(verifiedStats[map]).forEach(code=>verifiedStats[map][code].forEach(row=>{const key=code+'|'+norm(row[0]);const x=all[key]||(all[key]={code,nick:row[0],k:0,d:0,a:0,maps:0,rounds:0});x.k+=row[1];x.d+=row[2];x.a+=row[3];x.maps++;x.rounds+=verifiedRounds[map]||0;})));
  const table=document.createElement('details');table.className='msr-verified-standings';const summary=document.createElement('summary');summary.textContent='VERIFIED PLAYER K/D · WarKz vs 4zi (3 maps)';table.appendChild(summary);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px';
  ['WarKz','4zi'].forEach(code=>{const pane=document.createElement('div');const title=document.createElement('strong');title.textContent=code;pane.appendChild(title);Object.values(all).filter(x=>x.code===code).sort((a,b)=>b.k-a.k).forEach(x=>{const line=document.createElement('div');line.textContent=x.nick+' · '+x.k+'K / '+x.d+'D / '+x.a+'A · KD '+(x.k/Math.max(1,x.d)).toFixed(2)+' · '+x.maps+' maps';pane.appendChild(line);});grid.appendChild(pane);});table.appendChild(grid);panel.after(table);
 });
}
function verifiedPlayerStats(){
 const match=decodeURIComponent(location.hash||'').match(/^#player\/([^/]+)(?:\/([^/]+))?/);
 if(!match)return;
 const nick=norm(match[1]),team=norm(match[2]||'');
 if(team && !['warkz','4zi'].includes(team))return;
 const all=[];
 Object.keys(verifiedStats).forEach(map=>Object.keys(verifiedStats[map]).forEach(code=>verifiedStats[map][code].forEach(row=>{if(norm(row[0])===nick)all.push({map,code,k:row[1],d:row[2],a:row[3]});})));
 if(!all.length)return;
 const host=document.querySelector('.hl-head');if(!host||host.querySelector('.msr-verified-player-stats'))return;
 const k=all.reduce((v,x)=>v+x.k,0),d=all.reduce((v,x)=>v+x.d,0),a=all.reduce((v,x)=>v+x.a,0);
 const el=document.createElement('div');el.className='msr-verified-player-stats';
 el.innerHTML='<strong>MSL S2 · VERIFIED STATS</strong><div>Maps: '+all.length+' · Kills: '+k+' · Deaths: '+d+' · Assists: '+a+' · K/D: '+(k/Math.max(1,d)).toFixed(2)+'</div><small>Based on screenshots; ADR and KAST unavailable.</small>';
 host.appendChild(el);
}
function verifiedTeamProfiles(){
 const profile=document.querySelector('.prof');if(!profile)return;
 const title=norm(profile.querySelector('h1')?.textContent||'');
 const code=title.includes('warriorkingzz')||title.includes('warkz')?'WarKz':title.includes('toexistwithpurpose')||title.includes('4zi')?'4zi':null;
 if(!code)return;
 const won=code==='WarKz',all={};
 Object.keys(verifiedStats).forEach(map=>(verifiedStats[map][code]||[]).forEach(row=>{
  const key=norm(row[0]),x=all[key]||(all[key]={nick:row[0],k:0,d:0,a:0,maps:0,rounds:0});
  x.k+=row[1];x.d+=row[2];x.a+=row[3];x.maps++;x.rounds+=verifiedRounds[map]||0;
 }));
 const stats=document.querySelector('.msr-team-stats');
 if(stats){
  const tiles=[...stats.querySelectorAll('.msr-team-stat-grid > *')];
  const update=(label,value)=>{const tile=tiles.find(x=>norm(x.textContent).startsWith(norm(label)));if(!tile)return;const valueEl=tile.querySelector('.v')||[...tile.querySelectorAll('*')].find(x=>x.children.length===0&&/^0$|^—$|^0%$/.test(x.textContent.trim()));if(valueEl&&valueEl.textContent!==value)valueEl.textContent=value;};
  update('Matches','1');update('Win rate',won?'100%':'0%');
  const k=Object.values(all).reduce((n,x)=>n+x.k,0),d=Object.values(all).reduce((n,x)=>n+x.d,0);
  update('K/D',(k/Math.max(1,d)).toFixed(2));
 }
 const boxes=[...document.querySelectorAll('.prof-grid .box')];
 const lineup=boxes.find(x=>/Lineup/i.test(x.querySelector('.panel-h')?.textContent||''));
 if(lineup){
  const rows=[...lineup.querySelectorAll('tbody tr')];
  // Only update registered players already present in the team's lineup.
  // Never append extra match participants: mutation observers re-run this function.
  const aliases={'hiro':'venn','petish':'petisha','batilo':'батилопрime','makk':'батилопрime'};
  rows.forEach(row=>{
   if(row.classList.contains('msr-verified-participant')||/\s·\s*match\s*$/i.test(row.cells[0]?.textContent||'')){row.remove();return;}
   const nick=norm(row.cells[0]?.querySelector('a.tl b')?.textContent||row.cells[0]?.querySelector('a.tl')?.textContent||row.cells[0]?.textContent||'');
   const key=Object.prototype.hasOwnProperty.call(all,nick)?nick:norm(aliases[nick]||'');
   const x=all[key];
   if(!x)return;
   const set=(i,v)=>{if(row.cells[i]&&row.cells[i].textContent!==v)row.cells[i].textContent=v;};
   set(1,String(x.maps));set(2,(x.k/Math.max(1,x.d)).toFixed(2));
   const tooltip='All verified maps · '+x.k+' kills / '+x.d+' deaths / '+x.a+' assists';
   if(row.title!==tooltip)row.title=tooltip;
   let totals=row.cells[0]?.querySelector('.msr-total-kills');
   if(!totals&&row.cells[0]){totals=document.createElement('small');totals.className='msr-total-kills';totals.style.cssText='display:block;color:#9fe7b4;font-size:10px;white-space:nowrap';row.cells[0].appendChild(totals);}
   const totalLabel=x.k+' K / '+x.d+' D / '+x.a+' A';
   if(totals&&totals.textContent!==totalLabel)totals.textContent=totalLabel;
   set(3,String(estimatedAdr(x.k,x.a,x.rounds)??'—'));
   [4,5].forEach(i=>set(i,'—'));
  });
  if(!lineup.querySelector('.msr-team-kda-note')){
   const note=document.createElement('div');note.className='msr-team-kda-note';note.textContent='MSL S2 · 3 maps verified · K/D from screenshots. ADR estimated from kills, assists and rounds; KAST and Rating not supplied.';lineup.appendChild(note);
  }
  if(!lineup.querySelector('.msr-team-verified-players')){
   const details=document.createElement('details');details.className='msr-team-verified-players';
   const summary=document.createElement('summary');summary.textContent='Full match roster · K/D and assists';details.appendChild(summary);
   Object.values(all).sort((a,b)=>b.k-a.k).forEach(x=>{const line=document.createElement('div');line.textContent=x.nick+' · '+x.maps+' maps · '+x.k+' K / '+x.d+' D / '+x.a+' A · K/D '+(x.k/Math.max(1,x.d)).toFixed(2);details.appendChild(line);});
   lineup.appendChild(details);
  }
 }
 const pool=boxes.find(x=>/Map pool/i.test(x.querySelector('.panel-h')?.textContent||''));
 if(pool){
  [...pool.querySelectorAll('tbody tr')].forEach(row=>{
   const map=row.cells[0]?.textContent.trim(),m=results[0].maps.find(x=>norm(x[0])===norm(map));
   if(!m)return;
   const win=won?m[1]>m[2]:m[2]>m[1];
   if(row.cells[1]&&row.cells[1].textContent.trim()!=='1')row.cells[1].textContent='1';
   if(row.cells[2]&&row.cells[2].textContent.trim()!==(win?'100%':'0%'))row.cells[2].textContent=win?'100%':'0%';
  });
  if(!pool.querySelector('.msr-team-kda-note')){
   const note=document.createElement('div');note.className='msr-team-kda-note';note.textContent='Verified maps: Rust, Province, Sandstone. Pick/ban and CT/T rates are not confirmed.';pool.appendChild(note);
  }
 }
 const form=document.querySelector('.form.left');
 if(form&&form.dataset.msrVerifiedForm!=='1'){form.dataset.msrVerifiedForm='1';form.replaceChildren();const el=document.createElement('i');el.className=won?'w':'l';el.textContent=won?'W':'L';form.appendChild(el);}
 if(stats&&!stats.querySelector('.msr-verified-match-summary')){
  const info=document.createElement('div');info.className='msr-verified-match-summary';
  info.textContent='MSL S2 · '+(won?'WIN 2–1 vs 4Zi':'LOSS 1–2 vs WarKz')+' · Rust 13–11 · Province 7–13 · Sandstone 13–10';
  stats.appendChild(info);
 }
}
function verifiedRanking(){ /* Main ranking is now sourced from Supabase team points. */ }

const norm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function apply(){verifiedTeamProfiles();verifiedMainStandings();verifiedGroupExtras();verifiedPlayerStats();verifiedRanking();
 document.querySelectorAll('.msr-rr-card').forEach(section=>{
  const group=(section.querySelector('.msr-zone-title h2')?.textContent||'').match(/GROUP\s+([A-F])/i)?.[1];
  results.filter(r=>r.group===group).forEach(r=>{
   section.querySelectorAll('.msr-rr-match').forEach(card=>{
    const names=[...card.querySelectorAll('.msr-rr-clan-tag')].map(x=>norm(x.textContent));
    if(names.length!==2||!names.includes(norm(r.a))||!names.includes(norm(r.b)))return;
    if(card.dataset.msrVerified==='1')return;
    card.dataset.msrVerified='1';card.classList.add('msr-verified-result');
    const vs=card.querySelector('.msr-rr-versus');if(vs)vs.textContent=r.score;
    const status=card.querySelector('.msr-rr-status');if(status)status.textContent='FINAL · '+r.winner+' WIN';
    card.querySelectorAll('.msr-rr-team').forEach(team=>{const tag=norm(team.querySelector('.msr-rr-clan-tag')?.textContent);team.classList.toggle('msr-match-winner',tag===norm(r.winner));team.classList.toggle('msr-match-loser',tag!==norm(r.winner));});
    const info=document.createElement('div');info.className='msr-rel-details';r.maps.forEach(m=>{const span=document.createElement('span');span.textContent=m[0]+' · '+r.a+' '+m[1]+'–'+m[2]+' '+r.b;info.appendChild(span);});card.appendChild(info);
   });
  });
 });
}
const style=document.createElement('style');style.textContent='.msr-team-kda-note,.msr-team-verified-players,.msr-verified-match-summary{padding:10px 14px;margin:8px 0;color:#b8ead2;background:rgba(19,75,49,.22);border:1px solid #2b7552;border-radius:8px;font-size:12px}.msr-team-verified-players div{padding:4px 0}.msr-standings-win{background:rgba(33,148,82,.15)!important}.msr-standings-win td:nth-child(4){color:#6ff0a0!important;font-weight:800}.msr-standings-loss{background:rgba(167,52,63,.10)!important}.msr-standings-loss td:nth-child(5){color:#ff9a9a!important;font-weight:800}.msr-verified-rank-line{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:10px;padding:9px 12px;border:1px solid #345f49;border-radius:8px}.msr-verified-rank-line strong{font-size:18px;color:#e5f7e9}.msr-verified-rank-line span{margin-left:auto;color:#9fe7b4}.msr-verified-ranking-note small{display:block;margin-top:10px;color:#9eb5a9}.msr-verified-standings,.msr-verified-player-stats,.msr-verified-ranking-note{margin:12px 0;padding:14px;border:1px solid #3eac72;border-radius:10px;background:#0b1d18;color:#e6f8ec}.msr-verified-standings div,.msr-verified-player-stats div{margin-top:8px}.msr-verified-standings small,.msr-verified-player-stats small{display:block;margin-top:8px;color:#9eb5a9}.msr-verified-result{border-color:#32c979!important}.msr-verified-result .msr-rr-status{background:#133d29!important;color:#79f0aa!important}.msr-verified-result .msr-match-winner{outline:1px solid #35d27b;border-radius:8px}.msr-verified-result .msr-match-loser{opacity:.65}.msr-verified-result .msr-rr-versus{color:#79f0aa!important;font-weight:900!important}';document.head.appendChild(style);
let queued=false;const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});});obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});apply();
})();