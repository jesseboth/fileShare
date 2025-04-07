// Configure marked for security and to use highlight.js
marked.setOptions({
    headerIds: true,
    gfm: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
});

// Store all files for filtering
let allFiles = [];
let currentSearchTerm = '';

// Function to get appropriate icon for file type
function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        return 'image';
    } else if (mimeType.startsWith('text/')) {
        return 'description';
    } else if (mimeType.startsWith('application/pdf')) {
        return 'picture_as_pdf';
    } else if (mimeType.startsWith('video/')) {
        return 'videocam';
    } else if (mimeType.startsWith('audio/')) {
        return 'audiotrack';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return 'table_chart';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return 'slideshow';
    } else if (mimeType.includes('document') || mimeType.includes('word')) {
        return 'article';
    } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
        return 'folder_zip';
    } else {
        return 'insert_drive_file';
    }
}

// Function to load the file list
async function loadFileList() {
    try {
        const response = await fetch('/api/list-md-files.php');
        const files = await response.json();
        allFiles = files; // Store all files for later filtering

        organizeAndRenderFileTree(files);

        // Load the first file by default if available
        if (files.length > 0) {
            if (window.location.hash) {
                const filePath = window.location.hash.substring(1);
                const file = files.find(f => f.path === filePath);
                if (file) {
                    loadFile(file);
                } else {
                    loadFile(files[0]);
                }
            } else {
                loadFile(files[0]);
            }
        }

        // Set up search functionality
        setupSearch();

    } catch (error) {
        console.error('Error loading file list:', error);
        document.querySelector('.file-entries').innerHTML =
            '<div class="error-message">Error loading files</div>';
    }
}

// Function to organize files into a directory tree structure
function organizeAndRenderFileTree(files) {
    const fileEntriesElem = document.querySelector('.file-entries');
    fileEntriesElem.innerHTML = ''; // Clear existing entries

    // Step 1: Build a nested tree structure
    const root = {};

    for (const file of files) {
        const parts = file.path.split('/');
        const fileName = parts[parts.length - 1];
        let current = root;

        // Build directory structure
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = { __isDir: true };
            }
            current = current[part];
        }

        // Add file at the end
        current[fileName] = file;
    }

    // Step 2: Recursively render the tree
    function renderTree(tree, parentElem, level = 0) {
        // First render directories
        for (const name in tree) {
            if (name === '__isDir') continue;
            
            const item = tree[name];
            const isFile = !item.__isDir;

            if (!isFile) {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'folder-entry';
                entryDiv.classList.add(`nested-level-${level}`);
                
                // Set initial folder icon based on level (top level folders start open)
                const folderIcon = level === 0 ? 'folder_open' : 'folder';
                
                entryDiv.innerHTML = `
                    <i class="material-icons">${folderIcon}</i>
                    <span class="folder-name">${name}</span>
                `;
                parentElem.appendChild(entryDiv);

                const contentsDiv = document.createElement('div');
                contentsDiv.className = 'folder-contents';
                
                // Auto-expand top level folders
                if (level === 0) {
                    contentsDiv.classList.add('open');
                }
                
                parentElem.appendChild(contentsDiv);

                // Toggle open/close
                entryDiv.addEventListener('click', () => {
                    contentsDiv.classList.toggle('open');
                    entryDiv.querySelector('.material-icons').textContent =
                        contentsDiv.classList.contains('open') ? 'folder_open' : 'folder';
                });

                renderTree(item, contentsDiv, level + 1);
            }
        }

        // Then render files
        for (const name in tree) {
            if (name === '__isDir') continue;
            
            const item = tree[name];
            const isFile = !item.__isDir;

            if (isFile) {
                const fileData = item;
                const entryDiv = document.createElement('div');
                entryDiv.className = 'file-entry';
                entryDiv.classList.add(`nested-level-${level}`);
                entryDiv.dataset.filepath = fileData.path;
                
                const fileIcon = getFileIcon(fileData.type);
                
                // Add padding based on level for proper indentation
                const paddingStyle = level > 0 ? `style="padding-left: ${(level * 16) + 15}px"` : '';
                
                entryDiv.innerHTML = `
                    <div class="file-entry-content" ${paddingStyle}>
                        <i class="material-icons file-icon">${fileIcon}</i>
                        <a href="#${fileData.path}" class="file-name">${fileData.name}</a>
                        <div class="file-info">
                            <span class="file-size">${fileData.size}</span>
                        </div>
                        <div class="file-actions">
                            <a href="/api/download-file.php?file=${encodeURIComponent(fileData.path)}" 
                               class="download-link" title="Download file">
                                <i class="material-icons">download</i>
                            </a>
                        </div>
                    </div>
                `;
                
                parentElem.appendChild(entryDiv);
                
                // Prevent download link from triggering file load
                entryDiv.querySelector('.download-link').addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // Add click handler to load the file
                entryDiv.addEventListener('click', () => {
                    loadFile(fileData);
                });
            }
        }
    }

    renderTree(root, fileEntriesElem);
}

// Get rendered content and perform client-side search in it
function performClientSideSearch(contentElement, searchTerm) {
    if (!searchTerm) return 0;

    // Escape special characters in the search term for use in regex
    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const searchTermRegex = new RegExp(escapeRegExp(searchTerm), 'gi');

    // Total match count
    let totalMatches = 0;

    // Clone the content element to calculate the total number of matches correctly
    // before we modify the DOM with highlighted elements
    const contentClone = contentElement.cloneNode(true);
    const allText = contentClone.textContent || contentClone.innerText;
    const allMatches = allText.match(searchTermRegex);
    totalMatches = allMatches ? allMatches.length : 0;

    // First, automatically open all details elements to search inside them
    const allDetails = contentElement.querySelectorAll('details');
    allDetails.forEach(details => {
        // Store the original state to restore it later if no matches found
        const wasOpen = details.hasAttribute('open');
        details.setAttribute('open', '');

        // Search for the term within this details element
        const detailsText = details.textContent || details.innerText;
        // Reset regex lastIndex
        searchTermRegex.lastIndex = 0;
        const matches = (detailsText.match(searchTermRegex) || []).length;

        if (matches > 0) {
            details.classList.add('contains-match');
        } else if (!wasOpen) {
            // If there were no matches and it wasn't originally open, close it again
            details.removeAttribute('open');
        }
    });

    // Now highlight all occurrences of the search term
    function highlightTextNodes(node) {
        if (node.nodeType === 3) { // Text node
            const content = node.nodeValue;
            // Reset regex lastIndex
            searchTermRegex.lastIndex = 0;
            if (searchTermRegex.test(content)) {
                // Reset the regex again since test() advances lastIndex
                searchTermRegex.lastIndex = 0;

                // Create a replacement element
                const span = document.createElement('span');

                // Replace all occurrences of the search term with highlighted version
                span.innerHTML = content.replace(searchTermRegex,
                    match => `<span class="highlight">${match}</span>`);

                // Replace the text node with our highlighted version
                if (node.parentNode) {
                    node.parentNode.replaceChild(span, node);
                    return true; // Indicate we've made a replacement
                }
            }
        } else if (node.nodeType === 1) { // Element node
            // Skip if this is within a PRE or CODE element to avoid breaking code formatting
            if (node.tagName === 'PRE' || node.tagName === 'CODE') return false;

            // Create a copy of childNodes since we'll be modifying the DOM
            const childNodes = Array.from(node.childNodes);
            let madeReplacement = false;

            for (const child of childNodes) {
                if (highlightTextNodes(child)) {
                    madeReplacement = true;
                }
            }

            return madeReplacement;
        }
        return false;
    }

    // Perform the highlighting
    highlightTextNodes(contentElement);

    return totalMatches;
}

// Function to load and display a file
async function loadFile(fileData) {
    const contentElem = document.getElementById('content');
    contentElem.innerHTML = '<div class="loading">Loading file</div>';
    contentElem.className = 'markdown-body'; // Reset class

    // Update active state in sidebar
    document.querySelectorAll('.file-entry').forEach(item => {
        if (item.dataset.filepath === fileData.path) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    try {
        // Update the URL hash
        window.location.hash = fileData.path;

        // Display file information in the header
        const fileInfoHeader = document.createElement('div');
        fileInfoHeader.className = 'file-info-header';
        fileInfoHeader.innerHTML = `
            <div class="file-details">
                <h2>${fileData.name}</h2>
                <div class="file-metadata">
                    <span class="file-type">${fileData.type}</span>
                    <span class="file-size">${fileData.size}</span>
                    <span class="file-modified">Modified: ${fileData.modified}</span>
                </div>
            </div>
            <div class="file-actions-header">
                <a href="/api/download-file.php?file=${encodeURIComponent(fileData.path)}" 
                   class="download-button" title="Download file">
                    <i class="material-icons">download</i> Download
                </a>
            </div>
        `;

        // Handle different file types
        if (fileData.type.startsWith('image/')) {
            // Image file
            contentElem.className = 'image-viewer';
            contentElem.innerHTML = `
                ${fileInfoHeader.outerHTML}
                <div class="image-container">
                    <img src="/api/view-file.php?file=${encodeURIComponent(fileData.path)}" alt="${fileData.name}">
                </div>
            `;
        } else if (fileData.type.startsWith('text/') || fileData.is_text) {
            // Text file
            try {
                const response = await fetch(`/api/view-file.php?file=${encodeURIComponent(fileData.path)}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                let text = await response.text();
                let html;
                
                // If it's markdown, parse it
                if (fileData.name.endsWith('.md')) {
                    html = marked.parse(text);
                } else {
                    // For other text files, wrap in pre tag for formatting
                    html = `<pre class="code-block">${escapeHtml(text)}</pre>`;
                }
                
                contentElem.innerHTML = fileInfoHeader.outerHTML + html;
                
                // Apply syntax highlighting to code blocks
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
                
                // If we have a search term, highlight it in the content
                if (currentSearchTerm) {
                    // Create info banner about search
                    const matchesInfo = document.createElement('div');
                    matchesInfo.className = 'matches-info';
                    
                    // Perform client-side search and highlighting
                    const matchCount = performClientSideSearch(contentElem, currentSearchTerm);
                    
                    if (matchCount > 0) {
                        matchesInfo.innerHTML = `Found <span class="match-count">${matchCount}</span> occurrences of "${currentSearchTerm}" in this file`;
                        
                        // Insert the info banner after the file info header
                        const fileInfoHeader = contentElem.querySelector('.file-info-header');
                        if (fileInfoHeader) {
                            fileInfoHeader.insertAdjacentElement('afterend', matchesInfo);
                        } else {
                            contentElem.insertBefore(matchesInfo, contentElem.firstChild);
                        }
                        
                        // Scroll to the first match after a short delay
                        setTimeout(() => {
                            const firstMatch = document.querySelector('.highlight');
                            if (firstMatch) {
                                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, 100);
                    }
                }
            } catch (error) {
                console.error('Error loading text file:', error);
                contentElem.innerHTML = fileInfoHeader.outerHTML + `
                    <div class="error-message">
                        <h3>Error Loading File</h3>
                        <p>${error.message}</p>
                        <p>File: ${fileData.path}</p>
                    </div>
                `;
            }
        } else if (fileData.type === 'application/pdf') {
            // PDF file
            contentElem.className = 'pdf-viewer';
            contentElem.innerHTML = `
                ${fileInfoHeader.outerHTML}
                <div class="pdf-container">
                    <iframe src="/api/view-file.php?file=${encodeURIComponent(fileData.path)}" 
                            title="${fileData.name}" width="100%" height="600px"></iframe>
                </div>
            `;
        } else if (fileData.type.startsWith('video/')) {
            // Video file
            contentElem.className = 'video-viewer';
            contentElem.innerHTML = `
                ${fileInfoHeader.outerHTML}
                <div class="video-container">
                    <video controls>
                        <source src="/api/view-file.php?file=${encodeURIComponent(fileData.path)}" type="${fileData.type}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        } else if (fileData.type.startsWith('audio/')) {
            // Audio file
            contentElem.className = 'audio-viewer';
            contentElem.innerHTML = `
                ${fileInfoHeader.outerHTML}
                <div class="audio-container">
                    <audio controls>
                        <source src="/api/view-file.php?file=${encodeURIComponent(fileData.path)}" type="${fileData.type}">
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            `;
        } else {
            // Other file types - just show download option
            contentElem.className = 'file-info';
            contentElem.innerHTML = `
                ${fileInfoHeader.outerHTML}
                <div class="file-preview">
                    <div class="file-icon-large">
                        <i class="material-icons">${getFileIcon(fileData.type)}</i>
                    </div>
                    <p>This file type cannot be previewed in the browser.</p>
                    <p>Click the download button to save the file to your computer.</p>
                </div>
            `;
        }

        // Set up details elements to keep state when clicked
        setupDetailsElements();

        // Scroll to top of content if no search matches
        if (!currentSearchTerm) {
            document.getElementById('content-container').scrollTop = 0;
        }

    } catch (error) {
        console.error('Error loading file:', error);
        contentElem.innerHTML = `
            <div class="error-message">
                <h3>Error Loading File</h3>
                <p>${error.message}</p>
                <p>File: ${fileData.path}</p>
            </div>
        `;
    }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Set up details elements to retain open/closed state
function setupDetailsElements() {
    document.querySelectorAll('details').forEach(details => {
        details.addEventListener('toggle', function () {
            // Remove the contains-match class if it was only there for search
            if (!this.hasAttribute('open') && this.classList.contains('contains-match')) {
                this.classList.remove('contains-match');
            }
        });
    });
}

// Filter the file tree based on search term
function filterFileTree(searchTerm) {
    // If search term is empty, show all files
    if (!searchTerm) {
        document.querySelector('.sidebar-header').textContent = '';
        organizeAndRenderFileTree(allFiles);
        return;
    }

    // Otherwise, filter files that match the search term
    const filteredFiles = allFiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Show filtered files with flattened view (no folders)
    const fileEntriesElem = document.querySelector('.file-entries');
    fileEntriesElem.innerHTML = '';

    if (filteredFiles.length === 0) {
        fileEntriesElem.innerHTML = '<div class="no-results">No matching files</div>';
        return;
    }

    // Update header count
    document.querySelector('.sidebar-header').textContent = `Files Matching "${searchTerm}" (${filteredFiles.length})`;

    // Add each file as a direct entry
    filteredFiles.forEach(file => {
        const listItem = document.createElement('div');
        listItem.className = 'file-entry';
        listItem.dataset.filepath = file.path;

        const fileIcon = getFileIcon(file.type);

        listItem.innerHTML = `
            <div class="file-entry-content">
                <i class="material-icons file-icon">${fileIcon}</i>
                <a href="#${file.path}" class="file-name">${file.name}</a>
                <div class="file-info">
                    <span class="file-size">${file.size}</span>
                </div>
                <div class="file-actions">
                    <a href="/api/download-file.php?file=${encodeURIComponent(file.path)}" 
                       class="download-link" title="Download file">
                        <i class="material-icons">download</i>
                    </a>
                </div>
            </div>
        `;

        fileEntriesElem.appendChild(listItem);
        
        // Prevent download link from triggering file load
        listItem.querySelector('.download-link').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Add click handler to load the file
        listItem.addEventListener('click', () => {
            loadFile(file);
        });
    });
}

// Setup search functionality
function setupSearch() {
    // File search
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        filterFileTree(searchTerm);
    });

    // Add click handler to file search icon
    const fileSearchIcon = document.getElementById('file-search-icon');
    fileSearchIcon.addEventListener('click', () => {
        const searchTerm = document.getElementById('search').value.toLowerCase();
        filterFileTree(searchTerm);
    });

    // Content search
    const contentSearchInput = document.getElementById('content-search');
    contentSearchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            executeContentSearch();
        }
    });

    // Add click handler to content search icon
    const contentSearchIcon = document.getElementById('content-search-icon');
    contentSearchIcon.addEventListener('click', executeContentSearch);
}

// Function to execute content search
function executeContentSearch() {
    const searchTerm = document.getElementById('content-search').value.trim();
    performContentSearch(searchTerm);
    if (!searchTerm){
        // If search is cleared, revert to showing all files
        currentSearchTerm = '';
        organizeAndRenderFileTree(allFiles);

        // Reload the current file without highlighting
        if (window.location.hash) {
            const filePath = window.location.hash.substring(1);
            const file = allFiles.find(f => f.path === filePath);
            if (file) {
                loadFile(file);
            }
        }
    }
}

// Function to perform content search
async function performContentSearch(searchTerm) {
    if (!searchTerm) {
        document.querySelector('.sidebar-header').textContent = '';
        return;
    }

    currentSearchTerm = searchTerm;
    try {
        const sidebarHeader = document.querySelector('.sidebar-header');
        sidebarHeader.textContent = 'Searching...';

        const response = await fetch(`/api/search-content.php?term=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        if (data.status === 'success') {
            // Update file list with matching files
            const fileEntriesElem = document.querySelector('.file-entries');
            fileEntriesElem.innerHTML = '';

            // Update header count
            sidebarHeader.textContent = `Files Containing "${searchTerm}" (${data.files.length})`;

            if (data.files.length === 0) {
                fileEntriesElem.innerHTML = '<div class="no-results">No matching files</div>';

                // Show "no results" in content area
                document.getElementById('content').innerHTML =
                    `<div class="error-message">
                        <h3>No Results Found</h3>
                        <p>No files contain the search term "${searchTerm}"</p>
                    </div>`;
                return;
            }

            // Find the matching file objects from allFiles
            const matchingFiles = [];
            for (const filePath of data.files) {
                const file = allFiles.find(f => f.path === filePath);
                if (file) {
                    matchingFiles.push(file);
                }
            }

            // Add each file as a direct entry
            matchingFiles.forEach(file => {
                const listItem = document.createElement('div');
                listItem.className = 'file-entry';
                listItem.dataset.filepath = file.path;

                const fileIcon = getFileIcon(file.type);

                listItem.innerHTML = `
                    <div class="file-entry-content">
                        <i class="material-icons file-icon">${fileIcon}</i>
                        <a href="#${file.path}">${file.name}</a>
                        <div class="file-info">
                            <span class="file-size">${file.size}</span>
                        </div>
                        <div class="file-actions">
                            <a href="/api/download-file.php?file=${encodeURIComponent(file.path)}" 
                               class="download-link" title="Download file">
                                <i class="material-icons">download</i>
                            </a>
                        </div>
                    </div>
                `;

                fileEntriesElem.appendChild(listItem);
                
                // Prevent download link from triggering file load
                listItem.querySelector('.download-link').addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // Add click handler to load the file
                listItem.addEventListener('click', () => {
                    loadFile(file);
                });
            });

            // Load the first match if available
            if (matchingFiles.length > 0) {
                loadFile(matchingFiles[0]);
            }
        } else {
            // Show error
            console.error('Search error:', data.message);
            document.getElementById('content').innerHTML =
                `<div class="error-message">
                    <h3>Search Error</h3>
                    <p>${data.message}</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error performing content search:', error);
        document.getElementById('content').innerHTML =
            `<div class="error-message">
                <h3>Search Error</h3>
                <p>Failed to perform search: ${error.message}</p>
            </div>`;
    }
}

// Upload functionality
function setupUploadModal() {
    const modal = document.getElementById('upload-modal');
    const uploadButton = document.getElementById('upload-button');
    const closeButton = document.querySelector('.close');
    const cancelButton = document.getElementById('cancel-upload');
    const uploadForm = document.getElementById('upload-form');
    const progressContainer = document.getElementById('upload-progress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const uploadMessage = document.getElementById('upload-message');

    // Open modal when upload button is clicked
    uploadButton.addEventListener('click', () => {
        modal.style.display = 'block';
        // Reset form and progress
        uploadForm.reset();
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
        uploadMessage.textContent = '';
        uploadMessage.className = 'upload-message';
    });

    // Close modal when close button is clicked
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when cancel button is clicked
    cancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle form submission
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const fileInput = document.getElementById('file-input');
        const directoryInput = document.getElementById('directory-input');
        
        // Check if a file was selected
        if (!fileInput.files || fileInput.files.length === 0) {
            showUploadMessage('Please select a file to upload', 'error');
            return;
        }
        
        const file = fileInput.files[0];
        const directory = directoryInput.value.trim();
        
        // Create FormData object
        const formData = new FormData();
        formData.append('file', file);
        if (directory) {
            formData.append('directory', directory);
        }
        
        // Show progress container
        progressContainer.style.display = 'block';
        
        try {
            // Create XMLHttpRequest to track upload progress
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressFill.style.width = percentComplete + '%';
                    progressText.textContent = percentComplete + '%';
                }
            });
            
            // Handle response
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.status === 'success') {
                            showUploadMessage('File uploaded successfully!', 'success');
                            
                            // Reload file list after a short delay
                            setTimeout(() => {
                                loadFileList();
                                modal.style.display = 'none';
                            }, 1500);
                        } else {
                            showUploadMessage('Upload failed: ' + response.message, 'error');
                        }
                    } catch (error) {
                        showUploadMessage('Error parsing server response', 'error');
                    }
                } else {
                    showUploadMessage('Upload failed with status: ' + xhr.status, 'error');
                }
            };
            
            // Handle network errors
            xhr.onerror = function() {
                showUploadMessage('Network error occurred during upload', 'error');
            };
            
            // Open and send the request
            xhr.open('POST', '/api/upload-file.php', true);
            xhr.send(formData);
            
        } catch (error) {
            showUploadMessage('Error: ' + error.message, 'error');
        }
    });
    
    // Helper function to show upload messages
    function showUploadMessage(message, type) {
        uploadMessage.textContent = message;
        uploadMessage.className = 'upload-message ' + type;
    }
}

// Initialize the application
window.onload = function() {
    loadFileList();
    setupUploadModal();
};

// Handle hash changes (browser navigation)
window.addEventListener('hashchange', () => {
    if (window.location.hash) {
        const filePath = window.location.hash.substring(1);
        const file = allFiles.find(f => f.path === filePath);
        if (file) {
            loadFile(file);
        }
    }
});
