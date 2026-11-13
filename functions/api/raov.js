/*
 * VOLAR RAOV — Cloudflare Pages Function
 * Arquivo no GitHub: functions/api/raov.js
 * VVX / VAX — integração em homologação
 *
 * Mantém os diagnósticos 1 a 4 e o teste principal existentes.
 * POST /api/raov?acao=analisar aceita JSON otimizado v2
 * com RAOV_TEST_TOKEN, pede análise estruturada à OpenAI.
 * v3.1: refina exclusivamente as instruções de análise (pontos positivos reais).
 * Não gera PDF nem autoriza pilotos na interface pública.
 */

const MODELO = "gpt-6-luna";
const URL_RESPONSES = "https://api.openai.com/v1/responses";
const TAMANHO_MAXIMO_JSON = 40000;

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
  try { return await resposta.json(); }
  catch { return null; }
}

function extrairTexto(dados) {
  return (dados?.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("\n")
    .trim();
}

function validarVooV2(voo) {
  if (!voo || typeof voo !== "object" || Array.isArray(voo))
    return "O JSON operacional deve ser um objeto.";
  if (voo.versaoEstrutura !== 2)
    return "Versão de JSON inválida: esperado versaoEstrutura = 2.";
  if (!/^[a-f\d]{24}$/i.test(voo.identificacao?.id || ""))
    return "ID do voo ausente ou inválido.";
  if (typeof voo.identificacao?.callsign !== "string" || !voo.identificacao.callsign.trim())
    return "Callsign ausente.";
  if (!voo.resumoOperacional || !voo.financeiro || !voo.horariosUTC)
    return "Resumo operacional, financeiro ou horários ausentes.";
  if (typeof voo.avaliacao?.rating !== "number" || !Number.isFinite(voo.avaliacao.rating))
    return "Rating ausente ou inválido.";
  if (!Array.isArray(voo.ocorrencias) || voo.ocorrencias.length > 100)
    return "Lista de ocorrências ausente ou acima do limite de teste.";
  if (voo.avaliacao.quantidadeOcorrencias !== voo.ocorrencias.length)
    return "Quantidade de ocorrências divergente.";
  for (const [i, ocorrencia] of voo.ocorrencias.entries()) {
    if (typeof ocorrencia?.descricaoECriteriosNewSky !== "string" ||
        !ocorrencia.descricaoECriteriosNewSky.trim())
      return `Ocorrência ${i + 1} sem descrição do NewSky.`;
    if (typeof ocorrencia.descontoRating !== "number" ||
        !Number.isFinite(ocorrencia.descontoRating))
      return `Ocorrência ${i + 1} com desconto de rating inválido.`;
    // Não utilizar tipoEvento: fonte principal é a descrição exibida pelo NewSky.
    if ("tipoEvento" in ocorrencia)
      return `Ocorrência ${i + 1} contém tipoEvento: use o JSON otimizado v2.`;
  }
  return null;
}

// Formato estruturado para alimentar futuramente o PDF oficial.
// Regras strict: todas as propriedades requeridas, sem chaves extras.
const FORMATO_ANALISE = {
  type: "json_schema",
  name: "volar_raov_analise_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sumarioExecutivo: { type: "string" },
      analiseOperacional: { type: "string" },
      analiseFinanceira: { type: "string" },
      analiseOcorrencias: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            ordem: { type: "integer" },
            titulo: { type: "string" },
            pontosPositivos: { type: "string" },
            pontosAtencao: { type: "string" },
            recomendacao: { type: "string" }
          },
          required: ["ordem", "titulo", "pontosPositivos", "pontosAtencao", "recomendacao"]
        }
      },
      indicadores: { type: "string" },
      planoEvolucao: { type: "array", items: { type: "string" } },
      observacoesSistema: { type: "array", items: { type: "string" } }
    },
    required: [
      "sumarioExecutivo", "analiseOperacional", "analiseFinanceira",
      "analiseOcorrencias", "indicadores", "planoEvolucao", "observacoesSistema"
    ]
  }
};

const INSTRUCOES_RAOV = `Você é o analista técnico da VOLAR Virtual Airlines (VVX) e VAX.
Produza uma análise RAOV educacional, objetiva e em português do Brasil, para futura diagramação em PDF.
Use exclusivamente o JSON recebido como dados factuais; não invente fatos, causas, parâmetros, limites ou procedimentos atribuídos ao NewSky.
O campo descricaoECriteriosNewSky é a FONTE PRINCIPAL para identificar e interpretar cada ocorrência.
Jamais tente inferir o tipo da ocorrência por classificações internas como tipoEvento.
Para CADA ocorrência, escreva título, pontos positivos, pontos de atenção e recomendações específicas.
Em pontosPositivos, registre SOMENTE desempenho favorável do piloto ou da operação comprovado por medições e critérios disponíveis naquela ocorrência (por exemplo, distância do toque dentro da faixa aceita).
Não apresente como pontos positivos: a existência ou clareza dos registros, uma medição ter sido informada, as condições serem normais, a possibilidade de comparação, a ausência de multa ou o próprio fato de o evento ter sido registrado.
Se a ocorrência não contiver um resultado operacional positivo comprovado, escreva em pontosPositivos exatamente: "Não há pontos positivos específicos comprovados para esta ocorrência nos dados fornecidos."
Não transforme resultados negativos em elogios. Se houver simultaneamente um aspecto positivo e outro negativo, descreva-os separadamente e com os valores corretos.
Em pontosAtencao, compare EXPLICITAMENTE o valor medido com o critério/limite presente na própria descricaoECriteriosNewSky e informe o desconto real de rating da ocorrência.
Se não houver critério explícito para uma medida, diga que não foi informado; não atribua um limite ao NewSky nem invente aprovação/reprovação numérica.
Em recomendacao, dê orientações práticas e específicas ao piloto, ligadas às medições e critérios disponíveis, sem afirmar causas não demonstradas.
Mantenha um item em analiseOcorrencias para cada ocorrência, na ordem numérica recebida, sem juntar, omitir ou inventar eventos.
Os descontos do rating são distintos das penalidades financeiras; não misture os dois conceitos.
Não altere números, unidades, horários ou valores financeiros. Use os dados de toque quando disponíveis.
Se faltar informação, explique a limitação em observacoesSistema. Não simule acesso a links externos.
O texto deve ser compreensível para o piloto e oferecer metas de melhoria práticas e mensuráveis quando houver critérios explícitos.
Responda somente no JSON estruturado solicitado.`;

export async function onRequestGet(context) {
  return responder({
    sistema: "VOLAR RAOV",
    status: "online",
    openaiConfigurada: Boolean(context.env.OPENAI_API_KEY),
    testeProtegido: Boolean(context.env.RAOV_TEST_TOKEN)
  });
}

export async function onRequestPost(context) {
  const { OPENAI_API_KEY, RAOV_TEST_TOKEN } = context.env;
  if (!OPENAI_API_KEY || !RAOV_TEST_TOKEN) {
    return responder({ status: "erro_configuracao", mensagem: "Credenciais não configuradas." }, 503);
  }

  const token = context.request.headers.get("X-RAOV-Test-Token");
  if (!token || token !== RAOV_TEST_TOKEN) {
    return responder({ status: "nao_autorizado", mensagem: "Acesso não autorizado." }, 401);
  }

  const parametros = new URL(context.request.url).searchParams;
  const diagnostico = parametros.get("diagnostico");
  const acao = parametros.get("acao");

  // Diagnóstico 1 — autenticação local
  if (diagnostico === "1") {
    return responder({
      sistema: "VOLAR RAOV", diagnostico: "validacao_token",
      status: "token_validado", mensagem: "Autorização funcionando corretamente.",
      openaiConsultada: false
    });
  }

  // Diagnóstico 2 — acesso ao modelo
  if (diagnostico === "2") {
    try {
      const resposta = await fetch(`https://api.openai.com/v1/models/${MODELO}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, Accept: "application/json" },
        cache: "no-store"
      });
      return responder({
        sistema: "VOLAR RAOV", diagnostico: "conexao_get_openai",
        status: resposta.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: resposta.status, openaiConsultada: true
      });
    } catch (erro) {
      return responder({ status: "erro_comunicacao", diagnostico: "conexao_get_openai", tipoErro: erro.name }, 502);
    }
  }

  // Diagnóstico 3 — POST deliberadamente inválido (sem geração)
  if (diagnostico === "3") {
    try {
      const resposta = await fetch(URL_RESPONSES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json", Accept: "application/json"
        },
        body: JSON.stringify({ model: "volar-modelo-inexistente-teste", input: "Teste." })
      });
      const dados = await lerJSON(resposta);
      return responder({
        sistema: "VOLAR RAOV", diagnostico: "conexao_post_openai",
        status: resposta.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: resposta.status, tipoErro: dados?.error?.type || null,
        codigoErro: dados?.error?.code || null,
        respostaRecebida: true, geracaoExecutada: false
      });
    } catch (erro) {
      return responder({ status: "erro_comunicacao", diagnostico: "conexao_post_openai", tipoErro: erro.name }, 502);
    }
  }

  // Diagnóstico 4 — geração mínima validada anteriormente
  if (diagnostico === "4") {
    const inicio = Date.now();
    try {
      const resposta = await fetch(URL_RESPONSES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json", Accept: "application/json"
        },
        body: JSON.stringify({ model: MODELO, input: "Responda apenas OK.", max_output_tokens: 32, store: false }),
        signal: AbortSignal.timeout(25000)
      });
      const dados = await lerJSON(resposta);
      return responder({
        sistema: "VOLAR RAOV", diagnostico: "geracao_minima",
        status: resposta.ok ? "conexao_ok" : "erro_api",
        httpOpenAI: resposta.status, duracaoMs: Date.now() - inicio,
        modelo: dados?.model || null, estadoResposta: dados?.status || null,
        respostaIA: extrairTexto(dados) || null,
        codigoErro: dados?.error?.code || null,
        mensagemErro: dados?.error?.message || null,
        uso: dados?.usage || null
      });
    } catch (erro) {
      const expirou = ["AbortError", "TimeoutError"].includes(erro.name);
      return responder({
        sistema: "VOLAR RAOV", diagnostico: "geracao_minima",
        status: expirou ? "tempo_esgotado" : "erro_comunicacao",
        duracaoMs: Date.now() - inicio, tipoErro: erro.name
      }, expirou ? 504 : 502);
    }
  }
  
  // Diagnóstico 5 — conexão com o banco D1, sem consultar a OpenAI
  if (diagnostico === "5") {
    const banco = context.env.RAOV_DB;

    if (!banco) {
      return responder({
        status: "banco_nao_configurado",
        mensagem: "O binding RAOV_DB não está disponível."
      }, 503);
    }

    try {
      const resultado = await banco
        .prepare("SELECT COUNT(*) AS total FROM raov_solicitacoes")
        .first();

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "conexao_d1",
        status: "banco_conectado",
        tabela: "raov_solicitacoes",
        totalRegistros: resultado.total,
        openaiConsultada: false
      });
    } catch (erro) {
      console.error("VOLAR RAOV - D1:", erro.name);

      return responder({
        status: "erro_banco",
        mensagem: "Não foi possível consultar o banco D1."
      }, 503);
    }
  }

  // Diagnóstico 6 — consulta de relatório no D1, sem OpenAI
  if (diagnostico === "6") {
    const banco = context.env.RAOV_DB;
    const vooId = "6af58338d962ff40f15b6598";

    if (!banco) {
      return responder({
        status: "banco_nao_configurado"
      }, 503);
    }

    try {
      const relatorio = await banco
        .prepare(
          "SELECT status FROM raov_relatorios WHERE voo_id = ?"
        )
        .bind(vooId)
        .first();

      return responder({
        sistema: "VOLAR RAOV",
        diagnostico: "consulta_relatorio_d1",
        status: "consulta_ok",
        vooId: vooId,
        relatorioEncontrado: Boolean(relatorio),
        situacao: relatorio?.status || null,
        openaiConsultada: false
      });

    } catch (erro) {
      console.error("VOLAR RAOV - Diagnóstico 6:", erro.name);

      return responder({
        status: "erro_consulta_d1",
        mensagem: "Não foi possível consultar o relatório."
      }, 503);
    }
  }
  
  if (diagnostico !== null) {
    return responder({ status: "diagnostico_invalido", mensagem: "Diagnóstico não reconhecido." }, 400);
  }

  // NOVA AÇÃO — análise de voo real pelo modelo, ainda sob token manual de teste
  if (acao === "analisar") {
    const tipo = context.request.headers.get("content-type") || "";
    if (!tipo.includes("application/json")) {
      return responder({ status: "formato_invalido", mensagem: "Use Content-Type: application/json." }, 415);
    }
    const declarado = Number(context.request.headers.get("content-length") || 0);
    if (declarado > TAMANHO_MAXIMO_JSON) {
      return responder({ status: "dados_excessivos", mensagem: "JSON acima do limite de teste." }, 413);
    }

    let voo;
    try {
      const texto = await context.request.text();
      if (texto.length > TAMANHO_MAXIMO_JSON) {
        return responder({ status: "dados_excessivos", mensagem: "JSON acima do limite de teste." }, 413);
      }
      voo = JSON.parse(texto);
    } catch {
      return responder({ status: "json_invalido", mensagem: "Corpo JSON inválido." }, 400);
    }

    const erroValidacao = validarVooV2(voo);
    if (erroValidacao) {
      return responder({ status: "voo_invalido", mensagem: erroValidacao }, 400);
    }
    
    // VOLAR RAOV — identificação do solicitante NewSky
    const pilotoIdNewSky = voo.solicitante?.pilotoIdNewSky;

    if (
      typeof pilotoIdNewSky !== "string" ||
      !/^[a-f0-9]{24}$/i.test(pilotoIdNewSky)
    ) {
      return responder({
        sistema: "VOLAR RAOV",
        status: "piloto_nao_identificado",
        mensagem: "Não foi possível identificar o piloto logado no NewSky."
      }, 400);
    }

    // VOLAR RAOV — somente voos com rating inferior a 8.0
    const ratingRAOV = voo.avaliacao.rating;

    if (ratingRAOV < 0 || ratingRAOV >= 8) {
      return responder({
        sistema: "VOLAR RAOV",
        status: "rating_nao_elegivel",
        mensagem: "O RAOV está disponível somente para voos com rating NewSky inferior a 8,00.",
        rating: ratingRAOV
      }, 403);
    }


    // VOLAR RAOV — procura uma análise já concluída no D1
    const bancoRAOV = context.env.RAOV_DB;

    if (!bancoRAOV) {
      return responder({
        status: "banco_nao_configurado",
        mensagem: "O banco RAOV_DB não está disponível."
      }, 503);
    }

    let relatorioExistente;

    try {
      relatorioExistente = await bancoRAOV
        .prepare(
          "SELECT status, analise_json FROM raov_relatorios WHERE voo_id = ?"
        )
        .bind(voo.identificacao.id)
        .first();
    } catch (erro) {
      console.error("VOLAR RAOV - consulta D1:", erro.name);

      return responder({
        status: "erro_banco",
        mensagem: "Não foi possível consultar os relatórios armazenados."
      }, 503);
    }

    // Reutiliza a análise sem consultar novamente a OpenAI
    if (relatorioExistente?.status === "concluido" &&
        relatorioExistente.analise_json) {

      let analiseSalva;

      try {
        analiseSalva = JSON.parse(relatorioExistente.analise_json);
      } catch {
        return responder({
          status: "relatorio_invalido",
          mensagem: "A análise armazenada não pôde ser recuperada."
        }, 503);
      }

      return responder({
        sistema: "VOLAR RAOV",
        status: "analise_concluida",
        origem: "banco_d1",
        voo: {
          id: voo.identificacao.id,
          callsign: voo.identificacao.callsign
        },
        modelo: MODELO,
        analise: analiseSalva,
        uso: null,
        pdfGerado: false
      });
    }

    // VOLAR RAOV — verifica o intervalo de 60 minutos por piloto
    // Executado apenas quando o relatório ainda não existe no D1.

    try {
      const ultimaSolicitacao = await bancoRAOV
        .prepare(`
          SELECT solicitado_em
          FROM raov_solicitacoes
          WHERE piloto_id = ?
            AND status IN ('processando', 'concluido')
            AND solicitado_em > unixepoch() - 3600
          ORDER BY solicitado_em DESC
          LIMIT 1
        `)
        .bind(pilotoIdNewSky)
        .first();

      if (ultimaSolicitacao) {
        const agora = Math.floor(Date.now() / 1000);

        const segundosRestantes = Math.max(
          1,
          ultimaSolicitacao.solicitado_em + 3600 - agora
        );

        return responder({
          sistema: "VOLAR RAOV",
          status: "intervalo_nao_cumprido",
          mensagem:
            "Você já solicitou um RAOV recentemente. " +
            "Aguarde o intervalo de 60 minutos para uma nova análise.",
          minutosRestantes: Math.ceil(segundosRestantes / 60)
        }, 429);
      }

    } catch (erro) {
      console.error("VOLAR RAOV — controle de intervalo:", erro.name);

      return responder({
        status: "erro_controle_raov",
        mensagem: "Não foi possível verificar o intervalo de solicitações."
      }, 503);
    }
    
    // Lista branca: nunca envia telemetria completa nem propriedades inesperadas.
    const vooMinimo = {
      versaoEstrutura: 2,
      identificacao: voo.identificacao,
      horariosUTC: voo.horariosUTC,
      resumoOperacional: voo.resumoOperacional,
      financeiro: voo.financeiro,
      avaliacao: voo.avaliacao,
      ocorrencias: voo.ocorrencias.map(o => ({
        ordem: o.ordem,
        momentoUTC: o.momentoUTC,
        descricaoECriteriosNewSky: o.descricaoECriteriosNewSky,
        descontoRating: o.descontoRating,
        penalidadeFinanceira: o.penalidadeFinanceira,
        toque: o.toque,
        referenciaNewSky: o.referenciaNewSky
      }))
    };

    try {
      const resposta = await fetch(URL_RESPONSES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json", Accept: "application/json"
        },
        body: JSON.stringify({
          model: MODELO,
          store: false,
          reasoning: { effort: "none" },
          max_output_tokens: 4200,
          instructions: INSTRUCOES_RAOV,
          input: JSON.stringify(vooMinimo),
          text: { format: FORMATO_ANALISE }
        }),
        signal: AbortSignal.timeout(55000)
      });
      const dados = await lerJSON(resposta);
      if (!resposta.ok) {
        return responder({
          sistema: "VOLAR RAOV", status: "erro_openai",
          httpOpenAI: resposta.status,
          codigoErro: dados?.error?.code || null,
          mensagem: dados?.error?.message || "A OpenAI rejeitou a análise."
        }, resposta.status === 429 ? 429 : 502);
      }
      if (dados?.status !== "completed") {
        return responder({
          sistema: "VOLAR RAOV", status: "analise_incompleta",
          estadoResposta: dados?.status || null,
          motivo: dados?.incomplete_details?.reason || null,
          uso: dados?.usage || null
        }, 502);
      }
      const texto = extrairTexto(dados);
      let analise;
      try { analise = JSON.parse(texto); }
      catch { return responder({ status: "formato_resposta_invalido", mensagem: "A IA não produziu JSON válido." }, 502); }

      if (!Array.isArray(analise.analiseOcorrencias) ||
          analise.analiseOcorrencias.length !== voo.ocorrencias.length ||
          analise.analiseOcorrencias.some((o, i) => o.ordem !== voo.ocorrencias[i].ordem)) {
        return responder({
          status: "analise_incompleta",
          mensagem: "A IA não preservou todos os eventos e suas ordens; relatório não liberado."
        }, 502);
      }

      // VOLAR RAOV — armazena a análise concluída no D1
      try {
        const gravacao = await bancoRAOV.prepare(`
          INSERT INTO raov_relatorios (
            voo_id,
            callsign,
            rating,
            status,
            analise_json,
            finalizado_em,
            tokens_entrada,
            tokens_saida
          )
          VALUES (?, ?, ?, 'concluido', ?, unixepoch(), ?, ?)
          ON CONFLICT(voo_id) DO UPDATE SET
            status = 'concluido',
            analise_json = excluded.analise_json,
            atualizado_em = unixepoch(),
            finalizado_em = unixepoch(),
            tokens_entrada = excluded.tokens_entrada,
            tokens_saida = excluded.tokens_saida,
            mensagem_erro = NULL
          WHERE raov_relatorios.status != 'concluido'
        `).bind(
          voo.identificacao.id,
          voo.identificacao.callsign,
          voo.avaliacao.rating,
          JSON.stringify(analise),
          dados.usage?.input_tokens ?? 0,
          dados.usage?.output_tokens ?? 0
        ).run();

        if (!gravacao.success) {
          throw new Error("Falha ao gravar análise.");
        }

        // VOLAR RAOV — registra a geração para controle de 60 minutos
        const registro = await bancoRAOV.prepare(`
          INSERT INTO raov_solicitacoes (
            piloto_id,
            voo_id,
            callsign,
            rating,
            status,
            solicitado_em,
            finalizado_em,
            tokens_entrada,
            tokens_saida
          )
          VALUES (?, ?, ?, ?, 'concluido',
                  unixepoch(), unixepoch(), ?, ?)
        `).bind(
          pilotoIdNewSky,
          voo.identificacao.id,
          voo.identificacao.callsign,
          voo.avaliacao.rating,
          dados.usage?.input_tokens ?? 0,
          dados.usage?.output_tokens ?? 0
        ).run();

        if (!registro.success) {
          throw new Error("Falha ao registrar solicitação do RAOV.");
        }
        
        console.log(
          "VOLAR RAOV — análise armazenada no D1:",
          voo.identificacao.callsign
        );

      } catch (erro) {
        console.error("VOLAR RAOV — gravação D1:", erro);

        return responder({
          status: "erro_gravacao",
          mensagem: "A análise foi produzida, mas não pôde ser armazenada."
        }, 503);
      }
      
      return responder({
        sistema: "VOLAR RAOV", status: "analise_concluida",
        voo: { id: voo.identificacao.id, callsign: voo.identificacao.callsign },
        modelo: dados.model,
        analise,
        uso: dados.usage || null,
        pdfGerado: false
      });
    } catch (erro) {
      const expirou = ["AbortError", "TimeoutError"].includes(erro.name);
      console.error("VOLAR RAOV - análise:", erro.name);
      return responder({
        status: expirou ? "tempo_esgotado" : "erro_comunicacao",
        mensagem: "Não foi possível concluir a análise do voo."
      }, expirou ? 504 : 502);
    }
  }

  if (acao !== null) {
    return responder({ status: "acao_invalida", mensagem: "Ação não reconhecida." }, 400);
  }

  // Mantém o POST principal de teste simples já homologado.
  try {
    const resposta = await fetch(URL_RESPONSES, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json", Accept: "application/json"
      },
      body: JSON.stringify({
        model: MODELO, store: false, max_output_tokens: 160,
        reasoning: { effort: "none" },
        input: "Responda em português, com uma única frase: VOLAR RAOV - conexão com a inteligência artificial estabelecida."
      })
    });
    const dados = await lerJSON(resposta);
    if (!resposta.ok) {
      return responder({
        status: "erro_openai", codigoHTTP: resposta.status,
        codigoAPI: dados?.error?.code || null,
        mensagem: "A OpenAI não concluiu a solicitação."
      }, 502);
    }
    const texto = extrairTexto(dados);
    if (!texto) return responder({ status: "resposta_vazia", mensagem: "A OpenAI não retornou texto." }, 502);
    return responder({
      sistema: "VOLAR RAOV", status: "conexao_ok",
      modelo: dados.model, respostaIA: texto, uso: dados.usage || null
    });
  } catch (erro) {
    console.error("VOLAR RAOV - teste principal:", erro.name);
    return responder({ status: "erro_comunicacao", mensagem: "Falha na comunicação com a OpenAI." }, 502);
  }
}
