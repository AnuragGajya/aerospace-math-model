/**
 * DataLogger.js
 * High-performance telemetry buffer and history manager
 * Records real-time flight variables for plotting, playback, and analysis.
 */

export class DataLogger {
  constructor(maxPoints = 800) {
    this.maxPoints = maxPoints;
    this.records = [];
    this.clear();
  }

  clear() {
    this.records = [];
    this.time = [];
    this.x = [];
    this.z = [];
    this.z_ref = [];
    this.z_ideal = [];
    this.speed = [];
    this.pitch = [];
    this.pitchDeg = [];
    this.pitchCmdDeg = [];
    this.alphaDeg = [];
    this.finDeflectionDeg = [];
    this.finCommandDeg = [];
    this.lift = [];
    this.drag = [];
    this.moment = [];
    this.trackError = [];
    this.dynamicPressure = [];
  }

  log(entry) {
    // entry = { t, x, z, z_ref, z_ideal, speed, pitch, pitchCmdDeg, alphaDeg, finDeflectionDeg, finCommandDeg, lift, drag, moment, trackError, dynamicPressure }
    this.records.push(entry);
    
    this.time.push(entry.t);
    this.x.push(entry.x);
    this.z.push(entry.z);
    this.z_ref.push(entry.z_ref !== undefined ? entry.z_ref : 0);
    this.z_ideal.push(entry.z_ideal !== undefined ? entry.z_ideal : entry.z);
    this.speed.push(entry.speed);
    this.pitch.push(entry.pitch);
    this.pitchDeg.push((entry.pitch * 180) / Math.PI);
    this.pitchCmdDeg.push(entry.pitchCmdDeg || 0);
    this.alphaDeg.push(entry.alphaDeg);
    this.finDeflectionDeg.push(entry.finDeflectionDeg);
    this.finCommandDeg.push(entry.finCommandDeg);
    this.lift.push(entry.lift);
    this.drag.push(entry.drag);
    this.moment.push(entry.moment);
    this.trackError.push(entry.trackError);
    this.dynamicPressure.push(entry.dynamicPressure);

    // Keep within max history
    if (this.records.length > this.maxPoints) {
      this.records.shift();
      this.time.shift();
      this.x.shift();
      this.z.shift();
      this.z_ref.shift();
      this.z_ideal.shift();
      this.speed.shift();
      this.pitch.shift();
      this.pitchDeg.shift();
      this.pitchCmdDeg.shift();
      this.alphaDeg.shift();
      this.finDeflectionDeg.shift();
      this.finCommandDeg.shift();
      this.lift.shift();
      this.drag.shift();
      this.moment.shift();
      this.trackError.shift();
      this.dynamicPressure.shift();
    }
  }

  getSeries(channelName) {
    return this[channelName] || [];
  }

  getLatest() {
    if (this.records.length === 0) return null;
    return this.records[this.records.length - 1];
  }

  exportCSV() {
    if (this.records.length === 0) return '';
    const headers = Object.keys(this.records[0]).join(',');
    const rows = this.records.map(r => Object.values(r).map(v => typeof v === 'number' ? v.toFixed(4) : v).join(','));
    return [headers, ...rows].join('\n');
  }
}
