
/*
 * ============================================================
 * VOLAR RAOV — API DE INTEGRAÇÃO COM OPENAI
 * Volar Virtual Airlines / Volar Academy
 * ============================================================
 *
 * Cloudflare Pages Function: functions/api/raov.js
 *
 * Diagnóstico 1: validação do token
 * Diagnóstico 2: consulta ao modelo OpenAI
 * Diagnóstico 3: teste de POST sem geração
 * Diagnóstico 4: geração mínima com limite de tempo
 *
 * Teste principal: geração de texto pela IA
 *
 * Ainda não recebe o JSON operacional do NewSky
 * nem gera o PDF oficial do RAOV.
 * ============================================================
 */

const MODELO = "gpt-6-luna";
const URL_RESPONSES = "https://api.openai.com/v1/responses";

// ============================================================
// FUNÇÕES AUXILIARES
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

async function lerJSON(resposta) {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}

function extrairTexto(dados) {
  return (dados?.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("\n")
    .trim();
}

// ============================================================
// GET /api/raov — STATUS DA INTEGRAÇÃO
// ============================================================

export async function onRequestGet(context) {
  return responder({
    sistema: "VOLAR RAOV",
    status: "online",
    openaiConfigurada: Boolean(context.env.OPENAI_API_KEY),
    testeProtegido: Boolean(context.env.RAOV_TEST_TOKEN)
  });
}

// ============================================================
// POST /api/raov — TESTES E INTEGRAÇÃO
// ============================================================

export async function onRequestPost(context) {
  const { OPENAI_API_KEY, RAOV_TEST_TOKEN } = context.env;

  // 1. Verificar credenciais
  if (!OPENAI_API_KEY || !RAOV_TEST_TOKEN) {
    return responder({
      status: "erro_configuracao",
      mensagem: "Credenciais não configuradas."
    }, 503);
  }

  // 2. Validar token de autorização
  const token = context.request.headers.get("X-RAOV-Test-Token");

  if (!token || token !== RAOV_TEST_TOKEN) {
    return responder({
      status: "nao_autorizado",
      mensagem: "Acesso não autorizado."
    }, 401);
  }

  // 3. Identificar diagnóstico solicitado
  const diagnostico = new URL(context.request.url)
    .searchParams.get("diagnostico");

  // ==========================================================
  // DIAGNÓSTICO 1 — VALIDAR TOKEN
  // Não consulta a OpenAI
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
  // DIAGNÓSTICO 2 — CONSULTAR MODELO NA OPENAI
  // Não gera conteúdo
  // ==========================================================

  if (diagnostico === "2") {
    try {
      const resposta = await fetch(
        `https://api.openai.com/v1/models/${MODELO}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_get_openai",
        status: resposta.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: resposta.status,
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
  // DIAGNÓSTICO 3 — TESTAR POST SEM GERAÇÃO
  // Utiliza modelo propositalmente inexistente
  // ==========================================================

  if (diagnostico === "3") {
    try {
      const resposta = await fetch(URL_RESPONSES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          model: "volar-modelo-inexistente-teste",
          input: "Teste de conectividade VOLAR RAOV."
        })
      });

      const dados = await lerJSON(resposta);

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_post_openai",
        status: resposta.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: resposta.status,
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
  // DIAGNÓSTICO 4 — GERAÇÃO MÍNIMA COM GPT-6 LUNA
  //
  // Solicitação simples: responder OK
  // Tempo limite: 25 segundos
  // Não envia dados de voos
  // ==========================================================

  if (diagnostico === "4") {
    const inicio = Date.now();

    try {
      const resposta = await fetch(URL_RESPONSES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          model: MODELO,
          input: "Responda apenas OK.",
          max_output_tokens: 32,
          store: false
        }),
        signal: AbortSignal.timeout(25000)
      });

      const dados = await lerJSON(resposta);

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "geracao_minima",
        status: resposta.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: resposta.status,
        duracaoMs: Date.now() - inicio,
        modelo: dados?.model || null,
        estadoResposta: dados?.status || null,
        respostaIA: extrairTexto(dados) || null,
        codigoErro: dados?.error?.code || null,
        mensagemErro: dados?.error?.message || null,
        uso: dados?.usage || null
      });

    } catch (erro) {
      console.error(
        "VOLAR RAOV - Diagnóstico 4:",
        erro.name,
        erro.message
      );

      const expirou =
        erro.name === "TimeoutError" ||
        erro.name === "AbortError";

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "geracao_minima",
        status: expirou
          ? "tempo_esgotado"
          : "erro_comunicacao",
        duracaoMs: Date.now() - inicio,
        tipoErro: erro.name,
        mensagem: erro.message
      }, expirou ? 504 : 502);
    }
  }

  // Rejeitar diagnósticos não reconhecidos
  if (diagnostico !== null) {
    return responder({
      status: "diagnostico_invalido",
      mensagem: "Diagnóstico não reconhecido."
    }, 400);
  }

  // ==========================================================
  // TESTE PRINCIPAL DE GERAÇÃO COM A OPENAI
  //
  // Não recebe o JSON do NewSky nesta etapa.
  // ==========================================================

  try {
    const resposta = await fetch(URL_RESPONSES, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model: MODELO,
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
    });

    const dados = await lerJSON(resposta);

    // Verificar erro HTTP da OpenAI
    if (!resposta.ok) {
      return responder({
        sistema: "VOLAR RAOV",
        status: "erro_openai",
        codigoHTTP: resposta.status,
        codigoAPI: dados?.error?.code || null,
        tipoErro: dados?.error?.type || null,
        mensagem:
          dados?.error?.message ||
          "A OpenAI não concluiu a solicitação."
      }, 502);
    }

    // Verificar JSON retornado
    if (!dados) {
      return responder({
        sistema: "VOLAR RAOV",
        status: "resposta_invalida",
        mensagem: "A OpenAI não retornou JSON válido."
      }, 502);
    }

    // Extrair texto
    const texto = extrairTexto(dados);

    if (!texto) {
      return responder({
        sistema: "VOLAR RAOV",
        status: "resposta_vazia",
        estadoResposta: dados.status || null,
        uso: dados.usage || null
      }, 502);
    }

    // Retorno de sucesso
    return responder({
      sistema: "VOLAR RAOV",
      status: "conexao_ok",
      modelo: dados.model,
      respostaIA: texto,
      uso: dados.usage || null
    });

  } catch (erro) {
    console.error(
      "VOLAR RAOV - Geração principal:",
      erro.name,
      erro.message
    );

    return responder({
      sistema: "VOLAR RAOV",
      status: "erro_comunicacao",
      mensagem: "Falha na comunicação com a OpenAI.",
      tipoErro: erro.name
    }, 502);
  }
}
