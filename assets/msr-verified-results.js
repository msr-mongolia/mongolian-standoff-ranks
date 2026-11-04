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
function verifiedGroupExtras(){
 const group=document.querySelector('.msr-rr-card .msr-zone-title h2');
 document.querySelectorAll('.msr-rr-card').forEach(section=>{
  if(!/GROUP C/i.test(section.querySelector('.msr-zone-title h2')?.textContent||''))return;
  if(section.querySelector('.msr-verified-standings'))return;
  const panel=document.createElement('div');panel.className='msr-verified-standings';
  panel.innerHTML='<strong>GROUP C · CONFIRMED RESULTS</strong><div>WarKz · MP 1 · W 1 · L 0 · RD +1 · PTS 3 · ELO 66 (+16)</div><div>4zi · MP 1 · W 0 · L 1 · RD −1 · PTS 0 · ELO 32 (−18)</div><small>Other Group C matches are pending. Points: 3 per match win. ELO calculated from MSR v2 match formula; initial 50.</small>';
  section.querySelector('.msr-zone-note')?.after(panel);
  const all={};Object.keys(verifiedStats).forEach(map=>Object.keys(verifiedStats[map]).forEach(code=>verifiedStats[map][code].forEach(row=>{const key=code+'|'+norm(row[0]);const x=all[key]||(all[key]={code,nick:row[0],k:0,d:0,a:0,maps:0});x.k+=row[1];x.d+=row[2];x.a+=row[3];x.maps++;})));
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
function verifiedRanking(){
 const table=document.querySelector('.t tbody');if(!table||!location.hash.match(/ranking/i)||document.querySelector('.msr-verified-ranking-note'))return;
 const box=document.createElement('div');box.className='msr-verified-ranking-note';
 box.textContent='Verified MSL S2 ELO: WarKz 66 (+16, 1W–0L) · 4zi 32 (−18, 0W–1L). These teams are not yet integrated into the main ranking roster.';
 table.closest('.box')?.before(box);
}
const norm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function apply(){verifiedGroupExtras();verifiedPlayerStats();verifiedRanking();
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
const style=document.createElement('style');style.textContent='.msr-verified-standings,.msr-verified-player-stats,.msr-verified-ranking-note{margin:12px 0;padding:14px;border:1px solid #3eac72;border-radius:10px;background:#0b1d18;color:#e6f8ec}.msr-verified-standings div,.msr-verified-player-stats div{margin-top:8px}.msr-verified-standings small,.msr-verified-player-stats small{display:block;margin-top:8px;color:#9eb5a9}.msr-verified-result{border-color:#32c979!important}.msr-verified-result .msr-rr-status{background:#133d29!important;color:#79f0aa!important}.msr-verified-result .msr-match-winner{outline:1px solid #35d27b;border-radius:8px}.msr-verified-result .msr-match-loser{opacity:.65}.msr-verified-result .msr-rr-versus{color:#79f0aa!important;font-weight:900!important}';document.head.appendChild(style);
let queued=false;const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});});obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});apply();
})();