export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/recent";
  const apiKey = "VVX_QAjMAXVPxcO8yTcYQ7L6qEl6tncNLO";

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json"
    }
  });

  // Captura o HTML para tentarmos entender o que é
  const htmlResposta = await response.text();
  
  return new Response(JSON.stringify({
    status: response.status, // Isso vai nos dizer se é 401, 403, etc.
    conteudo: htmlResposta.substring(0, 200) // Vamos ver as primeiras linhas do erro
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
