// PARKED CONTENT — not imported by the app. See ../../HANDOVER.md.
//
// These EE sections were written for month 1 before the real Manchester semester-1
// unit list (EEEN11101, EEEN11201, MATH19611) was known. They belong to later units
// (semiconductors/devices → semester 2 electronics; gradient/div/curl → 1E2 / fields),
// so they were moved out of days 17, 18, 27, 29 rather than deleted.
//
// Each export takes the day's `q` (from dayBuilder) and `W` (from lib.js) and returns
// the step array exactly as it was in the day file. To reuse: `import { diode } from
// '../spare/e_offsyllabus.js'` and spread `...diode(q, W)` into a day's steps.
//
// Widgets these steps use are still registered and working: W('doping'), W('diode'),
// W('gradient') in js/widgets_eee.js. Other finished-but-unused widgets in that file:
// W('alias'), W('convolve'), W('reflection'), W('decibel') — signals / transmission lines.

// ---- formerly Day 17 · E ---------------------------------------------------------------
export const semiconductors = (q, W) => [
  q.info('E', 'Semiconductors: intrinsic and doped (E04 L1)', `Silicon has 4 valence electrons, each bonded to a neighbour. **Intrinsic** (pure) silicon has very few free carriers at room temperature, so it barely conducts.

**Doping** adds a few impurity atoms per million:
- A **donor** with 5 valence electrons (phosphorus) leaves one electron free → **n-type**; majority carriers are **electrons**.
- An **acceptor** with 3 (boron) leaves a bond missing an electron, a **hole** → **p-type**; majority carriers are **holes**.

The other carrier type still exists in small numbers (**minority carriers**) and matters for diodes and transistors.`, {
    terms: [
      ['Intrinsic', 'Undoped semiconductor: equal, small numbers of electrons and holes from thermal energy.'],
      ['Doping', 'Deliberately adding impurity atoms to control carrier concentration.'],
      ['Donor / n-type', 'Impurity with an extra valence electron; free electrons dominate.'],
      ['Acceptor / p-type', 'Impurity with one fewer valence electron; holes dominate.'],
      ['Majority / minority carriers', 'The abundant / the scarce carrier type in a doped region.'],
    ],
    widget: W('doping', {})
  }),
  q.mc('E', 'In n-type silicon the majority carriers are…', ['electrons', 'holes', 'protons', 'phosphorus atoms'], 0, 'Donors release electrons.', { grid: true }),
  q.mc('E', 'Boron in silicon makes it…', ['p-type (acceptor, holes)', 'n-type (donor, electrons)', 'intrinsic', 'an insulator'], 0, 'Boron has 3 valence electrons: one bond is short an electron.', { grid: true }),
  q.tf('E', 'Pure silicon is a good conductor at room temperature.', false, 'Few free carriers: it is a poor conductor until doped.'),
  q.mc('E', 'Minority carriers in p-type material are…', ['electrons', 'holes', 'ions', 'none exist'], 0, 'Holes are the majority in p-type; the few electrons are the minority.', { grid: true }),
];

// ---- formerly Day 18 · E ---------------------------------------------------------------
export const diode = (q, W) => [
  q.info('E', 'The diode: one-way valve with a soft edge (E04 L2)', `A **diode** conducts easily in one direction (forward) and barely at all in the other (reverse). A real silicon diode's current rises **exponentially** with voltage, becoming significant around **0.6–0.7 V**.

Three models, coarse to fine:
- **Ideal switch**: on for any positive V, off otherwise.
- **Constant drop**: off until 0.7 V, then acts like a 0.7 V battery.
- **Exponential**: I = Is·(e^(V/nVt) − 1).

They agree far from turn-on and disagree most **near** it, so a rectifier analysis with each model predicts a different output shape at small inputs. Know which model you used and why it is adequate.`, {
    terms: [
      ['Diode', 'A p-n junction: conducts forward, blocks reverse.'],
      ['Forward voltage drop', 'The roughly constant ~0.7 V across a conducting silicon diode.'],
      ['Rectifier', 'A circuit using diodes to turn AC into one-direction current.'],
      ['Model adequacy', 'A simpler model is fine when its error does not affect the conclusion; check where it breaks.'],
    ],
    widget: W('diode', { V: 0.6 })
  }),
  q.mc('E', 'A conducting silicon diode drops about…', ['0.7 V', '0 V', '5 V', '3.3 V'], 0, 'The constant-drop model uses 0.7 V.', { grid: true }),
  q.mc('E', 'A rectifier\'s job is to…', ['convert AC into current that flows in one direction', 'amplify AC', 'store charge', 'divide voltage'], 0, 'Diodes pass the positive half-cycles (half-wave) or steer both (full-wave).'),
  q.mc('E', 'Where do the ideal and constant-drop models disagree most?', ['near turn-on, for small input voltages', 'at very large forward currents', 'in reverse bias', 'they never disagree'], 0, 'Ideal conducts at 0.1 V; constant-drop says nothing flows until 0.7 V.'),
  q.mc('E', 'A 1 V peak sine drives a half-wave rectifier. With the constant-drop model the output peak is…', ['0.3 V', '1 V', '0.7 V', '0 V'], 0, '1 − 0.7 = 0.3 V. The ideal model would say 1 V: a big relative difference at small signals.', { grid: true }),
];

// ---- formerly Day 27 · E ---------------------------------------------------------------
export const transistorSwitch = (q, W) => [
  q.info('E', 'The transistor as a switch (E04 L3)', `A **MOSFET** connects drain to source when its gate voltage exceeds the **threshold** V_th by enough; a **BJT** conducts collector current when its base is driven. Used as a **switch** (fully on or fully off), a transistor lets a 3.3 V logic pin control a 12 V, 1 A load.

Design checks from the datasheet, not the headline current rating:
- **Operating region**: fully on means saturation (BJT) or the ohmic region (MOSFET) with low V_DS(on).
- **Drive**: does 3.3 V exceed the gate threshold with margin? Does the base get enough current (I_C / β with margin)?
- **Dissipation**: P = I² × R_DS(on) (MOSFET) or V_CE(sat) × I_C (BJT); check against the thermal limits.
- **Inductive loads** need a flyback diode (Day 20).`, {
    terms: [
      ['MOSFET', 'Voltage-controlled switch: gate voltage turns on a channel between drain and source.'],
      ['Threshold voltage V_th', 'The gate voltage at which the MOSFET begins to conduct. "Logic-level" parts have low V_th.'],
      ['R_DS(on)', 'The on-state resistance. Sets conduction loss I²R.'],
      ['BJT saturation', 'Fully-on region: V_CE small (~0.2 V). Requires base current ≥ I_C/β.'],
      ['Headline rating', 'The maximum current on the datasheet\'s first page. Not achievable without meeting drive and thermal conditions.'],
    ]
  }),
  q.num('E', 'A MOSFET with R_DS(on) = 50 mΩ carries 2 A. Conduction loss in mW?', 200, 'I²R = 4 × 0.05 = 0.2 W.', { unit: 'mW' }),
  q.num('E', 'A BJT switch must carry I_C = 500 mA with β = 50. Minimum base current in mA (no margin)?', 10, 'I_C/β = 10 mA. Design with 2–3× margin to guarantee saturation.', { unit: 'mA' }),
  q.mc('E', 'A MOSFET rated 30 A has V_th = 4 V. Driven from a 3.3 V logic pin it will…', ['barely turn on: use a logic-level MOSFET or a gate driver', 'carry 30 A', 'carry 3.3 A', 'be destroyed'], 0, 'The headline current means nothing without adequate gate drive.'),
  q.mc('E', 'Why is a device\'s maximum current rating not a complete design specification?', ['drive voltage, operating region, dissipation and thermal conditions must be checked together', 'because currents vary', 'it is always exaggerated', 'it applies only to BJTs'], 0, 'The handbook\'s E04 worked checkpoint.'),
];

// ---- formerly Day 29 · E ---------------------------------------------------------------
export const gradient = (q, W) => [
  q.info('E', 'Partial derivatives and the gradient (E02 → E03)', `For a function of two variables, f(x, y) = x² + y², the **partial derivative** ∂f/∂x treats y as a constant: 2x. Likewise ∂f/∂y = 2y. Stack them into the **gradient** ∇f = (2x, 2y): a vector that points in the direction of **steepest increase**, perpendicular to the level curves (here, circles), with length equal to the slope in that direction.

Divergence and curl (E03) build on this: divergence measures net outflow of a vector field from a point; curl measures its rotation. Gradient turns a scalar hill into a field of uphill arrows; that field always has zero curl.`, {
    terms: [
      ['Partial derivative ∂f/∂x', 'Rate of change of f with x while every other variable is held fixed.'],
      ['Gradient ∇f', 'The vector of partial derivatives. Points uphill, perpendicular to contours.'],
      ['Level curve / contour', 'The set where f is constant. For x² + y²: circles.'],
      ['Divergence', 'For a vector field: net outflow per unit volume at a point. Positive = source.'],
      ['Curl', 'For a vector field: local rotation. A gradient field has zero curl.'],
    ],
    widget: W('gradient', { x: 1, y: 0.5 })
  }),
  q.mc('E', 'For f(x, y) = x² + y², the gradient at (1, 0.5) is…', ['(2, 1)', '(1, 0.5)', '(2, 2)', '(0.5, 1)'], 0, '(2x, 2y).', { grid: true }),
  q.num('E', 'Its magnitude at (1, 0.5), to 3 d.p.?', 2.236, '√(4 + 1) = √5.', { tol: 0.002 }),
  q.mc('E', 'The gradient vector points…', ['in the direction of steepest increase, perpendicular to the level curve', 'along the level curve', 'towards the origin always', 'downhill'], 0, 'Perpendicular to contours, uphill.'),
  q.mc('E', 'Divergence of a vector field at a point measures…', ['net outflow per unit volume (a source or sink)', 'rotation', 'the slope of a scalar field', 'the field\'s magnitude'], 0, 'Rotation is curl; slope of a scalar is gradient.'),
];

// ---- checkpoint questions removed from Days 21 and 30 -----------------------------------
export const checkpointQuestions = (q) => [
  q.mc('E', 'Majority carriers in p-type silicon are…', ['holes', 'electrons', 'ions', 'photons'], 0, 'Acceptors create holes.', { grid: true }),
  q.mc('E', 'A 2 V peak sine through a half-wave rectifier (constant 0.7 V drop model) peaks at…', ['1.3 V', '2 V', '0.7 V', '2.7 V'], 0, '2 − 0.7.', { grid: true }),
  q.mc('E', 'n-type silicon is made by adding…', ['a donor such as phosphorus (5 valence electrons)', 'an acceptor such as boron', 'pure silicon', 'oxygen'], 0, 'Donors give free electrons.'),
];
