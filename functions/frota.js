export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/fleet";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj"; // Sua chave atual

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    // Em vez de tentar ler como JSON direto (o que causa o erro do <), pegamos o texto puro
    const textoPuro = await response.text();

    // Se a NewSky mandou um HTML (erro), nós enviamos esse texto puro para o site ler
    if (!response.ok || textoPuro.includes("<html") || textoPuro.includes("<!DOCTYPE")) {
      // Vamos limpar as tags HTML para você conseguir ler a mensagem de erro na tela
      const mensagemLimpa = textoPuro.replace(/<[^>]*>/g, ' ').substring(0, 200);
      return new Response(JSON.stringify({ error: `A NewSky rejeitou o acesso. Resposta do servidor: ${mensagemLimpa}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Se veio a lista certa, processa o JSON normalmente
    const dados = JSON.parse(textoPuro);
    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Erro no script: ${error.message}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
