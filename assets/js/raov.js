/*
 * VOLAR RAOV — consulta ao log e interface de notificações.
 * Compartilhado entre index.html (VVX) e vax.html (VAX).
 * Substitui o raov.js anterior sem alterar o raov-ia.js.
 */
(function () {
  "use strict";

  const ID_VALIDO = /^[a-f0-9]{24}$/i;
  let modal = null;
  let focoAnterior = null;
  let overflowAnterior = "";

  class ErroRAOV extends Error {
    constructor(codigo, mensagem) {
      super(mensagem);
      this.name = "ErroRAOV";
      this.codigo = codigo;
    }
  }

  function obterModal() {
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "raov-modal-backdrop";
    modal.hidden = true;
    modal.innerHTML = `
      <section class="raov-modal" role="dialog" aria-modal="true"
               aria-labelledby="raov-modal-titulo" aria-describedby="raov-modal-mensagem">
        <button type="button" class="raov-modal-fechar" aria-label="Fechar janela">&times;</button>
        <div class="raov-modal-marca"><span class="raov-modal-marca-ponto"></span> VOLAR <strong>RAOV</strong></div>
        <div class="raov-modal-cabecalho">
          <div class="raov-modal-icone" aria-hidden="true">✓</div>
          <div class="raov-modal-cabecalho-textos">
            <h3 id="raov-modal-titulo"></h3>
            <p class="raov-modal-subtitulo">Relatório de Análise de Operação de Voo</p>
          </div>
        </div>
  
        <div class="raov-modal-corpo">
          <div class="raov-modal-voo" hidden></div>
        
          <div class="raov-modal-loading" hidden>
            <div class="raov-modal-loading-icone">✈</div>
            <p class="raov-modal-loading-texto">Processando sua solicitação...</p>
            <p class="raov-modal-loading-subtexto">
              Estamos consultando os dados do voo no NewSky.
            </p>
          </div>
        
          <div class="raov-modal-conteudo">
            <p id="raov-modal-mensagem"></p>
            <p class="raov-modal-detalhe" hidden></p>
          </div>
        </div>

        <div class="raov-modal-acoes">
          <a class="raov-modal-link" href="https://newsky.app/" target="_blank"
             rel="noopener noreferrer" hidden>Abrir NewSky ↗</a>
          <button type="button" class="raov-modal-ok">Entendi</button>
          <button type="button" class="raov-modal-solicitar" hidden>Solicitar RAOV</button>
        </div>
      </section>
    `;
    document.body.appendChild(modal);

    const fechar = () => fecharModal();
    modal.querySelector(".raov-modal-fechar").addEventListener("click", fechar);
    modal.querySelector(".raov-modal-ok").addEventListener("click", fechar);
    modal.addEventListener("click", (evento) => {
      if (evento.target === modal) fechar();
    });

    document.addEventListener("keydown", (evento) => {
      if (modal.hidden) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        fecharModal();
      } else if (evento.key === "Tab") {
        const elementos = [...modal.querySelectorAll('button:not([disabled]):not([hidden]), a:not([hidden])')];

        if (!elementos.length) return;
        const primeiro = elementos[0];
        const ultimo = elementos[elementos.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    });

    return modal;
  }

  function fecharModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = overflowAnterior;
    if (focoAnterior && typeof focoAnterior.focus === "function") focoAnterior.focus();
    focoAnterior = null;
  }

  function mostrarModal({ tipo = "info", titulo, mensagem, detalhe = "", voo = "", abrirNewSky = false, confirmacao = false, aoConfirmar = null }) {
    const elemento = obterModal();

    // VOLAR RAOV — restaura o conteúdo normal do pop-up
    elemento.querySelector(".raov-modal-loading").hidden = true;
    elemento.querySelector(".raov-modal-conteudo").hidden = false;
    elemento.querySelector(".raov-modal-acoes").style.display = "";

    elemento.classList.remove("raov-modal-sucesso", "raov-modal-alerta", "raov-modal-erro", "raov-modal-info");
    elemento.classList.add(`raov-modal-${tipo}`);

    elemento.querySelector("#raov-modal-titulo").textContent = titulo;
    elemento.querySelector("#raov-modal-mensagem").textContent = mensagem;
    elemento.querySelector(".raov-modal-icone").textContent = tipo === "sucesso" ? "✓" : tipo === "info" ? "i" : "!";

    const vooEl = elemento.querySelector(".raov-modal-voo");
    vooEl.hidden = !voo;
    vooEl.textContent = voo ? `✈ ${voo}` : "";

    const detalheEl = elemento.querySelector(".raov-modal-detalhe");
    detalheEl.hidden = !detalhe;
    detalheEl.textContent = detalhe;

    const link = elemento.querySelector(".raov-modal-link");
    link.hidden = !abrirNewSky;
    
    const botaoSolicitar = elemento.querySelector(".raov-modal-solicitar");
    const botaoOk = elemento.querySelector(".raov-modal-ok");
    
    botaoSolicitar.hidden = !confirmacao;
    botaoSolicitar.disabled = true;
    botaoOk.textContent = confirmacao ? "Cancelar" : "Entendi";
    
    botaoSolicitar.onclick = null;
    
    if (confirmacao && typeof aoConfirmar === "function") {
      botaoSolicitar.disabled = false;
    
      botaoSolicitar.onclick = async () => {
        botaoSolicitar.disabled = true;
    
        try {
          await aoConfirmar();
        } catch (erro) {
          console.error("VOLAR RAOV — solicitação:", erro);
    
          mostrarModal({
            tipo: "erro",
            titulo: "Não foi possível solicitar o RAOV",
            mensagem: erro.message || "Ocorreu um erro durante a solicitação."
          });
        }
      };
    }
    
    focoAnterior = document.activeElement;
    overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    elemento.hidden = false;
    elemento.querySelector(".raov-modal-ok").focus();
  }

  // VOLAR RAOV — exibe animação durante o processamento
  function mostrarCarregandoModal() {
    const elemento = obterModal();

    elemento.querySelector("#raov-modal-titulo").textContent =
      "Solicitando RAOV";

    elemento.querySelector(".raov-modal-icone").textContent = "✈";

    elemento.querySelector(".raov-modal-conteudo").hidden = true;
    elemento.querySelector(".raov-modal-loading").hidden = false;

    elemento.querySelector(".raov-modal-acoes").style.display = "none";
  }
  
  async function buscarLogNewSky(flightId) {
    if (!ID_VALIDO.test(flightId)) {
      throw new ErroRAOV("ID_INVALIDO", "O identificador deste voo é inválido.");
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
      throw new ErroRAOV(
        "CORS_OU_REDE",
        "Não foi possível consultar o NewSky pelo site da Volar.",
      );
    }

    const dados = await resposta.json().catch(() => null);

    if (resposta.status === 401 || dados?.statusCode === 401 || dados?.error === "Unauthorized") {
      throw new ErroRAOV(
        "LOGIN_NECESSARIO",
        "Você precisa estar conectado à sua conta do NewSky para consultar o log deste voo. Faça login e tente novamente."
      );
    }

    if (resposta.status === 403 || dados?.statusCode === 403) {
      throw new ErroRAOV("SEM_PERMISSAO", "Sua conta do NewSky não tem permissão para consultar este voo.");
    }

    if (!resposta.ok) {
      throw new ErroRAOV("HTTP", `Não foi possível consultar este voo no NewSky (HTTP ${resposta.status}).`);
    }

    if (!dados || dados._id !== flightId || !Array.isArray(dados.log)) {
      throw new ErroRAOV("SEM_LOG", "O NewSky respondeu, mas não disponibilizou o log operacional completo deste voo.");
    }

    return dados;
  }

  document.addEventListener("click", async (evento) => {
    if (!(evento.target instanceof Element)) return;
    const botao = evento.target.closest("button.btn-gerar-raov[data-raov-flight-id]");
    if (!botao || botao.disabled) return;

    evento.preventDefault();

    // VOLAR RAOV — solicita confirmação antes de consultar o voo.
    if (botao.dataset.raovConfirmado !== "sim") {
      mostrarModal({
        tipo: "info",
        titulo: "Solicitar RAOV",
        mensagem:
          "Deseja solicitar o Relatório de Análise de Operação " +
          "de Voo (RAOV) para este voo?",
        detalhe:
          "Sua identificação e seu vínculo com a VVX ou VAX " +
          "serão verificados no NewSky.",
        confirmacao: true,

        aoConfirmar: () => {
          mostrarCarregandoModal();
          botao.dataset.raovConfirmado = "sim";
          botao.click();
        }

      });
      return;
    }

    delete botao.dataset.raovConfirmado;
   
    const textoAnterior = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Consultando...";

    try {
      const dadosVoo = await buscarLogNewSky(botao.dataset.raovFlightId);

      if (!window.VolarRAOVIA || typeof window.VolarRAOVIA.gerar !== "function") {
        throw new ErroRAOV("MODULO_IA", "O módulo compartilhado RAOV-IA não foi carregado.");
      }

      const retorno = await window.VolarRAOVIA.gerar(dadosVoo);

      if (retorno.status === "aguardando_integracao") {
        const voo = `${dadosVoo.airline?.icao || ""}${dadosVoo.flightNumber || ""}`;
        mostrarModal({
          tipo: "sucesso",
          titulo: "Log carregado com sucesso",
          voo,
          mensagem: `${dadosVoo.log.length} registros operacionais recuperados do NewSky.`,
          detalhe: "A integração com a IA ainda não está ativa. Nenhum PDF foi gerado."
        });
      }
    } catch (erro) {
      console.error("VOLAR RAOV:", erro.codigo || erro.name || "ERRO", erro.message);
      const login = erro.codigo === "LOGIN_NECESSARIO";
      const indisponivel = erro.codigo === "CORS_OU_REDE";
      mostrarModal({
        tipo: login ? "alerta" : "erro",
        titulo: login ? "Login no NewSky necessário" : "Não foi possível consultar o voo",
        mensagem: erro.message || "Não foi possível consultar o voo.",
        detalhe: indisponivel
          ? "Verifique sua conexão. O navegador também pode estar bloqueando o acesso entre os sites; nesse caso, não é possível determinar se a sessão está autenticada."
          : "",
        abrirNewSky: login
      });
    } finally {
      botao.textContent = textoAnterior;
      botao.disabled = false;
    }
  });
})();
