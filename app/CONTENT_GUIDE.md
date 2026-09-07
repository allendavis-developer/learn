# Content guide for day files (read fully before editing any `js/days/dNN.js`)

This is the working brief for rewriting a day to the standing rules in `C:\dev\study\CLAUDE.md`.
**Day 1 (`js/days/d01.js`) is the reference. Read it in full first** and match its depth, tone and structure.

## The three rules (the user's own words, paraphrased)
1. **"I want to understand everything from the ground up, a very intuitive understanding, not rote memorisation. I WILL ask questions about ANY hole in the lessons."** Every concept card must answer *why* before *what*: the problem the idea solves, what breaks without it, the physical/mechanical picture, where the formula or convention comes from, and the questions a curious first-year would ask next. A rule stated without its reason is a hole. Prefer a derivation or a worked trace over a formula. When a convention is introduced (sign conventions, nonblocking assignment, zero-based indexing, sample-variance n−1, valid/ready rules…) explain *who chooses it and why it was chosen*.
2. **"Each question should have context, even if it is a multi-part question."** Review/practice/checkpoint modes pull single questions out of sequence. Every prompt restates its own givens (values, circuit, list, code, die). Never "Same resistor:", "This list:", "Now the power?", "That divider…", "the value above". Each part of a multi-part problem repeats the setup ("A 5 V supply, a 220 Ω resistor and a 2.0 V LED in series: …"). `node tests/validate.mjs N` fails on dangling openers.
3. **"I need to be studying at least 45 mins a day; this app should encompass all my learning, not some of it."** `node tests/validate.mjs N` prints `dN: ~M min (H a, S b, M c, E d)` and fails under 45 total or under 7 for any goal on a lesson day. **A day is about ONE HOUR of study, never more (user, 7 Sep 2026: "any more and it's overwhelming"). Target 50–65 total; the validator fails above 75. Split roughly H ≥ 12, S ≥ 12, M ≥ 10, E ≥ 14.** Every minute must be tangible progress towards senior-expert level in all four disciplines: no filler, no repeats of what an earlier day taught. Reach it with depth (handbook L2/L3 for that day's unit, derivations, edge cases, worked traces, a code exercise per H and S strand, exam-style stretch questions), never with padding or trivial repeats.

4. **"Make sure each lesson really stretches the user's understanding; at the end they should be genuinely excellent at the topics covered. Match exam-style questions and interview-esque questions."** (user, 7 Sep 2026). So every strand ends with a **Stretch block**: for E, 2–4 questions in the style of a Manchester EEEN11101 / MATH19611 exam (multi-step, units, a diagram described in words, "show that" reasoning turned into a numeric or MC answer); for M, 2–4 Jane Street-style interview questions (derive, estimate, spot the flawed argument, "what changes if…"); for H, FPGA-interview questions (trace a waveform, find the bug in a contract, size a width/buffer, defend a design choice); for S/A, interview-style algorithm questions (edge cases, complexity trade-offs, "why does this fail on …"). Prefix these prompts with `Exam-style:` or `Interview:` (both earn extra estimated time; the validator recognises `Stretch`, `Exam-style`, `Genius track`, `Interview`). The bar: a student who can answer every question in the day cold, a week later, would be top of the year on that topic and would impress an interviewer on it.

5. **"Prioritise understanding. You have a tendency to be very wordy. Use natural human language and proper terminology, AFTER it is properly introduced. Prioritise an intuitive understanding of each concept."** (user, 7 Sep 2026). Concretely: write the way a good tutor talks, in short plain sentences; one idea per paragraph; lead with the picture or the concrete example, then name it; never use a technical term before the sentence that introduces it (introduce it in the card body or its Words-first box first, then use it precisely and consistently); cut every sentence that does not add understanding; prefer a 120-word card that lands over a 300-word card that lists. Depth comes from the *right* explanation and from the questions, not from word count. The 45-minute floor is met by more concepts, worked examples, code and stretch questions, not by longer prose.

## What must stay
- **Every topic already in the day stays in that day** (later days and the checkpoints build on it). Keep every existing question's *content*; rewrite its prompt so it stands alone; you may reorder, merge, or improve explanations.
- Do not pull forward a topic that a later day teaches (the day titles are listed at the bottom). Go deeper into the *same* unit instead. New sub-topics from the same handbook unit are welcome; mention them in `summary`.
- Keep the four strands in order: (J only on Day 1) H → S/A → M → E, then `...genius(q, N)` last. Keep `import { genius } from './_genius.js'` and the spread.
- Keep `title`, `emoji`, `strands`, `summary`, `takeaway`. Remove any `minutes:` field (it is now computed).
- Never delete built content; if something truly must go, move it to `js/spare/` and note it in `HANDOVER.md`.

## Shape of a strong strand (aim per lesson day)
- 4–8 concept cards, 90–220 words each (short, plain, intuitive; see rule 5), each with `terms` (Words-first: 3–6 plain-English definitions) and a widget where one fits.
- 8–16 questions of mixed types, each with a full `explain` that shows the working.
- H and S: at least one `q.code(...)` each (H = a cycle-level Python model of the hardware idea, S/A = the algorithm/program). Include `tests` (some with `name`), `gen` + `refCode` for random checks, and `speed` for anything where a quadratic solution is plausible. Keep speed inputs modest (≤ 50 000 items; Pyodide is 3–5× slower than CPython) and budgets ≥ 1500 ms. Big-int growth makes loops quadratic: avoid.
- Every strand: a Stretch block (see rule 4). M and E: 2–4 `Exam-style:` / `Interview:` questions (prefix the prompt with `Stretch: ` or `Exam-style: `; they earn extra estimated time). For E, use real Manchester exam style: multi-step numeric with units, tolerance set via `{ unit, tol }`.

## Authoring API (`js/lib.js` dayBuilder)
```js
q.info(strand, title, bodyMarkdown, { terms: [[term, def], ...], widget: W(name, props), after })
q.mc(strand, prompt, options, answerIndex, explain, { grid, shuffle:false })
q.tf(strand, prompt, isTrue, explain)
q.multi(strand, prompt, options, [answerIdx...], explain)
q.num(strand, prompt, answer, explain, { unit, tol, display })   // default tol: exact for integers, ~0.6% otherwise
q.text(strand, prompt, answers|[...], explain, { mono, accept: [regexStrings] })  // compared case-insensitively
q.tokens(strand, prompt, answerTokens, distractors, explain, { mono, alt: [[...]] })
q.order(strand, prompt, itemsInCorrectOrder, explain)
q.match(strand, prompt, [[left, right], ...], explain)
q.code(strand, prompt, { fn:'solve', starter, tests:[{args, expect, name?}], gen?, refCode?, checker?, speed?:{gen, budgetMs, label}, solution }, explain)
q.goal(strand, prompt, W(name, props), state => boolean, explain)   // widget must implement solve()
```
- Markdown-lite in bodies: `**bold**`, `` `code` ``, fenced ``` blocks, `- ` bullets, tables with `|`. Inside a JS template literal escape backticks as \`.
- Maths: write Unicode formulas in plain text (`V = I·R`, `e^(−t/τ)`, `√(a² + b²)`, `10⁻⁵`, `V_th`); `js/mathtext.js` typesets them with KaTeX. Run `node tests/mathcheck.mjs N` (0 errors required).
- Strands: `H` hardware, `S` code, `A` algorithms (counts as the S goal), `M` maths, `E` degree.
- `expect` values are JSON: a Python tuple result is compared as a list, `None` as `null`.

## Widgets
Existing (use freely; see `js/widgets*.js` for props): accum accuracy adder alias area arraystep atleastone bayesgrid bigo bisect bits bounds bsanswer bsearch buckets buffer bytes clockperiod coins complex convolve counting damping decibel dice dieavg diode divider dominoes doping energy fifo fixedpoint freqcount fsm geomwait gitgraph gradient halving hhwalk holdsim impedance indicators kcl little logic mergeint mesh norton ode ohm opamp overcount parsestep perms pigeon pipeline powertri prefixsum prienc probe psc pyvars rc recur reflection regtrace repl rl rms seedgen serpar signext stackbr stale starsbars stats stopprop tangent terminal testmatrix trapz tryexcept twoptr twosum uart uncertainty util vectors waveform wheel widths window wireR.

New widgets go **only** in your group's module `js/widgets_gK.js` (already imported by the app and the tests). Pattern: `W.name = (root, p, ctx) => { ...; return { getState: () => ({...}), solve: () => {...} }; }` using the `box/btn/readout/slider/fmt` helpers at the top of that file; call `ctx.onChange()` on every interaction; no overlapping SVG text; `solve()` must put the widget into a state that satisfies any `q.goal` check that uses it.

## Workflow
1. Read `js/days/d01.js`, this file, your day files, and the handbook sections for your days' units (`C:\dev\study\handbook.md`; unit headings are `## H01 …`, `## S01 …`, `## A01 …`, `## M01 …`, `## E01 …`; the "First eight weeks" plan and the four worked examples are near the end).
2. Rewrite each day file with the Write tool (heredocs with large bodies fail in this environment).
3. `node tests/validate.mjs N` and `node tests/mathcheck.mjs N` for each of your days until both pass. Fix every error; read every warning.
4. If the static server is up (`http://localhost:8765`), `node tests/e2e.mjs N N` drives your day through the real UI (needs internet for Pyodide the first time). Fix anything it reports.
5. Report: for each day the validator's `~M min (H, S, M, E)` line, the topics you added, and anything you could not do.

## Accuracy
Every numeric answer must be checked by hand or with Python before it goes in; the `explain` shows the working. For code exercises the `solution` is executed by the validator against `tests` and `gen`; make the tests cover the empty case, a single element, duplicates and a boundary.

## Day titles (do not pull a later day's topic forward)
1 Bits, values, dice and Ohm · 2 Two's complement, lists, 'at least one', energy · 3 Logic gates, dictionaries, independence, Kirchhoff · 4 Mux & adder, loops, conditional probability, dividers · 5 Sign extension, aliasing, coin flips, Thévenin · 6 Carry chains, loop invariants, expectation, derivatives · 7 Checkpoint 1 · 8 Signed overflow, two-sum, product rule, integrals · 9 Saturation, bytes & endianness, factorials, complex numbers · 10 Product widths, parsing safely, combinations, RC time constant · 11 Fixed point, prefix sums, repeated labels, first-order ODE · 12 Priority encoders, exceptions, stars and bars, RMS · 13 Testing arithmetic, big-O, pigeonhole, superposition · 14 Checkpoint 2 · 15 Registers & the clock edge, exit codes, Bayes, nodal analysis · 16 State machines, Git, linearity, op-amps · 17 Resets, debugging by hypothesis, indicators, measurement theory · 18 Latches by accident, seeds, waiting times, uncertainty · 19 Counters & UART frames, unit tests, induction, Taylor & trapezoid · 20 Busy signals & mid-frame reset, log n, "at least one drop", inductors · 21 Checkpoint 3 · 22 valid/ready, binary search, binomial, AC impedance · 23 Latency vs throughput, bounds & duplicates, sample variance, AC power · 24 One-entry buffers, two pointers, Little's law, damping · 25 Skid buffers, sliding windows, utilisation, measuring without lying · 26 Composing stages, sorting & merging intervals, recurrences, mesh analysis · 27 FIFOs, stacks & brackets, waiting for HH, Norton & source transformation · 28 Checkpoint 4 · 29 FIFO pointers & wrap bits, binary search on the answer, occupied buckets, vectors · 30 Month test.
