/**
 * Controller.js
 * Educational Generic Feedback Controller
 * Closed-loop flight controller for tracking user-defined and preset reference paths.
 * 
 * Hierarchy:
 * Desired Reference Path
 *   -> Cross-Track Error
 *   -> Outer-loop Guidance (Commanded Pitch theta_cmd)
 *   -> Inner-loop Attitude & Rate Controller (PID + Rate Damping)
 *   -> Fin Deflection Command (delta_cmd)
 */

export class Controller {
  constructor(config = {}) {
    // Controller gains (tuned for generic stable aerospace body)
    this.kp_track = config.kp_track !== undefined ? config.kp_track : 0.08; // Cross-track error gain (rad/m)
    this.kd_track = config.kd_track !== undefined ? config.kd_track : 0.12; // Cross-track rate gain
    this.ki_track = config.ki_track !== undefined ? config.ki_track : 0.015; // Cross-track integral gain
    
    this.kp_pitch = config.kp_pitch !== undefined ? config.kp_pitch : 1.8; // Pitch error gain (rad_fin / rad_pitch)
    this.kd_pitch = config.kd_pitch !== undefined ? config.kd_pitch : 0.45; // Pitch rate damping gain (rad_fin / (rad/s))
    this.ki_pitch = config.ki_pitch !== undefined ? config.ki_pitch : 0.05; // Pitch integral gain
    
    // Integrator states & anti-windup
    this.integralTrackError = 0.0;
    this.integralPitchError = 0.0;
    this.prevTrackError = 0.0;
    this.maxIntegral = 15.0;
    
    // Reference trajectory settings
    this.pathType = config.pathType || 'sine'; // 'straight', 'step', 'sine', 'custom'
    this.sineAmplitude = config.sineAmplitude || 15.0; // meters
    this.sineWavelength = config.sineWavelength || 120.0; // meters
    this.stepAltitude = config.stepAltitude || 20.0; // meters
    this.stepDistance = config.stepDistance || 80.0; // meters
    this.customWaypoints = config.customWaypoints || []; // [{x, z}]
    
    // Manual override command (if user wants to steer manually)
    this.manualControl = false;
    this.manualDeflectionDeg = 0.0;
  }

  updateConfig(params = {}) {
    if (params.kp_track !== undefined) this.kp_track = params.kp_track;
    if (params.kd_track !== undefined) this.kd_track = params.kd_track;
    if (params.ki_track !== undefined) this.ki_track = params.ki_track;
    if (params.kp_pitch !== undefined) this.kp_pitch = params.kp_pitch;
    if (params.kd_pitch !== undefined) this.kd_pitch = params.kd_pitch;
    if (params.ki_pitch !== undefined) this.ki_pitch = params.ki_pitch;
    if (params.pathType !== undefined) this.pathType = params.pathType;
    if (params.sineAmplitude !== undefined) this.sineAmplitude = params.sineAmplitude;
    if (params.sineWavelength !== undefined) this.sineWavelength = params.sineWavelength;
    if (params.stepAltitude !== undefined) this.stepAltitude = params.stepAltitude;
    if (params.stepDistance !== undefined) this.stepDistance = params.stepDistance;
    if (params.customWaypoints !== undefined) this.customWaypoints = params.customWaypoints;
    if (params.manualControl !== undefined) this.manualControl = params.manualControl;
    if (params.manualDeflectionDeg !== undefined) this.manualDeflectionDeg = params.manualDeflectionDeg;
  }

  reset() {
    this.integralTrackError = 0.0;
    this.integralPitchError = 0.0;
    this.prevTrackError = 0.0;
  }

  /**
   * Evaluate reference altitude and slope at given downrange position X
   * @param {number} x - Downrange position in meters
   * @returns {Object} { z_ref: number, slope_ref: number, pitch_ref: number }
   */
  getReferenceAt(x) {
    let z_ref = 0.0;
    let slope = 0.0;

    switch (this.pathType) {
      case 'straight':
        z_ref = 0.0;
        slope = 0.0;
        break;

      case 'step':
        if (x < this.stepDistance) {
          z_ref = 0.0;
          slope = 0.0;
        } else {
          // Smooth sigmoid step transition
          const dx = x - this.stepDistance;
          const k = 0.15; // transition sharpness
          const sig = 1.0 / (1.0 + Math.exp(-k * (dx - 10.0)));
          z_ref = this.stepAltitude * sig;
          slope = this.stepAltitude * (k * sig * (1 - sig));
        }
        break;

      case 'sine':
      default:
        // z_ref = A * sin(2*pi*x / lambda)
        const k_sine = (2.0 * Math.PI) / Math.max(10.0, this.sineWavelength);
        z_ref = this.sineAmplitude * Math.sin(k_sine * x);
        slope = this.sineAmplitude * k_sine * Math.cos(k_sine * x);
        break;

      case 'custom':
        if (this.customWaypoints.length >= 2) {
          // Linear / Hermite interpolation along waypoints
          const pts = this.customWaypoints;
          if (x <= pts[0].x) {
            z_ref = pts[0].z;
            slope = (pts[1].z - pts[0].z) / Math.max(0.1, pts[1].x - pts[0].x);
          } else if (x >= pts[pts.length - 1].x) {
            z_ref = pts[pts.length - 1].z;
            slope = 0;
          } else {
            for (let i = 0; i < pts.length - 1; i++) {
              if (x >= pts[i].x && x <= pts[i + 1].x) {
                const segDx = pts[i + 1].x - pts[i].x;
                const t = (x - pts[i].x) / segDx;
                z_ref = pts[i].z + t * (pts[i + 1].z - pts[i].z);
                slope = (pts[i + 1].z - pts[i].z) / segDx;
                break;
              }
            }
          }
        }
        break;
    }

    const pitch_ref = Math.atan(slope);
    return { z_ref, slope_ref: slope, pitch_ref };
  }

  /**
   * Compute control surface command based on current estimated state
   * @param {Object} state - { x, z, vx, vz, pitch, pitchRate, alpha }
   * @param {number} dt - time step in seconds
   * @returns {Object} Control telemetry and commanded deflection (rad)
   */
  computeCommand(state, dt) {
    if (this.manualControl) {
      const manualRad = (this.manualDeflectionDeg * Math.PI) / 180.0;
      return {
        finCommandRad: manualRad,
        finCommandDeg: this.manualDeflectionDeg,
        trackError: 0,
        pitchError: 0,
        desiredPitchDeg: 0,
        z_ref: 0,
      };
    }

    // 1. Get Reference Path Target
    const ref = this.getReferenceAt(state.x);
    
    // 2. Outer Loop: Cross-Track Error (z_ref - z)
    // Note: z is positive UP in our global coordinate frame
    const trackError = ref.z_ref - state.z;
    const trackErrorRate = dt > 0 ? (trackError - this.prevTrackError) / dt : 0;
    this.prevTrackError = trackError;
    
    // Integral with anti-windup clamping
    this.integralTrackError += trackError * dt;
    this.integralTrackError = Math.max(-this.maxIntegral, Math.min(this.maxIntegral, this.integralTrackError));

    // Outer-loop commanded pitch angle (theta_cmd)
    const deltaPitchCmd = this.kp_track * trackError + this.kd_track * trackErrorRate + this.ki_track * this.integralTrackError;
    
    // Total desired pitch relative to reference flight path angle
    const maxPitchAngle = (30.0 * Math.PI) / 180.0; // 30 deg limit
    const desiredPitch = Math.max(-maxPitchAngle, Math.min(maxPitchAngle, ref.pitch_ref + deltaPitchCmd));

    // 3. Inner Loop: Pitch Angle & Rate Controller
    const pitchError = desiredPitch - state.pitch;
    
    this.integralPitchError += pitchError * dt;
    this.integralPitchError = Math.max(-this.maxIntegral, Math.min(this.maxIntegral, this.integralPitchError));

    // Commanded fin deflection:
    // To pitch UP (positive theta), rear fins must produce a downward force (trailing edge UP / negative delta).
    // Therefore: delta_cmd = - (Kp * e_theta + Ki * int_e - Kd * q_pitch)
    const rawFinCmd = -(
      this.kp_pitch * pitchError +
      this.ki_pitch * this.integralPitchError -
      this.kd_pitch * state.pitchRate
    );

    // Clamp command to 25 degrees
    const maxFinDeflection = (25.0 * Math.PI) / 180.0;
    const finCommandRad = Math.max(-maxFinDeflection, Math.min(maxFinDeflection, rawFinCmd));

    return {
      finCommandRad: finCommandRad,
      finCommandDeg: (finCommandRad * 180.0) / Math.PI,
      trackError: trackError,
      pitchError: pitchError,
      desiredPitchDeg: (desiredPitch * 180.0) / Math.PI,
      desiredPitchRad: desiredPitch,
      z_ref: ref.z_ref,
      pitch_refDeg: (ref.pitch_ref * 180.0) / Math.PI,
    };
  }
}
