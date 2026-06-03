<?php
// Força o PHP a mostrar qualquer erro de digitação ou configuração na tela
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// INSIRA A SUA CHAVE DE FROTA REAL AQUI DENTRO DAS ASPAS
$apiKey = 'VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj'; 

$url = 'https://newsky.app/api/airline-api/fleet';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
    'User-Agent: VolarVirtualSite/1.0'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Se houver um erro de conexão do próprio servidor (ex: falta de cURL)
if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    echo json_encode(["error" => "Erro de cURL no servidor da Volar: " . $error_msg, "status" => 500]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Se a NewSky respondeu algo que não seja sucesso, mostra o que ela devolveu
if ($httpCode !== 200) {
    echo json_encode([
        "error" => "A NewSky recusou a requisicao do servidor", 
        "status" => $httpCode,
        "resposta_servidor" => strip_tags($response) // Limpa tags HTML para não quebrar o JS
    ]);
} else {
    echo $response;
}
?>
