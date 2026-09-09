/**
 * PresentationMode.js
 * 10-Step Interactive Guided Presentation & Educational Walkthrough
 * Steps through the exact causal sequence of aerodynamic control in flight.
 */

export class PresentationMode {
  constructor(containerElement, simEngine) {
    this.container = containerElement;
    this.engine = simEngine;
    this.currentStep = 0;
    this.isPlaying = false;
    this.autoTimer = null;

    this.steps = [
      {
        stepNum: 1,
        title: "1. Steady Neutral Flight",
        description: "The generic flying body is cruising in steady level flight with neutral control surfaces (δ = 0°). Aerodynamic lift balances gravity, thrust balances parasite drag, and pitching moment is zero.",
        simAction: () => {
          this.engine.reset();
          this.engine.controller.updateConfig({ pathType: 'straight' });
          this.engine.atmosphere.setEnvironment({ windSpeed: 0 });
          this.engine.start();
        },
      },
      {
        stepNum: 2,
        title: "2. Environmental Disturbance",
        description: "A sudden crosswind gust strikes the vehicle. The relative wind vector shifts, creating an angle of attack (AoA) disturbance and pushing the body off its reference path.",
        simAction: () => {
          this.engine.injectDisturbance(14.0, 1.2);
        },
      },
      {
        stepNum: 3,
        title: "3. Sensor State Estimation",
        description: "Onboard GNSS and IMU sensors measure the altitude drop, angular pitch rate, and normal acceleration. The state estimator calculates cross-track error (e_z) despite measurement noise.",
        simAction: () => {
          // sensors are active
        },
      },
      {
        stepNum: 4,
        title: "4. Feedback Controller Output",
        description: "The closed-loop flight controller processes the tracking error and computes a corrective pitch command (θ_cmd), generating a commanded rear fin deflection (δ_cmd).",
        simAction: () => {
          // controller computes delta_cmd
        },
      },
      {
        stepNum: 5,
        title: "5. Rear Control Surface Movement",
        description: "The electromechanical actuator drives the rear movable fins into the oncoming airstream, subjected to 1st-order response lag (τ) and mechanical slew rate limits.",
        simAction: () => {
          // actuator is deflecting
        },
      },
      {
        stepNum: 6,
        title: "6. Airflow & Pressure Reconfiguration",
        description: "As the rear fins deflect, oncoming streamlines curve sharply. Stagnation pressure builds on the windward fin face, while a suction peak forms on the leeward face.",
        simAction: () => {
          // flow visualizer displays pressure delta
        },
      },
      {
        stepNum: 7,
        title: "7. Aerodynamic Force & Pitching Moment Appear",
        description: "The pressure asymmetry across the rear fins generates a net normal force at the rear Center of Pressure, creating a powerful restoring torque (M_yy = q · S · L_ref · C_M) about the Center of Mass (CG).",
        simAction: () => {
          // Moment vector appears
        },
      },
      {
        stepNum: 8,
        title: "8. Vehicle Rotational Response",
        description: "According to rigid-body rotational dynamics (d²θ/dt² = M_yy / I_yy), the aerodynamic torque overcomes the body's moment of inertia, pitching the nose upward.",
        simAction: () => {
          // Body rotates in pitch
        },
      },
      {
        stepNum: 9,
        title: "9. Corrective Lift & Trajectory Recovery",
        description: "Body pitch rotation increases the vehicle's total angle of attack (α), generating massive main-body and fin aerodynamic lift (L = q · S · C_L). The flight path curves upward toward the reference.",
        simAction: () => {
          // Lift vector climbs
        },
      },
      {
        stepNum: 10,
        title: "10. Closed-Loop Stabilization & Grand Conclusion",
        description: "As the vehicle approaches the target altitude, the controller reduces fin deflection to prevent overshoot. Aerodynamic damping (C_Mq) arrests the rotation, completing the feedback loop!",
        simAction: () => {
          // Stabilized
        },
      },
    ];
  }

  show() {
    if (!this.container) return;
    this.currentStep = 0;
    this.container.classList.remove('hidden');
    this.goToStep(0);
  }

  hide() {
    if (!this.container) return;
    this.stopAuto();
    this.container.classList.add('hidden');
  }

  goToStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    const step = this.steps[this.currentStep];
    step.simAction();
    this.render();
  }

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.goToStep(this.currentStep + 1);
    } else {
      this.stopAuto();
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  toggleAuto() {
    if (this.isPlaying) {
      this.stopAuto();
    } else {
      this.startAuto();
    }
  }

  startAuto() {
    this.isPlaying = true;
    this.autoTimer = setInterval(() => {
      if (this.currentStep < this.steps.length - 1) {
        this.next();
      } else {
        this.stopAuto();
      }
    }, 4500);
    this.render();
  }

  stopAuto() {
    this.isPlaying = false;
    if (this.autoTimer) clearInterval(this.autoTimer);
    this.render();
  }

  render() {
    const step = this.steps[this.currentStep];
    const isLast = this.currentStep === this.steps.length - 1;

    this.container.innerHTML = `
      <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
            <div class="flex items-center space-x-3">
              <span class="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 text-lg">🎓</span>
              <div>
                <h2 class="text-base font-bold text-slate-100">Interactive Guided Lesson: The Aerodynamic Control Sequence</h2>
                <p class="text-xs text-slate-400">Step ${step.stepNum} of 10: Complete Causal Chain Walkthrough</p>
              </div>
            </div>
            <button id="closePresentationBtn" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">✕</button>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-800 h-1.5">
            <div class="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all duration-300" style="width: ${((this.currentStep + 1) / 10) * 100}%"></div>
          </div>

          <!-- Main Content -->
          <div class="p-6 overflow-y-auto space-y-5 text-slate-300">
            
            <div class="bg-slate-800/70 border border-slate-700/60 rounded-xl p-4">
              <h3 class="text-base font-bold text-amber-400 mb-2">${step.title}</h3>
              <p class="text-xs sm:text-sm text-slate-200 leading-relaxed">${step.description}</p>
            </div>

            <!-- Step Visual Graphic / Indicator -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              ${this.steps.map((s, idx) => `
                <div class="p-2 rounded-lg border transition-all ${idx === this.currentStep ? 'bg-sky-950 border-sky-400 text-sky-200 shadow-md font-bold' : (idx < this.currentStep ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-900/40 border-slate-800 text-slate-600')}">
                  <div>Step ${s.stepNum}</div>
                  <div class="text-[10px] truncate mt-0.5">${s.title.split('. ')[1] || s.title}</div>
                </div>
              `).join('')}
            </div>

            ${isLast ? `
              <!-- Final Grand Comparison Summary Box -->
              <div class="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-3">
                <div class="text-xs font-bold text-emerald-300 uppercase tracking-wider">Final Educational Comparison</div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div class="text-rose-400 font-bold mb-1">WITHOUT AERODYNAMIC MODEL</div>
                    <p class="text-slate-300">“Control-surface movement is assumed to produce a desired response.”</p>
                  </div>
                  <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div class="text-emerald-400 font-bold mb-1">WITH FLUID DYNAMICS</div>
                    <p class="text-slate-300">“Control-surface movement changes airflow ➔ airflow produces forces and moments ➔ forces change vehicle dynamics ➔ sensors measure the response ➔ controller makes the next correction.”</p>
                  </div>
                </div>

                <div class="pt-2 border-t border-emerald-800/60 text-xs sm:text-sm font-semibold text-emerald-200 leading-relaxed text-center">
                  “Electronics decides what correction is required.<br/>
                  The actuator moves the control surface.<br/>
                  Fluid dynamics determines what aerodynamic force that movement actually produces.<br/>
                  Vehicle dynamics determines how the body responds.<br/>
                  Sensors measure that response and close the feedback loop.”
                </div>
              </div>
            ` : ''}

          </div>

          <!-- Footer Navigation Bar -->
          <div class="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <button id="presPrevBtn" ${this.currentStep === 0 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 font-medium">
                ◀ Previous
              </button>
              <button id="presAutoBtn" class="px-3 py-1.5 rounded-lg ${this.isPlaying ? 'bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'} text-xs text-slate-200 font-medium">
                ${this.isPlaying ? '⏸ Pause Auto' : '▶ Auto Play'}
              </button>
            </div>

            <div class="flex items-center space-x-2">
              ${!isLast ? `
                <button id="presNextBtn" class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-900/40">
                  Next Step ▶
                </button>
              ` : `
                <button id="presFinishBtn" class="px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/40">
                  Complete Presentation 🎉
                </button>
              `}
            </div>
          </div>

        </div>
      </div>
    `;

    // Bind Button Events
    this.container.querySelector('#closePresentationBtn').addEventListener('click', () => this.hide());
    const prevBtn = this.container.querySelector('#presPrevBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
    const autoBtn = this.container.querySelector('#presAutoBtn');
    if (autoBtn) autoBtn.addEventListener('click', () => this.toggleAuto());
    const nextBtn = this.container.querySelector('#presNextBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
    const finishBtn = this.container.querySelector('#presFinishBtn');
    if (finishBtn) finishBtn.addEventListener('click', () => this.hide());
  }
}
