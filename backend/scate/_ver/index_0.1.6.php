<?php
// scate/index.php — API endpoint

require_once __DIR__ . '/../db/db.php';

// --- CORS ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function now_ms(): int {
    return (int) round(microtime(true) * 1000);
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
        'ok'   => true,
        'pong' => true,
        'ts'   => now_ms(),
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
        $baseTs = now_ms();

        foreach ($input['items'] as $i => $it) {
            if (!is_array($it)) continue;

            $x = $it['x'] ?? null;
            $ts = $it['ts'] ?? null;
            $payload = $it['payload'] ?? [];

            $xVal  = is_numeric($x) ? (float)$x : null;
            $tsVal = is_numeric($ts) ? (int)$ts : null;
            if (!is_array($payload)) $payload = [];

            // если ts не пришёл — ставим now (ms)
            if ($tsVal === null) {
                $tsVal = $baseTs;
            }

            // чтобы в одном батче не было одинаковых ts
            $tsVal += (int)$i;

            // минимальная валидация
            if ($xVal === null) continue;

            $eventKeyIn = $it['event_key'] ?? ($input['event_key'] ?? null);

            $ids[] = insert_track_event($tsVal, $xVal, [
                'x' => $xVal,
                'ts' => $tsVal,
                'event_key' => $eventKeyIn,
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

    $xVal  = is_numeric($x) ? (float)$x : null;
    $tsVal = is_numeric($ts) ? (int)$ts : null;
    if (!is_array($payload)) $payload = [];

    // если ts не пришёл — ставим now (ms)
    if ($tsVal === null) {
        $tsVal = now_ms();
    }

    if ($xVal === null) {
        json_response([
            'ok' => false,
            'error' => 'x is required (number)',
        ], 400);
    }

    $eventKeyIn = $input['event_key'] ?? null;

    $id = insert_track_event($tsVal, $xVal, [
        'x' => $xVal,
        'ts' => $tsVal,
        'event_key' => $eventKeyIn,
        'payload' => $payload,
    ]);

    json_response([
        'ok' => true,
        'id' => $id,
    ]);
}

// --- settings_save ---
// action=settings_save
// device_id: string
// settings: object
if ($action === 'settings_save') {
    $deviceId = (string)($input['device_id'] ?? '');
    $settings = $input['settings'] ?? null;

    $deviceId = trim($deviceId);
    if ($deviceId === '' || !is_array($settings)) {
        json_response(['ok' => false, 'error' => 'device_id + settings required'], 400);
    }

    $ts = now_ms();
    $ip = get_client_ip();
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : null;

    $settingsJson = json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $sql = "
      INSERT INTO stake_settings (device_id, updated_at, settings_json, ip, ua)
      VALUES (:device_id, :updated_at, :settings_json, :ip, :ua)
      ON DUPLICATE KEY UPDATE
        updated_at = VALUES(updated_at),
        settings_json = VALUES(settings_json),
        ip = VALUES(ip),
        ua = VALUES(ua)
    ";

    $st = db()->prepare($sql);
    $st->execute([
        ':device_id' => $deviceId,
        ':updated_at' => $ts,
        ':settings_json' => $settingsJson,
        ':ip' => $ip,
        ':ua' => $ua,
    ]);

    json_response(['ok' => true, 'ts' => $ts]);
}

// --- settings_get ---
// action=settings_get
// device_id: string
if ($action === 'settings_get') {
    $deviceId = (string)($input['device_id'] ?? '');
    $deviceId = trim($deviceId);

    if ($deviceId === '') {
        json_response(['ok' => false, 'error' => 'device_id required'], 400);
    }

    $st = db()->prepare("SELECT device_id, updated_at, settings_json FROM stake_settings WHERE device_id = :device_id LIMIT 1");
    $st->execute([':device_id' => $deviceId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        json_response(['ok' => true, 'found' => false]);
    }

    $settings = json_decode((string)($row['settings_json'] ?? ''), true);
    if (!is_array($settings)) $settings = [];

    json_response([
        'ok' => true,
        'found' => true,
        'device_id' => (string)$row['device_id'],
        'updated_at' => (int)$row['updated_at'],
        'settings' => $settings,
    ]);
}

// --- objects_list ---
// action=objects_list
// device_id: string
if ($action === 'objects_list') {
    $deviceId = trim((string)($input['device_id'] ?? ''));
    if ($deviceId === '') {
        json_response(['ok' => false, 'error' => 'device_id required'], 400);
    }
    $items = condition_objects_list($deviceId);
    json_response([
        'ok' => true,
        'device_id' => $deviceId,
        'items' => $items,
    ]);
}

// --- object_get ---
// action=object_get
// device_id: string
// object_id: string
if ($action === 'object_get') {
    $deviceId = trim((string)($input['device_id'] ?? ''));
    $objectId = trim((string)($input['object_id'] ?? ''));
    if ($deviceId === '' || $objectId === '') {
        json_response(['ok' => false, 'error' => 'device_id + object_id required'], 400);
    }
    $obj = condition_object_get($deviceId, $objectId);
    json_response([
        'ok' => true,
        'found' => is_array($obj),
        'item' => $obj,
    ]);
}

// --- object_save ---
// action=object_save
// device_id: string
// object: object
if ($action === 'object_save') {
    $deviceId = trim((string)($input['device_id'] ?? ''));
    $object = $input['object'] ?? null;
    if ($deviceId === '' || !is_array($object)) {
        json_response(['ok' => false, 'error' => 'device_id + object required'], 400);
    }
    if (!condition_object_save($deviceId, $object)) {
        json_response(['ok' => false, 'error' => 'object_save failed'], 400);
    }
    json_response([
        'ok' => true,
        'device_id' => $deviceId,
        'object_id' => (string)($object['id'] ?? ''),
    ]);
}

// --- object_delete ---
// action=object_delete
// device_id: string
// object_id: string
if ($action === 'object_delete') {
    $deviceId = trim((string)($input['device_id'] ?? ''));
    $objectId = trim((string)($input['object_id'] ?? ''));
    if ($deviceId === '' || $objectId === '') {
        json_response(['ok' => false, 'error' => 'device_id + object_id required'], 400);
    }
    $deleted = condition_object_delete($deviceId, $objectId);
    json_response([
        'ok' => true,
        'deleted' => $deleted,
        'device_id' => $deviceId,
        'object_id' => $objectId,
    ]);
}

// --- неизвестное действие ---
json_response([
    'ok' => false,
    'error' => 'unknown action',
], 400);