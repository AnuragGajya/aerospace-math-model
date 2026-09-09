/**
 * GuidanceControlModel.js
 * Mathematical Closed-Loop Guidance & Actuator Allocation Engine
 * Implements Proportional Navigation (PN), PID trajectory tracking,
 * 4-fin cruciform allocation matrices, and 1st-order actuator rate limiting.
 */

export class GuidanceControlModel {
  constructor(config = {}) {
    this.N_prime = config.N_prime || 3.8; // Effective Navigation Constant (3.0 - 5.0)
    this.kp_track = config.kp_track || 0.12;
    this.kd_track = config.kd_track || 0.25;
    this.ki_track = config.ki_track || 0.005;

    // Actuator constraints
    this.tau_actuator = config.tau || 0.04; // 40ms time constant
    this.maxFinRateDeg = config.maxRateDeg || 180.0; // deg/s
    this.maxDeflectionDeg = config.maxDeflection || 25.0; // deg

    this.integralZ = 0.0;
    this.integralY = 0.0;
    this.prevEz = 0.0;
    this.prevEy = 0.0;

    // Actual fin angles
    this.actualPitchFinDeg = 0.0;
    this.actualYawFinDeg = 0.0;
  }

  reset() {
    this.integralZ = 0.0;
    this.integralY = 0.0;
    this.prevEz = 0.0;
    this.prevEy = 0.0;
    this.actualPitchFinDeg = 0.0;
    this.actualYawFinDeg = 0.0;
  }

  /**
   * Compute Proportional Navigation (PN) acceleration command toward target
   * @param {Array} pos - [x, y, z] current position
   * @param {Array} vel - [vx, vy, vz] current velocity
   * @param {Array} target - [tx, ty, tz] destination point
   */
  computeProNav(pos, vel, target = [15000, 0, 0]) {
    const rx = target[0] - pos[0];
    const ry = target[1] - pos[1];
    const rz = target[2] - pos[2];
    const R = Math.sqrt(rx * rx + ry * ry + rz * rz);

    const vx = vel[0], vy = vel[1], vz = vel[2];
    const V = Math.sqrt(vx * vx + vy * vy + vz * vz);

    if (R < 1.0) {
      return { ax_cmd: 0, ay_cmd: 0, az_cmd: 0, R_miss: R };
    }

    // Line of Sight (LOS) unit vector lambda = R_vec / R
    const lambda_x = rx / R;
    const lambda_y = ry / R;
    const lambda_z = rz / R;

    // Closing velocity V_c = - (R_vec . V_vec) / R
    const V_c = -(rx * vx + ry * vy + rz * vz) / R;

    // LOS Angular Rate Vector: Omega = (R_vec x V_vec) / R^2
    const cross_x = ry * vz - rz * vy;
    const cross_y = rz * vx - rx * vz;
    const cross_z = rx * vy - ry * vx;

    const omega_x = cross_x / (R * R);
    const omega_y = cross_y / (R * R);
    const omega_z = cross_z / (R * R);

    // PN Law: a_cmd = N' * V_c * (Omega x V_unit)
    // For lateral and vertical planes:
    const az_cmd = -this.N_prime * V_c * omega_y;
    const ay_cmd = this.N_prime * V_c * omega_z;

    return {
      az_cmd, // commanded vertical accel (m/s^2)
      ay_cmd, // commanded lateral accel (m/s^2)
      V_c,
      R_miss: R,
      LOS_rate_pitch: omega_y,
      LOS_rate_yaw: omega_z,
    };
  }

  /**
   * Allocate acceleration commands to physical 4-fin cruciform control surfaces
   * @param {number} az_cmd - pitch acceleration command
   * @param {number} ay_cmd - yaw acceleration command
   * @param {number} dynamicPressure - current dynamic pressure q (Pa)
   * @param {number} dt - time step (s)
   */
  updateActuators(az_cmd, ay_cmd, dynamicPressure, dt) {
    const q_eff = Math.max(200.0, dynamicPressure);
    // Force per degree of fin deflection scales with dynamic pressure q
    const aeroSensitivity = 0.008 * (q_eff / 1000.0); // deg_fin per m/s^2 command

    const cmdPitchDeg = Math.max(-this.maxDeflectionDeg, Math.min(this.maxDeflectionDeg, az_cmd * aeroSensitivity));
    const cmdYawDeg = Math.max(-this.maxDeflectionDeg, Math.min(this.maxDeflectionDeg, ay_cmd * aeroSensitivity));

    // Actuator 1st-order lag + rate limiting
    const maxRate = this.maxFinRateDeg;

    // Pitch Actuator
    const desiredRatePitch = (cmdPitchDeg - this.actualPitchFinDeg) / this.tau_actuator;
    const clampedRatePitch = Math.max(-maxRate, Math.min(maxRate, desiredRatePitch));
    this.actualPitchFinDeg += clampedRatePitch * dt;
    this.actualPitchFinDeg = Math.max(-this.maxDeflectionDeg, Math.min(this.maxDeflectionDeg, this.actualPitchFinDeg));

    // Yaw Actuator
    const desiredRateYaw = (cmdYawDeg - this.actualYawFinDeg) / this.tau_actuator;
    const clampedRateYaw = Math.max(-maxRate, Math.min(maxRate, desiredRateYaw));
    this.actualYawFinDeg += clampedRateYaw * dt;
    this.actualYawFinDeg = Math.max(-this.maxDeflectionDeg, Math.min(this.maxDeflectionDeg, this.actualYawFinDeg));

    // 4 Cruciform Individual Fin Deflections
    // Fin 1 (Top), Fin 2 (Right), Fin 3 (Bottom), Fin 4 (Left)
    const fin1 = this.actualPitchFinDeg;
    const fin2 = this.actualYawFinDeg;
    const fin3 = -this.actualPitchFinDeg;
    const fin4 = -this.actualYawFinDeg;

    return {
      ctrlPitchDeg: this.actualPitchFinDeg,
      ctrlYawDeg: this.actualYawFinDeg,
      finDeflections: [fin1, fin2, fin3, fin4],
      cmdPitchDeg,
      cmdYawDeg,
    };
  }
}
