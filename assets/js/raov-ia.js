/*
 * VOLAR RAOV — preparação compacta dos dados do NewSky.
 * Compartilhado entre VVX e VAX.
 * Versão 2: interpreta ocorrências pela descrição do NewSky,
 * sem enviar o campo interno tipoEvento à IA.
 * Etapa atual: não envia informações à OpenAI.
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
      throw new Error("O NewSky não disponibilizou os dados completos para o RAOV.");
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
              "Não foi possível confirmar o login no NewSky."
            );
          }
  
          const companhias = await resposta.json();

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
              "Você não é piloto da Volar Virtual Airlines (VVX) " +
              "ou da Volar Virtual Academy Excellence (VAX). " +
              "Portanto, não possui permissão para solicitar o VOLAR RAOV."
            );
          }
          
          if (!Array.isArray(companhias)) {
            throw new Error("Resposta inválida do NewSky.");
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
              "Não foi possível identificar um piloto único no NewSky."
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
            "A identificação do piloto mudou. Solicitação interrompida."
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
  
        return {
          status: "aguardando_integracao",
          flightId: dadosVoo._id
        };
      }
   
  };
})();
