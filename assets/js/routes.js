document.addEventListener("DOMContentLoaded", async () => {
    const tabela = document.getElementById("corpo-tabela-rotas");
    const filtroOrigem = document.getElementById("filtro-origem");
    const filtroDestino = document.getElementById("filtro-destino");
    const filtroTipo = document.getElementById("filtro-tipo");
    const filtroAeronave = document.getElementById("filtro-aeronave");
    const btnFiltrar = document.getElementById("btn-filtrar-rotas");
    const btnLimpar = document.getElementById("btn-limpar-rotas");

    const loadingRotas = document.getElementById("loading-rotas");
    const loadingBarra = document.getElementById("loading-barra");
    const loadingPercentual = document.getElementById("loading-percentual");
    const conteudoRotas = document.getElementById("conteudo-rotas");

    let rotas = [];
    let progresso = 0;

    const intervaloLoading = setInterval(() => {
        if (progresso < 90) {
            progresso += Math.floor(Math.random() * 8) + 3;
            if (progresso > 90) progresso = 90;

            loadingBarra.style.width = `${progresso}%`;
            loadingPercentual.textContent = `${progresso}%`;
        }
    }, 180);

    function finalizarLoading() {
        progresso = 100;
        loadingBarra.style.width = "100%";
        loadingPercentual.textContent = "100%";

        setTimeout(() => {
            loadingRotas.style.display = "none";
            conteudoRotas.classList.remove("conteudo-rotas-oculto");
        }, 1200);
    }

    try {
        const resposta = await fetch("assets/data/routes.csv");
        const texto = await resposta.text();

        const linhas = texto
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && !l.startsWith("#"));

        const cabecalho = linhas[0].split(",").map(c => c.trim());
        const dados = linhas.slice(1);

        rotas = dados.map(linha => {
            const valores = linha.split(",");
            const rota = {};

            cabecalho.forEach((coluna, i) => {
                rota[coluna] = valores[i] ? valores[i].trim() : "";
            });

            return rota;
        });

        popularFiltroAeronaves();
        renderizarRotas();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        clearInterval(intervaloLoading);
        finalizarLoading();

    } catch (erro) {
        clearInterval(intervaloLoading);

        console.error("Erro ao carregar routes.csv:", erro);

        loadingRotas.style.display = "none";
        conteudoRotas.classList.remove("conteudo-rotas-oculto");

        tabela.innerHTML = `
            <tr>
                <td colspan="6">Não foi possível carregar as rotas oficiais.</td>
            </tr>
        `;
    }

    function rotaEstaAtiva(rota) {
        const ativo = String(rota.active || "").toLowerCase();
        return ativo === "true" || ativo === "1" || ativo === "yes" || ativo === "active";
    }

    function popularFiltroAeronaves() {
        const aeronaves = [...new Set(
            rotas
                .filter(rotaEstaAtiva)
                .map(rota => String(rota.airframes || "").trim())
                .filter(aeronave => aeronave)
        )].sort();
    
        filtroAeronave.innerHTML = `
            <option value="todas">Todas as Aeronaves</option>
        `;
    
        aeronaves.forEach(aeronave => {
            filtroAeronave.innerHTML += `
                <option value="${aeronave.toLowerCase()}">${aeronave}</option>
            `;
        });
    }

    function formatarDuracao(minutos) {
        const totalMinutos = parseInt(minutos, 10);
    
        if (isNaN(totalMinutos)) {
            return "N/D";
        }
    
        const horas = Math.floor(totalMinutos / 60);
        const mins = totalMinutos % 60;
    
        return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
    
    function renderizarRotas() {
        const origem = filtroOrigem.value.toLowerCase().trim();
        const destino = filtroDestino.value.toLowerCase().trim();
        const tipo = filtroTipo.value.toLowerCase();
        const aeronave = filtroAeronave.value.toLowerCase();

        const filtradas = rotas.filter(rota => {
            const dep = String(rota.dep || "").toLowerCase();
            const arr = String(rota.arr || "").toLowerCase();
            const tipoRota = String(rota.type || "").toLowerCase();
            const aeronaveRota = String(rota.airframes || "").toLowerCase();

            const passaOrigem = !origem || dep.includes(origem);
            const passaDestino = !destino || arr.includes(destino);
            const passaTipo = tipo === "todos" || tipoRota === tipo;
            const passaAeronave = aeronave === "todas" || aeronaveRota === aeronave;

            return (
                passaOrigem &&
                passaDestino &&
                passaTipo &&
                passaAeronave &&
                rotaEstaAtiva(rota)
);
        });

        const totalRotas = rotas.filter(rotaEstaAtiva).length;

        const totalPax = rotas.filter(r =>
            rotaEstaAtiva(r) &&
            String(r.type || "").toLowerCase() === "pax"
        ).length;

        const totalCargo = rotas.filter(r =>
            rotaEstaAtiva(r) &&
            String(r.type || "").toLowerCase() === "cargo"
        ).length;

        document.getElementById("total-rotas").textContent = totalRotas;
        document.getElementById("total-pax").textContent = totalPax;
        document.getElementById("total-cargo").textContent = totalCargo;
        document.getElementById("total-filtrado").textContent = filtradas.length;

        tabela.innerHTML = "";

        if (filtradas.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="6">Nenhuma rota encontrada para os filtros selecionados.</td>
                </tr>
            `;
            return;
        }

        filtradas.forEach(rota => {
            tabela.innerHTML += `
                <tr>
                    <td class="coluna-voo">
                        <span class="flight-number">VVX${rota.number}</span>
                    </td>
                    <td>🛫 <span style="color: #4ade80;">${rota.dep}</span></td>
                    <td>🛬 <span style="color: #f97316;">${rota.arr}</span></td>
                    <td>${rota.type === "cargo" ? "📦 Cargo" : "👥 Passageiros"}</td>
                    <td>${formatarDuracao(rota.duration)}</td>
                    <td>${rota.airframes || "Todos"}</td>
                </tr>
            `;
        });
    }

    btnFiltrar.addEventListener("click", renderizarRotas);

    btnLimpar.addEventListener("click", () => {
        filtroOrigem.value = "";
        filtroDestino.value = "";
        filtroTipo.value = "todos";
        filtroAeronave.value = "todas";
        renderizarRotas();
    });

    filtroOrigem.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            renderizarRotas();
        }
    });

    filtroDestino.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            renderizarRotas();
        }
    });

    filtroTipo.addEventListener("change", renderizarRotas);
    filtroAeronave.addEventListener("change", renderizarRotas);
});
