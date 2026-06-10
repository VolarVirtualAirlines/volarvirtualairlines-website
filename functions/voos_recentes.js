export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/recent";
  const apiKey = "VVX_QAjMAXVPxcO8yTcYQ7L6qEl6tncNLO";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Trocando o formato de envio da chave
        "x-api-key": apiKey,
        "Accept": "application/json"
      }
    });

    const textoPuro = await response.text();
    
    // Se ainda retornar HTML, o problema é a permissão do Token
    return new Response(textoPuro, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: true, message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
