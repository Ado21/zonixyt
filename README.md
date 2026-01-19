<h1 align="center">
 <span style="color:#FF0000;">[🐢] Zonix</span> <span style="color:#FFFFFF;">YouTube Downloader</span>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Versión-1.1.0-FF0000?style=for-the-badge&logo=youtube&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Estado-Estable-00FFAA?style=for-the-badge" />
</p>

---
⊹ **Zonix** es una herramienta avanzada de ingeniería inversa para obtener **URLs de descarga directa** de YouTube, con soporte nativo para streams muxed (audio + video) y evasión de throttling.

> [!IMPORTANT]  
> Este proyecto está diseñado para ser rápido, robusto y evitar restricciones de velocidad mediante múltiples clientes (iOS, Android, Web).

---

## ⟩ Requisitos

- **Node.js** (v18 o superior)
- **Git**

---

# ⊹ Instalación

> [!NOTE] 
> Copia y pega los comandos en tu terminal uno por uno.

```bash
git clone https://github.com/Ado21/zonixyt.git
```

```bash
cd zonixyt
```

```bash
npm install
```

---

# ✜ Uso (CLI)

Ejecuta el script directamente para obtener un JSON limpio y estructurado.

```bash
node json.js <URL_VIDEO> [CALIDAD]
```

**Ejemplo:**
```bash
node json.js https://www.youtube.com/watch?v=dQw4w9WgXcQ 1080p
```
*También funciona con links de Shorts.*

> [!WARNING] 
> La salida es un JSON puro. Asegúrate de manejar la respuesta (stdout) en tu aplicación.

---

# ✜ Uso como Librería

Integra la potencia de Zonix en tus propios proyectos de Node.js.

```javascript
import znixdl from 'zonixyt';

const scraper = new znixdl();

const data = await scraper.geturls('https://youtube.com/shorts/m1of-EZyPEQ?si=UjUbkhdHs4KFns8r', {
    quality: '1080p'
});

console.log(data.muxed.url); // URL lista para usar
```

---

## 🐣 Autor

<p align="center">
  <a href="https://github.com/Ado21">
    <img src="https://github.com/Ado21.png" width="220" height="220" alt="Ado" style="border-radius: 20px;" />
  </a>
</p>

---

## ✰ Licencia
Derechos reservados por Ado
