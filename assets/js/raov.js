/*
 * VOLAR RAOV — consulta ao log e manipulacao dos botoes Gerar RAOV.
 * Compartilhado entre index.html (VVX) e vax.html (VAX).
 */
(function () {
  "use strict";

  const ID_VALIDO = /^[a-f0-9]{24}$/i;

  class ErroRAOV extends Error {
    constructor(codigo, mensagem) {
      super(mensagem);
      this.name = "ErroRAOV";
      this.codigo = codigo;
    }
  }

  async function buscarLogNewSky(flightId) {
    if (!ID_VALIDO.test(flightId)) {
      throw new ErroRAOV("ID_INVALIDO", "O identificador deste voo e invalido.");
    }

    const url = `https://newsky.app/api/flight/${encodeURIComponent(flightId)}/5`;
    let resposta;

    try {
      resposta = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
    } catch (erro) {
      // Quando CORS bloqueia a resposta, o JS nao consegue inspecionar
      // seu status HTTP, mesmo que o servidor tenha respondido com 401.
      throw new ErroRAOV(
        "CORS_OU_REDE",
        "Nao foi possivel ler o NewSky pelo site da Volar. O navegador pode estar bloqueando a resposta por CORS ou politica de cookies, mesmo com o NewSky aberto. Nao e possivel concluir que falta login."
      );
    }

    const dados = await resposta.json().catch(() => null);

    if (resposta.status === 401 || dados?.statusCode === 401 || dados?.error === "Unauthorized") {
      throw new ErroRAOV(
        "LOGIN_NECESSARIO",
        "Voce precisa estar logado na sua conta do NewSky para consultar o log deste voo. Acesse https://newsky.app, faca login e tente novamente."
      );
    }

    if (resposta.status === 403 || dados?.statusCode === 403) {
      throw new ErroRAOV("SEM_PERMISSAO", "Sua conta NewSky nao tem permissao para consultar este log.");
    }

    if (!resposta.ok) {
      throw new ErroRAOV("HTTP", `Nao foi possivel consultar o voo. HTTP ${resposta.status}.`);
    }

    if (!dados || dados._id !== flightId || !Array.isArray(dados.log)) {
      throw new ErroRAOV("SEM_LOG", "O NewSky respondeu, mas o JSON nao contem o log operacional completo deste voo.");
    }

    return dados;
  }

  document.addEventListener("click", async (evento) => {
    const botao = evento.target.closest("button.btn-gerar-raov[data-raov-flight-id]");
    if (!botao || botao.disabled) return;

    evento.preventDefault();
    const textoAnterior = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Consultando...";

    try {
      const dadosVoo = await buscarLogNewSky(botao.dataset.raovFlightId);

      if (!window.VolarRAOVIA || typeof window.VolarRAOVIA.gerar !== "function") {
        throw new ErroRAOV("MODULO_IA", "O modulo compartilhado de integracao RAOV-IA nao foi carregado.");
      }

      const retorno = await window.VolarRAOVIA.gerar(dadosVoo);

      if (retorno.status === "aguardando_integracao") {
        const voo = `${dadosVoo.airline?.icao || ""}${dadosVoo.flightNumber || ""}`;
        alert(`RAOV — ${voo}\n\nLog NewSky carregado com sucesso (${dadosVoo.log.length} registros).\n\nA integracao com a IA ainda nao esta ativa. Nenhum PDF foi gerado.`);
      }
    } catch (erro) {
      console.error("VOLAR RAOV:", erro.codigo || erro.name || "ERRO", erro.message);
      alert(`VOLAR RAOV\n\n${erro.message}`);
    } finally {
      botao.textContent = textoAnterior;
      botao.disabled = false;
    }
  });
})();
