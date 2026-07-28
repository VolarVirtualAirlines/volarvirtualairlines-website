document.addEventListener("DOMContentLoaded", () => {

    const menuContainer = document.getElementById("menu-container");

    if (!menuContainer) return;

    menuContainer.innerHTML = `
        <button
            type="button"
            class="menu-mobile-toggle"
            id="menu-mobile-toggle"
            aria-label="Abrir menu principal"
            aria-controls="menu-principal"
            aria-expanded="false"
        >
            <span></span>
            <span></span>
            <span></span>
        </button>

        <div class="menu-mobile-overlay" id="menu-mobile-overlay"></div>

        <nav class="menu" id="menu-principal" aria-label="Menu principal">
        
            <div class="menu-mobile-header">
        
                <div class="menu-mobile-brand">
                    <img
                        src="assets/logo_volar_menu_hamburguer.png"
                        alt="Volar Virtual Airlines"
                        class="menu-mobile-logo">
                </div>
        
                <button
                    type="button"
                    class="menu-mobile-close"
                    id="menu-mobile-close"
                    aria-label="Fechar menu principal"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
        
            </div>

            <a href="index.html" data-menu="home">Home</a>

            <div class="menu-dropdown">
                <a
                    href="#"
                    class="menu-dropdown-toggle"
                    data-menu="volar"
                    aria-expanded="false"
                >
                    <span>Volar</span>
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </a>

                <div class="menu-dropdown-content">
                    <a href="index.html#sobre-nos">Sobre Nós</a>
                    <a href="index.html#hubs">Hubs Operacionais</a>
                    <a href="index.html#simuladores">Plataformas</a>
                    <a href="news.html">Volar News</a>
                    <a href="staff.html">Staff</a>
                </div>
            </div>

            <div class="menu-dropdown">
                <a
                    href="#"
                    class="menu-dropdown-toggle"
                    data-menu="operacoes"
                    aria-expanded="false"
                >
                    <span>Operações</span>
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </a>

                <div class="menu-dropdown-content">
                    <a href="rotas.html">Rotas Oficiais</a>
                    <a href="index.html#mapa">Mapa Online</a>
                    <a href="index.html#voos-reais">Voos em Tempo Real</a>
                    <a href="index.html#voos-recentes">Voos Recentes</a>
                    <a href="ferramentas.html">Ferramentas Recomendadas</a>
                </div>
            </div>

            <div class="menu-dropdown">
                <a
                    href="#"
                    class="menu-dropdown-toggle"
                    data-menu="divisoes"
                    aria-expanded="false"
                >
                    <span>Divisões</span>
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </a>

                <div class="menu-dropdown-content">
                    <a href="cargo.html">Volar Cargo</a>
                    <a href="vax.html">Volar Virtual Academy (VAX)</a>
                </div>
            </div>

            <div class="menu-dropdown">
                <a
                    href="#"
                    class="menu-dropdown-toggle"
                    data-menu="frota"
                    aria-expanded="false"
                >
                    <span>Frota</span>
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </a>

                <div class="menu-dropdown-content">
                    <a href="frota.html">Frota Volar</a>
                </div>
            </div>

            <a href="pilotos.html" data-menu="pilotos">Pilotos</a>

            <div class="menu-dropdown">
                <a
                    href="#"
                    class="menu-dropdown-toggle"
                    data-menu="comunidade"
                    aria-expanded="false"
                >
                    <span>Comunidade</span>
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </a>

                <div class="menu-dropdown-content">
                    <a href="index.html#social">Redes Sociais</a>
                    <a href="index.html#parceiros">Parceiros</a>
                    <a href="index.html#links">Links Úteis</a>
                </div>
            </div>

            <a
                href="https://newsky.app/pilot/login"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-va"
            >
                <i class="fas fa-user" aria-hidden="true"></i>
                Crew Room
            </a>

        </nav>
    `;

    const menu = document.getElementById("menu-principal");
    const botaoAbrir = document.getElementById("menu-mobile-toggle");
    const botaoFechar = document.getElementById("menu-mobile-close");
    const overlay = document.getElementById("menu-mobile-overlay");
    const dropdowns = document.querySelectorAll(".menu-dropdown");

    const mobileAtivo = () => window.matchMedia("(max-width: 1100px)").matches;

    function abrirMenu() {
        menu.classList.add("menu-mobile-open");
        overlay.classList.add("active");
        document.body.classList.add("menu-open");

        botaoAbrir.setAttribute("aria-expanded", "true");
        botaoAbrir.setAttribute("aria-label", "Fechar menu principal");
    }

    function fecharDropdowns() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove("mobile-open");

            const toggle = dropdown.querySelector(".menu-dropdown-toggle");

            if (toggle) {
                toggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    function fecharMenu() {
        menu.classList.remove("menu-mobile-open");
        overlay.classList.remove("active");
        document.body.classList.remove("menu-open");

        botaoAbrir.setAttribute("aria-expanded", "false");
        botaoAbrir.setAttribute("aria-label", "Abrir menu principal");

        fecharDropdowns();
    }

    botaoAbrir.addEventListener("click", () => {
        if (menu.classList.contains("menu-mobile-open")) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    botaoFechar.addEventListener("click", fecharMenu);
    overlay.addEventListener("click", fecharMenu);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            fecharMenu();
        }
    });

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector(".menu-dropdown-toggle");

        if (!toggle) return;

        toggle.addEventListener("click", event => {
            event.preventDefault();

            if (!mobileAtivo()) return;

            const estavaAberto = dropdown.classList.contains("mobile-open");

            fecharDropdowns();

            if (!estavaAberto) {
                dropdown.classList.add("mobile-open");
                toggle.setAttribute("aria-expanded", "true");
            }
        });
    });

    window.addEventListener("resize", () => {
        if (!mobileAtivo()) {
            fecharMenu();
        }
    });

    let paginaAtual = window.location.pathname.split("/").pop() || "index.html";

    if (!paginaAtual.includes(".")) {
        paginaAtual = `${paginaAtual}.html`;
    }

    const hashAtual = window.location.hash;

    const mapaMenuAtivo = {
        "index.html": "home",
        "news.html": "volar",
        "staff.html": "volar",
        "rotas.html": "operacoes",
        "ferramentas.html": "operacoes",
        "cargo.html": "divisoes",
        "vax.html": "divisoes",
        "frota.html": "frota",
        "pilotos.html": "pilotos",
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
            hashAtual === "#hubs" ||
            hashAtual === "#simuladores"
        ) {
            menuAtivo = "volar";
        }
    }

    function destacarMenu(nomeMenu) {
        document.querySelectorAll(".menu .active").forEach(item => {
            item.classList.remove("active");
        });

        const itemAtivo = document.querySelector(
            `[data-menu="${nomeMenu}"]`
        );

        if (itemAtivo) {
            itemAtivo.classList.add("active");
        }
    }

    if (menuAtivo) {
        destacarMenu(menuAtivo);
    }

    document.querySelectorAll(".menu a[href]").forEach(link => {
        link.addEventListener("click", function () {
            const href = this.getAttribute("href");

            if (
                mobileAtivo() &&
                href &&
                href !== "#" &&
                !this.classList.contains("menu-dropdown-toggle")
            ) {
                fecharMenu();
            }
        });
    });

    document.querySelectorAll('.menu a[href*="#"]').forEach(link => {
        link.addEventListener("click", function (event) {
            const href = this.getAttribute("href");

            if (!href || !href.includes("#")) return;

            const [pagina, idSecao] = href.split("#");

            let paginaAtualClique =
                window.location.pathname.split("/").pop() || "index.html";

            if (!paginaAtualClique.includes(".")) {
                paginaAtualClique = `${paginaAtualClique}.html`;
            }

            if (pagina && pagina !== paginaAtualClique) return;

            const alvo = document.getElementById(idSecao);

            if (!alvo) return;

            event.preventDefault();

            const navbar = document.querySelector(".navbar");
            const alturaMenu = navbar ? navbar.offsetHeight : 0;

            const posicaoAlvo =
                alvo.getBoundingClientRect().top +
                window.scrollY -
                alturaMenu;

            window.scrollTo({
                top: posicaoAlvo,
                behavior: "smooth"
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
                idSecao === "hubs" ||
                idSecao === "simuladores"
            ) {
                novoMenuAtivo = "volar";
            }

            destacarMenu(novoMenuAtivo);
            history.replaceState(null, "", `#${idSecao}`);

            if (mobileAtivo()) {
                fecharMenu();
            }
        });
    });

    function ajustarAncoraAoCarregar() {
        if (!window.location.hash) return;

        const idSecao = window.location.hash.replace("#", "");
        const alvo = document.getElementById(idSecao);

        if (!alvo) return;

        setTimeout(() => {
            const navbar = document.querySelector(".navbar");
            const alturaMenu = navbar ? navbar.offsetHeight : 0;

            const posicaoAlvo =
                alvo.getBoundingClientRect().top +
                window.scrollY -
                alturaMenu;

            window.scrollTo({
                top: posicaoAlvo,
                behavior: "smooth"
            });
        }, 700);
    }

    ajustarAncoraAoCarregar();
});
