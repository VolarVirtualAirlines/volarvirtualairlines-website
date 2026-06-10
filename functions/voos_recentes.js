export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/recent";
  const apiKey = "VVX_QAjMAXVPxcO8yTcYQ7L6qEl6tncNLO";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    const textoPuro = await response.text();
    const textoLimpo = textoPuro.trim();

    // Validação básica para garantir que o que está vindo é um JSON
    const ehJsonValido = textoLimpo.startsWith("[") || textoLimpo.startsWith("{");

    if (!response.ok || textoLimpo.includes("<html") || !ehJsonValido) {
      return new Response(JSON.stringify({ 
        error: true, 
        message: `Resposta inesperada da API (Status ${response.status}): ${textoLimpo.substring(0, 150)}` 
      }), {
        status: 200, 
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(textoPuro, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: true, message: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
