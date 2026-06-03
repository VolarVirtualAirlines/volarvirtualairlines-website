export async function onRequest(context) {
  const url = "https://newsky.app/api/airline-api/fleet";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "VolarVirtualSite/1.0"
      }
    });

    // Se a NewSky der erro, avisa o site com as permissões corretas
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Erro NewSky HTTP ${response.status}` }), {
        status: response.status,
        headers: { 
          "Content-Type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    const dados = await response.json();

    // Devolve os dados com os cabeçalhos explícitos para o navegador não bloquear
    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "no-cache"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }
}
