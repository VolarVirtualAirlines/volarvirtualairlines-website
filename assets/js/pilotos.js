document.addEventListener("DOMContentLoaded", () => {

    const pilotos = [
        {
            nome: "Marcos Bastos",
            identificacao: "VVX001",
            pais: "Brasil",
            base: "SBGR",
            voos: 1284,
            horas: "2615h",
            score: "9.84",
            ivao: "123456",
            cargo: "Comandante",
            membroDesde: "15/01/2026",
            status: "Ativo",
            iniciais: "MB"
        },
        {
            nome: "Dalyson Silva",
            identificacao: "VVX002",
            pais: "Brasil",
            base: "SBBR",
            voos: 342,
            horas: "718h",
            score: "9.52",
            ivao: "654321",
            cargo: "Comandante",
            membroDesde: "26/06/2026",
            status: "Ativo",
            iniciais: "DS"
        },
        {
            nome: "Carlos García",
            identificacao: "VVX003",
            pais: "Espanha",
            base: "LEMD",
            voos: 198,
            horas: "426h",
            score: "9.21",
            ivao: "789456",
            cargo: "Primeiro Oficial",
            membroDesde: "04/04/2026",
            status: "Ativo",
            iniciais: "CG"
        }
    ];

    const gridPilotos = document.getElementById("grid-pilotos");

    const totalPilotos = document.getElementById("total-pilotos");
    const totalVoos = document.getElementById("total-voos-pilotos");
    const totalHoras = document.getElementById("total-horas-pilotos");
    const totalFiltrados = document.getElementById("total-pilotos-filtrados");

    function criarCardPiloto(piloto) {

        return `
            <article class="piloto-card">

                <div class="piloto-avatar-container">
                    <div class="piloto-avatar-placeholder">
                        ${piloto.iniciais}
                    </div>
                </div>

                <h3 class="piloto-nome">
                    ${piloto.nome}
                </h3>

                <div class="piloto-identificacao">
                    ${piloto.identificacao}
                </div>

                <div class="piloto-localizacao">
                    <i class="fas fa-location-dot"></i>
                    <span>${piloto.pais} • ${piloto.base}</span>
                </div>

                <div class="piloto-card-stats">

                    <div class="piloto-card-stat">
                        <strong>${piloto.voos.toLocaleString("pt-BR")}</strong>
                        <span>Voos</span>
                    </div>

                    <div class="piloto-card-stat">
                        <strong>${piloto.horas}</strong>
                        <span>Horas</span>
                    </div>

                    <div class="piloto-card-stat">
                        <strong>${piloto.score}</strong>
                        <span>Score</span>
                    </div>

                </div>

                <div class="piloto-card-footer">

                    <div class="piloto-card-info">
                        <span>IVAO ID</span>
                        <strong>${piloto.ivao}</strong>
                    </div>

                    <div class="piloto-card-info">
                        <span>Função</span>
                        <strong>${piloto.cargo}</strong>
                    </div>

                    <div class="piloto-card-info">
                        <span>Membro desde</span>
                        <strong>${piloto.membroDesde}</strong>
                    </div>

                    <div class="piloto-card-info">
                        <span>Status</span>

                        <span class="piloto-badge piloto-badge-ativo">
                            <i class="fas fa-circle"></i>
                            ${piloto.status}
                        </span>
                    </div>

                </div>

            </article>
        `;
    }

    function renderizarPilotos(lista) {

        if (!gridPilotos) {
            return;
        }

        gridPilotos.innerHTML = lista
            .map(criarCardPiloto)
            .join("");

        if (totalPilotos) {
            totalPilotos.textContent = pilotos.length;
        }

        if (totalVoos) {
            const somaVoos = pilotos.reduce(
                (total, piloto) => total + piloto.voos,
                0
            );

            totalVoos.textContent = somaVoos.toLocaleString("pt-BR");
        }

        if (totalHoras) {
            const somaHoras = pilotos.reduce((total, piloto) => {

                const horasNumericas = Number(
                    piloto.horas.replace(/[^\d]/g, "")
                );

                return total + horasNumericas;

            }, 0);

            totalHoras.textContent =
                `${somaHoras.toLocaleString("pt-BR")}h`;
        }

        if (totalFiltrados) {
            totalFiltrados.textContent = lista.length;
        }
    }

    renderizarPilotos(pilotos);

});
