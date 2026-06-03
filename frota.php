<?php
// frota.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Evita erros de bloqueio no site

$apiKey = 'VVX_cHqukvBS7KYYsliiPFlMJbKQJFjYsj'; // Cole sua chave de frota aqui
$url = 'https://newsky.app/api/airline-api/fleet';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json',
    'User-Agent: VolarVirtualSite/1.0' // Identifica seu site para o servidor deles
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode(["error" => "Erro na NewSky", "status" => $httpCode]);
} else {
    echo $response;
}
?>
