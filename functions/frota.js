export async function onRequestGet(context) {
  // Rota oficial atrelada ao escopo 'fleet' da nova API da NewSky
  const url = "https://newsky.app/api/airline-api/fleet/list";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    const textoPuro = await response.text();

    if (!response.ok || textoPuro.includes("<html") || textoPuro.includes("<!DOCTYPE")) {
      const mensagemLimpa = textoPuro.replace(/<[^>]*>/g, ' ').substring(0, 150);
      return new Response(JSON.stringify({ error: `Erro no escopo fleet. Resposta: ${mensagemLimpa}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

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
