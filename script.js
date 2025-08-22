// script.js
document.addEventListener('DOMContentLoaded', () => {
    const downloadForm = document.getElementById('downloadForm');
    const videoUrlInput = document.getElementById('videoUrl');
    const statusDiv = document.getElementById('status');
    const themeButtons = document.querySelectorAll('.theme-btn');

    // handle theme switching
    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            document.body.className = ''; // clear existing themes
            if (theme !== 'default') {
                document.body.classList.add(theme);
            }
        });
    });
    
    // handle form submission
    downloadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const videoURL = videoUrlInput.value.trim();

        if (videoURL) {
            statusDiv.textContent = 'starting download... please wait.';
            
            // create the download url for our backend endpoint
            const downloadUrl = `/download?url=${encodeURIComponent(videoURL)}`;
            
            // setting the window's location will trigger the download
            window.location.href = downloadUrl;

            // clear the status message after a few seconds
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 8000);
        } else {
            statusDiv.textContent = 'please enter a valid url.';
        }
    });
});
