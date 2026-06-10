export async function onRequestGet(context) {
  const url = "https://newsky.app/api/pilot/nextflight";
  const apiKey = "VVX_p5oqMUJd8e8B2g6vkZ7MFxOxAgP5AW";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Mudamos de "Authorization: Bearer" para "x-api-key"
        "x-api-key": apiKey,
        "Accept": "application/json"
      }
    });

    // Se o status for 401, a Newsky exige o header x-api-key
    if (response.status === 401) {
       return new Response(JSON.stringify({ error: "Chave não aceita neste endpoint" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
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
