/* MSR verified group-stage results. Only confirmed map scores are published. */
(function(){
'use strict';
const results=[{group:'C',a:'WarKz',b:'4zi',winner:'WarKz',score:'2–1',maps:[['Rust',13,11],['Province',7,13],['Sandstone',13,10]]}];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function apply(){
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
const style=document.createElement('style');style.textContent='.msr-verified-result{border-color:#32c979!important}.msr-verified-result .msr-rr-status{background:#133d29!important;color:#79f0aa!important}.msr-verified-result .msr-match-winner{outline:1px solid #35d27b;border-radius:8px}.msr-verified-result .msr-match-loser{opacity:.65}.msr-verified-result .msr-rr-versus{color:#79f0aa!important;font-weight:900!important}';document.head.appendChild(style);
let queued=false;const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});});obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});apply();
})();