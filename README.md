# 🚀 Aerospace Mathematical Dynamics & Machine Learning Platform

An interactive, high-contrast mathematical modeling and simulation platform for aerospace trajectory dynamics, true proportional navigation (TPN), supersonic aerothermodynamics, Extended Kalman Filter (EKF) state estimation, and machine learning flight prediction.

---

## 🌐 Live Web Deployment

This project is configured for direct 1-click deployment on **GitHub Pages**:
- Open the repository on GitHub
- Go to **Settings** &rarr; **Pages**
- Under **Build and deployment** &rarr; **Branch**: select `main` &amp; `/ (root)`
- Click **Save**
- The site will be live worldwide at: `https://<your-username>.github.io/<repo-name>/`

---

## 🎛️ The 4 Dedicated Modules (Single-Page App)

1. **⚙️ Section 1: Values Setter**
   - Configurable parameter sliders: Initial Velocity ($V_0$), Launch Elevation Angle ($\theta_0$), Total Mass ($W$), Fin Deployment Distance ($x_{\text{deploy}}$), Crosswind ($W_{\text{wind}}$), and Guidance ProNav Gain ($N'$).
   - Mission Presets (Nominal Max Range, High-Angle Steep Descent, Early Fin Deployment, High Crosswind).
   - **🎲 Randomize Values Button**: Instantly tests arbitrary future flight states against the ML predictor.

2. **⏱️ Section 2: Formulas & Calculations**
   - Interactive 50 Hz timeline scrubber ($0.02\text{s} \to 34.80\text{s}$) across 1,740 telemetry points.
   - **6 Live Dynamic Calculation Cards** with real-time numerical evaluation:
     - Translational Equations of Motion
     - Dynamic Pressure & Supersonic Wave Drag
     - Aerodynamic Control Fin Trim Moments
     - True Proportional Navigation (TPN) Guidance Commands
     - Extended Kalman Filter (EKF) Navigation State Estimation
     - Mission Sequencing & Subsystem Actuation Health

3. **📈 Section 3: All Equation Graphs**
   - **8 Dedicated High-Contrast Vector Plots**:
     1. Trajectory Altitude $Z(X)$ vs Downrange Distance
     2. Velocity $V(t)$ & Mach Number $M(t)$ vs Time
     3. Dynamic Pressure $q(t)$ & Aerodynamic Drag $F_D(t)$ vs Time
     4. Body Control Deflections ($\delta_{\text{pitch}}, \delta_{\text{yaw}}$) vs Time
     5. Guidance Commanded Normal Acceleration $a_{\text{pitch\_cmd}}(t)$ vs Time
     6. 4-Fin Independent Actuation & State Transitions
     7. EKF Estimation Error Residual $\|\mathbf{e}_k(t)\|$
     8. Monte Carlo Simulation Dispersion Scatter (1,000 Batch Runs)

4. **🎯 Section 4: Flight Prediction**
   - **Trained Machine Learning Model**: Multivariate Polynomial Ridge Regression fitted to 1,000 batch simulation records ($R^2 \approx 0.58$).
   - Predicts CEP Miss Distance, Apogee Altitude, Total Downrange, and Time of Flight for any parameter set.
   - Mission Outcome Verdict (`TARGET HIT (PASS)` / `OUTSIDE TARGET CEP`).
   - Chronological 4-Phase Flight Trajectory Log.

---

## 🛠️ Local Development

```bash
# Run local Python server
python -m http.server 8080

# Open in browser
http://localhost:8080/
```
