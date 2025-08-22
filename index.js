// index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import YTDlpWrap from 'yt-dlp-wrap';

const app = express();
const port = process.env.PORT || 8080;
const ytDlpWrap = new YTDlpWrap();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// endpoint to serve the main html page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// endpoint to serve the javascript file
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

// the main endpoint that handles the video download
app.get('/download', async (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) {
        return res.status(400).send('video url is required.');
    }

    try {
        console.log(`fetching metadata for: ${videoURL}`);
        const metadata = await ytDlpWrap.getVideoInfo(videoURL);
        const filename = `${metadata.title}.mp4`.replace(/[/\\?%*:|"<>]/g, '-'); // sanitize the filename

        console.log(`starting stream for: ${filename}`);
        
        // set headers to tell the browser this is a file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'video/mp4');

        // get the video stream and pipe it directly to the user
        const videoStream = ytDlpWrap.execStream([
            videoURL,
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', // request best mp4 format
            '-o', '-' // output to standard stream
        ]);
        
        videoStream.pipe(res);

        videoStream.on('error', (err) => {
            console.error('stream error:', err);
            if (!res.headersSent) {
                res.status(500).send('error during video stream.');
            }
        });

        videoStream.on('close', () => {
            console.log('stream finished for:', filename);
        });

    } catch (error) {
        console.error('yt-dlp error:', error);
        if (!res.headersSent) {
            res.status(500).send(`error processing video: ${error.message}`);
        }
    }
});

app.listen(port, () => {
    console.log(`server is listening on port ${port}`);
});
