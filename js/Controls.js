/* Controls.js
 * First-person walk controls using the PointerLock API.
 *
 *  WASD / Arrow keys  – move
 *  Left Shift         – sprint (2× speed)
 *  Mouse              – look (yaw + pitch)
 */

class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera     = camera;
    this.domElement = domElement;

    /* Look state */
    this.yaw   = 0;   // radians, around Y axis
    this.pitch = 0;   // radians, around X axis
    this.isLocked = false;

    /* Movement */
    this.walkSpeed   = 4.5;   // m/s
    this.sprintSpeed = 9.0;   // m/s
    this.sensitivity = 0.0018;

    /* Head-bob */
    this._bobT     = 0;
    this._bobAmp   = 0.032;
    this._bobFreq  = 7.5;
    this._eyeY     = camera.position.y;

    /* Keys currently held */
    this._keys = {};

    /* Bindings */
    this._onMove   = this._onMove.bind(this);
    this._onDown   = this._onDown.bind(this);
    this._onUp     = this._onUp.bind(this);
    this._onChange = this._onChange.bind(this);

    document.addEventListener('mousemove',         this._onMove);
    document.addEventListener('keydown',           this._onDown);
    document.addEventListener('keyup',             this._onUp);
    document.addEventListener('pointerlockchange', this._onChange);
  }

  /* ── Public API ─────────────────────────────────────── */

  lock()   { this.domElement.requestPointerLock(); }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  /** Call every frame while playing.
   *  @param {number} dt   seconds since last frame
   *  @param {object} bounds  { minX, maxX, minZ, maxZ }
   */
  update(dt, bounds) {
    if (!this.isLocked) return;

    const sprint = this._keys['ShiftLeft'] || this._keys['ShiftRight'];
    const speed  = sprint ? this.sprintSpeed : this.walkSpeed;

    /* Forward / right vectors (horizontal plane) */
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);

    let dx = 0, dz = 0;
    if (this._keys['KeyW'] || this._keys['ArrowUp'])    { dx -= sinY; dz -= cosY; }
    if (this._keys['KeyS'] || this._keys['ArrowDown'])  { dx += sinY; dz += cosY; }
    if (this._keys['KeyA'] || this._keys['ArrowLeft'])  { dx -= cosY; dz += sinY; }
    if (this._keys['KeyD'] || this._keys['ArrowRight']) { dx += cosY; dz -= sinY; }

    const len = Math.sqrt(dx * dx + dz * dz);
    const moving = len > 0.001;
    if (moving) { dx /= len; dz /= len; }

    let nx = this.camera.position.x + dx * speed * dt;
    let nz = this.camera.position.z + dz * speed * dt;

    /* Soft wall collision */
    if (bounds) {
      const pad = 0.55;
      nx = Math.max(bounds.minX + pad, Math.min(bounds.maxX - pad, nx));
      nz = Math.max(bounds.minZ + pad, Math.min(bounds.maxZ - pad, nz));
    }
    this.camera.position.x = nx;
    this.camera.position.z = nz;

    /* Head bob */
    if (moving) {
      this._bobT += dt * this._bobFreq * (sprint ? 1.6 : 1);
      this.camera.position.y = this._eyeY + Math.sin(this._bobT) * this._bobAmp;
    } else {
      /* Smoothly return to rest */
      this._bobT = 0;
      this.camera.position.y += (this._eyeY - this.camera.position.y) * Math.min(1, dt * 12);
    }
  }

  dispose() {
    document.removeEventListener('mousemove',         this._onMove);
    document.removeEventListener('keydown',           this._onDown);
    document.removeEventListener('keyup',             this._onUp);
    document.removeEventListener('pointerlockchange', this._onChange);
  }

  /* ── Private ────────────────────────────────────────── */

  _onChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  _onMove(e) {
    if (!this.isLocked) return;
    this.yaw   -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    this.pitch  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y     = this.yaw;
    this.camera.rotation.x     = this.pitch;
  }

  _onDown(e) { this._keys[e.code] = true; }
  _onUp(e)   { this._keys[e.code] = false; }
}
