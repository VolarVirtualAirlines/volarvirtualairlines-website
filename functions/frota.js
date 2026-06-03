export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/fleet";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    // Se a própria NewSky rejeitar (Chave errada, por exemplo), capturamos aqui
    if (!response.ok) {
      const textoErro = await response.text();
      return new Response(JSON.stringify({ error: `NewSky respondeu com erro ${response.status}: ${textoErro}` }), {
        status: 200, // Retornamos 200 para o HTML exibir a mensagem real do erro na tela em vez de dar 500
        headers: { "Content-Type": "application/json" }
      });
    }

    const dados = await response.json();

    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });

  } catch (error) {
    // Se falhar o código aqui dentro, ele vai cuspir o erro exato na tela pra gente ler
    return new Response(JSON.stringify({ error: `Falha interna no Cloudflare: ${error.message}` }), {
      status: 200, 
      headers: { "Content-Type": "application/json" }
    });
  }
}
