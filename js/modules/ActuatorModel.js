/**
 * ActuatorModel.js
 * Educational Control Surface Actuator Dynamics Model
 * Simulates 1st-order response lag (tau), maximum slew rate limiting,
 * transport delay, and hard mechanical angle limits.
 */

export class ActuatorModel {
  constructor(config = {}) {
    this.tau = config.tau !== undefined ? config.tau : 0.045; // Time constant (seconds) ~ 45ms
    this.maxRateDeg = config.maxRateDeg !== undefined ? config.maxRateDeg : 180.0; // Max actuator slew rate (deg/s)
    this.maxDeflectionDeg = config.maxDeflectionDeg !== undefined ? config.maxDeflectionDeg : 25.0; // Max deflection limit (deg)
    this.delaySeconds = config.delaySeconds !== undefined ? config.delaySeconds : 0.015; // Transport delay (s)
    
    // Internal states
    this.actualDeflectionRad = 0.0;
    this.commandDeflectionRad = 0.0;
    this.deflectionRateRadS = 0.0;
    
    // Delay queue: array of { time: number, cmd: number }
    this.commandHistory = [];
  }

  updateConfig(params = {}) {
    if (params.tau !== undefined) this.tau = Math.max(0.001, params.tau);
    if (params.maxRateDeg !== undefined) this.maxRateDeg = Math.max(10, params.maxRateDeg);
    if (params.maxDeflectionDeg !== undefined) this.maxDeflectionDeg = params.maxDeflectionDeg;
    if (params.delaySeconds !== undefined) this.delaySeconds = Math.max(0, params.delaySeconds);
  }

  reset(initialDeflectionRad = 0.0) {
    this.actualDeflectionRad = initialDeflectionRad;
    this.commandDeflectionRad = initialDeflectionRad;
    this.deflectionRateRadS = 0.0;
    this.commandHistory = [];
  }

  /**
   * Advance actuator simulation by dt
   * @param {number} rawCommandRad - commanded deflection from controller (rad)
   * @param {number} dt - time step in seconds
   * @param {number} currentTime - current simulation time in seconds
   * @returns {number} actual surface deflection in radians
   */
  update(rawCommandRad, dt, currentTime = 0) {
    // 1. Clamp command to mechanical limits
    const maxRad = (this.maxDeflectionDeg * Math.PI) / 180.0;
    const clampedCmd = Math.max(-maxRad, Math.min(maxRad, rawCommandRad));
    this.commandDeflectionRad = clampedCmd;

    // 2. Manage transport delay buffer
    this.commandHistory.push({ time: currentTime, cmd: clampedCmd });
    // Clean old history older than delay + 0.5s
    while (this.commandHistory.length > 0 && currentTime - this.commandHistory[0].time > this.delaySeconds + 0.5) {
      this.commandHistory.shift();
    }

    // Retrieve delayed command
    let delayedCmd = clampedCmd;
    if (this.delaySeconds > 0) {
      const targetTime = currentTime - this.delaySeconds;
      for (let i = this.commandHistory.length - 1; i >= 0; i--) {
        if (this.commandHistory[i].time <= targetTime) {
          delayedCmd = this.commandHistory[i].cmd;
          break;
        }
      }
    }

    // 3. First-order lag dynamics: d_delta / dt = (cmd - delta) / tau
    let desiredRate = (delayedCmd - this.actualDeflectionRad) / this.tau;

    // 4. Actuator rate limiting
    const maxRateRadS = (this.maxRateDeg * Math.PI) / 180.0;
    this.deflectionRateRadS = Math.max(-maxRateRadS, Math.min(maxRateRadS, desiredRate));

    // 5. Integrate position
    this.actualDeflectionRad += this.deflectionRateRadS * dt;
    this.actualDeflectionRad = Math.max(-maxRad, Math.min(maxRad, this.actualDeflectionRad));

    return this.actualDeflectionRad;
  }

  getState() {
    return {
      actualDeflectionRad: this.actualDeflectionRad,
      actualDeflectionDeg: (this.actualDeflectionRad * 180.0) / Math.PI,
      commandDeflectionRad: this.commandDeflectionRad,
      commandDeflectionDeg: (this.commandDeflectionRad * 180.0) / Math.PI,
      deflectionRateDegS: (this.deflectionRateRadS * 180.0) / Math.PI,
      tau: this.tau,
      maxRateDeg: this.maxRateDeg,
      delaySeconds: this.delaySeconds,
    };
  }
}
