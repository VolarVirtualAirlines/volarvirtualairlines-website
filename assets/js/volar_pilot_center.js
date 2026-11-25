/* VOLAR PILOT CENTER V1.6 — integração VVX / VAX e perfil global */
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const num = (v) => v == null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v);
  const fmt = (v) => v == null ? '—' : v.toLocaleString('pt-BR');
  const time = (v) => v == null ? '—' : `${fmt(Math.floor(v / 60))}h${Math.floor(v % 60) ? ' ' + String(Math.floor(v % 60)).padStart(2, '0') + 'min' : ''}`;
  const date = (v) => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleDateString('pt-BR') : '—';
  const sources = { vvx: '/dados_pilotos', vax: '/dados_cadetes' };

    // Sinalizadores de disponibilidade VVX / VAX

  function updateSourceStatus(key, state) {

    const indicator = $(`vpc-source-${key}`);

    if (!indicator) return;

    const company = key.toUpperCase();

    const messages = {
      loading: 'Consultando dados...',
      online: 'Fonte de dados disponível',
      offline: 'Fonte de dados indisponível'
    };

    indicator.classList.remove(
      'is-loading',
      'is-online',
      'is-offline'
    );

    indicator.classList.add(`is-${state}`);

    const message = `${company}: ${messages[state]}`;

    indicator.title = message;
    indicator.setAttribute('aria-label', message);

  }

  const available = {};
  const map = new Map();
  let missing = 0;
  let duplicates = 0;

  const load = async (url) => {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.error || !Array.isArray(j.dados)) throw new Error('Retorno inválido');
    return j.dados;
  };

  const keys = Object.keys(sources);
  
  const results = await Promise.allSettled(
    keys.map(async (k) => {
  
      updateSourceStatus(k, 'loading');
  
      try {
  
        const data = await load(sources[k]);
  
        updateSourceStatus(k, 'online');
  
        return data;
  
      } catch (error) {
  
        updateSourceStatus(k, 'offline');
  
        throw error;
  
      }
  
    })
  );
  
  results.forEach((r, i) => {
    const k = keys[i];
    available[k] = r.status === 'fulfilled';
    if (!available[k]) return;

    for (const raw of r.value) {
      if (!raw || !['string', 'number'].includes(typeof raw._id) || !String(raw._id).trim()) {
        missing++;
        continue;
      }
      const id = String(raw._id).trim();
      if (!map.has(id)) map.set(id, { id });
      const p = map.get(id);
      if (p[k]) {
        duplicates++;
        continue;
      }
      p[k] = raw;
    }
  });

  const partial = keys.some((k) => !available[k]) || missing > 0 || duplicates > 0;
  const entries = (p) => keys.map((k) => p[k]).filter(Boolean);
  const sum = (p, field) => {
    const values = entries(p).map((x) => num(x.stats?.[field]));
    return values.some((x) => x === null) ? null : values.reduce((s, x) => s + x, 0);
  };
  const profile = (p, f) => entries(p).map((x) => x[f]).find((x) => x != null && x !== '' && x !== 'default') ?? '—';
  const integration = (p, k) => entries(p).map((x) => x.integrations?.[k]).find(Boolean);
  const joined = (p) => {
    const dates = entries(p).map((x) => Date.parse(x.createdAt)).filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : null;
  };

  const pilots = [...map.values()];
  const any = available.vvx || available.vax;
  const both = available.vvx && available.vax;

  $('vpc-status').textContent = `VVX: ${available.vvx ? 'disponível' : 'indisponível'} · VAX: ${available.vax ? 'disponível' : 'indisponível'}${partial ? ' · Dados parciais; totais e estrelas sujeitos à complementação.' : ''}${missing ? ` · ${missing} registros sem ID ignorados.` : ''}${duplicates ? ` · ${duplicates} registros duplicados ignorados.` : ''}`;
  $('vpc-status').hidden = !partial;
  
  const aggregate = (field) => {
    return pilots
        .flatMap((p) => entries(p))
        .reduce((total, x) => {
            return total + (num(x.stats?.[field]) ?? 0);
        }, 0);
  };

$('vpc-stats').innerHTML = [
    ['Total de pilotos Volar', any ? fmt(pilots.length) : '—'],
    ['Vinculados à VVX', available.vvx ? fmt(pilots.filter((p) => p.vvx).length) : '—'],
    ['Vinculados à VAX', available.vax ? fmt(pilots.filter((p) => p.vax).length) : '—'],
    ['Vinculados à VVX e VAX', both ? fmt(pilots.filter((p) => p.vvx && p.vax).length) : '—'],    ['Horas de voo', any ? time(aggregate('time')) : '—'],
    ['Voos realizados', any ? fmt(aggregate('flights')) : '—']
  ].map(([label, value]) => `<div><strong>${esc(value)}</strong><span>${label}${partial ? ' · parcial' : ''}</span></div>`).join('');

  // Perfil global: cache por página, sem persistir dados autenticados.
  const globalCache = new Map(), pendingProfiles = new Map(), profileErrors = new Map();
  const profileEndpoint = 'https://newsky.app/api/pilot/';
  const ratingValue = v => { const r = num(v); return r !== null && r <= 10 ? r : null; };
  const ratingText = v => ratingValue(v)?.toFixed(2) ?? '—';
  let activeProfiles = 0;
  const profileQueue = [];
  function drainProfiles() {
    while (activeProfiles < 3 && profileQueue.length) {
      activeProfiles++;
      profileQueue.shift()().finally(() => { activeProfiles--; drainProfiles(); });
    }
  }
  function getGlobal(p, retry = false) {
    if (globalCache.has(p.id)) return Promise.resolve(globalCache.get(p.id));
    if (pendingProfiles.has(p.id)) return pendingProfiles.get(p.id);
    if (!retry && profileErrors.has(p.id)) return Promise.reject(profileErrors.get(p.id));
    profileErrors.delete(p.id);
    const request = new Promise((resolve, reject) => {
      profileQueue.push(async () => {
        try {
          const response = await fetch(profileEndpoint + encodeURIComponent(p.id), {
            method:'GET', credentials:'include', cache:'no-store', signal:AbortSignal.timeout(15000)
          });
          if (!response.ok) throw Object.assign(new Error('NewSky'), {status:response.status});
          const data = await response.json();
          if (String(data?._id) !== p.id || !data.stats || typeof data.stats !== 'object') throw new Error('Retorno inválido');
          // Guardar somente os campos necessários; não divulgar vínculos externos.
          const {rating,time,flights,dist,airframes} = data.stats;
          const result = {rating,time,flights,dist,airframes};
          globalCache.set(p.id,result); resolve(result);
        } catch (error) { profileErrors.set(p.id,error); reject(error); }
      });
    });
    pendingProfiles.set(p.id,request);
    request.then(() => pendingProfiles.delete(p.id), () => pendingProfiles.delete(p.id));
    drainProfiles();
    return request;
  }
  function globalButton(p) {
    const data=globalCache.get(p.id), error=profileErrors.get(p.id);
    return `<button type="button" class="vpc-global-rating ${ratingValue(data?.rating)!==null?'vpc-global-ok':''}" data-global aria-expanded="false" title="Consultar desempenho geral NewSky"><span>Rating Geral</span><strong>${data?ratingText(data.rating):'—'}</strong><small>${error?.status===401?'Conecte-se':error?'Indisponível':data?'NewSky':'Consultando…'}</small></button>`;
  }
  function updateGlobalButton(article,p) {
    const b=article.querySelector('[data-global]'); if(!b)return;
    const data=globalCache.get(p.id), error=profileErrors.get(p.id);
    b.querySelector('strong').textContent=ratingText(data?.rating);
    b.querySelector('small').textContent=error?.status===401?'Conecte-se':error?'Indisponível':data?'NewSky':'Consultando…';
    b.classList.toggle('vpc-global-ok',ratingValue(data?.rating)!==null);
  }
  function globalDetails(data) {
    const rows=Object.entries(data.airframes||{}).filter(([k,v])=>v && num(v.flights)>0)
      .sort((a,b)=>num(b[1].flights)-num(a[1].flights)||(num(b[1].time)??0)-(num(a[1].time)??0)||a[0].localeCompare(b[0])).slice(0,3);
    const favorite=rows[0], total=num(data.flights);
    return `<div class="vpc-global-metrics">${[['Horas totais',time(num(data.time))],['Voos realizados',fmt(total)],['Milhas NM',fmt(num(data.dist))]].map(([l,v])=>`<div><strong>${esc(v)}</strong><small>${l}</small></div>`).join('')}</div>
      ${favorite?`<div class="vpc-favorite"><span>★ Aeronave preferida <strong>${esc(favorite[0])}</strong></span><span>${fmt(num(favorite[1].flights))} voos${total>0?' · '+(100*num(favorite[1].flights)/total).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':''}</span></div>`:''}
      <h3>Aircraft Performance · Top 3</h3>${rows.length?`<table class="vpc-aircraft-table"><thead><tr><th>Aeronave</th><th>Voos</th><th>Horas</th><th>Rating</th></tr></thead><tbody>${rows.map(([k,v],i)=>`<tr><td>${i+1}º ${esc(k)}</td><td>${fmt(num(v.flights))}</td><td>${time(num(v.time))}</td><td>${ratingText(v.rating)}</td></tr>`).join('')}</tbody></table>`:'<small>Estatísticas por aeronave não disponíveis neste retorno.</small>'}<small>Dados gerais NewSky · todas as companhias.</small>`;
  }
  async function showGlobal(article,p,retry=false) {
    const panel=article.querySelector('.vpc-global-body');
    panel.innerHTML='<small>Consultando perfil NewSky…</small>';
    try { const data=await getGlobal(p,retry); panel.innerHTML=globalDetails(data); }
    catch(e) { panel.innerHTML=`<div class="vpc-history-alert"><strong>${e.status===401?'Conecte-se ao NewSky':e.status===403?'Consulta não autorizada':'Perfil indisponível'}</strong><small>Não foi possível obter os dados gerais. Verifique a sessão ou tente novamente.</small><div class="vpc-history-actions"><a href="https://newsky.app/" target="_blank" rel="noopener noreferrer">Acessar NewSky ↗</a><button type="button" data-global-retry>Tentar novamente</button></div></div>`; }
    updateGlobalButton(article,p);
  }
  function blockState(kind, title, text) {
    return `
      <div class="vpc-company-state ${kind}">
        <i class="fas ${kind === 'offline' ? 'fa-triangle-exclamation' : 'fa-user-slash'}"></i>
        <strong>${esc(title)}</strong>
        <p>${esc(text)}</p>
      </div>
    `;
  }

  function block(p, key) {
    const x = p[key];
    const isVVX = key === 'vvx';
    const label = isVVX ? 'VVX · Principal' : 'VAX · Academy';

    if (!x) {
      const stateTitle = available[key]
        ? `Sem vínculo na ${isVVX ? 'VVX' : 'VAX'}`
        : `${isVVX ? 'VVX' : 'VAX'} indisponível`;

      const stateText = available[key]
        ? `Este piloto não possui registro ativo na ${isVVX ? 'companhia principal' : 'Academy'} no momento.`
        : `Não foi possível consultar os dados da ${isVVX ? 'VVX' : 'VAX'} neste momento.`;

      return `
        <section class="vpc-company ${key}">
          <h3>${label}</h3>
          ${blockState(available[key] ? 'empty' : 'offline', stateTitle, stateText)}
          ${isVVX && eligible(p) ? '<button type="button" class="vpc-evolve" data-evolve><i class="fas fa-chart-line" aria-hidden="true"></i> Acompanhar evolução</button>' : ''}
        </section>
      `;
    }

    const s = x.stats ?? {};
    const rating = num(s.rating);

    return `
      <section class="vpc-company ${key} vpc-company-flip">
        <div class="vpc-company-summary">
        <h3>${label}</h3>
        <small>${x.status?.active === true ? 'Ativo' : x.status?.active === false ? 'Inativo' : 'Status não informado'}</small>
        <div class="vpc-rating">
          <span>Rating</span>
          <strong>${rating === null ? '—' : rating.toFixed(2)}</strong>
        </div>
        <dl>
          <dt>Horas</dt><dd>${time(num(s.time))}</dd>
          <dt>Voos</dt><dd>${fmt(num(s.flights))}</dd>
          <dt>Distância</dt><dd>${fmt(num(s.dist))} NM</dd>
          <dt>Último voo</dt><dd>${date(s.lastFlightDate)}</dd>
          <dt>Membro desde</dt><dd>${date(x.createdAt)}</dd>
          <dt>Base</dt><dd>${esc(x.homeIcao)}</dd>
        </dl>
        <button type="button" class="vpc-company-toggle" data-company-toggle aria-expanded="false">Detalhes operacionais ↻</button>
        </div>
        <div class="vpc-company-details" hidden>
          <h3>${label}</h3><small>Operational Performance</small>

          <dl>${[
            ['Voos regulares', s.schedules],
            ['Charters', s.charters],
            ['IVAO', s.online?.ivao],
            ['VATSIM', s.online?.vatsim],
            ['NEWSKY',
                num(s.flights) !== null &&
                num(s.online?.ivao) !== null &&
                num(s.online?.vatsim) !== null &&
                num(s.flights) >= num(s.online.ivao) + num(s.online.vatsim)
                    ? num(s.flights) - num(s.online.ivao) - num(s.online.vatsim)
                    : null
            ]
        ].map(([l,v])=>`<dt>${l}</dt><dd>${fmt(num(v))}</dd>`).join('')}          
          
          <dt>Participação IVAO</dt><dd>${num(s.flights)>0&&num(s.online?.ivao)!==null?(100*num(s.online.ivao)/num(s.flights)).toFixed(1)+'%':'—'}</dd></dl>
          <button type="button" class="vpc-company-toggle" data-company-toggle aria-expanded="true">← Voltar ao resumo</button>
        </div>
      </section>
    `;
  }

  function starLine(hours, partialData) {
    const stars = hours === null ? null : Math.floor(hours / 6000);
    let content = '';

    if (stars === null) {
      content = '<span class="vpc-stars-placeholder">☆ Experiência Volar indisponível</span>';
    } else if (stars === 0) {
      content = '';
    } else if (stars <= 5) {
      content = `<span class="vpc-stars-icons">${'★'.repeat(stars)}</span><span class="vpc-stars-label">Experiência Volar</span>`;
    } else {
      content = `<span class="vpc-stars-icons">★</span><span class="vpc-stars-label">Experiência Volar × ${stars}</span>`;
    }

    return `
      <div class="vpc-stars" title="Estrelas de Experiência Volar: uma estrela a cada 100 horas completas de voo acumuladas na Volar">
        ${content}
        ${partialData && stars !== 0 ? '<small>(parcial)</small>' : ''}
      </div>
    `;
  }

  function networkId(p, network) {
    const value = integration(p, network);
    const id = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    return /^\d+$/.test(id) && !/^0+$/.test(id) ? id : '';
  }

  const eligible = p => both && !partial && !!p.vax && !p.vvx;
  const historyEndpoint = 'https://newsky.app/api/pilot/flights';
  // Consulta sob demanda, usando somente a sessão autorizada do navegador.
  async function getHistory(pilotId) {
    const flights = [], seen = new Set();
    const count = 30, maxPages = 10;
    let exhausted = false, scanned = 0;
    for (let page = 0; page < maxPages && flights.length < 30; page++) {
      const response = await fetch(historyEndpoint, {
        method: 'POST', credentials: 'include', cache: 'no-store',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({id: pilotId, skip: page * count, count}),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw Object.assign(new Error('NewSky'), {status: response.status});
      const data = await response.json();
      if (!Array.isArray(data?.results)) throw new Error('Retorno inválido');
      scanned += data.results.length;
      for (const v of data.results) {
        if (!v || String(v.pilot?._id) !== pilotId || v.airline?.icao !== 'VAX' || v.deleted !== false || !v._id || seen.has(v._id)) continue;
        if (typeof v.rating !== 'number' || !Number.isFinite(v.rating) || v.rating < 0 || v.rating > 10 || !Number.isFinite(Date.parse(v.close)) || !Number.isFinite(Date.parse(v.arrTimeAct))) continue;
        seen.add(v._id);
        flights.push({flightId:v._id, date:v.close, rating:v.rating, route:`${v.dep?.icao || '—'} → ${v.arr?.icao || '—'}`, flightNumber:v.flightNumber || '—', aircraft:v.aircraft?.airframe?.icao || '—'});
      }
      if (data.results.length < count || (Number.isFinite(data.totalResults) && scanned >= data.totalResults)) { exhausted = true; break; }
    }
    flights.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
    return {flights:flights.slice(0,30).reverse(), limited:!exhausted && flights.length < 30, scanned};
  }
  function graph(series, label) {
    const w=320, left=28, right=310, top=12, bottom=130;
    const x=i=>series.length===1?(left+right)/2:left+(right-left)*i/(series.length-1);
    const y=v=>bottom-(bottom-top)*v/10;
    const path=field=>series.map((v,i)=>`${i?'L':'M'} ${x(i)} ${y(v[field])}`).join(' ');
    return `<svg class="vpc-chart" viewBox="0 0 ${w} 150" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>
      ${[0,2,4,6,8,10].map(v=>`<line x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}" stroke="${v===8?'#ead6a0':'#30495f'}" ${v===8?'stroke-dasharray="5 4"':''}/><text x="21" y="${y(v)+3}" text-anchor="end" fill="#b7cadc" font-size="9">${v}</text>`).join('')}
      <path d="${path('rating')}" fill="none" stroke="#52dbe5" stroke-width="2" stroke-linejoin="round"/>
      ${series[0].mean!=null?`<path d="${path('mean')}" fill="none" stroke="#c8b0ff" stroke-width="2"/>`:''}
      ${series.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v.rating)}" r="2.5" fill="${v.rating<8?'#f18479':v.rating===10?'#67dda7':'#70e5ec'}"><title>${esc(v.detail || v.label)}: ${v.rating.toFixed(2)}</title></circle>`).join('')}
      <text x="${left}" y="145" fill="#b7cadc" font-size="9">${esc(series[0].label)}</text><text x="${right}" y="145" text-anchor="end" fill="#b7cadc" font-size="9">${series.length>1?esc(series.at(-1).label):''}</text></svg>`;
  }
  function evolution(p) {
    const s=p.vax.stats||{}, r=ratingValue(globalCache.get(p.id)?.rating), n=num(s.flights), t=num(s.time);
    const valid=r!==null&&r<=10;
    const metric=(label,v)=>`<div><small>${label}</small><strong>${v}</strong></div>`;
    const requirement=(label,value,ok)=>`<li><span>${label}</span><strong class="${ok?'vpc-met':''}">${value}</strong></li>`;
    return `<section class="vpc-back" hidden aria-label="Evolução VAX"><div class="vpc-back-head"><div><h3>VAX · Performance &amp; Evolution</h3><small>Road to VVX · ${esc(profile(p,'fullname'))}</small></div><button type="button" data-return aria-label="Voltar ao perfil">← Voltar</button></div>
      <div class="vpc-evo-metrics">${metric('Rating Geral',valid?r.toFixed(2):'—')}${metric('Meta VVX','8.00')}${metric('Faltam',valid?Math.max(0,8-r).toFixed(2):'—')}</div>
      <div class="vpc-progress" role="progressbar" aria-label="Progresso em relação à meta de rating" aria-valuemin="0" aria-valuemax="100" ${valid?`aria-valuenow="${Math.min(100,r/8*100)}"`:''}><span style="width:${valid?Math.min(100,r/8*100):0}%"></span></div>
      <ul class="vpc-requirements">${requirement('Rating mínimo 8.0',valid?(r>=8?'Atingido':r.toFixed(2)+' / 8.00'):'NewSky indisponível',valid&&r>=8)}${requirement('Mínimo de 10 voos',n===null?'—':fmt(n)+' / 10',n!==null&&n>=10)}${requirement('Mínimo de 10 horas',t===null?'—':time(t)+' / 10h',t!==null&&t>=600)}${requirement('VAX Pilot Check','A confirmar',false)}</ul>
      <div class="vpc-history" aria-live="polite"><h3>Histórico de voos</h3><small>Histórico individual via NewSky.</small></div>
      <div class="vpc-simulator"><h3>Simulador de rating</h3><label>Média dos próximos voos: <output>9.00</output><input type="range" min="8" max="10" step="0.1" value="9" data-sim></label><div class="vpc-projection" aria-live="polite"></div><small>Estimativa por média simples, usando o total global de voos como aproximação. Não reproduz necessariamente o cálculo NewSky.</small></div></section>`;
  }
  function simulate(article,p) {
    const slider=article.querySelector('[data-sim]'), f=Number(slider.value), r=ratingValue(globalCache.get(p.id)?.rating), n=num(globalCache.get(p.id)?.flights), out=article.querySelector('.vpc-projection');
    article.querySelector('output').textContent=f.toFixed(2);
    if(r===null||r>10||n===null||n<1||!Number.isInteger(n)){out.textContent='Dados gerais insuficientes. Se necessário, conecte-se ao NewSky e tente novamente pelo Rating Geral.';return;}
    if(r>=8){out.textContent='Meta de rating atingida! Confira os demais requisitos.';return;}
    if(f<=8){out.textContent='Com média 8.0, a meta não é atingida em um número finito de voos neste modelo.';return;}
    const need=Math.ceil(n*(8-r)/(f-8)); const horizon=Math.max(need, 3);
    const series=Array.from({length:Math.min(horizon,24)+1},(_,i)=>{const k=Math.round(i*horizon/Math.min(horizon,24));return {label:k===0?'Atual':`+${k} voos`,rating:(r*n+f*k)/(n+k)};});
    out.innerHTML=`<p><strong>${fmt(need)} ${need===1?'voo estimado':'voos estimados'}</strong> para atingir 8.0</p>${graph(series,'Projeção de rating; linha tracejada: meta 8.0')}`;
  }
  async function showHistory(article,p) {
    const el=article.querySelector('.vpc-history');
    const heading='<h3>Histórico de voos VAX</h3>';
    const retry='<button type="button" data-history-retry>Tentar novamente</button>';
    const login='<a href="https://newsky.app/" target="_blank" rel="noopener noreferrer">Acessar NewSky ↗</a>';
    el.innerHTML=heading+'<small>Consultando histórico no NewSky…</small>';
    try {
      const {flights,limited,scanned}=await getHistory(p.id);
      let total=0;
      const series=flights.map((v,i)=>({label:date(v.date),detail:`VAX ${v.flightNumber} · ${v.route} · ${v.aircraft} · ${date(v.date)}`,rating:v.rating,mean:(total+=v.rating)/(i+1)}));
      const notice=limited?'<small>Consulta limitada a 300 registros do perfil; podem existir outros voos VAX.</small>':'';
      el.innerHTML=heading+'<small class="vpc-history-ok">Consulta NewSky autorizada</small>'+(series.length?
        `<div class="vpc-history-summary"><span>Voos analisados <strong>${series.length}</strong></span><span>Média da amostra <strong>${(total/series.length).toFixed(2)}</strong></span></div>`+
        graph(series,'Rating por voo VAX e média da amostra')+'<small>Ciano: rating por voo · Lilás: média acumulada da amostra · Tracejado: meta 8.0. A média não é o rating oficial NewSky.</small>'
        :'<small>Nenhum voo VAX concluído e avaliado encontrado nos registros consultados.</small>')+notice+`<small>${scanned} registros do perfil consultados.</small>`;
    } catch(e){
      const message=e.status===401?'Conecte-se ao NewSky para consultar o histórico. Se já estiver conectado, verifique a sessão e tente novamente.':e.status===403?'O NewSky não autorizou a consulta deste perfil.': 'Não foi possível consultar o NewSky agora. Verifique sua conexão e se está conectado ao NewSky.';
      el.innerHTML=heading+`<div class="vpc-history-alert"><strong>${e.status===401?'Conecte-se ao NewSky':'Histórico indisponível'}</strong><small>${message}</small><div class="vpc-history-actions">${login}${retry}</div></div>`;
    }
  }
  function card(p) {
    const name = profile(p, 'fullname');
    const avatar = profile(p, 'avatar');
    const hours = sum(p, 'time');
    const ivao = networkId(p, 'ivao');
    const vatsim = networkId(p, 'vatsim');
    const initials = name.split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();

    return `
      <article class="vpc-card" data-pilot="${esc(p.id)}"><div class="vpc-front">
        <div class="vpc-person">
        
        <div class="vpc-avatar">
            ${
                avatar !== '—'
                    ? `<img src="https://newsky.app/api/pilot/avatar/${encodeURIComponent(avatar)}" alt="" loading="lazy">`
                    : `<span>${esc(initials)}</span>`
            }
        </div>

          <div class="vpc-person-main">
            <h2>${esc(name)}</h2>
            <small>${esc(profile(p, 'countryCode'))} · ${esc(profile(p, 'homeIcao'))}</small>
            ${starLine(hours, partial)}
          </div>

          ${globalButton(p)}
          <span class="vpc-tag">${p.vvx && p.vax ? 'VVX + VAX' : p.vvx ? 'VVX' : 'VAX'}</span>
        </div>

        <div class="vpc-global-panel" hidden><div class="vpc-back-head"><h3>NewSky Global Performance</h3><button type="button" data-global-close>← Voltar</button></div><div class="vpc-global-body" aria-live="polite"></div></div>
        <div class="vpc-companies">
          ${block(p, 'vvx')}
          ${block(p, 'vax')}
        </div>

        <section class="vpc-total">
          <h3>Experiência consolidada Volar${partial ? ' · parcial' : ''}</h3>
          <div>
            <span><strong>${time(hours)}</strong>Horas</span>
            <span><strong>${fmt(sum(p, 'flights'))}</strong>Voos</span>
            <span><strong>${fmt(sum(p, 'dist'))}</strong>Milhas NM</span>
          </div>
        </section>

        <footer class="vpc-network-ids">
          <span class="vpc-network-ivao">${ivao ? `IVAO ID: <strong>${esc(ivao)}</strong>` : ''}</span>
          <span class="vpc-network-vatsim">${vatsim ? `VATSIM ID: <strong>${esc(vatsim)}</strong>` : ''}</span>
        </footer>
      </div>${eligible(p)?evolution(p):''}
      </article>
    `;
  }

  function render() {
    const q = norm($('q').value);
    const base = norm($('base').value);
    const link = $('link').value;
    const net = $('network').value;
    const period = $('period').value;
    const sort = $('sort').value;
    const now = new Date();

    let list = pilots.filter((p) => {
      const firstJoin = joined(p);
      return entries(p).some((x) => norm(x.fullname).includes(q))
        && (!base || entries(p).some((x) => norm(x.homeIcao).includes(base)))
        && (link === 'all' || (link === 'both' ? p.vvx && p.vax : both && p[link] && !p[link === 'vvx' ? 'vax' : 'vvx']))
        && (net === 'all' || (net === 'none' ? !integration(p, 'ivao') && !integration(p, 'vatsim') : integration(p, net)))
        && (period === 'all' || firstJoin !== null && (period === 'year' ? new Date(firstJoin).getFullYear() === now.getFullYear() : firstJoin >= now.getTime() - Number(period) * 86400000));
    });

    const sortValue = (p, type) => type === 'hours'
      ? sum(p, 'time')
      : type === 'flights'
        ? sum(p, 'flights')
        : num(p[type]?.stats?.rating);

    list.sort((a, b) => {
      if (sort === 'name') return profile(a, 'fullname').localeCompare(profile(b, 'fullname'), 'pt-BR');
      if (sort === 'recent') return (joined(b) ?? -Infinity) - (joined(a) ?? -Infinity);
      if (sort === 'old') return (joined(a) ?? Infinity) - (joined(b) ?? Infinity);
      return (sortValue(b, sort) ?? -Infinity) - (sortValue(a, sort) ?? -Infinity);
    });

    $('vpc-count').textContent = `${list.length} pilotos encontrados`;
    $('vpc-grid').innerHTML = list.length
      ? list.map(card).join('')
      : `<p>${any ? 'Nenhum piloto encontrado para os filtros.' : 'Não foi possível carregar as fontes. Atualize a página para tentar novamente.'}</p>`;

    $('vpc-grid').querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.remove()));
    $('vpc-grid').querySelectorAll('.vpc-card').forEach(article=>{
      const p=map.get(article.dataset.pilot);
      getGlobal(p).then(()=>updateGlobalButton(article,p),()=>updateGlobalButton(article,p));
    });
  }

  $('vpc-grid').addEventListener('click',e=>{
    const company=e.target.closest('[data-company-toggle]') || (!e.target.closest('button,a,input') && e.target.closest('.vpc-company-flip')?.querySelector('.vpc-company-summary:not([hidden]) button, .vpc-company-details:not([hidden]) button'));
    if(company){const section=company.closest('.vpc-company'), a=section.querySelector('.vpc-company-summary'), b=section.querySelector('.vpc-company-details'); const open=b.hidden; a.hidden=open;b.hidden=!open;const face=open?b:a;face.classList.remove('vpc-turn');void face.offsetWidth;face.classList.add('vpc-turn');face.querySelector('button').focus();return;}
    const global=e.target.closest('[data-global],[data-global-close],[data-global-retry]');
    if(global){const article=global.closest('.vpc-card'),p=map.get(article.dataset.pilot),panel=article.querySelector('.vpc-global-panel');
      if(global.hasAttribute('data-global-retry')){showGlobal(article,p,true);return;}
      const open=panel.hidden&&!global.hasAttribute('data-global-close');panel.hidden=!open;
      article.querySelector('.vpc-companies').hidden=open;article.querySelector('.vpc-total').hidden=open;
      article.querySelector('[data-global]').setAttribute('aria-expanded',String(open));
      if(open){showGlobal(article,p);panel.querySelector('[data-global-close]').focus();}else{article.querySelector('[data-global]').focus();}return;
    }
    const button=e.target.closest('[data-evolve],[data-return],[data-history-retry]'); if(!button)return;
    const article=button.closest('.vpc-card'), p=map.get(article.dataset.pilot);if(!eligible(p))return;
    if(button.hasAttribute('data-history-retry')){showHistory(article,p);return;}
    const back=article.querySelector('.vpc-back'), front=article.querySelector('.vpc-front'), open=button.hasAttribute('data-evolve');
    front.hidden=open;back.hidden=!open;article.classList.toggle('vpc-flipped',open);
    const face=open?back:front;face.classList.remove('vpc-turn');void face.offsetWidth;face.classList.add('vpc-turn');
    if(open){simulate(article,p);showHistory(article,p);back.querySelector('[data-return]').focus();getGlobal(p).then(()=>{
      if(!article.isConnected||back.hidden)return; const fresh=document.createElement('div');fresh.innerHTML=evolution(p);const updated=fresh.firstElementChild;
      for(const selector of ['.vpc-evo-metrics','.vpc-progress','.vpc-requirements']) back.querySelector(selector).replaceWith(updated.querySelector(selector));simulate(article,p);
    },()=>{});}else{front.querySelector('[data-evolve]').focus();}
  });
  $('vpc-grid').addEventListener('input',e=>{if(!e.target.matches('[data-sim]'))return;const article=e.target.closest('.vpc-card');simulate(article,map.get(article.dataset.pilot));});
  if (!both) {
    for (const option of $('link').options) {
      if (['vvx', 'vax', 'both'].includes(option.value)) option.disabled = true;
    }
  }

  $('vpc-filters').addEventListener('submit', (e) => {
    e.preventDefault();
    render();
  });
  $('vpc-filters').addEventListener('reset', () => setTimeout(render, 0));
  $('vpc-filters').addEventListener('change', render);
  $('q').addEventListener('input', render);
  $('base').addEventListener('input', () => {
    $('base').value = $('base').value.toUpperCase();
    render();
  });

  render();
});
