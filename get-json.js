import YouTubeScraper from './youtube-scraper.js';

const scraper = new YouTubeScraper();
const videoId = process.argv[2] || 'dQw4w9WgXcQ';
const quality = process.argv[3] || '720';
const codec = process.argv[4] || 'h264';

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
console.log = () => {};
console.error = () => {};
console.warn = () => {};

try {
    const info = await scraper.getDownloadUrls(videoId, { quality, codec });
    
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    const output = {
        success: true,
        videoId: info.videoId,
        title: info.title,
        author: info.author,
        duration: info.duration,
        durationFormatted: `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}`,
        thumbnail: String(info.thumbnail),
        videoWithAudioUrl: info.muxed ? String(info.muxed.url) : null,
        downloads: {
            videoWithAudio: info.muxed ? {
                url: String(info.muxed.url),
                format: info.muxed.format,
                quality: info.muxed.quality,
                resolution: info.muxed.resolution,
                size: info.muxed.contentLength ? Math.round(info.muxed.contentLength / (1024 * 1024)) + ' MB' : undefined,
                sizeBytes: info.muxed.contentLength,
                bitrate: info.muxed.bitrate,
                fps: info.muxed.fps,
                itag: info.muxed.itag,
                mimeType: info.muxed.mimeType
            } : null,
            video: {
                url: String(info.video.url || info.video.directUrl),
                quality: info.video.quality,
                resolution: info.video.resolution,
                codec: info.video.codec,
                format: info.video.format,
                size: Math.round(info.video.contentLength / (1024 * 1024)) + ' MB',
                sizeBytes: info.video.contentLength,
                bitrate: info.video.bitrate,
                fps: info.video.fps,
                itag: info.video.itag,
                mimeType: info.video.mimeType
            },
            audio: {
                url: String(info.audio.url || info.audio.directUrl),
                format: info.audio.format,
                quality: info.audio.quality,
                size: Math.round(info.audio.contentLength / (1024 * 1024)) + ' MB',
                sizeBytes: info.audio.contentLength,
                bitrate: info.audio.bitrate,
                itag: info.audio.itag,
                mimeType: info.audio.mimeType
            }
        },
        totalSize: Math.round((info.video.contentLength + info.audio.contentLength) / (1024 * 1024)) + ' MB',
        totalSizeBytes: info.video.contentLength + info.audio.contentLength,
        extractedAt: new Date().toISOString(),
        note: "URLs válidas por ~6 horas. Descargar directamente desde Google CDN."
    };
    
    if (info.album) output.album = info.album;
    if (info.copyright) output.copyright = info.copyright;
    if (info.releaseDate) output.releaseDate = info.releaseDate;
    if (info.dubLanguage) output.dubLanguage = info.dubLanguage;
    
    console.log(JSON.stringify(output, null, 2));
    
} catch (error) {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    const errorOutput = {
        success: false,
        error: error.message,
        videoId: videoId
    };
    console.log(JSON.stringify(errorOutput, null, 2));
    process.exit(1);
}
