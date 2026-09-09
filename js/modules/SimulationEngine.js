/**
 * SimulationEngine.js
 * Central Numerical Simulation Orchestrator
 * Integrates Atmosphere, Aerodynamics, Actuator, Sensors, Controller, and Flight Dynamics.
 */

import { AtmosphereModel } from './AtmosphereModel.js';
import { AerodynamicModel } from './AerodynamicModel.js';
import { VehicleDynamics } from './VehicleDynamics.js';
import { ActuatorModel } from './ActuatorModel.js';
import { SensorModel } from './SensorModel.js';
import { Controller } from './Controller.js';
import { DataLogger } from './DataLogger.js';

export class SimulationEngine {
  constructor() {
    // Instantiation of sub-models
    this.atmosphere = new AtmosphereModel();
    this.aerodynamics = new AerodynamicModel();
    this.vehicle = new VehicleDynamics();
    this.actuator = new ActuatorModel();
    this.sensors = new SensorModel();
    this.controller = new Controller();
    this.logger = new DataLogger(1000);

    // Simulation states
    this.simTime = 0.0;
    this.dt = 0.005; // 5ms fixed physics integration sub-step (200 Hz)
    this.isRunning = false;
    this.playbackSpeed = 1.0; // 0.25x, 0.5x, 1.0x, 2.0x
    
    // Simulation Mode: 'fluid' (Aerodynamic), 'ideal' (Ideal Control), 'dual' (Simultaneous Comparison)
    this.simMode = 'dual'; // Default to dual so user immediately sees both!
    
    // Disturbance injection
    this.activeDisturbance = null; // { startTime, duration, windGustZ, finKick }
    
    // Listeners for UI / visualizer updates
    this.onUpdateCallbacks = [];
  }

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  setSimMode(mode) {
    this.simMode = mode; // 'fluid' | 'ideal' | 'dual'
  }

  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
  }

  start() {
    this.isRunning = true;
  }

  pause() {
    this.isRunning = false;
  }

  toggle() {
    this.isRunning = !this.isRunning;
    return this.isRunning;
  }

  reset() {
    this.simTime = 0.0;
    this.vehicle.reset();
    this.actuator.reset();
    this.sensors.reset();
    this.controller.reset();
    this.logger.clear();
    this.activeDisturbance = null;
    this.notifyUpdate();
  }

  /**
   * Inject a temporary physical disturbance (e.g. sudden crosswind gust or attitude kick)
   */
  injectDisturbance(windGustZ = 12.0, duration = 1.5) {
    this.activeDisturbance = {
      startTime: this.simTime,
      duration: duration,
      windGustZ: windGustZ,
    };
  }

  /**
   * Run one fixed physics integration step
   */
  physicsStep() {
    // 1. Atmosphere & Wind
    let windVec = this.atmosphere.getWindVector(this.simTime);
    if (this.activeDisturbance && (this.simTime - this.activeDisturbance.startTime <= this.activeDisturbance.duration)) {
      windVec.vz += this.activeDisturbance.windGustZ;
    } else if (this.activeDisturbance && (this.simTime - this.activeDisturbance.startTime > this.activeDisturbance.duration)) {
      this.activeDisturbance = null;
    }

    const trueState = this.vehicle.state;
    const flowProps = this.atmosphere.getFlightQuantities(trueState.speed, this.aerodynamics.refLength, trueState.z);

    // 2. Sensor Sampling & State Estimation
    const sensorOutput = this.sensors.update(trueState, this.simTime, this.dt);
    const estimatedState = sensorOutput.estimated;

    // 3. Feedback Flight Controller (evaluates path error and desired pitch)
    const ctrlCommand = this.controller.computeCommand(estimatedState, this.dt);

    // 4. Control Surface Actuator Dynamics (lag + rate limiting)
    const actualFinDeflection = this.actuator.update(ctrlCommand.finCommandRad, this.dt, this.simTime);

    // 5. Aerodynamic Force and Moment Evaluation
    const aeroOutput = this.aerodynamics.calculateAerodynamics(
      flowProps,
      trueState.alpha,
      actualFinDeflection,
      trueState.pitchRate,
      trueState.speed
    );

    // 6. Step Vehicle Dynamics (Fluid Aerodynamic Model)
    const newVehicleState = this.vehicle.stepAerodynamic(
      this.dt,
      aeroOutput,
      windVec,
      { mass: this.aerodynamics.mass, Iyy: this.aerodynamics.Iyy }
    );

    // 7. Parallel Step Ideal Control Model (for simultaneous comparison overlay)
    const idealVehicleState = this.vehicle.stepIdeal(this.dt, ctrlCommand.finCommandRad);

    // 8. Log comprehensive telemetry
    this.logger.log({
      t: this.simTime,
      x: newVehicleState.x,
      z: newVehicleState.z,
      z_ref: ctrlCommand.z_ref,
      z_ideal: idealVehicleState.z,
      x_ideal: idealVehicleState.x,
      speed: newVehicleState.speed,
      pitch: newVehicleState.pitch,
      pitchCmdDeg: ctrlCommand.desiredPitchDeg,
      alphaDeg: aeroOutput.alphaDeg,
      finDeflectionDeg: aeroOutput.finDeflectionDeg,
      finCommandDeg: ctrlCommand.finCommandDeg,
      lift: aeroOutput.liftForce,
      drag: aeroOutput.dragForce,
      moment: aeroOutput.pitchingMoment,
      trackError: ctrlCommand.trackError,
      dynamicPressure: aeroOutput.dynamicPressure,
      CL: aeroOutput.CL,
      CD: aeroOutput.CD,
      CM: aeroOutput.CM,
      SSM: aeroOutput.staticStabilityMargin,
      f_sep: aeroOutput.flowSeparationFactor,
      isStalled: aeroOutput.isStalled,
    });

    this.simTime += this.dt;
  }

  /**
   * Advance simulation time based on wall-clock frame delta
   * Uses sub-stepping for numerical precision
   */
  update(frameDeltaSeconds) {
    if (!this.isRunning) return;

    const scaledDelta = Math.min(0.1, frameDeltaSeconds) * this.playbackSpeed;
    let steps = Math.floor(scaledDelta / this.dt);
    if (steps < 1) steps = 1;
    if (steps > 20) steps = 20; // safety clamp

    for (let i = 0; i < steps; i++) {
      this.physicsStep();
    }

    this.notifyUpdate();
  }

  notifyUpdate() {
    const latest = this.logger.getLatest() || {
      t: 0,
      x: 0,
      z: 0,
      z_ref: 0,
      z_ideal: 0,
      speed: 60,
      pitch: 0,
      pitchCmdDeg: 0,
      alphaDeg: 0,
      finDeflectionDeg: 0,
      finCommandDeg: 0,
      lift: 0,
      drag: 0,
      moment: 0,
      trackError: 0,
      dynamicPressure: 2200,
      CL: 0,
      CD: 0.15,
      CM: 0,
      SSM: 15,
      f_sep: 0,
      isStalled: false,
    };

    const payload = {
      simTime: this.simTime,
      isRunning: this.isRunning,
      simMode: this.simMode,
      state: this.vehicle.state,
      idealState: this.vehicle.idealState,
      actuator: this.actuator.getState(),
      telemetry: latest,
      atmosphere: this.atmosphere.getFlightQuantities(this.vehicle.state.speed, this.aerodynamics.refLength, this.vehicle.state.z),
      aerodynamics: this.aerodynamics,
      logger: this.logger,
    };

    for (const cb of this.onUpdateCallbacks) {
      cb(payload);
    }
  }
}
