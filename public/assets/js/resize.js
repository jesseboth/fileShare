document.addEventListener('DOMContentLoaded', function() {
    const resizer = document.getElementById('resizer');
    const fileList = document.getElementById('file-list');
    let startX, startWidth;

    resizer.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startWidth = fileList.offsetWidth;
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });

    minWidth = 230;
    function mouseMoveHandler(e) {
        var width = startWidth + e.clientX - startX;
        if (width < minWidth) {
            width = minWidth;
        }
        fileList.style.width = width + 'px';
    }

    function mouseUpHandler() {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    }
});
