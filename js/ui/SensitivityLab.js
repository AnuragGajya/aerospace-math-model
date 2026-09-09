/**
 * SensitivityLab.js
 * Dedicated Sensitivity Lab UI & Comparative Analysis Panel
 * Sweeps parameters, executes batch simulations, and plots multi-curve comparative graphs.
 */

import { SensitivityEngine } from '../modules/SensitivityEngine.js';

export class SensitivityLab {
  constructor(modalElement) {
    this.modal = modalElement;
    this.engine = new SensitivityEngine();
    this.selectedParam = 'density';
    this.sweepResults = null;
    this.activeMetric = 'trajectory'; // 'trajectory', 'error', 'alpha', 'lift'
  }

  show() {
    if (!this.modal) return;
    this.render();
    this.modal.classList.remove('hidden');
    this.runSweep();
  }

  hide() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
  }

  runSweep() {
    let minVal = 0.4, maxVal = 1.6;
    switch (this.selectedParam) {
      case 'density': minVal = 0.4; maxVal = 1.4; break;
      case 'speed': minVal = 30; maxVal = 100; break;
      case 'finDeflection': minVal = -15; maxVal = 15; break;
      case 'windSpeed': minVal = 0; maxVal = 20; break;
      case 'xCG': minVal = 0.45; maxVal = 1.05; break;
      case 'sensorNoise': minVal = 0; maxVal = 2.0; break;
      case 'actuatorTau': minVal = 0.01; maxVal = 0.20; break;
    }

    this.sweepResults = this.engine.runSweep(this.selectedParam, minVal, maxVal, 5);
    this.renderChart();
    this.renderInsights();
  }

  render() {
    this.modal.innerHTML = `
      <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
            <div class="flex items-center space-x-3">
              <span class="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 text-lg">🧪</span>
              <div>
                <h2 class="text-lg font-bold text-slate-100">Parameter Sensitivity Experiment Lab</h2>
                <p class="text-xs text-slate-400">Automated Multi-Run Parameter Sweeps & Response Comparison</p>
              </div>
            </div>
            <button id="closeLabBtn" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">✕</button>
          </div>

          <!-- Main Lab Body -->
          <div class="p-6 overflow-y-auto space-y-5">
            
            <!-- Controls Bar -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 items-center">
              <div>
                <label class="text-xs font-semibold text-slate-300 block mb-1.5">Select Sweep Parameter:</label>
                <select id="sweepParamSelect" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-purple-300 font-medium focus:outline-none focus:border-purple-500">
                  <option value="density" ${this.selectedParam === 'density' ? 'selected' : ''}>Air Density (ρ: 0.4 → 1.4 kg/m³)</option>
                  <option value="speed" ${this.selectedParam === 'speed' ? 'selected' : ''}>Airspeed (V: 30 → 100 m/s)</option>
                  <option value="windSpeed" ${this.selectedParam === 'windSpeed' ? 'selected' : ''}>Crosswind Speed (0 → 20 m/s)</option>
                  <option value="xCG" ${this.selectedParam === 'xCG' ? 'selected' : ''}>Center of Mass (xCG: 0.45m → 1.05m Stability Sweep)</option>
                  <option value="actuatorTau" ${this.selectedParam === 'actuatorTau' ? 'selected' : ''}>Actuator Lag (τ: 10ms → 200ms)</option>
                  <option value="sensorNoise" ${this.selectedParam === 'sensorNoise' ? 'selected' : ''}>Sensor Noise (σ: 0 → 2.0m)</option>
                  <option value="finDeflection" ${this.selectedParam === 'finDeflection' ? 'selected' : ''}>Manual Fin Deflection (-15° → +15°)</option>
                </select>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-300 block mb-1.5">Comparison Metric Channel:</label>
                <div class="flex space-x-1.5">
                  <button data-metric="trajectory" class="metric-tab px-3 py-2 rounded-lg text-xs font-medium ${this.activeMetric === 'trajectory' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}">Trajectory Z</button>
                  <button data-metric="error" class="metric-tab px-3 py-2 rounded-lg text-xs font-medium ${this.activeMetric === 'error' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}">Tracking Error</button>
                  <button data-metric="lift" class="metric-tab px-3 py-2 rounded-lg text-xs font-medium ${this.activeMetric === 'lift' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}">Lift Force</button>
                </div>
              </div>

              <div class="flex justify-end">
                <button id="runSweepBtn" class="w-full md:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all">
                  ⚡ Re-Run Sweep Batch
                </button>
              </div>
            </div>

            <!-- Chart Viewport -->
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 relative">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-300">Multi-Run Comparison Response Curves</span>
                <span class="text-[11px] text-slate-400" id="labLegend"></span>
              </div>
              <canvas id="sensitivityCanvas" class="w-full h-64 rounded-lg bg-slate-900"></canvas>
            </div>

            <!-- Engineering Insights Box -->
            <div id="labInsightsBox" class="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 text-xs text-purple-200 leading-relaxed">
              <!-- Dynamically filled -->
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
            <button id="closeLabBtn2" class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all">
              Done
            </button>
          </div>

        </div>
      </div>
    `;

    // Bind UI Events
    this.modal.querySelector('#closeLabBtn').addEventListener('click', () => this.hide());
    this.modal.querySelector('#closeLabBtn2').addEventListener('click', () => this.hide());
    
    this.modal.querySelector('#sweepParamSelect').addEventListener('change', (e) => {
      this.selectedParam = e.target.value;
      this.runSweep();
    });

    this.modal.querySelector('#runSweepBtn').addEventListener('click', () => {
      this.runSweep();
    });

    this.modal.querySelectorAll('.metric-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.activeMetric = e.target.getAttribute('data-metric');
        this.modal.querySelectorAll('.metric-tab').forEach(t => {
          t.className = 'metric-tab px-3 py-2 rounded-lg text-xs font-medium ' +
            (t.getAttribute('data-metric') === this.activeMetric ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white');
        });
        this.renderChart();
      });
    });
  }

  renderChart() {
    const canvas = this.modal.querySelector('#sensitivityCanvas');
    if (!canvas || !this.sweepResults) return;

    canvas.width = canvas.clientWidth || 800;
    canvas.height = canvas.clientHeight || 260;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const padLeft = 45;
    const padRight = 15;
    const padTop = 20;
    const padBottom = 25;
    const plotW = canvas.width - padLeft - padRight;
    const plotH = canvas.height - padTop - padBottom;

    const runs = this.sweepResults.runs;
    const colors = ['#38bdf8', '#22c55e', '#facc15', '#f97316', '#ec4899'];

    // Find min and max value across all runs for the selected metric
    let allVals = [];
    runs.forEach(r => {
      r.history.forEach(h => {
        if (this.activeMetric === 'trajectory') allVals.push(h.z, h.z_ref);
        else if (this.activeMetric === 'error') allVals.push(h.trackError);
        else if (this.activeMetric === 'lift') allVals.push(h.lift);
      });
    });

    const minVal = Math.min(...allVals, 0);
    const maxVal = Math.max(...allVals, 5);
    const range = Math.max(2, maxVal - minVal);

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(padLeft + plotW, gy);
      ctx.stroke();
    }

    // Draw Reference line if trajectory
    if (this.activeMetric === 'trajectory' && runs[0]) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const count = runs[0].history.length;
      for (let i = 0; i < count; i++) {
        const px = padLeft + (i / (count - 1)) * plotW;
        const normY = (runs[0].history[i].z_ref - minVal) / range;
        const py = padTop + plotH - normY * plotH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Plot each run's curve
    runs.forEach((r, idx) => {
      const color = colors[idx % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const count = r.history.length;

      for (let i = 0; i < count; i++) {
        const h = r.history[i];
        let val = h.z;
        if (this.activeMetric === 'error') val = h.trackError;
        else if (this.activeMetric === 'lift') val = h.lift;

        const px = padLeft + (i / (count - 1)) * plotW;
        const normY = (val - minVal) / range;
        const py = padTop + plotH - normY * plotH;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Y Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(maxVal.toFixed(1), padLeft - 6, padTop + 10);
    ctx.fillText(minVal.toFixed(1), padLeft - 6, padTop + plotH);
    ctx.fillText(((maxVal + minVal) / 2).toFixed(1), padLeft - 6, padTop + plotH / 2 + 3);

    // X Axis Label
    ctx.textAlign = 'center';
    ctx.fillText('Flight Time (seconds) ➔', padLeft + plotW / 2, padTop + plotH + 18);

    // Update Legend in Header
    const legendEl = this.modal.querySelector('#labLegend');
    if (legendEl) {
      legendEl.innerHTML = runs.map((r, idx) => `
        <span class="inline-flex items-center gap-1 mr-3">
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${colors[idx % colors.length]}"></span>
          <span>${r.paramValue.toFixed(2)}</span>
        </span>
      `).join('');
    }
  }

  renderInsights() {
    const box = this.modal.querySelector('#labInsightsBox');
    if (!box) return;

    let text = '';
    switch (this.selectedParam) {
      case 'density':
        text = `
          <strong>💡 Engineering Insight: Air Density Sweep</strong><br/>
          Jab air density kam hoti hai (0.4 kg/m³), dynamic pressure <em>q = ½ρV²</em> drop ho jata hai. Same fin deflection par control forces kam banti hain, jisse step maneuver follow karne mein time zyada lagta hai (sluggish tracking). High density (1.4 kg/m³) par quick response milta hai lekin drag bhi badh jata hai.
        `;
        break;
      case 'speed':
        text = `
          <strong>💡 Engineering Insight: Speed (V²) Power Law</strong><br/>
          Aerodynamic forces speed ke square (V²) se badhti hain! 30 m/s par vehicle sluggish rehta hai, jabki 100 m/s par high dynamic pressure ke kaaran control surfaces ultra-responsive ho jate hain aur rapid trajectory corrections possible hoti hain.
        `;
        break;
      case 'windSpeed':
        text = `
          <strong>💡 Engineering Insight: Crosswind Disturbance Rejection</strong><br/>
          Crosswind direct side-force aur angle of attack perturbation paida karta hai. Feedback controller fin deflection change karke restoring moment banata hai aur path wapas capture karta hai.
        `;
        break;
      case 'xCG':
        text = `
          <strong>💡 Engineering Insight: Static Stability Boundary</strong><br/>
          Jab CG aage hota hai (xCG = 0.5m), Static Stability Margin high positive hota hai aur vehicle easily stable rehta hai. Lekin agar CG tail ki taraf shift ho jaye (xCG > 0.85m), CP ke piche nikalne se vehicle Statically Unstable ho jata hai aur oscillations create hoti hain!
        `;
        break;
      case 'actuatorTau':
        text = `
          <strong>💡 Engineering Insight: Phase Lag & Control Oscillation</strong><br/>
          Actuator response time (τ) badhne se controller command aur actual fin position mein time delay aa jata hai. High lag (200ms) par phase margin drop hota hai aur vehicle path ke around overshoot/oscillate karne lagta hai.
        `;
        break;
      case 'sensorNoise':
        text = `
          <strong>💡 Engineering Insight: Imperfect State Estimation</strong><br/>
          High sensor noise state estimator mein jitter add karti hai. Controller false errors ko correct karne ke liye fins ko high frequency par vibrate karwata hai (actuator chatter), jisse tracking precision degrade hoti hai.
        `;
        break;
      case 'finDeflection':
        text = `
          <strong>💡 Engineering Insight: Direct Aerodynamic Moment Generation</strong><br/>
          Fin deflection sidhe local airflow ko deflect karke pressure asymmetry banati hai. Moment = q·S·L_ref·C_M se body rotate hoti hai aur angle of attack badal kar path curve karti hai.
        `;
        break;
    }

    box.innerHTML = text;
  }
}
