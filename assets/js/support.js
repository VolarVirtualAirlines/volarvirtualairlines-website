/* ==========================================================================
   CENTRAL DE ATENDIMENTO - VOLAR VIRTUAL AIRLINES
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const btnSuporte = document.getElementById('btn-suporte');
    const footerSuporteLink = document.getElementById('footer-suporte-link');
    const modalSuporte = document.getElementById('modal-suporte');
    const btnFecharSuporte = document.getElementById('fechar-suporte');
    const formSuporte = document.getElementById('form-suporte');

    if (!btnSuporte || !modalSuporte || !btnFecharSuporte || !formSuporte) {
        return;
    }

    const btnEnviar = formSuporte.querySelector('.btn-enviar-suporte');

    btnSuporte.addEventListener('click', () => {
        modalSuporte.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

   if (footerSuporteLink) {
    footerSuporteLink.addEventListener('click', (e) => {
        e.preventDefault();
        modalSuporte.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
   }

    btnFecharSuporte.addEventListener('click', fecharModalSuporte);

    modalSuporte.addEventListener('click', (e) => {
        if (e.target === modalSuporte) {
            fecharModalSuporte();
        }
    });

    function fecharModalSuporte() {
        modalSuporte.classList.remove('active');
        document.body.style.overflow = '';
    }

    formSuporte.addEventListener('submit', async (e) => {
        e.preventDefault();

        const textoBotaoOriginal = btnEnviar.textContent;
        btnEnviar.textContent = "Enviando Mensagem...";
        btnEnviar.disabled = true;
        btnEnviar.style.opacity = '0.7';

        const formData = new FormData(formSuporte);
        const object = Object.fromEntries(formData.entries());
        const json = JSON.stringify(object);

        try {
            const response = await fetch(formSuporte.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: json
            });

            if (response.ok) {
                btnEnviar.textContent = "Mensagem Enviada com Sucesso!";
                btnEnviar.style.background = "#00FF87";
                btnEnviar.style.color = "#020617";

                formSuporte.reset();

                setTimeout(() => {
                    fecharModalSuporte();
                    btnEnviar.textContent = textoBotaoOriginal;
                    btnEnviar.style.background = '';
                    btnEnviar.style.color = '';
                    btnEnviar.disabled = false;
                    btnEnviar.style.opacity = '';
                }, 2500);
            } else {
                throw new Error();
            }

        } catch (error) {
            btnEnviar.textContent = "Erro ao enviar. Tente novamente.";
            btnEnviar.style.background = "#FF3B3B";
            btnEnviar.style.color = "#ffffff";

            setTimeout(() => {
                btnEnviar.textContent = textoBotaoOriginal;
                btnEnviar.style.background = '';
                btnEnviar.style.color = '';
                btnEnviar.disabled = false;
                btnEnviar.style.opacity = '';
            }, 3000);
        }
    });
});
