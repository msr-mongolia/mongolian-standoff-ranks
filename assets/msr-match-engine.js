/* MSR verified screenshot match ledger. Only staff-confirmed transcriptions go here.
   Each match: id, date, a, b, maps:[{map,aScore,bScore,a:[[nick,k,d,a]],b:[[nick,k,d,a]]}].
   Never add an unverified screenshot or invent missing ADR/KAST. */
window.MSR_MATCH_LEDGER = window.MSR_MATCH_LEDGER || [];
window.MSR_MATCH_ENGINE = (function(){
  const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\\p{L}\\p{N}]/gu,'');
  function validate(m){
    if(!m||!m.id||!m.a||!m.b||normalize(m.a)===normalize(m.b)||!Array.isArray(m.maps)||!m.maps.length)return false;
    return m.maps.every(x=>x&&x.map&&Number.isInteger(x.aScore)&&Number.isInteger(x.bScore)&&x.aScore>=0&&x.bScore>=0&&
      ['a','b'].every(side=>Array.isArray(x[side])&&x[side].every(p=>Array.isArray(p)&&p.length>=4&&p[0]&&p.slice(1,4).every(n=>Number.isInteger(n)&&n>=0))));
  }
  function calculate(input, vipTags){
    const ledger=[],ids=new Set(),rejected=[];
    (input||[]).forEach(m=>{if(!validate(m)||ids.has(String(m.id))){rejected.push(m&&m.id||'unknown');return;}ids.add(String(m.id));ledger.push(m);});
    ledger.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id).localeCompare(String(b.id)));
    const teams={},players={},history=[];
    const getTeam=tag=>teams[normalize(tag)]||(teams[normalize(tag)]={tag,elo:50,w:0,l:0,maps:0});
    ledger.forEach(m=>{
      const aw=m.maps.filter(x=>x.aScore>x.bScore).length,bw=m.maps.filter(x=>x.bScore>x.aScore).length;
      if(aw===bw){rejected.push(m.id);return;}
      const ta=getTeam(m.a),tb=getTeam(m.b),ra=ta.elo,rb=tb.elo,count=m.maps.length;
      const diff=m.maps.reduce((n,x)=>n+x.aScore-x.bScore,0),mult=1+.08*Math.max(0,count-2),expected=1/(1+Math.pow(10,(rb-ra)/150));
      const da=Math.max(-40,Math.min(35,Math.round((32*((aw>bw?1:0)-expected)+1.4*diff/count)*mult)));
      const db=Math.max(-40,Math.min(35,Math.round((32*((bw>aw?1:0)-(1-expected))-1.1*diff/count)*mult)));
      const vipA=!!(vipTags&&vipTags[normalize(m.a)]),vipB=!!(vipTags&&vipTags[normalize(m.b)]);
      ta.elo=Math.max(0,vipA?ra+da:Math.min(300,Math.max(ra,300)>300&&da>0?ra:ra+da));
      tb.elo=Math.max(0,vipB?rb+db:Math.min(300,Math.max(rb,300)>300&&db>0?rb:rb+db));
      ta.w+=aw>bw?1:0;ta.l+=aw<bw?1:0;tb.w+=bw>aw?1:0;tb.l+=bw<aw?1:0;
      m.maps.forEach(x=>{for(const [tag,side] of [[m.a,'a'],[m.b,'b']]){
        getTeam(tag).maps++;
        x[side].forEach(p=>{const key=normalize(tag)+'|'+normalize(p[0]),v=players[key]||(players[key]={tag,nick:p[0],k:0,d:0,a:0,rounds:0,maps:0,perMap:[]});
          v.k+=p[1];v.d+=p[2];v.a+=p[3];v.rounds+=x.aScore+x.bScore;v.maps++;
          v.perMap.push({matchId:m.id,map:x.map,k:p[1],d:p[2],a:p[3],rounds:x.aScore+x.bScore});
        });
      }});
      history.push({id:m.id,a:m.a,b:m.b,aBefore:ra,bBefore:rb,aAfter:ta.elo,bAfter:tb.elo,aDelta:ta.elo-ra,bDelta:tb.elo-rb});
    });
    Object.values(players).forEach(p=>{p.kd=p.k/Math.max(1,p.d);p.kpr=p.rounds?p.k/p.rounds:0;p.apr=p.rounds?p.a/p.rounds:0;p.dpr=p.rounds?p.d/p.rounds:0;p.rating=p.rounds?Math.max(0,Math.min(3,(.55*p.k+.18*p.a-.25*p.d)/p.rounds+.625)):0;});
    return {teams,players,history,rejected};
  }
  return {validate,calculate,normalize};
})();