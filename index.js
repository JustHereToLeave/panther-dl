// index.js
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// serves the main html page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// serves the javascript file
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

// handles the video download logic
app.get('/download', (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) {
        return res.status(400).send('video url is required.');
    }

    let videoTitle = 'video'; // a default title in case getting the real one fails

    // check the os and set the correct local path for the executable
    const ytDlpExecutable = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpCommand = path.join(__dirname, ytDlpExecutable);

    // --- step 1: get the video metadata (like the title) first ---
    const getMeta = spawn(ytDlpCommand, ['--dump-json', videoURL]);

    let metaData = '';
    getMeta.stdout.on('data', (data) => {
        metaData += data.toString();
    });

    getMeta.stderr.on('data', (data) => {
        console.error(`yt-dlp metadata stderr: ${data}`);
    });

    getMeta.on('close', (code) => {
        if (code === 0 && metaData) {
            try {
                // if successful, parse the metadata and grab the title
                const parsedData = JSON.parse(metaData);
                videoTitle = parsedData.title;
            } catch (e) {
                console.error('failed to parse video metadata:', e);
            }
        } else {
            console.error(`yt-dlp metadata process exited with code ${code}`);
        }
        
        // --- step 2: once metadata is done, start the actual video stream ---
        streamVideo();
    });

    function streamVideo() {
        // clean up the title to make it a valid filename
        const filename = `${videoTitle}.mp4`.replace(/[/\\?%*:|"<>]/g, '-');
        console.log(`starting stream for: ${filename}`);

        // tell the user's browser that this is a file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');

        const ytDlpStream = spawn(ytDlpCommand, [
            videoURL,
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', '-' // stream to standard output
        ]);

        // take the video data from yt-dlp and send it directly to the user
        ytDlpStream.stdout.pipe(res);

        ytDlpStream.stderr.on('data', (data) => {
            console.error(`yt-dlp stream stderr: ${data}`);
        });

        ytDlpStream.on('close', (code) => {
            if (code !== 0) {
                console.log(`yt-dlp stream process exited with code ${code}`);
            }
            console.log('stream finished.');
        });
    }
});

app.listen(port, () => {
    console.log(`server is listening on port ${port}`);
});
