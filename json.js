import znixdl from './core/zonix.js';

const scraper = new znixdl();
const url = process.argv[2] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const quality = process.argv[3] || '720p';
const codec = process.argv[4] || 'h264';

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
console.log = () => {};
console.error = () => {};
console.warn = () => {};

try {
    const data = await scraper.geturls(url, { quality, codec });
    
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    const output = {
        success: true,
        videoId: data.videoId,
        title: data.title,
        author: data.author,
        duration: data.duration,
        durationFormatted: `${Math.floor(data.duration / 60)}:${String(data.duration % 60).padStart(2, '0')}`,
        thumbnail: String(data.thumbnail),
        videoWithAudioUrl: data.muxed ? String(data.muxed.url) : null,
        downloads: {
            video: data.video ? {
                url: String(data.video.url),
                quality: data.video.quality,
                codec: data.video.codec,
                size: data.video.contentLength
            } : null,
            audio: data.audio ? {
                url: String(data.audio.url),
                codec: data.audio.mimeType,
                size: data.audio.contentLength
            } : null
        }
    };
    
    console.log(JSON.stringify(output, null, 2));
} catch (error) {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.error(JSON.stringify({
        success: false,
        error: error.message
    }, null, 2));
    process.exit(1);
}
