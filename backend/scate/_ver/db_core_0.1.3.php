<?php
// ../scate/db/db_core.php — ядро работы с БД
// =============================================================
// 0. ПОДКЛЮЧЕНИЕ К БАЗЕ
// =============================================================
// старый путь
//$config = include __DIR__ . '/conn.php';

$config = include __DIR__ . '/../db/conn.php';


try {
    // Используем ровно те же настройки, что и в стабильной версии сайта,
    // чтобы не нарушить работу существующих запросов и шаблонов.
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}",
        $config['user'],
        $config['pass']
    );
	
	$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // аккуратно залогируем, если есть alog()
    if (function_exists('alog')) {
        alog('PDO CONNECT FAIL', ['ex' => $e->getMessage()]);
    }
    die('Ошибка подключения к БД: '.$e->getMessage());
}

// =============================================================
// HELPERS (API)
// =============================================================
if (!function_exists('json_response')) {
    function json_response($data, $code = 200) {
        http_response_code((int)$code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

if (!function_exists('get_client_ip')) {
    function get_client_ip() {
        $keys = ['HTTP_CF_CONNECTING_IP','HTTP_X_REAL_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'];
        foreach ($keys as $k) {
            if (!empty($_SERVER[$k])) {
                $v = $_SERVER[$k];
                if ($k === 'HTTP_X_FORWARDED_FOR') {
                    $v = explode(',', $v)[0];
                }
                return trim((string)$v);
            }
        }
        return null;
    }
}

// =============================================================
// stake_events insert (dedupe by event_key)
// event_key = sha1("track|event_ts|x_value")
// =============================================================
if (!function_exists('insert_track_event')) {
    function insert_track_event($eventTsMs, $xVal, $payload = []) {
        global $pdo;

        $event_type = 'track';

        $ts = is_numeric($eventTsMs) ? (int)$eventTsMs : null;
        if ($ts === null) {
            $ts = (int)round(microtime(true) * 1000);
        }

        $x = is_numeric($xVal) ? (float)$xVal : null;
        if ($x === null) {
            return null;
        }

        if (!is_array($payload)) $payload = [];
        $incoming_event_key = null;

        if (isset($payload['event_key']) && $payload['event_key'] !== null && $payload['event_key'] !== '') {
            $incoming_event_key = (string)$payload['event_key'];
        } elseif (isset($payload['payload']) && is_array($payload['payload'])) {
            if (isset($payload['payload']['roundLikeId']) && $payload['payload']['roundLikeId'] !== null && $payload['payload']['roundLikeId'] !== '') {
                $incoming_event_key = (string)$payload['payload']['roundLikeId'];
            } elseif (isset($payload['payload']['gameId']) && $payload['payload']['gameId'] !== null && $payload['payload']['gameId'] !== '') {
                $incoming_event_key = (string)$payload['payload']['gameId'];
            }
        }

        $event_key = $incoming_event_key ? $incoming_event_key : sha1($event_type . '|' . $ts . '|' . $x);

        $ip = get_client_ip();
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : null;

        $payload_json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        // важно: event_key уникальный (ux_event_key)
        $sql = "
            INSERT INTO stake_events (event_ts, event_type, event_key, x_value, payload_json, ip, ua)
            VALUES (:event_ts, :event_type, :event_key, :x_value, :payload_json, :ip, :ua)
            ON DUPLICATE KEY UPDATE id = id
        ";

        $st = $pdo->prepare($sql);
        $st->execute([
            ':event_ts' => $ts,
            ':event_type' => $event_type,
            ':event_key' => $event_key,
            ':x_value' => $x,
            ':payload_json' => $payload_json,
            ':ip' => $ip,
            ':ua' => $ua,
        ]);

        $id = (int)$pdo->lastInsertId();
        if ($id > 0) return $id;

        // если это дубль — вернём существующий id
        $q = $pdo->prepare("SELECT id FROM stake_events WHERE event_key = :k LIMIT 1");
        $q->execute([':k' => $event_key]);
        $row = $q->fetch(PDO::FETCH_ASSOC);

        return $row ? (int)$row['id'] : null;
    }
}

if (!function_exists('condition_object_save')) {
    function condition_object_save($deviceId, $object) {
        global $pdo;
        $deviceId = trim((string)$deviceId);
        if ($deviceId === '' || !is_array($object)) return false;

        $objectId = trim((string)($object['id'] ?? ''));
        $type = trim((string)($object['type'] ?? ''));
        if ($objectId === '' || $type === '') return false;

        $label = trim((string)($object['label'] ?? ''));
        $enabled = !empty($object['enabled']) ? 1 : 0;
        $groupId = trim((string)($object['groupId'] ?? ''));
        $groupMode = trim((string)($object['groupMode'] ?? 'single'));
        $params = isset($object['params']) && is_array($object['params']) ? $object['params'] : [];
        $ui = isset($object['ui']) && is_array($object['ui']) ? $object['ui'] : [];
        $runtime = isset($object['runtimeDefaults']) && is_array($object['runtimeDefaults']) ? $object['runtimeDefaults'] : [];
        $objectJson = json_encode($object, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $paramsJson = json_encode($params, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $uiJson = json_encode($ui, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $runtimeJson = json_encode($runtime, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ts = (int) round(microtime(true) * 1000);
        $ip = get_client_ip();
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : null;

        $sql = "
          INSERT INTO stake_condition_objects
          (device_id, object_id, type, label, enabled_default, group_id, group_mode, params_json, ui_json, runtime_defaults_json, object_json, created_at, updated_at, ip, ua)
          VALUES
          (:device_id, :object_id, :type, :label, :enabled_default, :group_id, :group_mode, :params_json, :ui_json, :runtime_defaults_json, :object_json, :created_at, :updated_at, :ip, :ua)
          ON DUPLICATE KEY UPDATE
            type = VALUES(type),
            label = VALUES(label),
            enabled_default = VALUES(enabled_default),
            group_id = VALUES(group_id),
            group_mode = VALUES(group_mode),
            params_json = VALUES(params_json),
            ui_json = VALUES(ui_json),
            runtime_defaults_json = VALUES(runtime_defaults_json),
            object_json = VALUES(object_json),
            updated_at = VALUES(updated_at),
            ip = VALUES(ip),
            ua = VALUES(ua)
        ";
        $st = $pdo->prepare($sql);
        return $st->execute([
            ':device_id' => $deviceId,
            ':object_id' => $objectId,
            ':type' => $type,
            ':label' => $label,
            ':enabled_default' => $enabled,
            ':group_id' => $groupId,
            ':group_mode' => $groupMode,
            ':params_json' => $paramsJson,
            ':ui_json' => $uiJson,
            ':runtime_defaults_json' => $runtimeJson,
            ':object_json' => $objectJson,
            ':created_at' => $ts,
            ':updated_at' => $ts,
            ':ip' => $ip,
            ':ua' => $ua,
        ]);
    }
}

if (!function_exists('condition_objects_list')) {
    function condition_objects_list($deviceId) {
        global $pdo;
        $st = $pdo->prepare("SELECT object_json FROM stake_condition_objects WHERE device_id = :device_id ORDER BY updated_at DESC, object_id ASC");
        $st->execute([':device_id' => (string)$deviceId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        $items = [];
        foreach ($rows as $row) {
            $obj = json_decode((string)($row['object_json'] ?? ''), true);
            if (is_array($obj)) $items[] = $obj;
        }
        return $items;
    }
}

if (!function_exists('condition_object_get')) {
    function condition_object_get($deviceId, $objectId) {
        global $pdo;
        $st = $pdo->prepare("SELECT object_json FROM stake_condition_objects WHERE device_id = :device_id AND object_id = :object_id LIMIT 1");
        $st->execute([':device_id' => (string)$deviceId, ':object_id' => (string)$objectId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        $obj = json_decode((string)($row['object_json'] ?? ''), true);
        return is_array($obj) ? $obj : null;
    }
}

if (!function_exists('condition_object_delete')) {
    function condition_object_delete($deviceId, $objectId) {
        global $pdo;
        $st = $pdo->prepare("DELETE FROM stake_condition_objects WHERE device_id = :device_id AND object_id = :object_id");
        $st->execute([':device_id' => (string)$deviceId, ':object_id' => (string)$objectId]);
        return $st->rowCount() > 0;
    }
}