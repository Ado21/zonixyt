import fs from 'fs';
import axios from 'axios';
import { Innertube } from 'youtubei.js';

const VIDEO_QUALITIES = [144, 240, 360, 480, 720, 1080, 1440, 2160, 4320];

const CODEC_LIST = {
    h264: {
        videoCodec: "avc1",
        audioCodec: "mp4a",
        container: "mp4"
    },
    av1: {
        videoCodec: "av01",
        audioCodec: "opus",
        container: "webm"
    },
    vp9: {
        videoCodec: "vp9",
        audioCodec: "opus",
        container: "webm"
    }
};

const CLIENTS_WITHOUT_CIPHER = ['IOS', 'ANDROID', 'YTSTUDIO_ANDROID', 'YTMUSIC_ANDROID'];

/**
 * Clase principal del scraper de YouTube
 */
class YouTubeScraper {
    constructor() {
        this.innertube = null;
        this.lastRefreshedAt = null;
        this.PLAYER_REFRESH_PERIOD = 1000 * 60 * 15;
    }

    /**
     * Inicializa la instancia de Innertube
     */
    async initialize() {
        if (!this.innertube || this.shouldRefreshPlayer()) {
            this.innertube = await Innertube.create({
                retrieve_player: true,
            });
            this.lastRefreshedAt = Date.now();
        }
    }

    /**
     * Verifica si es necesario refrescar el player
     */
    shouldRefreshPlayer() {
        if (!this.lastRefreshedAt) return true;
        return this.lastRefreshedAt + this.PLAYER_REFRESH_PERIOD < Date.now();
    }

    /**
     * Extrae el ID del video desde diferentes formatos de URL
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        // Si no coincide con patrones conocidos pero parece un ID válido
        if (url.length === 11) return url;

        throw new Error('URL de YouTube inválida o ID no encontrado');
    }

    /**
     * Normaliza la calidad del video al valor más cercano disponible
     */
    normalizeQuality(resolution) {
        const shortestSide = Math.min(resolution.height, resolution.width);
        return VIDEO_QUALITIES.find(qual => qual >= shortestSide) || VIDEO_QUALITIES[VIDEO_QUALITIES.length - 1];
    }

    /**
     * Obtiene información básica del video
     */
    async getVideoInfo(videoId, options = {}) {
        await this.initialize();

        const clientType = options.client || 'IOS';
        
        const hasStreamingUrls = (candidate) => {
            const formats = candidate?.streaming_data?.adaptive_formats || [];
            return formats.some((format) => format?.url || format?.signature_cipher || format?.cipher);
        };

        try {
            const clientsToTry = [clientType, clientType === 'IOS' ? 'WEB' : 'IOS'];
            let info;
            let lastError;

            for (const client of clientsToTry) {
                try {
                    info = await this.innertube.getBasicInfo(videoId, { client });
                    if (info?.streaming_data) break;
                } catch (err) {
                    lastError = err;
                }
            }

            if (!info) {
                throw lastError || new Error('No se pudo obtener información del video');
            }

            if (!hasStreamingUrls(info)) {
                for (const client of clientsToTry) {
                    try {
                        info = await this.innertube.getInfo(videoId, { client });
                        if (hasStreamingUrls(info)) break;
                    } catch (err) {
                        lastError = err;
                    }
                }
            }
            
            const playability = info.playability_status;
            
            if (playability?.status === 'LOGIN_REQUIRED') {
                throw new Error('Este video requiere iniciar sesión');
            }
            
            if (playability?.status === 'UNPLAYABLE') {
                if (playability.reason?.includes('private')) {
                    throw new Error('Este video es privado');
                }
                throw new Error(`Video no disponible: ${playability.reason || 'Razón desconocida'}`);
            }

            if (!info.streaming_data) {
                throw new Error('No se pudo obtener información de streaming');
            }

            if (!hasStreamingUrls(info)) {
                throw new Error('No se pudieron obtener URLs/cipher de streaming');
            }

            const basicInfo = info.basic_info;
            return info;

        } catch (error) {
            if (error.message?.includes('This video is unavailable')) {
                throw new Error('Este video no está disponible');
            }
            throw error;
        }
    }

    /**
     * Obtiene URL de descarga desde un formato de youtubei.js
     */
    getFormatUrl(format) {
        if (!format) return undefined;

        if (format.url) return format.url;

        if (format.signature_cipher || format.cipher) {
            try {
                return format.decipher(this.innertube?.session?.player);
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    selectMuxedFormat(info, quality) {
        const formats = info?.streaming_data?.formats || [];
        const muxed = formats.filter((format) => format.has_audio && format.has_video);
        if (!muxed.length) return undefined;

        const targetQuality = quality === 'max' ? 9000 : Number(quality);

        const ranked = muxed
            .sort((a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0));

        const preferred = ranked.find((format) => {
            if (!format.width || !format.height) return false;
            const normalized = this.normalizeQuality({ width: format.width, height: format.height });
            return normalized === targetQuality;
        });

        return preferred || ranked[0];
    }

    /**
     * Organiza y filtra los formatos disponibles por códec
     * Basado en la lógica de cobalt/api/src/processing/services/youtube.js
     */
    organizeFormats(info, codec = 'h264', itag = null) {
        const sortedFormats = {
            h264: { video: [], audio: [], bestVideo: null, bestAudio: null },
            vp9: { video: [], audio: [], bestVideo: null, bestAudio: null },
            av1: { video: [], audio: [], bestVideo: null, bestAudio: null }
        };

        const checkFormat = (format, codec) => {
            return format.content_length && (
                format.mime_type.includes(CODEC_LIST[codec].videoCodec) ||
                format.mime_type.includes(CODEC_LIST[codec].audioCodec)
            );
        };

        const formats = info.streaming_data.adaptive_formats || [];
        
        formats.sort((a, b) => Number(b.bitrate) - Number(a.bitrate))
            .forEach(format => {
                Object.keys(CODEC_LIST).forEach(codecKey => {
                    if (!checkFormat(format, codecKey)) return;

                    const matchingItag = (slot) => !itag?.[slot] || itag[slot] === format.itag;
                    const sorted = sortedFormats[codecKey];

                    if (format.has_video && matchingItag('video')) {
                        sorted.video.push(format);
                        if (!sorted.bestVideo) {
                            sorted.bestVideo = format;
                        }
                    }

                    if (format.has_audio && matchingItag('audio')) {
                        sorted.audio.push(format);
                        if (!sorted.bestAudio) {
                            sorted.bestAudio = format;
                        }
                    }
                });
            });

        return sortedFormats;
    }

    /**
     * Selecciona el mejor formato de video según calidad y códec
     * Implementa fallbacks automáticos como cobalt
     */
    selectVideoFormat(sortedFormats, codec, quality) {
        let formats = sortedFormats[codec];
        
        const noBestMedia = () => {
            const vid = sortedFormats[codec]?.bestVideo;
            return !vid;
        };

        if (noBestMedia()) {
            if (codec === 'av1') codec = 'vp9';
            else if (codec === 'vp9') codec = 'av1';

            if (noBestMedia()) codec = 'h264';
        }

        formats = sortedFormats[codec];

        if (!formats.bestVideo) {
            throw new Error('No se encontró formato de video disponible');
        }

        const qualityNum = quality === 'max' ? 9000 : Number(quality);
        
        const bestQuality = this.normalizeQuality({
            width: formats.bestVideo.width,
            height: formats.bestVideo.height
        });

        const useBestQuality = qualityNum >= bestQuality;

        let video = useBestQuality 
            ? formats.bestVideo
            : formats.video.find(v => {
                const vQuality = this.normalizeQuality({
                    width: v.width,
                    height: v.height
                });
                return vQuality === qualityNum;
            });

        if (!video) {
            video = formats.bestVideo;
        }

        return { video, codec };
    }

    /**
     * Extrae URLs de descarga para video y audio
     * Implementa la misma lógica de selección que cobalt
     */
    async geturls(urlOrId, options = {}) {
        const videoId = this.extractVideoId(urlOrId);

        if (options.quality && typeof options.quality === 'string' && options.quality.endsWith('p')) {
            options.quality = options.quality.slice(0, -1);
        }

        const {
            quality = '720',
            codec = 'h264',
            audioOnly = false,
            client = 'IOS',
            dubLang = null,
            itag = null,
            _retry = false
        } = options;

        const info = await this.getVideoInfo(videoId, { client });
        const basicInfo = info.basic_info;
        const sortedFormats = this.organizeFormats(info, codec, itag);

        let result = {
            videoId,
            title: basicInfo.title?.trim(),
            author: basicInfo.author?.replace('- Topic', '').trim(),
            duration: basicInfo.duration,
            thumbnail: basicInfo.thumbnail?.[0]?.url,
            description: basicInfo.short_description,
        };

        let muxedFormat = this.selectMuxedFormat(info, quality);
        let muxedUrl = this.getFormatUrl(muxedFormat);

        if (!muxedUrl && client !== 'ANDROID') {
            const muxedInfo = await this.getVideoInfo(videoId, { client: 'ANDROID' });
            muxedFormat = this.selectMuxedFormat(muxedInfo, quality);
            muxedUrl = this.getFormatUrl(muxedFormat);
        }

        if (!muxedUrl && client !== 'WEB') {
            const muxedInfo = await this.getVideoInfo(videoId, { client: 'WEB' });
            muxedFormat = this.selectMuxedFormat(muxedInfo, quality);
            muxedUrl = this.getFormatUrl(muxedFormat);
        }

        if (muxedFormat && muxedUrl) {
            result.muxed = {
                url: muxedUrl,
                format: muxedFormat.mime_type?.includes('mp4') ? 'mp4' : 'webm',
                quality: muxedFormat.quality_label,
                resolution: muxedFormat.width && muxedFormat.height ? `${muxedFormat.width}x${muxedFormat.height}` : undefined,
                bitrate: muxedFormat.bitrate,
                mimeType: muxedFormat.mime_type,
                contentLength: muxedFormat.content_length,
                fps: muxedFormat.fps,
                itag: muxedFormat.itag
            };
        }

        if (basicInfo?.short_description?.startsWith("Provided to YouTube by")) {
            const descItems = basicInfo.short_description.split("\n\n", 5);
            if (descItems.length === 5) {
                result.album = descItems[2];
                result.copyright = descItems[3];
                if (descItems[4].startsWith("Released on:")) {
                    result.releaseDate = descItems[4].replace("Released on: ", '').trim();
                }
            }
        }

        if (audioOnly) {
            let audioFormat = sortedFormats[codec]?.bestAudio;
            
            if (audioFormat?.audio_track && !audioFormat?.is_original) {
                audioFormat = sortedFormats[codec].audio.find(i => i?.is_original);
            }

            if (dubLang) {
                const dubbedAudio = sortedFormats[codec].audio.find(i =>
                    i.language?.startsWith(dubLang) && i.audio_track
                );
                if (dubbedAudio && !dubbedAudio?.is_original) {
                    audioFormat = dubbedAudio;
                    result.dubLanguage = dubbedAudio.language;
                }
            }

            if (!audioFormat) {
                audioFormat = sortedFormats.h264?.bestAudio;
            }

            if (!audioFormat) {
                throw new Error('No se encontró formato de audio');
            }

            const audioUrl = this.getFormatUrl(audioFormat);
            if (!audioUrl) {
                if (!_retry) {
                    const fallbackClient = client === 'IOS' ? 'WEB' : 'IOS';
                    return this.geturls(videoId, {
                        ...options,
                        client: fallbackClient,
                        _retry: true
                    });
                }
                throw new Error('No se pudo obtener la URL de audio');
            }

            const audioExt = codec === 'h264' ? 'm4a' : 'opus';

            result.audio = {
                url: audioUrl,
                format: audioExt,
                bitrate: audioFormat.bitrate,
                mimeType: audioFormat.mime_type,
                contentLength: audioFormat.content_length,
                quality: audioFormat.audio_quality,
                itag: audioFormat.itag
            };

            let cover = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
            try {
                const coverRes = await axios.head(cover);
                if (coverRes.status !== 200) {
                    cover = basicInfo.thumbnail?.[0]?.url;
                }
            } catch {
                cover = basicInfo.thumbnail?.[0]?.url;
            }
            
            result.cover = cover;
            return result;
        }

        const { video: videoFormat, codec: finalCodec } = this.selectVideoFormat(
            sortedFormats,
            codec,
            quality
        );

        let audioFormat = sortedFormats[finalCodec]?.bestAudio;

        if (audioFormat?.audio_track && !audioFormat?.is_original) {
            audioFormat = sortedFormats[finalCodec].audio.find(i => i?.is_original);
        }

        if (dubLang) {
            const dubbedAudio = sortedFormats[finalCodec].audio.find(i =>
                i.language?.startsWith(dubLang) && i.audio_track
            );
            if (dubbedAudio && !dubbedAudio?.is_original) {
                audioFormat = dubbedAudio;
                result.dubLanguage = dubbedAudio.language;
            }
        }

        if (!videoFormat || !audioFormat) {
            throw new Error('No se encontraron formatos de video/audio compatibles');
        }

        if (videoFormat.drm_families || audioFormat.drm_families) {
            throw new Error('Este video tiene protección DRM y no puede descargarse');
        }

        const videoUrl = this.getFormatUrl(videoFormat);
        const audioUrl = this.getFormatUrl(audioFormat);
        if (!videoUrl || !audioUrl) {
            if (!_retry) {
                const fallbackClient = client === 'IOS' ? 'WEB' : 'IOS';
                return this.geturls(videoId, {
                    ...options,
                    client: fallbackClient,
                    _retry: true
                });
            }
            throw new Error('No se pudieron obtener las URLs de descarga. El formato puede no estar disponible.');
        }

        const actualQuality = this.normalizeQuality({
            width: videoFormat.width,
            height: videoFormat.height
        });

        result.video = {
            url: videoUrl,
            directUrl: videoUrl,
            format: CODEC_LIST[finalCodec].container,
            codec: finalCodec,
            quality: `${actualQuality}p`,
            resolution: `${videoFormat.width}x${videoFormat.height}`,
            bitrate: videoFormat.bitrate,
            mimeType: videoFormat.mime_type,
            contentLength: videoFormat.content_length,
            fps: videoFormat.fps,
            itag: videoFormat.itag
        };

        result.audio = {
            url: audioUrl,
            directUrl: audioUrl,
            format: finalCodec === 'h264' ? 'm4a' : 'opus',
            bitrate: audioFormat.bitrate,
            mimeType: audioFormat.mime_type,
            contentLength: audioFormat.content_length,
            quality: audioFormat.audio_quality,
            itag: audioFormat.itag
        };

        return result;
    }

    /**
     * Descarga un archivo desde una URL
     */
    async downloadFile(url, outputPath, label = 'archivo') {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                resolve(outputPath);
            });
            writer.on('error', reject);
        });
    }

    /**
     * Descarga video y audio por separado
     */
    async downloadVideoAndAudio(videoId, options = {}) {
        const {
            quality = '720',
            codec = 'h264',
            outputDir = './downloads',
            client = 'IOS'
        } = options;

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const data = await this.geturls(videoId, { quality, codec, client });
        
        const safeTitle = data.title
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);

        const videoPath = `${outputDir}/${safeTitle}_video.${data.video.format}`;
        const audioPath = `${outputDir}/${safeTitle}_audio.${data.audio.format}`;

        await this.downloadFile(data.video.url, videoPath, 'video');
        await this.downloadFile(data.audio.url, audioPath, 'audio');

        return { videoPath, audioPath, data };
    }

    /**
     * Descarga solo audio
     */
    async downloadAudio(videoId, options = {}) {
        const {
            codec = 'h264',
            outputDir = './downloads',
            client = 'IOS',
            format = 'm4a'
        } = options;

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const data = await this.geturls(videoId, { 
            audioOnly: true, 
            codec, 
            client 
        });
        
        const safeTitle = data.title
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);

        const audioPath = `${outputDir}/${safeTitle}.${data.audio.format}`;

        await this.downloadFile(data.audio.url, audioPath, 'audio');

        if (format === 'mp3' && data.audio.format !== 'mp3') {
            return { audioPath, data, convertMp3Command: `ffmpeg -i "${audioPath}" -codec:a libmp3lame -qscale:a 2 "${outputDir}/${safeTitle}.mp3"` };
        }
        return { audioPath, data };
    }

    /**
     * Obtiene solo información del video sin descargar
     */
    async getInfo(videoId, options = {}) {
        const data = await this.geturls(videoId, options);
        return data;
    }
}

export default YouTubeScraper;
