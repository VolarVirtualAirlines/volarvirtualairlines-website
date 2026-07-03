/* ==========================================================================
   VOLAR VIRTUAL AIRLINES
   ANNOUNCEMENTS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const modalAnnouncement = document.getElementById("modal-announcement");
    const btnFecharAnnouncement = document.getElementById("fechar-announcement");
    const announcementImg = document.getElementById("announcement-img");
    const dotsContainer = document.getElementById("announcement-dots");

    if (
        !modalAnnouncement ||
        !btnFecharAnnouncement ||
        !announcementImg ||
        !dotsContainer
    ) {
        return;
    }

    let comunicados = [];

    try {

        const response = await fetch("assets/data/announcements.json");

        if (!response.ok) {
            throw new Error("Erro ao carregar announcements.json");
        }

        comunicados = await response.json();

    } catch (erro) {
        console.error("Erro ao carregar anúncios:", erro);
        return;
    }

    const agora = new Date();

    const comunicadosValidos = comunicados.filter(item => {

        const inicio = new Date(item.start + "T00:00:00");
        const fim = new Date(item.end + "T23:59:59");

        return agora >= inicio && agora <= fim;

    });

    if (comunicadosValidos.length === 0) {
        return;
    }

    let anuncioAtual = 0;
    let autoplay = null;

    function atualizarImagem(indice) {

        announcementImg.classList.remove("active");

        setTimeout(() => {

            announcementImg.src = comunicadosValidos[indice].image;
            announcementImg.alt = comunicadosValidos[indice].alt;

            announcementImg.classList.add("active");

            document
                .querySelectorAll(".announcement-dot")
                .forEach((dot, i) => {

                    dot.classList.toggle("active", i === indice);

                });

        }, 180);

    }

    function criarDots() {

        dotsContainer.innerHTML = "";

        if (comunicadosValidos.length <= 1)
            return;

        comunicadosValidos.forEach((item, index) => {

            const dot = document.createElement("button");

            dot.type = "button";
            dot.className = "announcement-dot";

            if (index === 0)
                dot.classList.add("active");

            dot.addEventListener("click", () => {

                anuncioAtual = index;

                atualizarImagem(anuncioAtual);

                reiniciarAutoplay();

            });

            dotsContainer.appendChild(dot);

        });

    }

    function proximo() {

        anuncioAtual++;

        if (anuncioAtual >= comunicadosValidos.length) {

            anuncioAtual = 0;

        }

        atualizarImagem(anuncioAtual);

    }

    function iniciarAutoplay() {

        if (comunicadosValidos.length <= 1)
            return;

        autoplay = setInterval(proximo, 10000);

    }

    function reiniciarAutoplay() {

        clearInterval(autoplay);

        iniciarAutoplay();

    }

    btnFecharAnnouncement.addEventListener("click", () => {

        modalAnnouncement.classList.remove("active");

        document.body.style.overflow = "";

        clearInterval(autoplay);

    });

    criarDots();

    atualizarImagem(0);

    modalAnnouncement.classList.add("active");

    document.body.style.overflow = "hidden";

    iniciarAutoplay();

});
