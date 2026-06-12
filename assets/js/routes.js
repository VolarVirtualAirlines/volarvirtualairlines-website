document.addEventListener("DOMContentLoaded", async () => {
    const tabela = document.getElementById("corpo-tabela-rotas");
    const filtroOrigem = document.getElementById("filtro-origem");
    const filtroDestino = document.getElementById("filtro-destino");
    const filtroTipo = document.getElementById("filtro-tipo");

    let rotas = [];

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

        renderizarRotas();

    } catch (erro) {
        console.error("Erro ao carregar routes.csv:", erro);
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

function renderizarRotas() {
    const origem = filtroOrigem.value.toLowerCase().trim();
    const destino = filtroDestino.value.toLowerCase().trim();
    const tipo = filtroTipo.value.toLowerCase();

    const filtradas = rotas.filter(rota => {
        const dep = String(rota.dep || "").toLowerCase();
        const arr = String(rota.arr || "").toLowerCase();
        const tipoRota = String(rota.type || "").toLowerCase();

        const passaOrigem = !origem || dep.includes(origem);
        const passaDestino = !destino || arr.includes(destino);
        const passaTipo = tipo === "todos" || tipoRota === tipo;

        return passaOrigem && passaDestino && passaTipo && rotaEstaAtiva(rota);
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
                    <td>VVX${rota.number}</td>
                    <td>${rota.dep}</td>
                    <td>${rota.arr}</td>
                    <td>${rota.type === "cargo" ? "📦 Cargo" : "👥 Passageiros"}</td>
                    <td>${rota.duration} min</td>
                    <td>${rota.airframes || "Todos"}</td>
                </tr>
            `;
        });
    }

    filtroOrigem.addEventListener("input", renderizarRotas);
    filtroDestino.addEventListener("input", renderizarRotas);
    filtroTipo.addEventListener("change", renderizarRotas);
});
