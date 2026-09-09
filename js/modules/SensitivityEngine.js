/**
 * SensitivityEngine.js
 * Parameter Sensitivity & Batch Simulation Engine
 * Sweeps selected environmental, aerodynamic, control, or sensor parameters across a range
 * and executes fast-forward headless simulations to generate comparative engineering curves.
 */

import { AtmosphereModel } from './AtmosphereModel.js';
import { AerodynamicModel } from './AerodynamicModel.js';
import { VehicleDynamics } from './VehicleDynamics.js';
import { ActuatorModel } from './ActuatorModel.js';
import { SensorModel } from './SensorModel.js';
import { Controller } from './Controller.js';

export class SensitivityEngine {
  constructor() {
    this.simDuration = 4.0; // seconds of simulation per sweep point
    this.dt = 0.01; // 10ms step for fast batch simulation
  }

  /**
   * Run a single headless simulation run with given parameter overrides
   */
  runSingle(paramKey, paramValue, baseSettings = {}) {
    const atmo = new AtmosphereModel();
    const aero = new AerodynamicModel();
    const veh = new VehicleDynamics({ initialSpeed: baseSettings.speed || 60.0 });
    const act = new ActuatorModel();
    const sens = new SensorModel();
    const ctrl = new Controller({ pathType: 'step', stepAltitude: 15.0, stepDistance: 40.0 });

    // Apply base settings
    if (baseSettings.mass) aero.updateConfig({ mass: baseSettings.mass });
    if (baseSettings.xCG) aero.updateConfig({ xCG: baseSettings.xCG });

    // Apply parameter under test
    switch (paramKey) {
      case 'density':
        atmo.setEnvironment({ customDensity: paramValue });
        break;
      case 'speed':
        veh.initialSpeed = paramValue;
        veh.reset(paramValue);
        break;
      case 'finDeflection':
        ctrl.manualControl = true;
        ctrl.manualDeflectionDeg = paramValue;
        break;
      case 'windSpeed':
        atmo.setEnvironment({ windSpeed: paramValue, windDirection: 90 }); // Pure crosswind
        break;
      case 'xCG':
        aero.updateConfig({ xCG: paramValue });
        break;
      case 'sensorNoise':
        sens.updateConfig({ noiseEnabled: true, posNoiseStd: paramValue, gyroNoiseStdDeg: paramValue * 1.5 });
        break;
      case 'actuatorTau':
        act.updateConfig({ tau: paramValue });
        break;
    }

    const steps = Math.floor(this.simDuration / this.dt);
    let time = 0;
    const history = [];

    for (let i = 0; i < steps; i++) {
      const wind = atmo.getWindVector(time);
      const state = veh.state;
      const flow = atmo.getFlightQuantities(state.speed, aero.refLength, state.z);
      const sensOut = sens.update(state, time, this.dt);
      const cmd = ctrl.computeCommand(sensOut.estimated, this.dt);
      const finDelta = act.update(cmd.finCommandRad, this.dt, time);
      const aeroOut = aero.calculateAerodynamics(flow, state.alpha, finDelta, state.pitchRate, state.speed);
      const newState = veh.stepAerodynamic(this.dt, aeroOut, wind, { mass: aero.mass, Iyy: aero.Iyy });

      history.push({
        t: time,
        x: newState.x,
        z: newState.z,
        z_ref: cmd.z_ref,
        trackError: cmd.trackError,
        alphaDeg: aeroOut.alphaDeg,
        lift: aeroOut.liftForce,
        drag: aeroOut.dragForce,
        moment: aeroOut.pitchingMoment,
        dynamicPressure: aeroOut.dynamicPressure,
        SSM: aeroOut.staticStabilityMargin,
      });

      time += this.dt;
    }

    // Compute key summary metrics
    const errors = history.map(h => Math.abs(h.trackError));
    const maxError = Math.max(...errors);
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const finalZ = history[history.length - 1].z;
    const peakLift = Math.max(...history.map(h => Math.abs(h.lift)));
    const peakMoment = Math.max(...history.map(h => Math.abs(h.moment)));
    const finalAlpha = history[history.length - 1].alphaDeg;
    const avgSSM = history[history.length - 1].SSM;

    return {
      paramValue,
      history,
      metrics: {
        maxError,
        meanError,
        finalZ,
        peakLift,
        peakMoment,
        finalAlpha,
        avgSSM,
      },
    };
  }

  /**
   * Run full parameter sweep
   * @param {string} paramKey
   * @param {number} minVal
   * @param {number} maxVal
   * @param {number} numPoints
   * @param {Object} baseSettings
   * @returns {Object} sweep results with metadata and time-series
   */
  runSweep(paramKey, minVal, maxVal, numPoints = 6, baseSettings = {}) {
    const results = [];
    const stepSize = (maxVal - minVal) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const val = minVal + i * stepSize;
      const runRes = this.runSingle(paramKey, val, baseSettings);
      results.push(runRes);
    }

    return {
      paramKey,
      minVal,
      maxVal,
      runs: results,
    };
  }
}
