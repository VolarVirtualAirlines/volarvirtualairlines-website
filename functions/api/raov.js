
/*
 * VOLAR RAOV — Integração OpenAI --
 * Cloudflare Pages Function
 *
 * Etapa: primeiro teste de comunicação com a IA.
 * Não recebe logs de voo nesta fase.
 */

function responder(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

// Consulta do estado da integração
export async function onRequestGet(context) {
  return responder({
    sistema: "VOLAR RAOV",
    status: "online",
    openaiConfigurada: Boolean(context.env.OPENAI_API_KEY),
    testeProtegido: Boolean(context.env.RAOV_TEST_TOKEN)
  });
}

// Primeiro teste real de comunicação com a OpenAI
export async function onRequestPost(context) {
  const { OPENAI_API_KEY, RAOV_TEST_TOKEN } = context.env;

  // Verificar configuração
  if (!OPENAI_API_KEY || !RAOV_TEST_TOKEN) {
    return responder({
      status: "erro_configuracao",
      mensagem: "Credenciais não configuradas."
    }, 503);
  }

  // Bloquear chamadas sem autorização
  const token = context.request.headers.get("X-RAOV-Test-Token");

  if (!token || token !== RAOV_TEST_TOKEN) {
    return responder({
      status: "nao_autorizado",
      mensagem: "Acesso não autorizado."
    }, 401);
  }

  // VOLAR RAOV - Diagnóstico sem chamar a OpenAI
  if (new URL(context.request.url)
      .searchParams.get("diagnostico") === "1") {

    return responder({
      sistema: "VOLAR RAOV",
      status: "token_validado",
      mensagem: "Autorização funcionando corretamente.",
      openaiConsultada: false
    });
  }
  
  try {
    const resposta = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
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
            "VOLAR RAOV - conexão com a inteligência artificial estabelecida."
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return responder({
        status: "erro_openai",
        codigoHTTP: resposta.status,
        codigoAPI: dados.error?.code || null,
        mensagem: "A OpenAI não concluiu a solicitação."
      }, 502);
    }

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

    return responder({
      sistema: "VOLAR RAOV",
      status: "conexao_ok",
      modelo: dados.model,
      respostaIA: texto,
      uso: dados.usage || null
    });

  } catch (erro) {
    console.error("VOLAR RAOV: falha na comunicação com OpenAI");

    return responder({
      status: "erro_comunicacao",
      mensagem: "Falha na comunicação com a OpenAI."
    }, 502);
  }
}
