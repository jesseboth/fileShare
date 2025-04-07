<?php
require_once '../../includes/config.php';

// list-files.php - Lists all files in the directory
header('Content-Type: application/json');

// Ensure trailing slash in directory path
$rootDirectory = FILES_DIR;

// Debug info (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to get file size in human-readable format
function formatFileSize($bytes) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, 2) . ' ' . $units[$pow];
}

// Function to get MIME type
function getMimeType($file) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file);
    finfo_close($finfo);
    return $mime;
}

// Function to recursively get all files with metadata
function getAllFiles($dir, $depth = 0) {
    global $rootDirectory;
    $maxDepth = 3;
    $results = [];

    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;

        $path = $dir . '/' . $file;
        $relativePath = str_replace($rootDirectory, '', $path); // Make path relative to root

        if (is_dir($path) && $depth < $maxDepth) {
            // It's a directory, recurse into it
            $subResults = getAllFiles($path, $depth + 1);
            foreach ($subResults as $subFile) {
                $results[] = $subFile;
            }
        } else if (is_file($path)) {
            // It's a file, add it with metadata
            $fileInfo = [
                'path' => $relativePath,
                'name' => $file,
                'size' => formatFileSize(filesize($path)),
                'type' => getMimeType($path),
                'modified' => date('Y-m-d H:i:s', filemtime($path)),
                'is_text' => preg_match('/^(text\/|application\/json|application\/xml|application\/javascript)/', getMimeType($path)) === 1
            ];
            $results[] = $fileInfo;
        }
    }

    return $results;
}

// Check if directory exists and is readable
if (is_dir($rootDirectory) && is_readable($rootDirectory)) {
    $files = getAllFiles($rootDirectory);

    // Debug info
    if (empty($files)) {
        echo json_encode([
            'status' => 'empty',
            'directory' => $rootDirectory,
            'readable' => is_readable($rootDirectory),
            'message' => 'No files found in this directory'
        ]);
        exit;
    }
} else {
    // Debug info
    echo json_encode([
        'status' => 'error',
        'directory' => $rootDirectory,
        'exists' => is_dir($rootDirectory),
        'readable' => is_dir($rootDirectory) ? is_readable($rootDirectory) : false,
        'message' => 'Directory does not exist or is not readable'
    ]);
    exit;
}

// Output the file list
echo json_encode($files);
?>
