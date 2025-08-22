// index.js
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/download', (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) {
        return res.status(400).send('video url is required.');
    }

    let videoTitle = 'video';

    // since we downloaded yt-dlp to our project folder, we need to provide the local path to it.
    const ytDlpCommand = './yt-dlp';

    // step 1: get the video metadata (like the title) first
    const getMeta = spawn(ytDlpCommand, ['--dump-json', videoURL]);

    let metaData = '';
    getMeta.stdout.on('data', (data) => {
        metaData += data.toString();
    });

    getMeta.on('close', (code) => {
        if (code === 0) {
            try {
                const parsedData = JSON.parse(metaData);
                videoTitle = parsedData.title;
            } catch (e) {
                console.error('failed to parse video metadata:', e);
            }
        } else {
            console.error(`yt-dlp metadata process exited with code ${code}`);
        }
        
        // step 2: once we have the title (or a default), start the video stream
        streamVideo();
    });

    function streamVideo() {
        const filename = `${videoTitle}.mp4`.replace(/[/\\?%*:|"<>]/g, '-');
        console.log(`starting stream for: ${filename}`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');

        const ytDlpStream = spawn(ytDlpCommand, [
            videoURL,
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', '-'
        ]);

        ytDlpStream.stdout.pipe(res);

        ytDlpStream.stderr.on('data', (data) => {
            console.error(`yt-dlp stderr: ${data}`);
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
