# StreamBert — Plugin para Kino

<p align="center">
  <img src="icon.png" width="128" height="128" alt="StreamBert Icon" />
</p>

Plugin oficial de **StreamBert** para [Kino](https://kinotvapp.github.io/kino-plugins/). Integra el catálogo cinematográfico y televisivo global con la arquitectura de extracción multi-servidor de Streambert y una interfaz interactiva basada en **Kino Screen**.

---

## Características

- **Pantalla interactiva (Screen)**:
  - Navegación nativa con `navigationBar` de 4 pestañas: **Inicio**, **Películas**, **Series** y **Ajustes**.
  - `heroCard` en pantalla de inicio con fondo cinemático, sinopsis y botones de reproducción directa o ficha técnica.
  - Carruseles horizontales `titleRail` categorizados por tendencias, estrenos, mejor valoradas y anime.
  - Fusión de barra de navegación nativa con `mergeWithKinoBar: true` para una experiencia inmersiva.
- **Resolución Multi-Fuente**:
  - Fuentes de extracción configurables: **Vidfast** (predeterminada), **VidSrc**, **Vidlove**, **Aether** y **Vidrift**.
  - Fallback automático si un servidor se encuentra saturado o bloqueado.
- **Integración con Kino Resolver**:
  - Conexión opcional con el plugin `xuper-plugin/kino-plugin-kino-resolver` para resolución acelerada de hosters conocidos (Tier-0) sin abrir el navegador.
- **Ajustes en vivo**:
  - Cambio instantáneo de proveedor preferido e idioma de subtítulos desde la propia pantalla o desde Ajustes de Kino.

---

## Instalación en Kino

1. En la app de Kino (en Android TV, Fire TV, móvil o PC), ve a **Ajustes ▸ Plugins**.
2. Selecciona **Instalar desde URL** (icono `+`).
3. Introduce la URL del repositorio:
   ```text
   https://github.com/JuanDEVYT/kino-plugin-streambert
   ```
4. Acepta los permisos de red y reproductor web.

---

## Estructura del plugin

```text
├── kino-plugin.json   # Manifiesto (apiVersion 20, screen, browser, hosts)
├── plugin.js          # Lógica completa: home, search, browse, episodes, resolve, screen, screenEvent
├── icon.png           # Icono oficial de Streambert (512x512)
├── fixtures/          # Fixtures de TMDB para pruebas sin conexión
└── test/              # Pruebas unitarias ejecutadas con Node.js Test Runner
```

---

## Licencia

MIT
