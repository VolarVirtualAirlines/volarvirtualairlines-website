document.addEventListener("DOMContentLoaded", async () => {
    const tabela = document.getElementById("corpo-tabela-rotas");
    const busca = document.getElementById("busca-rotas");
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
        const termo = busca.value.toLowerCase();
        const tipo = filtroTipo.value;

        const filtradas = rotas.filter(rota => {
            const textoRota = `${rota.number} ${rota.dep} ${rota.arr} ${rota.type}`.toLowerCase();
            const passaBusca = textoRota.includes(termo);
            const passaTipo = tipo === "todos" || rota.type === tipo;
            return passaBusca && passaTipo && rota.active === "true";
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

    busca.addEventListener("input", renderizarRotas);
    filtroTipo.addEventListener("change", renderizarRotas);

    renderizarRotas();
});
