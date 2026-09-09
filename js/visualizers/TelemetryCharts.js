/**
 * TelemetryCharts.js
 * Multi-Channel Real-Time Canvas Graphing Engine
 * Renders smooth high-performance telemetry plots for:
 * 1. Altitude & Trajectory (Actual vs Ideal vs Reference)
 * 2. Pitch Angle & Angle of Attack (AoA)
 * 3. Actuator Deflection vs Controller Command
 * 4. Aerodynamic Lift & Drag Forces
 * 5. Aerodynamic Moment & Cross-Track Error
 */

export class TelemetryCharts {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width = this.canvas.clientWidth || 600;
    this.height = this.canvas.height = this.canvas.clientHeight || 200;

    this.activeTab = 'trajectory'; // 'trajectory', 'attitude', 'actuator', 'forces', 'moment'

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.width = this.canvas.width = this.canvas.clientWidth || 600;
    this.height = this.canvas.height = this.canvas.clientHeight || 200;
  }

  setActiveTab(tabName) {
    this.activeTab = tabName;
  }

  render(logger) {
    if (!logger || logger.records.length === 0) {
      this.drawEmpty();
      return;
    }

    this.ctx.fillStyle = '#090d16';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const padLeft = 45;
    const padRight = 15;
    const padTop = 25;
    const padBottom = 25;
    const plotW = this.width - padLeft - padRight;
    const plotH = this.height - padTop - padBottom;

    // Draw Grid Lines
    this.drawGrid(padLeft, padTop, plotW, plotH);

    switch (this.activeTab) {
      case 'trajectory':
        this.plotTrajectory(logger, padLeft, padTop, plotW, plotH);
        break;
      case 'attitude':
        this.plotAttitude(logger, padLeft, padTop, plotW, plotH);
        break;
      case 'actuator':
        this.plotActuator(logger, padLeft, padTop, plotW, plotH);
        break;
      case 'forces':
        this.plotForces(logger, padLeft, padTop, plotW, plotH);
        break;
      case 'moment':
        this.plotMomentError(logger, padLeft, padTop, plotW, plotH);
        break;
    }
  }

  drawGrid(x, y, w, h) {
    this.ctx.save();
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 1;

    // Horizontal grid lines
    const hSteps = 4;
    for (let i = 0; i <= hSteps; i++) {
      const gy = y + (h / hSteps) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, gy);
      this.ctx.lineTo(x + w, gy);
      this.ctx.stroke();
    }

    // Vertical grid lines
    const vSteps = 6;
    for (let i = 0; i <= vSteps; i++) {
      const gx = x + (w / vSteps) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(gx, y);
      this.ctx.lineTo(gx, y + h);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  plotTrajectory(logger, x0, y0, w, h) {
    const zActual = logger.z;
    const zIdeal = logger.z_ideal;
    const zRef = logger.z_ref;

    let minZ = Math.min(...zActual, ...zIdeal, ...zRef, -5);
    let maxZ = Math.max(...zActual, ...zIdeal, ...zRef, 5);
    const rangeZ = Math.max(10, maxZ - minZ);

    this.drawAxisLabels(x0, y0, w, h, minZ, maxZ, 'm (Altitude)');

    // 1. Reference Path (White dashed)
    this.drawSeries(logger.time, zRef, minZ, rangeZ, x0, y0, w, h, '#94a3b8', 1.5, [4, 4]);

    // 2. Ideal Control Model (Cyan dashed)
    this.drawSeries(logger.time, zIdeal, minZ, rangeZ, x0, y0, w, h, '#06b6d4', 2.0, [6, 3]);

    // 3. Fluid Dynamics Model (Emerald solid)
    this.drawSeries(logger.time, zActual, minZ, rangeZ, x0, y0, w, h, '#10b981', 2.5);

    // Legend
    this.drawLegend([
      { label: 'Reference Path', color: '#94a3b8', dashed: true },
      { label: 'Ideal Control Path', color: '#06b6d4', dashed: true },
      { label: 'Fluid Dynamics (Actual)', color: '#10b981' },
    ]);
  }

  plotAttitude(logger, x0, y0, w, h) {
    const pitch = logger.pitchDeg;
    const pitchCmd = logger.pitchCmdDeg;
    const aoa = logger.alphaDeg;

    let minVal = Math.min(...pitch, ...pitchCmd, ...aoa, -15);
    let maxVal = Math.max(...pitch, ...pitchCmd, ...aoa, 15);
    const range = Math.max(10, maxVal - minVal);

    this.drawAxisLabels(x0, y0, w, h, minVal, maxVal, 'deg');

    this.drawSeries(logger.time, pitchCmd, minVal, range, x0, y0, w, h, '#f59e0b', 1.5, [4, 4]);
    this.drawSeries(logger.time, pitch, minVal, range, x0, y0, w, h, '#38bdf8', 2.0);
    this.drawSeries(logger.time, aoa, minVal, range, x0, y0, w, h, '#ec4899', 2.0);

    this.drawLegend([
      { label: 'Desired Pitch θ_cmd', color: '#f59e0b', dashed: true },
      { label: 'Pitch Angle θ', color: '#38bdf8' },
      { label: 'Angle of Attack α', color: '#ec4899' },
    ]);
  }

  plotActuator(logger, x0, y0, w, h) {
    const defActual = logger.finDeflectionDeg;
    const defCmd = logger.finCommandDeg;

    let minVal = Math.min(...defActual, ...defCmd, -20);
    let maxVal = Math.max(...defActual, ...defCmd, 20);
    const range = Math.max(10, maxVal - minVal);

    this.drawAxisLabels(x0, y0, w, h, minVal, maxVal, 'deg (Fin)');

    this.drawSeries(logger.time, defCmd, minVal, range, x0, y0, w, h, '#f59e0b', 1.5, [4, 4]);
    this.drawSeries(logger.time, defActual, minVal, range, x0, y0, w, h, '#10b981', 2.2);

    this.drawLegend([
      { label: 'Fin Command δ_cmd', color: '#f59e0b', dashed: true },
      { label: 'Actual Fin Deflection δ (Lagged)', color: '#10b981' },
    ]);
  }

  plotForces(logger, x0, y0, w, h) {
    const lift = logger.lift;
    const drag = logger.drag;

    let minVal = Math.min(...lift, ...drag, 0);
    let maxVal = Math.max(...lift, ...drag, 50);
    const range = Math.max(10, maxVal - minVal);

    this.drawAxisLabels(x0, y0, w, h, minVal, maxVal, 'N');

    this.drawSeries(logger.time, lift, minVal, range, x0, y0, w, h, '#22c55e', 2.0);
    this.drawSeries(logger.time, drag, minVal, range, x0, y0, w, h, '#ef4444', 2.0);

    this.drawLegend([
      { label: 'Aerodynamic Lift (L)', color: '#22c55e' },
      { label: 'Aerodynamic Drag (D)', color: '#ef4444' },
    ]);
  }

  plotMomentError(logger, x0, y0, w, h) {
    const moment = logger.moment;
    const err = logger.trackError;

    let minVal = Math.min(...moment, ...err, -5);
    let maxVal = Math.max(...moment, ...err, 5);
    const range = Math.max(5, maxVal - minVal);

    this.drawAxisLabels(x0, y0, w, h, minVal, maxVal, 'N·m / m');

    this.drawSeries(logger.time, moment, minVal, range, x0, y0, w, h, '#f59e0b', 2.0);
    this.drawSeries(logger.time, err, minVal, range, x0, y0, w, h, '#a855f7', 2.0);

    this.drawLegend([
      { label: 'Pitching Moment M_yy (N·m)', color: '#f59e0b' },
      { label: 'Cross-Track Error e_z (m)', color: '#a855f7' },
    ]);
  }

  drawSeries(tArr, valArr, minVal, range, x0, y0, w, h, color, lineWidth = 2, dash = []) {
    if (!valArr || valArr.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash(dash);

    this.ctx.beginPath();
    const count = valArr.length;
    for (let i = 0; i < count; i++) {
      const px = x0 + (i / (count - 1)) * w;
      const normalizedY = (valArr[i] - minVal) / range;
      const py = y0 + h - normalizedY * h;

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawAxisLabels(x0, y0, w, h, minVal, maxVal, unit) {
    this.ctx.save();
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'right';

    // Min and Max Y labels
    this.ctx.fillText(maxVal.toFixed(1) + ' ' + unit, x0 - 6, y0 + 10);
    this.ctx.fillText(minVal.toFixed(1), x0 - 6, y0 + h);
    this.ctx.fillText(((maxVal + minVal) / 2).toFixed(1), x0 - 6, y0 + h / 2 + 3);

    // Time label on bottom
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Flight Time (s) ➔', x0 + w / 2, y0 + h + 18);
    this.ctx.restore();
  }

  drawLegend(items) {
    this.ctx.save();
    let lx = 50;
    const ly = 14;

    for (let item of items) {
      this.ctx.strokeStyle = item.color;
      this.ctx.fillStyle = item.color;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash(item.dashed ? [4, 3] : []);

      this.ctx.beginPath();
      this.ctx.moveTo(lx, ly);
      this.ctx.lineTo(lx + 15, ly);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(item.label, lx + 20, ly + 3);

      lx += this.ctx.measureText(item.label).width + 35;
    }
    this.ctx.restore();
  }

  drawEmpty() {
    this.ctx.fillStyle = '#090d16';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#475569';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Awaiting Simulation Telemetry...', this.width / 2, this.height / 2);
  }
}
