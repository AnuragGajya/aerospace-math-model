/**
 * SensorModel.js
 * Educational Sensor & State Estimation Model
 * Simulates real-world sensor imperfections: GNSS position noise, update frequency,
 * IMU accelerometer & gyroscope noise, sensor biases, and basic state filtering.
 */

export class SensorModel {
  constructor(config = {}) {
    // Master switch
    this.noiseEnabled = config.noiseEnabled !== undefined ? config.noiseEnabled : true;
    
    // Position Sensor (GNSS / Optical tracker)
    this.posNoiseStd = config.posNoiseStd !== undefined ? config.posNoiseStd : 0.8; // meters standard deviation
    this.posUpdateHz = config.posUpdateHz !== undefined ? config.posUpdateHz : 10.0; // 10 Hz
    this.posDelay = config.posDelay !== undefined ? config.posDelay : 0.03; // 30ms latency
    
    // IMU (Inertial Measurement Unit)
    this.gyroNoiseStdDeg = config.gyroNoiseStdDeg !== undefined ? config.gyroNoiseStdDeg : 0.6; // deg/s std dev
    this.gyroBiasDeg = config.gyroBiasDeg !== undefined ? config.gyroBiasDeg : 0.15; // deg/s constant bias
    this.accelNoiseStd = config.accelNoiseStd !== undefined ? config.accelNoiseStd : 0.35; // m/s^2 std dev
    this.accelBias = config.accelBias !== undefined ? config.accelBias : 0.08; // m/s^2 constant bias
    this.imuUpdateHz = config.imuUpdateHz !== undefined ? config.imuUpdateHz : 100.0; // 100 Hz
    
    // Sensor sample timers & latched values
    this.lastPosSampleTime = -1.0;
    this.lastImuSampleTime = -1.0;
    this.latchedPos = { x: 0, z: 0 };
    this.latchedPitchRate = 0.0;
    this.latchedAccel = { ax: 0, az: 0 };
    
    // State Estimator (Complementary Filter / Kalman-style tracking)
    this.estimatedState = {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      pitch: 0,
      pitchRate: 0,
      alpha: 0,
    };
  }

  updateConfig(params = {}) {
    if (params.noiseEnabled !== undefined) this.noiseEnabled = params.noiseEnabled;
    if (params.posNoiseStd !== undefined) this.posNoiseStd = Math.max(0, params.posNoiseStd);
    if (params.posUpdateHz !== undefined) this.posUpdateHz = Math.max(1, params.posUpdateHz);
    if (params.gyroNoiseStdDeg !== undefined) this.gyroNoiseStdDeg = Math.max(0, params.gyroNoiseStdDeg);
    if (params.gyroBiasDeg !== undefined) this.gyroBiasDeg = params.gyroBiasDeg;
    if (params.accelNoiseStd !== undefined) this.accelNoiseStd = Math.max(0, params.accelNoiseStd);
    if (params.accelBias !== undefined) this.accelBias = params.accelBias;
  }

  reset() {
    this.lastPosSampleTime = -1.0;
    this.lastImuSampleTime = -1.0;
    this.latchedPos = { x: 0, z: 0 };
    this.latchedPitchRate = 0.0;
    this.latchedAccel = { ax: 0, az: 0 };
    this.estimatedState = { x: 0, z: 0, vx: 0, vz: 0, pitch: 0, pitchRate: 0, alpha: 0 };
  }

  /**
   * Box-Muller Gaussian random number generator
   */
  gaussianRandom(mean = 0, std = 1) {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }

  /**
   * Sample sensors and run state estimation
   * @param {Object} trueState - { x, z, vx, vz, pitch, pitchRate, ax, az, alpha }
   * @param {number} time - current simulation time in seconds
   * @param {number} dt - time step
   * @returns {Object} { measured, estimated }
   */
  update(trueState, time, dt) {
    // 1. Position Sensor sampling (at posUpdateHz)
    const posPeriod = 1.0 / this.posUpdateHz;
    if (this.lastPosSampleTime < 0 || time - this.lastPosSampleTime >= posPeriod) {
      this.lastPosSampleTime = time;
      if (this.noiseEnabled) {
        this.latchedPos.x = trueState.x + this.gaussianRandom(0, this.posNoiseStd);
        this.latchedPos.z = trueState.z + this.gaussianRandom(0, this.posNoiseStd);
      } else {
        this.latchedPos.x = trueState.x;
        this.latchedPos.z = trueState.z;
      }
    }

    // 2. IMU Sampling (at imuUpdateHz)
    const imuPeriod = 1.0 / this.imuUpdateHz;
    if (this.lastImuSampleTime < 0 || time - this.lastImuSampleTime >= imuPeriod) {
      this.lastImuSampleTime = time;
      if (this.noiseEnabled) {
        const gyroStdRad = (this.gyroNoiseStdDeg * Math.PI) / 180.0;
        const gyroBiasRad = (this.gyroBiasDeg * Math.PI) / 180.0;
        this.latchedPitchRate = trueState.pitchRate + gyroBiasRad + this.gaussianRandom(0, gyroStdRad);
        this.latchedAccel.ax = (trueState.ax || 0) + this.accelBias + this.gaussianRandom(0, this.accelNoiseStd);
        this.latchedAccel.az = (trueState.az || 0) + this.accelBias + this.gaussianRandom(0, this.accelNoiseStd);
      } else {
        this.latchedPitchRate = trueState.pitchRate;
        this.latchedAccel.ax = trueState.ax || 0;
        this.latchedAccel.az = trueState.az || 0;
      }
    }

    // 3. State Estimator Filter (Alpha-Beta filter for position + Complementary filter for attitude)
    if (this.noiseEnabled) {
      const alphaPos = 0.35; // filter gain
      this.estimatedState.x += (this.latchedPos.x - this.estimatedState.x) * alphaPos;
      this.estimatedState.z += (this.latchedPos.z - this.estimatedState.z) * alphaPos;
      
      this.estimatedState.pitchRate = this.latchedPitchRate;
      this.estimatedState.pitch += this.latchedPitchRate * dt;
      // Gentle attitude drift correction toward kinematic velocity vector pitch
      const kinPitch = Math.atan2(trueState.vz, Math.max(0.1, trueState.vx));
      this.estimatedState.pitch = 0.98 * this.estimatedState.pitch + 0.02 * (kinPitch + (trueState.alpha || 0));
      
      this.estimatedState.vx = trueState.vx + this.gaussianRandom(0, this.posNoiseStd * 0.2);
      this.estimatedState.vz = trueState.vz + this.gaussianRandom(0, this.posNoiseStd * 0.2);
      
      // Estimated AoA
      const estimatedFlowAngle = Math.atan2(this.estimatedState.vz, Math.max(0.1, this.estimatedState.vx));
      this.estimatedState.alpha = this.estimatedState.pitch - estimatedFlowAngle;
    } else {
      this.estimatedState = { ...trueState };
    }

    return {
      measured: {
        x: this.latchedPos.x,
        z: this.latchedPos.z,
        pitchRate: this.latchedPitchRate,
        pitchRateDeg: (this.latchedPitchRate * 180.0) / Math.PI,
        ax: this.latchedAccel.ax,
        az: this.latchedAccel.az,
      },
      estimated: this.estimatedState,
    };
  }
}
