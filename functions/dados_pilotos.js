async function buscarPerfilPiloto(
    pilotId,
    apiKey
) {

    const urlPerfil =
        `https://newsky.app/api/pilot/${pilotId}`;

    const response = await fetch(urlPerfil, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json"
        }
    });

    const textoPuro = await response.text();
    const textoLimpo = textoPuro.trim();

    const pareceJson =
        textoLimpo.startsWith("{") ||
        textoLimpo.startsWith("[");

    if (!response.ok || !pareceJson) {

        throw new Error(
            `Não foi possível consultar o piloto ${pilotId}. ` +
            `Status: ${response.status}`
        );
    }

    try {

        return JSON.parse(textoPuro);

    } catch (error) {

        throw new Error(
            `Resposta inválida ao consultar o piloto ${pilotId}: ` +
            error.message
        );
    }
}

export async function onRequestGet(context) {

    const airlineId =
        "68e565033f0641c7f6546693";

    const url =
        `https://newsky.app/api/airline/${airlineId}/pilots`;

    const apiKey =
        "VVX_6t2Ol9DvcRHliIWUwXuIWm03IHTTUz";
    
    const payload = {
        skip: 0,
        count: 50,
        needle: "",
        sort: "createdAt",
        order: 1,
        status: "active",
        includeSensitive: false
    };

    try {

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const textoPuro = await response.text();
        const textoLimpo = textoPuro.trim();

        const contentType =
            response.headers.get("content-type") || "";

        const ehJsonValido =
            textoLimpo.startsWith("[") ||
            textoLimpo.startsWith("{");

        const pareceHtml =
            textoLimpo.toLowerCase().includes("<html") ||
            textoLimpo.toLowerCase().includes("<!doctype html");

        if (
            !response.ok ||
            pareceHtml ||
            !ehJsonValido
        ) {

            return new Response(
                JSON.stringify({
                    error: true,
                    status: response.status,
                    endpoint: url,
                    contentType,
                    message:
                        "Resposta inesperada do NewSky: " +
                        textoLimpo.substring(0, 500)
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

        let respostaNewSky;

        try {

            respostaNewSky = JSON.parse(textoPuro);

        } catch (erroJson) {

            return new Response(
                JSON.stringify({
                    error: true,
                    status: response.status,
                    endpoint: url,
                    message:
                        "A resposta recebida não pôde ser convertida em JSON.",
                    details: erroJson.message
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

        const pilotos = Array.isArray(respostaNewSky.results)
            ? respostaNewSky.results
            : [];

        const pilotosComDetalhes = await Promise.all(
        
            pilotos.map(async (piloto) => {
        
                try {
        
                    const perfil =
                        await buscarPerfilPiloto(
                            piloto._id,
                            apiKey
                        );
        
                    return {
                        piloto,
                        perfil
                    };
        
                } catch (error) {
        
                    console.error(
                        `Erro ao consultar ${piloto.fullname}:`,
                        error.message
                    );
        
                    return {
                        piloto,
                        perfil: null
                    };
                }
        
            })
        
        );

        const pilotosNormalizados = pilotosComDetalhes.map(
            ({ piloto, perfil }) => {
        
                const estatisticasVVX =
                    perfil?.stats?.airlines?.[airlineId] || {};
        
                return {
                    ...piloto,
        
                    airlineStats: {
                        rating:
                            Number(estatisticasVVX.rating) || 0,
        
                        flights:
                            Number(estatisticasVVX.flights) || 0,
        
                        time:
                            Number(estatisticasVVX.time) || 0,
        
                        dist:
                            Number(estatisticasVVX.dist) || 0,
        
                        schedules:
                            Number(estatisticasVVX.schedules) || 0,
        
                        charters:
                            Number(estatisticasVVX.charters) || 0,
        
                        online:
                            Number(estatisticasVVX.online) || 0,
        
                        lastFlightDate:
                            estatisticasVVX.lastFlightDate || null
                    }
                };
            }
        );
        
        return new Response(
            JSON.stringify({
                error: false,
                status: response.status,
                endpoint: url,
                tipo: typeof respostaNewSky,
                quantidade: pilotosNormalizados.length,
                totalResults:
                    respostaNewSky.totalResults ?? pilotosNormalizados.length,
                dados: pilotosNormalizados
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            }
        );

    } catch (error) {

        return new Response(
            JSON.stringify({
                error: true,
                endpoint: url,
                message: error.message
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            }
        );
    }
}
