<?php
require_once '../../includes/config.php';

// view-file.php - Handles file viewing
// This script streams the requested file to the browser for viewing

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

// Set appropriate headers for viewing
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . $fileSize);
header('Cache-Control: max-age=3600');

// For text files, we want to display them in the browser
// For binary files, we'll let the browser decide how to handle them
$isTextFile = preg_match('/^(text\/|application\/json|application\/xml|application\/javascript)/', $mimeType);

if (!$isTextFile) {
    // For non-text files, suggest inline display if possible
    header('Content-Disposition: inline; filename="' . $fileName . '"');
}

// Output the file
readfile($filePath);
exit;
?>
