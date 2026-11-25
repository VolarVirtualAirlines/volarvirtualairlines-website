
export async function onRequestGet(context) {

    const url = "https://newsky.app/api/airline-api/flights/recent";

    const apiKey = context.env.NEWSKY_VAX_API_KEY;

    const pilotId = "68dc6b913f0641c7f68ff7ec";

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
    };

    if (!apiKey) {
        return new Response(
            JSON.stringify({
                sucesso: false,
                mensagem: "API Key não configurada."
            }, null, 2),
            { status: 500, headers }
        );
    }

    async function consultar(payload) {

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const dados = await response.json().catch(() => null);

        const registros = Array.isArray(dados?.results)
            ? dados.results
            : Array.isArray(dados)
                ? dados
                : [];

        return {
            status: response.status,
            sucesso: response.ok,
            formatoReconhecido:
                Array.isArray(dados?.results) ||
                Array.isArray(dados),
            registros,
            totalResults: dados?.totalResults ?? null,
            camposRetorno: Object.keys(dados ?? {})
        };
    }

    function resumir(teste, payload, retorno) {

        const voosPiloto = retorno.registros.filter(
            voo => voo.pilot?._id === pilotId
        );

        return {
            teste,
            payload,
            statusNewSky: retorno.status,
            sucesso: retorno.sucesso,
            formatoReconhecido: retorno.formatoReconhecido,
            totalResults: retorno.totalResults,
            registrosRetornados: retorno.registros.length,
            registrosPiloto: voosPiloto.length,
            outrosPilotos:
                retorno.registros.length - voosPiloto.length,
            camposRetorno: retorno.camposRetorno
        };
    }

    try {

        // TESTE 01 - Consulta padrão

        const payload1 = {
            skip: 0,
            count: 100
        };

        const teste1 = await consultar(payload1);

        // TESTE 02 - Filtro experimental por piloto

        const payload2 = {
            skip: 0,
            count: 100,
            pilotId: pilotId
        };

        const teste2 = await consultar(payload2);

        // TESTE 03 - Paginação

        const payload3 = {
            skip: 100,
            count: 100
        };

        const teste3 = await consultar(payload3);

        // Comparar registros das duas páginas

        const idsPagina1 = new Set(
            teste1.registros
                .map(voo => voo._id)
                .filter(Boolean)
        );

        const idsPagina2 = new Set(
            teste3.registros
                .map(voo => voo._id)
                .filter(Boolean)
        );

        const registrosRepetidos =
            [...idsPagina2].filter(
                id => idsPagina1.has(id)
            ).length;

        return new Response(
            JSON.stringify({

                sistema: "VAX Performance & Evolution",

                endpoint: url,

                testes: [
                    resumir(
                        "01 - Consulta padrão",
                        payload1,
                        teste1
                    ),
                    resumir(
                        "02 - Filtro por piloto",
                        payload2,
                        teste2
                    ),
                    resumir(
                        "03 - Paginação",
                        payload3,
                        teste3
                    )
                ],

                comparacaoPaginacao: {
                    idsPagina1: idsPagina1.size,
                    idsPagina2: idsPagina2.size,
                    registrosRepetidos
                }

            }, null, 2),
            { status: 200, headers }
        );

    } catch (error) {

        return new Response(
            JSON.stringify({
                sistema: "VAX Performance & Evolution",
                sucesso: false,
                mensagem: "Falha na execução dos testes."
            }, null, 2),
            { status: 500, headers }
        );
    }
}
