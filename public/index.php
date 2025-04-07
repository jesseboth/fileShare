<?php
require_once '../includes/config.php';
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <title>File Share</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <!-- Add highlight.js for syntax highlighting -->
    <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="manifest" href="manifest.json">
</head>

<body>
    <header>
        <h1 id="page-title" onclick="window.location.reload();" style="cursor: pointer;">File Share</h1>
        <div class="header-actions">
            <button id="upload-button" class="upload-button">
                <i class="material-icons">upload</i> Upload
            </button>
            <div class="search-container">
                <span class="search-label"></span>
                <input type="text" id="content-search" placeholder="Search file contents...">
                <span class="search-icon" id="content-search-icon">
                    <i class="material-icons">search</i>
                </span>
            </div>
        </div>
    </header>
    
    <!-- Upload Modal -->
    <div id="upload-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Upload File</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="upload-form" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="file-input">Select a file:</label>
                        <input type="file" id="file-input" name="file" required>
                    </div>
                    <div class="form-group">
                        <label for="directory-input">Upload to directory (optional):</label>
                        <input type="text" id="directory-input" name="directory" placeholder="e.g., documents/reports">
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-upload" class="cancel-button">Cancel</button>
                        <button type="submit" id="submit-upload" class="submit-button">Upload</button>
                    </div>
                </form>
                <div id="upload-progress" class="progress-container" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
                <div id="upload-message" class="upload-message"></div>
            </div>
        </div>
    </div>
    <main>
        <div id="file-list">
            <div class="sidebar-search">
                <input type="text" id="search" class="search-bar" placeholder="Filter files...">
                <span class="search-icon" id="file-search-icon">
                    <i class="material-icons">search</i>
                </span>
            </div>
            <div class="sidebar-header"></div>
            <div class="file-entries">
                <!-- Files will be loaded here -->
            </div>
        </div>
        <div id="resizer"></div>
        <div id="content-container">
            <div id="content" class="markdown-body">
                <!-- File content will be displayed here -->
                <div class="loading">Loading files</div>
            </div>
        </div>
    </main>
    <!-- Include Markdown processor -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script src="assets/js/resize.js"></script>
</body>

</html>
