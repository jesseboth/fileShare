<?php
require_once '../../includes/config.php';

// list-md-files.php
header('Content-Type: application/json');

// Ensure trailing slash in directory path
$rootDirectory = '../../notes/';

// Debug info (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to recursively get all markdown files
function getMarkdownFiles($dir, $depth = 0) {
    $maxDepth = 10;
    $results = [];

    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;

        $path = $dir . '/' . $file;
        $relativePath = str_replace('../../notes/', '', $path); // Make path relative to root

        if (is_dir($path) && $depth < $maxDepth) {
            // It's a directory, recurse into it
            $subResults = getMarkdownFiles($path, $depth + 1);
            foreach ($subResults as $subFile) {
                $results[] = $subFile;
            }
        } else if (pathinfo($file, PATHINFO_EXTENSION) === 'md') {
            // It's a markdown file
            $results[] = $relativePath;
        }
    }

    return $results;
}

// Check if directory exists and is readable
if (is_dir($rootDirectory) && is_readable($rootDirectory)) {
    $files = getMarkdownFiles($rootDirectory);

    // Debug info
    if (empty($files)) {
        echo json_encode([
            'status' => 'empty',
            'directory' => $rootDirectory,
            'readable' => is_readable($rootDirectory),
            'message' => 'No markdown files found in this directory'
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