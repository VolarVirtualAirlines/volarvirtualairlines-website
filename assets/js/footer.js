document.addEventListener("DOMContentLoaded", () => {

    const footerContainer = document.getElementById("footer-container");

    if (!footerContainer) return;

    footerContainer.innerHTML = `
        <footer>
            <div class="footer-content">
                <img src="assets/LOGO_WEBSITE.png" alt="Volar Virtual Airlines Logo" class="footer-logo">

                <p>
                    © 2026 Volar Virtual Airlines | Fly Beyond | ICAO: VVX | All Rights Reserved
                </p>

                <div class="footer-links">
                    <a href="privacy.html">Política de Privacidade</a>
                    <span>|</span>
                    <a href="terms.html">Termos de Uso</a>
                    <span>|</span>
                    <a href="staff.html">Staff</a>
                    <span>|</span>
                    <a href="#" id="footer-suporte-link">Suporte</a>
                </div>
            </div>
        </footer>
    `;

});
