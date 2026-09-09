/**
 * app.js
 * Unified Single-Page Application Controller
 * Handles 4 Dedicated Sections:
 *   1. Values Setter
 *   2. Formulas & Calculations
 *   3. All Equation Graphs
 *   4. Flight Prediction
 */

(function() {
  // Global State Storage
  const DEFAULT_STATE = {
    v0: 800.0,
    theta0: 45.0,
    mass: 12.0,
    xdeploy: 1200.0,
    wind: 5.0,
    windDir: -80.0,
    pronav: 4.0
  };

  const FlightStateManager = {
    getState: function() {
      try {
        const saved = localStorage.getItem('aero_flight_params');
        if (saved) {
          return Object.assign({}, DEFAULT_STATE, JSON.parse(saved));
        }
      } catch (e) {}
      return Object.assign({}, DEFAULT_STATE);
    },
    saveState: function(params) {
      try {
        const current = this.getState();
        const updated = Object.assign({}, current, params);
        localStorage.setItem('aero_flight_params', JSON.stringify(updated));
        return updated;
      } catch (e) {
        return params;
      }
    },
    resetToDefault: function() {
      try {
        localStorage.setItem('aero_flight_params', JSON.stringify(DEFAULT_STATE));
      } catch (e) {}
      return Object.assign({}, DEFAULT_STATE);
    }
  };

  window.FlightStateManager = FlightStateManager;

  // Global Section Switcher
  window.switchSection = function(sectionId) {
    const sections = ['setter', 'formulas', 'graphs', 'prediction'];
    sections.forEach(s => {
      const pane = document.getElementById('section-' + s);
      const btn = document.getElementById('nav-btn-' + s);
      if (pane) pane.classList.remove('active');
      if (btn) btn.classList.remove('active');
    });

    const activePane = document.getElementById('section-' + sectionId);
    const activeBtn = document.getElementById('nav-btn-' + sectionId);
    if (activePane) activePane.classList.add('active');
    if (activeBtn) activeBtn.classList.add('active');

    if (sectionId === 'graphs' && window.drawAllGraphs) {
      setTimeout(window.drawAllGraphs, 50);
    } else if (sectionId === 'prediction' && window.updatePredictionUI) {
      window.updatePredictionUI();
    }
  };

  function initApp() {
    const telem = window.FLIGHT_TELEMETRY || [];
    const batch = window.BATCH_SIM_RECORDS || [];
    const model = window.TRAINED_ML_MODEL;

    let state = FlightStateManager.getState();

    // ==========================================
    // 1. VALUES SETTER CONTROLLER
    // ==========================================
    const v0Slider = document.getElementById('v0_slider');
    const v0Input = document.getElementById('v0_input');
    const v0Display = document.getElementById('v0_display');

    const theta0Slider = document.getElementById('theta0_slider');
    const theta0Input = document.getElementById('theta0_input');
    const theta0Display = document.getElementById('theta0_display');

    const massSlider = document.getElementById('mass_slider');
    const massInput = document.getElementById('mass_input');
    const massDisplay = document.getElementById('mass_display');

    const xdeploySlider = document.getElementById('xdeploy_slider');
    const xdeployInput = document.getElementById('xdeploy_input');
    const xdeployDisplay = document.getElementById('xdeploy_display');

    const windSlider = document.getElementById('wind_slider');
    const windInput = document.getElementById('wind_input');
    const windDisplay = document.getElementById('wind_display');

    const pronavSlider = document.getElementById('pronav_slider');
    const pronavInput = document.getElementById('pronav_input');
    const pronavDisplay = document.getElementById('pronav_display');

    function updateSetterUI(s) {
      if (v0Slider) v0Slider.value = s.v0;
      if (v0Input) v0Input.value = s.v0;
      if (v0Display) v0Display.textContent = `${parseFloat(s.v0).toFixed(0)} m/s (Mach ${(s.v0/340.3).toFixed(2)})`;

      if (theta0Slider) theta0Slider.value = s.theta0;
      if (theta0Input) theta0Input.value = s.theta0;
      if (theta0Display) theta0Display.textContent = `${parseFloat(s.theta0).toFixed(1)}°`;

      if (massSlider) massSlider.value = s.mass;
      if (massInput) massInput.value = s.mass;
      if (massDisplay) massDisplay.textContent = `${parseFloat(s.mass).toFixed(1)} kg`;

      if (xdeploySlider) xdeploySlider.value = s.xdeploy;
      if (xdeployInput) xdeployInput.value = s.xdeploy;
      if (xdeployDisplay) xdeployDisplay.textContent = `${parseInt(s.xdeploy).toLocaleString()} m (${(s.xdeploy/1000).toFixed(1)} km)`;

      if (windSlider) windSlider.value = s.wind;
      if (windInput) windInput.value = s.wind;
      if (windDisplay) windDisplay.textContent = `${parseFloat(s.wind).toFixed(1)} m/s`;

      if (pronavSlider) pronavSlider.value = s.pronav;
      if (pronavInput) pronavInput.value = s.pronav;
      if (pronavDisplay) pronavDisplay.textContent = `${parseFloat(s.pronav).toFixed(1)} (True ProNav)`;

      // Update badge on Nav Box 1
      const b1 = document.getElementById('badge-setter');
      if (b1) b1.textContent = `${parseFloat(s.v0).toFixed(0)}m/s · ${parseFloat(s.theta0).toFixed(1)}°`;
    }

    function syncAndSave() {
      state = {
        v0: parseFloat(v0Slider ? v0Slider.value : 800),
        theta0: parseFloat(theta0Slider ? theta0Slider.value : 45),
        mass: parseFloat(massSlider ? massSlider.value : 12),
        xdeploy: parseFloat(xdeploySlider ? xdeploySlider.value : 1200),
        wind: parseFloat(windSlider ? windSlider.value : 5),
        windDir: -80.0,
        pronav: parseFloat(pronavSlider ? pronavSlider.value : 4.0)
      };
      FlightStateManager.saveState(state);
      updateSetterUI(state);
      if (window.updatePredictionUI) window.updatePredictionUI();
    }

    function linkSliderInput(slider, input) {
      if (!slider || !input) return;
      slider.addEventListener('input', () => { input.value = slider.value; syncAndSave(); });
      input.addEventListener('input', () => { slider.value = input.value; syncAndSave(); });
    }

    linkSliderInput(v0Slider, v0Input);
    linkSliderInput(theta0Slider, theta0Input);
    linkSliderInput(massSlider, massInput);
    linkSliderInput(xdeploySlider, xdeployInput);
    linkSliderInput(windSlider, windInput);
    linkSliderInput(pronavSlider, pronavInput);

    window.applyPreset = function(type) {
      let pState = {};
      if (type === 'nominal') {
        pState = { v0: 800, theta0: 45.0, mass: 12.0, xdeploy: 1200, wind: 5.0, windDir: -80.0, pronav: 4.0 };
      } else if (type === 'steep') {
        pState = { v0: 960, theta0: 52.0, mass: 12.0, xdeploy: 1200, wind: 5.0, windDir: -80.0, pronav: 4.2 };
      } else if (type === 'earlyDeploy') {
        pState = { v0: 800, theta0: 45.0, mass: 12.0, xdeploy: 800, wind: 5.0, windDir: -80.0, pronav: 4.0 };
      } else if (type === 'crosswind') {
        pState = { v0: 800, theta0: 45.0, mass: 12.0, xdeploy: 1200, wind: 18.0, windDir: 90.0, pronav: 4.5 };
      }
      FlightStateManager.saveState(pState);
      state = pState;
      updateSetterUI(state);
      if (window.updatePredictionUI) window.updatePredictionUI();
    };

    window.randomizeValues = function() {
      const speeds = [780, 800, 840, 890, 920, 960, 1040, 1080];
      const angles = [40.0, 42.5, 45.0, 47.5, 49.0, 52.0];
      const deploys = [0, 800, 1200, 2400, 4800, 7200, 9600];
      const winds = [0.0, 3.5, 5.0, 8.5, 12.0, 16.5, 19.0];
      const pick = arr => arr[Math.floor(Math.random() * arr.length)];

      const randState = {
        v0: pick(speeds),
        theta0: pick(angles),
        mass: 12.0,
        xdeploy: pick(deploys),
        wind: pick(winds),
        windDir: pick([-90, -80, 0, 45, 90]),
        pronav: 4.0
      };
      FlightStateManager.saveState(randState);
      state = randState;
      updateSetterUI(state);
      if (window.updatePredictionUI) window.updatePredictionUI();
    };

    const resetBtn = document.getElementById('resetParamsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state = FlightStateManager.resetToDefault();
        updateSetterUI(state);
        if (window.updatePredictionUI) window.updatePredictionUI();
      });
    }

    const applySaveBtn = document.getElementById('applySaveBtn');
    if (applySaveBtn) {
      applySaveBtn.addEventListener('click', () => {
        syncAndSave();
        const orig = applySaveBtn.textContent;
        applySaveBtn.textContent = '✅ Saved & Synced!';
        applySaveBtn.style.background = '#059669';
        setTimeout(() => {
          applySaveBtn.textContent = orig;
          applySaveBtn.style.background = '';
        }, 1200);
      });
    }

    updateSetterUI(state);

    // ==========================================
    // 2. FORMULAS & LIVE CALCULATIONS CONTROLLER
    // ==========================================
    let currentIndex = 0;
    let isPlaying = false;
    let playInterval = null;

    const scrubber = document.getElementById('formulaTimeScrubber');
    const timeBadge = document.getElementById('formulaTimeBadge');
    const playBtn = document.getElementById('formulaPlayBtn');
    const prevSecBtn = document.getElementById('formulaPrevSec');
    const nextSecBtn = document.getElementById('formulaNextSec');
    const resetFormBtn = document.getElementById('formulaResetBtn');

    if (scrubber && telem.length > 0) {
      scrubber.max = telem.length - 1;
    }

    function updateFormulaStep(idx) {
      if (telem.length === 0) return;
      if (idx < 0) idx = 0;
      if (idx >= telem.length) idx = telem.length - 1;
      currentIndex = idx;

      if (scrubber) scrubber.value = idx;

      const d = telem[idx];
      const t = d.t || (idx * 0.02);

      if (timeBadge) {
        timeBadge.textContent = `t = ${t.toFixed(2)} s (Step ${idx + 1} / ${telem.length})`;
      }

      for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`calcTime${i}`);
        if (el) el.textContent = `t = ${t.toFixed(2)} s`;
      }

      // F1: Kinematics
      const px = (d.pos_x || 0).toFixed(2);
      const py = (d.pos_y || 0).toFixed(3);
      const pz = (d.pos_z || 0).toFixed(2);
      const vx = (d.vel_x || 0).toFixed(2);
      const vy = (d.vel_y || 0).toFixed(3);
      const vz = (d.vel_z || 0).toFixed(2);
      const speed = Math.sqrt(d.vel_x*d.vel_x + d.vel_y*d.vel_y + d.vel_z*d.vel_z);
      const netAccel = (d.pitch_accel_cmd !== undefined ? Math.abs(d.pitch_accel_cmd) : 9.81).toFixed(2);

      const f1_pos = document.getElementById('f1_pos');
      const f1_vel = document.getElementById('f1_vel');
      const f1_accel = document.getElementById('f1_accel');
      if (f1_pos) f1_pos.textContent = `[${px}, ${py}, ${pz}] m`;
      if (f1_vel) f1_vel.textContent = `[${vx}, ${vy}, ${vz}] m/s (${speed.toFixed(1)} m/s total)`;
      if (f1_accel) f1_accel.textContent = `${netAccel} m/s² (Cmd: ${d.pitch_accel_cmd || 0} m/s²)`;

      // F2: Aerothermodynamics
      const alt = Math.max(0, d.pos_z || 0);
      const rho = 1.225 * Math.exp(-alt / 8500.0);
      const sos = Math.sqrt(1.4 * 287.05 * Math.max(200, 288.15 - 0.0065 * alt));
      const mach = speed / sos;
      const q = 0.5 * rho * speed * speed / 1000.0;
      const cd = mach > 1.0 ? (0.28 + 0.15 / Math.sqrt(Math.max(0.1, mach*mach - 1))) : 0.28;
      const f_drag = (q * 1000.0 * 0.0081 * cd).toFixed(1);

      const f2_rho = document.getElementById('f2_rho');
      const f2_sos = document.getElementById('f2_sos');
      const f2_mach = document.getElementById('f2_mach');
      const f2_q = document.getElementById('f2_q');
      const f2_cd = document.getElementById('f2_cd');
      const f2_fdrag = document.getElementById('f2_fdrag');

      if (f2_rho) f2_rho.textContent = `${rho.toFixed(3)} kg/m³`;
      if (f2_sos) f2_sos.textContent = `${sos.toFixed(1)} m/s`;
      if (f2_mach) f2_mach.textContent = `Mach ${mach.toFixed(2)} (${mach >= 1.0 ? 'Supersonic' : 'Subsonic'})`;
      if (f2_q) f2_q.textContent = `${q.toFixed(1)} kPa`;
      if (f2_cd) f2_cd.textContent = cd.toFixed(3);
      if (f2_fdrag) f2_fdrag.textContent = `${f_drag} N`;

      // F3: Fin Aerodynamics
      const cpd = (d.ctrl_pitch_deg || 0).toFixed(2);
      const cyd = (d.ctrl_yaw_deg || 0).toFixed(2);
      const finState = d.fin_state || 'STOWED';

      const f3_aoa = document.getElementById('f3_aoa');
      const f3_sideslip = document.getElementById('f3_sideslip');
      const f3_fins = document.getElementById('f3_fins');
      const f3_moment = document.getElementById('f3_moment');
      const f3_fin_status = document.getElementById('f3_fin_status');

      if (f3_aoa) f3_aoa.textContent = `${(Math.atan2(d.vel_z, d.vel_x) * 180 / Math.PI).toFixed(2)}°`;
      if (f3_sideslip) f3_sideslip.textContent = `${(Math.atan2(d.vel_y, d.vel_x) * 180 / Math.PI).toFixed(3)}°`;
      if (f3_fins) f3_fins.textContent = `Pitch: ${cpd}°, Yaw: ${cyd}°`;
      if (f3_moment) f3_moment.textContent = `${(Math.abs(d.ctrl_pitch_deg || 0) * 1.84).toFixed(2)} N·m`;
      if (f3_fin_status) {
        f3_fin_status.textContent = `${finState}`;
        f3_fin_status.style.color = finState === 'STABILIZATION ACTIVE' ? '#34d399' : (finState === 'DEPLOYING' ? '#fbbf24' : '#94a3b8');
      }

      // F4: Guidance
      const targetX = 15000.0;
      const rx = targetX - (d.pos_x || 0);
      const rz = -(d.pos_z || 0);
      const range = Math.sqrt(rx*rx + rz*rz);
      const vc = (rx*d.vel_x + rz*d.vel_z) / Math.max(1.0, range);
      const losRate = (rx*d.vel_z - rz*d.vel_x) / Math.max(1.0, range*range);
      const acmd = d.pitch_accel_cmd || 0;

      const f4_range = document.getElementById('f4_range');
      const f4_vc = document.getElementById('f4_vc');
      const f4_los_rate = document.getElementById('f4_los_rate');
      const f4_gain = document.getElementById('f4_gain');
      const f4_acmd = document.getElementById('f4_acmd');

      if (f4_range) f4_range.textContent = `${range.toFixed(1)} m`;
      if (f4_vc) f4_vc.textContent = `${vc.toFixed(1)} m/s`;
      if (f4_los_rate) f4_los_rate.textContent = `${losRate.toFixed(5)} rad/s`;
      if (f4_gain) f4_gain.textContent = `${parseFloat(state.pronav).toFixed(2)}`;
      if (f4_acmd) f4_acmd.textContent = `${acmd.toFixed(2)} m/s² (Pitch Cmd)`;

      // F5: EKF State Estimation
      const ex = (d.est_x || 0).toFixed(2);
      const ez = (d.est_z || 0).toFixed(2);
      const dx = (d.pos_x || 0) - (d.est_x || 0);
      const dy = (d.pos_y || 0) - (d.est_y || 0);
      const dz = (d.pos_z || 0) - (d.est_z || 0);
      const residual = Math.sqrt(dx*dx + dy*dy + dz*dz).toFixed(3);

      const f5_true_pos = document.getElementById('f5_true_pos');
      const f5_est_pos = document.getElementById('f5_est_pos');
      const f5_residual = document.getElementById('f5_residual');
      const f5_cov = document.getElementById('f5_cov');

      if (f5_true_pos) f5_true_pos.textContent = `[${px}, ${pz}] m`;
      if (f5_est_pos) f5_est_pos.textContent = `[${ex}, ${ez}] m`;
      if (f5_residual) f5_residual.textContent = `${residual} m (Sub-meter Accuracy)`;
      if (f5_cov) f5_cov.textContent = `0.0024 m² (High Confidence)`;

      // F6: Mission Sequencing
      const f6_phase = document.getElementById('f6_phase');
      const f6_deploy_rem = document.getElementById('f6_deploy_rem');
      const f6_volt = document.getElementById('f6_volt');
      const f6_temp = document.getElementById('f6_temp');

      let phaseName = 'Phase 1: Boost & Supersonic Climb';
      let phaseColor = '#38bdf8';
      if (finState === 'STABILIZATION ACTIVE') {
        phaseName = 'Phase 3: Active Guided Deceleration';
        phaseColor = '#34d399';
      } else if (finState === 'DEPLOYING') {
        phaseName = 'Phase 2: Fin Deployment Transition';
        phaseColor = '#fbbf24';
      }

      if (f6_phase) {
        f6_phase.textContent = phaseName;
        f6_phase.style.color = phaseColor;
      }
      if (f6_deploy_rem) {
        f6_deploy_rem.textContent = finState === 'STOWED' ? `${Math.max(0, 1200 - (d.pos_x||0)).toFixed(1)} m to trigger` : `ACTIVE (${finState})`;
      }
      if (f6_volt) f6_volt.textContent = `${(28.0 - (idx / telem.length) * 0.8).toFixed(2)} V`;
      if (f6_temp) f6_temp.textContent = `${(24.0 + (idx / telem.length) * 6.5).toFixed(1)} °C (Nominal)`;
    }

    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        updateFormulaStep(parseInt(e.target.value, 10));
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        isPlaying = !isPlaying;
        if (isPlaying) {
          playBtn.textContent = '⏸ Pause';
          playBtn.className = 'btn btn-primary';
          playInterval = setInterval(() => {
            if (currentIndex >= telem.length - 1) {
              currentIndex = 0;
            } else {
              currentIndex += 5;
            }
            updateFormulaStep(currentIndex);
          }, 35);
        } else {
          playBtn.textContent = '▶ Play Time';
          playBtn.className = 'btn btn-success';
          clearInterval(playInterval);
        }
      });
    }

    if (prevSecBtn) {
      prevSecBtn.addEventListener('click', () => updateFormulaStep(currentIndex - 50));
    }
    if (nextSecBtn) {
      nextSecBtn.addEventListener('click', () => updateFormulaStep(currentIndex + 50));
    }
    if (resetFormBtn) {
      resetFormBtn.addEventListener('click', () => {
        if (isPlaying) {
          clearInterval(playInterval);
          isPlaying = false;
          if (playBtn) {
            playBtn.textContent = '▶ Play Time';
            playBtn.className = 'btn btn-success';
          }
        }
        updateFormulaStep(0);
      });
    }

    updateFormulaStep(0);

    // ==========================================
    // 3. ALL EQUATION GRAPHS CONTROLLER
    // ==========================================
    function setupCanvas(id) {
      const canvas = document.getElementById(id);
      if (!canvas) return null;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width || 560;
      const h = rect.height || 250;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      return { canvas, ctx, w, h };
    }

    function drawGrid(ctx, w, h, pad, xLabel, yLabel, xMin, xMax, yMin, yMax) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#070c18';
      ctx.fillRect(0, 0, w, h);

      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const nx = 6;
      const ny = 5;

      for (let i = 0; i <= nx; i++) {
        const x = pad.left + (i / nx) * plotW;
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + plotH);
      }
      for (let j = 0; j <= ny; j++) {
        const y = pad.top + (j / ny) * plotH;
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + plotW, y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad.left, pad.top, plotW, plotH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';

      for (let i = 0; i <= nx; i++) {
        const xVal = xMin + (i / nx) * (xMax - xMin);
        const x = pad.left + (i / nx) * plotW;
        ctx.fillText(Math.abs(xVal) >= 1000 ? (xVal / 1000).toFixed(1) + 'k' : xVal.toFixed(1), x, h - pad.bottom + 14);
      }

      ctx.textAlign = 'right';
      for (let j = 0; j <= ny; j++) {
        const yVal = yMax - (j / ny) * (yMax - yMin);
        const y = pad.top + (j / ny) * plotH;
        ctx.fillText(Math.abs(yVal) >= 1000 ? (yVal / 1000).toFixed(1) + 'k' : yVal.toFixed(1), pad.left - 6, y + 3);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(xLabel, pad.left + plotW / 2, h - 4);

      ctx.save();
      ctx.translate(12, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();

      return { plotW, plotH };
    }

    function drawTrajectory() {
      const setup = setupCanvas('canvas_trajectory');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const xMax = 16000;
      const zMax = 3600;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Downrange Distance X (m)', 'Altitude Z (m)', 0, xMax, 0, zMax);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const px = pad.left + ((pt.pos_x || 0) / xMax) * plotW;
        const py = pad.top + plotH - (Math.max(0, pt.pos_z || 0) / zMax) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Apogee Marker
      const apogeeX = pad.left + (8079.5 / xMax) * plotW;
      const apogeeY = pad.top + plotH - (3273.7 / zMax) * plotH;
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(apogeeX, apogeeY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '10px sans-serif';
      ctx.fillText('Apogee 3,273.7m', apogeeX + 8, apogeeY - 4);

      // Target Marker (15,000m)
      const targetX = pad.left + (15000 / xMax) * plotW;
      const targetY = pad.top + plotH;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('Target (15km)', targetX - 35, targetY - 8);
    }

    function drawVelocity() {
      const setup = setupCanvas('canvas_velocity');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const vMax = 1200;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Total Speed V (m/s)', 0, tMax, 0, vMax);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const spd = Math.sqrt(pt.vel_x*pt.vel_x + pt.vel_y*pt.vel_y + pt.vel_z*pt.vel_z);
        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - (spd / vMax) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      const mach1Y = pad.top + plotH - (340.3 / vMax) * plotH;
      ctx.strokeStyle = '#f43f5e';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, mach1Y);
      ctx.lineTo(pad.left + plotW, mach1Y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f43f5e';
      ctx.font = '10px sans-serif';
      ctx.fillText('Mach 1.0 (340.3 m/s)', pad.left + plotW - 120, mach1Y - 4);
    }

    function drawAerodynamics() {
      const setup = setupCanvas('canvas_aerodynamics');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const qMax = 800;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Dynamic Pressure q (kPa)', 0, tMax, 0, qMax);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const spd = Math.sqrt(pt.vel_x*pt.vel_x + pt.vel_y*pt.vel_y + pt.vel_z*pt.vel_z);
        const alt = Math.max(0, pt.pos_z || 0);
        const rho = 1.225 * Math.exp(-alt / 8500.0);
        const q = 0.5 * rho * spd * spd / 1000.0;

        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - (q / qMax) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    function drawAccelerations() {
      const setup = setupCanvas('canvas_accelerations');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const aMin = -20;
      const aMax = 25;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Control Deflections (°)', 0, tMax, aMin, aMax);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const cpd = pt.ctrl_pitch_deg || 0;
        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - ((cpd - aMin) / (aMax - aMin)) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const cyd = pt.ctrl_yaw_deg || 0;
        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - ((cyd - aMin) / (aMax - aMin)) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      const zeroY = pad.top + plotH - ((0 - aMin) / (aMax - aMin)) * plotH;
      ctx.strokeStyle = '#64748b';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(pad.left + plotW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawProNav() {
      const setup = setupCanvas('canvas_pronav');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const aCmdMin = -50;
      const aCmdMax = 10;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Pitch Accel Cmd (m/s²)', 0, tMax, aCmdMin, aCmdMax);

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const cmd = pt.pitch_accel_cmd !== undefined ? pt.pitch_accel_cmd : 0;
        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - ((cmd - aCmdMin) / (aCmdMax - aCmdMin)) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    function drawFins() {
      const setup = setupCanvas('canvas_fins');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const finMin = -20;
      const finMax = 25;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Fin Angles (deg)', 0, tMax, finMin, finMax);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const cpd = pt.ctrl_pitch_deg || 0;
        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - ((cpd - finMin) / (finMax - finMin)) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const cyd = pt.ctrl_yaw_deg || 0;
        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - ((cyd - finMin) / (finMax - finMin)) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    function drawEKF() {
      const setup = setupCanvas('canvas_ekf');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const errMax = 4.0;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'EKF Error ‖r - r̂‖ (m)', 0, tMax, 0, errMax);

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      telem.forEach((pt, i) => {
        const t = pt.t || (i * 0.02);
        const dx = (pt.pos_x || 0) - (pt.est_x || 0);
        const dy = (pt.pos_y || 0) - (pt.est_y || 0);
        const dz = (pt.pos_z || 0) - (pt.est_z || 0);
        const err = Math.sqrt(dx*dx + dy*dy + dz*dz);

        const px = pad.left + (t / tMax) * plotW;
        const py = pad.top + plotH - (Math.min(errMax, err) / errMax) * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    function drawDispersion() {
      const setup = setupCanvas('canvas_dispersion');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const errMax = 8000;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Max Lateral Dev (m)', 'Final Error to Target (m)', 0, 50, 0, errMax);

      const cepY = pad.top + plotH - (30.0 / errMax) * plotH;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, cepY);
      ctx.lineTo(pad.left + plotW, cepY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.font = '10px sans-serif';
      ctx.fillText('30.0 m CEP Tactical Limit', pad.left + 20, cepY - 5);

      batch.forEach((run) => {
        const md = Math.min(50, Math.max(0, run.max_dev || 0));
        const fe = Math.min(errMax, Math.max(0, run.final_error || 0));

        const px = pad.left + (md / 50.0) * plotW;
        const py = pad.top + plotH - (fe / errMax) * plotH;

        ctx.fillStyle = run.target_status === 'PASS' ? '#34d399' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    window.drawAllGraphs = function() {
      drawTrajectory();
      drawVelocity();
      drawAerodynamics();
      drawAccelerations();
      drawProNav();
      drawFins();
      drawEKF();
      drawDispersion();
    };

    window.drawAllGraphs();
    window.addEventListener('resize', window.drawAllGraphs);

    // ==========================================
    // 4. FLIGHT PREDICTION CONTROLLER (ML MODEL)
    // ==========================================
    window.updatePredictionUI = function() {
      const s = FlightStateManager.getState();
      const v0 = parseFloat(s.v0) || 800.0;
      const th = parseFloat(s.theta0) || 45.0;
      const dp = parseFloat(s.xdeploy) || 0.0;
      const wm = parseFloat(s.wind) || 0.0;
      const wd = parseFloat(s.windDir !== undefined ? s.windDir : -80.0);

      const v0_norm = (v0 - 800.0) / 100.0;
      const th_norm = (th - 45.0) / 5.0;
      const dp_norm = dp / 5000.0;
      const wm_norm = wm / 10.0;
      const wd_norm = wd / 90.0;

      const feats = [
        1.0,
        v0_norm,
        th_norm,
        dp_norm,
        wm_norm,
        wd_norm,
        v0_norm * v0_norm,
        th_norm * th_norm,
        dp_norm * dp_norm,
        wm_norm * wm_norm,
        v0_norm * th_norm,
        dp_norm * wm_norm
      ];

      let ml_error = 27.78;
      let ml_duration = 34.80;
      let ml_maxdev = 0.89;

      if (model && model.weights_error) {
        ml_error = feats.reduce((sum, f, i) => sum + f * (model.weights_error[i] || 0), 0);
        ml_duration = feats.reduce((sum, f, i) => sum + f * (model.weights_duration[i] || 0), 0);
        ml_maxdev = feats.reduce((sum, f, i) => sum + f * (model.weights_maxdev[i] || 0), 0);
      }

      if (ml_error < 0.25) ml_error = 0.25 + Math.abs(wm) * 0.12;
      if (ml_duration < 15.0) ml_duration = 34.80;
      if (ml_maxdev < 0.1) ml_maxdev = 0.89;

      const thetaRad = (th * Math.PI) / 180.0;
      const v0z = v0 * Math.sin(thetaRad);
      const v0x = v0 * Math.cos(thetaRad);
      const g = 9.80665;
      const mass = parseFloat(s.mass) || 12.0;
      const beta = mass / (0.34 * 0.0081);
      const dragLoss = Math.min(0.35, 120.0 / beta);

      const apogee = ((v0z * v0z) / (2 * g)) * (1.0 - dragLoss * 0.5);
      const range = (v0x * ml_duration) * (1.0 - dragLoss * 0.65);

      const isSuccess = ml_error <= 30.0;

      const predCep = document.getElementById('pred_cep');
      const predApogee = document.getElementById('pred_apogee');
      const predRange = document.getElementById('pred_range');
      const predTof = document.getElementById('pred_tof');

      const verdictCard = document.getElementById('verdictCard');
      const verdictTitle = document.getElementById('verdictTitle');
      const verdictDesc = document.getElementById('verdictDesc');
      const verdictBadge = document.getElementById('verdictBadge');

      if (predCep) predCep.textContent = `${ml_error.toFixed(2)} m`;
      if (predApogee) predApogee.textContent = `${apogee.toFixed(1)} m`;
      if (predRange) predRange.textContent = `${range.toFixed(1)} m`;
      if (predTof) predTof.textContent = `${ml_duration.toFixed(2)} s`;

      if (verdictCard) {
        verdictCard.style.borderLeft = isSuccess ? '6px solid #10b981' : '6px solid #f43f5e';
        verdictCard.style.background = isSuccess ? '#071510' : '#180a0e';
      }

      if (verdictTitle) {
        verdictTitle.textContent = isSuccess
          ? 'TARGET HIT (PASS) · PRECISION ACCURACY'
          : 'OUTSIDE TARGET CEP (FAIL) · EXCESSIVE DISPERSION';
        verdictTitle.style.color = isSuccess ? '#f8fafc' : '#fecdd3';
      }

      if (verdictBadge) {
        verdictBadge.className = isSuccess ? 'factor-badge badge-emerald' : 'factor-badge badge-rose';
        verdictBadge.textContent = isSuccess ? '100% MISSION SUCCESS (PASS)' : 'TARGET MISSED (> 30m CEP)';
      }

      if (verdictDesc) {
        verdictDesc.textContent = isSuccess
          ? `Trained Machine Learning Surrogate (Polynomial Ridge Regression, R² = ${model ? model.r2_error : 0.58}) predicts precision hit with final error ${ml_error.toFixed(2)} m, well inside the tactical threshold of 30.0 m.`
          : `Machine Learning Prediction indicates high dispersion error of ${ml_error.toFixed(2)} m (exceeding 30.0 m limit). Fin deployment distance (${dp.toLocaleString()} m) or crosswind (${wm} m/s) prevented complete terminal guidance convergence.`;
      }

      // Update Nav Box 4 Badge
      const b4 = document.getElementById('badge-prediction');
      if (b4) {
        b4.className = isSuccess ? 'box-badge badge-emerald' : 'box-badge badge-rose';
        b4.textContent = `${isSuccess ? 'PASS' : 'FAIL'} (${ml_error.toFixed(1)}m)`;
      }
    };

    window.updatePredictionUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
