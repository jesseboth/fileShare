<?php
require_once '../includes/config.php';
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <title>Notes</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <!-- Add highlight.js for syntax highlighting -->
    <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body>
    <header>
        <h1>Notes</h1>
        <div class="search-container">
            <span class="search-label"></span>
            <input type="text" id="content-search" placeholder="Search all markdown files...">
            <span class="search-icon" id="content-search-icon">
                <i class="material-icons">search</i>
            </span>
        </div>
    </header>
    <main>
        <div id="file-list">
            <div class="sidebar-header">Available Files</div>
            <div class="sidebar-search">
                <input type="text" id="search" class="search-bar" placeholder="Filter files...">
                <span class="search-icon" id="file-search-icon">
                    <i class="material-icons">search</i>
                </span>
            </div>
            <div class="file-entries">
                <!-- Files will be loaded here -->
            </div>
        </div>
        <div id="content-container">
            <div id="content" class="markdown-body">
                <!-- Markdown content will be displayed here -->
                <div class="loading">Loading notes</div>
            </div>
        </div>
    </main>
    <!-- Include Markdown processor -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>

</html>