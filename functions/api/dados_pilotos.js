export async function onRequestGet(context) {

    const url = "https://newsky.app/api/airline-api/pilots";
    const apiKey = "VVX_6t2Ol9DvcRHliIWUwXuIWm03IHTTUz";

    try {

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "application/json"
            }
        });

        const textoPuro = await response.text();
        const textoLimpo = textoPuro.trim();

        const ehJsonValido =
            textoLimpo.startsWith("[") ||
            textoLimpo.startsWith("{");

        if (
            !response.ok ||
            textoLimpo.toLowerCase().includes("<html") ||
            !ehJsonValido
        ) {

            return new Response(
                JSON.stringify({
                    error: true,
                    status: response.status,
                    endpoint: url,
                    message:
                        `Resposta inesperada do NewSky: ` +
                        textoLimpo.substring(0, 300)
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

        let dados;

        try {
            dados = JSON.parse(textoPuro);
        } catch (erroJson) {

            return new Response(
                JSON.stringify({
                    error: true,
                    status: response.status,
                    endpoint: url,
                    message: "A resposta recebida não pôde ser convertida em JSON.",
                    details: erroJson.message
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({
                error: false,
                status: response.status,
                endpoint: url,
                tipo: Array.isArray(dados) ? "array" : typeof dados,
                quantidade: Array.isArray(dados)
                    ? dados.length
                    : null,
                dados
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
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
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store"
                }
            }
        );
    }
}
