<?php
require_once '../../includes/config.php';

header('Content-Type: application/json');

// Directory containing markdown files
$directory = '../../notes/';

// Get search term from request
$searchTerm = isset($_GET['term']) ? $_GET['term'] : '';

// Validate search term
if (empty($searchTerm)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'No search term provided'
    ]);
    exit;
}

// Sanitize the search term for shell command (very important for security)
$searchTerm = escapeshellarg($searchTerm);

// Use ag (silver searcher) to search through markdown files
$command = "cd $directory && ag -l --md $searchTerm";

// Execute the command
exec($command, $output, $returnCode);

// Check for command execution success
if ($returnCode !== 0) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Search failed to execute',
        'returnCode' => $returnCode
    ]);
    exit;
}

// Process the results
$matchingFiles = [];
foreach ($output as $file) {
    $matchingFiles[] = $file;
}

// Return the results
echo json_encode([
    'status' => 'success',
    'files' => $matchingFiles,
    'count' => count($matchingFiles)
]);
?>