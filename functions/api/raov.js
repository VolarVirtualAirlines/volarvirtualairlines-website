
/*
 * ============================================================
 * VOLAR RAOV — INTEGRAÇÃO COM OPENAI
 * Volar Virtual Airlines / Volar Academy
 * ============================================================
 *
 * Cloudflare Pages Function
 *
 * Diagnóstico 1: validação do token
 * Diagnóstico 2: conexão GET com OpenAI
 * Diagnóstico 3: conexão POST com OpenAI
 *
 * Teste principal: geração de resposta pela IA
 *
 * Ainda não recebe logs operacionais do NewSky.
 * ============================================================
 */


// ============================================================
// RESPOSTA JSON PADRONIZADA
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
// LEITURA SEGURA DE RESPOSTA JSON
// ============================================================

async function lerJSON(resposta) {
  const texto = await resposta.text();

  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}


// ============================================================
// GET — STATUS DA INTEGRAÇÃO
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
// POST — TESTES E INTEGRAÇÃO OPENAI
// ============================================================

export async function onRequestPost(context) {

  const {
    OPENAI_API_KEY,
    RAOV_TEST_TOKEN
  } = context.env;


  // ----------------------------------------------------------
  // 1. VERIFICAR CREDENCIAIS
  // ----------------------------------------------------------

  if (!OPENAI_API_KEY || !RAOV_TEST_TOKEN) {

    return responder({
      status: "erro_configuracao",
      mensagem: "Credenciais não configuradas."
    }, 503);

  }


  // ----------------------------------------------------------
  // 2. VALIDAR TOKEN DE TESTE
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
  // 3. IDENTIFICAR DIAGNÓSTICO
  // ----------------------------------------------------------

  const diagnostico = new URL(context.request.url)
    .searchParams.get("diagnostico");


  // ==========================================================
  // DIAGNÓSTICO 1 — VALIDAR TOKEN
  // Não consulta a OpenAI.
  // ==========================================================

  if (diagnostico === "1") {

    return responder({
      sistema: "VOLAR RAOV",
      diagnostico: "validacao_token",
      status: "token_validado",
      mensagem: "Autorização funcionando corretamente.",
      openaiConsultada: false
    });

  }


  // ==========================================================
  // DIAGNÓSTICO 2 — TESTAR GET COM OPENAI
  // Consulta a lista de modelos.
  // Não realiza geração de conteúdo.
  // ==========================================================

  if (diagnostico === "2") {

    try {

      const teste = await fetch(
        /*"https://api.openai.com/v1/models",*/
        "https://api.openai.com/v1/models/gpt-6-luna",
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
        diagnostico: "conexao_get_openai",
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
        diagnostico: "conexao_get_openai",
        status: "erro_comunicacao",
        tipoErro: erro.name,
        mensagem: erro.message
      }, 502);

    }

  }


  // ==========================================================
  // DIAGNÓSTICO 3 — TESTAR POST COM OPENAI
  //
  // Envia um modelo propositalmente inexistente
  // para verificar o retorno HTTP da OpenAI.
  //
  // Não solicita geração válida de conteúdo.
  // ==========================================================

  if (diagnostico === "3") {

    try {

      const teste = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: "volar-modelo-inexistente-teste",
            input: "Teste de conectividade VOLAR RAOV."
          })
        }
      );

      const dados = await lerJSON(teste);

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_post_openai",
        status: teste.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: teste.status,
        tipoErro: dados?.error?.type || null,
        codigoErro: dados?.error?.code || null,
        respostaRecebida: true,
        geracaoExecutada: false
      });

    } catch (erro) {

      console.error(
        "VOLAR RAOV - Diagnóstico 3:",
        erro.name,
        erro.message
      );

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_post_openai",
        status: "erro_comunicacao",
        tipoErro: erro.name,
        mensagem: erro.message
      }, 502);

    }

  }


  // ==========================================================
  // 4. TESTE REAL DE GERAÇÃO COM OPENAI
  //
  // Executado somente quando não foi solicitado
  // nenhum dos diagnósticos anteriores.
  // ==========================================================

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
    // 5. INTERPRETAR RESPOSTA
    // --------------------------------------------------------

    const dados = await lerJSON(resposta);

    if (!resposta.ok) {

      console.error(
        "VOLAR RAOV - Erro OpenAI:",
        resposta.status,
        dados?.error?.code || "sem_codigo"
      );

      return responder({
        sistema: "VOLAR RAOV",
        status: "erro_openai",
        codigoHTTP: resposta.status,
        codigoAPI: dados?.error?.code || null,
        tipoErro: dados?.error?.type || null,
        mensagem: "A OpenAI não concluiu a solicitação."
      }, 502);

    }


    if (!dados) {

      return responder({
        sistema: "VOLAR RAOV",
        status: "resposta_invalida",
        mensagem: "A OpenAI não retornou um JSON válido."
      }, 502);

    }


    // --------------------------------------------------------
    // 6. EXTRAIR TEXTO GERADO
    // --------------------------------------------------------

    const texto = (dados.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");


    if (!texto) {

      return responder({
        sistema: "VOLAR RAOV",
        status: "resposta_vazia",
        mensagem: "A OpenAI não retornou texto.",
        estadoResposta: dados.status || null,
        uso: dados.usage || null
      }, 502);

    }


    // --------------------------------------------------------
    // 7. RETORNAR RESULTADO DA IA
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
    // 8. ERROS DE COMUNICAÇÃO
    // --------------------------------------------------------

    console.error(
      "VOLAR RAOV - Falha de comunicação:",
      erro.name,
      erro.message
    );

    return responder({
      sistema: "VOLAR RAOV",
      status: "erro_comunicacao",
      mensagem: "Falha na comunicação com a OpenAI."
    }, 502);

  }

}
