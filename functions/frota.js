export async function onRequest(context) {
  const url = "https://newsky.app/api/airline-api/fleet";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj";

  try {
    // Fazendo a requisição limpa para a NewSky, sem cabeçalhos extras que travam o Cloudflare
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Erro NewSky HTTP ${response.status}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json;charset=UTF-8" }
      });
    }

    const dados = await response.json();

    // Retorna os dados para o seu HTML principal
    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-cache"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Erro no servidor: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json;charset=UTF-8" }
    });
  }
}
