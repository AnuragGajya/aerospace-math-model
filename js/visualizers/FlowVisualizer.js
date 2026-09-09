/**
 * FlowVisualizer.js
 * 2D Qualitative Fluid Dynamics Visualizer (Educational)
 * Renders dynamic airflow streamlines, particle smoke trails, pressure gradient contours,
 * and flow separation vortices.
 */

export class FlowVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.width = (this.canvas && this.canvas.clientWidth) ? this.canvas.clientWidth : 800;
    this.height = (this.canvas && this.canvas.clientHeight) ? this.canvas.clientHeight : 450;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    // Particle Streamlines
    this.particles = [];
    this.numParticles = 240;
    this.initParticles();

    // Streamline paths
    this.streamlines = [];
    this.numStreamlines = 14;
    this.initStreamlines();

    // Animation state
    this.time = 0;
    this.showPressureField = true;
    this.showStreamlines = true;
    this.showVortices = true;
    this.showVectors = true;

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = this.canvas.clientWidth || 800;
    this.height = this.canvas.height = this.canvas.clientHeight || 450;
    this.initParticles();
    this.initStreamlines();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: Math.random() * (this.width || 800),
        y: Math.random() * (this.height || 450),
        speed: 3 + Math.random() * 4,
        size: 1.5 + Math.random() * 1.5,
        life: Math.random() * 100,
        maxLife: 80 + Math.random() * 60,
      });
    }
  }

  initStreamlines() {
    this.streamlines = [];
    const h = this.height || 450;
    const spacing = h / (this.numStreamlines + 1);
    for (let i = 1; i <= this.numStreamlines; i++) {
      this.streamlines.push({
        baseY: i * spacing,
        points: [],
      });
    }
  }

  getFlowField(x, y, sim) {
    const cx = this.width * 0.45;
    const cy = this.height * 0.5;
    
    const dx = x - cx;
    const dy = y - cy;
    const cosPitch = Math.cos(sim.pitch || 0);
    const sinPitch = Math.sin(sim.pitch || 0);
    
    const xb = dx * cosPitch + dy * sinPitch;
    const yb = -dx * sinPitch + dy * cosPitch;

    const bodyHalfLen = 140;
    const bodyRadius = 24;
    const finX = -bodyHalfLen + 25;
    const finSpan = 45;

    let vx = (sim.speed || 60) * 0.08;
    let vy = 0;
    let Cp = 0.0;
    let isSeparated = false;

    // 1. Nose Stagnation
    const distToNose = Math.sqrt(Math.pow(xb - bodyHalfLen, 2) + Math.pow(yb, 2));
    if (distToNose < 90) {
      const factor = Math.max(0, 1 - distToNose / 90);
      if (xb > bodyHalfLen - 15 && Math.abs(yb) < bodyRadius + 10) {
        Cp += 1.0 * factor;
      } else {
        Cp -= 0.6 * factor;
      }
      vy += (yb > 0 ? -1 : 1) * factor * 2.5;
    }

    // 2. Fuselage Displacement & AoA
    if (xb >= -bodyHalfLen && xb <= bodyHalfLen) {
      if (Math.abs(yb) < bodyRadius + 50) {
        const bodyDist = Math.abs(yb) - bodyRadius;
        const influence = Math.max(0, 1 - bodyDist / 50);
        vy += (yb > 0 ? -1 : 1) * influence * 1.5;
        
        const aoaEffect = (sim.alpha || 0) * 1.8 * influence;
        if (yb < 0) {
          Cp += aoaEffect;
        } else {
          Cp -= aoaEffect;
        }
      }
    }

    // 3. Rear Fin Deflection
    const distToFin = Math.sqrt(Math.pow(xb - finX, 2) + Math.pow(Math.abs(yb) - (bodyRadius + finSpan / 2), 2));
    if (distToFin < 65) {
      const finInfluence = Math.max(0, 1 - distToFin / 65);
      const delta = sim.finDeflection || 0;
      vy += delta * 4.5 * finInfluence;

      if (yb > 0) {
        Cp += -delta * 2.5 * finInfluence;
      } else {
        Cp += delta * 2.5 * finInfluence;
      }
    }

    // 4. Flow Separation
    if ((sim.f_sep || 0) > 0.35 && xb < -bodyHalfLen * 0.2 && yb > 0) {
      isSeparated = true;
      const eddyPhase = this.time * 0.08 + xb * 0.05;
      vy += Math.sin(eddyPhase) * 3.5 * (sim.f_sep || 0);
      vx *= (1 - 0.4 * (sim.f_sep || 0));
      Cp -= 0.5 * (sim.f_sep || 0);
    }

    const flowVx = vx * cosPitch - vy * sinPitch;
    const flowVy = vx * sinPitch + vy * cosPitch;

    return {
      vx: flowVx,
      vy: flowVy,
      pressureCp: Math.max(-1.5, Math.min(1.5, Cp)),
      isSeparated,
    };
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
    if (!this.ctx) return;
    try {
      const { state, actuator, telemetry } = payload || {};
      this.time += 1;

      const sim = {
        pitch: state ? state.pitch : 0,
        alpha: state ? state.alpha : 0,
        finDeflection: actuator ? actuator.actualDeflectionRad : 0,
        speed: state ? state.speed : 60,
        f_sep: telemetry ? telemetry.f_sep : 0,
        lift: telemetry ? telemetry.lift : 0,
        drag: telemetry ? telemetry.drag : 0,
        moment: telemetry ? telemetry.moment : 0,
        xCG: (payload && payload.aerodynamics) ? payload.aerodynamics.xCG : 0.75,
        xCP: telemetry ? (telemetry.xCP || 0.85) : 0.85,
      };

      this.ctx.fillStyle = '#090d16';
      this.ctx.fillRect(0, 0, this.width, this.height);

      if (this.showPressureField) this.drawPressureContour(sim);
      if (this.showStreamlines) this.drawStreamlines(sim);
      this.drawParticles(sim);
      this.drawBody2D(sim);
      if (this.showVectors) this.drawForceVectors(sim);
      this.drawCausalSequenceHUD(sim);
      this.drawDisclaimerBadge();
    } catch (err) {
      console.warn('FlowVisualizer render glitch:', err);
    }
  }

  drawPressureContour(sim) {
    const gridSize = 26;
    const cols = Math.ceil(this.width / gridSize);
    const rows = Math.ceil(this.height / gridSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = c * gridSize;
        const py = r * gridSize;
        const flow = this.getFlowField(px, py, sim);
        const cp = flow.pressureCp;

        if (Math.abs(cp) > 0.08) {
          this.ctx.save();
          if (cp > 0) {
            const alpha = Math.min(0.4, cp * 0.35);
            this.ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
          } else {
            const alpha = Math.min(0.4, Math.abs(cp) * 0.35);
            this.ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
          }
          this.ctx.beginPath();
          this.ctx.arc(px, py, gridSize * 0.85, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.restore();
        }
      }
    }
  }

  drawStreamlines(sim) {
    this.ctx.save();
    this.ctx.lineWidth = 1.2;

    for (let i = 0; i < this.streamlines.length; i++) {
      const sl = this.streamlines[i];
      let curX = 10;
      let curY = sl.baseY;

      this.ctx.beginPath();
      this.ctx.moveTo(curX, curY);

      for (let step = 0; step < 35; step++) {
        const flow = this.getFlowField(curX, curY, sim);
        curX += 22;
        curY += flow.vy * 3.2;
        this.ctx.lineTo(curX, curY);
      }

      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawParticles(sim) {
    this.ctx.save();
    for (let p of this.particles) {
      const flow = this.getFlowField(p.x, p.y, sim);

      p.x += flow.vx * (p.speed / 4);
      p.y += flow.vy * 2.2;
      p.life++;

      if (p.x > this.width || p.y < 0 || p.y > this.height || p.life > p.maxLife) {
        p.x = Math.random() * 40;
        p.y = Math.random() * this.height;
        p.life = 0;
      }

      let pColor = 'rgba(148, 163, 184, 0.5)';
      if (flow.pressureCp > 0.3) {
        pColor = 'rgba(248, 113, 113, 0.8)';
      } else if (flow.pressureCp < -0.3) {
        pColor = 'rgba(56, 189, 248, 0.8)';
      }

      if (flow.isSeparated) {
        pColor = 'rgba(234, 179, 8, 0.85)';
      }

      this.ctx.fillStyle = pColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawBody2D(sim) {
    const cx = this.width * 0.45;
    const cy = this.height * 0.5;
    const bodyLen = 280;
    const radius = 24;
    const noseLen = 85;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(sim.pitch || 0);

    // Fuselage
    const bodyGrad = this.ctx.createLinearGradient(0, -radius, 0, radius);
    bodyGrad.addColorStop(0, '#cbd5e1');
    bodyGrad.addColorStop(0.5, '#f8fafc');
    bodyGrad.addColorStop(1, '#64748b');

    this.ctx.fillStyle = bodyGrad;
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.rect(-bodyLen / 2, -radius, bodyLen - noseLen, radius * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Nose
    const noseStartX = bodyLen / 2 - noseLen;
    this.ctx.beginPath();
    this.ctx.moveTo(noseStartX, -radius);
    this.ctx.quadraticCurveTo(bodyLen / 2 - 15, -radius * 0.6, bodyLen / 2, 0);
    this.ctx.quadraticCurveTo(bodyLen / 2 - 15, radius * 0.6, noseStartX, radius);
    this.ctx.closePath();
    
    const noseGrad = this.ctx.createLinearGradient(0, -radius, 0, radius);
    noseGrad.addColorStop(0, '#0284c7');
    noseGrad.addColorStop(0.5, '#38bdf8');
    noseGrad.addColorStop(1, '#0369a1');
    this.ctx.fillStyle = noseGrad;
    this.ctx.fill();
    this.ctx.stroke();

    // Rear Fins
    const finRootX = -bodyLen / 2 + 30;
    const finSpan = 48;
    const finChord = 40;
    const delta = sim.finDeflection || 0;

    // Top Fin
    this.ctx.save();
    this.ctx.translate(finRootX, -radius);
    this.ctx.rotate(delta);
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.strokeStyle = '#b45309';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(-finChord * 0.4, 0);
    this.ctx.lineTo(finChord * 0.6, 0);
    this.ctx.lineTo(finChord * 0.3, -finSpan);
    this.ctx.lineTo(-finChord * 0.2, -finSpan);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    // Bottom Fin
    this.ctx.save();
    this.ctx.translate(finRootX, radius);
    this.ctx.rotate(-delta);
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.strokeStyle = '#b45309';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(-finChord * 0.4, 0);
    this.ctx.lineTo(finChord * 0.6, 0);
    this.ctx.lineTo(finChord * 0.3, finSpan);
    this.ctx.lineTo(-finChord * 0.2, finSpan);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    // Markers
    const cgPixelX = (0.75 - (sim.xCG || 0.75)) * 120;
    const cpPixelX = (0.75 - (sim.xCP || 0.85)) * 120;

    this.drawCgSymbol(cgPixelX, 0);
    this.drawCpSymbol(cpPixelX, 0);

    // Centerline
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    this.ctx.beginPath();
    this.ctx.moveTo(-bodyLen / 2 - 30, 0);
    this.ctx.lineTo(bodyLen / 2 + 40, 0);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawCgSymbol(x, y) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.fillStyle = '#eab308';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.arc(0, 0, 8, 0, Math.PI / 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.arc(0, 0, 8, Math.PI, (3 * Math.PI) / 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawCpSymbol(x, y) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -8);
    this.ctx.lineTo(8, 0);
    this.ctx.lineTo(0, 8);
    this.ctx.lineTo(-8, 0);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawForceVectors(sim) {
    const cx = this.width * 0.45;
    const cy = this.height * 0.5;
    const fScale = 0.35;

    this.ctx.save();
    this.ctx.translate(cx, cy);

    const liftPx = -(sim.lift || 0) * fScale;
    if (Math.abs(liftPx) > 5) {
      this.drawArrow(0, 0, 0, liftPx, '#22c55e', `Lift: ${Math.round(sim.lift || 0)} N`);
    }

    const dragPx = -Math.max(5, (sim.drag || 0) * fScale);
    this.drawArrow(0, 0, dragPx, 0, '#ef4444', `Drag: ${Math.round(sim.drag || 0)} N`);

    if (Math.abs(sim.moment || 0) > 0.05) {
      const radius = 50;
      const isPitchUp = (sim.moment || 0) > 0;
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, -Math.PI / 4, Math.PI / 4, isPitchUp);
      this.ctx.stroke();

      this.ctx.fillStyle = '#f59e0b';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.fillText(`Moment M: ${(sim.moment || 0).toFixed(2)} N·m`, radius + 10, isPitchUp ? -15 : 15);
    }

    this.ctx.restore();
  }

  drawArrow(fromX, fromY, toX, toY, color, label = '') {
    const headLen = 9;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 2.2;

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
      this.ctx.font = '11px sans-serif';
      this.ctx.fillText(label, toX + 8, toY - 4);
    }
    this.ctx.restore();
  }

  drawCausalSequenceHUD(sim) {
    this.ctx.save();
    const hudW = Math.min(this.width - 24, 760);
    const hudH = 26;
    const startX = (this.width - hudW) / 2;
    const startY = this.height - hudH - 12;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    this.ctx.lineWidth = 1;
    this.drawSafeRoundedRect(startX, startY, hudW, hudH, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = '10.5px sans-serif';
    this.ctx.fillText(
      'Causal Chain: Fin Deflects  ➔  Flow Field Changes  ➔  ΔP Pressure Asymmetry  ➔  Aero Moment  ➔  Body Rotates  ➔  Lift Changes',
      startX + 14,
      startY + 17
    );
    this.ctx.restore();
  }

  drawDisclaimerBadge() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    this.ctx.lineWidth = 1;
    this.drawSafeRoundedRect(14, 14, 210, 24, 4);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('⚡ Qualitative Flow Visualization', 22, 29);
    this.ctx.restore();
  }
}
