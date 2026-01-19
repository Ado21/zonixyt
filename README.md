# Zonix YouTube Downloader

Extractor de URLs directas de descarga para YouTube en JavaScript ES Modules.

## 🚀 Características

- URLs directas para video, audio y muxed (video+audio)
- ES Modules
- JSON limpio de salida

## 📦 Instalación

```bash
npm install zonix-youtube-downloader
```

## ✅ Uso rápido (CLI)

```bash
node get-json.js dQw4w9WgXcQ 720 h264
```

Salida JSON incluye:

- `videoWithAudioUrl`
- `downloads.video.url`
- `downloads.audio.url`

## ✅ Uso en JavaScript (ESM)

```javascript
import YouTubeScraper from 'zonix-youtube-downloader';

const scraper = new YouTubeScraper();
const videoId = scraper.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

const data = await scraper.getDownloadUrls(videoId, { quality: '720', codec: 'h264' });

console.log({
  videoWithAudioUrl: data.muxed?.url || null,
  videoUrl: data.video.url,
  audioUrl: data.audio.url
});
```

## 🔌 Plugin handler (ESM)

```javascript
import YouTubeScraper from 'zonix-youtube-downloader';

const scraper = new YouTubeScraper();

export async function handler(input = {}) {
  const url = input.url || '';
  const quality = input.quality || '720';
  const codec = input.codec || 'h264';

  if (!url) {
    return { status: 400, json: { success: false, error: 'missing_url' } };
  }

  const videoId = scraper.extractVideoId(url);
  const info = await scraper.getDownloadUrls(videoId, { quality, codec });

  return {
    status: 200,
    json: {
      success: true,
      videoWithAudioUrl: info.muxed ? info.muxed.url : null,
      videoUrl: info.video.url,
      audioUrl: info.audio.url
    }
  };
}
```

## 🧩 Notas

- `videoWithAudioUrl` es un stream combinado (muxed) y suele ser menor calidad.
- Para máxima calidad usa `videoUrl` + `audioUrl` y combina con FFmpeg.
    codec: 'h264',  // Usa M4A para mejor compatibilidad
    outputDir: './musica',
    format: 'm4a'
});
```

### Ejemplo 3: Procesar múltiples videos

```javascript
const scraper = new YouTubeScraper();
const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', '9bZkp7q19f0'];

for (const videoId of videoIds) {
    try {
        await scraper.downloadAudio(videoId, {
            codec: 'h264',
            outputDir: './playlist'
        });
        
        // Esperar un poco entre descargas
        await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
        console.error(`Error con ${videoId}:`, error.message);
    }
}
```

## 🔄 Combinar video y audio con FFmpeg

Después de descargar video y audio por separado, puedes combinarlos con FFmpeg:

```bash
# MP4 (H264)
ffmpeg -i video.mp4 -i audio.m4a -c copy output.mp4

# WebM (VP9)
ffmpeg -i video.webm -i audio.opus -c copy output.webm

# Convertir a MP3
ffmpeg -i audio.m4a -codec:a libmp3lame -qscale:a 2 audio.mp3
```

## 📊 Opciones de configuración

### Calidades disponibles

| Opción | Resolución |
|--------|-----------|
| `144`  | 256x144   |
| `240`  | 426x240   |
| `360`  | 640x360   |
| `480`  | 854x480   |
| `720`  | 1280x720  |
| `1080` | 1920x1080 |
| `1440` | 2560x1440 |
| `2160` | 3840x2160 (4K) |
| `4320` | 7680x4320 (8K) |
| `max`  | Máxima disponible |

### Códecs

| Códec  | Video | Audio | Contenedor | Mejor para |
|--------|-------|-------|-----------|-----------|
| `h264` | AVC1  | M4A   | MP4       | Compatibilidad universal |
| `vp9`  | VP9   | OPUS  | WebM      | Balance calidad/tamaño |
| `av1`  | AV01  | OPUS  | WebM      | Mejor compresión (más lento) |

### Clientes de YouTube

| Cliente | Descripción | Cifrado |
|---------|-------------|---------|
| `IOS` | Cliente iOS (por defecto) | No |
| `ANDROID` | Cliente Android | No |
| `WEB_EMBEDDED` | Cliente web embebido | Sí |

## 🛠️ Arquitectura técnica

Este scraper utiliza:

1. **youtubei.js**: Librería que interactúa con la API interna de YouTube (InnerTube)
2. **axios**: Para realizar peticiones HTTP y descargar archivos
3. **cheerio**: Disponible para parsear HTML si se necesita (no se usa actualmente)

### Flujo de trabajo

```
1. Extraer ID del video
2. Inicializar cliente de YouTube (Innertube)
3. Obtener información básica del video
4. Analizar formatos disponibles (adaptive_formats)
5. Ordenar y filtrar por códec
6. Seleccionar mejor video y audio
7. Descifrar URLs si es necesario
8. Descargar archivos con axios
```

## ⚠️ Limitaciones y notas

- **Videos privados**: No se pueden descargar videos privados
- **Videos con DRM**: No soporta videos con protección DRM
- **Límites de YouTube**: Respetar los términos de servicio de YouTube
- **FFmpeg requerido**: Para combinar video+audio o convertir a MP3
- **Rate limiting**: Implementar delays entre múltiples descargas

## 📝 Basado en

Este proyecto está basado en el análisis del código de [cobalt](https://github.com/imputnet/cobalt), específicamente:

- `/api/src/processing/services/youtube.js` - Lógica de extracción de YouTube
- `/api/src/stream/` - Manejo de streams
- `/api/src/processing/match.js` - Procesamiento de URLs

## 🤝 Contribuir

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama con tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - Siéntete libre de usar este código para tus proyectos.

## ⚖️ Aviso legal

Este scraper es solo para fines educativos. Asegúrate de cumplir con:

- Los términos de servicio de YouTube
- Las leyes de derechos de autor de tu país
- No usar para redistribución comercial
- Respetar la propiedad intelectual de los creadores

## 🐛 Solución de problemas

### Error: "This video is unavailable"
- El video puede ser privado o restringido por región
- Intenta con un cliente diferente (`client: 'ANDROID'`)

### Error: "No se encontró formato de video disponible"
- El video puede no tener el códec solicitado
- Prueba con codec: 'h264' que está más disponible

### Descarga lenta
- YouTube puede estar limitando la velocidad
- Implementa delays entre descargas múltiples

### FFmpeg no disponible
- Instala FFmpeg: https://ffmpeg.org/download.html
- Agrega FFmpeg al PATH del sistema

## 📞 Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa la sección de solución de problemas
2. Verifica que todas las dependencias estén instaladas
3. Comprueba que la versión de Node.js sea >= 18

---

**Hecho con ❤️ basado en el análisis de cobalt**
