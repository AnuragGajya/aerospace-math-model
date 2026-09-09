/**
 * page_graphs.js
 * Controller for Page 3: All Equation Graphs (8 Dedicated High-Contrast Plots)
 * Accurately calibrated to the Excel Flight Telemetry (1,740 points, 34.80s TOF)
 * and 1,000 Monte Carlo batch simulation records.
 */

(function() {
  function initPageGraphs() {
    const mgr = window.FlightStateManager;
    const telem = window.FLIGHT_TELEMETRY || [];
    const batch = window.BATCH_SIM_RECORDS || [];
    if (!mgr || telem.length === 0) return;

    const state = mgr.getState();

    // Helper: Setup High DPI Canvas
    function setupCanvas(id) {
      const canvas = document.getElementById(id);
      if (!canvas) return null;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width || 560;
      const h = rect.height || 260;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      return { canvas, ctx, w, h };
    }

    // Helper: Draw Cartesian Axes, Grid, and Labels
    function drawGrid(ctx, w, h, pad, xLabel, yLabel, xMin, xMax, yMin, yMax) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#070c18';
      ctx.fillRect(0, 0, w, h);

      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;

      // Grid Lines
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

      // Axis Border
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad.left, pad.top, plotW, plotH);

      // Labels & Ticks
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

      // Axis Titles
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

    // Graph 1: Trajectory Profile Z(X)
    function drawTrajectory() {
      const setup = setupCanvas('canvas_trajectory');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const xMax = 16000;
      const zMax = 3600;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Downrange Distance X (m)', 'Altitude Z (m)', 0, xMax, 0, zMax);

      // Trajectory Line
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

      // Apogee Marker (Z = 3273.7m at X = 8079.5m)
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

    // Graph 2: Velocity V(t) & Mach M(t)
    function drawVelocity() {
      const setup = setupCanvas('canvas_velocity');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const vMax = 1200;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Total Speed V (m/s)', 0, tMax, 0, vMax);

      // Speed Curve
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

      // Sound barrier line (Mach 1.0 = 340 m/s)
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

    // Graph 3: Dynamic Pressure q(t) & Drag Force
    function drawAerodynamics() {
      const setup = setupCanvas('canvas_aerodynamics');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const qMax = 800; // kPa
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

    // Graph 4: Body Control Angles ctrl_pitch_deg & ctrl_yaw_deg
    function drawAccelerations() {
      const setup = setupCanvas('canvas_accelerations');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const aMin = -20;
      const aMax = 25;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Control Deflections (°)', 0, tMax, aMin, aMax);

      // Pitch Deflection
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

      // Yaw Deflection
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

      // Zero line
      const zeroY = pad.top + plotH - ((0 - aMin) / (aMax - aMin)) * plotH;
      ctx.strokeStyle = '#64748b';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(pad.left + plotW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Graph 5: Commanded Acceleration pitch_accel_cmd & yaw_accel_cmd
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

    // Graph 6: 4-Fin Independent Control Deflections
    function drawFins() {
      const setup = setupCanvas('canvas_fins');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const finMin = -20;
      const finMax = 25;
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Flight Time t (s)', 'Fin Angles (deg)', 0, tMax, finMin, finMax);

      // Pitch fin
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

      // Yaw fin
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

    // Graph 7: EKF State Estimation Error (True vs Estimated)
    function drawEKF() {
      const setup = setupCanvas('canvas_ekf');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const tMax = 35;
      const errMax = 4.0; // meters
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

    // Graph 8: Monte Carlo Dispersion Scatter (1,000 Batch Runs)
    function drawDispersion() {
      const setup = setupCanvas('canvas_dispersion');
      if (!setup) return;
      const { ctx, w, h } = setup;
      const pad = { left: 50, right: 20, top: 20, bottom: 35 };

      const errMax = 8000; // max error range
      const { plotW, plotH } = drawGrid(ctx, w, h, pad, 'Max Lateral Dev (m)', 'Final Error to Target (m)', 0, 50, 0, errMax);

      // CEP 30.0m Target Threshold Line
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

      // Batch Scatter Points
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageGraphs);
  } else {
    initPageGraphs();
  }
})();
