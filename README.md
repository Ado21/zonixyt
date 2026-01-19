# ⚡ Zonix YouTube Downloader

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange.svg?style=for-the-badge)
![Author](https://img.shields.io/badge/author-Ado-purple.svg?style=for-the-badge)

**El extractor de YouTube definitivo. Rápido, Robusto y Moderno.**

</div>

---

## 🚀 Introducción

**Zonix** no es otro scraper más. Es una solución de ingeniería inversa diseñada meticulosamente para obtener **URLs de descarga directa** de YouTube, incluyendo streams 'muxed' (audio + video combinados) que otras librerías ignoran.

Construido sobre una arquitectura inteligente de **Multicliente Fallback** (iOS, Android, Web), Zonix garantiza el acceso a los formatos más difíciles de conseguir, evitando bloqueos y restricciones de velocidad.

## ✨ Características Principales

- 🔓 **Bypass de Cipher/Signature**: Decodificación nativa de firmas de YouTube.
- 🎬 **Soporte Muxed Nativo**: Obtiene enlaces con Audio y Video combinados (listos para reproducir).
- ⚡ **Velocidad sin límites**: Evasión de throttling mediante clientes móviles.
- 🛠️ **Arquitectura Robusta**: Estrategia de fallback automática (iOS → Web → Android).
- 📦 **100% JSON Output**: Ideal para microservicios y APIs REST.
- 🔧 **Filtrado Avanzado**: Selecciona codec (h264, vp9, av1) y calidad (144p - 4k).
- 💻 **ES Modules**: Código moderno y limpio compatible con los estándares actuales.

## 📦 Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/Ado21/zonixyt.git
cd zonixyt
npm install
```

## 💻 Uso CLI (Línea de Comandos)

Zonix incluye una herramienta CLI potente diseñada para pipelines de datos. La salida es siempre un JSON puro y válido.

**Sintaxis:**
```bash
node get-json.js <VIDEO_ID> [CALIDAD] [CODEC]
```

**Ejemplo:**
```bash
node get-json.js dQw4w9WgXcQ 1080 h264
```

**Salida (Ejemplo):**
```json
{
  "success": true,
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "author": "Rick Astley",
  "durationFormatted": "3:32",
  "videoWithAudioUrl": "https://rr3---sn-...",
  "downloads": {
    "video": { "url": "...", "quality": "1080p", "codec": "h264" },
    "audio": { "url": "...", "codec": "mp4a" }
  }
}
```

## 📚 Uso como Librería

Integra Zonix en tu backend Node.js con facilidad.

```javascript
import YouTubeScraper from './youtube-scraper.js';

const scraper = new YouTubeScraper();

// 1. Iniciar extracción
console.log("🔍 Analizando video...");
const data = await scraper.getDownloadUrls('dQw4w9WgXcQ', {
    quality: '720', // '1080', '720', '480', etc.
    codec: 'h264'   // 'h264', 'av1', 'vp9'
});

// 2. Usar los datos
if (data.muxed) {
    console.log(`✅ Video con Audio encontrado: ${data.muxed.url}`);
} else {
    console.log("⚠️ Solo streams separados disponibles");
}
```

## 🔧 Configuración Avanzada

### Calidades Soportadas
| Calidad | Valor |
|---------|-------|
| 4K      | `2160`|
| 1440p   | `1440`|
| 1080p   | `1080`|
| 720p    | `720` |
| 480p    | `480` |
| 360p    | `360` |

### Codecs
- **h264** (Recomendado para máxima compatibilidad .mp4)
- **vp9** (Mejor compresión, común en WebM)
- **av1** (Nueva generación, alta eficiencia)

## 🏗️ Arquitectura Interna

Zonix utiliza un sistema de **"Client Hopping"**:

1.  **Intento Primario (iOS)**: Busca formatos MP4 estándar de alta compatibilidad.
2.  **Fallback (Web)**: Si falla, consulta la API Web estándar.
3.  **Deep Search (Android)**: Para streams difíciles o formatos específicos, utiliza la API de Android que suele exponer streams pre-combinados (muxed).

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir cambios mayores.

## 📝 Licencia

Este proyecto está bajo la Licencia MIT.
Creado con ❤️ por **Ado**.

---
<div align="center">
  <sub>Zonix Project 2026</sub>
</div>
