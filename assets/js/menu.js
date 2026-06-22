document.addEventListener("DOMContentLoaded", () => {

    const menuContainer = document.getElementById("menu-container");

    if (!menuContainer) return;

    menuContainer.innerHTML = `
<nav class="menu">

    <a href="index.html" data-menu="home">Home</a>

    <div class="menu-dropdown">
        <a href="#" class="menu-dropdown-toggle" data-menu="volar">
            Volar <i class="fas fa-chevron-down"></i>
        </a>

        <div class="menu-dropdown-content">
            <a href="index.html#sobre-nos">Sobre Nós</a>
            <a href="index.html#simuladores">Plataformas</a>
            <a href="news.html">Volar News</a>
        </div>
    </div>

    <div class="menu-dropdown">
        <a href="#" class="menu-dropdown-toggle" data-menu="operacoes">
            Operações <i class="fas fa-chevron-down"></i>
        </a>

        <div class="menu-dropdown-content">
            <a href="rotas.html">Rotas Oficiais</a>
            <a href="ferramentas.html">Ferramentas Recomendadas</a>
            <a href="index.html#mapa">Mapa Online</a>
            <a href="index.html#voos-reais">Voos em Tempo Real</a>
            <a href="index.html#voos-recentes">Voos Recentes</a>
        </div>
    </div>

    <div class="menu-dropdown">
        <a href="#" class="menu-dropdown-toggle" data-menu="divisoes">
            Divisões <i class="fas fa-chevron-down"></i>
        </a>
    
        <div class="menu-dropdown-content">
            <a href="cargo.html">Volar Cargo</a>
        </div>
    </div>
    
    <div class="menu-dropdown">
        <a href="#" class="menu-dropdown-toggle" data-menu="frota">
            Frota <i class="fas fa-chevron-down"></i>
        </a>
    
        <div class="menu-dropdown-content">
            <a href="frota.html">Frota Volar</a>
        </div>
    </div>

    <div class="menu-dropdown">
        <a href="#" class="menu-dropdown-toggle" data-menu="comunidade">
            Comunidade <i class="fas fa-chevron-down"></i>
        </a>

        <div class="menu-dropdown-content">
            <a href="index.html#social">Redes Sociais</a>
            <a href="index.html#parceiros">Parceiros</a>
            <a href="index.html#links">Links Úteis</a>
        </div>
    </div>

    <a href="https://newsky.app/pilot/login"
       target="_blank"
       rel="noopener noreferrer"
       class="btn-va">
       Crew Room
    </a>

</nav>
`;

let paginaAtual = window.location.pathname.split("/").pop() || "index.html";

if (!paginaAtual.includes(".")) {
    paginaAtual = `${paginaAtual}.html`;
}

const hashAtual = window.location.hash;

    const mapaMenuAtivo = {
        "index.html": "home",
        "news.html": "volar",
        "rotas.html": "operacoes",
        "ferramentas.html": "operacoes",
        "cargo.html": "divisoes",
        "frota.html": "frota",
        "privacy.html": "volar",
        "terms.html": "volar"
    };

    let menuAtivo = mapaMenuAtivo[paginaAtual];

    if (paginaAtual === "index.html" && hashAtual) {
        if (
            hashAtual === "#mapa" ||
            hashAtual === "#voos-reais" ||
            hashAtual === "#voos-recentes"
        ) {
            menuAtivo = "operacoes";
        }

        if (
            hashAtual === "#social" ||
            hashAtual === "#parceiros" ||
            hashAtual === "#links"
        ) {
            menuAtivo = "comunidade";
        }

        if (
            hashAtual === "#sobre-nos" ||
            hashAtual === "#simuladores"
        ) {
            menuAtivo = "volar";
        }
    }

    if (menuAtivo) {
        const itemAtivo = document.querySelector(`[data-menu="${menuAtivo}"]`);
        if (itemAtivo) itemAtivo.classList.add("active");
    }

    document.querySelectorAll('.menu a[href*="#"]').forEach(link => {
        link.addEventListener("click", function (event) {
            const href = this.getAttribute("href");

            if (!href.includes("#")) return;

            const [pagina, idSecao] = href.split("#");
        
        let paginaAtualClique = window.location.pathname.split("/").pop() || "index.html";
        
        if (!paginaAtualClique.includes(".")) {
            paginaAtualClique = `${paginaAtualClique}.html`;
        }
        
        if (pagina && pagina !== paginaAtualClique) return;

            const alvo = document.getElementById(idSecao);

            if (!alvo) return;

            event.preventDefault();

            const alturaMenu = document.querySelector(".navbar").offsetHeight;
            const posicaoAlvo = alvo.getBoundingClientRect().top + window.scrollY - alturaMenu;

            window.scrollTo({
                top: posicaoAlvo,
                behavior: "smooth"
            });

            document.querySelectorAll(".menu .active").forEach(item => {
                item.classList.remove("active");
            });
            
            let novoMenuAtivo = "home";
            
            if (
                idSecao === "mapa" ||
                idSecao === "voos-reais" ||
                idSecao === "voos-recentes"
            ) {
                novoMenuAtivo = "operacoes";
            }
            
            if (
                idSecao === "social" ||
                idSecao === "parceiros" ||
                idSecao === "links"
            ) {
                novoMenuAtivo = "comunidade";
            }
            
            if (
                idSecao === "sobre-nos" ||
                idSecao === "simuladores"
            ) {
                novoMenuAtivo = "volar";
            }
            
            const novoItemAtivo = document.querySelector(`[data-menu="${novoMenuAtivo}"]`);
            if (novoItemAtivo) novoItemAtivo.classList.add("active");
            
            history.replaceState(null, "", `#${idSecao}`);
        });
    });

    function ajustarAncoraAoCarregar() {
        if (!window.location.hash) return;

        const idSecao = window.location.hash.replace("#", "");
        const alvo = document.getElementById(idSecao);

        if (!alvo) return;

        setTimeout(() => {
            const alturaMenu = document.querySelector(".navbar").offsetHeight;
            const posicaoAlvo = alvo.getBoundingClientRect().top + window.scrollY - alturaMenu;

            window.scrollTo({
                top: posicaoAlvo,
                behavior: "smooth"
            });
        }, 700);
    }

    ajustarAncoraAoCarregar();
});
