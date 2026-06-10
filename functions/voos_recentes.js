export async function onRequestGet(context) {
  // URL corrigida conforme o site oficial
  const url = "https://newsky.app/api/pilot/nextflight";
  const apiKey = "VVX_QAjMAXVPxcO8yTcYQ7L6qEl6tncNLO";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    const data = await response.json(); // Tenta converter direto para JSON

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: true, message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
