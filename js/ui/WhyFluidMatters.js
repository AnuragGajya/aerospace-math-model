/**
 * WhyFluidMatters.js
 * "Why Fluid Dynamics Matters" - Dedicated Interactive Showdown & Comparison Feature
 * Demonstrates the divergence between naive ideal control models and true fluid-dynamic physics.
 */

export class WhyFluidMatters {
  constructor(modalElement, simEngine) {
    this.modal = modalElement;
    this.engine = simEngine;
  }

  show() {
    if (!this.modal) return;
    this.render();
    this.modal.classList.remove('hidden');
    this.triggerComparisonFlight();
  }

  hide() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
  }

  triggerComparisonFlight() {
    // Reset simulation engine, set dual mode, add a step maneuver with crosswind gust
    this.engine.reset();
    this.engine.setSimMode('dual');
    this.engine.controller.updateConfig({ pathType: 'step', stepAltitude: 18.0, stepDistance: 50.0 });
    this.engine.atmosphere.setEnvironment({ windSpeed: 8.0, windDirection: 90 }); // 8 m/s crosswind
    this.engine.start();
  }

  render() {
    this.modal.innerHTML = `
      <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
            <div class="flex items-center space-x-3">
              <span class="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-lg">💡</span>
              <div>
                <h2 class="text-lg font-bold text-slate-100">Why Fluid Dynamics Matters in Aerospace Control</h2>
                <p class="text-xs text-slate-400">Comparing Naive Ideal Control vs. Real Fluid-Dynamic Interaction</p>
              </div>
            </div>
            <button id="closeWhyFluidBtn" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">✕</button>
          </div>

          <!-- Content Body -->
          <div class="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs sm:text-sm">
            
            <!-- Highlight Quote Callout -->
            <div class="p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-xl text-emerald-200">
              <p class="text-sm sm:text-base font-semibold leading-relaxed">
                “Moving a control surface does not directly prescribe the motion of a flying body. The surface changes its interaction with the surrounding air. Fluid dynamics determines the resulting aerodynamic forces and moments, while the feedback controller observes the resulting motion and makes further corrections.”
              </p>
            </div>

            <!-- Comparison Table / Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Simulation A: Ideal Control Model -->
              <div class="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span class="font-bold text-cyan-400 text-sm">Simulation A: Ideal Control Model</span>
                  <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[11px] font-mono border border-cyan-800">Oversimplified</span>
                </div>
                <ul class="space-y-2 text-slate-300 text-xs">
                  <li class="flex items-start gap-2">
                    <span class="text-rose-400">✗</span>
                    <span><strong>Assumes Direct Rotation:</strong> Fin deflection δ commands vehicle pitch rate directly (\(\ddot{\theta} = K \delta\)).</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-400">✗</span>
                    <span><strong>Ignores Dynamic Pressure (q):</strong> Assumes full control authority even at near-zero airspeeds or near-vacuum altitudes.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-400">✗</span>
                    <span><strong>Ignores Damping & Airflow:</strong> No aerodynamic pitch damping (\(C_{Mq}\)), no flow separation, no crosswind drift.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-rose-400">✗</span>
                    <span><strong>Result:</strong> Completely unphysical trajectory that cannot anticipate stalls, crosswinds, or control lags.</span>
                  </li>
                </ul>
              </div>

              <!-- Simulation B: Fluid Dynamics Model -->
              <div class="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span class="font-bold text-emerald-400 text-sm">Simulation B: Fluid-Dynamics Model</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[11px] font-mono border border-emerald-800">Physics Accurate</span>
                </div>
                <ul class="space-y-2 text-slate-300 text-xs">
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-400">✓</span>
                    <span><strong>Flow Deflection & Pressure:</strong> Fin deflection creates local pressure asymmetry (ΔP) across the control surface.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-400">✓</span>
                    <span><strong>Forces Scale with \(q = ½\rho V²\):</strong> Aerodynamic moment \(M = q S L C_M\) drives angular acceleration \(\ddot{\theta} = M / I_{yy}\).</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-400">✓</span>
                    <span><strong>Real Atmosphere Interaction:</strong> Wind gusts, boundary layer flow separation at high AoA, and natural aerodynamic damping.</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-400">✓</span>
                    <span><strong>Closed-Loop Correction:</strong> Sensors measure true motion, and the feedback controller continuously adapts fin commands.</span>
                  </li>
                </ul>
              </div>

            </div>

            <!-- Causal Loop Diagram -->
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div class="text-xs font-bold text-slate-300 mb-2">The Real Physical Feedback Loop:</div>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-medium">
                <div class="bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div class="text-purple-400 text-base mb-1">💻</div>
                  <div class="text-purple-300 font-bold">1. Controller</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Calculates δ_cmd</div>
                </div>
                <div class="bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div class="text-amber-400 text-base mb-1">⚙️</div>
                  <div class="text-amber-300 font-bold">2. Actuator</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Moves rear fin</div>
                </div>
                <div class="bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div class="text-cyan-400 text-base mb-1">🌊</div>
                  <div class="text-cyan-300 font-bold">3. Fluid Dynamics</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Generates Lift, Drag, M</div>
                </div>
                <div class="bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div class="text-emerald-400 text-base mb-1">🚀</div>
                  <div class="text-emerald-300 font-bold">4. Body Dynamics</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Rotates & Accelerates</div>
                </div>
                <div class="bg-slate-800 p-2 rounded-lg border border-slate-700">
                  <div class="text-sky-400 text-base mb-1">📡</div>
                  <div class="text-sky-300 font-bold">5. Sensors</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Closes feedback loop</div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">Simulation is running live in the main viewport in background!</span>
            <button id="closeWhyFluidBtn2" class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition-all">
              Watch Live Dual Flight
            </button>
          </div>

        </div>
      </div>
    `;

    this.modal.querySelector('#closeWhyFluidBtn').addEventListener('click', () => this.hide());
    this.modal.querySelector('#closeWhyFluidBtn2').addEventListener('click', () => this.hide());
  }
}
