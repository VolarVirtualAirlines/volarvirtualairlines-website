/* VOLAR PERFORMANCE CENTER V1.2.2 — dados VVX/VAX e perfis globais opcionais */
 document.addEventListener('DOMContentLoaded', () => {
 'use strict';
 const $=id=>document.getElementById(id), esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=v=>v==null||v===''||!['number','string'].includes(typeof v)||!Number.isFinite(Number(v))||Number(v)<0?null:Number(v);
 const rating=v=>{const n=num(v);return n!==null&&n<=10?n:null;};
 const fmt=v=>v==null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:1}), time=v=>v==null?'—':`${fmt(Math.floor(v/60))}h ${String(Math.floor(v%60)).padStart(2,'0')}min`, score=v=>v==null?'—':v.toFixed(2), pct=(v,t)=>t>0?`${fmt(v/t*100)}%`:'—';
 const keys=['vvx','vax'], urls={vvx:'/dados_pilotos',vax:'/dados_cadetes'};
 let pilots=[], available={}, issues={}, profiles=new Map(), busy=false, profileBusy=false;
 const minFlights=10;
 let rankExpanded=false, aircraftExpanded=false;
 const selected=()=> $('scope').value;
 const entries=(p,scope=selected())=> (scope==='all'?keys:[scope]).map(k=>p[k]).filter(Boolean);
 const name=p=>entries(p,'all').map(x=>x.fullname).find(x=>typeof x==='string'&&x.trim())||'Piloto Volar';
 const sum=(p,f,scope=selected())=>entries(p,scope).reduce((a,x)=>a+(num(x.stats?.[f])??0),0);
 const join=(p,scope=selected())=>{const d=entries(p,scope).map(x=>Date.parse(x.createdAt)).filter(Number.isFinite);return d.length?Math.min(...d):null;};
 const tag=p=>p.vvx&&p.vax?'VVX + VAX':p.vvx?'VVX':'VAX';
 const star=p=>Math.floor(sum(p,'time','all')/6000);
 const starText=n=>n>5?'★ × '+n:'★'.repeat(n)||'—';
 const current=()=>pilots.filter(p=>entries(p).length);
 const scopeOK=()=>selected()==='all'?keys.every(k=>available[k]&&!issues[k]):available[selected()]&&!issues[selected()];
 const sourceOK=()=>keys.every(k=>available[k]&&!issues[k]);
 const setSource=(k,state)=>{const el=$('source-'+k);el.className=state;el.textContent='● '+k.toUpperCase();el.title=state==='online'?'Fonte disponível':state==='offline'?'Fonte indisponível':'Consultando';el.setAttribute('aria-label',k.toUpperCase()+': '+el.title);};
 const row=(label,value)=>`<div class="vpf-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
 const note=s=>`<p><small>${esc(s)}</small></p>`;
 const bars=(items,total)=>items.map(([label,v])=>row(label,`${fmt(v)} · ${v===null?'—':pct(v,total)}`)+`<div class="vpf-bar"><span style="width:${v!==null&&total>0?Math.max(0,Math.min(100,v/total*100)):0}%"></span></div>`).join('');
 // Gráficos nativos, sem dependências externas; valores sempre derivados dos dados.
 const colors=['#52dbe5','#b49aef','#eab967','#7a9dbb','#69d9a2'];
 function donut(items,total){
   if(!(total>0))return note('Sem voos conciliados para representar.');
   let offset=0;const circumference=2*Math.PI*65;
   const arcs=items.map(([label,v],i)=>{const start=offset;offset+=v/total;return `<circle cx="90" cy="90" r="65" fill="none" stroke="${colors[i]}" stroke-width="24" stroke-dasharray="${v/total*circumference} ${circumference}" stroke-dashoffset="${-start*circumference}" transform="rotate(-90 90 90)"><title>${esc(label)}: ${fmt(v)} (${pct(v,total)})</title></circle>`;}).join('');
   return `<div class="vpf-donut-layout"><svg class="vpf-donut" viewBox="0 0 180 180" role="img" aria-label="${esc(items.map(([l,v])=>l+': '+fmt(v)).join('; '))}"><circle cx="90" cy="90" r="65" fill="none" stroke="#29465c" stroke-width="24"/>${arcs}<text x="90" y="88" text-anchor="middle" class="vpf-donut-total">${fmt(total)}</text><text x="90" y="107" text-anchor="middle" class="vpf-donut-label">VOOS</text></svg><div class="vpf-legend">${items.map(([l,v],i)=>`<div><span class="vpf-dot" style="background:${colors[i]}"></span><span>${esc(l)}</span><strong>${fmt(v)} <small>· ${pct(v,total)}</small></strong></div>`).join('')}</div></div>`;
 }
 function columns(items,total){const max=Math.max(1,...items.map(x=>x[1]));return `<div class="vpf-columns" role="img" aria-label="${esc(items.map(([l,v])=>l+': '+v).join('; '))}">${items.map(([l,v],i)=>`<div class="vpf-column"><strong>${fmt(v)}</strong><div class="vpf-column-track"><span style="height:${v/max*100}%"></span></div><small title="${esc(l)}">${i===0?'0':i===6?'6+':i}★</small><small>${pct(v,total)}</small></div>`).join('')}</div>`;}
 function rankChart(r,key,m){if(!r.length)return note('Nenhum piloto elegível.');const top=r.slice(0,5);const values=top.map(x=>key==='seniority'?Math.max(0,(Date.now()+x.v)/86400000):x.v);const max=key.endsWith('Rating')?10:Math.max(1,...values);return note(m[0]+(key==='seniority'?' · barras em dias de vínculo':' · Top 5'))+`<div class="vpf-rank-bars">${top.map((x,i)=>`<div class="vpf-rank-item"><div><span>${x.pos}º ${esc(name(x.p))}</span><strong>${esc(m[2](x.v))}</strong></div><div class="vpf-rank-track"><span style="width:${Math.min(100,values[i]/max*100)}%;background:${x.pos===1?'#efd18c':'#52dbe5'}"></span></div></div>`).join('')}</div>`;}
 function counters(x,kind){const s=x.stats||{}, f=num(s.flights), a=num(kind==='net'?s.online?.ivao:s.schedules), b=num(kind==='net'?s.online?.vatsim:s.charters);if(f===0&&!(a>0)&&!(b>0))return [0,0,0,0];if(f===null||a===null||b===null||a+b>f)return null;return [a,b,f-a-b,f];}
 function distribution(list,kind){const totals=[0,0,0,0];let valid=0,missing=0;for(const p of list)for(const x of entries(p)){const c=counters(x,kind);if(!c){missing++;continue;}valid++;c.forEach((v,i)=>totals[i]+=v);}return {totals,valid,missing};}
 function network(p,key){let n=0;for(const x of entries(p)){const s=x.stats||{};const f=num(s.flights);const v=key==='newsky'?counters(x,'net')?.[2]:num(s.online?.[key]);if(v==null){if(f===0)continue;return null;}if(f!==null&&v>f)return null;n+=v;}return n;}
 const metrics={time:['Horas de voo',p=>sum(p,'time'),time],flights:['Voos realizados',p=>sum(p,'flights'),fmt],dist:['Distância',p=>sum(p,'dist'),v=>fmt(v)+' NM'],vvxRating:['Rating VVX',p=>selected()!=='vax'&&num(p.vvx?.stats?.flights)>=minFlights?rating(p.vvx?.stats?.rating):null,score],vaxRating:['Rating VAX',p=>selected()!=='vvx'&&num(p.vax?.stats?.flights)>=minFlights?rating(p.vax?.stats?.rating):null,score],globalRating:['Rating Geral NewSky',p=>num(profiles.get(p.id)?.flights)>=minFlights?rating(profiles.get(p.id)?.rating):null,score],ivao:['Voos IVAO',p=>network(p,'ivao'),fmt],vatsim:['Voos VATSIM',p=>network(p,'vatsim'),fmt],newsky:['Voos NEWSKY',p=>network(p,'newsky'),fmt],seniority:['Membro desde',p=>{const d=join(p);return d===null?null:-d;},v=>new Date(-v).toLocaleDateString('pt-BR')]};
 function ranked(list,key){const m=metrics[key];return list.map(p=>({p,v:m[1](p)})).filter(x=>x.v!==null&& (key==='seniority'||key.endsWith('Rating')||x.v>0)).sort((a,b)=>b.v-a.v||name(a.p).localeCompare(name(b.p),'pt-BR')||a.p.id.localeCompare(b.p.id)).map((x,i,a)=>({...x,pos:i>0&&x.v===a[i-1].v?null:i+1})).reduce((a,x)=>{if(x.pos===null)x.pos=a.at(-1).pos;a.push(x);return a;},[]);}
 const profileName=p=>{const av=entries(p,'all').map(x=>x.avatar).find(x=>typeof x==='string'&&x&&x!=='default');const initial=name(p).split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();return `<div class="vpf-avatar">${esc(initial)}${av?`<img alt="" loading="lazy" src="https://newsky.app/api/pilot/avatar/${encodeURIComponent(av)}">`:''}</div>`;};
 function render(){
 const list=current(), scope=selected(), key=$('metric').value, m=metrics[key], ok=scopeOK(), has=scope==='all'?keys.some(k=>available[k]):available[scope];
 const agg=f=>list.reduce((a,p)=>a+sum(p,f),0);const rr=list.flatMap(p=>entries(p)).filter(x=>num(x.stats?.flights)>0).map(x=>rating(x.stats?.rating)).filter(v=>v!==null);const mean=rr.length?rr.reduce((a,b)=>a+b,0)/rr.length:null;
 const n=distribution(list,'net'), o=distribution(list,'ops');
 const kpis=[['Pilotos vinculados',fmt(list.length)],['Horas acumuladas',time(agg('time'))],['Voos realizados',fmt(agg('flights'))],['Média dos ratings por vínculo',score(mean)],['Milhas voadas',fmt(agg('dist'))+' NM'],['Voos IVAO',n.valid?fmt(n.totals[0]):'—',n.missing>0]];
 $('kpis').innerHTML=kpis.map(([l,v,incomplete])=>`<div class="vpf-kpi"><strong>${esc(has?v:'—')}</strong><small>${esc(l)}${!ok||incomplete?' · parcial':''}</small></div>`).join('');
 const r=ranked(list,key);$('rank-chart').innerHTML=rankChart(r,key,m);$('metric-head').textContent=m[0];
 $('ranking-note').textContent=(key.endsWith('Rating')?`Mínimo de ${minFlights} voos no mesmo escopo do rating. `:'')+(key==='globalRating'?'Rating de todas as companhias NewSky; somente perfis autorizados. ':'')+(!ok?'Dados parciais — ranking não definitivo. ':'')+(key==='globalRating'?`${list.filter(p=>profiles.has(p.id)).length}/${list.length} perfis disponíveis. `:'')+`${r.length} pilotos classificados. Empates compartilham a posição.`;
 const leaders=r.slice(0,3); if(leaders.length===3) [leaders[0],leaders[1]]=[leaders[1],leaders[0]];$('podium').innerHTML=leaders.map(x=>`<div class="vpf-medal ${x.pos===1?'first':x.pos===2?'second':x.pos===3?'third':''}"><b>${x.pos}º LUGAR</b>${profileName(x.p)}<span>${esc(name(x.p))}</span><strong>${esc(m[2](x.v))}</strong><small>${esc(tag(x.p))}</small></div>`).join('');
 $('ranking').innerHTML=r.length?(rankExpanded?r:r.slice(0,5)).map(x=>`<tr><td class="${x.pos<=3?'vpf-gold':''}">${x.pos}º</td><td>${esc(name(x.p))}</td><td>${esc(tag(x.p))}</td><td>${esc(m[2](x.v))}</td><td class="vpf-gold">${esc(starText(star(x.p)))}${!sourceOK()?' · parcial':''}</td></tr>`).join(''):`<tr><td colspan="5">${has?'Nenhum piloto elegível para este ranking.':'Fonte indisponível.'}</td></tr>`;
 $('rank-toggle').hidden=r.length<=5; $('rank-toggle').textContent=rankExpanded?'Ver menos':'Ver ranking completo ('+r.length+')'; $('rank-toggle').setAttribute('aria-expanded',String(rankExpanded));
 const showDist=(d,labels,extra)=>d.valid?donut(labels.map((l,i)=>[l,d.totals[i]]),d.totals[3])+row('Total conciliado',fmt(d.totals[3]))+note(`${extra} ${d.missing?d.missing+' vínculos sem contadores completos foram excluídos. ':''}${!ok?'Fonte parcial.':''}`):note('Contadores completos não disponíveis.');
 $('networks').innerHTML=showDist(n,['IVAO','VATSIM','NEWSKY'],'NEWSKY = total menos IVAO e VATSIM, supondo redes exclusivas.');
 $('operations').innerHTML=showDist(o,['Scheduled','Charter','Outros voos'],'Outros = total menos Scheduled e Charter; classificação Free Flight não confirmada.');
 const groups=[0,1,2,3,4,5,6].map(i=>[i===0?'Sem estrela':i===6?'6 ou mais estrelas':i+' '+(i===1?'estrela':'estrelas'),list.filter(p=>i===6?star(p)>=6:star(p)===i).length]);
 $('stars').innerHTML=has?columns(groups,list.length)+note('Uma estrela a cada 100 horas VVX + VAX, mesmo quando o filtro é por companhia.'+(!sourceOK()?' Experiência parcial.':'')):note('Dados indisponíveis.');
 $('hall').innerHTML=[['Master of Flight Hours','time'],['Excellence · VVX','vvxRating'],['Excellence · VAX','vaxRating'],['IVAO Ambassador','ivao'],['Beyond Horizons','dist']].map(([l,k])=>{const a=ranked(list,k);return row(l,a.length?a.filter(x=>x.pos===1).map(x=>name(x.p)).join(' / ')+' · '+metrics[k][2](a[0].v):'—');}).join('')+note('Destaques acumulados, não premiações por período.'+(!ok?' Dados parciais.':''));
 const aircraft=new Map();let covered=0;for(const p of list){const s=profiles.get(p.id);const valid=Object.entries(s?.airframes||{}).filter(([k,v])=>num(v?.flights)>0);if(valid.length)covered++;for(const [k,v] of valid)aircraft.set(k,(aircraft.get(k)||0)+num(v.flights));}const ac=[...aircraft].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));const acTotal=ac.reduce((a,x)=>a+x[1],0);
 $('aircraft').innerHTML=note(`Dados globais NewSky dos pilotos selecionados, não voos exclusivos da Volar. Cobertura: ${covered}/${list.length} pilotos com dados de aeronave.`)+(ac.length?bars(aircraftExpanded?ac:ac.slice(0,5),acTotal)+row('Voos com aeronave informada',fmt(acTotal)):note(profileBusy?'Consultando perfis NewSky…':profiles.size?'Nenhuma estatística de aeronave retornada. Consulte novamente os perfis NewSky.':'Clique em Consultar perfis NewSky, no topo da página.'));
 $('aircraft-toggle').hidden=ac.length<=5; $('aircraft-toggle').textContent=aircraftExpanded?'Ver menos':'Ver todas as aeronaves ('+ac.length+')'; $('aircraft-toggle').setAttribute('aria-expanded',String(aircraftExpanded));
 if(!available.vax||!sourceOK())$('academy').innerHTML=note('Academy: a identificação de cadetes exclusivos depende das duas fontes completas.');else{const cad=pilots.filter(p=>p.vax&&!p.vvx);const eligible=cad.filter(p=>rating(profiles.get(p.id)?.rating)>=8&&rating(profiles.get(p.id)?.rating)!==null&&sum(p,'flights','vax')>=10&&sum(p,'time','vax')>=600);$('academy').innerHTML=row('Cadetes exclusivos VAX',fmt(cad.length))+row('Rating geral disponível',fmt(cad.filter(p=>rating(profiles.get(p.id)?.rating)!==null).length))+row('Metas numéricas atingidas',fmt(eligible.length))+row('VAX Pilot Check','A confirmar')+note('Painel fixo da Academy. Metas: rating geral ≥ 8, 10 voos e 10h na VAX. Não confirma promoção.');}
 const active=list.filter(p=>entries(p).some(x=>x.status?.active===true)).length,inactive=list.filter(p=>entries(p).every(x=>x.status?.active===false)).length;const recent=list.filter(p=>entries(p).some(x=>{const d=Date.parse(x.stats?.lastFlightDate);return Number.isFinite(d)&&d<=Date.now()&&d>=Date.now()-30*86400000;})).length;
 $('activity').innerHTML=has?row('Vínculo ativo',fmt(active))+row('Todos os vínculos inativos',fmt(inactive))+row('Status não informado',fmt(list.length-active-inactive))+row('Voaram nos últimos 30 dias',fmt(recent))+note('Atividade baseada no último voo informado; ausência de data não comprova inatividade.'):note('Fonte indisponível.');
 $('podium').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.remove()));
 }
 async function load(){if(busy||profileBusy)return;busy=true;$('refresh').disabled=true;$('profiles').disabled=true;$('notice').textContent='Consultando fontes NewSky…';const results=await Promise.allSettled(keys.map(async k=>{setSource(k,'loading');try{const r=await fetch(urls[k],{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.error||!Array.isArray(j.dados))throw Error('Retorno inválido');setSource(k,'online');return j.dados;}catch(e){setSource(k,'offline');throw e;}}));const map=new Map();available={};issues={};results.forEach((r,i)=>{const k=keys[i];available[k]=r.status==='fulfilled';issues[k]=0;if(!available[k])return;for(const raw of r.value){if(!raw||!['string','number'].includes(typeof raw._id)||!String(raw._id).trim()){issues[k]++;continue;}const id=String(raw._id).trim();if(!map.has(id))map.set(id,{id});if(map.get(id)[k]){issues[k]++;continue;}map.get(id)[k]=raw;}});pilots=[...map.values()];profiles.clear();$('profile-status').innerHTML='Perfis globais opcionais: requerem sessão NewSky. <a href="https://newsky.app/" target="_blank" rel="noopener noreferrer">Acessar NewSky ↗</a>';$('notice').textContent=(sourceOK()?'Fontes disponíveis.':'Dados parciais ou indisponíveis. ' +keys.map(k=>k.toUpperCase()+': '+(available[k]?'disponível':'indisponível')+(issues[k]?` (${issues[k]} registros ignorados)`:'')).join(' · '))+ ' · Consulta: '+new Date().toLocaleString('pt-BR');busy=false;$('refresh').disabled=false;$('profiles').disabled=!pilots.length;render();}
 // Fluxo manual: um clique consulta e atualiza todos os indicadores dependentes.
 async function getProfiles(){
   if(busy||profileBusy||!pilots.length)return;
   const button=$('profiles'), status=$('profile-status');
   profileBusy=true; button.disabled=true; button.textContent='Consultando perfis…'; $('refresh').disabled=true;
   let next=0,done=0,errors=0,unauth=false,limited=false,forbidden=false;
   const queue=[...pilots]; // Cada clique permite uma nova consulta, inclusive airframes vazios.
   profiles.clear();
   const progress=()=>{status.textContent=`Perfis NewSky: ${profiles.size}/${pilots.length} disponíveis · ${done}/${queue.length} consultas concluídas · ${errors} falhas.`;};
   try {
     progress(); render();
     async function worker(){
       while(next<queue.length&&!unauth&&!limited){
         const p=queue[next++];
         try {
           const r=await fetch('https://newsky.app/api/pilot/'+encodeURIComponent(p.id),{method:'GET',credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000)});
           if(!r.ok){if(r.status===401)unauth=true;if(r.status===403)forbidden=true;if(r.status===429)limited=true;throw Error('HTTP '+r.status);}
           const d=await r.json();
           if(String(d?._id)!==p.id||!d.stats||typeof d.stats!=='object')throw Error('Retorno inválido');
           const {rating,time,flights,airframes}=d.stats; profiles.set(p.id,{rating,time,flights,airframes});
         } catch(e){errors++;} finally {done++;progress();}
       }
     }
     await Promise.all(Array.from({length:Math.min(3,queue.length)},worker));
   } finally {
     profileBusy=false; button.disabled=false; button.textContent='Consultar perfis NewSky'; $('refresh').disabled=false;
     progress();
     if(unauth||limited||errors){
       status.append(document.createTextNode(unauth?' Sessão não autorizada (401). Conecte-se ao NewSky e clique novamente no botão.':limited?' Limite de consultas atingido (429). Tente mais tarde.':forbidden?' Alguns perfis não foram autorizados (403).':' Alguns perfis estão indisponíveis. Verifique conexão e sessão NewSky.'));
       const a=document.createElement('a'); a.href='https://newsky.app/';a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Acessar NewSky ↗';status.append(a);
     }
     render();
   }
 }
 $('rank-toggle').addEventListener('click',()=>{rankExpanded=!rankExpanded;render();}); $('aircraft-toggle').addEventListener('click',()=>{aircraftExpanded=!aircraftExpanded;render();});
 $('scope').addEventListener('change',()=>{rankExpanded=false;aircraftExpanded=false;if(($('scope').value==='vvx'&&$('metric').value==='vaxRating')||($('scope').value==='vax'&&$('metric').value==='vvxRating'))$('metric').value='time';render();});$('metric').addEventListener('change',()=>{rankExpanded=false;render();});$('refresh').addEventListener('click',load);$('profiles').addEventListener('click',()=>getProfiles());load();
 });
