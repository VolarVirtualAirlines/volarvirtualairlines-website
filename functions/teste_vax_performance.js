
export async function onRequestGet(context) {

    const url = "https://newsky.app/api/pilot/flights";

    const apiKey = "VAX_LY50ZzBjkkSjqF9h3srEY2GGvKes47";

    const pilotId = "68dc6b913f0641c7f68ff7ec";

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
    };

    if (!apiKey) {
        return new Response(
            JSON.stringify({
                teste: "VAX Performance & Evolution",
                sucesso: false,
                mensagem: "API Key não configurada."
            }, null, 2),
            { status: 500, headers }
        );
    }

    try {

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                id: pilotId,
                skip: 0,
                count: 30
            })
        });

        const dados = await response.json().catch(() => null);

        const retornoValido =
            response.ok && Array.isArray(dados?.results);

        const voosVAX = retornoValido
            ? dados.results.filter(
                voo => voo.airline?.icao === "VAX"
                    && voo.pilot?._id === pilotId
              )
            : [];

        return new Response(
            JSON.stringify({
                teste: "VAX Performance & Evolution",
                endpoint: url,
                sucesso: retornoValido,
                statusNewSky: response.status,
                totalResults: retornoValido
                    ? dados.totalResults ?? null : null,
                registrosRetornados: retornoValido
                    ? dados.results.length : null,
                registrosVAX: voosVAX.length
            }, null, 2),
            {
                status: retornoValido ? 200 : 502,
                headers
            }
        );

    } catch (error) {

        return new Response(
            JSON.stringify({
                teste: "VAX Performance & Evolution",
                sucesso: false,
                mensagem: "Falha na comunicação com NewSky."
            }, null, 2),
            { status: 500, headers }
        );
    }
}
