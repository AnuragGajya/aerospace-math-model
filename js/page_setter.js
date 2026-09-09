/**
 * page_setter.js
 * Controller for Page 1: Values Setter
 */

(function() {
  function initPageSetter() {
    const mgr = window.FlightStateManager;
    if (!mgr) return;

    const state = mgr.getState();

    // Elements
    const v0Slider = document.getElementById('v0_slider');
    const v0Input = document.getElementById('v0_input');
    const v0Display = document.getElementById('v0_display');

    const theta0Slider = document.getElementById('theta0_slider');
    const theta0Input = document.getElementById('theta0_input');
    const theta0Display = document.getElementById('theta0_display');

    const massSlider = document.getElementById('mass_slider');
    const massInput = document.getElementById('mass_input');
    const massDisplay = document.getElementById('mass_display');

    const xdeploySlider = document.getElementById('xdeploy_slider');
    const xdeployInput = document.getElementById('xdeploy_input');
    const xdeployDisplay = document.getElementById('xdeploy_display');

    const windSlider = document.getElementById('wind_slider');
    const windInput = document.getElementById('wind_input');
    const windDisplay = document.getElementById('wind_display');

    const pronavSlider = document.getElementById('pronav_slider');
    const pronavInput = document.getElementById('pronav_input');
    const pronavDisplay = document.getElementById('pronav_display');

    function updateUI(s) {
      if (v0Slider) v0Slider.value = s.v0;
      if (v0Input) v0Input.value = s.v0;
      if (v0Display) {
        const mach = (s.v0 / 340.3).toFixed(2);
        v0Display.textContent = `${s.v0.toFixed(0)} m/s (Mach ${mach})`;
      }

      if (theta0Slider) theta0Slider.value = s.theta0;
      if (theta0Input) theta0Input.value = s.theta0;
      if (theta0Display) theta0Display.textContent = `${parseFloat(s.theta0).toFixed(1)}°`;

      if (massSlider) massSlider.value = s.mass;
      if (massInput) massInput.value = s.mass;
      if (massDisplay) massDisplay.textContent = `${parseFloat(s.mass).toFixed(1)} kg`;

      if (xdeploySlider) xdeploySlider.value = s.xdeploy;
      if (xdeployInput) xdeployInput.value = s.xdeploy;
      if (xdeployDisplay) {
        const km = (s.xdeploy / 1000).toFixed(1);
        xdeployDisplay.textContent = `${parseInt(s.xdeploy).toLocaleString()} m (${km} km)`;
      }

      if (windSlider) windSlider.value = s.wind;
      if (windInput) windInput.value = s.wind;
      if (windDisplay) {
        const w = parseFloat(s.wind);
        windDisplay.textContent = w === 0 ? '0.0 m/s (Calm Air)' : `${w.toFixed(1)} m/s`;
      }

      if (pronavSlider) pronavSlider.value = s.pronav;
      if (pronavInput) pronavInput.value = s.pronav;
      if (pronavDisplay) pronavDisplay.textContent = `${parseFloat(s.pronav).toFixed(1)} (True ProNav)`;
    }

    function syncAndSave() {
      const newState = {
        v0: parseFloat(v0Slider ? v0Slider.value : 1100),
        theta0: parseFloat(theta0Slider ? theta0Slider.value : 36.3),
        mass: parseFloat(massSlider ? massSlider.value : 12.0),
        xdeploy: parseFloat(xdeploySlider ? xdeploySlider.value : 15000),
        wind: parseFloat(windSlider ? windSlider.value : 0.0),
        pronav: parseFloat(pronavSlider ? pronavSlider.value : 4.0)
      };
      mgr.saveState(newState);
      updateUI(newState);
    }

    function linkSliderInput(slider, input) {
      if (!slider || !input) return;
      slider.addEventListener('input', () => {
        input.value = slider.value;
        syncAndSave();
      });
      input.addEventListener('input', () => {
        slider.value = input.value;
        syncAndSave();
      });
    }

    linkSliderInput(v0Slider, v0Input);
    linkSliderInput(theta0Slider, theta0Input);
    linkSliderInput(massSlider, massInput);
    linkSliderInput(xdeploySlider, xdeployInput);
    linkSliderInput(windSlider, windInput);
    linkSliderInput(pronavSlider, pronavInput);

    // Presets
    window.applyPreset = function(type) {
      let pState = {};
      if (type === 'nominal') {
        pState = { v0: 1100, theta0: 36.3, mass: 12.0, xdeploy: 15000, wind: 0.0, pronav: 4.0 };
      } else if (type === 'steep') {
        pState = { v0: 1200, theta0: 48.0, mass: 12.0, xdeploy: 12000, wind: 2.0, pronav: 4.2 };
      } else if (type === 'earlyDeploy') {
        pState = { v0: 1050, theta0: 34.0, mass: 12.0, xdeploy: 8000, wind: 0.0, pronav: 4.0 };
      } else if (type === 'crosswind') {
        pState = { v0: 1100, theta0: 36.3, mass: 12.0, xdeploy: 15000, wind: 15.0, pronav: 4.5 };
      }
      mgr.saveState(pState);
      updateUI(pState);
    };

    // Reset button
    const resetBtn = document.getElementById('resetParamsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const def = mgr.resetToDefault();
        updateUI(def);
      });
    }

    // Apply & Save button
    const applySaveBtn = document.getElementById('applySaveBtn');
    if (applySaveBtn) {
      applySaveBtn.addEventListener('click', () => {
        syncAndSave();
        const origText = applySaveBtn.textContent;
        applySaveBtn.textContent = '✅ Saved & Synced!';
        applySaveBtn.style.background = '#059669';
        setTimeout(() => {
          applySaveBtn.textContent = origText;
          applySaveBtn.style.background = '';
        }, 1500);
      });
    }

    // Initial render
    updateUI(state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageSetter);
  } else {
    initPageSetter();
  }
})();
