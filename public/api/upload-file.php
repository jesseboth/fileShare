<?php
require_once '../../includes/config.php';

// upload-file.php - Handles file uploads
header('Content-Type: application/json');

// Check if the request is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Only POST requests are allowed'
    ]);
    exit;
}

// Check if a file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = 'No file uploaded or upload error';
    
    // Get more specific error message
    if (isset($_FILES['file']['error'])) {
        switch ($_FILES['file']['error']) {
            case UPLOAD_ERR_INI_SIZE:
                $errorMessage = 'The uploaded file exceeds the upload_max_filesize directive in php.ini';
                break;
            case UPLOAD_ERR_FORM_SIZE:
                $errorMessage = 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMessage = 'The uploaded file was only partially uploaded';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMessage = 'No file was uploaded';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $errorMessage = 'Missing a temporary folder';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $errorMessage = 'Failed to write file to disk';
                break;
            case UPLOAD_ERR_EXTENSION:
                $errorMessage = 'A PHP extension stopped the file upload';
                break;
        }
    }
    
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage
    ]);
    exit;
}

// Get the uploaded file information
$file = $_FILES['file'];
$fileName = $file['name'];
$fileTmpPath = $file['tmp_name'];
$fileSize = $file['size'];
$fileType = $file['type'];

// Get the target directory from the form data or use the root directory
$targetDir = FILES_DIR;
if (isset($_POST['directory']) && !empty($_POST['directory'])) {
    $subDir = trim($_POST['directory'], '/');
    // Prevent directory traversal
    $subDir = str_replace('..', '', $subDir);
    $targetDir = FILES_DIR . $subDir . '/';
}

// Create the directory if it doesn't exist
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to create directory: ' . $targetDir
        ]);
        exit;
    }
}

// Generate the target file path
$targetFilePath = $targetDir . $fileName;

// Check if file already exists
if (file_exists($targetFilePath)) {
    // Append a number to the filename to make it unique
    $fileNameParts = pathinfo($fileName);
    $extension = isset($fileNameParts['extension']) ? '.' . $fileNameParts['extension'] : '';
    $baseName = $fileNameParts['filename'];
    $counter = 1;
    
    while (file_exists($targetDir . $baseName . '_' . $counter . $extension)) {
        $counter++;
    }
    
    $fileName = $baseName . '_' . $counter . $extension;
    $targetFilePath = $targetDir . $fileName;
}

// Move the uploaded file to the target directory
if (move_uploaded_file($fileTmpPath, $targetFilePath)) {
    // Get the relative path for the response
    $relativePath = str_replace(FILES_DIR, '', $targetFilePath);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'File uploaded successfully',
        'file' => [
            'name' => $fileName,
            'path' => $relativePath,
            'size' => $fileSize,
            'type' => $fileType
        ]
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to upload file'
    ]);
}
?>
