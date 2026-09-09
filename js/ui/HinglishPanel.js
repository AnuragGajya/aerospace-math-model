/**
 * HinglishPanel.js
 * Interactive Educational Hinglish Glossary & Parameter Inspector
 * Explains parameters with 5 clear structured questions in accessible Hinglish:
 * 1. What is it? (Yeh kya hai?)
 * 2. Physical Phenomenon (Physical world mein kya represent karta hai?)
 * 3. When it increases (Jab yeh badhta hai to kya hota hai?)
 * 4. When it decreases (Jab yeh ghat-ta hai to kya hota hai?)
 * 5. Effect on aerodynamic force, stability or control (Flight performance par asar)
 */

export const HINGLISH_KNOWLEDGE_BASE = {
  airDensity: {
    title: 'Air Density (ρ - Hawa Ka Ghanta / Ghanatva)',
    whatIsIt: 'Air density batati hai ki given 1 cubic meter volume mein kitna air mass present hai (kg/m³). Sea level par standard density lagbhag 1.225 kg/m³ hoti hai.',
    physicalPhenomenon: 'Yeh represent karta hai ki vehicle ke aage kitne air molecules uske surface se takra rahe hain. Hawa jitni dense hogi, har second utne zyada particles body aur control surfaces par force lagaenge.',
    whenIncreases: 'Jab density badhti hai (jaise low altitude ya thandi hawa mein), dynamic pressure q = ½ρV² badh jata hai. Control surfaces zyada effective ho jate hain aur thode deflection par bhi zyada lift aur moment milta hai. Lekin drag (hawa ki rukawat) bhi badh jati hai.',
    whenDecreases: 'Jab density kam hoti hai (high altitude ya garam hawa mein), air thinned ho jati hai. Same speed par control surfaces ka response weak ho jata hai, turning radius bada ho jata hai aur vehicle floaty mehsoos hota hai.',
    aeroEffect: 'Directly proportional to all forces: Lift, Drag aur Pitching Moment sabhi density ke saath linearly scale hote hain. Control authority badhti hai.',
  },
  dynamicPressure: {
    title: 'Dynamic Pressure (q = ½ρV² - Gatisheel Dabav)',
    whatIsIt: 'Dynamic pressure hawa ke flow ki kinetic energy per unit volume hoti hai. Yeh air density aur vehicle speed ke square ka product hota hai (Pascals mein).',
    physicalPhenomenon: 'Jab moving vehicle hawa ko rokta ya deflect karta hai, toh hawa ki kinetic energy pressure mein convert hoti hai. Yeh wahi fluid pressure hai jo aerodynamic forces generate karta hai.',
    whenIncreases: 'High speed ya high air density par q bahut tezi se (square relation V²) badhta hai. Control surfaces bahut aggressive forces generate karte hain aur vehicle quick response deta hai.',
    whenDecreases: 'Low speed par q dramatically drop hota hai. Control surface chahe full deflect ho jaye, required turning force nahi banti (ise control starvation kehte hain).',
    aeroEffect: 'Yeh formula Lift = q·S·CL aur Drag = q·S·CD ka core multiplier hai. Fluid dynamics ki puri strength dynamic pressure par depend karti hai.',
  },
  machNumber: {
    title: 'Mach Number (M = V / a - Dhwani Ki Gati Se Tulna)',
    whatIsIt: 'Mach number vehicle ki airspeed aur local speed of sound ka ratio hai. Agar M = 0.8 hai, matlab vehicle sound speed ki 80% speed par udd raha hai.',
    physicalPhenomenon: 'Yeh represent karta hai ki hawa vehicle ke aane ki information kitni jaldi aage pass kar sakti hai. High speed par hawa compress hone lagti hai.',
    whenIncreases: 'Transonic region (M > 0.8) mein pahunchte hi shockwaves banne lagti hain, flow separation hota hai aur wave drag achanak badh jata hai. Center of Pressure piche shift ho jata hai (Mach tuck phenomenon).',
    whenDecreases: 'Subsonic speed (M < 0.3) par air ko incompressible (constant density) maana ja sakta hai aur streamline flow smooth rehta hai.',
    aeroEffect: 'Compressibility control effectiveness ko modify karti hai aur CP ko piche shift karke static stability badha deti hai, jisse vehicle ko turn karna mushkil ho sakta hai.',
  },
  reynoldsNumber: {
    title: 'Reynolds Number (Re - Inertial vs Viscous Forces)',
    whatIsIt: 'Reynolds number ek non-dimensional number hai jo inertial forces aur viscous (friction) forces ka ratio batata hai: Re = (ρ·V·L) / μ.',
    physicalPhenomenon: 'Yeh determine karta hai ki vehicle ke surface ke paas boundary layer flow laminar (smooth layered) rahega ya turbulent (chaotic mixing) banega.',
    whenIncreases: 'High speed ya bade dimensions par Re badhta hai. Boundary layer turbulent ho jati hai jo separation ke against zyada resistant hoti hai.',
    whenDecreases: 'Low Re par viscous friction dominate karta hai, laminar separation bubbles banti hain aur aerodynamic efficiency kam ho jati hai.',
    aeroEffect: 'Boundary layer attachment aur stall behavior ko deeply influence karta hai.',
  },
  angleAttack: {
    title: 'Angle of Attack (α - Hawa Ke Saath Jhukav)',
    whatIsIt: 'Angle of Attack (AoA) vehicle ki centerline axis aur oncoming relative wind vector ke beech ka angle hota hai.',
    physicalPhenomenon: 'Yeh batata hai ki vehicle hawa ko kitne angle par slice kar raha hai. Body aur rear fins hawa ko niche push karte hain, jisse Newton ke 3rd law ke mutabiq upward Lift banti hai.',
    whenIncreases: 'AoA badhne se Lift coefficient CL linearly badhta hai, lekin ek limit (Stall Angle ~18°) ke baad flow boundary detach ho jati hai aur stall ho jata hai.',
    whenDecreases: 'AoA zero hone par body lift zero ho jati hai aur sirf zero-lift drag rehta hai.',
    aeroEffect: 'Vehicle ko climb ya dive karwane ke liye AoA main variable hai. Stable body naturally wind ki taraf align (AoA = 0) hone ki koshish karti hai.',
  },
  finDeflection: {
    title: 'Control Surface Deflection (δ - Pichle Fins Ka Mudav)',
    whatIsIt: 'Rear control surfaces (fins) ka body centerline ke reference mein angular deflection (degrees mein).',
    physicalPhenomenon: 'Jab rear fin deflect hota hai, toh pichle hisse ki local hawa turn hoti hai. Isse fin ke ek side stagnation pressure aur dusri side suction banta hai.',
    whenIncreases: 'Zyada deflection se fin par asymmetric normal force banti hai jo CG ke around bada Pitching Moment generate karti hai, jisse body rotate hoti hai.',
    whenDecreases: 'Neutral (δ = 0) par symmetrical fins dono taraf barabar pressure rakhte hain aur koi net control moment nahi banate.',
    aeroEffect: 'Ideal model manta hai ki fin mudte hi vehicle turn ho jayega. Lekin Fluid model dikhata hai ki fin sirf local air pressure badalta hai; jab tak hawa force nahi banayegi, vehicle rotate nahi hoga!',
  },
  centerOfMass: {
    title: 'Center of Mass (CG - Vazan Ka Kendra)',
    whatIsIt: 'Vehicle ka geometric point jahan uska pura mass balance hota hai. Saari rotational accelerations CG ke around hi hoti hain.',
    physicalPhenomenon: 'Newtonian rigid body mechanics: Forces body ko translate karwati hain, aur unhi forces ka CG se distance (moment arm) torque banata hai.',
    whenIncreases: 'Agar CG piche (tail ki taraf) shift ho jaye, toh CP ke piche nikal sakta hai, jisse vehicle statically unstable ho jayega aur hawa mein tumble kar jayega!',
    whenDecreases: 'Agar CG aage (nose ki taraf) shift ho, toh vehicle over-stable ho jata hai; use turn karne ke liye fins par bahut zyada force lagani padti hai.',
    aeroEffect: 'Static Stability Margin = (xCP - xCG) / L_ref. CG aage hona positive stability deta hai.',
  },
  centerOfPressure: {
    title: 'Center of Pressure (CP - Hawa Ke Dabav Ka Kendra)',
    whatIsIt: 'Puri body aur fins par lagne wale total aerodynamic forces (Lift & Normal forces) ka average point of action.',
    physicalPhenomenon: 'Nose, cylindrical body aur rear fins sabhi alag-alag forces generate karte hain. In sabhi individual distributed pressure forces ka net resultant CP par act karta hai.',
    whenIncreases: 'Jab rear fins zyada active hote hain, CP tail ki taraf piche move hota hai, jisse restoring stability badhti hai.',
    whenDecreases: 'High AoA par body nose separation ki wajah se CP aage nose ki taraf shift ho sakta hai, jisse stability kam ho sakti hai.',
    aeroEffect: 'Agar CP hamesha CG ke piche (rear mein) rahe, toh hawa lagte hi restoring moment banta hai jo vehicle ko naturally seedha rakhta hai (Weathercock Stability).',
  },
  actuatorLag: {
    title: 'Actuator Lag (τ - Motor Ka Response Time)',
    whatIsIt: 'Control surface ko chalane wali servo-motor ka 1st-order time constant (lag), jaise 40 milliseconds.',
    physicalPhenomenon: 'Computer instant command de sakta hai, lekin mechanical motor, gears aur linkage ko fin ghumane mein time lagta hai.',
    whenIncreases: 'Lag badhne se control command aur actual fin movement ke beech time gap badh jata hai. High speed flight mein isse phase lag aur control oscillation (PID hunting) paida ho sakti hai.',
    whenDecreases: 'Fast actuator quick feedback control enable karta hai aur path tracking accurate rehti hai.',
    aeroEffect: 'Fluid dynamics response ko delay karta hai. Ideal models is lag ko ignore karke false precision assume karte hain.',
  },
  sensorNoise: {
    title: 'Sensor Noise & IMU Bias (Sensors Ki Asli Kharabi)',
    whatIsIt: 'Position sensor (GNSS) aur Inertial Measurement Unit (Gyroscopes & Accelerometers) mein aane wali random reading variations aur drift bias.',
    physicalPhenomenon: 'Real electronics kabhi 100% accurate measurement nahi deti. Vibration, temperature drift aur electronic thermal noise signal mein jud jate hain.',
    whenIncreases: 'High noise hone par controller ko lagta hai vehicle oscillate kar raha hai, jisse fins bewajah jhatke (chatter) lene lagte hain.',
    whenDecreases: 'Clean measurement clean state estimation aur smooth fin control deti hai.',
    aeroEffect: 'State estimator (Kalman/Complementary filter) ka importance samjhata hai ki controller hamesha imperfect data ke saath kaam karta hai.',
  },
  idealVsFluid: {
    title: 'Ideal Control Model vs Fluid-Dynamics Model (Kyun Zaroori Hai Antar?)',
    whatIsIt: 'Ideal Model manta hai ki fin 5° ghooma toh vehicle turant 5° turn ho jayega. Fluid Model calculations karta hai actual Navier-Stokes/aerodynamic pressure, dynamic pressure q, drag, aur moments ke hisaab se.',
    physicalPhenomenon: 'Electronics command decide karti hai -> Actuator fin ghumata hai -> Fin hawa ke flow ko deflect karta hai -> Pressure difference banta hai -> Net Aerodynamic Force aur Torque banti hai -> Torque body ko rotate karta hai -> Sensors naye state ko naapte hain.',
    whenIncreases: 'Low speed ya crosswind mein Ideal model bilkul fail ho jata hai kyunki hawa mein force banane ke liye dynamic pressure nahi hota.',
    whenDecreases: 'Ideal model aur fluid model ka gap dikhata hai ki software algorithms ko physics-aware hona kyun zaroori hai.',
    aeroEffect: 'Website ka main educational takeaway: Control surfaces path ko directly nahi chalate, balki hawa ke interaction ko badalte hain!',
  },
};

export class HinglishPanel {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentKey = 'idealVsFluid';
  }

  showParam(key) {
    if (HINGLISH_KNOWLEDGE_BASE[key]) {
      this.currentKey = key;
      this.render();
    }
  }

  render() {
    const data = HINGLISH_KNOWLEDGE_BASE[this.currentKey] || HINGLISH_KNOWLEDGE_BASE['idealVsFluid'];
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="bg-slate-900/95 border border-sky-500/30 rounded-xl p-4 text-slate-200 shadow-2xl backdrop-blur-md">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-3">
          <div class="flex items-center space-x-2">
            <span class="flex h-3 w-3 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
            </span>
            <h3 class="font-bold text-sky-300 text-sm tracking-wide">${data.title}</h3>
          </div>
          <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400">Hinglish Guide</span>
        </div>

        <!-- 5 Structured Questions -->
        <div class="space-y-2.5 text-xs">
          <!-- 1. What is it? -->
          <div class="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
            <div class="text-amber-400 font-semibold mb-1 flex items-center gap-1.5">
              <span>❓</span> <span>Yeh kya hai? (What is it?)</span>
            </div>
            <p class="text-slate-300 leading-relaxed">${data.whatIsIt}</p>
          </div>

          <!-- 2. Physical Phenomenon -->
          <div class="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
            <div class="text-cyan-400 font-semibold mb-1 flex items-center gap-1.5">
              <span>🌊</span> <span>Physical phenomenon kya represent karta hai?</span>
            </div>
            <p class="text-slate-300 leading-relaxed">${data.physicalPhenomenon}</p>
          </div>

          <!-- 3. When Increases -->
          <div class="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
            <div class="text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
              <span>📈</span> <span>Jab yeh badhta hai (Increases) to kya hota hai?</span>
            </div>
            <p class="text-slate-300 leading-relaxed">${data.whenIncreases}</p>
          </div>

          <!-- 4. When Decreases -->
          <div class="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/40">
            <div class="text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
              <span>📉</span> <span>Jab yeh ghat-ta hai (Decreases) to kya hota hai?</span>
            </div>
            <p class="text-slate-300 leading-relaxed">${data.whenDecreases}</p>
          </div>

          <!-- 5. Aero & Stability Effect -->
          <div class="bg-sky-950/40 rounded-lg p-2.5 border border-sky-500/30">
            <div class="text-sky-300 font-semibold mb-1 flex items-center gap-1.5">
              <span>🎯</span> <span>Aerodynamic Force, Stability & Control par Asar:</span>
            </div>
            <p class="text-sky-200/90 leading-relaxed">${data.aeroEffect}</p>
          </div>
        </div>

        <!-- Quick Selector Chips -->
        <div class="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap gap-1.5">
          ${Object.keys(HINGLISH_KNOWLEDGE_BASE).map(k => `
            <button data-key="${k}" class="hinglish-chip text-[10px] px-2 py-1 rounded transition-all ${k === this.currentKey ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}">
              ${HINGLISH_KNOWLEDGE_BASE[k].title.split('(')[0].trim()}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Bind chip click events
    this.container.querySelectorAll('.hinglish-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-key');
        this.showParam(key);
      });
    });
  }
}
