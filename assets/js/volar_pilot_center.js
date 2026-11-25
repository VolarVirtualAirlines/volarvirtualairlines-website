/* VOLAR PILOT CENTER V1.1 — integração VVX / VAX */
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const num = (v) => v == null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v);
  const fmt = (v) => v == null ? '—' : v.toLocaleString('pt-BR');
  const time = (v) => v == null ? '—' : `${fmt(Math.floor(v / 60))}h${Math.floor(v % 60) ? ' ' + String(Math.floor(v % 60)).padStart(2, '0') + 'min' : ''}`;
  const date = (v) => v && Number.isFinite(Date.parse(v)) ? new Date(v).toLocaleDateString('pt-BR') : '—';
  const sources = { vvx: '/dados_pilotos', vax: '/dados_cadetes' };

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
  const results = await Promise.allSettled(keys.map((k) => load(sources[k])));

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

  const aggregate = (field) => {
    const values = pilots.map((p) => sum(p, field));
    return values.some((x) => x === null) ? null : values.reduce((s, x) => s + x, 0);
  };

  $('vpc-stats').innerHTML = [
    ['Pilotos únicos', any ? fmt(pilots.length) : '—'],
    ['Pilotos VVX', available.vvx ? fmt(pilots.filter((p) => p.vvx).length) : '—'],
    ['Pilotos VAX', available.vax ? fmt(pilots.filter((p) => p.vax).length) : '—'],
    ['VVX + VAX', both ? fmt(pilots.filter((p) => p.vvx && p.vax).length) : '—'],
    ['Horas de voo', any ? time(aggregate('time')) : '—'],
    ['Voos realizados', any ? fmt(aggregate('flights')) : '—']
  ].map(([label, value]) => `<div><strong>${esc(value)}</strong><span>${label}${partial ? ' · parcial' : ''}</span></div>`).join('');

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
        </section>
      `;
    }

    const s = x.stats ?? {};
    const rating = num(s.rating);

    return `
      <section class="vpc-company ${key}">
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
      </section>
    `;
  }

  function starLine(hours, partialData) {
    const stars = hours === null ? null : Math.floor(hours / 6000);
    let content = '';

    if (stars === null) {
      content = '<span class="vpc-stars-placeholder">☆ Experiência Volar indisponível</span>';
    } else if (stars === 0) {
      content = '<span class="vpc-stars-placeholder">☆ Ainda sem estrelas de experiência</span>';
    } else if (stars <= 5) {
      content = `<span class="vpc-stars-icons">${'★'.repeat(stars)}</span><span class="vpc-stars-label">Experiência Volar</span>`;
    } else {
      content = `<span class="vpc-stars-icons">★</span><span class="vpc-stars-label">Experiência Volar × ${stars}</span>`;
    }

    return `
      <div class="vpc-stars" title="Estrelas de Experiência Volar: uma estrela a cada 100 horas completas de voo acumuladas na Volar">
        ${content}
        ${partialData ? '<small>(parcial)</small>' : ''}
      </div>
    `;
  }

  function card(p) {
    const name = profile(p, 'fullname');
    const avatar = profile(p, 'avatar');
    const hours = sum(p, 'time');
    const initials = name.split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();

    return `
      <article class="vpc-card">
        <div class="vpc-person">
          <div class="vpc-avatar">
            <span>${esc(initials)}</span>
            ${avatar !== '—' ? `<img src="https://newsky.app/api/pilot/avatar/${encodeURIComponent(avatar)}" alt="" loading="lazy">` : ''}
          </div>

          <div class="vpc-person-main">
            <h2>${esc(name)}</h2>
            <small>${esc(profile(p, 'countryCode'))} · ${esc(profile(p, 'homeIcao'))}</small>
            ${starLine(hours, partial)}
          </div>

          <span class="vpc-tag">${p.vvx && p.vax ? 'VVX + VAX' : p.vvx ? 'VVX' : 'VAX'}</span>
        </div>

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

        <footer>IVAO ID: ${esc(integration(p, 'ivao'))} · VATSIM ID: ${esc(integration(p, 'vatsim'))}</footer>
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
  }

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
