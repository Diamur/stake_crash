<?php
// db/db.php — тонкая обёртка над db_core.php
// Вся логика API (json_response/get_client_ip/insert_track_event) живёт в версионном _ver/db_core_*.php

require_once __DIR__ . '/db_core.php'; // подключает версионное ядро и создаёт $pdo

function db(): PDO {
    global $pdo;
    return $pdo;
}
