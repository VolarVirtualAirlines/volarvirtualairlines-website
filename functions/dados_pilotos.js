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

        return new Response(
            JSON.stringify({
                error: false,
                status: response.status,
                endpoint: url,
                tipo: typeof respostaNewSky,
                quantidade: pilotos.length,
                totalResults:
                    respostaNewSky.totalResults ?? pilotos.length,
                dados: pilotos
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
