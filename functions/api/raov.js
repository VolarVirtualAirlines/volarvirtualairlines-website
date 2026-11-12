
/*
 * ============================================================
 * VOLAR RAOV — Integração com OpenAI
 * Volar Virtual Airlines / Volar Academy
 * ============================================================
 *
 * Cloudflare Pages Function
 *
 * Etapa atual:
 * - Verificar configuração das credenciais
 * - Validar token de autorização
 * - Diagnóstico 1: validar autorização
 * - Diagnóstico 2: testar comunicação com OpenAI
 * - Testar geração de resposta com IA
 *
 * Ainda não recebe logs operacionais do NewSky.
 * ============================================================
 */

// ============================================================
// FUNÇÃO AUXILIAR — RESPOSTA JSON
// ============================================================

function responder(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}


// ============================================================
// GET — CONSULTAR STATUS DA INTEGRAÇÃO
// ============================================================

export async function onRequestGet(context) {

  return responder({
    sistema: "VOLAR RAOV",
    status: "online",
    openaiConfigurada:
      Boolean(context.env.OPENAI_API_KEY),
    testeProtegido:
      Boolean(context.env.RAOV_TEST_TOKEN)
  });

}


// ============================================================
// POST — PROCESSAMENTO RAOV / OPENAI
// ============================================================

export async function onRequestPost(context) {

  const {
    OPENAI_API_KEY,
    RAOV_TEST_TOKEN
  } = context.env;


  // ----------------------------------------------------------
  // 1. VERIFICAR CONFIGURAÇÃO
  // ----------------------------------------------------------

  if (!OPENAI_API_KEY || !RAOV_TEST_TOKEN) {

    return responder({
      status: "erro_configuracao",
      mensagem: "Credenciais não configuradas."
    }, 503);

  }


  // ----------------------------------------------------------
  // 2. VALIDAR TOKEN DE AUTORIZAÇÃO
  // ----------------------------------------------------------

  const token = context.request.headers.get(
    "X-RAOV-Test-Token"
  );

  if (!token || token !== RAOV_TEST_TOKEN) {

    return responder({
      status: "nao_autorizado",
      mensagem: "Acesso não autorizado."
    }, 401);

  }


  // ----------------------------------------------------------
  // 3. IDENTIFICAR DIAGNÓSTICO SOLICITADO
  // ----------------------------------------------------------

  const diagnostico = new URL(context.request.url)
    .searchParams.get("diagnostico");


  // ----------------------------------------------------------
  // DIAGNÓSTICO 1 — VALIDAR TOKEN
  // Não consulta a OpenAI.
  // ----------------------------------------------------------

  if (diagnostico === "1") {

    return responder({
      sistema: "VOLAR RAOV",
      status: "token_validado",
      mensagem: "Autorização funcionando corretamente.",
      openaiConsultada: false
    });

  }


  // ----------------------------------------------------------
  // DIAGNÓSTICO 2 — TESTAR CONEXÃO COM OPENAI
  // Consulta GET /v1/models sem gerar texto.
  // ----------------------------------------------------------

  if (diagnostico === "2") {

    try {

      const teste = await fetch(
        "https://api.openai.com/v1/models",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Accept": "application/json"
          },
          cache: "no-store"
        }
      );

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_openai",
        status: teste.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: teste.status,
        openaiConsultada: true
      });

    } catch (erro) {

      console.error(
        "VOLAR RAOV - Diagnóstico 2:",
        erro.name,
        erro.message
      );

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_openai",
        status: "erro_comunicacao",
        tipoErro: erro.name,
        mensagem: erro.message
      }, 502);

    }

  }


  // ----------------------------------------------------------
  // 4. TESTE REAL DE GERAÇÃO COM OPENAI
  // Executado quando não há parâmetro de diagnóstico.
  // ----------------------------------------------------------

  try {

    const resposta = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({

          model: "gpt-6-luna",

          store: false,

          max_output_tokens: 160,

          reasoning: {
            effort: "none"
          },

          input:
            "Responda em português, com uma única frase: " +
            "VOLAR RAOV - conexão com a inteligência " +
            "artificial estabelecida."

        })
      }
    );


    // --------------------------------------------------------
    // 5. INTERPRETAR RESPOSTA DA OPENAI
    // --------------------------------------------------------

    const dados = await resposta.json();


    if (!resposta.ok) {

      console.error(
        "VOLAR RAOV - Erro API OpenAI:",
        resposta.status,
        dados.error?.code || "sem_codigo"
      );

      return responder({
        status: "erro_openai",
        codigoHTTP: resposta.status,
        codigoAPI: dados.error?.code || null,
        mensagem: "A OpenAI não concluiu a solicitação."
      }, 502);

    }


    // --------------------------------------------------------
    // 6. EXTRAIR TEXTO GERADO PELA IA
    // --------------------------------------------------------

    const texto = (dados.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");


    if (!texto) {

      return responder({
        status: "resposta_vazia",
        mensagem: "A OpenAI não retornou texto."
      }, 502);

    }


    // --------------------------------------------------------
    // 7. RETORNAR RESULTADO DO TESTE
    // --------------------------------------------------------

    return responder({
      sistema: "VOLAR RAOV",
      status: "conexao_ok",
      modelo: dados.model,
      respostaIA: texto,
      uso: dados.usage || null
    });


  } catch (erro) {

    // --------------------------------------------------------
    // 8. TRATAR ERROS DE COMUNICAÇÃO
    // --------------------------------------------------------

    console.error(
      "VOLAR RAOV - Falha de comunicação:",
      erro.name,
      erro.message
    );

    return responder({
      status: "erro_comunicacao",
      mensagem: "Falha na comunicação com a OpenAI."
    }, 502);

  }

}
