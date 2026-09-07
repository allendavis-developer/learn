# Study app (C:\dev\study\app) — read this before touching anything

## 0. Check project memory first
Before any work here, read `C:\Users\allen\.claude\projects\C--dev\memory\MEMORY.md` and open the memories it links for this project (`fpga-lingo-project.md`, `study-app-lesson-rules.md`). They hold the user's standing instructions; this file summarises them but memory is the source of truth for anything newer.

## 1. Standing content rules (the user's instructions, 6 Sep 2026 — never regress these)
1. **Teach from the ground up, for intuition, never for rote.** Every concept card answers *why* before *what*: the problem the idea solves, what breaks without it, the physical or mechanical picture, where the formula or convention comes from. A rule stated without its reason is a hole. The user *will* ask about any hole in a lesson, so anticipate the questions a curious first-year would ask and answer them in the lesson.
2. **Every question stands alone.** Review, practice and checkpoints pull questions out of sequence, so every prompt restates its own givens (values, the circuit, the list, the code). Never "Same resistor:", "This list:", "Now the power?", "the value above". Each part of a multi-part question repeats the setup. `tests/validate.mjs` fails on dangling openers.
3. **About one hour of real study every day: at least 45 minutes, never more than about 65–70 (validator cap 75).** More is overwhelming (user, 7 Sep 2026). Every minute is tangible progress towards senior-expert level in all four disciplines. The app is the user's *entire* daily study. Go deeper (handbook L2/L3, derivations, edge cases, a code exercise) or cover more of the day's units; never pad. `tests/validate.mjs` estimates minutes per day and fails any day under 45, and any goal (H, S/A, M, E) under 7 minutes on a lesson day.
4. **Every lesson stretches the user.** Each strand ends with exam-style (Manchester EEEN11101 / MATH19611) and interview-style (Jane Street quant, FPGA design) questions, prefixed `Exam-style:` / `Interview:`. The bar: finishing the day should make the user genuinely excellent at its topics, top-of-year and interview-ready, not merely familiar (user, 7 Sep 2026).
5. **Plain, natural language; not wordy; terms only after they are introduced.** Write like a good tutor talks: short sentences, the concrete picture first, then the name. Introduce a technical term (in the card or its Words-first box) before using it, then use it precisely. Cut anything that does not add understanding; meet the time floor with more concepts, examples, code and stretch questions, never longer prose (user, 7 Sep 2026).
6. **All four core goals every day**: senior FPGA engineer (H), senior software engineer (S/A, real code + speed tests), Jane Street quant maths (M), first-rate EE student aiming for top of year (E, in Manchester course order). On every lesson day, a separate **mathematician's thread (G)** closes the session: proof technique and structural problem solving towards the user's mathematical-genius goal for summer 2030. Never file G under quant probability.
7. Plain-English "Words first" definitions on every concept card; an interactive simulation for every concept where one exists; no overlapping diagram elements; desktop-first.
8. **Never delete built content**: park it in `js/spare/` and record it in `app/HANDOVER.md`.

## 2. Source of truth
`C:\dev\study\Manchester_EEE_Jane_Street_Expanded_Handbook_2026_2028.docx` (text in `handbook.md`). Day 1 (`app/js/days/d01.js`) is the reference for depth, tone and structure.

## 3. Test before reporting done
```
cd C:\dev\study\app
node tests/validate.mjs [day ...]   # structure, self-contained prompts, ≥45 min estimate, code solutions under real Python
node tests/mathcheck.mjs [day ...]  # 0 KaTeX errors required
node tests/e2e.mjs [from] [to]      # Puppeteer drives every day through the UI (server: serve.cmd on :8765)
```
Bash heredocs with large JS bodies fail in this environment: use the Write tool for day files.
