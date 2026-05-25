/* main.js
 * Application entry-point.
 * Initialises Three.js, loads artworks, wires up UI.
 *
 * State machine:  loading → start → playing ↔ paused
 *                                       ↓
 *                                   inspecting → playing
 */

"use strict";

/* ── Module globals ────────────────────────────────────── */
let renderer, scene, camera, clock, raycaster;
let controls, museum;
let nearbyArtwork = null;
let appState = "loading"; // loading | start | playing | paused | inspecting

let viewerScale = 1;
let viewerX = 0;
let viewerY = 0;
let viewerDragging = false;
let viewerLastX = 0;
let viewerLastY = 0;

let magnifierActive = false;

/* ── Cached DOM references ─────────────────────────────── */
const $ = (id) => document.getElementById(id);
const loadingScreen = $("loading-screen");
const startScreen = $("start-screen");
const pauseScreen = $("pause-screen");
const hud = $("hud");
const infoPanel = $("info-panel");
const examineHint = $("examine-hint");
const imageViewer = $("image-viewer");
const panelImg = $("panel-img");
const magnifierLens = $("magnifier-lens");

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
async function init() {
  console.log("Museum: Initializing...");
  /* ── Renderer ─────────────────────────────────────────── */
  const canvas = $("museum-canvas");
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    console.warn(
      "Museum: High-performance renderer failed, falling back...",
      e,
    );
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ── Scene & camera ───────────────────────────────────── */
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    80,
  );
  camera.position.set(0, 1.7, 6.0); // start near south wall, facing north

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  raycaster.far = 9.5; // examine range in metres

  /* ── Load artworks ────────────────────────────────────── */
  setProgress(0.05, "Loading artwork catalog...");
  let artworks = [];
  try {
    const result = await ArtworkLoader.load("artworks/manifest.json", (p) =>
      setProgress(
        0.05 + p * 0.6,
        `Loading paintings... ${Math.round(p * 100)}%`,
      ),
    );
    artworks = result.artworks || [];
    console.log(`Museum: Loaded ${artworks.length} artworks.`);
  } catch (err) {
    console.error("Museum: Artwork loading failed:", err);
  }

  /* ── Build museum ─────────────────────────────────────── */
  setProgress(0.7, "Building gallery...");
  try {
    museum = new Museum(scene, artworks);
    museum.build();
    console.log("Museum: Room structure built.");
  } catch (err) {
    console.error("Museum: Building failed:", err);
  }

  /* ── Controls ─────────────────────────────────────────── */
  setProgress(0.9, "Preparing controls...");
  try {
    controls = new FirstPersonControls(camera, renderer.domElement);
  } catch (err) {
    console.error("Museum: Controls init failed:", err);
  }

  /* PointerLock lost → pause (e.g. user pressed ESC) */
  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement && appState === "playing") showPause();
  });

  /* ── UI wiring ────────────────────────────────────────── */
  $("enter-btn").addEventListener("click", enterGallery);
  $("resume-btn").addEventListener("click", resumeGallery);
  $("close-panel").addEventListener("click", closePanel);

  // Mobile Gyro Toggle
  const gyroBtn = $("gyro-btn");
  if (gyroBtn) {
    gyroBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const active = controls.toggleGyro();
      gyroBtn.textContent = active ? "Gyro: On" : "Gyro: Off";
    });
  }

  // Double-click/tap canvas to examine painting
  renderer.domElement.addEventListener("dblclick", () => {
    if (appState === "playing") {
      checkProximity();
      if (nearbyArtwork) openPanel(nearbyArtwork);
    }
  });

  imageViewer.addEventListener("wheel", onViewerWheel, { passive: false });
  imageViewer.addEventListener("pointerdown", onViewerPointerDown);
  imageViewer.addEventListener("pointermove", onViewerPointerMove);
  imageViewer.addEventListener("pointerup", onViewerPointerUp);
  imageViewer.addEventListener("pointercancel", onViewerPointerUp);
  imageViewer.addEventListener("dblclick", resetViewerTransform);
  imageViewer.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", onResize);

  /* ── Ready ────────────────────────────────────────────── */
  setProgress(1.0, "Welcome!");
  await sleep(500);

  loadingScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  appState = "start";

  animate();
}

/* ══════════════════════════════════════════════════════════
   RENDER LOOP
   ══════════════════════════════════════════════════════════ */
let frameCount = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (appState === "playing") {
    if (frameCount++ % 120 === 0) console.log("Museum: Rendering...");
    controls.update(dt, museum.getBounds());
    checkProximity();
  }

  renderer.render(scene, camera);
}

/* ── Crosshair / hint based on what player is looking at ── */
function checkProximity() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(museum.artworkMeshes);

  if (hits.length > 0) {
    nearbyArtwork = hits[0].object.userData.artwork;
    examineHint.classList.remove("hidden");
    hud.classList.add("near-art");
  } else {
    nearbyArtwork = null;
    examineHint.classList.add("hidden");
    hud.classList.remove("near-art");
  }
}

/* ══════════════════════════════════════════════════════════
   STATE TRANSITIONS
   ══════════════════════════════════════════════════════════ */

function enterGallery() {
  console.log("Museum: Entering gallery...");
  startScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  appState = "playing";
  try {
    controls.lock();
  } catch (e) {
    console.warn("Museum: Pointer lock request failed:", e);
  }
}

function showPause() {
  appState = "paused";
  hud.classList.add("hidden");
  pauseScreen.classList.remove("hidden");
  examineHint.classList.add("hidden");
  hud.classList.remove("near-art");
}

function resumeGallery() {
  pauseScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  appState = "playing";
  controls.lock();
}

function openPanel(art) {
  appState = "inspecting";
  controls.unlock();
  examineHint.classList.add("hidden");
  hud.classList.remove("near-art");

  /* Populate panel */
  resetViewerTransform();
  const img = panelImg;
  if (art.file) {
    img.src = art.file;
    img.style.display = "";
  } else {
    img.style.display = "none";
  }

  $("panel-title").textContent = art.title || "Untitled";
  $("panel-artist").textContent = art.artist || "";
  $("panel-year").textContent = art.year || "";
  $("panel-medium").textContent = art.medium || "";

  /* Show/hide the dot separator between year and medium */
  const dot = $("panel-year-dot");
  dot.style.display = art.year && art.medium ? "" : "none";

  /* Physical dimensions → cm */
  const d = art.dimensions || {};
  const wcm = d.width ? Math.round(d.width * 100) : null;
  const hcm = d.height ? Math.round(d.height * 100) : null;
  $("panel-dims").textContent = wcm && hcm ? `${wcm} × ${hcm} cm` : "";

  $("panel-desc").textContent = art.description || "";

  hud.classList.add("hidden");
  infoPanel.classList.remove("hidden");
}

function closePanel() {
  infoPanel.classList.add("hidden");
  hud.classList.remove("hidden");
  nearbyArtwork = null;
  appState = "playing";
  controls.lock();
}

/* ══════════════════════════════════════════════════════════
   INPUT
   ══════════════════════════════════════════════════════════ */
function onKeyDown(e) {
  if (e.code === "KeyE") {
    if (appState === "playing") {
      checkProximity();
      if (nearbyArtwork) {
        e.preventDefault();
        e.stopPropagation();
        openPanel(nearbyArtwork);
      }
    } else if (appState === "inspecting") {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    }
  } else if (e.code === "Escape" && appState === "inspecting") {
    closePanel();
  }
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════ */
function setProgress(frac, text) {
  $("loading-bar").style.width = frac * 100 + "%";
  $("loading-text").textContent = text;
}

function applyViewerTransform() {
  panelImg.style.transform = `translate(${viewerX}px, ${viewerY}px) scale(${viewerScale})`;
}

function resetViewerTransform() {
  viewerScale = 1;
  viewerX = 0;
  viewerY = 0;
  viewerDragging = false;
  magnifierActive = false;
  if (magnifierLens) magnifierLens.classList.add("hidden");
  if (imageViewer) imageViewer.classList.remove("dragging");
  if (panelImg) applyViewerTransform();
}

function updateMagnifier(e) {
  if (!magnifierActive || !panelImg.src) return;

  const rect = imageViewer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  magnifierLens.style.left = `${x - 130}px`;
  magnifierLens.style.top = `${y - 130}px`;

  const zoom = 2.5;
  const imgW = panelImg.offsetWidth * viewerScale;
  const imgH = panelImg.offsetHeight * viewerScale;

  const imgRect = panelImg.getBoundingClientRect();
  const relX = (e.clientX - imgRect.left) / viewerScale;
  const relY = (e.clientY - imgRect.top) / viewerScale;

  const bgX = -relX * zoom + 130 / viewerScale;
  const bgY = -relY * zoom + 130 / viewerScale;

  magnifierLens.style.backgroundImage = `url('${panelImg.src}')`;
  magnifierLens.style.backgroundSize = `${panelImg.offsetWidth * zoom}px ${panelImg.offsetHeight * zoom}px`;
  magnifierLens.style.backgroundPosition = `${bgX * viewerScale}px ${bgY * viewerScale}px`;
}

function onViewerWheel(e) {
  if (appState !== "inspecting") return;
  e.preventDefault();

  const previous = viewerScale;
  const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
  viewerScale = Math.max(0.45, Math.min(8, viewerScale * factor));

  /* Keep the point under the cursor roughly stable while zooming. */
  const rect = imageViewer.getBoundingClientRect();
  const cx = e.clientX - rect.left - rect.width / 2;
  const cy = e.clientY - rect.top - rect.height / 2;
  const ratio = viewerScale / previous;
  viewerX = cx - (cx - viewerX) * ratio;
  viewerY = cy - (cy - viewerY) * ratio;

  applyViewerTransform();
  if (magnifierActive) updateMagnifier(e);
}

function onViewerPointerDown(e) {
  if (appState !== "inspecting") return;

  if (e.button === 2 || e.ctrlKey) {
    magnifierActive = !magnifierActive;
    if (magnifierActive) {
      magnifierLens.classList.remove("hidden");
      updateMagnifier(e);
    } else {
      magnifierLens.classList.add("hidden");
    }
    return;
  }

  viewerDragging = true;
  viewerLastX = e.clientX;
  viewerLastY = e.clientY;
  imageViewer.classList.add("dragging");
  imageViewer.setPointerCapture(e.pointerId);
}

function onViewerPointerMove(e) {
  if (appState !== "inspecting") return;

  if (viewerDragging) {
    viewerX += e.clientX - viewerLastX;
    viewerY += e.clientY - viewerLastY;
    viewerLastX = e.clientX;
    viewerLastY = e.clientY;
    applyViewerTransform();
  }

  if (magnifierActive) {
    updateMagnifier(e);
  }
}

function onViewerPointerUp(e) {
  viewerDragging = false;
  imageViewer.classList.remove("dragging");
  if (
    imageViewer.hasPointerCapture &&
    imageViewer.hasPointerCapture(e.pointerId)
  ) {
    imageViewer.releasePointerCapture(e.pointerId);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── Boot ──────────────────────────────────────────────── */
init().catch((err) => {
  console.error("Museum init failed:", err);
  $("loading-text").textContent = "Error loading – see browser console.";
});
