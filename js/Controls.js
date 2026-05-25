/* Controls.js
 * First-person walk controls using the PointerLock API.
 *
 *  WASD / Arrow keys  – move
 *  Left Shift         – sprint (2× speed)
 *  Mouse              – look (yaw + pitch)
 */

class FirstPersonControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    /* Look state */
    this.yaw = 0; // radians, around Y axis
    this.pitch = 0; // radians, around X axis
    this.isLocked = false;

    /* Mobile / Touch */
    this.isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.touchSensitivity = 0.003;
    this.lastTouchX = 0;
    this.lastTouchY = 0;

    /* Gyroscope */
    this.gyroEnabled = false;
    this.gyroYawBase = 0;
    this.gyroAlphaOffset = null;
    this.gyroBeta = 0;
    this.gyroGamma = 0;

    /* Joystick */
    this.joystickVector = { x: 0, y: 0 };
    this.joystickActive = false;

    /* Movement */
    this.walkSpeed = 4.5; // m/s
    this.sprintSpeed = 9.0; // m/s
    this.sensitivity = 0.0018;

    /* Head-bob */
    this._bobT = 0;
    this._bobAmp = 0.032;
    this._bobFreq = 7.5;
    this._eyeY = camera.position.y;

    /* Keys currently held */
    this._keys = {};

    /* Bindings */
    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onDeviceOrientation = this._onDeviceOrientation.bind(this);

    document.addEventListener("mousemove", this._onMove);
    document.addEventListener("keydown", this._onDown);
    document.addEventListener("keyup", this._onUp);
    document.addEventListener("pointerlockchange", this._onChange);

    if (this.isTouch) {
      document.addEventListener("touchstart", this._onTouchStart, {
        passive: false,
      });
      document.addEventListener("touchmove", this._onTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", this._onTouchEnd);
    }
  }

  /* ── Public API ─────────────────────────────────────── */

  lock() {
    if (!this.isTouch) {
      this.domElement.requestPointerLock();
    } else {
      this.isLocked = true;
    }
  }

  unlock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.isLocked = false;
  }

  toggleGyro() {
    if (!this.gyroEnabled) {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        DeviceOrientationEvent.requestPermission()
          .then((response) => {
            if (response === "granted") this._enableGyro();
          })
          .catch(console.error);
      } else {
        this._enableGyro();
      }
    } else {
      this._disableGyro();
    }
    return this.gyroEnabled;
  }

  _enableGyro() {
    window.addEventListener("deviceorientation", this._onDeviceOrientation);
    this.gyroEnabled = true;
    this.gyroAlphaOffset = null;
  }

  _disableGyro() {
    window.removeEventListener("deviceorientation", this._onDeviceOrientation);
    this.gyroEnabled = false;
  }

  /** Call every frame while playing.
   *  @param {number} dt   seconds since last frame
   *  @param {object} bounds  { minX, maxX, minZ, maxZ }
   */
  update(dt, bounds) {
    if (!this.isLocked) return;

    const sprint = this._keys["ShiftLeft"] || this._keys["ShiftRight"];
    const speed = sprint ? this.sprintSpeed : this.walkSpeed;

    /* Combine Keyboard and Joystick */
    let inputX = 0;
    let inputZ = 0;

    if (this._keys["KeyW"] || this._keys["ArrowUp"]) inputZ -= 1;
    if (this._keys["KeyS"] || this._keys["ArrowDown"]) inputZ += 1;
    if (this._keys["KeyA"] || this._keys["ArrowLeft"]) inputX -= 1;
    if (this._keys["KeyD"] || this._keys["ArrowRight"]) inputX += 1;

    // Add joystick input
    inputX += this.joystickVector.x;
    inputZ -= this.joystickVector.y;

    /* Apply looking rotation to movement */
    const currentYaw = this.yaw;
    const sinY = Math.sin(currentYaw);
    const cosY = Math.cos(currentYaw);

    let dx = inputX * cosY + inputZ * -sinY;
    let dz = inputX * -sinY + inputZ * -cosY;

    const len = Math.sqrt(dx * dx + dz * dz);
    const moving = len > 0.001;
    if (moving && len > 1) {
      dx /= len;
      dz /= len;
    }

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
      this.camera.position.y +=
        (this._eyeY - this.camera.position.y) * Math.min(1, dt * 12);
    }
  }

  dispose() {
    document.removeEventListener("mousemove", this._onMove);
    document.removeEventListener("keydown", this._onDown);
    document.removeEventListener("keyup", this._onUp);
    document.removeEventListener("pointerlockchange", this._onChange);
    if (this.isTouch) {
      document.removeEventListener("touchstart", this._onTouchStart);
      document.removeEventListener("touchmove", this._onTouchMove);
      document.removeEventListener("touchend", this._onTouchEnd);
      this._disableGyro();
    }
  }

  /* ── Private ────────────────────────────────────────── */

  _onChange() {
    if (!this.isTouch) {
      this.isLocked = document.pointerLockElement === this.domElement;
    }
  }

  _onMove(e) {
    if (!this.isLocked || this.isTouch) return;
    this._applyLook(
      e.movementX * this.sensitivity,
      e.movementY * this.sensitivity,
    );
  }

  _applyLook(dx, dy) {
    this.yaw -= dx;
    this.pitch -= dy;
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  _onDeviceOrientation(e) {
    if (!this.gyroEnabled) return;

    // Alpha (0-360) is compass direction, Beta is front-back tilt, Gamma is left-right tilt
    const alpha = THREE.MathUtils.degToRad(e.alpha);
    const beta = THREE.MathUtils.degToRad(e.beta);

    if (this.gyroAlphaOffset === null) {
      this.gyroAlphaOffset = alpha - this.yaw;
    }

    this.yaw = alpha - this.gyroAlphaOffset;
    this.pitch = beta - Math.PI / 2; // Adjust for holding phone vertically
    this._applyLook(0, 0); // Refresh camera
  }

  _onTouchStart(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      // Check if joystick zone (bottom left)
      if (
        t.clientX < window.innerWidth / 3 &&
        t.clientY > window.innerHeight / 2
      ) {
        this.joystickActive = true;
        this.joystickTouchId = t.identifier;
        this.joystickOriginX = t.clientX;
        this.joystickOriginY = t.clientY;
      } else {
        this.lookTouchId = t.identifier;
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
      }
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this.joystickActive && t.identifier === this.joystickTouchId) {
        const dx = t.clientX - this.joystickOriginX;
        const dy = t.clientY - this.joystickOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const max = 40;
        const strength = Math.min(dist, max) / max;
        const angle = Math.atan2(dy, dx);

        this.joystickVector.x = Math.cos(angle) * strength;
        this.joystickVector.y = -Math.sin(angle) * strength;

        const knob = document.getElementById("joystick-knob");
        if (knob) {
          knob.style.transform = `translate(${Math.cos(angle) * strength * 30}px, ${Math.sin(angle) * strength * 30}px)`;
        }
      } else if (t.identifier === this.lookTouchId) {
        const dx = t.clientX - this.lastTouchX;
        const dy = t.clientY - this.lastTouchY;
        this._applyLook(dx * this.touchSensitivity, dy * this.touchSensitivity);
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
      }
    }
  }

  _onTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.joystickTouchId) {
        this.joystickActive = false;
        this.joystickVector = { x: 0, y: 0 };
        const knob = document.getElementById("joystick-knob");
        if (knob) knob.style.transform = "translate(0,0)";
      }
    }
  }

  _onDown(e) {
    this._keys[e.code] = true;
  }
  _onUp(e) {
    this._keys[e.code] = false;
  }
}
