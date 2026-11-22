// StreamBert Plugin para Kino
// Inspirado en la arquitectura multi-fuente de Streambert Desktop

const TMDB_IMAGE_W500 = "https://image.tmdb.org/t/p/w500";
const TMDB_IMAGE_W1280 = "https://image.tmdb.org/t/p/w1280";

// Normalización de ítems TMDB para Kino
function toKinoItem(item, defaultKind = "movie") {
  if (!item || !item.id) return null;

  let kind = defaultKind;
  if (item.media_type === "tv") {
    kind = "series";
  } else if (item.media_type === "movie") {
    kind = "movie";
  } else if (item.first_air_date && !item.release_date) {
    kind = "series";
  } else if (item.release_date && !item.first_air_date) {
    kind = "movie";
  } else if (item.name && !item.title) {
    kind = "series";
  } else if (item.title && !item.name) {
    kind = "movie";
  }

  const title = (item.title || item.name || "").trim();
  if (!title) return null;
  // Descartar ítems sin imagen o sin ficha gráfica completa en TMDB
  if (!item.poster_path && !item.backdrop_path) return null;

  const dateStr = item.release_date || item.first_air_date || "";
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : undefined;
  const poster = item.poster_path ? `${TMDB_IMAGE_W500}${item.poster_path}` : undefined;
  const backdrop = item.backdrop_path ? `${TMDB_IMAGE_W1280}${item.backdrop_path}` : undefined;
  const rating = typeof item.vote_average === "number" ? Math.round(item.vote_average * 10) / 10 : undefined;

  const refObj = {
    id: item.id,
    kind,
    title,
    year: Number.isFinite(year) ? year : null
  };

  return {
    id: String(item.id),
    ref: JSON.stringify(refObj),
    title,
    kind,
    year: Number.isFinite(year) ? year : undefined,
    poster,
    backdrop,
    overview: item.overview || "",
    rating,
    ids: { tmdb: item.id }
  };
}

// Llamada protegida a kino.tmdb con fallback
async function fetchTmdb(path, params = {}) {
  if (typeof kino === "undefined" || typeof kino.tmdb !== "function") return null;
  try {
    let cleanPath = path;
    const mergedParams = { language: "es-ES", ...params };
    if (cleanPath.includes("?")) {
      const parts = cleanPath.split("?");
      cleanPath = parts[0];
      const qs = parts[1];
      const sp = new URLSearchParams(qs);
      for (const [k, v] of sp.entries()) {
        if (mergedParams[k] === undefined) {
          mergedParams[k] = v;
        }
      }
    }
    return await kino.tmdb(cleanPath, mergedParams);
  } catch (err) {
    return null;
  }
}

// Fuentes de streaming inspiradas en Streambert
function getSources(tmdbId, kind, season, episode, subLang = "es") {
  const isTv = kind === "series" || (season !== undefined && episode !== undefined);
  const s = season || 1;
  const ep = episode || 1;
  const lang = subLang || "es";

  return [
    {
      id: "vidfast",
      name: "Vidfast",
      url: isTv
        ? `https://vidfast.vc/tv/${tmdbId}/${s}/${ep}?sub=${lang}&autoPlay=true&title=true`
        : `https://vidfast.vc/movie/${tmdbId}?sub=${lang}&autoPlay=true&title=true`,
      referer: "https://vidfast.vc/"
    },
    {
      id: "vidsrc",
      name: "VidSrc",
      url: isTv
        ? `https://vsembed.su/embed/tv/${tmdbId}/${s}/${ep}?ds_lang=${lang}&autoplay=1`
        : `https://vsembed.su/embed/movie/${tmdbId}?ds_lang=${lang}&autoplay=1`,
      referer: "https://vsembed.su/"
    },
    {
      id: "vidrift",
      name: "Vidrift",
      url: isTv
        ? `https://embed.vidrift.net/embed/tv/${tmdbId}/${s}/${ep}?sub=${lang}&title=true`
        : `https://embed.vidrift.net/embed/movie/${tmdbId}?sub=${lang}&title=true`,
      referer: "https://embed.vidrift.net/"
    },
    {
      id: "vidlove",
      name: "Vidlove",
      url: isTv
        ? `https://player.vidlove.cc/embed/tv/${tmdbId}/${s}/${ep}?autoplay=true&sub=${lang}`
        : `https://player.vidlove.cc/embed/movie/${tmdbId}?autoplay=true&sub=${lang}`,
      referer: "https://player.vidlove.cc/"
    },
    {
      id: "aether",
      name: "Aether",
      url: isTv
        ? `https://aether.ist/media/tmdb-tv-${tmdbId}/${s}/${ep}?sub=${lang}`
        : `https://aether.ist/media/tmdb-movie-${tmdbId}?sub=${lang}`,
      referer: "https://aether.ist/"
    }
  ];
}

// ── Export: home ─────────────────────────────────────────────────────────────
export async function home() {
  const [trending, popMovies, popTv, topMovies, anime] = await Promise.all([
    fetchTmdb("/trending/all/week"),
    fetchTmdb("/movie/popular"),
    fetchTmdb("/tv/popular"),
    fetchTmdb("/movie/top_rated"),
    fetchTmdb("/discover/tv", { with_genres: "16", with_original_language: "ja" })
  ]);

  const rows = [];

  if (trending && trending.results && trending.results.length > 0) {
    const items = trending.results.map((r) => toKinoItem(r)).filter(Boolean);
    if (items.length > 0) {
      rows.push({
        id: "trending",
        title: "Tendencias Globales",
        ref: "browse:trending",
        items
      });
    }
  }

  if (popMovies && popMovies.results && popMovies.results.length > 0) {
    const items = popMovies.results.map((r) => toKinoItem(r, "movie")).filter(Boolean);
    if (items.length > 0) {
      rows.push({
        id: "pop_movies",
        title: "Películas Populares",
        ref: "browse:movie/popular",
        items
      });
    }
  }

  if (popTv && popTv.results && popTv.results.length > 0) {
    const items = popTv.results.map((r) => toKinoItem(r, "series")).filter(Boolean);
    if (items.length > 0) {
      rows.push({
        id: "pop_tv",
        title: "Series en Tendencia",
        ref: "browse:tv/popular",
        items
      });
    }
  }

  if (topMovies && topMovies.results && topMovies.results.length > 0) {
    const items = topMovies.results.map((r) => toKinoItem(r, "movie")).filter(Boolean);
    if (items.length > 0) {
      rows.push({
        id: "top_movies",
        title: "Películas Mejor Valoradas",
        ref: "browse:movie/top_rated",
        items
      });
    }
  }

  if (anime && anime.results && anime.results.length > 0) {
    const items = anime.results.map((r) => toKinoItem(r, "series")).filter(Boolean);
    if (items.length > 0) {
      rows.push({
        id: "anime",
        title: "Anime y Animación",
        ref: "browse:discover/tv:16",
        items
      });
    }
  }

  // Fallback si no hay clave de TMDB configurada
  if (rows.length === 0) {
    return [
      {
        id: "fallback_demo",
        title: "StreamBert",
        items: [
          {
            id: "550",
            title: "Fight Club",
            kind: "movie",
            year: 1999,
            poster: "https://image.tmdb.org/t/p/w500/bptfVGEQuv6vDTIMVCHjJ9Dz8PX.jpg",
            overview: "Un empleado de oficina insomne busca cambiar su vida.",
            ref: JSON.stringify({ id: 550, kind: "movie", title: "Fight Club", year: 1999 })
          }
        ]
      }
    ];
  }

  return rows;
}

// ── Export: browse ───────────────────────────────────────────────────────────
export async function browse(ref, cursor) {
  const page = cursor ? parseInt(cursor, 10) : 1;
  let path = "/trending/all/week";
  const params = { page: String(page), language: "es-ES" };

  if (ref) {
    const clean = ref.replace(/^browse:/, "");
    if (clean === "trending") {
      path = "/trending/all/week";
    } else if (clean.startsWith("discover/tv:")) {
      path = "/discover/tv";
      params.with_genres = clean.split(":")[1];
    } else if (clean.startsWith("movie/") || clean.startsWith("tv/")) {
      path = `/${clean}`;
    }
  }

  const data = await fetchTmdb(path, params);
  if (!data || !data.results) {
    return { items: [], next: null };
  }

  const defaultKind = path.includes("/tv") ? "series" : "movie";
  const items = data.results.map((r) => toKinoItem(r, defaultKind)).filter(Boolean);
  const next = data.page < data.total_pages && data.page < 500 ? String(data.page + 1) : null;

  return { items, next };
}

// ── Export: search ───────────────────────────────────────────────────────────
export async function search(query) {
  let q = "";
  if (typeof query === "string") {
    q = query;
  } else if (query && typeof query === "object") {
    q = query.q || query.query || "";
  }

  q = q.trim();
  if (!q) return [];

  const data = await fetchTmdb("/search/multi", { query: q, language: "es-ES" });
  if (!data || !data.results) return [];

  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => toKinoItem(r))
    .filter(Boolean)
    .slice(0, 60);
}

// Detección de idioma y etiqueta para subtítulos
function detectSubLang(url) {
  if (!url || typeof url !== "string") return { code: "es", label: "🇪🇸 Español" };
  const lower = url.toLowerCase();
  if (lower.includes("lat") || lower.includes("latin")) return { code: "lat", label: "🇨🇴 Español (Latino)" };
  if (lower.includes("es") || lower.includes("spa") || lower.includes("spanish") || lower.includes("castellano")) {
    return { code: "es", label: "🇪🇸 Español" };
  }
  if (lower.includes("en") || lower.includes("eng") || lower.includes("english")) {
    return { code: "en", label: "🇺🇸 Inglés" };
  }
  if (lower.includes("pt") || lower.includes("por") || lower.includes("portuguese") || lower.includes("brazil")) {
    return { code: "pt", label: "🇧🇷 Portugués" };
  }
  if (lower.includes("fr") || lower.includes("fra") || lower.includes("french")) {
    return { code: "fr", label: "🇫🇷 Francés" };
  }
  if (lower.includes("de") || lower.includes("ger") || lower.includes("german")) {
    return { code: "de", label: "🇩🇪 Alemán" };
  }
  if (lower.includes("it") || lower.includes("ita") || lower.includes("italian")) {
    return { code: "it", label: "🇮🇹 Italiano" };
  }
  return { code: "es", label: "🇪🇸 Subtítulos" };
}

// Normalizador seguro de subtítulos para el contrato de Kino
function normalizeSubtitles(subs) {
  if (!Array.isArray(subs)) return [];
  const seen = new Set();
  const res = [];

  for (const s of subs) {
    if (!s) continue;
    const url = typeof s === "string" ? s : s.url;
    if (!url || typeof url !== "string" || !url.startsWith("http")) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    const detected = detectSubLang(url);
    const lang = typeof s === "object" && s.lang ? s.lang : detected.code;
    const label = typeof s === "object" && s.label ? s.label : detected.label;
    const format = typeof s === "object" && s.format ? s.format : url.includes(".srt") ? "srt" : "vtt";

    res.push({
      url,
      lang,
      label,
      format
    });
  }

  return res.slice(0, 15);
}

// ── Export: episodes ─────────────────────────────────────────────────────────
export async function episodes(ref) {
  let item = null;
  if (typeof ref === "string") {
    try {
      const parsed = JSON.parse(ref);
      if (parsed && typeof parsed === "object") {
        item = parsed;
      } else {
        item = { id: parsed, kind: "series" };
      }
    } catch {
      item = { id: ref, kind: "series" };
    }
  } else if (ref && typeof ref === "object") {
    item = ref;
  } else {
    item = { id: ref, kind: "series" };
  }

  const tmdbId = item.id;
  let seriesData = await fetchTmdb(`/tv/${tmdbId}`);
  if (!seriesData) {
    // Si no existe como serie, verificar si es una película
    const movieData = await fetchTmdb(`/movie/${tmdbId}`);
    if (movieData) {
      return {
        series: {
          title: movieData.title,
          overview: movieData.overview || "",
          poster: movieData.poster_path ? `${TMDB_IMAGE_W500}${movieData.poster_path}` : undefined
        },
        episodes: [
          {
            season: 1,
            number: 1,
            title: movieData.title,
            overview: movieData.overview || "",
            ref: JSON.stringify({
              id: tmdbId,
              kind: "movie",
              title: movieData.title
            })
          }
        ]
      };
    }
    return { episodes: [] };
  }

  const seasonList = Array.isArray(seriesData.seasons) ? seriesData.seasons : [];
  const validSeasons = seasonList.filter((s) => s.season_number > 0);

  const episodesResults = [];

  // Obtener episodios de las temporadas (máximo 4 concurrentes para no saturar)
  const seasonFetches = validSeasons.slice(0, 8).map(async (s) => {
    const sData = await fetchTmdb(`/tv/${tmdbId}/season/${s.season_number}`);
    if (sData && Array.isArray(sData.episodes)) {
      return sData.episodes.map((ep) => ({
        season: ep.season_number,
        number: ep.episode_number,
        title: ep.name || `Episodio ${ep.episode_number}`,
        overview: ep.overview || "",
        still: ep.still_path ? `${TMDB_IMAGE_W500}${ep.still_path}` : undefined,
        ref: JSON.stringify({
          id: tmdbId,
          kind: "series",
          season: ep.season_number,
          episode: ep.episode_number,
          title: `${seriesData.name || "Serie"} T${ep.season_number}E${ep.episode_number}`
        })
      }));
    }
    return [];
  });

  const allSeasonsEpisodes = await Promise.all(seasonFetches);
  for (const list of allSeasonsEpisodes) {
    episodesResults.push(...list);
  }

  return {
    series: {
      title: seriesData.name,
      overview: seriesData.overview || "",
      poster: seriesData.poster_path ? `${TMDB_IMAGE_W500}${seriesData.poster_path}` : undefined
    },
    episodes: episodesResults
  };
}

// ── Export: resolve ──────────────────────────────────────────────────────────
export async function resolve(ref) {
  let target = null;
  if (typeof ref === "string") {
    try {
      const parsed = JSON.parse(ref);
      if (parsed && typeof parsed === "object") {
        target = parsed;
      } else {
        target = { id: parsed, kind: "movie" };
      }
    } catch {
      target = { id: ref, kind: "movie" };
    }
  } else if (ref && typeof ref === "object") {
    target = ref;
  } else {
    target = { id: ref, kind: "movie" };
  }

  const tmdbId = target.id;
  const kind = target.kind || "movie";
  const season = target.season;
  const episode = target.episode;

  let preferredSource = "vidfast";
  let subLang = "es";
  let enableResolver = true;

  try {
    if (typeof kino !== "undefined" && kino.config && typeof kino.config.get === "function") {
      const srcConf = await kino.config.get("default_source");
      if (srcConf) preferredSource = srcConf;
      const subConf = await kino.config.get("sub_lang");
      if (subConf) subLang = subConf;
      const resConf = await kino.config.get("enable_resolver");
      if (resConf !== undefined) enableResolver = resConf;
    }
  } catch {}

  const sources = getSources(tmdbId, kind, season, episode, subLang);

  // Reordenar para probar primero la fuente preferida
  sources.sort((a, b) => {
    if (a.id === preferredSource) return -1;
    if (b.id === preferredSource) return 1;
    return 0;
  });

  // Intentar resolver mediante cada fuente secuencialmente
  for (const src of sources) {
    // 1. Delegar en Kino Resolver si está disponible y la fuente es un hoster directo
    if (enableResolver && typeof kino !== "undefined" && kino.plugins && typeof kino.plugins.call === "function") {
      try {
        const direct = await kino.plugins.call("resolver", "resolve", { url: src.url });
        if (direct && direct.url) {
          return {
            url: direct.url,
            mime: direct.mime || "application/x-mpegURL",
            headers: direct.headers || { Referer: src.url },
            subtitles: normalizeSubtitles(direct.subtitles),
            label: `StreamBert (${src.name}) • 🇺🇸 VO / Subtitulado`
          };
        }
      } catch {}
    }

    // 2. Extraer mediante el navegador de Kino (kino.browser.capture)
    if (typeof kino !== "undefined" && kino.browser && typeof kino.browser.capture === "function") {
      try {
        const capture = await kino.browser.capture(src.url, {
          timeoutMs: 14000,
          autoplay: true,
          captureAll: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Referer: src.referer
          }
        });

        if (capture && capture.media && capture.media.length > 0) {
          // Filtrar anuncios y rastreadores conocidos
          const cleanMedia = capture.media.filter((m) => {
            if (!m || !m.url) return false;
            const u = m.url.toLowerCase();
            return (
              !u.includes("adsystem") &&
              !u.includes("doubleclick") &&
              !u.includes("analytics") &&
              !u.includes("telemetry") &&
              !u.includes("/ad/") &&
              !u.includes("popads") &&
              !u.includes("vast")
            );
          });

          const candidates = cleanMedia.length > 0 ? cleanMedia : capture.media;
          const media = candidates.find((m) => m.url && m.url.includes(".m3u8")) || candidates[0];

          if (media && media.url) {
            // Recoger subtítulos interceptados tanto en capture.subtitles como en capture.media
            const rawSubs = [];
            if (Array.isArray(capture.subtitles)) {
              rawSubs.push(...capture.subtitles);
            }
            if (Array.isArray(capture.media)) {
              for (const cm of capture.media) {
                if (cm && cm.url && (cm.url.includes(".vtt") || cm.url.includes(".srt"))) {
                  rawSubs.push(cm);
                }
              }
            }

            return {
              url: media.url,
              mime: media.mime || (media.url.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4"),
              headers: media.headers || { Referer: src.referer },
              subtitles: normalizeSubtitles(rawSubs),
              label: `StreamBert (${src.name}) • 🇺🇸 VO / Subtitulado`
            };
          }
        }
      } catch {
        // Continuar a la siguiente fuente
      }
    }
  }

  const errHelper = typeof kino !== "undefined" && typeof kino.error === "function" ? kino.error : (c, m) => new Error(`[${c}] ${m}`);
  throw errHelper("unavailable", "No se encontró transmisión activa en las fuentes de Streambert", {
    userMessage: "No se pudo reproducir este título en las fuentes disponibles. Prueba cambiando el servidor en Ajustes."
  });
}

// ── Export: screen ───────────────────────────────────────────────────────────
export async function screen({ state = {}, lang = "es" } = {}) {
  const tab = state.tab || "home";

  let preferredSource = state.source || "vidfast";
  let subLang = state.subLang || "es";

  try {
    if (typeof kino !== "undefined" && kino.config && typeof kino.config.get === "function") {
      const s = await kino.config.get("default_source");
      if (s) preferredSource = s;
      const l = await kino.config.get("sub_lang");
      if (l) subLang = l;
    }
  } catch {}

  const sourceLabels = {
    vidfast: "Vidfast (Recomendado)",
    vidsrc: "VidSrc",
    vidlove: "Vidlove",
    aether: "Aether (Multi)",
    vidrift: "Vidrift (Anime)"
  };

  const currentSourceName = sourceLabels[preferredSource] || preferredSource;

  // Barra de navegación inferior (Material 3 / TV Kino)
  const bottomNavigationBar = {
    type: "navigationBar",
    value: tab,
    items: [
      { key: "home", icon: "home", label: "Inicio" },
      { key: "movies", icon: "movie", label: "Películas" },
      { key: "series", icon: "tv", label: "Series" },
      { key: "settings", icon: "tune", label: "Ajustes" }
    ],
    onChange: { event: "changeTab" }
  };

  // Barra superior fusionada con la barra nativa de Kino
  const appBar = {
    type: "appBar",
    title: "StreamBert",
    mergeWithKinoBar: true,
    leading: {
      type: "button",
      variant: "icon",
      icon: "arrow_back",
      labelText: "Volver",
      onTap: { go: { close: true } }
    },
    actions: [
      {
        type: "button",
        variant: "icon",
        icon: "search",
        labelText: "Buscar",
        onTap: { go: { searchScreen: true } }
      }
    ]
  };

  // ── Pestaña: INICIO ────────────────────────────────────────────────────────
  if (tab === "home") {
    const [trendingMovies, popMovies, popTv] = await Promise.all([
      fetchTmdb("/trending/movie/day"),
      fetchTmdb("/movie/popular"),
      fetchTmdb("/tv/popular")
    ]);

    const scrollChildren = [];

    const movieItems = popMovies && popMovies.results ? popMovies.results.map((r) => toKinoItem(r, "movie")).filter(Boolean) : [];
    const trendingItems = trendingMovies && trendingMovies.results ? trendingMovies.results.map((r) => toKinoItem(r, "movie")).filter(Boolean) : [];
    const tvItems = popTv && popTv.results ? popTv.results.map((r) => toKinoItem(r, "series")).filter(Boolean) : [];

    // Seleccionar siempre una película reconocida y con sinopsis para el HeroCard
    const hero = movieItems.find((m) => m.backdrop && m.overview && m.overview.length > 40 && m.rating && m.rating >= 6.0) ||
                 trendingItems.find((m) => m.backdrop && m.overview && m.overview.length > 30) ||
                 movieItems[0] ||
                 trendingItems[0];

    if (hero) {
      scrollChildren.push({
        type: "heroCard",
        title: hero.title,
        text: (hero.overview || "Descubre lo mejor del cine en streaming sin cortes.").slice(0, 220),
        image: hero.backdrop || hero.poster,
        buttons: [
          {
            type: "button",
            label: "Ver ahora",
            icon: "play",
            variant: "primary",
            onTap: {
              go: {
                play: {
                  ref: hero.ref,
                  kind: "movie",
                  id: hero.id,
                  title: hero.title
                }
              }
            }
          },
          {
            type: "button",
            label: "Detalles",
            icon: "info",
            variant: "secondary",
            onTap: {
              go: {
                title: {
                  ref: hero.ref,
                  kind: "movie",
                  id: hero.id,
                  title: hero.title
                }
              }
            }
          }
        ]
      });
    }

    if (movieItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Películas Más Populares",
        items: movieItems.slice(0, 15)
      });
    }

    if (trendingItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Tendencias del Cine",
        items: trendingItems.slice(0, 15)
      });
    }

    if (tvItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Series Populares",
        items: tvItems.slice(0, 15)
      });
    }

    if (scrollChildren.length === 0) {
      scrollChildren.push({
        type: "banner",
        role: "info",
        text: "Bienvenido a StreamBert. Puedes explorar o buscar cualquier película o serie pulsando el icono de búsqueda."
      });
    }

    return {
      type: "scaffold",
      appBar,
      bottomNavigationBar,
      body: {
        type: "scroll",
        children: scrollChildren
      }
    };
  }

  // ── Pestaña: PELÍCULAS ─────────────────────────────────────────────────────
  if (tab === "movies") {
    const [nowPlaying, topRated, actionMovies, scifiMovies] = await Promise.all([
      fetchTmdb("/movie/now_playing"),
      fetchTmdb("/movie/top_rated"),
      fetchTmdb("/discover/movie", { with_genres: "28" }),
      fetchTmdb("/discover/movie", { with_genres: "878" })
    ]);

    const scrollChildren = [
      {
        type: "banner",
        role: "info",
        text: "Catálogo de Cine: Todo el cine mundial disponible con resolución multi-fuente y sin anuncios."
      }
    ];

    const npItems = nowPlaying && nowPlaying.results ? nowPlaying.results.map((r) => toKinoItem(r, "movie")).filter(Boolean) : [];
    const trItems = topRated && topRated.results ? topRated.results.map((r) => toKinoItem(r, "movie")).filter(Boolean) : [];
    const actItems = actionMovies && actionMovies.results ? actionMovies.results.map((r) => toKinoItem(r, "movie")).filter(Boolean) : [];
    const sciItems = scifiMovies && scifiMovies.results ? scifiMovies.results.map((r) => toKinoItem(r, "movie")).filter(Boolean) : [];

    if (npItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "En Cines Ahora",
        items: npItems.slice(0, 15)
      });
    }

    if (trItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Mejor Calificadas",
        items: trItems.slice(0, 15)
      });
    }

    if (actItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Acción y Aventura",
        items: actItems.slice(0, 15)
      });
    }

    if (sciItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Ciencia Ficción",
        items: sciItems.slice(0, 15)
      });
    }

    return {
      type: "scaffold",
      appBar,
      bottomNavigationBar,
      body: {
        type: "scroll",
        children: scrollChildren
      }
    };
  }

  // ── Pestaña: SERIES ────────────────────────────────────────────────────────
  if (tab === "series") {
    const [onAir, popSeries, animeSeries, dramaSeries] = await Promise.all([
      fetchTmdb("/tv/on_the_air"),
      fetchTmdb("/tv/popular"),
      fetchTmdb("/discover/tv", { with_genres: "16", with_original_language: "ja" }),
      fetchTmdb("/discover/tv", { with_genres: "18" })
    ]);

    const scrollChildren = [
      {
        type: "banner",
        role: "info",
        text: "Series y Temporadas Completas: Elige cualquier título para acceder a todos sus episodios."
      }
    ];

    const onAirItems = onAir && onAir.results ? onAir.results.map((r) => toKinoItem(r, "series")).filter(Boolean) : [];
    const popItems = popSeries && popSeries.results ? popSeries.results.map((r) => toKinoItem(r, "series")).filter(Boolean) : [];
    const animeItems = animeSeries && animeSeries.results ? animeSeries.results.map((r) => toKinoItem(r, "series")).filter(Boolean) : [];
    const dramaItems = dramaSeries && dramaSeries.results ? dramaSeries.results.map((r) => toKinoItem(r, "series")).filter(Boolean) : [];

    if (onAirItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Nuevos Episodios al Aire",
        items: onAirItems.slice(0, 15)
      });
    }

    if (popItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Series Populares",
        items: popItems.slice(0, 15)
      });
    }

    if (animeItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Anime y Animación",
        items: animeItems.slice(0, 15)
      });
    }

    if (dramaItems.length > 0) {
      scrollChildren.push({
        type: "titleRail",
        title: "Dramas Aclamados",
        items: dramaItems.slice(0, 15)
      });
    }

    return {
      type: "scaffold",
      appBar,
      bottomNavigationBar,
      body: {
        type: "scroll",
        children: scrollChildren
      }
    };
  }

  // ── Pestaña: AJUSTES ───────────────────────────────────────────────────────
  return {
    type: "scaffold",
    appBar,
    bottomNavigationBar,
    body: {
      type: "scroll",
      children: [
        {
          type: "card",
          variant: "outlined",
          children: [
            {
              type: "text",
              text: "StreamBert para Kino",
              style: "h3"
            },
            {
              type: "text",
              text: `Versión 1.0.4 • Servidor activo: ${currentSourceName}`,
              color: "muted"
            },
            {
              type: "text",
              text: "Motor autónomo de resolución multimedia que agrega fuentes de Vidfast, VidSrc, Vidlove, Aether y Vidrift con aceleración mediante Kino Resolver."
            }
          ]
        },
        {
          type: "card",
          variant: "plain",
          children: [
            {
              type: "text",
              text: "Servidor Principal de Extracción",
              style: "h3"
            },
            {
              type: "text",
              text: "Selecciona el proveedor inicial que se probará primero al reproducir:",
              color: "muted"
            },
            {
              type: "chips",
              key: "chips_source",
              value: preferredSource,
              options: [
                { value: "vidfast", label: "Vidfast" },
                { value: "vidsrc", label: "VidSrc" },
                { value: "vidlove", label: "Vidlove" },
                { value: "aether", label: "Aether" },
                { value: "vidrift", label: "Vidrift" }
              ],
              onChange: { event: "changeSource" }
            }
          ]
        },
        {
          type: "card",
          variant: "plain",
          children: [
            {
              type: "text",
              text: "Idioma de Subtítulos Preferido",
              style: "h3"
            },
            {
              type: "chips",
              key: "chips_lang",
              value: subLang,
              options: [
                { value: "es", label: "Español (ES/LAT)" },
                { value: "en", label: "Inglés (EN)" }
              ],
              onChange: { event: "changeSubLang" }
            }
          ]
        },
        {
          type: "banner",
          role: "info",
          text: "Kino Resolver Vinculado: Si un servidor utiliza hosters estándar (Streamwish, Voe, Vidmoly...), la resolución se deofusca instantáneamente sin abrir el navegador."
        },
        {
          type: "button",
          label: "Buscar en Todo el Catálogo",
          icon: "search",
          variant: "primary",
          onTap: { go: { searchScreen: true } }
        }
      ]
    }
  };
}

// ── Export: screenEvent ──────────────────────────────────────────────────────
export async function screenEvent({ name, value, arg, state = {} } = {}) {
  const chosen = value !== undefined && value !== null ? value : arg;

  if (name === "changeTab") {
    return {
      state: {
        ...state,
        tab: chosen || "home"
      }
    };
  }

  if (name === "changeSource") {
    const newSource = chosen || "vidfast";
    return {
      config: { default_source: newSource },
      state: {
        ...state,
        source: newSource
      },
      toast: `Servidor preferido cambiado a ${newSource}`
    };
  }

  if (name === "changeSubLang") {
    const newLang = chosen || "es";
    return {
      config: { sub_lang: newLang },
      state: {
        ...state,
        subLang: newLang
      },
      toast: `Subtítulos configurados a ${newLang === "es" ? "Español" : "Inglés"}`
    };
  }

  return null;
}
