<?php
// Configuration settings for the application
define('NOTES_DIR', __DIR__ . '/../notes/');
define('BASE_URL', '/');
define('SITE_TITLE', 'mdNotes');

// Error reporting (turn off in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Security settings
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("X-XSS-Protection: 1; mode=block");