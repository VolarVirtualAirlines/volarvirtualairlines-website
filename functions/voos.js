export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/ongoing";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    // Pega a resposta como texto puro para não quebrar se não for JSON
    const textoPuro = await response.text();

    // Se a resposta for um texto comum ou HTML, vamos empacotar em um erro legível
    if (!response.ok || textoPuro.includes("<html") || !textoPuro.trim().startsWith("[")) {
      return new Response(JSON.stringify({ 
        error: true, 
        message: `Resposta bruta da NewSky: ${textoPuro.substring(0, 100)}` 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Se for um JSON válido (começa com [), envia normalmente
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
