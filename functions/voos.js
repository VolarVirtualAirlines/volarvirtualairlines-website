export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/ongoing";
  const apiKey = "VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj"; // Sua chave de voos

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const dados = await response.json();
    return new Response(JSON.stringify(dados), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
