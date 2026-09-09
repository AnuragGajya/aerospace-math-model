/**
 * MLStudioCharts.js
 * Interactive Machine Learning & Regression Curve Visualizer
 * Plots live training loss decay, model predictions vs true flight points,
 * and regression residual distributions.
 */

export class MLStudioCharts {
  constructor(lossCanvas, predCanvas) {
    this.lossCanvas = lossCanvas;
    this.predCanvas = predCanvas;
    this.lossCtx = this.lossCanvas ? this.lossCanvas.getContext('2d') : null;
    this.predCtx = this.predCanvas ? this.predCanvas.getContext('2d') : null;

    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (this.lossCanvas) {
      this.lossCanvas.width = this.lossCanvas.clientWidth || 340;
      this.lossCanvas.height = this.lossCanvas.clientHeight || 180;
    }
    if (this.predCanvas) {
      this.predCanvas.width = this.predCanvas.clientWidth || 340;
      this.predCanvas.height = this.predCanvas.clientHeight || 180;
    }
  }

  renderLoss(lossHistory) {
    if (!this.lossCtx || !lossHistory || lossHistory.length === 0) {
      this.drawEmpty(this.lossCtx, this.lossCanvas, 'Awaiting Neural Net Training...');
      return;
    }

    const w = this.lossCanvas.width;
    const h = this.lossCanvas.height;
    const ctx = this.lossCtx;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 45, padRight = 15, padTop = 20, padBottom = 20;
    const pw = w - padLeft - padRight;
    const ph = h - padTop - padBottom;

    const minL = 0;
    const maxL = Math.max(...lossHistory, 1.0);
    const rangeL = maxL - minL;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const gy = padTop + (ph / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(padLeft + pw, gy);
      ctx.stroke();
    }

    // Loss line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const count = lossHistory.length;
    for (let i = 0; i < count; i++) {
      const px = padLeft + (i / Math.max(1, count - 1)) * pw;
      const py = padTop + ph - (lossHistory[i] / rangeL) * ph;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(maxL.toFixed(3), padLeft - 6, padTop + 8);
    ctx.fillText('0.000', padLeft - 6, padTop + ph);

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`MSE Loss: ${lossHistory[lossHistory.length - 1].toFixed(4)}`, padLeft + 10, padTop + 10);
  }

  renderPredictions(actualY, predictedY, labelX = 'Sample', labelY = 'Target') {
    if (!this.predCtx || !actualY || actualY.length === 0) {
      this.drawEmpty(this.predCtx, this.predCanvas, 'Train a model to see fit...');
      return;
    }

    const w = this.predCanvas.width;
    const h = this.predCanvas.height;
    const ctx = this.predCtx;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 45, padRight = 15, padTop = 20, padBottom = 20;
    const pw = w - padLeft - padRight;
    const ph = h - padTop - padBottom;

    const allVals = [...actualY, ...predictedY];
    const minV = Math.min(...allVals, 0);
    const maxV = Math.max(...allVals, 10);
    const rangeV = Math.max(1, maxV - minV);

    // Actual Line (Emerald solid)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const N = actualY.length;
    for (let i = 0; i < N; i++) {
      const px = padLeft + (i / Math.max(1, N - 1)) * pw;
      const py = padTop + ph - ((actualY[i] - minV) / rangeV) * ph;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Predicted Line (Amber dashed)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < predictedY.length; i++) {
      const px = padLeft + (i / Math.max(1, predictedY.length - 1)) * pw;
      const py = padTop + ph - ((predictedY[i] - minV) / rangeV) * ph;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = '#10b981';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('● Ground Truth', padLeft + 10, padTop + 10);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('● Model Prediction', padLeft + 90, padTop + 10);
  }

  drawEmpty(ctx, canvas, msg) {
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  }
}
