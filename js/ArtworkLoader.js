/* ArtworkLoader.js
 * Loads artworks/manifest.json, then fetches each texture.
 * Falls back to a procedural placeholder if an image is missing.
 *
 * Manifest artwork entry format
 * ─────────────────────────────
 * {
 *   "id":          "unique-string",
 *   "file":        "artworks/mypainting.jpg",   // local or remote URL
 *   "title":       "My Title",
 *   "artist":      "Artist Name",
 *   "year":        "2024",
 *   "medium":      "Oil on canvas",
 *   "dimensions":  { "width": 0.40, "height": 0.50 },  // metres
 *   "description": "Optional text.",
 *   "wall":        "north"  // north | east | south | west  (optional)
 * }
 */

const ArtworkLoader = (() => {
  /* ── Scale physical metres → display metres ──────────────
   * Preserves relative dimensions from metadata.
   * Adjust GLOBAL_SCALE to change the overall size of all paintings.
   */
  const GLOBAL_SCALE = 3.2;

  function computeDisplaySize(dims) {
    return {
      dw: dims.width * GLOBAL_SCALE,
      dh: dims.height * GLOBAL_SCALE,
    };
  }

  /* ── Load a single texture ────────────────────────────── */
  function loadTexture(url, fallbackSeed, dw, dh) {
    return new Promise((resolve) => {
      if (!url) {
        resolve(TextureFactory.createPlaceholderPainting(fallbackSeed, dw, dh));
        return;
      }

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";

      loader.load(
        url,
        (tex) => {
          tex.encoding = THREE.sRGBEncoding;
          resolve(tex);
        },
        undefined,
        () => {
          console.warn(`Could not load "${url}" – using placeholder.`);
          resolve(
            TextureFactory.createPlaceholderPainting(fallbackSeed, dw, dh),
          );
        },
      );
    });
  }

  /* ── Main entry point ────────────────────────────────── */
  async function load(manifestPath, onProgress) {
    let manifest;

    try {
      const res = await fetch(manifestPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = await res.json();
    } catch (err) {
      console.error("manifest.json could not be loaded:", err);
      manifest = { museum: { name: "Virtual Art Museum" }, artworks: [] };
    }

    const artworks = manifest.artworks || [];
    const total = artworks.length;

    for (let i = 0; i < total; i++) {
      const art = artworks[i];

      /* Compute 3-D display dimensions */
      const { dw, dh } = computeDisplaySize(
        art.dimensions || { width: 0.4, height: 0.5 },
      );
      art._dw = dw;
      art._dh = dh;

      /* Load texture */
      art._texture = await loadTexture(art.file, i, dw, dh);

      if (onProgress) onProgress((i + 1) / total);
    }

    return {
      museumInfo: manifest.museum || {},
      artworks,
    };
  }

  return { load };
})();
