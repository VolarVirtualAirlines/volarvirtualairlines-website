export async function onRequest(context) {
  const url = "https://newsky.app/api/airline-api/fleet";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj"; // Sua chave de frota guardada em segurança no servidor

  try {
    // O próprio servidor do Cloudflare Pages vai buscar os dados na NewSky
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "VolarVirtualSite/1.0"
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Erro na NewSky: ${response.status}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const dados = await response.json();

    // Devolve os dados limpos para o seu HTML
    return new Response(JSON.stringify(dados), {
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
