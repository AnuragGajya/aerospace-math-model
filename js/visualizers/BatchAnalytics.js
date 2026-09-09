/**
 * BatchAnalytics.js
 * Monte Carlo Batch Experiment Analytics Engine
 * Parses and visualizes the 115 simulation experiment runs:
 * - Launch Velocity vs Miss Distance (CEP)
 * - Launch Pitch vs Accuracy
 * - Fin Deployment Distance vs Target Success Rate (PASS/FAIL)
 * - Wind Speed & Direction vs Lateral Deviation
 */

export class BatchAnalytics {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = (this.canvas && this.canvas.clientWidth) ? this.canvas.clientWidth : 700;
    this.height = (this.canvas && this.canvas.clientHeight) ? this.canvas.clientHeight : 250;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.activeView = 'speed_vs_error'; // 'speed_vs_error', 'pitch_vs_error', 'deploy_vs_error', 'wind_vs_dev'

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = this.canvas.clientWidth || 700;
    this.height = this.canvas.height = this.canvas.clientHeight || 250;
  }

  setActiveView(view) {
    this.activeView = view;
  }

  render(batchRecords) {
    if (!this.ctx || !batchRecords || batchRecords.length === 0) return;

    this.ctx.fillStyle = '#090d16';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const padLeft = 65;
    const padRight = 20;
    const padTop = 30;
    const padBottom = 30;
    const plotW = this.width - padLeft - padRight;
    const plotH = this.height - padTop - padBottom;

    this.drawGrid(padLeft, padTop, plotW, plotH);

    switch (this.activeView) {
      case 'speed_vs_error':
        this.plotScatter(
          batchRecords,
          r => r.initial_speed || 800,
          r => r.final_error || 0,
          750, 1150, 0, 16000,
          'Launch Speed V_0 (m/s)', 'Final Miss Distance (m)',
          padLeft, padTop, plotW, plotH
        );
        break;

      case 'pitch_vs_error':
        this.plotScatter(
          batchRecords,
          r => r.initial_pitch || 45,
          r => r.final_error || 0,
          38, 52, 0, 16000,
          'Launch Pitch θ_0 (deg)', 'Final Miss Distance (m)',
          padLeft, padTop, plotW, plotH
        );
        break;

      case 'deploy_vs_error':
        this.plotScatter(
          batchRecords,
          r => r.fin_deploy_dist_m || 0,
          r => r.final_error || 0,
          0, 12000, 0, 16000,
          'Fin Deployment Distance (m from launch)', 'Final Miss Distance (m)',
          padLeft, padTop, plotW, plotH
        );
        break;

      case 'wind_vs_dev':
        this.plotScatter(
          batchRecords,
          r => r.wind_mag || 0,
          r => r.max_dev || r.max_deviation || 0,
          0, 25, 0, 120,
          'Wind Speed (m/s)', 'Max Lateral Deviation (m)',
          padLeft, padTop, plotW, plotH
        );
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

  plotScatter(records, xExtractor, yExtractor, minX, maxX, minY, maxY, xLabel, yLabel, x0, y0, w, h) {
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    // Draw Axis Labels
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(maxY.toFixed(0), x0 - 8, y0 + 10);
    this.ctx.fillText(minY.toFixed(0), x0 - 8, y0 + h);
    this.ctx.fillText(((maxY + minY) / 2).toFixed(0), x0 - 8, y0 + h / 2 + 3);

    this.ctx.textAlign = 'center';
    this.ctx.fillText(minX.toFixed(0), x0, y0 + h + 18);
    this.ctx.fillText(maxX.toFixed(0), x0 + w, y0 + h + 18);
    this.ctx.fillText(xLabel + ' ➔', x0 + w / 2, y0 + h + 18);

    // Target Threshold Line (50m precision boundary)
    if (minY <= 50 && maxY >= 50) {
      const py50 = y0 + h - ((50 - minY) / rangeY) * h;
      this.ctx.strokeStyle = '#10b981';
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(x0, py50);
      this.ctx.lineTo(x0 + w, py50);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = '#10b981';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('Target Threshold (CEP 50m)', x0 + 10, py50 - 4);
    }

    // Plot Points
    for (const r of records) {
      const vx = xExtractor(r);
      const vy = yExtractor(r);

      const px = x0 + ((vx - minX) / rangeX) * w;
      const py = y0 + h - ((vy - minY) / rangeY) * h;

      const isPass = (r.target_status === 'PASS') || (vy < 50.0);

      this.ctx.fillStyle = isPass ? '#10b981' : '#f43f5e';
      this.ctx.strokeStyle = isPass ? '#059669' : '#e11d48';
      this.ctx.lineWidth = 1;

      this.ctx.beginPath();
      this.ctx.arc(Math.max(x0, Math.min(x0 + w, px)), Math.max(y0, Math.min(y0 + h, py)), isPass ? 4.5 : 3.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Summary Header Banner
    const passCount = records.filter(r => (r.target_status === 'PASS') || (yExtractor(r) < 50)).length;
    const passRate = ((passCount / records.length) * 100).toFixed(1);

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = '11px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Monte Carlo Set: ${records.length} Runs | Precision Pass Rate: ${passRate}% (${passCount}/${records.length})`, x0 + 10, y0 - 10);
  }
}
