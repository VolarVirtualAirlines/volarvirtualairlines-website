/*
 * VOLAR RAOV — ponto unico para futura integracao com IA.
 * Compartilhado entre index.html (VVX) e vax.html (VAX).
 * Nesta primeira fase, nenhum JSON e transmitido para servicos externos.
 */
(function () {
  "use strict";

  window.VolarRAOVIA = {
    async gerar(dadosVoo) {
      if (!dadosVoo || !Array.isArray(dadosVoo.log)) {
        throw new Error("JSON operacional incompleto para gerar o RAOV.");
      }

      // Futura integracao: enviar dados a uma Pages Function propria
      // (por exemplo, POST /api/raov/gerar) com autorizacao do piloto,
      // que chamara a API da OpenAI e montara o PDF no servidor.
      // Nunca expor uma chave da OpenAI no JavaScript do navegador.
      return {
        status: "aguardando_integracao",
        flightId: dadosVoo._id
      };
    }
  };
})();
