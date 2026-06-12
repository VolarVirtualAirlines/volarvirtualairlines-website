document.addEventListener("DOMContentLoaded", async () => {
    const tabela = document.getElementById("corpo-tabela-rotas");
    const filtroOrigem = document.getElementById("filtro-origem");
    const filtroDestino = document.getElementById("filtro-destino");
    const filtroTipo = document.getElementById("filtro-tipo");

    let rotas = [];

    const resposta = await fetch("assets/data/routes.csv");
    const texto = await resposta.text();

    const linhas = texto
        .split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));

    const cabecalho = linhas[0].split(",");
    const dados = linhas.slice(1);

    rotas = dados.map(linha => {
        const valores = linha.split(",");
        const rota = {};
        cabecalho.forEach((coluna, i) => {
            rota[coluna] = valores[i];
        });
        return rota;
    });

    function renderizarRotas() {
        const origem = filtroOrigem.value.toLowerCase();
        const destino = filtroDestino.value.toLowerCase();
        const tipo = filtroTipo.value;

        const filtradas = rotas.filter(rota => {
            const passaOrigem = !origem || rota.dep.toLowerCase().includes(origem);
            const passaDestino = !destino || rota.arr.toLowerCase().includes(destino);
            const passaTipo = tipo === "todos" || rota.type === tipo;

            return passaOrigem && passaDestino && passaTipo && rota.active === "true";
        });

        tabela.innerHTML = "";

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

    renderizarRotas();
});
