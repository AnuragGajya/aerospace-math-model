/**
 * FlightDynamicsModel.js
 * Comprehensive Mathematical Flight Dynamics Engine (3-DoF / 6-DoF)
 * Implements equations of motion, atmospheric thermodynamics, supersonic drag polar,
 * and numerical integration (RK4 / Euler).
 */

export class FlightDynamicsModel {
  constructor(config = {}) {
    // Reference vehicle geometry
    this.mass = config.mass || 12.0; // kg
    this.bodyLength = config.bodyLength || 1.5; // m
    this.bodyDiameter = config.bodyDiameter || 0.15; // m
    this.refArea = config.refArea || (Math.PI * Math.pow(this.bodyDiameter / 2, 2)); // m^2
    this.Iyy = config.Iyy || 2.25; // kg*m^2
    this.Izz = config.Izz || 2.25; // kg*m^2
    this.Ixx = config.Ixx || 0.04; // kg*m^2

    // Base Aerodynamic Coefficients
    this.CD0_subsonic = 0.12;
    this.CD0_supersonic = 0.38;
    this.k_induced = 0.18;
    this.CL_alpha_sub = 3.5; // per radian
    this.CL_alpha_super = 2.2; // per radian
    this.finEffectiveness = 1.0;

    // Atmospheric Constants (US Standard 1976)
    this.T0 = 288.15; // K
    this.P0 = 101325.0; // Pa
    this.rho0 = 1.225; // kg/m^3
    this.gamma = 1.4;
    this.R_air = 287.05287; // J/(kg*K)
    this.lapseRate = 0.0065; // K/m
    this.g = 9.80665; // m/s^2
  }

  /**
   * Evaluate atmospheric properties at altitude h (m)
   */
  getAtmosphere(altitudeM) {
    const h = Math.max(0, Math.min(altitudeM, 25000));
    let T, P, rho;

    if (h <= 11000) {
      T = this.T0 - this.lapseRate * h;
      P = this.P0 * Math.pow(1 - (this.lapseRate * h) / this.T0, this.g / (this.R_air * this.lapseRate));
    } else {
      const T11 = this.T0 - this.lapseRate * 11000;
      const P11 = this.P0 * Math.pow(1 - (this.lapseRate * 11000) / this.T0, this.g / (this.R_air * this.lapseRate));
      T = T11;
      P = P11 * Math.exp(-this.g * (h - 11000) / (this.R_air * T11));
    }

    rho = P / (this.R_air * T);
    const speedOfSound = Math.sqrt(this.gamma * this.R_air * T);

    return {
      altitude: h,
      temperatureK: T,
      temperatureC: T - 273.15,
      pressurePa: P,
      density: rho,
      speedOfSound: speedOfSound,
    };
  }

  /**
   * Calculate supersonic aerodynamic coefficients and forces
   * @param {number} airspeed - total airspeed (m/s)
   * @param {number} altitude - altitude (m)
   * @param {number} alpha - angle of attack (rad)
   * @param {number} beta - sideslip angle (rad)
   * @param {number} finPitch - pitch fin deflection (rad)
   * @param {number} finYaw - yaw fin deflection (rad)
   */
  getAerodynamics(airspeed, altitude, alpha = 0, beta = 0, finPitch = 0, finYaw = 0) {
    const atmo = this.getAtmosphere(altitude);
    const V = Math.max(1.0, airspeed);
    const q_bar = 0.5 * atmo.density * V * V; // Dynamic Pressure (Pa)
    const Mach = V / atmo.speedOfSound;

    // 1. Wave Drag & Compressibility (Transonic / Supersonic Peak)
    let CD0;
    if (Mach < 0.8) {
      // Subsonic
      const pg = 1.0 / Math.sqrt(Math.max(0.01, 1 - Mach * Mach));
      CD0 = this.CD0_subsonic * pg;
    } else if (Mach <= 1.2) {
      // Transonic wave drag rise
      const t = (Mach - 0.8) / 0.4;
      CD0 = this.CD0_subsonic + t * (this.CD0_supersonic - this.CD0_subsonic);
    } else {
      // Supersonic wave drag decay (1 / sqrt(M^2 - 1))
      const waveFactor = 1.0 / Math.sqrt(Math.max(0.01, Mach * Mach - 1));
      CD0 = 0.18 + 0.25 * waveFactor;
    }

    // 2. Lift Curve Slope (Mach dependent)
    let CL_alpha;
    if (Mach < 0.8) {
      CL_alpha = this.CL_alpha_sub / Math.sqrt(Math.max(0.01, 1 - Mach * Mach));
    } else if (Mach <= 1.2) {
      CL_alpha = (this.CL_alpha_sub + this.CL_alpha_super) / 2.0;
    } else {
      CL_alpha = 4.0 / Math.sqrt(Math.max(0.01, Mach * Mach - 1));
    }

    // 3. Lift & Side Force Coefficients
    const CL = CL_alpha * alpha + 1.8 * finPitch * this.finEffectiveness;
    const CY = -CL_alpha * beta + 1.8 * finYaw * this.finEffectiveness;

    // 4. Drag Coefficient (Parasite + Induced + Fin form drag)
    const CD_induced = this.k_induced * (CL * CL + CY * CY);
    const CD_fins = 0.8 * (Math.pow(Math.sin(finPitch), 2) + Math.pow(Math.sin(finYaw), 2));
    const CD = CD0 + CD_induced + CD_fins;

    // 5. Dimensional Forces (N)
    const liftForce = q_bar * this.refArea * CL;
    const dragForce = q_bar * this.refArea * CD;
    const sideForce = q_bar * this.refArea * CY;
    const resultantForce = Math.sqrt(liftForce * liftForce + dragForce * dragForce + sideForce * sideForce);

    return {
      Mach,
      dynamicPressure: q_bar,
      density: atmo.density,
      speedOfSound: atmo.speedOfSound,
      CL,
      CD,
      CY,
      CD0,
      liftForce,
      dragForce,
      sideForce,
      resultantForce,
    };
  }

  /**
   * Derivative function for 3-DoF Point-Mass ballistic/guided trajectory
   * State: [x, y, z, vx, vy, vz]
   */
  computeDerivatives(state, ctrlPitchRad = 0, ctrlYawRad = 0, wind = { vx: 0, vy: 0, vz: 0 }) {
    const x = state[0], y = state[1], z = state[2];
    const vx = state[3], vy = state[4], vz = state[5];

    // Air-relative velocity vector
    const u_rel = vx - wind.vx;
    const v_rel = vy - wind.vy;
    const w_rel = vz - wind.vz;
    const airspeed = Math.sqrt(u_rel * u_rel + v_rel * v_rel + w_rel * w_rel);

    // Angles
    const gamma = Math.atan2(w_rel, Math.sqrt(u_rel * u_rel + v_rel * v_rel)); // flight path pitch
    const psi = Math.atan2(v_rel, Math.max(0.1, u_rel)); // flight path yaw
    const alpha = -ctrlPitchRad * 0.4; // simplified dynamic angle of attack
    const beta = ctrlYawRad * 0.4;

    const aero = this.getAerodynamics(airspeed, z, alpha, beta, ctrlPitchRad, ctrlYawRad);

    // Aerodynamic forces in Cartesian inertial frame
    // Drag opposite to relative velocity
    const D_x = -aero.dragForce * (u_rel / airspeed);
    const D_y = -aero.dragForce * (v_rel / airspeed);
    const D_z = -aero.dragForce * (w_rel / airspeed);

    // Lift perpendicular to velocity in pitch plane
    const L_x = -aero.liftForce * Math.sin(gamma) * Math.cos(psi);
    const L_y = -aero.liftForce * Math.sin(gamma) * Math.sin(psi);
    const L_z = aero.liftForce * Math.cos(gamma);

    // Side force
    const S_x = -aero.sideForce * Math.sin(psi);
    const S_y = aero.sideForce * Math.cos(psi);
    const S_z = 0;

    // Total Accelerations
    const ax = (D_x + L_x + S_x) / this.mass;
    const ay = (D_y + L_y + S_y) / this.mass;
    const az = (D_z + L_z + S_z - this.mass * this.g) / this.mass;

    return [vx, vy, vz, ax, ay, az];
  }

  /**
   * Step 4th-Order Runge-Kutta (RK4) integration
   */
  rk4Step(state, dt, ctrlPitchRad = 0, ctrlYawRad = 0, wind = { vx: 0, vy: 0, vz: 0 }) {
    const k1 = this.computeDerivatives(state, ctrlPitchRad, ctrlYawRad, wind);

    const s2 = state.map((v, i) => v + 0.5 * dt * k1[i]);
    const k2 = this.computeDerivatives(s2, ctrlPitchRad, ctrlYawRad, wind);

    const s3 = state.map((v, i) => v + 0.5 * dt * k2[i]);
    const k3 = this.computeDerivatives(s3, ctrlPitchRad, ctrlYawRad, wind);

    const s4 = state.map((v, i) => v + dt * k3[i]);
    const k4 = this.computeDerivatives(s4, ctrlPitchRad, ctrlYawRad, wind);

    return state.map((v, i) => v + (dt / 6.0) * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]));
  }
}
