<?php
/**
 * Los Senderos Residencial — envío del formulario de contacto por correo.
 * Funciona en Hostinger con la función mail() de PHP.
 *
 * CONFIGURACIÓN: cambia los dos correos de abajo.
 *  - DESTINATARIOS: quién recibe las solicitudes (puedes poner varios separados por coma).
 *  - REMITENTE: debe ser un correo del dominio (créalo en hPanel → Correos),
 *    si no, los mensajes suelen llegar a spam o no llegar.
 */
const DESTINATARIOS = 'ventas@lossenderosresidencial.com.mx';
const REMITENTE     = 'no-reply@lossenderosresidencial.com.mx';
const NOMBRE_SITIO  = 'Los Senderos Residencial';

// Límite anti-spam: máximo de envíos por IP en una hora
const MAX_ENVIOS_POR_HORA = 5;

header('X-Robots-Tag: noindex, nofollow');

$esAjax = isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

function responder($ok, $mensaje, $codigo = 200) {
    global $esAjax;
    if ($esAjax) {
        http_response_code($codigo);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    } else {
        // Sin JavaScript: regresar a la página con el resultado
        header('Location: ./?enviado=' . ($ok ? '1' : '0') . '#contacto', true, 303);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ./', true, 303);
    exit;
}

// Trampa para bots: este campo está oculto y las personas lo dejan vacío
if (!empty($_POST['sitio_web'])) {
    responder(true, 'Gracias, recibimos tu mensaje.');
}

// Bots que envían en menos de 3 segundos desde que cargó la página
$inicio = isset($_POST['t']) ? (int) $_POST['t'] : 0;
if ($inicio > 0 && (time() * 1000 - $inicio) < 3000) {
    responder(false, 'Por favor, intenta de nuevo.', 429);
}

function limpiar($valor, $max = 500) {
    $valor = trim((string) $valor);
    $valor = str_replace(["\r", "\0"], '', $valor);
    return mb_substr($valor, 0, $max, 'UTF-8');
}

$nombre   = limpiar($_POST['nombre'] ?? '', 120);
$telefono = limpiar($_POST['telefono'] ?? '', 40);
$correo   = limpiar($_POST['correo'] ?? '', 160);
$privada  = limpiar($_POST['privada'] ?? '', 80);
$mensaje  = limpiar($_POST['mensaje'] ?? '', 3000);
$acepto   = !empty($_POST['acepto']);

$privadasValidas = ['', 'La Marquesa Privada Club', 'Santiago Privada', 'Antigua Privada Club'];
if (!in_array($privada, $privadasValidas, true)) $privada = '';

if ($nombre === '' || $telefono === '' || !filter_var($correo, FILTER_VALIDATE_EMAIL) || !$acepto
    || preg_match('/[\n]/', $nombre . $correo . $telefono)
    || strlen(preg_replace('/\D/', '', $telefono)) < 10) {
    responder(false, 'Revisa tus datos: nombre, teléfono de 10 dígitos y correo válido.', 422);
}

// Límite por IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$archivo = sys_get_temp_dir() . '/senderos_form_' . md5($ip);
$envios = [];
if (is_file($archivo)) {
    $envios = array_filter(
        (array) json_decode((string) @file_get_contents($archivo), true),
        function ($t) { return $t > time() - 3600; }
    );
}
if (count($envios) >= MAX_ENVIOS_POR_HORA) {
    responder(false, 'Recibimos varios mensajes desde tu conexión. Escríbenos por WhatsApp, por favor.', 429);
}

$e = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
$filas = [
    'Nombre'             => $nombre,
    'Teléfono'           => $telefono,
    'Correo'             => $correo,
    'Privada de interés' => $privada !== '' ? $privada : 'Aún no lo sabe',
    'Mensaje'            => $mensaje !== '' ? $mensaje : '—',
];
$html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1d2418">'
      . '<h2 style="color:#3c6328;margin:0 0 16px">Nueva solicitud de información</h2>'
      . '<table cellpadding="8" style="border-collapse:collapse">';
foreach ($filas as $k => $v) {
    $html .= '<tr><td style="background:#f7f4ea;font-weight:bold;vertical-align:top">' . $e($k) . '</td>'
           . '<td style="border-bottom:1px solid #efe9d6">' . nl2br($e($v)) . '</td></tr>';
}
$html .= '</table><p style="color:#777;font-size:12px;margin-top:20px">Enviado desde lossenderosresidencial.com.mx el '
       . date('d/m/Y H:i') . '</p></div>';

$asunto = '=?UTF-8?B?' . base64_encode('Nuevo prospecto: ' . $nombre . ($privada ? " ($privada)" : '')) . '?=';
$de     = '=?UTF-8?B?' . base64_encode(NOMBRE_SITIO) . '?= <' . REMITENTE . '>';
$cabeceras = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: ' . $de,
    'Reply-To: ' . $correo,
    'X-Mailer: PHP/' . phpversion(),
]);

$enviado = @mail(DESTINATARIOS, $asunto, $html, $cabeceras, '-f' . REMITENTE);

if (!$enviado) {
    responder(false, 'No pudimos enviar tu mensaje. Escríbenos por WhatsApp, por favor.', 500);
}

$envios[] = time();
@file_put_contents($archivo, json_encode(array_values($envios)));

responder(true, '¡Gracias, ' . $nombre . '! Recibimos tu solicitud y te contactaremos muy pronto.');
