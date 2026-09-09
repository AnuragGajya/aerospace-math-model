/**
 * EquationsModal.js
 * Educational Aerodynamic Equations & Mathematical Formulations
 * Explains foundational physics formulas, symbol definitions, and physical context.
 */

export class EquationsModal {
  constructor(modalElement) {
    this.modal = modalElement;
  }

  show() {
    if (!this.modal) return;
    this.render();
    this.modal.classList.remove('hidden');
  }

  hide() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
  }

  render() {
    this.modal.innerHTML = `
      <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
            <div class="flex items-center space-x-3">
              <span class="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 text-lg">📐</span>
              <div>
                <h2 class="text-lg font-bold text-slate-100">Governing Educational Aerodynamic Equations</h2>
                <p class="text-xs text-slate-400">Core Mathematical Models of Fluid Dynamics, Control & Rigid-Body Mechanics</p>
              </div>
            </div>
            <button id="closeEquationsBtn" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">✕</button>
          </div>

          <!-- Content Scrollable Body -->
          <div class="overflow-y-auto p-6 space-y-6 text-slate-300 text-sm">
            
            <!-- Disclaimer Banner -->
            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start space-x-3">
              <span class="text-base">⚠️</span>
              <div>
                <p class="font-bold">Educational Simulation Model Disclaimer</p>
                <p class="text-amber-200/80 mt-0.5">These equations represent standardized introductory slender-body and thin-airfoil aerodynamic theories. High-fidelity real-world prediction requires Navier-Stokes CFD solvers, validated wind-tunnel experiments, and empirical aero-databases.</p>
              </div>
            </div>

            <!-- Equations Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- 1. Dynamic Pressure -->
              <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                <div class="text-xs font-mono text-sky-400 mb-1">1. DYNAMIC PRESSURE (q)</div>
                <div class="bg-slate-950/80 rounded-lg p-3 text-center my-2 font-mono text-base font-bold text-amber-300 border border-slate-800">
                  q = ½ · ρ · V²
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Calculates the kinetic energy per unit volume of the oncoming airstream. All aerodynamic forces scale proportionally with \(q\).
                </p>
              </div>

              <!-- 2. Aerodynamic Lift -->
              <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                <div class="text-xs font-mono text-emerald-400 mb-1">2. AERODYNAMIC LIFT (L)</div>
                <div class="bg-slate-950/80 rounded-lg p-3 text-center my-2 font-mono text-base font-bold text-emerald-300 border border-slate-800">
                  Lift = q · S_ref · C_L(α, δ)
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Force perpendicular to the relative airflow. \(C_L\) depends on Angle of Attack (\(\alpha\)), fin deflection (\(\delta\)), and stall separation.
                </p>
              </div>

              <!-- 3. Aerodynamic Drag -->
              <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                <div class="text-xs font-mono text-rose-400 mb-1">3. AERODYNAMIC DRAG (D)</div>
                <div class="bg-slate-950/80 rounded-lg p-3 text-center my-2 font-mono text-base font-bold text-rose-300 border border-slate-800">
                  Drag = q · S_ref · C_D
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Resistance force parallel to the relative airflow: \(C_D = C_{D0} + K C_L^2 + C_{D,fins}(\delta) + C_{D,wave}(M)\).
                </p>
              </div>

              <!-- 4. Aerodynamic Pitching Moment -->
              <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                <div class="text-xs font-mono text-amber-400 mb-1">4. PITCHING MOMENT (M_yy)</div>
                <div class="bg-slate-950/80 rounded-lg p-3 text-center my-2 font-mono text-base font-bold text-amber-300 border border-slate-800">
                  M_yy = q · S_ref · L_ref · C_M
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Aerodynamic torque acting about the Center of Mass (CG). Drives the rotational acceleration of the body: \(\ddot{\theta} = M_{yy} / I_{yy}\).
                </p>
              </div>

              <!-- 5. Static Stability Margin -->
              <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                <div class="text-xs font-mono text-cyan-400 mb-1">5. STATIC STABILITY MARGIN (SSM)</div>
                <div class="bg-slate-950/80 rounded-lg p-3 text-center my-2 font-mono text-base font-bold text-cyan-300 border border-slate-800">
                  SSM = [(x_CP - x_CG) / L_ref] × 100%
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  When Center of Pressure (\(x_{CP}\)) is behind Center of Mass (\(x_{CG}\)), the margin is positive, creating natural weathercocking pitch-restoring stability.
                </p>
              </div>

              <!-- 6. Actuator 1st-Order Lag Dynamics -->
              <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
                <div class="text-xs font-mono text-purple-400 mb-1">6. ACTUATOR LAG FILTER</div>
                <div class="bg-slate-950/80 rounded-lg p-3 text-center my-2 font-mono text-base font-bold text-purple-300 border border-slate-800">
                  τ · (dδ/dt) + δ = δ_cmd
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Models physical servo-motor time constant (\(\tau\)) and slew-rate limiting, introducing phase delay between controller command and fin response.
                </p>
              </div>

            </div>

            <!-- Comprehensive Symbol Table -->
            <div class="border border-slate-800 rounded-xl overflow-hidden mt-4">
              <div class="bg-slate-950 px-4 py-2.5 font-bold text-xs text-slate-300 border-b border-slate-800">
                Symbol Glossary & Physical Units
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 text-xs font-mono bg-slate-900/90">
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">ρ:</strong> Air Density (kg/m³)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">V:</strong> True Airspeed (m/s)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">q:</strong> Dynamic Pressure (Pa)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">S_ref:</strong> Ref Area (m²)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">L_ref:</strong> Body Length (m)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">α:</strong> Angle of Attack (rad/deg)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">δ:</strong> Fin Deflection (rad/deg)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">C_L:</strong> Lift Coefficient</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">C_D:</strong> Drag Coefficient</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">C_M:</strong> Moment Coefficient</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">x_CG:</strong> Center of Mass (m)</div>
                <div class="p-1.5 bg-slate-800/40 rounded"><strong class="text-sky-400">x_CP:</strong> Center of Pressure (m)</div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
            <button id="closeEquationsBtn2" class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all">
              Close Panel
            </button>
          </div>

        </div>
      </div>
    `;

    this.modal.querySelector('#closeEquationsBtn').addEventListener('click', () => this.hide());
    this.modal.querySelector('#closeEquationsBtn2').addEventListener('click', () => this.hide());
  }
}
