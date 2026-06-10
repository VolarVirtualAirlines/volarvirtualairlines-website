export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/recent";
  const apiKey = "VVX_QAjMAXVPxcO8yTcYQ7L6qEl6tncNLO";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
      // Adicionando headers essenciais para a API identificar a origem
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://newsky.app/" 
    }
  });

  const textoPuro = await response.text();
  
  // Retorna diretamente o texto (que esperamos ser JSON)
  return new Response(textoPuro, {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
}
