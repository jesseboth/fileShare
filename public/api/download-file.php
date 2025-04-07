<?php
require_once '../../includes/config.php';

// download-file.php - Handles file downloads
// This script streams the requested file to the browser

// Ensure a file path was provided
if (!isset($_GET['file']) || empty($_GET['file'])) {
    header('HTTP/1.1 400 Bad Request');
    echo 'Error: No file specified';
    exit;
}

// Get the file path and sanitize it
$filePath = $_GET['file'];

// Prevent directory traversal attacks
$filePath = str_replace('..', '', $filePath);
$filePath = FILES_DIR . $filePath;

// Check if the file exists and is readable
if (!file_exists($filePath) || !is_file($filePath) || !is_readable($filePath)) {
    header('HTTP/1.1 404 Not Found');
    echo 'Error: File not found or not readable';
    exit;
}

// Get file information
$fileName = basename($filePath);
$fileSize = filesize($filePath);
$mimeType = mime_content_type($filePath);

// Set headers for download
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . $fileName . '"');
header('Content-Length: ' . $fileSize);
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Output the file
readfile($filePath);
exit;
?>
