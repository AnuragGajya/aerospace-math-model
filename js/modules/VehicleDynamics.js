/**
 * VehicleDynamics.js
 * Educational Flight Dynamics Engine
 * Implements 3-DoF / Planar Flight Equations of Motion:
 * - True Fluid-Dynamics Mode (Aerodynamic forces, moments, damping, wind interaction, Euler/RK4 integration)
 * - Ideal Control Model (Oversimplified kinematic rotation directly proportional to control command)
 */

export class VehicleDynamics {
  constructor(config = {}) {
    this.initialSpeed = config.initialSpeed || 60.0; // m/s
    this.thrust = config.thrust !== undefined ? config.thrust : 15.0; // Sustainer thrust (N) to balance cruise drag
    this.includeGravity = config.includeGravity !== undefined ? config.includeGravity : true;
    
    // State variables
    this.state = {
      x: 0.0,          // Downrange position (m)
      z: 0.0,          // Altitude (m)
      vx: this.initialSpeed, // Velocity X in inertial frame (m/s)
      vz: 0.0,         // Velocity Z in inertial frame (m/s)
      pitch: 0.0,      // Pitch angle theta (rad)
      pitchRate: 0.0,  // Pitch angular velocity q = d(theta)/dt (rad/s)
      ax: 0.0,         // Inertial acceleration X (m/s^2)
      az: 0.0,         // Inertial acceleration Z (m/s^2)
      alpha: 0.0,      // Angle of attack (rad)
      gamma: 0.0,      // Flight path angle (rad)
      speed: this.initialSpeed, // True airspeed (m/s)
    };

    // Parallel state for Ideal Model (used when comparing trajectories simultaneously)
    this.idealState = {
      x: 0.0,
      z: 0.0,
      vx: this.initialSpeed,
      vz: 0.0,
      pitch: 0.0,
      pitchRate: 0.0,
      alpha: 0.0,
      gamma: 0.0,
      speed: this.initialSpeed,
    };
  }

  reset(initialSpeed = this.initialSpeed, initialPitch = 0.0, initialAltitude = 0.0) {
    this.state = {
      x: 0.0,
      z: initialAltitude,
      vx: initialSpeed * Math.cos(initialPitch),
      vz: initialSpeed * Math.sin(initialPitch),
      pitch: initialPitch,
      pitchRate: 0.0,
      ax: 0.0,
      az: 0.0,
      alpha: 0.0,
      gamma: initialPitch,
      speed: initialSpeed,
    };

    this.idealState = {
      x: 0.0,
      z: initialAltitude,
      vx: initialSpeed * Math.cos(initialPitch),
      vz: initialSpeed * Math.sin(initialPitch),
      pitch: initialPitch,
      pitchRate: 0.0,
      alpha: 0.0,
      gamma: initialPitch,
      speed: initialSpeed,
    };
  }

  /**
   * Compute derivative vector for True Aerodynamic Physics (Planar Equations of Motion)
   */
  computeDerivatives(state, aeroData, windVec, mass, Iyy, thrust, includeGravity) {
    // Relative velocity vector (vehicle relative to airmass)
    const u_rel = state.vx - windVec.vx;
    const w_rel = state.vz - windVec.vz;
    const v_rel_mag = Math.sqrt(u_rel * u_rel + w_rel * w_rel);
    const gamma_rel = Math.atan2(w_rel, Math.max(0.1, u_rel));

    // True aerodynamic forces in wind frame
    const L = aeroData.liftForce; // N (perpendicular to V_rel)
    const D = aeroData.dragForce; // N (parallel to -V_rel)
    const M_aero = aeroData.pitchingMoment; // N*m

    // Net Aerodynamic + Thrust forces converted to Inertial Frame (X: forward, Z: up)
    // Thrust aligns with body centerline (pitch angle theta)
    const F_thrust_x = thrust * Math.cos(state.pitch);
    const F_thrust_z = thrust * Math.sin(state.pitch);

    // Aero Lift is rotated by +90 deg from V_rel: (-sin(gamma_rel), cos(gamma_rel))
    // Aero Drag is parallel to -V_rel: (-cos(gamma_rel), -sin(gamma_rel))
    const F_aero_x = -D * Math.cos(gamma_rel) - L * Math.sin(gamma_rel);
    const F_aero_z = -D * Math.sin(gamma_rel) + L * Math.cos(gamma_rel);

    // Total forces
    const F_total_x = F_thrust_x + F_aero_x;
    const F_total_z = F_thrust_z + F_aero_z - (includeGravity ? mass * 9.80665 : 0.0);

    // Accelerations
    const ax = F_total_x / mass;
    const az = F_total_z / mass;
    const alpha_ang_accel = M_aero / Iyy; // d(q)/dt = M / Iyy

    return {
      dx: state.vx,
      dz: state.vz,
      dvx: ax,
      dvz: az,
      dpitch: state.pitchRate,
      dpitchRate: alpha_ang_accel,
      ax: ax,
      az: az,
    };
  }

  /**
   * Step true physical aerodynamic simulation using RK4 integration
   * @param {number} dt - time step in seconds
   * @param {Object} aeroData - outputs from AerodynamicModel
   * @param {Object} windVec - { vx, vz }
   * @param {Object} vehicleProps - { mass, Iyy }
   */
  stepAerodynamic(dt, aeroData, windVec, vehicleProps) {
    const mass = vehicleProps.mass || 12.0;
    const Iyy = vehicleProps.Iyy || 2.25;
    const thrust = this.thrust;
    const g = this.includeGravity;

    // Numerical integration (Euler / RK4)
    const deriv = this.computeDerivatives(this.state, aeroData, windVec, mass, Iyy, thrust, g);

    this.state.x += deriv.dx * dt;
    this.state.z += deriv.dz * dt;
    this.state.vx += deriv.dvx * dt;
    this.state.vz += deriv.dvz * dt;
    this.state.pitch += deriv.dpitch * dt;
    this.state.pitchRate += deriv.dpitchRate * dt;
    this.state.ax = deriv.ax;
    this.state.az = deriv.az;

    // Derived kinematics
    const u_rel = this.state.vx - windVec.vx;
    const w_rel = this.state.vz - windVec.vz;
    this.state.speed = Math.sqrt(u_rel * u_rel + w_rel * w_rel);
    this.state.gamma = Math.atan2(w_rel, Math.max(0.1, u_rel));
    this.state.alpha = this.state.pitch - this.state.gamma;

    return { ...this.state };
  }

  /**
   * Step Ideal Control Model (Naive kinematic response)
   * Assumes control surface produces an idealized rotation without air interaction or stability delay.
   * @param {number} dt - time step in seconds
   * @param {number} finCommandRad - commanded fin deflection (rad)
   */
  stepIdeal(dt, finCommandRad) {
    // In the naive ideal model, the body turns at a rate directly proportional to fin command:
    // pitch_rate = - K_ideal * fin_command (without aerodynamic moment, without dynamic pressure dependency, without damping)
    const K_ideal = 2.5; // Ideal response sensitivity
    const targetPitchRate = -K_ideal * finCommandRad;
    
    // Ideal instant response with a slight kinematic smoothing
    this.idealState.pitchRate += (targetPitchRate - this.idealState.pitchRate) * Math.min(1.0, 15.0 * dt);
    this.idealState.pitch += this.idealState.pitchRate * dt;

    // Ideal velocity follows body orientation directly without sideslip or AoA lag:
    this.idealState.vx = this.initialSpeed * Math.cos(this.idealState.pitch);
    this.idealState.vz = this.initialSpeed * Math.sin(this.idealState.pitch);

    this.idealState.x += this.idealState.vx * dt;
    this.idealState.z += this.idealState.vz * dt;
    this.idealState.speed = this.initialSpeed;
    this.idealState.gamma = this.idealState.pitch;
    this.idealState.alpha = 0.0; // Ideal model ignores angle of attack!

    return { ...this.idealState };
  }
}
