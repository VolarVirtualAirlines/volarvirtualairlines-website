document.addEventListener("DOMContentLoaded", () => {

    const menuContainer = document.getElementById("menu-container");

    if (!menuContainer) return;

    menuContainer.innerHTML = `
        <nav class="menu">

            <a href="index.html">Home</a>

            <a href="#sobre-nos">Sobre Nós</a>

            <a href="cargo.html">Volar Cargo</a>

            <a href="frota.html">Frota</a>

            <a href="rotas.html">Rotas</a>

            <a href="#mapa">Online</a>

            <a href="news.html">Volar News</a>

            <a href="#parceiros">Parceiros</a>

            <a href="#links">Links</a>

            <a href="https://newsky.app/pilot/login"
               target="_blank"
               rel="noopener noreferrer"
               class="btn-va">
               Crew Room
            </a>

        </nav>
    `;

});
