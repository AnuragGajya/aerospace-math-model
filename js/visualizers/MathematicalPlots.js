/**
 * MathematicalPlots.js
 * High-Performance Telemetry Canvas Graphing Engine
 * Plots Altitude Profile, Velocity/Mach Decay, Acceleration Commands,
 * Fin Deflections, and Kalman Estimation Error Residuals.
 */

export class MathematicalPlots {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = (this.canvas && this.canvas.clientWidth) ? this.canvas.clientWidth : 700;
    this.height = (this.canvas && this.canvas.clientHeight) ? this.canvas.clientHeight : 220;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.activeChannel = 'trajectory'; // 'trajectory', 'velocity', 'accel', 'fins', 'kalman_error'

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = this.canvas.clientWidth || 700;
    this.height = this.canvas.height = this.canvas.clientHeight || 220;
  }

  setActiveChannel(channel) {
    this.activeChannel = channel;
  }

  render(telemetryHistory, currentIndex = -1) {
    if (!this.ctx || !telemetryHistory || telemetryHistory.length === 0) return;

    this.ctx.fillStyle = '#090d16';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const padLeft = 55;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 25;
    const plotW = this.width - padLeft - padRight;
    const plotH = this.height - padTop - padBottom;

    // Draw Grid
    this.drawGrid(padLeft, padTop, plotW, plotH);

    const endIdx = currentIndex >= 0 ? Math.min(telemetryHistory.length, currentIndex + 1) : telemetryHistory.length;
    const currentData = telemetryHistory.slice(0, endIdx);

    switch (this.activeChannel) {
      case 'trajectory':
        this.plotTrajectory(currentData, telemetryHistory, padLeft, padTop, plotW, plotH);
        break;
      case 'velocity':
        this.plotVelocity(currentData, telemetryHistory, padLeft, padTop, plotW, plotH);
        break;
      case 'accel':
        this.plotAccel(currentData, telemetryHistory, padLeft, padTop, plotW, plotH);
        break;
      case 'fins':
        this.plotFins(currentData, telemetryHistory, padLeft, padTop, plotW, plotH);
        break;
      case 'kalman_error':
        this.plotKalmanError(currentData, telemetryHistory, padLeft, padTop, plotW, plotH);
        break;
    }
  }

  drawGrid(x, y, w, h) {
    this.ctx.save();
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const gy = y + (h / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, gy);
      this.ctx.lineTo(x + w, gy);
      this.ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const gx = x + (w / 6) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(gx, y);
      this.ctx.lineTo(gx, y + h);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  plotTrajectory(currentData, fullData, x0, y0, w, h) {
    const minZ = 0;
    const maxZ = 3500; // Apogee ~3276m
    const rangeZ = maxZ - minZ;

    this.drawAxisLabels(x0, y0, w, h, minZ, maxZ, 'm (Altitude)');

    // Full True Trajectory Background Faint Line
    this.drawSeries(fullData.map(d => d.pos_z || d.z), minZ, rangeZ, x0, y0, w, h, 'rgba(16, 185, 129, 0.25)', 1.5);

    // Active Estimated Trajectory (Cyan dashed)
    this.drawSeries(currentData.map(d => d.est_z || d.pos_z), minZ, rangeZ, x0, y0, w, h, '#06b6d4', 2.0, [4, 4]);

    // Active True Trajectory (Emerald solid)
    this.drawSeries(currentData.map(d => d.pos_z || d.z), minZ, rangeZ, x0, y0, w, h, '#10b981', 2.5);

    // Legend
    this.drawLegend([
      { label: 'True Altitude Z(t) [Apogee: 3276.5m]', color: '#10b981' },
      { label: 'EKF Estimated Altitude', color: '#06b6d4', dashed: true },
    ]);
  }

  plotVelocity(currentData, fullData, x0, y0, w, h) {
    const minV = 0;
    const maxV = 1100; // Initial Mach 2.6+
    const rangeV = maxV - minV;

    this.drawAxisLabels(x0, y0, w, h, minV, maxV, 'm/s (Airspeed)');

    // Total Speed
    const speeds = currentData.map(d => Math.sqrt(Math.pow(d.vel_x || d.vx || 0, 2) + Math.pow(d.vel_y || d.vy || 0, 2) + Math.pow(d.vel_z || d.vz || 0, 2)));
    const vx = currentData.map(d => d.vel_x || d.vx || 0);
    const vz = currentData.map(d => d.vel_z || d.vz || 0);

    this.drawSeries(speeds, minV, rangeV, x0, y0, w, h, '#38bdf8', 2.5);
    this.drawSeries(vx, minV, rangeV, x0, y0, w, h, '#a855f7', 1.8);
    this.drawSeries(vz, minV, rangeV, x0, y0, w, h, '#f59e0b', 1.8);

    this.drawLegend([
      { label: 'Total Airspeed V', color: '#38bdf8' },
      { label: 'Forward Velocity Vx', color: '#a855f7' },
      { label: 'Vertical Velocity Vz', color: '#f59e0b' },
    ]);
  }

  plotAccel(currentData, fullData, x0, y0, w, h) {
    const minA = -50;
    const maxA = 10;
    const rangeA = maxA - minA;

    this.drawAxisLabels(x0, y0, w, h, minA, maxA, 'm/s²');

    const pitchAccel = currentData.map(d => d.pitch_accel_cmd || 0);
    const yawAccel = currentData.map(d => d.yaw_accel_cmd || 0);

    this.drawSeries(pitchAccel, minA, rangeA, x0, y0, w, h, '#ef4444', 2.2);
    this.drawSeries(yawAccel, minA, rangeA, x0, y0, w, h, '#38bdf8', 2.0);

    this.drawLegend([
      { label: 'Pitch Accel Command (-45 m/s² Cap)', color: '#ef4444' },
      { label: 'Yaw Accel Command', color: '#38bdf8' },
    ]);
  }

  plotFins(currentData, fullData, x0, y0, w, h) {
    const minF = -25;
    const maxF = 25;
    const rangeF = maxF - minF;

    this.drawAxisLabels(x0, y0, w, h, minF, maxF, 'deg');

    const pitchFins = currentData.map(d => d.ctrl_pitch_deg || 0);
    const yawFins = currentData.map(d => d.ctrl_yaw_deg || 0);

    this.drawSeries(pitchFins, minF, rangeF, x0, y0, w, h, '#f59e0b', 2.5);
    this.drawSeries(yawFins, minF, rangeF, x0, y0, w, h, '#06b6d4', 2.0);

    this.drawLegend([
      { label: 'Pitch Fin Deflection δ_p (deg)', color: '#f59e0b' },
      { label: 'Yaw Fin Deflection δ_y (deg)', color: '#06b6d4' },
    ]);
  }

  plotKalmanError(currentData, fullData, x0, y0, w, h) {
    const errors = currentData.map(d => {
      const dx = (d.pos_x || d.x || 0) - (d.est_x || d.pos_x || 0);
      const dy = (d.pos_y || d.y || 0) - (d.est_y || 0);
      const dz = (d.pos_z || d.z || 0) - (d.est_z || d.pos_z || 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    });

    const minE = 0;
    const maxE = Math.max(5.0, Math.max(...errors, 2.0));
    const rangeE = maxE - minE;

    this.drawAxisLabels(x0, y0, w, h, minE, maxE, 'm (Error)');

    this.drawSeries(errors, minE, rangeE, x0, y0, w, h, '#f43f5e', 2.2);

    this.drawLegend([
      { label: 'Navigation State Error Residual ||r_true - r_est||', color: '#f43f5e' },
    ]);
  }

  drawSeries(valArr, minVal, range, x0, y0, w, h, color, lineWidth = 2, dash = []) {
    if (!valArr || valArr.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash(dash);

    this.ctx.beginPath();
    const count = valArr.length;
    for (let i = 0; i < count; i++) {
      const px = x0 + (i / Math.max(1, count - 1)) * w;
      const normalizedY = (valArr[i] - minVal) / range;
      const py = y0 + h - Math.max(0, Math.min(1.0, normalizedY)) * h;

      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawAxisLabels(x0, y0, w, h, minVal, maxVal, unit) {
    this.ctx.save();
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'right';

    this.ctx.fillText(maxVal.toFixed(0) + ' ' + unit, x0 - 6, y0 + 10);
    this.ctx.fillText(minVal.toFixed(0), x0 - 6, y0 + h);
    this.ctx.fillText(((maxVal + minVal) / 2).toFixed(0), x0 - 6, y0 + h / 2 + 3);

    this.ctx.textAlign = 'center';
    this.ctx.fillText('Flight Time (seconds 0.0s ➔ 34.8s)', x0 + w / 2, y0 + h + 18);
    this.ctx.restore();
  }

  drawLegend(items) {
    this.ctx.save();
    let lx = 65;
    const ly = 13;

    for (let item of items) {
      this.ctx.strokeStyle = item.color;
      this.ctx.fillStyle = item.color;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash(item.dashed ? [4, 3] : []);

      this.ctx.beginPath();
      this.ctx.moveTo(lx, ly);
      this.ctx.lineTo(lx + 14, ly);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(item.label, lx + 18, ly + 3);

      lx += this.ctx.measureText(item.label).width + 30;
    }
    this.ctx.restore();
  }
}
