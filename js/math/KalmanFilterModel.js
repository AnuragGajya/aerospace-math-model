/**
 * KalmanFilterModel.js
 * Extended Kalman Filter (EKF) & Sensor Fusion Mathematical Engine
 * Implements linear/nonlinear state prediction, covariance propagation,
 * Kalman Gain computation, and innovation residual metrics.
 */

export class KalmanFilterModel {
  constructor(config = {}) {
    // 6-State Estimator: [x, y, z, vx, vy, vz]
    this.stateDim = 6;
    this.measDim = 3;

    // Default noise characteristics
    this.sigma_gnss = config.sigma_gnss || 0.85; // m
    this.sigma_accel = config.sigma_accel || 0.35; // m/s^2

    this.reset();
  }

  reset(initState = [0, 0, 23.0, 884.0, 0.0, 650.0]) {
    this.x_hat = [...initState]; // Estimated state [x, y, z, vx, vy, vz]
    
    // Estimation error covariance P (6x6 diagonal initialization)
    this.P = [
      [10.0, 0, 0, 0, 0, 0],
      [0, 10.0, 0, 0, 0, 0],
      [0, 0, 10.0, 0, 0, 0],
      [0, 0, 0, 5.0, 0, 0],
      [0, 0, 0, 0, 5.0, 0],
      [0, 0, 0, 0, 0, 5.0],
    ];

    this.innovation = [0, 0, 0];
    this.kalmanGainNorm = 0.0;
    this.covarianceTrace = 45.0;
  }

  /**
   * EKF Predict Step: Advance state and error covariance by dt
   * @param {number} dt - time step (s)
   * @param {Array} measuredAccel - [ax, ay, az] from IMU (optional)
   */
  predict(dt, measuredAccel = [0, 0, -9.81]) {
    // 1. State Prediction: x_{k|k-1} = F * x_{k-1} + B * u
    const [x, y, z, vx, vy, vz] = this.x_hat;
    const [ax, ay, az] = measuredAccel;

    this.x_hat[0] = x + vx * dt + 0.5 * ax * dt * dt;
    this.x_hat[1] = y + vy * dt + 0.5 * ay * dt * dt;
    this.x_hat[2] = z + vz * dt + 0.5 * az * dt * dt;
    this.x_hat[3] = vx + ax * dt;
    this.x_hat[4] = vy + ay * dt;
    this.x_hat[5] = vz + az * dt;

    // 2. Process Noise Covariance Q (Discrete White Noise Model)
    const q_val = Math.pow(this.sigma_accel, 2);
    const dt2 = dt * dt;
    const dt3 = dt2 * dt / 2.0;
    const dt4 = dt2 * dt2 / 4.0;

    // 3. Covariance Prediction: P_{k|k-1} = F * P * F^T + Q
    // For each axis i (0, 1, 2 for x, y, z):
    for (let i = 0; i < 3; i++) {
      const p_pos = this.P[i][i];
      const p_vel = this.P[i + 3][i + 3];
      const p_pv = this.P[i][i + 3];

      this.P[i][i] = p_pos + 2 * dt * p_pv + dt2 * p_vel + dt4 * q_val;
      this.P[i][i + 3] = p_pv + dt * p_vel + dt3 * q_val;
      this.P[i + 3][i] = this.P[i][i + 3];
      this.P[i + 3][i + 3] = p_vel + dt2 * q_val;
    }

    this.computeDiagnostics();
    return [...this.x_hat];
  }

  /**
   * EKF Update / Correction Step with GNSS measurement z_k = [x_meas, y_meas, z_meas]
   * @param {Array} z_meas - [x, y, z] GNSS observation
   */
  update(z_meas) {
    // Measurement matrix H = [I_3 | 0_3]
    const R_var = Math.pow(this.sigma_gnss, 2);

    let k_sum = 0;
    // Decoupled axis-by-axis scalar update for numerical precision
    for (let i = 0; i < 3; i++) {
      const z_k = z_meas[i];
      const z_pred = this.x_hat[i];
      
      // Innovation residual y = z - H*x
      const y = z_k - z_pred;
      this.innovation[i] = y;

      // Innovation covariance S = H*P*H^T + R
      const S = this.P[i][i] + R_var;

      // Kalman Gain K = P * H^T / S
      const K_pos = this.P[i][i] / S;
      const K_vel = this.P[i + 3][i] / S;

      k_sum += K_pos * K_pos + K_vel * K_vel;

      // State update
      this.x_hat[i] += K_pos * y;
      this.x_hat[i + 3] += K_vel * y;

      // Covariance update: P = (I - K*H) * P
      this.P[i][i] = (1.0 - K_pos) * this.P[i][i];
      this.P[i][i + 3] = (1.0 - K_pos) * this.P[i][i + 3];
      this.P[i + 3][i] = this.P[i][i + 3];
      this.P[i + 3][i + 3] = this.P[i + 3][i + 3] - K_vel * this.P[i][i + 3];
    }

    this.kalmanGainNorm = Math.sqrt(k_sum);
    this.computeDiagnostics();

    return {
      estimatedState: [...this.x_hat],
      innovation: [...this.innovation],
      kalmanGainNorm: this.kalmanGainNorm,
      covarianceTrace: this.covarianceTrace,
    };
  }

  computeDiagnostics() {
    let trace = 0;
    for (let i = 0; i < 6; i++) {
      trace += this.P[i][i];
    }
    this.covarianceTrace = trace;
  }
}
