/* Museum.js
 * Builds the 3-D gallery room and places all artworks on the walls.
 *
 * Room coordinate system (Three.js convention, Y-up)
 *   Width  along  X  (−W/2 … +W/2)
 *   Depth  along  Z  (−D/2 … +D/2)
 *   Height along  Y  (0   … H)
 *
 * Walls
 *   North  z = −D/2   normal +Z   faces south (viewer enters from south end)
 *   South  z = +D/2   normal −Z
 *   East   x = +W/2   normal −X
 *   West   x = −W/2   normal +X
 */

class Museum {
  constructor(scene, artworks) {
    this.scene = scene;
    this.artworks = artworks;

    /* Room dimensions in metres */
    this.RW = 20; // width
    this.RD = 16; // depth
    this.RH = 4.2; // height

    /* Walkable bounds (slightly inside walls) */
    this.bounds = {
      minX: -this.RW / 2,
      maxX: this.RW / 2,
      minZ: -this.RD / 2,
      maxZ: this.RD / 2,
    };

    /* Painting meshes for raycasting */
    this.artworkMeshes = [];
  }

  build() {
    this._buildStructure();
    this._addAmbientLight();
    this._addTrackLights();
    this._placeAllArtworks();
  }

  getBounds() {
    return this.bounds;
  }

  /* ══════════════════════════════════════════════════════════
     ROOM STRUCTURE
     ══════════════════════════════════════════════════════════ */

  _buildStructure() {
    const { RW: W, RD: D, RH: H } = this;

    /* ── Floor ──────────────────────────────────────────── */
    const woodTex = TextureFactory.createWoodTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({
        map: woodTex,
        color: 0xd09a55,
        roughness: 0.82,
        metalness: 0,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    /* ── Ceiling ────────────────────────────────────────── */
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshStandardMaterial({
        color: 0xf6f5f1,
        roughness: 1,
        metalness: 0,
      }),
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.scene.add(ceil);

    /* ── Walls ──────────────────────────────────────────── */
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xeeeae4,
      roughness: 0.98,
      metalness: 0,
    });

    const wallDefs = [
      { w: W, h: H, p: [0, H / 2, -D / 2], ry: 0 }, // North
      { w: W, h: H, p: [0, H / 2, D / 2], ry: Math.PI }, // South
      { w: D, h: H, p: [W / 2, H / 2, 0], ry: -Math.PI / 2 }, // East
      { w: D, h: H, p: [-W / 2, H / 2, 0], ry: Math.PI / 2 }, // West
    ];
    wallDefs.forEach(({ w, h, p, ry }) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(...p);
      m.rotation.y = ry;
      m.receiveShadow = true;
      this.scene.add(m);
    });

    /* ── Baseboards ─────────────────────────────────────── */
    const bH = 0.13,
      bT = 0.025;
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0c,
      roughness: 0.8,
    });
    [
      { g: new THREE.BoxGeometry(W, bH, bT), p: [0, bH / 2, -D / 2 + bT / 2] },
      { g: new THREE.BoxGeometry(W, bH, bT), p: [0, bH / 2, D / 2 - bT / 2] },
      { g: new THREE.BoxGeometry(bT, bH, D), p: [W / 2 - bT / 2, bH / 2, 0] },
      { g: new THREE.BoxGeometry(bT, bH, D), p: [-W / 2 + bT / 2, bH / 2, 0] },
    ].forEach(({ g, p }) => {
      const m = new THREE.Mesh(g, baseMat);
      m.position.set(...p);
      this.scene.add(m);
    });

    /* ── Crown moulding ─────────────────────────────────── */
    const cH = 0.07,
      cT = 0.04;
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xdedcd8,
      roughness: 0.9,
    });
    [
      {
        g: new THREE.BoxGeometry(W, cH, cT),
        p: [0, H - cH / 2, -D / 2 + cT / 2],
      },
      {
        g: new THREE.BoxGeometry(W, cH, cT),
        p: [0, H - cH / 2, D / 2 - cT / 2],
      },
      {
        g: new THREE.BoxGeometry(cT, cH, D),
        p: [W / 2 - cT / 2, H - cH / 2, 0],
      },
      {
        g: new THREE.BoxGeometry(cT, cH, D),
        p: [-W / 2 + cT / 2, H - cH / 2, 0],
      },
    ].forEach(({ g, p }) => {
      const m = new THREE.Mesh(g, crownMat);
      m.position.set(...p);
      this.scene.add(m);
    });

    /* ── Parquet border strip ────────────────────────────── */
    const bwMat = new THREE.MeshStandardMaterial({
      color: 0x7a5510,
      roughness: 0.9,
    });
    const bw = 0.35;
    [
      {
        g: new THREE.BoxGeometry(W, 0.008, bw),
        p: [0, 0.004, -D / 2 + bw / 2],
      },
      { g: new THREE.BoxGeometry(W, 0.008, bw), p: [0, 0.004, D / 2 - bw / 2] },
      { g: new THREE.BoxGeometry(bw, 0.008, D), p: [W / 2 - bw / 2, 0.004, 0] },
      {
        g: new THREE.BoxGeometry(bw, 0.008, D),
        p: [-W / 2 + bw / 2, 0.004, 0],
      },
    ].forEach(({ g, p }) => {
      const m = new THREE.Mesh(g, bwMat);
      m.position.set(...p);
      this.scene.add(m);
    });
  }

  /* ══════════════════════════════════════════════════════════
     LIGHTING
     ══════════════════════════════════════════════════════════ */

  _addAmbientLight() {
    this.scene.add(new THREE.AmbientLight(0xfff8f0, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xfff5e8, 0x1c1000, 0.28));
  }

  _addTrackLights() {
    const { RW: W, RD: D, RH: H } = this;
    const trackY = H - 0.02;
    const trackLen = D * 0.84;
    const trackXs = [-W * 0.3, 0, W * 0.3];

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.5,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: 0xffaa22,
      emissiveIntensity: 2.8,
    });

    trackXs.forEach((tx) => {
      /* Rail */
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, trackLen, 6),
        railMat,
      );
      rail.position.set(tx, trackY, 0);
      this.scene.add(rail);

      /* Four lights per track */
      const N = 4;
      for (let i = 0; i < N; i++) {
        const frac = (i + 0.5) / N - 0.5;
        const tz = frac * trackLen;
        const ly = trackY - 0.11;

        /* Visible bulb cone */
        const bulb = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.088, 0.2, 8),
          bulbMat,
        );
        bulb.rotation.x = Math.PI;
        bulb.position.set(tx, ly, tz);
        this.scene.add(bulb);

        /* SpotLight – only centre track casts shadows */
        const spot = new THREE.SpotLight(
          0xffe4b0,
          2.6,
          9,
          Math.PI / 6.5,
          0.42,
          1.5,
        );
        spot.position.set(tx, ly, tz);
        spot.target.position.set(tx, 0, tz);
        spot.castShadow = tx === 0 && (i === 1 || i === 2);
        if (spot.castShadow) {
          spot.shadow.mapSize.set(512, 512);
          spot.shadow.bias = -0.001;
        }
        this.scene.add(spot, spot.target);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     WALL DEFINITIONS  (axis, direction, normal, tangent)
     ══════════════════════════════════════════════════════════ */

  _wallDefs() {
    const { RW: W, RD: D } = this;
    const M = 1.6; // margin from corners
    return {
      north: {
        id: "north",
        len: W - M * 2,
        ctr: new THREE.Vector3(0, 0, -D / 2),
        nrm: new THREE.Vector3(0, 0, 1),
        tng: new THREE.Vector3(1, 0, 0),
        rotY: 0,
      },
      south: {
        id: "south",
        len: W - M * 2,
        ctr: new THREE.Vector3(0, 0, D / 2),
        nrm: new THREE.Vector3(0, 0, -1),
        tng: new THREE.Vector3(1, 0, 0),
        rotY: Math.PI,
      },
      east: {
        id: "east",
        len: D - M * 2,
        ctr: new THREE.Vector3(W / 2, 0, 0),
        nrm: new THREE.Vector3(-1, 0, 0),
        tng: new THREE.Vector3(0, 0, -1),
        rotY: -Math.PI / 2,
      },
      west: {
        id: "west",
        len: D - M * 2,
        ctr: new THREE.Vector3(-W / 2, 0, 0),
        nrm: new THREE.Vector3(1, 0, 0),
        tng: new THREE.Vector3(0, 0, 1),
        rotY: Math.PI / 2,
      },
    };
  }

  /* ══════════════════════════════════════════════════════════
     ARTWORK PLACEMENT
     ══════════════════════════════════════════════════════════ */

  _placeAllArtworks() {
    const wallKeys = ["north", "east", "south", "west"];
    let autoIdx = 0;

    /* Assign a wall to artworks that don't specify one */
    this.artworks.forEach((art) => {
      if (!art.wall || !wallKeys.includes(art.wall)) {
        art.wall = wallKeys[autoIdx++ % wallKeys.length];
      }
    });

    /* Group by wall */
    const byWall = { north: [], east: [], south: [], west: [] };
    this.artworks.forEach((art) =>
      (byWall[art.wall] || byWall.north).push(art),
    );

    const defs = this._wallDefs();
    wallKeys.forEach((k) => {
      if (byWall[k].length) this._placeOnWall(byWall[k], defs[k]);
    });
  }

  _placeOnWall(arts, def) {
    const CENTER_Y = 1.65; // height of painting centre (m)
    const MIN_GAP = 0.4; // minimum gap between paintings

    /* Total painting width along the wall's tangent */
    let totalW = arts.reduce((s, a) => s + a._dw, 0);
    let gap = (def.len - totalW) / (arts.length + 1);

    /* If the paintings overflow, shrink them uniformly */
    if (gap < MIN_GAP) {
      const avail = def.len - MIN_GAP * (arts.length + 1);
      const scale = Math.max(0.4, avail / totalW);
      arts.forEach((a) => {
        a._dw *= scale;
        a._dh *= scale;
      });
      totalW = arts.reduce((s, a) => s + a._dw, 0);
      gap = (def.len - totalW) / (arts.length + 1);
    }

    let cursor = -def.len / 2 + gap;

    arts.forEach((art) => {
      const offset = cursor + art._dw / 2;
      cursor += art._dw + gap;

      /* World position of painting centre */
      const pos = def.ctr.clone().add(def.tng.clone().multiplyScalar(offset));
      pos.y = CENTER_Y;

      this._buildArtwork(art, pos, def);
    });
  }

  /* ══════════════════════════════════════════════════════════
     SINGLE ARTWORK  (frame + canvas + label + spotlight)
     ══════════════════════════════════════════════════════════ */

  _buildArtwork(art, centerPos, def) {
    const w = art._dw;
    const h = art._dh;

    /* How far off the wall surface the artwork sits */
    const WALL_OFFSET = 0.015;
    const FRAME_DEPTH = 0.06;
    const FRAME_PAD = 0.055;

    /* Position on wall face (WALL_OFFSET away from surface) */
    const wallFace = centerPos
      .clone()
      .add(def.nrm.clone().multiplyScalar(WALL_OFFSET));

    /* ── Outer dark frame ───────────────────────────────── */
    const frameCenter = wallFace
      .clone()
      .add(def.nrm.clone().multiplyScalar(FRAME_DEPTH / 2));
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(w + FRAME_PAD * 2, h + FRAME_PAD * 2, FRAME_DEPTH),
      new THREE.MeshStandardMaterial({
        color: 0x0b0806,
        roughness: 0.82,
        metalness: 0.08,
      }),
    );
    frame.position.copy(frameCenter);
    frame.rotation.y = def.rotY;
    frame.castShadow = true;
    this.scene.add(frame);

    /* ── Thin gold liner (real border strips, not a full plane)
       The previous full liner sat almost coplanar behind the painting,
       causing random z-fighting where the gold/background could shine
       through image textures. Four separate strips avoid overlap. ─── */
    const LINER_W = 0.018;
    const LINER_D = 0.01;
    const linerMat = new THREE.MeshStandardMaterial({
      color: 0x8b6820,
      roughness: 0.5,
      metalness: 0.55,
    });
    const linerGroup = new THREE.Group();
    linerGroup.position.copy(
      wallFace
        .clone()
        .add(def.nrm.clone().multiplyScalar(FRAME_DEPTH + LINER_D / 2 + 0.002)),
    );
    linerGroup.rotation.y = def.rotY;

    const topStrip = new THREE.Mesh(
      new THREE.BoxGeometry(w + LINER_W * 2, LINER_W, LINER_D),
      linerMat,
    );
    topStrip.position.y = h / 2 + LINER_W / 2;
    const bottomStrip = new THREE.Mesh(
      new THREE.BoxGeometry(w + LINER_W * 2, LINER_W, LINER_D),
      linerMat,
    );
    bottomStrip.position.y = -h / 2 - LINER_W / 2;
    const leftStrip = new THREE.Mesh(
      new THREE.BoxGeometry(LINER_W, h, LINER_D),
      linerMat,
    );
    leftStrip.position.x = -w / 2 - LINER_W / 2;
    const rightStrip = new THREE.Mesh(
      new THREE.BoxGeometry(LINER_W, h, LINER_D),
      linerMat,
    );
    rightStrip.position.x = w / 2 + LINER_W / 2;
    linerGroup.add(topStrip, bottomStrip, leftStrip, rightStrip);
    this.scene.add(linerGroup);

    /* ── Painting canvas ────────────────────────────────── */
    const canvasPos = wallFace
      .clone()
      .add(def.nrm.clone().multiplyScalar(FRAME_DEPTH + LINER_D + 0.014));
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: art._texture,
        roughness: 0.92,
        metalness: 0,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    canvas.position.copy(canvasPos);
    canvas.rotation.y = def.rotY;
    canvas.userData.artwork = art;
    this.scene.add(canvas);

    /* ── Larger invisible hit target for reliable E interaction ── */
    const hitTarget = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 0.35, h + 0.35),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    hitTarget.position.copy(
      canvasPos.clone().add(def.nrm.clone().multiplyScalar(0.01)),
    );
    hitTarget.rotation.y = def.rotY;
    hitTarget.userData.artwork = art;
    this.artworkMeshes.push(hitTarget);
    this.scene.add(hitTarget);

    /* ── Wall label (title, artist, dimensions) ─────────── */
    this._buildLabel(art, centerPos, def, h);

    /* Track lights provide the room lighting. Avoid one WebGL spotlight per
       painting: many spotlights can exceed browser/GPU shader limits and make
       textures render unreliably on some machines. */
  }

  /* ── Small engraved-style label below painting ─────────── */
  _buildLabel(art, paintCtr, def, paintH) {
    const LW = 0.72,
      LH = 0.16;
    const GAP = 0.065;

    const cv = document.createElement("canvas");
    cv.width = 576;
    cv.height = 128;
    const ctx = cv.getContext("2d");

    /* Off-white card */
    ctx.fillStyle = "#EDEAE5";
    ctx.fillRect(0, 0, 576, 128);

    /* Title */
    ctx.fillStyle = "#111111";
    ctx.font = "bold 28px Georgia, serif";
    ctx.fillText(this._truncate(ctx, art.title || "Untitled", 550), 12, 40);

    /* Artist / year */
    const byLine = [art.artist, art.year].filter(Boolean).join(", ");
    ctx.fillStyle = "#555555";
    ctx.font = "italic 21px Georgia, serif";
    ctx.fillText(this._truncate(ctx, byLine, 550), 12, 72);

    /* Medium / dimensions */
    const dimCm = `${Math.round(art.dimensions.width * 100)} × ${Math.round(art.dimensions.height * 100)} cm`;
    const detail = [art.medium, dimCm].filter(Boolean).join("  ·  ");
    ctx.fillStyle = "#888888";
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText(this._truncate(ctx, detail, 550), 12, 102);

    const tex = new THREE.CanvasTexture(cv);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(LW, LH),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }),
    );

    const ly = paintCtr.y - paintH / 2 - GAP - LH / 2;
    const lPos = paintCtr.clone().add(def.nrm.clone().multiplyScalar(0.018));
    lPos.y = ly;
    label.position.copy(lPos);
    label.rotation.y = def.rotY;
    this.scene.add(label);
  }

  _truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth)
      t = t.slice(0, -1);
    return t + "…";
  }

  /* ── Per-painting warm spotlight ────────────────────────── */
  _buildPaintingLight(paintCtr, def) {
    const FORWARD = 1.55; // how far into room the light sits
    const LIGHT_Y = this.RH - 0.35;

    const lPos = paintCtr.clone().add(def.nrm.clone().multiplyScalar(FORWARD));
    lPos.y = LIGHT_Y;

    const spot = new THREE.SpotLight(
      0xffedd0,
      3.8,
      7.5,
      Math.PI / 10,
      0.58,
      2.0,
    );
    spot.position.copy(lPos);
    spot.target.position.copy(paintCtr);
    spot.castShadow = false; // keep draw-call budget low
    this.scene.add(spot, spot.target);
  }
}
