export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/pilots";
  const apiKey = "VVX_6t2Ol9DvcRHliIWUwXuIWm03IHTTUz";

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
        count: 100,
        needle: "",
        sort: "createdAt",
        order: 1,
        status: "all",
        includeSensitive: false
      })
    });

    const text = await response.text();

    return new Response(text, {
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
