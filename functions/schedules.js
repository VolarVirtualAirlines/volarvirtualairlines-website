export async function onRequestGet(context) {
  /*const url = "https://newsky.app/api/airline-api/schedules";*/
  const url = "https://newsky.app/api/airline-api/operations";
  const apiKey = "VVX_SqTQ2IyNfTDT0SJBaaRMOXcTjnGkny";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });

    const textoPuro = await response.text();
    const textoLimpo = textoPuro.trim();

    const ehJsonValido =
      textoLimpo.startsWith("{") ||
      textoLimpo.startsWith("[");

    if (
      !response.ok ||
      textoLimpo.includes("<html") ||
      textoLimpo.includes("<!DOCTYPE") ||
      !ehJsonValido
    ) {
      return new Response(
        JSON.stringify({
          error: true,
          status: response.status,
          contentType: response.headers.get("content-type"),
          message: textoLimpo.substring(0, 500)
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(textoPuro, {
      status: 200,
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
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
