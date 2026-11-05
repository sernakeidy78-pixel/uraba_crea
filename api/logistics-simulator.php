<?php
/**
 * Servicio logístico simulado para la demostración de interoperabilidad.
 * Controles: método permitido, tipo/tamaño de contenido, validación estricta,
 * límites de longitud y respuestas genéricas sin revelar detalles internos.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('X-Integration-Provider: UrabaCrea-Logistics-Demo');

function reply($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(['ok' => false, 'error' => 'Método no permitido. Utiliza POST.'], 405);
}
$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($contentType !== 'application/json') {
    reply(['ok' => false, 'error' => 'El contenido debe enviarse como application/json.'], 415);
}
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 8192) {
    reply(['ok' => false, 'error' => 'La solicitud está vacía o supera el tamaño permitido.'], 413);
}
$data = json_decode($raw, true);
if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
    reply(['ok' => false, 'error' => 'El cuerpo debe contener JSON válido.'], 400);
}
$orderId = filter_var($data['orderId'] ?? null, FILTER_VALIDATE_INT);
$recipient = trim((string)($data['recipient'] ?? ''));
$destination = trim((string)($data['destination'] ?? ''));
$description = trim((string)($data['description'] ?? 'Artesanías'));

if (!$orderId || $orderId < 1 ||
    $recipient === '' || mb_strlen($recipient) > 100 ||
    $destination === '' || mb_strlen($destination) > 140 ||
    $description === '' || mb_strlen($description) > 140) {
    reply(['ok' => false, 'error' => 'Datos incompletos o con formato no válido. Verifica los campos y sus longitudes.'], 422);
}
// En esta demo no se guardan los datos ni se envían a una empresa externa.
// Se devuelve una referencia ficticia; evita incluir datos personales en logs.
$tracking = 'UCR-' . str_pad((string)$orderId, 5, '0', STR_PAD_LEFT) . '-DEMO';
reply([
    'ok' => true,
    'provider' => 'Transportes Demo Urabá',
    'message' => 'Solicitud de prueba validada correctamente.',
    'trackingNumber' => $tracking,
    'status' => 'registered',
    'statusLabel' => 'Envío registrado (simulación)',
    'estimatedDelivery' => date('Y-m-d', strtotime('+3 days')),
    'receivedAt' => date(DATE_ATOM),
    'security' => [
        'contentTypeValidated' => true,
        'jsonValidated' => true,
        'fieldsValidated' => true,
        'maxRequestBytes' => 8192,
        'personalDataStored' => false
    ],
    'demo' => true
]);
