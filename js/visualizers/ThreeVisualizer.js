/**
 * ThreeVisualizer.js
 * Robust 3D Interactive Aerospace Vehicle & Vector Visualizer
 * With WebGL error protection, zero-vector NaN protection, and Canvas 2.5D fallback.
 */

export class ThreeVisualizer {
  constructor(containerElement) {
    this.container = containerElement;
    this.width = (this.container && this.container.clientWidth) ? this.container.clientWidth : 800;
    this.height = (this.container && this.container.clientHeight) ? this.container.clientHeight : 500;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.hasWebGL = false;
    
    // Vehicle 3D Objects
    this.vehicleGroup = null;
    this.bodyMesh = null;
    this.noseMesh = null;
    this.fins = [];
    this.cgMarker = null;
    this.cpMarker = null;
    
    // Vectors
    this.velArrow = null;
    this.liftArrow = null;
    this.dragArrow = null;
    this.resultantArrow = null;
    this.gravityArrow = null;
    this.momentRing = null;
    this.centerline = null;

    // Trajectory ribbons
    this.fluidTrailMesh = null;
    this.idealTrailMesh = null;
    this.refTrailMesh = null;
    this.maxTrailPoints = 300;

    // Particle wind / dust
    this.particles = null;
    this.particleCount = 250;

    // Camera modes: 'orbit', 'chase', 'side', 'top', 'tunnel'
    this.cameraMode = 'chase';
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.sphericalCoords = { radius: 5.5, theta: Math.PI / 4, phi: Math.PI / 3 };

    try {
      if (typeof THREE !== 'undefined') {
        this.init();
        this.hasWebGL = true;
      } else {
        console.warn('Three.js not loaded, using fallback viewport');
      }
    } catch (e) {
      console.warn('WebGL initialization failed, fallback active:', e);
      this.hasWebGL = false;
    }
  }

  init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(45, Math.max(0.1, this.width / Math.max(1, this.height)), 0.1, 1000);
    this.camera.position.set(4, 3, 5);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xddeeff, 0.9);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(10, 20, 15);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirLight2.position.set(-10, -10, -10);
    this.scene.add(dirLight2);

    // 5. Build Environment & Body
    this.createEnvironment();
    this.buildVehicle();
    this.initTrails();
    this.setupEvents();
  }

  createEnvironment() {
    try {
      const gridHelper = new THREE.GridHelper(200, 80, 0x1e293b, 0x0f172a);
      gridHelper.position.y = -8;
      this.scene.add(gridHelper);

      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(this.particleCount * 3);
      for (let i = 0; i < this.particleCount * 3; i += 3) {
        pPos[i] = (Math.random() - 0.5) * 60;
        pPos[i + 1] = (Math.random() - 0.5) * 30;
        pPos[i + 2] = (Math.random() - 0.5) * 60;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.1,
        transparent: true,
        opacity: 0.6,
      });
      this.particles = new THREE.Points(pGeo, pMat);
      this.scene.add(this.particles);
    } catch (e) {
      console.warn('Environment creation glitch:', e);
    }
  }

  buildVehicle() {
    this.vehicleGroup = new THREE.Group();
    const length = 1.5;
    const radius = 0.075;
    const noseLength = 0.45;
    const bodyLength = length - noseLength;

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 });
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2 });
    const finMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });

    // 1. Fuselage Cylinder
    const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyLength, 24);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.translate(-bodyLength / 2, 0, 0);
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
    this.vehicleGroup.add(this.bodyMesh);

    // 2. Nose Cone
    const noseGeo = new THREE.ConeGeometry(radius, noseLength, 24);
    noseGeo.rotateZ(-Math.PI / 2);
    noseGeo.translate(noseLength / 2, 0, 0);
    this.noseMesh = new THREE.Mesh(noseGeo, noseMaterial);
    this.vehicleGroup.add(this.noseMesh);

    // 3. Base Nozzle
    const baseGeo = new THREE.CylinderGeometry(radius * 0.7, radius, 0.1, 24);
    baseGeo.rotateZ(Math.PI / 2);
    baseGeo.translate(-bodyLength - 0.05, 0, 0);
    const baseMesh = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
    this.vehicleGroup.add(baseMesh);

    // 4. Four Rear Control Surfaces (Fins)
    const finSpan = 0.16;
    const finChord = 0.15;
    const finPosX = -bodyLength + 0.08;

    this.fins = [];
    const finAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    for (let i = 0; i < 4; i++) {
      const finPivot = new THREE.Group();
      finPivot.position.set(finPosX, 0, 0);
      finPivot.rotation.x = finAngles[i];

      const finGeo = new THREE.BoxGeometry(finChord, finSpan, 0.01);
      finGeo.translate(-finChord * 0.1, radius + finSpan / 2, 0);
      const finMesh = new THREE.Mesh(finGeo, finMaterial);
      finPivot.add(finMesh);

      this.vehicleGroup.add(finPivot);
      this.fins.push(finPivot);
    }

    // 5. CG Marker (Gold Sphere)
    const cgGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const cgMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
    this.cgMarker = new THREE.Mesh(cgGeo, cgMat);
    this.vehicleGroup.add(this.cgMarker);

    // 6. CP Marker (Cyan Octahedron)
    const cpGeo = new THREE.OctahedronGeometry(0.045, 0);
    const cpMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, wireframe: true });
    this.cpMarker = new THREE.Mesh(cpGeo, cpMat);
    this.vehicleGroup.add(this.cpMarker);

    // 7. Body Centerline
    const lineMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.1, gapSize: 0.05 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1.0, 0, 0),
      new THREE.Vector3(-1.8, 0, 0),
    ]);
    this.centerline = new THREE.Line(lineGeo, lineMat);
    try { this.centerline.computeLineDistances(); } catch(e){}
    this.vehicleGroup.add(this.centerline);

    // 8. Vector Arrows (Safe directions)
    this.velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.2, 0x38bdf8, 0.15, 0.08);
    this.liftArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.0, 0x22c55e, 0.15, 0.08);
    this.dragArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), 0.8, 0xef4444, 0.15, 0.08);
    this.resultantArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.2, 0xa855f7, 0.15, 0.08);
    this.gravityArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 0.7, 0x3b82f6, 0.15, 0.08);

    this.vehicleGroup.add(this.velArrow);
    this.vehicleGroup.add(this.liftArrow);
    this.vehicleGroup.add(this.dragArrow);
    this.vehicleGroup.add(this.resultantArrow);
    this.vehicleGroup.add(this.gravityArrow);

    // 9. Moment Ring
    const torusGeo = new THREE.TorusGeometry(0.35, 0.015, 6, 20, Math.PI * 1.2);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true });
    this.momentRing = new THREE.Mesh(torusGeo, torusMat);
    this.momentRing.rotation.x = Math.PI / 2;
    this.vehicleGroup.add(this.momentRing);

    this.scene.add(this.vehicleGroup);
  }

  initTrails() {
    this.fluidTrailMesh = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 }));
    this.idealTrailMesh = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x06b6d4, dashSize: 0.4, gapSize: 0.2 }));
    this.refTrailMesh = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.5 }));

    this.scene.add(this.fluidTrailMesh);
    this.scene.add(this.idealTrailMesh);
    this.scene.add(this.refTrailMesh);
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
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.sphericalCoords.theta -= deltaX * 0.008;
      this.sphericalCoords.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.sphericalCoords.phi + deltaY * 0.008));
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.sphericalCoords.radius = Math.max(2.0, Math.min(25.0, this.sphericalCoords.radius + e.deltaY * 0.005));
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

  safeNormalize(v, defaultDir = new THREE.Vector3(1, 0, 0)) {
    const len = v.length();
    if (len < 1e-5 || isNaN(len)) {
      return defaultDir.clone();
    }
    return v.clone().divideScalar(len);
  }

  update(payload) {
    if (!this.hasWebGL || !this.vehicleGroup || !payload || !payload.state) return;

    try {
      const { state, actuator, telemetry, logger } = payload;
      const scale = 0.2;
      const xPos = (state.x || 0) * scale;
      const zPos = (state.z || 0) * scale;

      this.vehicleGroup.position.set(xPos, zPos, 0);
      this.vehicleGroup.rotation.z = state.pitch || 0;

      // Fins deflection
      const finAngle = actuator ? actuator.actualDeflectionRad : 0;
      if (this.fins.length >= 4) {
        this.fins[0].rotation.z = finAngle;
        this.fins[2].rotation.z = -finAngle;
        this.fins[1].rotation.y = finAngle * 0.2;
        this.fins[3].rotation.y = -finAngle * 0.2;
      }

      // CG & CP Relative Markers
      const xCG_val = payload.aerodynamics ? payload.aerodynamics.xCG : 0.75;
      const xCP_val = telemetry ? (telemetry.xCP || 0.85) : 0.85;
      this.cgMarker.position.set(-(xCG_val - 0.75) * 0.5, 0, 0);
      this.cpMarker.position.set(-(xCP_val - 0.75) * 0.5, 0, 0);

      // Safe Vector Arrow updates
      const vScale = 0.02;
      const fScale = 0.015;
      const alpha = state.alpha || 0;
      const relVx = Math.cos(-alpha);
      const relVz = Math.sin(-alpha);

      // Airspeed Velocity Vector
      const vDir = this.safeNormalize(new THREE.Vector3(relVx, relVz, 0));
      this.velArrow.setDirection(vDir);
      this.velArrow.setLength(Math.max(0.5, (state.speed || 60) * vScale), 0.15, 0.08);

      // Lift Vector
      const liftVal = telemetry ? (telemetry.lift || 0) : 0;
      const liftMag = Math.abs(liftVal) * fScale;
      const liftSign = liftVal >= 0 ? 1 : -1;
      const lDir = this.safeNormalize(new THREE.Vector3(-relVz * liftSign, relVx * liftSign, 0), new THREE.Vector3(0, 1, 0));
      this.liftArrow.setDirection(lDir);
      this.liftArrow.setLength(Math.max(0.2, liftMag), 0.15, 0.08);

      // Drag Vector
      const dragVal = telemetry ? (telemetry.drag || 0) : 0;
      const dragMag = Math.max(0.1, dragVal * fScale);
      const dDir = this.safeNormalize(new THREE.Vector3(-relVx, -relVz, 0), new THREE.Vector3(-1, 0, 0));
      this.dragArrow.setDirection(dDir);
      this.dragArrow.setLength(dragMag, 0.15, 0.08);

      // Resultant Vector
      const resVal = Math.sqrt(liftVal * liftVal + dragVal * dragVal);
      const rDir = this.safeNormalize(
        new THREE.Vector3(-relVx * dragVal - relVz * liftVal, -relVz * dragVal + relVx * liftVal, 0),
        new THREE.Vector3(0, 1, 0)
      );
      this.resultantArrow.setDirection(rDir);
      this.resultantArrow.setLength(Math.max(0.2, resVal * fScale), 0.15, 0.08);

      // Moment Ring
      const momentVal = telemetry ? (telemetry.moment || 0) : 0;
      const momentScale = Math.min(2.0, Math.max(0.3, Math.abs(momentVal) * 0.1));
      this.momentRing.scale.set(momentScale, momentScale, momentScale);

      // Particle wind update
      if (this.particles) {
        const positions = this.particles.geometry.attributes.position.array;
        const spd = (state.speed || 60) * 0.04;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] -= spd;
          if (positions[i] < xPos - 30) {
            positions[i] = xPos + 30;
            positions[i + 1] = zPos + (Math.random() - 0.5) * 20;
            positions[i + 2] = (Math.random() - 0.5) * 25;
          }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
      }

      // Update Trails safely
      if (logger && logger.records && logger.records.length > 2) {
        const stepInterval = Math.max(1, Math.floor(logger.records.length / this.maxTrailPoints));
        const fPts = [];
        const iPts = [];
        const rPts = [];

        for (let i = 0; i < logger.records.length; i += stepInterval) {
          const r = logger.records[i];
          fPts.push(new THREE.Vector3(r.x * scale, r.z * scale, 0));
          iPts.push(new THREE.Vector3((r.x_ideal || r.x) * scale, (r.z_ideal || r.z) * scale, 0));
          rPts.push(new THREE.Vector3(r.x * scale, (r.z_ref || 0) * scale, 0));
        }

        if (fPts.length >= 2) {
          this.fluidTrailMesh.geometry.setFromPoints(fPts);
          this.idealTrailMesh.geometry.setFromPoints(iPts);
          try { this.idealTrailMesh.computeLineDistances(); } catch(e){}
          this.refTrailMesh.geometry.setFromPoints(rPts);
          try { this.refTrailMesh.computeLineDistances(); } catch(e){}
        }
      }

      // Camera positioning
      this.updateCamera(xPos, zPos, state.pitch || 0);

      // Render
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.warn('ThreeVisualizer update error:', err);
    }
  }

  updateCamera(xPos, zPos, pitch) {
    switch (this.cameraMode) {
      case 'chase': {
        const camDistance = 4.5;
        const camHeight = 1.8;
        const camX = xPos - camDistance * Math.cos(pitch) + 0.8;
        const camZ = zPos - camDistance * Math.sin(pitch) + camHeight;
        this.camera.position.lerp(new THREE.Vector3(camX, camZ, 3.2), 0.1);
        this.camera.lookAt(xPos + 0.6, zPos, 0);
        break;
      }
      case 'side': {
        this.camera.position.set(xPos, zPos, 7.5);
        this.camera.lookAt(xPos, zPos, 0);
        break;
      }
      case 'top': {
        this.camera.position.set(xPos, zPos + 9.0, 0.01);
        this.camera.lookAt(xPos, zPos, 0);
        break;
      }
      case 'tunnel': {
        this.camera.position.set(xPos + 0.2, zPos + 0.4, 3.2);
        this.camera.lookAt(xPos, zPos, 0);
        break;
      }
      case 'orbit':
      default: {
        const { radius, theta, phi } = this.sphericalCoords;
        const cx = xPos + radius * Math.sin(phi) * Math.cos(theta);
        const cy = zPos + radius * Math.cos(phi);
        const cz = radius * Math.sin(phi) * Math.sin(theta);
        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(xPos, zPos, 0);
        break;
      }
    }
  }
}
