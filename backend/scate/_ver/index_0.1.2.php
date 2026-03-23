<?php
// scate/index.php — API endpoint

// старый путь
//require_once __DIR__ . '/db/db.php'; 
require_once __DIR__ . '/../db/db.php';

// --- CORS ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- входные данные: POST JSON или GET ---
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$input = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) $input = [];
} else {
    $input = $_GET ?? [];
}

$action = (string)($input['action'] ?? '');

// --- ping ---
if ($action === 'ping') {
    json_response([
        'ok' => true,
        'pong' => true,
        'ts' => time(),
    ]);
}

// --- track ---
// ожидаем:
// action=track
// x: число (например 2.37)
// ts: unix-ms (не обязательно)
// payload: объект (не обязательно)
// items: массив (батч, не обязательно)
if ($action === 'track') {

    // 1) батч: items = [{x, ts, payload}, ...]
    if (isset($input['items']) && is_array($input['items'])) {
        $ids = [];

        foreach ($input['items'] as $it) {
            if (!is_array($it)) continue;

            $x = $it['x'] ?? null;
            $ts = $it['ts'] ?? null;
            $payload = $it['payload'] ?? [];

            $xVal = is_numeric($x) ? (float)$x : null;
            $tsVal = is_numeric($ts) ? (int)$ts : null;
            if (!is_array($payload)) $payload = [];

            // если ts не пришёл — ставим now (ms), чтобы event_ts не был NULL
            if ($tsVal === null) {
                $tsVal = (int)round(microtime(true) * 1000);
            }

            // минимальная валидация
            if ($xVal === null) continue;

            $ids[] = insert_track_event($tsVal, $xVal, [
                'x' => $xVal,
                'ts' => $tsVal,
                'payload' => $payload,
            ]);
        }

        json_response([
            'ok' => true,
            'saved' => count($ids),
            'ids' => $ids,
        ]);
    }

    // 2) одиночная запись
    $x = $input['x'] ?? null;
    $ts = $input['ts'] ?? null;
    $payload = $input['payload'] ?? [];

    $xVal = is_numeric($x) ? (float)$x : null;
    $tsVal = is_numeric($ts) ? (int)$ts : null;
    if (!is_array($payload)) $payload = [];

    // если ts не пришёл — ставим now (ms), чтобы event_ts не был NULL
    if ($tsVal === null) {
        $tsVal = (int)round(microtime(true) * 1000);
    }

    if ($xVal === null) {
        json_response([
            'ok' => false,
            'error' => 'x is required (number)',
        ], 400);
    }

    $id = insert_track_event($tsVal, $xVal, [
        'x' => $xVal,
        'ts' => $tsVal,
        'payload' => $payload,
    ]);

    json_response([
        'ok' => true,
        'id' => $id,
    ]);
}

// --- неизвестное действие ---
json_response([
    'ok' => false,
    'error' => 'unknown action',
], 400);
