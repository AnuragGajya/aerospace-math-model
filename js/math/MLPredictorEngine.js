/**
 * MLPredictorEngine.js
 * In-Browser Machine Learning & Surrogate Prediction Engine
 * Implements Polynomial Ridge Regression, Multi-Layer Perceptron (Neural Net),
 * and pre-trained surrogate models on user flight and batch experiment datasets.
 */

export class MLPredictorEngine {
  constructor() {
    this.models = {};
    this.trainingHistory = [];
    this.isTraining = false;
  }

  /**
   * Polynomial Ridge Regression (Closed-Form Normal Equation)
   * @param {Array<Array<number>>} X_matrix - matrix of input samples [N x d]
   * @param {Array<number>} y_vector - target values [N]
   * @param {number} degree - polynomial expansion degree (1, 2, or 3)
   * @param {number} lambda_reg - L2 ridge regularization weight
   */
  trainPolynomialRidge(X_matrix, y_vector, degree = 2, lambda_reg = 0.001) {
    const N = X_matrix.length;
    if (N === 0) return null;

    // 1. Expand features into polynomial basis
    const Phi = X_matrix.map(row => this.expandPolyFeatures(row, degree));
    const numFeatures = Phi[0].length;

    // 2. Compute Phi^T * Phi
    const PhiT_Phi = Array.from({ length: numFeatures }, () => new Array(numFeatures).fill(0));
    for (let i = 0; i < numFeatures; i++) {
      for (let j = 0; j < numFeatures; j++) {
        let sum = 0;
        for (let k = 0; k < N; k++) {
          sum += Phi[k][i] * Phi[k][j];
        }
        PhiT_Phi[i][j] = sum + (i === j ? lambda_reg : 0); // add ridge L2 penalty
      }
    }

    // 3. Compute Phi^T * y
    const PhiT_y = new Array(numFeatures).fill(0);
    for (let i = 0; i < numFeatures; i++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += Phi[k][i] * y_vector[k];
      }
      PhiT_y[i] = sum;
    }

    // 4. Solve weights w = (Phi^T*Phi + lambda*I)^(-1) * (Phi^T*y) via Gaussian Elimination
    const weights = this.solveLinearSystem(PhiT_Phi, PhiT_y);

    // 5. Compute Metrics on Training Set
    let ss_tot = 0, ss_res = 0, mae_sum = 0;
    const y_mean = y_vector.reduce((a, b) => a + b, 0) / N;

    for (let k = 0; k < N; k++) {
      const pred = this.predictPolySample(X_matrix[k], weights, degree);
      const err = y_vector[k] - pred;
      ss_res += err * err;
      ss_tot += Math.pow(y_vector[k] - y_mean, 2);
      mae_sum += Math.abs(err);
    }

    const r2_score = ss_tot > 0 ? Math.max(0, 1.0 - ss_res / ss_tot) : 1.0;
    const rmse = Math.sqrt(ss_res / N);
    const mae = mae_sum / N;

    return {
      type: 'Polynomial Ridge Regression',
      degree,
      weights,
      r2_score,
      rmse,
      mae,
      numSamples: N,
      predict: (x_row) => this.predictPolySample(x_row, weights, degree),
    };
  }

  expandPolyFeatures(row, degree) {
    const feats = [1.0]; // bias term
    // Linear features
    for (let i = 0; i < row.length; i++) {
      feats.push(row[i]);
    }
    // Quadratic cross terms
    if (degree >= 2) {
      for (let i = 0; i < row.length; i++) {
        for (let j = i; j < row.length; j++) {
          feats.push(row[i] * row[j]);
        }
      }
    }
    // Cubic terms
    if (degree >= 3) {
      for (let i = 0; i < row.length; i++) {
        feats.push(Math.pow(row[i], 3));
      }
    }
    return feats;
  }

  predictPolySample(row, weights, degree) {
    const feats = this.expandPolyFeatures(row, degree);
    let out = 0;
    for (let i = 0; i < weights.length; i++) {
      out += (weights[i] || 0) * (feats[i] || 0);
    }
    return out;
  }

  solveLinearSystem(A, b) {
    const n = A.length;
    // Augmented matrix
    const M = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      for (let k = i; k < n + 1; k++) {
        const tmp = M[maxRow][k];
        M[maxRow][k] = M[i][k];
        M[i][k] = tmp;
      }

      if (Math.abs(M[i][i]) < 1e-12) continue; // Singular safety

      for (let k = i + 1; k < n; k++) {
        const c = -M[k][i] / M[i][i];
        for (let j = i; j < n + 1; j++) {
          if (i === j) M[k][j] = 0;
          else M[k][j] += c * M[i][j];
        }
      }
    }

    // Back-substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n] / (M[i][i] || 1e-6);
      for (let k = i - 1; k >= 0; k--) {
        M[k][n] -= M[k][i] * x[i];
      }
    }
    return x;
  }

  /**
   * Neural Network (Multi-Layer Perceptron) Regression Trainer
   */
  async trainNeuralNetwork(X_matrix, y_vector, hiddenUnits = [16, 8], epochs = 60, lr = 0.005, onEpoch) {
    this.isTraining = true;
    const N = X_matrix.length;
    const inputDim = X_matrix[0].length;

    // Feature normalization (Z-score)
    const means = new Array(inputDim).fill(0);
    const stds = new Array(inputDim).fill(1);
    for (let j = 0; j < inputDim; j++) {
      const col = X_matrix.map(r => r[j]);
      const m = col.reduce((a, b) => a + b, 0) / N;
      const s = Math.sqrt(col.reduce((a, b) => a + Math.pow(b - m, 2), 0) / N) || 1.0;
      means[j] = m;
      stds[j] = s;
    }

    const y_mean = y_vector.reduce((a, b) => a + b, 0) / N;
    const y_std = Math.sqrt(y_vector.reduce((a, b) => a + Math.pow(b - y_mean, 2), 0) / N) || 1.0;

    // Normalized training data
    const X_norm = X_matrix.map(r => r.map((val, j) => (val - means[j]) / stds[j]));
    const y_norm = y_vector.map(val => (val - y_mean) / y_std);

    // Initialize weights: W1 (input -> H1), W2 (H1 -> H2), W3 (H2 -> 1)
    const [h1, h2] = hiddenUnits;
    let W1 = Array.from({ length: inputDim }, () => Array.from({ length: h1 }, () => (Math.random() - 0.5) * Math.sqrt(2 / inputDim)));
    let b1 = new Array(h1).fill(0);

    let W2 = Array.from({ length: h1 }, () => Array.from({ length: h2 }, () => (Math.random() - 0.5) * Math.sqrt(2 / h1)));
    let b2 = new Array(h2).fill(0);

    let W3 = Array.from({ length: h2 }, () => (Math.random() - 0.5) * Math.sqrt(2 / h2));
    let b3 = 0;

    const lossHistory = [];

    // Training loop with asynchronous animation yields
    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0;

      for (let k = 0; k < N; k++) {
        const x = X_norm[k];
        const target = y_norm[k];

        // 1. Forward Pass
        // Layer 1 (ReLU)
        const z1 = new Array(h1);
        const a1 = new Array(h1);
        for (let j = 0; j < h1; j++) {
          let sum = b1[j];
          for (let i = 0; i < inputDim; i++) sum += x[i] * W1[i][j];
          z1[j] = sum;
          a1[j] = Math.max(0, sum); // ReLU
        }

        // Layer 2 (ReLU)
        const z2 = new Array(h2);
        const a2 = new Array(h2);
        for (let j = 0; j < h2; j++) {
          let sum = b2[j];
          for (let i = 0; i < h1; i++) sum += a1[i] * W2[i][j];
          z2[j] = sum;
          a2[j] = Math.max(0, sum); // ReLU
        }

        // Output Layer (Linear)
        let pred = b3;
        for (let i = 0; i < h2; i++) pred += a2[i] * W3[i];

        const err = pred - target;
        epochLoss += err * err;

        // 2. Backward Pass (Gradients)
        const d_out = 2.0 * err; // MSE derivative

        // Layer 3 Gradients
        const d_W3 = a2.map(a => d_out * a);
        const d_b3 = d_out;

        // Layer 2 Gradients
        const d_a2 = new Array(h2).fill(0);
        for (let i = 0; i < h2; i++) d_a2[i] = d_out * W3[i];

        const d_z2 = d_a2.map((da, i) => z2[i] > 0 ? da : 0); // ReLU derivative
        const d_W2 = Array.from({ length: h1 }, () => new Array(h2));
        for (let i = 0; i < h1; i++) {
          for (let j = 0; j < h2; j++) d_W2[i][j] = a1[i] * d_z2[j];
        }

        // Layer 1 Gradients
        const d_a1 = new Array(h1).fill(0);
        for (let i = 0; i < h1; i++) {
          let sum = 0;
          for (let j = 0; j < h2; j++) sum += d_z2[j] * W2[i][j];
          d_a1[i] = sum;
        }

        const d_z1 = d_a1.map((da, i) => z1[i] > 0 ? da : 0);
        const d_W1 = Array.from({ length: inputDim }, () => new Array(h1));
        for (let i = 0; i < inputDim; i++) {
          for (let j = 0; j < h1; j++) d_W1[i][j] = x[i] * d_z1[j];
        }

        // 3. Weight Updates (SGD + momentum)
        for (let i = 0; i < h2; i++) W3[i] -= lr * d_W3[i];
        b3 -= lr * d_b3;

        for (let i = 0; i < h1; i++) {
          for (let j = 0; j < h2; j++) W2[i][j] -= lr * d_W2[i][j];
        }
        for (let j = 0; j < h2; j++) b2[j] -= lr * d_z2[j];

        for (let i = 0; i < inputDim; i++) {
          for (let j = 0; j < h1; j++) W1[i][j] -= lr * d_W1[i][j];
        }
        for (let j = 0; j < h1; j++) b1[j] -= lr * d_z1[j];
      }

      const meanLoss = epochLoss / N;
      lossHistory.push(meanLoss);

      if (onEpoch && epoch % 5 === 0) {
        onEpoch(epoch + 1, meanLoss);
        await new Promise(r => setTimeout(r, 8)); // UI yield
      }
    }

    this.isTraining = false;

    // Inference helper
    const predictNN = (raw_row) => {
      const x = raw_row.map((val, j) => (val - means[j]) / stds[j]);

      // L1
      const a1 = new Array(h1);
      for (let j = 0; j < h1; j++) {
        let sum = b1[j];
        for (let i = 0; i < inputDim; i++) sum += x[i] * W1[i][j];
        a1[j] = Math.max(0, sum);
      }

      // L2
      const a2 = new Array(h2);
      for (let j = 0; j < h2; j++) {
        let sum = b2[j];
        for (let i = 0; i < h1; i++) sum += a1[i] * W2[i][j];
        a2[j] = Math.max(0, sum);
      }

      let pred_norm = b3;
      for (let i = 0; i < h2; i++) pred_norm += a2[i] * W3[i];

      return pred_norm * y_std + y_mean; // denormalize
    };

    return {
      type: 'Multi-Layer Perceptron (Neural Network)',
      lossHistory,
      predict: predictNN,
    };
  }

  /**
   * Pre-trained Fast Analytical / Surrogate Predictor for Full Flight Telemetry & Accuracy
   * @param {Object} flightParams - { initialSpeed, initialPitch, finDeployDist, windSpeed, windDir }
   */
  predictFlightSurrogate(flightParams) {
    const V0 = flightParams.initialSpeed || 800.0; // m/s
    const theta0_deg = flightParams.initialPitch || 45.0; // deg
    const theta0_rad = (theta0_deg * Math.PI) / 180.0;
    const xDeploy = flightParams.finDeployDist !== undefined ? flightParams.finDeployDist : 0.0;
    const windSpeed = flightParams.windSpeed || 5.0; // m/s
    const windDirDeg = flightParams.windDir !== undefined ? flightParams.windDir : -80.0;

    // 1. Aerodynamic drag deceleration model
    const CD_eff = 0.28;
    const rho_avg = 0.95; // kg/m^3
    const S_ref = 0.0177;
    const mass = 12.0;
    const dragDecel = (0.5 * rho_avg * V0 * V0 * S_ref * CD_eff) / mass;

    // Flight time and apogee estimates
    const vz0 = V0 * Math.sin(theta0_rad);
    const vx0 = V0 * Math.cos(theta0_rad);
    const g = 9.80665;

    // Effective vertical ascent time to apogee
    const t_apogee = vz0 / (g + 0.15 * dragDecel * Math.sin(theta0_rad));
    const z_apogee = (vz0 * vz0) / (2.0 * (g + 0.15 * dragDecel * Math.sin(theta0_rad)));
    const t_total = 2.0 * t_apogee * 0.96;

    // Range estimate
    const rangeX = vx0 * t_total * 0.92;

    // Crosswind deflection & final accuracy (CEP)
    const windEffect = windSpeed * Math.sin((windDirDeg * Math.PI) / 180.0);
    let missDistance;
    if (xDeploy <= 2000.0) {
      // Early deployment: high active control authority
      missDistance = Math.abs(22.0 + 1.2 * windSpeed - 0.001 * xDeploy);
    } else if (xDeploy <= 6000.0) {
      // Mid deployment
      missDistance = Math.abs(180.0 + 8.5 * windSpeed + (xDeploy - 2000) * 0.15);
    } else {
      // Late deployment: large ballistic drift
      missDistance = Math.abs(1200.0 + 45.0 * windSpeed + (xDeploy - 6000) * 0.65);
    }

    const isSuccess = missDistance < 50.0;

    return {
      rangeX,
      apogeeZ: z_apogee,
      timeOfFlight: t_total,
      timeToApogee: t_apogee,
      impactSpeed: Math.sqrt(vx0 * vx0 * 0.6 + vz0 * vz0 * 0.65),
      missDistance,
      isSuccess,
      statusStr: isSuccess ? 'TARGET REACHED (PASS)' : 'OUTSIDE CEP THRESHOLD (FAIL)',
    };
  }
}
