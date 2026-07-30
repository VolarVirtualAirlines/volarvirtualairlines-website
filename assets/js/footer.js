document.addEventListener("DOMContentLoaded", () => {
    const footerContainer = document.getElementById("footer-container");

    if (!footerContainer) return;

    const currentYear = new Date().getFullYear();

    footerContainer.innerHTML = `
        <footer class="site-footer">
            <div class="footer-glow" aria-hidden="true"></div>

            <div class="footer-main">
                <div class="footer-grid">

                    <!-- IDENTIDADE VOLAR -->
                    <div class="footer-brand">
                        <a
                            href="index.html"
                            class="footer-logo-link"
                            aria-label="Página inicial da Volar Virtual Airlines"
                        >
                            <img
                                src="assets/LOGO_WEBSITE.png"
                                alt="Volar Virtual Airlines"
                                class="footer-logo"
                            >
                        </a>

                        <p class="footer-brand-description">
                            Excellence in Virtual Aviation.
                            <span>Fly Beyond.</span>
                        </p>

                        <div class="footer-socials">
                        
                            <!-- COLE O LINK DO DISCORD NO HREF -->
                            <a
                                href="#"
                                class="footer-social-icon"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Discord da Volar Virtual Airlines"
                                title="Discord"
                            >
                                <i class="fab fa-discord" aria-hidden="true"></i>
                            </a>
                        
                            <!-- COLE O LINK DO INSTAGRAM NO HREF -->
                            <a
                                href="#"
                                class="footer-social-icon"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram da Volar Virtual Airlines"
                                title="Instagram"
                            >
                                <i class="fab fa-instagram" aria-hidden="true"></i>
                            </a>
                        
                            <!-- COLE O LINK DO TIKTOK NO HREF -->
                            <a
                                href="#"
                                class="footer-social-icon"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="TikTok da Volar Virtual Airlines"
                                title="TikTok"
                            >
                                <i class="fab fa-tiktok" aria-hidden="true"></i>
                            </a>
                        
                        </div>
                    </div>

                    <!-- NAVEGAÇÃO -->
                    <nav class="footer-column" aria-label="Navegação do rodapé">
                        <h2 class="footer-title">Navegação</h2>

                        <ul class="footer-menu">
                            <li>
                                <a href="index.html">Início</a>
                            </li>

                            <li>
                                <a href="frota.html">Frota</a>
                            </li>

                            <li>
                                <a href="rotas.html">Rotas</a>
                            </li>

                            <li>
                                <!-- COLE O LINK DA PÁGINA DE PILOTOS NO HREF -->
                                <a href="#">Pilotos</a>
                            </li>

                            <li>
                                <a href="news.html">Notícias</a>
                            </li>
                        </ul>
                    </nav>

                    <!-- ECOSSISTEMA -->
                    <nav class="footer-column" aria-label="Ecossistema Volar">
                        <h2 class="footer-title">Ecossistema</h2>

                        <ul class="footer-menu">
                            <li>
                                <a href="index.html">Volar Virtual Airlines</a>
                            </li>

                            <li>
                                <a href="cargo.html">Volar Cargo</a>
                            </li>

                            <li>
                                <a href="vax.html">Volar Virtual Academy</a>
                            </li>

                            <li>
                                <!-- COLE O LINK EXTERNO DO NEWSKY NO HREF -->
                                <a
                                    href="#"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    NewSky
                                </a>
                            </li>

                            <li>
                                <!-- COLE O LINK DA VOLAR NA IVAO NO HREF -->
                                <a
                                    href="#"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    IVAO
                                </a>
                            </li>
                        </ul>
                    </nav>

                    <!-- INSTITUCIONAL -->
                    <nav class="footer-column" aria-label="Links institucionais">
                        <h2 class="footer-title">Institucional</h2>

                        <ul class="footer-menu">
                            <li>
                                <a href="privacy.html">
                                    Política de Privacidade
                                </a>
                            </li>

                            <li>
                                <a href="terms.html">
                                    Termos de Uso
                                </a>
                            </li>

                            <li>
                                <a href="staff.html">
                                    Staff
                                </a>
                            </li>

                            <li>
                                <a href="#" id="footer-suporte-link">
                                    Suporte
                                </a>
                            </li>
                        </ul>
                    </nav>

                    <!-- HORÁRIO OPERACIONAL -->
                    <section
                        class="footer-column footer-time"
                        aria-labelledby="footer-time-title"
                    >
                        <h2 class="footer-title" id="footer-time-title">
                            Flight Time
                        </h2>

                        <div class="footer-time-block">
                            <div class="footer-time-item">
                                <span class="footer-time-label">
                                    Local
                                </span>

                                <time
                                    id="footer-local-time"
                                    class="footer-time-value"
                                    datetime=""
                                >
                                    --:--
                                </time>
                            </div>

                            <div class="footer-time-item">
                                <span class="footer-time-label">
                                    Zulu
                                </span>

                                <time
                                    id="footer-utc-time"
                                    class="footer-time-value"
                                    datetime=""
                                >
                                    --:--Z
                                </time>
                            </div>

                            <div class="footer-time-offset">
                                <span id="footer-utc-offset">
                                    UTC
                                </span>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            <!-- BARRA INFERIOR -->
            <div class="footer-bottom">
                <div class="footer-bottom-content">
                    <p class="footer-copyright">
                        © ${currentYear}
                        <strong>Volar Virtual Airlines</strong>

                        <span
                            class="footer-separator"
                            aria-hidden="true"
                        >
                            •
                        </span>

                        Fly Beyond

                        <span
                            class="footer-separator"
                            aria-hidden="true"
                        >
                            •
                        </span>

                        ICAO: VVX
                    </p>

                    <p class="footer-signature">
                        Real Routes. Real Procedures.
                    </p>
                </div>
            </div>
        </footer>
    `;

    const localTimeElement = document.getElementById("footer-local-time");
    const utcTimeElement = document.getElementById("footer-utc-time");
    const utcOffsetElement = document.getElementById("footer-utc-offset");

    function formatTime(value) {
        return String(value).padStart(2, "0");
    }

    function getUtcOffset(date) {
        const offsetInMinutes = -date.getTimezoneOffset();

        if (offsetInMinutes === 0) {
            return "UTC";
        }

        const signal = offsetInMinutes >= 0 ? "+" : "-";
        const absoluteOffset = Math.abs(offsetInMinutes);
        const hours = Math.floor(absoluteOffset / 60);
        const minutes = absoluteOffset % 60;

        if (minutes === 0) {
            return `UTC${signal}${hours}`;
        }

        return `UTC${signal}${formatTime(hours)}:${formatTime(minutes)}`;
    }

    function updateFooterClock() {
        const now = new Date();

        const localHours = formatTime(now.getHours());
        const localMinutes = formatTime(now.getMinutes());

        const utcHours = formatTime(now.getUTCHours());
        const utcMinutes = formatTime(now.getUTCMinutes());

        if (localTimeElement) {
            localTimeElement.textContent = `${localHours}:${localMinutes}`;
            localTimeElement.dateTime = now.toISOString();
        }

        if (utcTimeElement) {
            utcTimeElement.textContent = `${utcHours}:${utcMinutes}Z`;
            utcTimeElement.dateTime = now.toISOString();
        }

        if (utcOffsetElement) {
            utcOffsetElement.textContent = getUtcOffset(now);
        }
    }

    updateFooterClock();

    /*
     * Atualiza o relógio exatamente na troca do minuto.
     * Depois disso, mantém a atualização a cada 60 segundos.
     */
    const millisecondsUntilNextMinute =
        (60 - new Date().getSeconds()) * 1000 -
        new Date().getMilliseconds();

    setTimeout(() => {
        updateFooterClock();

        setInterval(updateFooterClock, 60000);
    }, millisecondsUntilNextMinute);
});
