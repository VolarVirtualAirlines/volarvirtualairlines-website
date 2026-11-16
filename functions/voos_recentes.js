export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/recent";
  const apiKey = "VVX_QAjMAXVPxcO8yTcYQ7L6qEl6tncNLO";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        skip: 0,
        count: 100
      })
    });

const text = await response.text();

if (!response.ok) {
  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

const data = JSON.parse(text);

// Excluir voos com rating negativo
if (Array.isArray(data.results)) {
  data.results = data.results.filter(voo => {
    const rating = Number(voo.rating);
    return !Number.isFinite(rating) || rating >= 0;
  });
}

return new Response(JSON.stringify(data), {
  status: response.status,
  headers: {
    "Content-Type": "application/json"
  }
});

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
