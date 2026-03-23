<?php
// scate/index.php — API endpoint (versioned loader)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Version switcher ---
$root = __DIR__;
$curFile = $root . '/_ver/current.php';

function scate_json_fail(int $code, array $data) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!is_file($curFile)) {
    scate_json_fail(500, [
        'ok' => false,
        'error' => 'version config not found',
        'hint' => 'create scate/_ver/current.php',
    ]);
}

$cur = require $curFile;
$indexImpl = $cur['index'] ?? null;
$dbCoreImpl = $cur['db_core'] ?? null;

if (!is_string($indexImpl) || $indexImpl === '') {
    scate_json_fail(500, [
        'ok' => false,
        'error' => 'invalid version config',
        'hint' => 'current.php must return ["index" => "..."]',
    ]);
}

$resolve = function($path) use ($root) {
    if (!is_string($path) || $path === '') return null;

    // абсолютный путь — ок; относительный — считаем от scate/
    if ($path[0] !== '/' && !preg_match('~^[A-Za-z]:[\\\\/]~', $path)) {
        $path = $root . '/' . ltrim($path, '/');
    }
    return $path;
};

$indexImplAbs = $resolve($indexImpl);
$dbCoreImplAbs = $resolve($dbCoreImpl);

if (!$indexImplAbs || !is_file($indexImplAbs)) {
    scate_json_fail(500, [
        'ok' => false,
        'error' => 'index implementation not found',
        'file' => $indexImplAbs ?: $indexImpl,
    ]);
}

// Подключаем db_core, если указан (дает db(), json_response(), get_client_ip(), insert_track_event(), etc)
if ($dbCoreImplAbs) {
    if (!is_file($dbCoreImplAbs)) {
        scate_json_fail(500, [
            'ok' => false,
            'error' => 'db_core implementation not found',
            'file' => $dbCoreImplAbs,
        ]);
    }
    require_once $dbCoreImplAbs;
}

// Передаём управление в реализацию (версионный файл)
require $indexImplAbs;