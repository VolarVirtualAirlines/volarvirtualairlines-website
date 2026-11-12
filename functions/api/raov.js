
/*
 * VOLAR RAOV — API de integração com IA
 * Cloudflare Pages Function
 * Compartilhada entre VVX e VAX.
 *
 * Etapa inicial: validar a publicação e a
 * configuração da chave OpenAI.
 */

export async function onRequestGet(context) {
    const chaveConfigurada =
        Boolean(context.env.OPENAI_API_KEY);

    return new Response(
        JSON.stringify({
            sistema: "VOLAR RAOV",
            status: "online",
            openaiConfigurada: chaveConfigurada,
            integracaoIA: "aguardando_ativacao"
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store"
            }
        }
    );
}

// O processamento ainda não está habilitado.
// Evita chamadas e cobranças antes de concluirmos
// as validações de acesso e integração.

export async function onRequestPost() {
    return new Response(
        JSON.stringify({
            status: "integracao_nao_ativada",
            mensagem: "A integração com a IA está em preparação."
        }),
        {
            status: 503,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store"
            }
        }
    );
}

