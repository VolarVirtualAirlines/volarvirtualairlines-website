/**
 * VOLAR LIVE OPERATIONS V5 — Cloudflare Pages Function
 * GET /api/operacoes-detalhe?airline=VVX&id=<NewSky flight _id>
 *
 * Consulta somente detalhes do voo selecionado (OFP + navlog + trilha).
 * Esta versão reaproveita os tokens públicos de mapa já utilizados no site.
 * Posteriormente, prefira configurar as variáveis de ambiente
 * NEWSKY_VVX_MAP_TOKEN / NEWSKY_VAX_MAP_TOKEN e remover os valores embutidos.
 */

// Valores públicos do iframe de mapa em index.html/vax.html; inseridos durante build.
const MAP_TOKENS = {
  VVX: 'VVX_gFOhy8XuCKJLZ0DUhhHj9kpDUi55Zq',
  VAX: 'VAX_UvpS0yX0ofTgbj9DiX4bwjXAYLKsL4'
};

function n(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function geo(lat, lon) {
  const x = n(lat), y = n(lon);
  return x !== null && y !== null && x >= -90 && x <= 90 && y >= -180 && y <= 180
    ? { lat: x, lon: y } : null;
}

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=20' : 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function onRequestGet({ request, env = {} }) {
  const requestUrl = new URL(request.url);
  const airline = (requestUrl.searchParams.get('airline') || '').toUpperCase();
  const id = requestUrl.searchParams.get('id') || '';

  if (!['VVX', 'VAX'].includes(airline) || !/^[a-f0-9]{24}$/i.test(id)) {
    return reply({ error: 'Companhia ou identificador de voo inválido.' }, 400);
  }

  const token = (airline === 'VVX'
    ? (env.NEWSKY_VVX_MAP_TOKEN || env.NEWSKY_VVX_KEY)
    : (env.NEWSKY_VAX_MAP_TOKEN || env.NEWSKY_VAX_KEY)) || MAP_TOKENS[airline];
  if (!token || token.startsWith('__')) {
    return reply({ error: 'Token do mapa não configurado para ' + airline }, 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);
  let response;
  try {
    response = await fetch(`https://newsky.app/api/airline-api/flight/${id}/4`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal
    });
  } catch (error) {
    return reply({ error: error?.name === 'AbortError'
      ? 'NewSky não respondeu dentro do limite de tempo.'
      : 'Não foi possível consultar os detalhes do NewSky.' }, 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const reason = (response.status === 401 || response.status === 403)
      ? 'Acesso aos detalhes não autorizado para o token usado. Verifique a permissão NewSky MAP/FLIGHTS.'
      : `NewSky retornou HTTP ${response.status} ao consultar o voo.`;
    return reply({ error: reason, upstreamStatus: response.status }, response.status === 404 ? 404 : 502);
  }

  let data;
  try { data = await response.json(); }
  catch { return reply({ error: 'NewSky retornou conteúdo de detalhes inválido.' }, 502); }

  const f = data?.flight || data;
  if (!f || typeof f !== 'object') return reply({ error: 'Objeto do voo não encontrado.' }, 502);
  // Os detalhes de uma VA não devem ser servidos como se pertencessem à outra.
  if (String(f?.airline?.icao || '').toUpperCase() !== airline || String(f._id || '') !== id) {
    return reply({ error: 'Voo não corresponde à companhia solicitada.' }, 404);
  }

  const rawFixes = f?.ofp?.content?.navlog?.fix;
  const fixes = [];
  if (Array.isArray(rawFixes)) {
    for (const fix of rawFixes.slice(0, 700)) {
      const pos = geo(fix?.pos_lat, fix?.pos_long);
      if (!pos) continue;
      const ident = String(fix.ident || 'FIX').slice(0, 18);
      const previous = fixes[fixes.length - 1];
      // Não duplicar o mesmo aeroporto no fim do OFP.
      if (previous?.ident === ident && previous.lat === pos.lat && previous.lon === pos.lon) continue;
      fixes.push({ ...pos, ident, type: String(fix.type || '').slice(0, 16),
        stage: String(fix.stage || '').slice(0, 16) });
    }
  }

  const path = [];
  if (Array.isArray(f.path)) {
    for (const point of f.path.slice(-2400)) {
      const pos = geo(point?.lat, point?.lon);
      if (!pos) continue;
      path.push({ ...pos, alt: n(point?.alt), heading: n(point?.hdg),
        time: typeof point?.createdAt === 'string' ? point.createdAt : null });
    }
  }

  const location = f?.lastState?.location || {};
  const speed = f?.lastState?.speed || {};
  const result = {
    airline,
    id,
    callsign: `${airline}${String(f.flightNumber || '')}`,
    ofpAvailable: f?.ofp?.available === true,
    plannedRoute: String(f?.ofp?.content?.general?.route || '').slice(0, 1500),
    fixes,
    path,
    telemetry: {
      position: geo(location.lat, location.lon),
      heading: n(location.hdg),
      altitudeFt: n(location.alt),
      aglFt: n(location.agl),
      groundSpeedKt: n(speed.gs),
      indicatedSpeedKt: n(speed.ias),
      trueSpeedKt: n(speed.tas),
      verticalSpeedFpm: n(speed.vs),
      mach: n(speed.mach),
      timestamp: n(f?.lastState?.timestamp)
    },
    airports: {
      dep: { icao: String(f?.dep?.icao || '').slice(0, 6), position: geo(f?.dep?.location?.lat, f?.dep?.location?.lon) },
      arr: { icao: String(f?.arr?.icao || '').slice(0, 6), position: geo(f?.arr?.location?.lat, f?.arr?.location?.lon) }
    }
  };
  return reply(result);
}
