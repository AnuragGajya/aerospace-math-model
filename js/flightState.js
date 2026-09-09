/**
 * flightState.js
 * Synchronizes flight parameters across all 4 separate pages via localStorage
 */

(function(root) {
  const DEFAULT_STATE = {
    v0: 1100.0,
    theta0: 36.3,
    mass: 12.0,
    xdeploy: 15000.0,
    wind: 0.0,
    pronav: 4.0
  };

  const FlightStateManager = {
    DEFAULT_STATE: DEFAULT_STATE,

    getState: function() {
      try {
        const saved = localStorage.getItem('aero_flight_params');
        if (saved) {
          return Object.assign({}, DEFAULT_STATE, JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Could not read state:', e);
      }
      return Object.assign({}, DEFAULT_STATE);
    },

    saveState: function(params) {
      try {
        const current = this.getState();
        const updated = Object.assign({}, current, params);
        localStorage.setItem('aero_flight_params', JSON.stringify(updated));
        return updated;
      } catch (e) {
        console.warn('Could not save state:', e);
        return params;
      }
    },

    resetToDefault: function() {
      try {
        localStorage.setItem('aero_flight_params', JSON.stringify(DEFAULT_STATE));
      } catch (e) {}
      return Object.assign({}, DEFAULT_STATE);
    }
  };

  root.FlightStateManager = FlightStateManager;
})(typeof window !== 'undefined' ? window : this);
