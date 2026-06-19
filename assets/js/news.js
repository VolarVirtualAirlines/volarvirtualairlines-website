    async function carregarNews() {
        const container = document.getElementById("news-container");
        const mensagem = document.getElementById("mensagem-news");

        try {
            const response = await fetch("assets/data/news.json");

            if (!response.ok) {
                throw new Error("Erro ao carregar news.json");
            }

            let noticias = await response.json();

            noticias = noticias
                .filter(noticia =>
                    noticia.image &&
                    noticia.image.trim() !== "" &&
                    noticia.title &&
                    noticia.date
                )
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);

            if (noticias.length === 0) {
                mensagem.textContent = "Nenhuma notícia disponível no momento.";
                return;
            }

            mensagem.style.display = "none";
            container.innerHTML = "";

            noticias.forEach(noticia => {
                const dataFormatada = new Date(noticia.date + "T00:00:00").toLocaleDateString("pt-BR");

                const linkFinal = noticia.link && noticia.link.trim() !== ""
                    ? noticia.link
                    : noticia.image;

                const card = document.createElement("article");
                card.className = "news-card";

                card.innerHTML = `
                    <a href="${noticia.image}" target="_blank" rel="noopener noreferrer" class="news-img-box">
                        <img src="${noticia.image}" alt="${noticia.title}">
                    </a>

                    <div class="news-content">
                        <span class="news-tag" style="background: ${noticia.color || '#2FA8A0'};">
                            ${noticia.tag || 'VOLAR'}
                        </span>

                        <span class="news-date">
                            ${dataFormatada}
                        </span>

                        <h3>${noticia.title}</h3>

                        <p>${noticia.summary || ''}</p>

                        <a href="${linkFinal}" target="_blank" rel="noopener noreferrer" class="news-read-more">
                            Ver notícia <i class="fas fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                `;

                container.appendChild(card);
            });

        } catch (error) {
            console.error("Erro ao carregar Volar News:", error);
            mensagem.textContent = "Não foi possível carregar as notícias no momento.";
        }
    }

    document.addEventListener("DOMContentLoaded", carregarNews);

    document.addEventListener("DOMContentLoaded", () => {
        const btnTopo = document.getElementById("btn-voltar-topo");

        window.addEventListener("scroll", () => {
            if (window.scrollY > 400) {
                btnTopo.style.display = "flex";
            } else {
                btnTopo.style.display = "none";
            }
        });

        btnTopo.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });
