/**
 * Cloudflare Pages Function — Volar Academy Excellence (VAX)
 * Salvar em functions/api/frota-vax.js
 * GET /api/frota-vax
 * Identificador VAX fornecido pelo administrador da companhia.
 * A disponibilidade e a autorização do endpoint de origem devem ser verificadas no deploy.
 */
const VAX_ID = '6a3ab801a5e61d69a7f42cf0';
const endpoint = `https://newsky.app/api/airline/${VAX_ID}/aircraft/list`;
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

export async function onRequestGet() {
  const pageSize = 100;
  const maxPages = 30;
  const all = [];
  let totalResults = null;
  try {
    for (let page = 0; page < maxPages; page++) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skip: page * pageSize,
          count: pageSize,
          needle: '',
          sort: 'airframe.icao',
          order: 1
        })
      });
      if (!response.ok) {
        return reply({ success: false, message: 'Consulta da frota VAX não autorizada ou indisponível.', status: response.status }, 502);
      }
      let data;
      try { data = await response.json(); }
      catch { return reply({ success: false, message: 'A consulta não retornou um JSON válido.' }, 502); }
      if (!Array.isArray(data?.results)) {
        return reply({ success: false, message: 'Lista de aeronaves indisponível.' }, 502);
      }
      if (typeof data.totalResults === 'number' && Number.isFinite(data.totalResults)) {
        totalResults = data.totalResults;
      }
      all.push(...data.results);
      if ((totalResults !== null && all.length >= totalResults) || data.results.length < pageSize) break;
    }
    if (totalResults === null || all.length < totalResults) {
      return reply({ success: false, message: 'A consulta da frota VAX está incompleta.', totalResults, received: all.length }, 502);
    }
    const aircraft = all.map(a => ({
      id: a._id ?? null,
      name: a.name?.trim() ?? null,
      icao: a.airframeIdent ?? a.airframe?.icao ?? null,
      model: a.airframe?.name ?? null,
      purpose: a.airframe?.purpose ?? null,
      location: a.locationIcao ?? null,
      passengers: a.cabin?.total ?? 0,
      cargoKg: a.cabin?.cargo?.weight ?? 0,
      flights: a.stats?.flights ?? 0,
      distance: a.stats?.dist ?? 0
    }));
    return reply({ success: true, totalResults, received: aircraft.length, complete: true, aircraft });
  } catch (error) {
    console.error('Falha na consulta da frota VAX:', error);
    return reply({ success: false, message: 'O serviço de frota VAX está temporariamente indisponível.' }, 502);
  }
}
