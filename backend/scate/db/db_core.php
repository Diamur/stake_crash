<?php
// ../scate/db/db_core.php — loader версии ядра БД через _ver/current.php

$root = dirname(__DIR__);               // ../scate
$curFile = $root . '/_ver/current.php'; // ../scate/_ver/current.php

if (!is_file($curFile)) {
    throw new RuntimeException('version config not found: ' . $curFile);
}

$cur = require $curFile;
$dbCoreImpl = $cur['db_core'] ?? null;

if (!is_string($dbCoreImpl) || $dbCoreImpl === '') {
    throw new RuntimeException('invalid version config: db_core not set');
}

// абсолютный путь — ок; относительный — считаем от ../scate/
if ($dbCoreImpl[0] !== '/' && !preg_match('~^[A-Za-z]:[\\\\/]~', $dbCoreImpl)) {
    $dbCoreImpl = $root . '/' . ltrim($dbCoreImpl, '/');
}

if (!is_file($dbCoreImpl)) {
    throw new RuntimeException('db_core implementation not found: ' . $dbCoreImpl);
}

// подключаем версионное ядро (оно уже создаёт $pdo и функции)
require_once $dbCoreImpl;
