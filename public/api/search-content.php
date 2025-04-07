<?php
require_once '../../includes/config.php';

header('Content-Type: application/json');

// Directory containing files
$directory = FILES_DIR;

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

// Use grep to search through text files (more widely available than ag)
// -r for recursive, -l to list only filenames, -i for case insensitive
// --include to filter only text files
$command = "cd $directory && grep -r -l -i $searchTerm --include='*.txt' --include='*.md' --include='*.html' --include='*.css' --include='*.js' --include='*.json' --include='*.xml' --include='*.csv' .";

// Execute the command
exec($command, $output, $returnCode);

// Check for command execution success
// Note: grep returns 0 if matches found, 1 if no matches, 2+ for errors
if ($returnCode >= 2) {
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
    // Remove the leading "./" from the file path
    $file = preg_replace('/^\.\//', '', $file);
    $matchingFiles[] = $file;
}

// Return the results
echo json_encode([
    'status' => 'success',
    'files' => $matchingFiles,
    'count' => count($matchingFiles)
]);
?>
