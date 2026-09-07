# FPGA Lingo — month 1

A Duolingo-style daily trainer with Brilliant-style interactive simulations, built from
`Manchester_EEE_Jane_Street_Expanded_Handbook_2026_2028.docx` (planning edition 6 Sep 2026).

Day 1 = Sun 6 Sep 2026. Uni starts on Day 16 (Mon 21 Sep). Days 1–30 cover handbook weeks 1–4 plus the start of week 5.

## Run it

```
serve.cmd            # starts http://localhost:8765 and opens the browser
```
(or `python -m http.server 8765` in this folder). The app is a static site; progress lives in your browser's localStorage.
Export a backup from Profile → Backup.

Code exercises run Python in the browser (Pyodide from jsDelivr). The first run downloads ~10 MB; afterwards it is cached.

## Four goals, every day

Each day has four tracks, each with a concept card ("Words first" definitions + a live sim) and questions:

| track | handbook units | goal |
|---|---|---|
| 🔧 FPGA engineer | H01–H04 (month 1) | senior FPGA engineer |
| 💻 Software engineer | S01, S03, A01–A03 | senior software engineer |
| 📐 Quant · probability & maths | M01–M08 | Jane Street quant-level maths |
| ⚡ EE degree | EEEN11101 Principles, MATH19611 Maths 1E1, EEEN11201 EEE in Practice — in course order (see HANDOVER.md) | first-rate EE student (a first / top of year) |

Sundays (Days 7, 14, 21, 28) and Day 30 are checkpoint tests: no hints, no retries, 80% first-try passes.
Every lesson appends two spaced-review questions from earlier days, biased towards your misses.

## Mechanics

- Days unlock one per calendar day (Profile → "Unlock all days" to preview; "Pretend today is" to test the calendar).
- Hearts (5), XP, streak with one freeze, gems, crowns, badges. Hearts can be switched off.
- Wrong answers are re-queued until correct and logged in the Ledger (the handbook's private error ledger).
- Practice: weak spots / random mix / one track; refills hearts.
- Words: searchable glossary of every defined term.
- Code exercises: write `solve(...)` in Python; hidden reference models and random cases; a speed test times a large input to expose quadratic solutions. Hardware exercises are cycle-level models (FSM next-state, elastic register, FIFO, skid sizing, hazards, exposure limits).

## Tests

```
node tests/validate.mjs [day…] # content validator: structure, self-contained prompts, ≥45-min estimate per day, every reference solution under real Python
node tests/mathcheck.mjs [day…]# KaTeX typesetting of every text field (0 errors required); formulas listed in tests/math_spans.txt
node tests/e2e.mjs [from] [to] # drives every day through the UI in headless Chrome, auto-answering
node tests/shots.mjs           # screenshot tour → shots/
```

## Layout

```
index.html, css/style.css
js/main.js        shell, path, practice, glossary, ledger, profile
js/engine.js      lesson runner (all question types incl. code)
js/runner.js      Pyodide/JS worker with timeout
js/widgets*.js    interactive simulations
js/curriculum.js  day registry, spaced review, practice sets
js/lib.js         content helpers (dayBuilder)
js/days/dNN.js    one file per day
```

## Content rules

See `../CLAUDE.md` (standing rules: ground-up teaching, self-contained questions, ≥45 min/day) and `CONTENT_GUIDE.md` (the authoring brief). `js/days/d01.js` is the reference day.
