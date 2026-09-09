/**
 * AtmosphereModel.js
 * Comprehensive Educational Atmosphere Model
 * Calculates temperature, pressure, density, viscosity, speed of sound,
 * dynamic pressure, Mach number, and Reynolds number.
 */

export class AtmosphereModel {
  constructor(config = {}) {
    // Sea-level standards (US Standard Atmosphere 1976)
    this.T0 = 288.15; // Sea-level temperature in K (15°C)
    this.P0 = 101325.0; // Sea-level pressure in Pa
    this.rho0 = 1.225; // Sea-level density in kg/m^3
    this.g = 9.80665; // Gravitational acceleration in m/s^2
    this.R = 287.05287; // Specific gas constant for dry air in J/(kg*K)
    this.gamma = 1.4; // Ratio of specific heats for air
    this.lapseRate = 0.0065; // Tropospheric lapse rate in K/m
    this.mu0 = 1.7894e-5; // Reference dynamic viscosity at T0 in Pa*s (kg/(m*s))
    this.S_sutherland = 110.4; // Sutherland constant for air in K

    // User-overridable parameters
    this.altitude = config.altitude || 0.0; // Altitude above MSL (m)
    this.customDensity = config.customDensity !== undefined ? config.customDensity : null; // kg/m^3
    this.customTemperature = config.customTemperature !== undefined ? config.customTemperature : null; // °C
    this.customPressure = config.customPressure !== undefined ? config.customPressure : null; // Pa
    
    // Wind vector in global frame (m/s)
    this.windSpeed = config.windSpeed || 0.0; // m/s
    this.windDirection = config.windDirection || 0.0; // degrees (0 = along +X, 90 = along +Z / vertical crosswind)
    this.windTurbulence = config.windTurbulence || 0.0; // turbulence intensity factor (0 - 1)
  }

  /**
   * Set environmental override parameters
   */
  setEnvironment(params = {}) {
    if (params.altitude !== undefined) this.altitude = params.altitude;
    if (params.customDensity !== undefined) this.customDensity = params.customDensity;
    if (params.customTemperature !== undefined) this.customTemperature = params.customTemperature;
    if (params.customPressure !== undefined) this.customPressure = params.customPressure;
    if (params.windSpeed !== undefined) this.windSpeed = params.windSpeed;
    if (params.windDirection !== undefined) this.windDirection = params.windDirection;
    if (params.windTurbulence !== undefined) this.windTurbulence = params.windTurbulence;
  }

  /**
   * Calculate atmospheric properties at current altitude / custom settings
   * @param {number} alt - altitude in meters (optional, defaults to this.altitude)
   * @returns {Object} Atmospheric state object
   */
  getState(alt = this.altitude) {
    let T_kelvin, P_pa, rho;

    if (this.customTemperature !== null && this.customPressure !== null) {
      T_kelvin = this.customTemperature + 273.15;
      P_pa = this.customPressure;
      rho = this.customDensity !== null ? this.customDensity : (P_pa / (this.R * T_kelvin));
    } else if (this.customDensity !== null) {
      rho = this.customDensity;
      T_kelvin = this.customTemperature !== null ? (this.customTemperature + 273.15) : (this.T0 - this.lapseRate * alt);
      P_pa = rho * this.R * T_kelvin;
    } else {
      // Standard troposphere model (0 to 11,000m)
      const h = Math.max(0, Math.min(alt, 11000));
      T_kelvin = this.T0 - this.lapseRate * h;
      P_pa = this.P0 * Math.pow(1 - (this.lapseRate * h) / this.T0, (this.g / (this.R * this.lapseRate)));
      rho = P_pa / (this.R * T_kelvin);
    }

    // Dynamic viscosity via Sutherland's Formula
    const mu = this.mu0 * Math.pow(T_kelvin / this.T0, 1.5) * ((this.T0 + this.S_sutherland) / (T_kelvin + this.S_sutherland));

    // Speed of sound a = sqrt(gamma * R * T)
    const speedOfSound = Math.sqrt(this.gamma * this.R * T_kelvin);

    return {
      altitude: alt,
      temperatureK: T_kelvin,
      temperatureC: T_kelvin - 273.15,
      pressure: P_pa, // Pa
      pressureKPa: P_pa / 1000.0,
      density: rho, // kg/m^3
      dynamicViscosity: mu, // Pa*s
      speedOfSound: speedOfSound, // m/s
    };
  }

  /**
   * Get dynamic flight quantities based on airspeed and reference length
   * @param {number} airSpeed - true airspeed relative to air mass (m/s)
   * @param {number} refLength - characteristic vehicle length (m)
   * @param {number} alt - altitude (m)
   * @returns {Object} Flow parameters (q, Mach, Reynolds, etc.)
   */
  getFlightQuantities(airSpeed, refLength = 1.5, alt = this.altitude) {
    const atmo = this.getState(alt);
    const speed = Math.max(0.001, airSpeed);

    // Dynamic pressure: q = 0.5 * rho * V^2
    const dynamicPressure = 0.5 * atmo.density * speed * speed;

    // Mach number: M = V / a
    const machNumber = speed / atmo.speedOfSound;

    // Reynolds number: Re = rho * V * L / mu
    const reynoldsNumber = (atmo.density * speed * refLength) / atmo.dynamicViscosity;

    // Prandtl-Glauert compressibility correction factor (for M < 0.8)
    const isSubsonic = machNumber < 0.8;
    const isTransonic = machNumber >= 0.8 && machNumber < 1.2;
    const isSupersonic = machNumber >= 1.2;
    const pgFactor = machNumber < 0.95 ? 1.0 / Math.sqrt(Math.max(0.01, 1 - machNumber * machNumber)) : 2.5;

    return {
      ...atmo,
      airSpeed: speed,
      dynamicPressure: dynamicPressure, // Pa (N/m^2)
      machNumber: machNumber,
      reynoldsNumber: reynoldsNumber,
      regime: isSubsonic ? 'Subsonic' : (isTransonic ? 'Transonic' : 'Supersonic'),
      compressibilityFactor: pgFactor,
    };
  }

  /**
   * Get total wind vector including optional gusts/turbulence
   * @param {number} time - current simulation time in seconds
   * @returns {Object} { vx: number, vz: number, vy: number } in m/s
   */
  getWindVector(time = 0) {
    const dirRad = (this.windDirection * Math.PI) / 180.0;
    let baseSpeed = this.windSpeed;

    // Add gentle multi-harmonic turbulence if enabled
    if (this.windTurbulence > 0) {
      const gust = (Math.sin(time * 1.7) * 0.5 + Math.sin(time * 3.1) * 0.3 + Math.sin(time * 7.3) * 0.2) * this.windTurbulence * baseSpeed;
      baseSpeed += gust;
    }

    return {
      vx: baseSpeed * Math.cos(dirRad),
      vz: baseSpeed * Math.sin(dirRad), // Vertical crosswind
      vy: 0.0,
    };
  }
}
