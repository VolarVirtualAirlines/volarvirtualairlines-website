export async function onRequestGet(context) {
  const url = "https://newsky.app/api/airline-api/flights/ongoing";
  const apiKey = "VAX_LY50ZzBjkkSjqF9h3srEY2GGvKes47";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        // Opção A (Padrão):
        "Authorization": `Bearer ${apiKey}`,
        
        // Opção B: Se continuar dando "Bad token", comente a linha de cima e tente esta:
        // "Authorization": apiKey,
        
        // Opção C: Se a documentação deles pedir um header customizado:
        // "x-api-key": apiKey,

        "Accept": "application/json"
      }
    });

    const textoPuro = await response.text();
    const textoLimpo = textoPuro.trim();

    // 1. Verifica se o servidor retornou um erro HTTP (401, 404, 500, etc.)
    // 2. Verifica se veio HTML em vez de dados
    // 3. Modificado: Aceita se começar com '[' (Array) OU '{' (Objeto)
    const ehJsonValido = textoLimpo.startsWith("[") || textoLimpo.startsWith("{");

    if (!response.ok || textoLimpo.includes("<html") || !ehJsonValido) {
      return new Response(JSON.stringify({ 
        error: true, 
        message: `Resposta inesperada (Status ${response.status}): ${textoLimpo.substring(0, 150)}` 
      }), {
        status: 200, // Mantido 200 para o seu front-end tratar a mensagem amigavelmente
        headers: { "Content-Type": "application/json" }
      });
    }

    // Se passou no teste, entrega o JSON puro para o front-end
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
