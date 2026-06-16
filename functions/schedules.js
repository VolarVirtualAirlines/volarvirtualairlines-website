export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/schedules";
  const apiKey = "VVX_SqTQ2IyNfTDT0SJBaaRMOXcTjnGkny";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: true,
      message: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
