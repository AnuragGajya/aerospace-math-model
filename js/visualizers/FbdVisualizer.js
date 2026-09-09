/**
 * FbdVisualizer.js
 * Real-Time Free-Body Diagram (FBD) Visualizer
 * Shows the generic flying body in isolation with active aerodynamic force vectors,
 * gravity, thrust, aerodynamic moment torque arc, and stability margin arm.
 */

export class FbdVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = (this.canvas && this.canvas.clientWidth) ? this.canvas.clientWidth : 320;
    this.height = (this.canvas && this.canvas.clientHeight) ? this.canvas.clientHeight : 260;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = this.canvas.clientWidth || 320;
    this.height = this.canvas.height = this.canvas.clientHeight || 260;
  }

  drawSafeRoundedRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  render(payload) {
    if (!this.ctx || !payload) return;
    try {
      const { state, telemetry, actuator } = payload;
      if (!state) return;

      this.ctx.fillStyle = '#0f172a';
      this.ctx.fillRect(0, 0, this.width, this.height);

      const cx = this.width * 0.5;
      const cy = this.height * 0.48;
      const bodyLen = 140;
      const radius = 14;

      this.ctx.save();
      this.ctx.translate(cx, cy);

      // Body Silhouette
      this.ctx.save();
      this.ctx.rotate(state.pitch || 0);

      this.ctx.fillStyle = '#334155';
      this.ctx.strokeStyle = '#64748b';
      this.ctx.lineWidth = 1.5;
      this.ctx.fillRect(-bodyLen / 2, -radius, bodyLen - 35, radius * 2);
      this.ctx.strokeRect(-bodyLen / 2, -radius, bodyLen - 35, radius * 2);

      // Nose
      this.ctx.beginPath();
      this.ctx.moveTo(bodyLen / 2 - 35, -radius);
      this.ctx.lineTo(bodyLen / 2, 0);
      this.ctx.lineTo(bodyLen / 2 - 35, radius);
      this.ctx.closePath();
      this.ctx.fillStyle = '#0284c7';
      this.ctx.fill();
      this.ctx.stroke();

      // Rear Fins
      const finDelta = actuator ? actuator.actualDeflectionRad : 0;
      const finX = -bodyLen / 2 + 15;
      
      this.ctx.save();
      this.ctx.translate(finX, -radius);
      this.ctx.rotate(finDelta);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillRect(-8, -20, 16, 20);
      this.ctx.restore();

      this.ctx.save();
      this.ctx.translate(finX, radius);
      this.ctx.rotate(-finDelta);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillRect(-8, 0, 16, 20);
      this.ctx.restore();

      // Markers
      const cgX = (0.75 - ((payload.aerodynamics && payload.aerodynamics.xCG) ? payload.aerodynamics.xCG : 0.75)) * 60;
      const cpX = (0.75 - (telemetry ? (telemetry.xCP || 0.85) : 0.85)) * 60;

      this.ctx.fillStyle = '#eab308';
      this.ctx.beginPath();
      this.ctx.arc(cgX, 0, 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#06b6d4';
      this.ctx.fillRect(cpX - 4, -4, 8, 8);

      this.ctx.restore();

      // Forces
      const fScale = 0.55;
      const m = (payload.aerodynamics && payload.aerodynamics.mass) ? payload.aerodynamics.mass : 12;
      const gravityN = m * 9.81;
      this.drawArrow(0, 0, 0, Math.min(55, gravityN * 0.35), '#3b82f6', `mg: ${gravityN.toFixed(0)}N`);

      const liftVal = telemetry ? (telemetry.lift || 0) : 0;
      const liftPx = -liftVal * fScale;
      if (Math.abs(liftVal) > 0.5) {
        this.drawArrow(0, 0, 0, Math.max(-65, Math.min(65, liftPx)), '#22c55e', `L: ${liftVal.toFixed(1)}N`);
      }

      const dragVal = telemetry ? (telemetry.drag || 0) : 0;
      const dragPx = -dragVal * fScale;
      if (dragVal > 0.5) {
        this.drawArrow(0, 0, Math.max(-65, dragPx), 0, '#ef4444', `D: ${dragVal.toFixed(1)}N`);
      }

      const resPx = Math.sqrt(liftPx * liftPx + dragPx * dragPx);
      if (resPx > 10) {
        this.drawArrow(0, 0, dragPx, liftPx, '#a855f7', `R: ${(telemetry ? (telemetry.resultantForce || 0) : 0).toFixed(1)}N`);
      }

      const momentVal = telemetry ? (telemetry.moment || 0) : 0;
      if (Math.abs(momentVal) > 0.02) {
        const radius = 30;
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, -Math.PI / 3, Math.PI / 3, momentVal > 0);
        this.ctx.stroke();

        this.ctx.fillStyle = '#f59e0b';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText(`M: ${momentVal.toFixed(2)} N·m`, radius + 6, 4);
      }

      this.ctx.restore();

      // Stability Margin Badge
      this.ctx.save();
      const ssmVal = telemetry ? (telemetry.SSM || 0) : 0;
      const isStable = ssmVal >= 0;
      this.ctx.fillStyle = isStable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      this.ctx.strokeStyle = isStable ? '#10b981' : '#ef4444';
      this.ctx.lineWidth = 1;
      this.drawSafeRoundedRect(8, this.height - 28, this.width - 16, 20, 4);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = isStable ? '#34d399' : '#f87171';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.fillText(
        `Margin: ${ssmVal.toFixed(1)}% (${isStable ? 'Statically Stable' : 'Statically Unstable'})`,
        16,
        this.height - 14
      );
      this.ctx.restore();
    } catch (err) {
      console.warn('FbdVisualizer render glitch:', err);
    }
  }

  drawArrow(fromX, fromY, toX, toY, color, label = '') {
    const headLen = 7;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();

    if (label) {
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(label, toX + 4, toY - 2);
    }
    this.ctx.restore();
  }
}
