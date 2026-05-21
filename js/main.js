/* main.js
 * Application entry-point.
 * Initialises Three.js, loads artworks, wires up UI.
 *
 * State machine:  loading → start → playing ↔ paused
 *                                       ↓
 *                                   inspecting → playing
 */

'use strict';

/* ── Module globals ────────────────────────────────────── */
let renderer, scene, camera, clock, raycaster;
let controls, museum;
let nearbyArtwork = null;
let appState = 'loading';   // loading | start | playing | paused | inspecting

/* ── Cached DOM references ─────────────────────────────── */
const $ = id => document.getElementById(id);
const loadingScreen = $('loading-screen');
const startScreen   = $('start-screen');
const pauseScreen   = $('pause-screen');
const hud           = $('hud');
const infoPanel     = $('info-panel');
const examineHint   = $('examine-hint');

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
async function init() {
  /* ── Renderer ─────────────────────────────────────────── */
  const canvas = $('museum-canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputEncoding    = THREE.sRGBEncoding;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ── Scene & camera ───────────────────────────────────── */
  scene  = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0A0A);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 80);
  camera.position.set(0, 1.70, 6.0);   // start near south wall, facing north

  clock     = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  raycaster.far = 5.5;  // examine range in metres

  /* ── Load artworks ────────────────────────────────────── */
  setProgress(0.05, 'Loading artwork catalog…');
  const { artworks } = await ArtworkLoader.load(
    'artworks/manifest.json',
    p => setProgress(0.05 + p * 0.60, `Loading paintings… ${Math.round(p * 100)}%`)
  );

  /* ── Build museum ─────────────────────────────────────── */
  setProgress(0.70, 'Building gallery…');
  museum = new Museum(scene, artworks);
  museum.build();

  /* ── Controls ─────────────────────────────────────────── */
  setProgress(0.90, 'Preparing controls…');
  controls = new FirstPersonControls(camera, renderer.domElement);

  /* PointerLock lost → pause (e.g. user pressed ESC) */
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && appState === 'playing') showPause();
  });

  /* ── UI wiring ────────────────────────────────────────── */
  $('enter-btn').addEventListener('click',  enterGallery);
  $('resume-btn').addEventListener('click', resumeGallery);
  $('close-panel').addEventListener('click', closePanel);
  document.addEventListener('keydown',  onKeyDown);
  window.addEventListener('resize',     onResize);

  /* ── Ready ────────────────────────────────────────────── */
  setProgress(1.0, 'Welcome!');
  await sleep(500);

  loadingScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  appState = 'start';

  animate();
}

/* ══════════════════════════════════════════════════════════
   RENDER LOOP
   ══════════════════════════════════════════════════════════ */
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (appState === 'playing') {
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
    examineHint.classList.remove('hidden');
    hud.classList.add('near-art');
  } else {
    nearbyArtwork = null;
    examineHint.classList.add('hidden');
    hud.classList.remove('near-art');
  }
}

/* ══════════════════════════════════════════════════════════
   STATE TRANSITIONS
   ══════════════════════════════════════════════════════════ */

function enterGallery() {
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  appState = 'playing';
  controls.lock();
}

function showPause() {
  appState = 'paused';
  hud.classList.add('hidden');
  pauseScreen.classList.remove('hidden');
  examineHint.classList.add('hidden');
  hud.classList.remove('near-art');
}

function resumeGallery() {
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  appState = 'playing';
  controls.lock();
}

function openPanel(art) {
  appState = 'inspecting';
  controls.unlock();
  examineHint.classList.add('hidden');
  hud.classList.remove('near-art');

  /* Populate panel */
  const img = $('panel-img');
  if (art.file) {
    img.src = art.file;
    img.style.display = '';
  } else {
    img.style.display = 'none';
  }

  $('panel-title').textContent  = art.title  || 'Untitled';
  $('panel-artist').textContent = art.artist || '';
  $('panel-year').textContent   = art.year   || '';
  $('panel-medium').textContent = art.medium || '';

  /* Show/hide the dot separator between year and medium */
  const dot = $('panel-year-dot');
  dot.style.display = (art.year && art.medium) ? '' : 'none';

  /* Physical dimensions → cm */
  const d   = art.dimensions || {};
  const wcm = d.width  ? Math.round(d.width  * 100) : null;
  const hcm = d.height ? Math.round(d.height * 100) : null;
  $('panel-dims').textContent = (wcm && hcm) ? `${wcm} × ${hcm} cm` : '';

  $('panel-desc').textContent   = art.description || '';

  hud.classList.add('hidden');
  infoPanel.classList.remove('hidden');
}

function closePanel() {
  infoPanel.classList.add('hidden');
  hud.classList.remove('hidden');
  nearbyArtwork = null;
  appState = 'playing';
  controls.lock();
}

/* ══════════════════════════════════════════════════════════
   INPUT
   ══════════════════════════════════════════════════════════ */
function onKeyDown(e) {
  if (appState === 'playing' && e.code === 'KeyE' && nearbyArtwork) {
    openPanel(nearbyArtwork);
  }
  if (appState === 'inspecting' && (e.code === 'KeyE' || e.code === 'Escape')) {
    closePanel();
  }
}

/* ══════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════ */
function setProgress(frac, text) {
  $('loading-bar').style.width  = (frac * 100) + '%';
  $('loading-text').textContent = text;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Boot ──────────────────────────────────────────────── */
init().catch(err => {
  console.error('Museum init failed:', err);
  $('loading-text').textContent = 'Error loading – see browser console.';
});
