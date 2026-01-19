import YouTubeScraper from './youtube-scraper.js';

const scraper = new YouTubeScraper();

export async function handler(input = {}) {
    const url = input.url || '';
    const quality = input.quality || '720';
    const codec = input.codec || 'h264';

    if (!url) {
        return {
            status: 400,
            json: {
                success: false,
                error: 'missing_url'
            }
        };
    }

    const videoId = scraper.extractVideoId(url);
    const info = await scraper.getDownloadUrls(videoId, { quality, codec });

    return {
        status: 200,
        json: {
            success: true,
            videoId: info.videoId,
            title: info.title,
            author: info.author,
            duration: info.duration,
            thumbnail: info.thumbnail,
            videoWithAudioUrl: info.muxed ? info.muxed.url : null,
            downloads: {
                videoWithAudio: info.muxed ? {
                    url: info.muxed.url,
                    format: info.muxed.format,
                    quality: info.muxed.quality,
                    resolution: info.muxed.resolution,
                    sizeBytes: info.muxed.contentLength
                } : null,
                video: {
                    url: info.video.url,
                    quality: info.video.quality,
                    resolution: info.video.resolution,
                    codec: info.video.codec,
                    format: info.video.format,
                    sizeBytes: info.video.contentLength
                },
                audio: {
                    url: info.audio.url,
                    format: info.audio.format,
                    quality: info.audio.quality,
                    sizeBytes: info.audio.contentLength
                }
            }
        }
    };
}

export default handler;
