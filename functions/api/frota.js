/**
 * Cloudflare Pages Function
 * Local do arquivo no repositório: functions/api/test-frota.js
 * Rota pública criada depois do deploy: GET /api/test-frota
 *
 * Consulta de teste ao endpoint interno da frota do NewSky.
 * Não utiliza API Key nem cookies. Uso contínuo sujeito à autorização
 * e à estabilidade do endpoint do NewSky.
 */
export async function onRequestGet() {
  const endpoint =
    "https://newsky.app/api/airline/68e565033f0641c7f6546693/aircraft/list";

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        skip: 0,
        count: 100,
        needle: "",
        sort: "airframe.icao",
        order: 1,
      }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "A consulta da frota no NewSky não foi autorizada ou falhou.",
          newskyStatus: response.status,
        }),
        { status: 502, headers }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: "O NewSky não retornou um JSON válido.",
        }),
        { status: 502, headers }
      );
    }

    if (!Array.isArray(data?.results)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "A resposta do NewSky não contém a lista results.",
        }),
        { status: 502, headers }
      );
    }

    const aircraft = data.results.map((a) => ({
      id: a._id ?? null,
      name: a.name?.trim() ?? null,
      icao: a.airframeIdent ?? a.airframe?.icao ?? null,
      model: a.airframe?.name ?? null,
      purpose: a.airframe?.purpose ?? null,
      location: a.locationIcao ?? null,
      passengers: a.cabin?.total ?? 0,
      cargoKg: a.cabin?.cargo?.weight ?? 0,
      flights: a.stats?.flights ?? 0,
      distance: a.stats?.dist ?? 0,
    }));

    return new Response(
      JSON.stringify(
        {
          success: true,
          source: "NewSky / aircraft/list",
          totalResults: data.totalResults ?? aircraft.length,
          received: aircraft.length,
          complete:
            typeof data.totalResults === "number"
              ? aircraft.length >= data.totalResults
              : null,
          aircraft,
        },
        null,
        2
      ),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Falha na consulta de teste da frota:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Não foi possível conectar ao NewSky a partir do Cloudflare.",
      }),
      { status: 502, headers }
    );
  }
}
