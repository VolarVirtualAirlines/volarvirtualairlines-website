/*
 * VOLAR RAOV — preparação compacta dos dados do NewSky.
 * Compartilhado entre VVX e VAX.
 * Versão 2: interpreta ocorrências pela descrição do NewSky,
 * sem enviar o campo interno tipoEvento à IA.
 * Integração com Cloudflare D1 e OpenAI.
 */
(function () {
  "use strict";

  function limparDescricao(valor) {
    if (typeof valor !== "string") return null;
    return valor
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function pontosRating(pontos) {
    return typeof pontos === "number" && Number.isFinite(pontos)
      ? pontos / 100
      : null;
  }

  function prepararDados(dadosVoo) {
    if (!dadosVoo || !Array.isArray(dadosVoo.log) ||
        !Array.isArray(dadosVoo.result?.violations) ||
        !dadosVoo.result?.totals) {
      throw new Error("Não foi possível gerar o RAOV porque os dados deste voo estão incompletos.");
    }

    const resultado = dadosVoo.result;
    const totais = resultado.totals;
    const carga = dadosVoo.payload || {};
    const pesos = carga.weights || {};

    return {
      versaoEstrutura: 2,
      identificacao: {
        id: dadosVoo._id,
        callsign: `${dadosVoo.airline?.icao || ""}${dadosVoo.flightNumber || ""}`,
        piloto: dadosVoo.pilot?.fullname ?? null,
        companhia: dadosVoo.airline?.fullname ?? null,
        rede: dadosVoo.network?.name ?? null,
        simulador: dadosVoo.simulator ?? null,
        tipo: dadosVoo.type ?? null,
        aeronave: dadosVoo.aircraft?.name ?? null,
        modelo: dadosVoo.aircraft?.airframe?.name ?? null,
        origem: dadosVoo.dep?.icao ?? null,
        destino: dadosVoo.arr?.icao ?? null,
        dataUTC: dadosVoo.depTime?.slice(0, 10) ?? null
      },
      horariosUTC: {
        saidaPrevista: dadosVoo.depTime ?? null,
        saidaReal: dadosVoo.depTimeAct ?? null,
        chegadaPrevista: dadosVoo.arrTime ?? null,
        chegadaReal: dadosVoo.arrTimeAct ?? null
      },
      resumoOperacional: {
        duracaoMin: dadosVoo.durationAct ?? totais.time ?? null,
        distanciaNM: totais.distance ?? null,
        combustivelKG: totais.fuel ?? null,
        passageiros: totais.payload?.pax ?? carga.pax ?? null,
        capacidadePassageiros: carga.paxCapacity ?? null,
        bagagensKG: pesos.luggage ?? null,
        unidadesCarga: totais.payload?.cargo ?? carga.cargo ?? null,
        pesoCargaKG: pesos.cargo ?? null
      },
      financeiro: {
        receita: totais.revenue ?? null,
        despesas: totais.expenses ?? null,
        penalidadesFinanceiras: totais.penalties ?? null,
        saldo: totais.balance ?? null,
        receitasDetalhadas: {
          passagens: resultado.revenue?.tickets ?? null,
          carga: resultado.revenue?.cargo ?? null
        },
        despesasDetalhadas: {
          aeronave: resultado.expenses?.aircraft ?? null,
          combustivel: resultado.expenses?.fuel ?? null,
          handling: resultado.expenses?.handling ?? null,
          pouso: resultado.expenses?.landing ?? null
        }
      },
      avaliacao: {
        rating: resultado.rating ?? dadosVoo.rating ?? null,
        condicoesDecolagem: resultado.dep?.conditions ?? null,
        condicoesPouso: resultado.arr?.conditions ?? null,
        quantidadeOcorrencias: resultado.violations.length
      },
      ocorrencias: resultado.violations.map((item, indice) => {
        const toque = item.entry?.payload?.touchDown;
        return {
          ordem: indice + 1,
          momentoUTC: item.entry?.createdAt ?? null,
          descricaoECriteriosNewSky: limparDescricao(item.title),
          descontoRating: pontosRating(item.penalty?.points),
          penalidadeFinanceira: item.penalty?.cash ?? null,
          toque: toque ? {
            impactoG: toque.gForce ?? null,
            razaoDescidaFPM: toque.rate ?? null
          } : null,
          referenciaNewSky: item.wiki ?? null
        };
      }),
      quantidadeRegistrosOriginais: dadosVoo.log.length
    };
  }

  window.VolarRAOVIA = {
    prepararDados,
      

      // VOLAR RAOV — consulta protegida pelo Cloudflare Turnstile
      async consultarAPI(resumo) {
        const siteKey = window.VOLAR_RAOV_TURNSTILE_SITE_KEY;
        const turnstile = window.turnstile;
      
        if (
        !siteKey ||
        siteKey === "COLE_AQUI_SUA_SITE_KEY" ||
        !turnstile
      ) {
        // "A proteção Turnstile do VOLAR RAOV não está disponível."
         throw new Error(
          "Não foi possível iniciar a verificação de segurança. Atualize a página e tente novamente."
        );
      }

        const area = document.querySelector(".raov-modal-loading");

        if (!area) {
          throw new Error(
            "Não foi possível iniciar o RAOV. Atualize a página e tente novamente."
          );
        }

        const container = document.createElement("div");
        container.style.margin = "14px auto 0";
        area.appendChild(container);

        let widgetId = null;

        try {
          // Obtém um token novo para esta solicitação.
          const token = await new Promise((resolve, reject) => {
            let finalizado = false;

            function concluir(erro, valor) {
              if (finalizado) return;
              finalizado = true;

              if (erro) {
                reject(new Error(erro));
              } else {
                resolve(valor);
              }
            }

            widgetId = turnstile.render(container, {
              sitekey: siteKey,
              theme: "dark",
              execution: "execute",
              appearance: "interaction-only",

              callback: token => concluir(null, token),
              
              //"Não foi possível validar a proteção Turnstile."
              "error-callback": () => concluir(
                "A verificação de segurança não foi concluída. Tente novamente."
              ),

              //"A validação Turnstile expirou. Solicite novamente."
              "expired-callback": () => concluir(
                "O tempo de verificação expirou. Solicite seu RAOV novamente."
              ),

              //"A validação Turnstile excedeu o tempo permitido."
              "timeout-callback": () => concluir(
                "A verificação de segurança demorou mais que o esperado. Tente novamente."
              )
            });

            turnstile.execute(widgetId);
          });

          // A Function consulta primeiro o D1.
          // Somente se não existir relatório, aciona a OpenAI.
          const resposta = await fetch("/api/raov?acao=analisar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-RAOV-Turnstile": token
            },
            body: JSON.stringify(resumo)
          });

          const resultado = await resposta.json().catch(() => null);

          if (!resposta.ok) {
            throw new Error(
              resultado?.mensagem ||
              `Falha ao solicitar o RAOV (HTTP ${resposta.status}).`
            );
          }

          if (!resultado || resultado.status !== "analise_concluida") {
            throw new Error(
              resultado?.mensagem ||
              "A análise do voo não foi concluída pela IA. Tente novamente."
            );
          }

          return resultado;

        } finally {
          if (widgetId !== null) {
            turnstile.remove(widgetId);
          }

          container.remove();
        }
      },

      async gerar(dadosVoo) {
  
        // Consulta o ID do piloto autenticado no NewSky.
        async function obterPilotoLogado() {
          const resposta = await fetch(
            "https://newsky.app/api/airline/my",
            {
              credentials: "include",
              cache: "no-store"
            }
          );
  
          if (!resposta.ok) {
            throw new Error(
              "Não foi possível confirmar seu acesso ao NewSky. Entre na sua conta e tente novamente."
            );
          }
  
          const companhias = await resposta.json();

          if (!Array.isArray(companhias)) {
            throw new Error("Não foi possível consultar os dados da sua conta no NewSky. Tente novamente.");
          }

          // VOLAR RAOV — verifica vínculo com VVX ou VAX
          const pertenceVolar = companhias.some(cia => {
            const codigo = String(cia.icao || "").toUpperCase();
  
            return (
              (codigo === "VVX" || codigo === "VAX") &&
              typeof cia.pilot?.id === "string"
            );
          });
  
          if (!pertenceVolar) {
            throw new Error(
              "Você não é piloto da Volar Virtual Airlines " +
              "ou da Volar Virtual Academy Excellence. " +
              "Portanto, não possui permissão para solicitar o VOLAR RAOV."
            );
          }
          
          const ids = [...new Set(
            companhias
              .map(cia => cia.pilot?.id)
              .filter(id =>
                typeof id === "string" &&
                /^[a-f0-9]{24}$/i.test(id)
              )
          )];
  
          if (ids.length !== 1) {
            throw new Error(
              "Não foi possível confirmar sua identificação no NewSky. Tente novamente."
            );
          }
  
          return ids[0];
        }
  
        // 1. Captura o ID da sessão.
        const pilotoIdInicial = await obterPilotoLogado();
  
        // 2. Prepara o JSON otimizado já homologado.
        const resumo = prepararDados(dadosVoo);
  
        // 3. Confirma novamente o ID da sessão.
        const pilotoIdAtual = await obterPilotoLogado();
  
        // 4. Interrompe se os identificadores divergirem.
        if (pilotoIdInicial !== pilotoIdAtual) {
          throw new Error(
            "Sua sessão do NewSky foi alterada durante a solicitação. Atualize a página e tente novamente."
          );
        }
  
        // 5. Acrescenta o ID do solicitante ao JSON.
        resumo.solicitante = {
          pilotoIdNewSky: pilotoIdInicial
        };
  
        console.log(
          "VOLAR RAOV — identificação NewSky confirmada."
        );
  
        console.log("VOLAR RAOV — JSON otimizado:", resumo);
  
        console.log(
          "VOLAR RAOV — tamanho original (caracteres):",
          JSON.stringify(dadosVoo).length
        );
  
        console.log(
          "VOLAR RAOV — tamanho otimizado (caracteres):",
          JSON.stringify(resumo).length
        );

        // VOLAR RAOV — integração definitiva
        return await window.VolarRAOVIA.consultarAPI(resumo);
      }
   
  };
})();
