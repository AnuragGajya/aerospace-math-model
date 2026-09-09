/**
 * AerodynamicModel.js
 * Educational Slender-Body Aerodynamic Model
 * Calculates lift, drag, pitching moment, center of pressure,
 * static stability margin, flow separation, and compressibility effects.
 * 
 * NOTE: Non-weaponized, purely educational generic flying body physics.
 */

export class AerodynamicModel {
  constructor(config = {}) {
    // Reference geometry (generic axisymmetric body)
    this.bodyLength = config.bodyLength || 1.5; // m
    this.bodyDiameter = config.bodyDiameter || 0.15; // m
    this.refArea = config.refArea || (Math.PI * Math.pow(this.bodyDiameter / 2, 2)); // m^2 (cross-sectional area)
    this.refLength = config.refLength || this.bodyLength; // m
    
    // Mass properties
    this.mass = config.mass || 12.0; // kg
    this.xCG = config.xCG || 0.75; // CG location from nose (m)
    this.Iyy = config.Iyy || ( (1/12) * this.mass * (3 * Math.pow(this.bodyDiameter/2, 2) + Math.pow(this.bodyLength, 2)) ); // kg*m^2
    
    // Control surface geometry (4 rear cruciform fins)
    this.numFins = config.numFins || 4;
    this.finArea = config.finArea || 0.018; // m^2 per fin
    this.finSpan = config.finSpan || 0.12; // m
    this.finChord = config.finChord || 0.15; // m
    this.finAspectRatio = config.finAspectRatio || (Math.pow(this.finSpan, 2) / this.finArea);
    this.finLocationX = config.finLocationX || 1.35; // fin center of pressure location from nose (m)
    this.finEffectiveness = config.finEffectiveness !== undefined ? config.finEffectiveness : 1.0; // 0 to 1.5 scaling
    
    // Base aerodynamic coefficients (Generic slender body)
    this.CD0_body = 0.14; // Zero-lift parasite drag of body
    this.CD0_fin = 0.025; // Zero-lift drag per fin
    this.Cdc_crossflow = 1.1; // Cross-flow drag coefficient for cylinder
    this.alphaStall = (17.5 * Math.PI) / 180.0; // Stall angle in radians (~17.5 deg)
    this.kSeparation = 18.0; // Sharpness of flow separation transition
    this.pitchDampingCmq = -12.5; // Pitch rate damping derivative C_M_q
    
    // Nose geometry
    this.noseLength = 0.35 * this.bodyLength;
    this.xCP_nose = 0.67 * this.noseLength; // Nose CP
    this.xCP_body_cyl = 0.5 * this.bodyLength; // Cylindrical body CP
  }

  /**
   * Update vehicle geometric/inertial configuration
   */
  updateConfig(params = {}) {
    if (params.bodyLength !== undefined) {
      this.bodyLength = params.bodyLength;
      this.refLength = this.bodyLength;
      this.noseLength = 0.35 * this.bodyLength;
      this.xCP_nose = 0.67 * this.noseLength;
      this.xCP_body_cyl = 0.5 * this.bodyLength;
    }
    if (params.bodyDiameter !== undefined) {
      this.bodyDiameter = params.bodyDiameter;
      this.refArea = Math.PI * Math.pow(this.bodyDiameter / 2, 2);
    }
    if (params.mass !== undefined) this.mass = params.mass;
    if (params.xCG !== undefined) this.xCG = params.xCG;
    if (params.Iyy !== undefined) this.Iyy = params.Iyy;
    if (params.numFins !== undefined) this.numFins = params.numFins;
    if (params.finArea !== undefined) this.finArea = params.finArea;
    if (params.finAspectRatio !== undefined) this.finAspectRatio = params.finAspectRatio;
    if (params.finLocationX !== undefined) this.finLocationX = params.finLocationX;
    if (params.finEffectiveness !== undefined) this.finEffectiveness = params.finEffectiveness;
    
    // Recompute default moment of inertia if mass/length changed and not explicitly set
    if (params.Iyy === undefined && (params.mass !== undefined || params.bodyLength !== undefined || params.bodyDiameter !== undefined)) {
      this.Iyy = (1/12) * this.mass * (3 * Math.pow(this.bodyDiameter/2, 2) + Math.pow(this.bodyLength, 2));
    }
  }

  /**
   * Calculate flow separation factor (0 = fully attached, 1 = fully separated/stalled)
   * @param {number} alpha - Angle of attack in radians
   * @returns {number} Separation factor (0 to 1)
   */
  getFlowSeparationFactor(alpha) {
    const absAlpha = Math.abs(alpha);
    // Logistic sigmoid for smooth flow separation
    return 1.0 / (1.0 + Math.exp(-this.kSeparation * (absAlpha - this.alphaStall)));
  }

  /**
   * Calculate full educational aerodynamic forces, moments, and stability indicators
   * @param {Object} flowState - { dynamicPressure, machNumber, reynoldsNumber, compressibilityFactor }
   * @param {number} alpha - Angle of attack (rad)
   * @param {number} finDeflection - Rear control surface deflection delta (rad)
   * @param {number} pitchRate - Angular pitch velocity q (rad/s)
   * @param {number} airSpeed - Relative airspeed (m/s)
   * @returns {Object} Aerodynamic coefficients, forces, moments, stability metrics
   */
  calculateAerodynamics(flowState, alpha, finDeflection, pitchRate = 0, airSpeed = 50) {
    const q_bar = flowState.dynamicPressure; // Pa
    const Mach = flowState.machNumber || 0.15;
    const compFactor = flowState.compressibilityFactor || 1.0;
    
    const S_ref = this.refArea;
    const L_ref = this.refLength;
    const V = Math.max(1.0, airSpeed);

    // 1. Flow Separation Factor
    const f_sep = this.getFlowSeparationFactor(alpha);

    // 2. Slender Body Lift & Normal Force Component
    // Slender body theory: CN_nose = 2 * alpha + non-linear crossflow drag
    const CN_nose_linear = 2.0 * alpha * compFactor;
    const CN_body_crossflow = (2.0 / Math.PI) * this.Cdc_crossflow * Math.sin(alpha) * Math.abs(Math.sin(alpha)) * (this.bodyLength / this.bodyDiameter);
    const CN_body = CN_nose_linear + CN_body_crossflow;

    // 3. Rear Fin Normal Force & Control Effectiveness
    // Fin lift curve slope: CNa_fin = 2 * pi * AR / (AR + 2)
    const CNa_fin = (2.0 * Math.PI * this.finAspectRatio) / (this.finAspectRatio + 2.0) * compFactor;
    
    // Effective local angle of attack at fin includes body AoA, downwash, and fin deflection:
    const alpha_fin_local = alpha + finDeflection;
    const CN_fin_linear = (this.numFins / 2.0) * (this.finArea / S_ref) * CNa_fin * alpha_fin_local * this.finEffectiveness;
    
    // Post-stall blending for fins
    const CN_fin_stalled = (this.numFins / 2.0) * (this.finArea / S_ref) * 2.0 * Math.sign(alpha_fin_local) * Math.pow(Math.sin(alpha_fin_local), 2);
    const CN_fins = CN_fin_linear * (1.0 - f_sep) + CN_fin_stalled * f_sep;

    // Total Normal Force Coefficient
    const CN_total = CN_body + CN_fins;

    // 4. Center of Pressure (CP) Calculation
    // Moment about nose: sum(CN_i * x_i)
    let xCP_total;
    if (Math.abs(CN_total) > 1e-4) {
      const momentArmNose = (CN_nose_linear * this.xCP_nose) + (CN_body_crossflow * this.xCP_body_cyl) + (CN_fins * this.finLocationX);
      xCP_total = momentArmNose / CN_total;
      // Clamp CP within physical vehicle bounds
      xCP_total = Math.max(0.1 * this.bodyLength, Math.min(this.bodyLength * 1.1, xCP_total));
    } else {
      // Neutral CP under zero normal force
      xCP_total = (this.xCP_nose + this.finLocationX) / 2.0;
    }

    // 5. Static Stability Margin (SSM)
    // SSM = (xCP - xCG) / L_ref * 100%
    // If CP is behind CG (xCP > xCG), the vehicle is statically stable (positive margin, weathercocking into wind).
    const stabilityMarginPercent = ((xCP_total - this.xCG) / L_ref) * 100.0;
    const isStaticallyStable = xCP_total > this.xCG;

    // 6. Pitching Moment Calculation about CG
    // M_CG = - CN_nose * (xCG - xCP_nose) - CN_fins * (xCG - xCP_fin) + Damping
    const CM_body = CN_body * ((this.xCG - this.xCP_nose) / L_ref);
    const CM_fins = CN_fins * ((this.xCG - this.finLocationX) / L_ref);
    
    // Non-dimensional pitch rate: q_hat = (q_pitch * L_ref) / (2 * V)
    const q_hat = (pitchRate * L_ref) / (2.0 * V);
    const CM_damping = this.pitchDampingCmq * q_hat;

    const CM_total = CM_body + CM_fins + CM_damping;

    // 7. Drag Coefficient Calculation
    // Base parasite drag + induced drag + fin deflection form drag + wave drag
    const totalFinArea = this.numFins * this.finArea;
    const CD0_total = this.CD0_body + (totalFinArea / S_ref) * this.CD0_fin;
    
    // Induced drag factor K = 1 / (pi * AR_eff * e)
    const K_induced = 1.0 / (Math.PI * Math.max(1.0, this.finAspectRatio) * 0.85);
    const CD_induced = K_induced * Math.pow(CN_total, 2);
    
    // Additional drag from fin deflection
    const CD_fin_deflection = (totalFinArea / S_ref) * 1.2 * Math.pow(Math.sin(finDeflection), 2);
    
    // Transonic wave drag rise model (onset at Mcrit ~ 0.8)
    let CD_wave = 0.0;
    if (Mach > 0.8) {
      CD_wave = 0.05 * Math.pow(Math.min(1.2, Mach) - 0.8, 1.8);
    }

    const CD_total = CD0_total + CD_induced + CD_fin_deflection + CD_wave;

    // 8. Convert Normal (CN) and Axial (CA) to Lift (CL) and Drag (CD) in wind axes:
    // CL = CN * cos(alpha) - CA * sin(alpha)
    // CD = CA * cos(alpha) + CN * sin(alpha)
    const CL_total = CN_total * Math.cos(alpha) - CD_total * Math.sin(alpha);
    const CD_wind = CD_total * Math.cos(alpha) + CN_total * Math.sin(alpha);

    // 9. Dimensional Aerodynamic Forces & Moments
    const liftForce = q_bar * S_ref * CL_total; // N (perpendicular to relative airflow)
    const dragForce = q_bar * S_ref * Math.max(0.001, CD_wind); // N (parallel to relative airflow)
    const pitchingMoment = q_bar * S_ref * L_ref * CM_total; // N*m (about CG)
    const resultantForce = Math.sqrt(liftForce * liftForce + dragForce * dragForce); // N

    return {
      // Coefficients
      CL: CL_total,
      CD: CD_wind,
      CM: CM_total,
      CN: CN_total,
      CN_body: CN_body,
      CN_fins: CN_fins,
      
      // Control & Flow factors
      alphaDeg: (alpha * 180.0) / Math.PI,
      finDeflectionDeg: (finDeflection * 180.0) / Math.PI,
      flowSeparationFactor: f_sep,
      isStalled: f_sep > 0.5,
      compressibilityFactor: compFactor,
      
      // Centers & Stability
      xCG: this.xCG,
      xCP: xCP_total,
      staticStabilityMargin: stabilityMarginPercent, // % of L_ref
      isStaticallyStable: isStaticallyStable,
      
      // Dimensional Forces & Torques (SI units)
      liftForce: liftForce, // N
      dragForce: dragForce, // N
      pitchingMoment: pitchingMoment, // N*m
      resultantForce: resultantForce, // N
      dynamicPressure: q_bar, // Pa
      
      // Reference geometry
      refArea: S_ref,
      refLength: L_ref,
      mass: this.mass,
      Iyy: this.Iyy,
    };
  }
}
