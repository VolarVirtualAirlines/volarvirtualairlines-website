document.addEventListener("DOMContentLoaded", () => {

    let pilotos = [];

    /* =====================================
       ELEMENTOS DA PÁGINA
    ===================================== */

    const gridPilotos = document.getElementById("grid-pilotos");
    const semResultados = document.getElementById("pilotos-sem-resultados");

    const totalPilotos = document.getElementById("total-pilotos");
    const totalVoos = document.getElementById("total-voos-pilotos");
    const totalHoras = document.getElementById("total-horas-pilotos");
    const totalFiltrados = document.getElementById("total-pilotos-filtrados");

    const filtroPiloto = document.getElementById("filtro-piloto");
    const filtroBase = document.getElementById("filtro-home-icao");
    const filtroRede = document.getElementById("filtro-rede");
    const ordenarPilotos = document.getElementById("ordenar-pilotos");

    const btnFiltrar = document.getElementById("btn-filtrar-pilotos");
    const btnLimpar = document.getElementById("btn-limpar-pilotos");


    /* =====================================
       FUNÇÕES AUXILIARES
    ===================================== */

    function normalizarTexto(texto) {

        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function obterHorasNumericas(horas) {

        return Number(
            String(horas || "").replace(/[^\d]/g, "")
        ) || 0;
    }

    function converterData(data) {

        const partes = String(data).split("/");

        if (partes.length !== 3) {
            return new Date(0);
        }

        const [dia, mes, ano] = partes.map(Number);

        return new Date(ano, mes - 1, dia);
    }

    function obterClasseStatus(status) {

        return normalizarTexto(status) === "ativo"
            ? "piloto-badge-ativo"
            : "piloto-badge-inativo";
    }

function obterIniciais(nome) {

    return String(nome || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join("");
}


function formatarDataNewSky(data) {

    if (!data) {
        return "—";
    }

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "—";
    }

    return dataConvertida.toLocaleDateString("pt-BR");
}


function formatarTempoNewSky(minutos) {

    const totalMinutos = Number(minutos) || 0;

    const horas = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    if (minutosRestantes === 0) {
        return `${horas}h`;
    }

    return `${horas}h ${String(minutosRestantes).padStart(2, "0")}min`;
}


function obterRedePiloto(integracoes) {

    const possuiIvao = Boolean(integracoes?.ivao);
    const possuiVatsim = Boolean(integracoes?.vatsim);

    if (possuiIvao && possuiVatsim) {
        return "IVAO / VATSIM";
    }

    if (possuiIvao) {
        return "IVAO";
    }

    if (possuiVatsim) {
        return "VATSIM";
    }

    return "—";
}


function mapearPilotoNewSky(piloto) {

    const nome = piloto.fullname || "Piloto VOLAR";

    const estatisticas = piloto.airlineStats || {};

    const integracoes = piloto.integrations || {};

    return {
        id: piloto._id || "",

        nome,

        iniciais: obterIniciais(nome),

        pais: piloto.countryCode || "—",

        base: piloto.homeIcao || "—",

        voos: Number(estatisticas.flights) || 0,

        horas: formatarTempoNewSky(
            estatisticas.time
        ),

        minutosVoados: Number(
            estatisticas.time
        ) || 0,

        score: Number(
            estatisticas.rating
        ) || 0,

        ivao: integracoes.ivao || "—",

        vatsim: integracoes.vatsim || "—",

        discord: integracoes.discord || "—",

        rede: obterRedePiloto(integracoes),

        membroDesde: formatarDataNewSky(
            piloto.createdAt
        ),

        ultimoVoo: formatarDataNewSky(
            estatisticas.lastFlightDate
        ),

        distancia: Number(
            estatisticas.dist
        ) || 0,

        schedules: Number(
            estatisticas.schedules
        ) || 0,

        charters: Number(
            estatisticas.charters
        ) || 0,

        status: piloto.status?.active
            ? "Ativo"
            : "Inativo",

        avatar: piloto.avatar || ""
    };
}
    
/* =====================================
   CARREGAMENTO DOS PILOTOS
 ===================================== */

async function carregarPilotos() {

    try {

        const response = await fetch("/dados_pilotos", {
            cache: "no-store"
        });

        const resultado = await response.json();

        console.log("Retorno da Function:", resultado);

        if (resultado.error) {
            throw new Error(
                resultado.message || "Erro ao consultar pilotos."
            );
        }

        const pilotosRecebidos = Array.isArray(resultado.dados)
            ? resultado.dados
            : [];
        
        pilotos = pilotosRecebidos.map(mapearPilotoNewSky);

        console.log("Pilotos recebidos:");
        console.table(pilotos);

        aplicarFiltros();

    } catch (error) {

        console.error("Erro ao carregar pilotos:", error);

        pilotos = [];

        atualizarEstatisticas(pilotos);
        renderizarPilotos(pilotos);
    }
}

    /* =====================================
       CRIAÇÃO DOS CARDS
    ===================================== */

    function criarCardPiloto(piloto) {

        const classeStatus = obterClasseStatus(piloto.status);
        
        const possuiIVAO =
            piloto.ivao &&
            piloto.ivao !== "—";
        
        const possuiVATSIM =
            piloto.vatsim &&
            piloto.vatsim !== "—";

        const urlAvatar = piloto.avatar
            ? `https://newsky.app/api/pilot/avatar/${piloto.avatar}`
            : "";
        
        return `
            <article class="piloto-card">

                <div class="piloto-avatar-container">
                
                    ${urlAvatar ? `
                        <img
                            src="${urlAvatar}"
                            alt="Avatar de ${piloto.nome}"
                            class="piloto-avatar"
                            loading="lazy"
                            onerror="
                                this.hidden = true;
                                this.nextElementSibling.hidden = false;
                            "
                        >
                
                        <div
                            class="piloto-avatar-placeholder"
                            hidden
                        >
                            ${piloto.iniciais}
                        </div>
                    ` : `
                        <div class="piloto-avatar-placeholder">
                            ${piloto.iniciais}
                        </div>
                    `}
                
                </div>

                <h3 class="piloto-nome">
                    ${piloto.nome}
                </h3>

                <div class="piloto-localizacao">
                    <i class="fas fa-location-dot"></i>

                    <span>
                        ${piloto.pais} • ${piloto.base}
                    </span>
                </div>

                <div class="piloto-card-stats">

                    <div class="piloto-card-stat">
                        <strong>
                            ${piloto.voos.toLocaleString("pt-BR")}
                        </strong>

                        <span>Voos</span>
                    </div>

                    <div class="piloto-card-stat">
                        <strong>
                            ${piloto.horas}
                        </strong>

                        <span>Horas</span>
                    </div>

                    <div class="piloto-card-stat">
                        <strong>
                            ${piloto.score.toFixed(2)}
                        </strong>

                        <span>Score</span>
                    </div>

                </div>

                <div class="piloto-card-footer">

                    ${possuiIVAO ? `
                        <div class="piloto-card-info">
                            <span>IVAO ID</span>
                            <strong>${piloto.ivao}</strong>
                        </div>
                    ` : ""}
                    
                    ${possuiVATSIM ? `
                        <div class="piloto-card-info">
                            <span>VATSIM ID</span>
                            <strong>${piloto.vatsim}</strong>
                        </div>
                    ` : ""}

                    <div class="piloto-card-info">
                        <span>Membro desde</span>
                        <strong>${piloto.membroDesde}</strong>
                    </div>

                    <div class="piloto-card-info">
                        <span>Status</span>

                        <span class="piloto-badge ${classeStatus}">
                            <i class="fas fa-circle"></i>
                            ${piloto.status}
                        </span>
                    </div>

                </div>

            </article>
        `;
    }


    /* =====================================
       ESTATÍSTICAS
    ===================================== */

    function atualizarEstatisticas(lista) {

        if (totalPilotos) {
            totalPilotos.textContent =
                pilotos.length.toLocaleString("pt-BR");
        }

        if (totalVoos) {

            const somaVoos = lista.reduce(
                (total, piloto) => total + piloto.voos,
                0
            );

            totalVoos.textContent =
                somaVoos.toLocaleString("pt-BR");
        }

        if (totalHoras) {

const somaMinutos = lista.reduce(
    (total, piloto) =>
        total + piloto.minutosVoados,
    0
);

        const horasCompletas = Math.floor(
            somaMinutos / 60
        );
        
        const minutosRestantes =
            somaMinutos % 60;
        
        totalHoras.textContent =
            minutosRestantes > 0
                ? `${horasCompletas.toLocaleString("pt-BR")}h ${String(minutosRestantes).padStart(2, "0")}min`
                : `${horasCompletas.toLocaleString("pt-BR")}h`;
        }

        if (totalFiltrados) {
            totalFiltrados.textContent =
                lista.length.toLocaleString("pt-BR");
        }
    }

    /* =====================================
       RENDERIZAÇÃO
    ===================================== */

    function renderizarPilotos(lista) {

        if (!gridPilotos) {
            return;
        }

        if (lista.length === 0) {

            gridPilotos.innerHTML = "";

            if (semResultados) {
                semResultados.hidden = false;
            }

        } else {

            if (semResultados) {
                semResultados.hidden = true;
            }

            gridPilotos.innerHTML = lista
                .map(criarCardPiloto)
                .join("");
        }

        atualizarEstatisticas(lista);
    }


    /* =====================================
       ORDENAÇÃO
    ===================================== */

    function ordenarLista(lista, criterio) {

        const listaOrdenada = [...lista];

        switch (criterio) {

            case "voos":
                listaOrdenada.sort(
                    (a, b) => b.voos - a.voos
                );
                break;

            case "horas":
                listaOrdenada.sort(
                    (a, b) =>
                        b.minutosVoados -
                        a.minutosVoados
                );
                break;

            case "rating":
                listaOrdenada.sort(
                    (a, b) => b.score - a.score
                );
                break;

            case "recente":
                listaOrdenada.sort(
                    (a, b) =>
                        converterData(b.membroDesde) -
                        converterData(a.membroDesde)
                );
                break;

            case "nome":
            default:
                listaOrdenada.sort(
                    (a, b) =>
                        a.nome.localeCompare(
                            b.nome,
                            "pt-BR",
                            { sensitivity: "base" }
                        )
                );
                break;
        }

        return listaOrdenada;
    }


    /* =====================================
       FILTROS
    ===================================== */

    function aplicarFiltros() {

        const nomeBuscado = normalizarTexto(
            filtroPiloto?.value
        );

        const baseBuscada = normalizarTexto(
            filtroBase?.value
        );

        const redeSelecionada =
            filtroRede?.value || "todas";

        const criterioOrdenacao =
            ordenarPilotos?.value || "nome";

        let listaFiltrada = pilotos.filter((piloto) => {

            const correspondeNome =
                !nomeBuscado ||
                normalizarTexto(piloto.nome)
                    .includes(nomeBuscado);

            const correspondeBase =
                !baseBuscada ||
                normalizarTexto(piloto.base)
                    .includes(baseBuscada);

            const correspondeRede =
                redeSelecionada === "todas" ||
                normalizarTexto(piloto.rede)
                    .includes(normalizarTexto(redeSelecionada));

            return (
                correspondeNome &&
                correspondeBase &&
                correspondeRede
            );
        });

        listaFiltrada = ordenarLista(
            listaFiltrada,
            criterioOrdenacao
        );

        renderizarPilotos(listaFiltrada);
    }

    function limparFiltros() {

        if (filtroPiloto) {
            filtroPiloto.value = "";
        }

        if (filtroBase) {
            filtroBase.value = "";
        }

        if (filtroRede) {
            filtroRede.value = "todas";
        }

        if (ordenarPilotos) {
            ordenarPilotos.value = "nome";
        }

        aplicarFiltros();
    }


    /* =====================================
       EVENTOS
    ===================================== */

    btnFiltrar?.addEventListener(
        "click",
        aplicarFiltros
    );

    btnLimpar?.addEventListener(
        "click",
        limparFiltros
    );

    ordenarPilotos?.addEventListener(
        "change",
        aplicarFiltros
    );

    filtroRede?.addEventListener(
        "change",
        aplicarFiltros
    );

    filtroPiloto?.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {
                aplicarFiltros();
            }
        }
    );

    filtroBase?.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {
                aplicarFiltros();
            }
        }
    );

    filtroBase?.addEventListener(
        "input",
        () => {

            filtroBase.value =
                filtroBase.value.toUpperCase();
        }
    );


    /* =====================================
       INICIALIZAÇÃO
    ===================================== */

    carregarPilotos();

});
