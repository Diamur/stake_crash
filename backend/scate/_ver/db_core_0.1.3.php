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
