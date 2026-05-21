/* TextureFactory.js
 * Generates procedural textures for the gallery environment.
 */

const TextureFactory = (() => {

  /* ── Deterministic pseudo-random (no Math.random) ─────── */
  function rng(seed) {
    const x = Math.sin(seed + 1.4142) * 43758.5453123;
    return x - Math.floor(x);
  }

  /* ── Oak-plank floor texture ──────────────────────────── */
  function createWoodTexture() {
    const W = 1024, H = 1024;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    const NUM_PLANKS = 5;
    const PH = H / NUM_PLANKS;

    for (let p = 0; p < NUM_PLANKS; p++) {
      const y0 = p * PH;
      const hue  = 26 + rng(p * 7) * 8;
      const lite = 42 + rng(p * 11) * 10;

      // Base plank colour
      const base = ctx.createLinearGradient(0, y0, 0, y0 + PH);
      base.addColorStop(0,   `hsl(${hue},48%,${lite}%)`);
      base.addColorStop(0.5, `hsl(${hue + 3},46%,${lite + 4}%)`);
      base.addColorStop(1,   `hsl(${hue},48%,${lite - 2}%)`);
      ctx.fillStyle = base;
      ctx.fillRect(0, y0, W, PH);

      // Grain lines
      const GRAINS = 22;
      for (let g = 0; g < GRAINS; g++) {
        const s = p * 500 + g;
        const gx    = rng(s)       * W;
        const gw    = 10 + rng(s+1) * 35;
        const alpha = 0.06 + rng(s+2) * 0.12;
        const dark  = rng(s+3) > 0.5;
        const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
        const col = dark ? `rgba(50,22,5,${alpha})` : `rgba(230,170,80,${alpha})`;
        gg.addColorStop(0,   'rgba(0,0,0,0)');
        gg.addColorStop(0.4, col);
        gg.addColorStop(0.6, col);
        gg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(gx, y0, gw, PH);
      }

      // Subtle knot
      if (rng(p * 99) > 0.55) {
        const kx = rng(p * 77 + 3) * W;
        const ky = y0 + PH * 0.4;
        const kr = 6 + rng(p * 33) * 18;
        const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
        kg.addColorStop(0,   'rgba(40,18,4,0.28)');
        kg.addColorStop(0.6, 'rgba(80,40,10,0.12)');
        kg.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = kg;
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr, kr * 0.55, rng(p * 55) * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Seam lines between planks
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    for (let p = 1; p < NUM_PLANKS; p++) {
      ctx.beginPath();
      ctx.moveTo(0, p * PH); ctx.lineTo(W, p * PH);
      ctx.stroke();
    }
    // Thin highlight just below each seam
    ctx.strokeStyle = 'rgba(255,190,80,0.07)';
    ctx.lineWidth = 1;
    for (let p = 1; p < NUM_PLANKS; p++) {
      ctx.beginPath();
      ctx.moveTo(0, p * PH + 2); ctx.lineTo(W, p * PH + 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(7, 5);
    return tex;
  }

  /* ── Placeholder painting (used when JPEG fails to load) ─ */
  function createPlaceholderPainting(seed, aspectW, aspectH) {
    const LONG  = 512;
    const SHORT = Math.round(LONG * (Math.min(aspectW, aspectH) / Math.max(aspectW, aspectH)));
    const W = aspectW >= aspectH ? LONG : SHORT;
    const H = aspectW >= aspectH ? SHORT : LONG;

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    const palettes = [
      ['#1B2A4A','#2E6FA3','#7FC4D8','#E8F4F8'],
      ['#4A1B2A','#A32E6F','#D87FC4','#F8E8F4'],
      ['#1B4A2A','#2EA36F','#7FD8A3','#E8F8ED'],
      ['#4A3B1B','#A3822E','#D8B87F','#F8F0E8'],
      ['#2A1B4A','#6F2EA3','#C47FD8','#F4E8F8'],
      ['#4A1B1B','#A32E2E','#D87F7F','#F8E8E8'],
      ['#1B4A4A','#2EA3A3','#7FD8D8','#E8F8F8'],
      ['#3B3B1B','#8B8B2E','#D8D87F','#F8F8E8'],
    ];
    const pal = palettes[Math.floor(rng(seed) * palettes.length)];

    // Background gradient
    const bg = ctx.createLinearGradient(
      rng(seed+1)*W, 0, rng(seed+2)*W, H
    );
    bg.addColorStop(0, pal[0]);
    bg.addColorStop(0.5, pal[1]);
    bg.addColorStop(1, pal[0]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Abstract shapes
    const N = 5 + Math.floor(rng(seed+10) * 7);
    for (let i = 0; i < N; i++) {
      const s  = seed * 100 + i * 17;
      const cx = rng(s)   * W;
      const cy = rng(s+1) * H;
      const r  = 20 + rng(s+2) * Math.min(W, H) * 0.38;
      const c  = pal[Math.floor(rng(s+3) * pal.length)];
      const a  = (0.18 + rng(s+4) * 0.45).toFixed(2);
      ctx.fillStyle = c + Math.round(a * 255).toString(16).padStart(2,'0');
      ctx.beginPath();
      if (rng(s+5) > 0.45) {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else {
        const ang = rng(s+6) * Math.PI;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.rect(-r * 0.6, -r * 0.9, r * 1.2, r * 1.8);
        ctx.restore();
      }
      ctx.fill();
    }

    // Brushstroke overlays
    ctx.globalAlpha = 0.13;
    for (let i = 0; i < 28; i++) {
      const s = seed * 700 + i * 13;
      ctx.strokeStyle = pal[Math.floor(rng(s) * pal.length)];
      ctx.lineWidth = 2 + rng(s+1) * 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rng(s+2)*W, rng(s+3)*H);
      ctx.bezierCurveTo(
        rng(s+4)*W, rng(s+5)*H,
        rng(s+6)*W, rng(s+7)*H,
        rng(s+8)*W, rng(s+9)*H
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    return new THREE.CanvasTexture(cv);
  }

  return { createWoodTexture, createPlaceholderPainting };
})();
