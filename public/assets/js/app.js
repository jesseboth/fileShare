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
                const filename = window.location.hash.substring(1);
                loadMarkdownFile(filename);
            } else {
                loadMarkdownFile(files[0]);
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
// TODO: this needs to be rafactored to support subdirs better
function organizeAndRenderFileTree(files) {
    const fileEntriesElem = document.querySelector('.file-entries');
    fileEntriesElem.innerHTML = ''; // Clear existing entries

    // Step 1: Build a nested tree structure
    const root = {};

    for (const file of files) {
        const parts = file.substring(1).split('/');
        fileName = parts[parts.length - 1]
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
            if (part && part.endsWith('.md')) {
                current[part] = parts.join('/');
            }
        }
    }

    // Step 2: Recursively render the tree
    function renderTree(tree, parentElem, level = 0) {
        var top = [];
        for (const name in tree) {

            const isFile = name.endsWith('.md');
            if (isFile && level == 0) {
                top.push(name)
                continue;
            }

            const entryDiv = document.createElement('div');
            entryDiv.className = isFile ? 'file-entry' : 'folder-entry';
            entryDiv.classList.add(`nested-level-${level}`);
            entryDiv.innerHTML = `
                <i class="material-icons">${isFile ? 'insert_drive_file' : 'folder'}</i>
            `;
            if (isFile) {
                entryDiv.innerHTML += `<a href="#${tree[name][name]}">${name.slice(0, -3)}</a>`;
            } else {
                entryDiv.innerHTML += `<span class="folder-name">${name}</span>`;
            }

            parentElem.appendChild(entryDiv);


            if (!isFile) {
                const contentsDiv = document.createElement('div');
                contentsDiv.className = 'folder-contents';
                parentElem.appendChild(contentsDiv);

                // Toggle open/close
                entryDiv.addEventListener('click', () => {
                    contentsDiv.classList.toggle('open');
                    entryDiv.querySelector('.material-icons').textContent =
                        contentsDiv.classList.contains('open') ? 'folder_open' : 'folder';
                });

                renderTree(tree[name], contentsDiv, level + 1);
            }
        }
        for (const name of top) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'file-entry';
            entryDiv.classList.add(`nested-level-${level}`);
            entryDiv.innerHTML = `
                <i class="material-icons">insert_drive_file</i>
                <a href="#${tree[name][name]}">${name.slice(0, -3)}</a>
            `;
            parentElem.appendChild(entryDiv);
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

// Function to load and display a markdown file
async function loadMarkdownFile(filename) {
    const contentElem = document.getElementById('content');
    contentElem.innerHTML = '<div class="loading">Loading note</div>';

    // Update active state in sidebar
    document.querySelectorAll('.file-entry, .file-entry-nested').forEach(item => {
        if (item.dataset.filename === filename) {
            item.classList.add('active');

            // Expand the parent folder if this is a nested file
            if (item.classList.contains('file-entry-nested')) {
                let parent = item.parentElement;
                while (parent && parent.classList.contains('folder-contents')) {
                    parent.classList.add('open');
                    // Update the folder icon
                    const folderIcon = parent.previousElementSibling.querySelector('.material-icons');
                    if (folderIcon) {
                        folderIcon.textContent = 'folder_open';
                    }
                    parent = parent.parentElement;
                }
            }
        } else {
            item.classList.remove('active');
        }
    });

    try {
        const response = await fetch(`notes/${filename}`);

        // file path is all but the last element in finame split by /
        const filePath = (filename.split('/'));
        filePath.pop();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let markdownText = await response.text();

        // Regular Expression to find local src attributes that need updating
        const regexSRC = /src="((?!http:\/\/|https:\/\/)[^"]+)"/g;
        markdownText = markdownText.replace(regexSRC, `src="notes/${filePath}/$1"`);
        
        const regexHREF = /href="((?!http:\/\/|https:\/\/)[^"]+)"/g;
        markdownText = markdownText.replace(regexHREF, `href="notes/${filePath}/$1"`);
        
        const regexStyle = /url\('((?!http:\/\/|https:\/\/)[^']+)'\)/g;
        markdownText = markdownText.replace(regexStyle, `url('notes/${filePath}/$1')`);
        
        const regexSrcset = /srcset="([^"]+)"/g;
        markdownText = markdownText.replace(regexSrcset, function(match, p1) {
            return 'srcset="' + p1.split(', ').map(src => {
                const parts = src.split(' ');
                if (!parts[0].startsWith('http://') && !parts[0].startsWith('https://')) {
                    parts[0] = `notes/${filePath}/` + parts[0];
                }
                return parts.join(' ');
            }).join(', ') + '"';
        });

        // Convert Markdown to HTML
        let html = marked.parse(markdownText);

        // Create a container for the rendered content
        contentElem.innerHTML = html;

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

                // Insert the info banner at the top
                contentElem.insertBefore(matchesInfo, contentElem.firstChild);

                // Scroll to the first match after a short delay
                setTimeout(() => {
                    const firstMatch = document.querySelector('.highlight');
                    if (firstMatch) {
                        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
        }

        // Set up details elements to keep state when clicked
        setupDetailsElements();

        // Update the URL hash
        window.location.hash = filename;

        // Scroll to top of content if no search matches
        if (!currentSearchTerm) {
            document.getElementById('content-container').scrollTop = 0;
        }

    } catch (error) {
        console.error('Error loading markdown file:', error);
        contentElem.innerHTML =
            `<div class="error-message">
                <h3>Error Loading File</h3>
                <p>${error.message}</p>
                <p>File: ${filename}</p>
            </div>`;
    }
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
        organizeAndRenderFileTree(allFiles);
        return;
    }

    // Otherwise, filter files that match the search term
    const filteredFiles = allFiles.filter(file =>
        file.toLowerCase().includes(searchTerm.toLowerCase())
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
        listItem.dataset.filename = file;

        // Show full path when filtering
        const displayName = file.replace('.md', '').substring(1);

        listItem.innerHTML = `
            <i class="material-icons file-icon">description</i>
            <a href="#${file}">${displayName}</a>
        `;

        fileEntriesElem.appendChild(listItem);
        listItem.addEventListener('click', () => loadMarkdownFile(file));
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
    if (searchTerm) {
        performContentSearch(searchTerm);
    } else {
        // If search is cleared, revert to showing all files
        currentSearchTerm = '';
        organizeAndRenderFileTree(allFiles);

        // Reload the current file without highlighting
        if (window.location.hash) {
            const filename = window.location.hash.substring(1);
            loadMarkdownFile(filename);
        }
    }
}

// Function to perform content search
async function performContentSearch(searchTerm) {
    if (!searchTerm) return;

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

            // Add each file as a direct entry
            data.files.forEach(file => {
                const listItem = document.createElement('div');
                listItem.className = 'file-entry';
                listItem.dataset.filename = file;

                // Show full path when filtering
                const displayName = file.replace('.md', '');

                listItem.innerHTML = `
                    <i class="material-icons file-icon">description</i>
                    <a href="#${file}">${displayName}</a>
                `;

                fileEntriesElem.appendChild(listItem);
                listItem.addEventListener('click', () => loadMarkdownFile(file));
            });

            // Load the first match if available
            if (data.files.length > 0) {
                loadMarkdownFile(data.files[0]);
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

// Initialize the application
window.onload = loadFileList;

// Handle hash changes (browser navigation)
window.addEventListener('hashchange', () => {
    if (window.location.hash) {
        const filename = window.location.hash.substring(1);
        loadMarkdownFile(filename);
    }
});