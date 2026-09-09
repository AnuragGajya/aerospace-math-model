/**
 * FlightReplay3D.js
 * High-Performance 3D Flight Telemetry Replay Engine
 * Renders the axisymmetric supersonic aerospace body, 4 movable rear fins,
 * true vs estimated trajectory ribbons, milestone markers, and dynamic camera modes.
 */

export class FlightReplay3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.width = (this.container && this.container.clientWidth) ? this.container.clientWidth : 800;
    this.height = (this.container && this.container.clientHeight) ? this.container.clientHeight : 500;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.hasWebGL = false;

    // 3D Objects
    this.vehicleGroup = null;
    this.fins = [];
    this.trueTrailMesh = null;
    this.estTrailMesh = null;
    this.errorVectorLine = null;
    this.milestoneMarkers = [];

    // Camera settings
    this.cameraMode = 'chase';
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.sphericalCoords = { radius: 6.0, theta: Math.PI / 4, phi: Math.PI / 3 };

    try {
      if (typeof THREE !== 'undefined') {
        this.init();
        this.hasWebGL = true;
      }
    } catch (e) {
      console.warn('FlightReplay3D WebGL init note:', e);
      this.hasWebGL = false;
    }
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.005);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, Math.max(0.1, this.width / Math.max(1, this.height)), 0.1, 2000);
    this.camera.position.set(5, 4, 6);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const amb = new THREE.AmbientLight(0xddeeff, 0.95);
    this.scene.add(amb);

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.3);
    dir1.position.set(20, 40, 30);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dir2.position.set(-20, -10, -20);
    this.scene.add(dir2);

    // 5. Environment & Grid
    const grid = new THREE.GridHelper(300, 60, 0x1e293b, 0x0f172a);
    grid.position.y = -2;
    this.scene.add(grid);

    // 6. Build Vehicle Body
    this.buildVehicle();

    // 7. Build Trajectory Meshes
    this.initTrails();

    // 8. Event Listeners
    this.setupEvents();
  }

  buildVehicle() {
    this.vehicleGroup = new THREE.Group();
    const length = 1.6;
    const radius = 0.08;
    const noseLength = 0.55;
    const bodyLength = length - noseLength;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const finMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide });

    // Fuselage
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyLength, 24);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.translate(-bodyLength / 2, 0, 0);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.vehicleGroup.add(bodyMesh);

    // Supersonic Tangent Ogive Nose
    const noseGeo = new THREE.ConeGeometry(radius, noseLength, 24);
    noseGeo.rotateZ(-Math.PI / 2);
    noseGeo.translate(noseLength / 2, 0, 0);
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    this.vehicleGroup.add(noseMesh);

    // Base Nozzle
    const baseGeo = new THREE.CylinderGeometry(radius * 0.7, radius, 0.1, 24);
    baseGeo.rotateZ(Math.PI / 2);
    baseGeo.translate(-bodyLength - 0.05, 0, 0);
    const baseMesh = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }));
    this.vehicleGroup.add(baseMesh);

    // 4 Movable Cruciform Control Fins
    const finSpan = 0.18;
    const finChord = 0.16;
    const finPosX = -bodyLength + 0.1;
    this.fins = [];
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(finPosX, 0, 0);
      pivot.rotation.x = angles[i];

      const fGeo = new THREE.BoxGeometry(finChord, finSpan, 0.012);
      fGeo.translate(-finChord * 0.15, radius + finSpan / 2, 0);
      const fMesh = new THREE.Mesh(fGeo, finMat);
      pivot.add(fMesh);

      this.vehicleGroup.add(pivot);
      this.fins.push(pivot);
    }

    // Velocity Vector Arrow
    this.velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.4, 0x38bdf8, 0.18, 0.09);
    this.vehicleGroup.add(this.velArrow);

    this.scene.add(this.vehicleGroup);
  }

  initTrails() {
    this.trueTrailMesh = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 }));
    this.estTrailMesh = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 0.6, gapSize: 0.3 }));
    this.errorVectorLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 }));

    this.scene.add(this.trueTrailMesh);
    this.scene.add(this.estTrailMesh);
    this.scene.add(this.errorVectorLine);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  setupEvents() {
    if (!this.renderer) return;
    const el = this.renderer.domElement;

    el.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    el.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMousePosition.x;
      const dy = e.clientY - this.previousMousePosition.y;

      this.sphericalCoords.theta -= dx * 0.008;
      this.sphericalCoords.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.sphericalCoords.phi + dy * 0.008));
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.sphericalCoords.radius = Math.max(2.5, Math.min(45.0, this.sphericalCoords.radius + e.deltaY * 0.006));
    }, { passive: false });

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 500;
    if (this.camera && this.renderer) {
      this.camera.aspect = Math.max(0.1, this.width / Math.max(1, this.height));
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }
  }

  /**
   * Render frame from flight telemetry dataset at step index
   * @param {Object} currentFrame - telemetry object from flightTelemetry array
   * @param {Array} allHistory - telemetry history up to current index
   */
  renderFrame(currentFrame, allHistory) {
    if (!this.hasWebGL || !currentFrame || !this.vehicleGroup) return;

    try {
      const scale = 0.008; // 100 meters = 0.8 scene units
      const xPos = (currentFrame.pos_x || currentFrame.x || 0) * scale;
      const yPos = (currentFrame.pos_y || currentFrame.y || 0) * scale;
      const zPos = (currentFrame.pos_z || currentFrame.z || 0) * scale;

      this.vehicleGroup.position.set(xPos, zPos, yPos);

      // Attitude calculation from velocity vector
      const vx = currentFrame.vel_x || currentFrame.vx || 1;
      const vy = currentFrame.vel_y || currentFrame.vy || 0;
      const vz = currentFrame.vel_z || currentFrame.vz || 0;
      const v_mag = Math.sqrt(vx * vx + vy * vy + vz * vz);

      const pitchAngle = Math.atan2(vz, Math.max(1.0, Math.sqrt(vx * vx + vy * vy)));
      const yawAngle = Math.atan2(vy, Math.max(0.1, vx));

      this.vehicleGroup.rotation.z = pitchAngle;
      this.vehicleGroup.rotation.y = -yawAngle;

      // Move 4 Cruciform Control Fins
      const ctrlPitchRad = ((currentFrame.ctrl_pitch_deg || 0) * Math.PI) / 180.0;
      const ctrlYawRad = ((currentFrame.ctrl_yaw_deg || 0) * Math.PI) / 180.0;

      if (this.fins.length >= 4) {
        this.fins[0].rotation.z = ctrlPitchRad;
        this.fins[2].rotation.z = -ctrlPitchRad;
        this.fins[1].rotation.y = ctrlYawRad;
        this.fins[3].rotation.y = -ctrlYawRad;
      }

      // Update Trails
      if (allHistory && allHistory.length >= 2) {
        const step = Math.max(1, Math.floor(allHistory.length / 250));
        const truePts = [];
        const estPts = [];

        for (let i = 0; i < allHistory.length; i += step) {
          const h = allHistory[i];
          truePts.push(new THREE.Vector3((h.pos_x || h.x) * scale, (h.pos_z || h.z) * scale, (h.pos_y || h.y || 0) * scale));
          estPts.push(new THREE.Vector3((h.est_x || h.pos_x) * scale, (h.est_z || h.pos_z) * scale, (h.est_y || 0) * scale));
        }

        if (truePts.length >= 2) {
          this.trueTrailMesh.geometry.setFromPoints(truePts);
          this.estTrailMesh.geometry.setFromPoints(estPts);
          try { this.estTrailMesh.computeLineDistances(); } catch(e){}
        }

        // Live Error vector line from true to estimated position
        const curTrue = new THREE.Vector3(xPos, zPos, yPos);
        const curEst = new THREE.Vector3((currentFrame.est_x || currentFrame.pos_x) * scale, (currentFrame.est_z || currentFrame.pos_z) * scale, (currentFrame.est_y || 0) * scale);
        this.errorVectorLine.geometry.setFromPoints([curTrue, curEst]);
      }

      // Camera Tracking
      this.updateCamera(xPos, zPos, yPos, pitchAngle, yawAngle);

      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.warn('FlightReplay3D renderFrame glitch:', err);
    }
  }

  updateCamera(x, z, y, pitch, yaw) {
    switch (this.cameraMode) {
      case 'chase': {
        const dist = 5.0;
        const height = 2.2;
        const cx = x - dist * Math.cos(pitch) * Math.cos(yaw);
        const cz = z - dist * Math.sin(pitch) + height;
        const cy = y - dist * Math.sin(yaw) + 0.8;
        this.camera.position.lerp(new THREE.Vector3(cx, cz, cy), 0.15);
        this.camera.lookAt(x + 1.2 * Math.cos(pitch), z + 1.2 * Math.sin(pitch), y);
        break;
      }
      case 'side': {
        this.camera.position.set(x, z + 1.0, y + 10.0);
        this.camera.lookAt(x, z, y);
        break;
      }
      case 'top': {
        this.camera.position.set(x, z + 12.0, y + 0.01);
        this.camera.lookAt(x, z, y);
        break;
      }
      case 'orbit':
      default: {
        const { radius, theta, phi } = this.sphericalCoords;
        const cx = x + radius * Math.sin(phi) * Math.cos(theta);
        const cz = z + radius * Math.cos(phi);
        const cy = y + radius * Math.sin(phi) * Math.sin(theta);
        this.camera.position.set(cx, cz, cy);
        this.camera.lookAt(x, z, y);
        break;
      }
    }
  }
}
