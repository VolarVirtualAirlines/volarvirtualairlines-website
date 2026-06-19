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
            </div>
        </footer>
    `;

});
