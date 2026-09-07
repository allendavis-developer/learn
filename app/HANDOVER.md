# HANDOVER — FPGA Lingo study app (month 1)

Last updated: 7 Sep 2026.

This file records what exists, what was deliberately **parked** (not deleted) when the EE track was
re-aligned to the real Manchester semester-1 units, and what month 2 should pick up. Read it before
building month 2 so nothing is rebuilt from scratch.

## 0. Standing content rules (user instruction, 6 Sep 2026 evening) — read `../CLAUDE.md` and `CONTENT_GUIDE.md`

After finishing Day 1 in 10 minutes the user set three permanent rules: (1) **ground-up, intuitive teaching**, every
"why" answered, no rote (the passive-sign-convention card had stated the rule without the reason); (2) **every question
stands alone** (review/practice pull questions out of sequence, so "Same resistor: power?" is unanswerable); (3) **at
least 45 minutes of real study per day**; the app is the user's entire study, so cover more per day if needed.

Mechanics added for this:
- `js/lib.js` `estimateBreakdown/estimateMinutes`: study-time estimate per day and per goal, calibrated on the user's
  measured pace (the original Day 1 scores ~13 min). `curriculum.js` sets `day.minutes` from it; the intro card shows
  the per-goal split.
- `tests/validate.mjs [day ...]` fails a day under 45 min, a goal under 7 min on a lesson day, or a prompt with a
  dangling opener ("Same…", "This list…", "the value above"). `tests/_load.mjs` lets validate/mathcheck run on single
  days so parallel authors do not block each other.
- `js/widgets_eee3.js`: `psc` (labels-vs-physics sign-convention sim) and `wireR` (R = ρL/A). `js/widgets_g1..g8.js`:
  one module per content agent for new widgets (all imported by `engine.js` and the tests).
- `CONTENT_GUIDE.md`: the authoring brief every rewrite followed; Day 1 (`js/days/d01.js`) is the reference day.

## 1. What the app is

- Static ES-module SPA in `C:\dev\study\app` (serve with `serve.cmd` → http://localhost:8765).
- 30 days starting Sun 6 Sep 2026 (Day 1 = today when this was written). Uni starts on Day 16 (Mon 21 Sep). Checkpoints on Days 7, 14, 21, 28, 30 (Saturdays + final day).
- Every lesson day advances four core strands: **H** FPGA, **S/A** software/algorithms, **M** quant maths,
  **E** degree. A separate **G mathematician's thread** closes the lesson and is tracked independently.
- Tests: `node tests/validate.mjs` (content + every reference solution under real Python) and
  `node tests/e2e.mjs [from] [to]` (Puppeteer drives every lesson to completion).

## 2. EE track alignment (done 6 Sep)

The user pasted the semester-1 unit fact files. The degree strand now maps to them:

| Unit | Days | Topics covered in month 1 |
|---|---|---|
| **EEEN11101** Principles of EEE | 1–5, 12, 13, 15, 16, 20, 22, 23, 26, 27 | Ohm, power/energy, KCL/KVL, series/parallel, dividers, Thévenin, RMS, superposition, nodal, op-amps (inverting, non-inverting, **differential**), RL/RC transients, phasors/impedance, AC power + **power-factor correction**, mesh/supermesh, **Norton, source transformation, max power** |
| **MATH19611** Maths 1E1 | 6, 8, 9, 11, 19, 24, 29 | derivatives, integrals, complex numbers, first-order ODE, Taylor + trapezoid + **Newton–Raphson**, second-order/damping, **vectors (dot/cross)** |
| **EEEN11201** EEE in Practice | 17, 18, 25 | **accuracy/precision/resolution, meter specs**, **standard error + uncertainty propagation**, probe loading |

Unit ids in `js/lib.js` `UNIT_MAP` use the real codes; the Progress page shows them.

"Top of year" pass: every lesson-day E section got a **Stretch / exam-style** question (loaded dividers,
supermesh, two-node nodal, PFC capacitor sizing, RC/RL time-to-level, ODE evaluation, Newton–Raphson,
series RLC ζ, differential amplifier…). Checkpoints 21/28/30 test the new material.

## 3. Parked content (moved, not deleted)

`js/spare/e_offsyllabus.js` — **not imported by the app**. Each export is `(q, W) => steps[]`, the exact
step arrays that used to live in the day files. To reuse: import it in a day file and spread into `steps`.

| Export | Was | Belongs to |
|---|---|---|
| `semiconductors` | Day 17 E | semester-2 electronics / devices unit (intrinsic vs doped, carriers) |
| `diode` | Day 18 E | same (three diode models, rectifier) |
| `transistorSwitch` | Day 27 E | same (MOSFET/BJT switch design checks) |
| `gradient` | Day 29 E | Maths 1E2 / fields (partials, ∇, div, curl) |
| `checkpointQuestions` | Days 21 & 30 | the three checkpoint items on those topics |

`js/spare/parked_code_exercises.js` — two surplus code exercises (Day 2 two's-complement encoder, Day 19 simple UART frame) parked on 7 Sep 2026 to keep those days inside the one-hour cap; complete step expressions, commented out.

Widgets that are **built, registered and working but currently unused** (all in `js/widgets_eee.js`):

| Widget | What it shows | Likely home |
|---|---|---|
| `W('doping')` | donor/acceptor carrier picture | with `semiconductors` |
| `W('diode', {V})` | I–V curve, three models overlaid | with `diode` |
| `W('gradient', {x,y})` | contour map with ∇f arrow | with `gradient` |
| `W('alias', …)` | sampling below Nyquist | signals unit (sem 2) |
| `W('convolve', …)` | sliding-window convolution | signals unit |
| `W('reflection', …)` | transmission-line reflection | EM / high-speed digital |
| `W('decibel', …)` | dB ↔ ratio | signals / measurement |

Handbook units these serve: E03 (fields), E04 (devices), E05–E08 (signals, EM, lines) — see `../handbook.md`.

## 4. Month-2 EE topics still to write (on EEEN11101/11201 syllabus, later in the semester)

- Dependent-source amplifier models (VCVS/VCCS) in nodal/mesh form; op-amp integrator/differentiator.
- Three-phase: star/delta, line vs phase quantities, balanced power √3·V_L·I_L·pf.
- DC machines: separately excited brushed motor, torque = k·Φ·I, back-EMF, efficiency.
- Energy storage and power conversion overview; generation/demand balancing.
- Mechanical and thermal first-order analogues (mass–damper, thermal RC).
- EEEN11201: oscilloscope/DMM/PSU/function-generator specs, noise & bandwidth, sensors, datasheet reading,
  systematic fault-finding, PCB/CAD/soldering (practical, exam is 40 % practical).
- MATH19611: limits, L'Hôpital, integration by parts/substitution/partial fractions, series convergence,
  Fourier intro, matrices and Gaussian elimination, coordinate systems.

## 5. Other strands — where month 1 ends

- **H**: H01–H04 (bits → FIFOs with wrap bits). Next: arbitration, memories, CDC, AXI-stream (H04 L3+, H05).
- **S/A**: A01–A03 (arrays, hashing, binary search incl. on-the-answer, windows, intervals, stacks). Next:
  heaps, recursion/DP, graphs (A04+), Git branching, profiling.
- **M**: M01, M04–M08 (counting, Bayes, expectation, variance, geometric/binomial, Little's law, HH waits).
  Next: M02 linear algebra, M03 generating functions, martingales, market-making toy games.

## 6. Maths typesetting (added 6 Sep)

- KaTeX 0.16.11 is vendored in `vendor/katex/` (no CDN needed). `index.html` loads it before the module script.
- `js/mathtext.js` auto-detects formula runs in every text field (bodies, prompts, options, explanations,
  term names, widget titles) and renders them with KaTeX. Content stays plain Unicode: `τ = L/R`,
  `e^(−t/τ)`, `√(δa² + δb²)`, `V_th`, `10⁻⁵`, `log₂(1024)` all render. Explicit `$…$` / `$$…$$` also work.
- It deliberately leaves alone: code spans, identifiers with underscores (`in_ready`, `lower_bound`),
  code operators (`==`, `//`), bullets, table pipes, hyphenated words (`32-bit`, `op-amp`), plain units
  without an operator (`5 V`), and 2–3 letter lowercase words (`lo`, `hi`, `mid`).
- `node tests/mathcheck.mjs` renders all 3,400 fields, reports KaTeX parse errors (must be 0) and writes
  every detected formula to `tests/math_spans.txt` for review after content changes.

## 7. The maths ambition (updated by user, 7 Sep)

The goal is to become a mathematical genius by **summer 2030**, in degree, general and quant maths. The
M strand (probability, counting, expectation, stats, queues), the MATH19611 sections inside the E strand,
and the **G mathematician's thread** are three separately labelled and separately tracked routes. The G thread covers proof technique,
real analysis (limits, sequences, ε–δ), linear algebra beyond the syllabus (eigen-decomposition, SVD),
number theory/combinatorics for puzzles, and Jane Street-style estimation and game problems. Keep the
degree maths one to two weeks ahead of the lectures; keep the quant maths on its own harder ramp.

## 8. Known state of the code

- `js/widgets_course.js` holds the four new EE widgets (`accuracy`, `uncertainty`, `norton`, `vectors`).
- `js/widgets_more.js` holds the sims added to previously text-only quant/software cards.
- `js/mascot.js` = "Chip" mascot (idle/happy/sad/celebrate) used on home, feedback and completion screens.
- Validator registers widgets from widgets.js, widgets_eee.js, widgets_eee2.js, widgets_more.js, widgets_course.js.
