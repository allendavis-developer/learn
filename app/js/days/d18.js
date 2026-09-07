import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(18);

export default {
  title: 'Latches by accident, seeds, waiting times, uncertainty',
  emoji: '🪤',
  strands: ['H', 'S', 'M', 'E'],
  summary: '**Hardware** (H02): what "combinational" really demands, how a missing assignment turns logic into a latch, what a level-sensitive latch does that a register does not, the three ways to make a block complete, and why a clock enable beats a gated clock (runt pulses and skew) — with a cycle-by-cycle latch-vs-register trace you write. **Code** (S01 L3): how a pseudo-random generator works, why the same seed gives the same sequence, and why a seed alone is not a replay — you also need the generator version, the configuration and the failing bytes, including how many draws were already consumed. **Maths** (M06): geometric waiting time, first-step conditioning giving E = 1/p, the distribution and its tail, memorylessness, and the two counting conventions. **Degree** (EEEN11201 / E09 L2): the standard error σ/√n and where the √n comes from, absolute vs relative uncertainty, and propagation into V·I, V/I and I²R.',
  takeaway: 'Give every output a value on every path — a default assignment at the top of the block — or the tool builds a latch to remember it. A latch is transparent while its enable is high; a register looks once, at the edge. Never gate a clock: use an enable, which is just a mux in front of the register. Same seed and same generator version → same sequence, but a replay also needs the configuration, the number of draws consumed and the actual failing bytes. Waiting time: E = 1 + (1 − p)E gives E = 1/p, and the die never owes you a six. σ/√n for the mean; sums add absolute uncertainties in quadrature, products add relative ones, and a square doubles the relative one.',
  steps: [
    // =====================================================================================================
    // HARDWARE: accidental latches, and enables vs gated clocks (H02)
    // =====================================================================================================
    q.info('H', 'Combinational means: output = f(inputs), right now', `A **combinational** block is one whose outputs depend only on the inputs *present at this moment*. No clock, no memory: change an input and the output follows after a propagation delay. A multiplexer, an adder, a decoder.

That definition has a demand hidden in it. If the output depends only on the inputs now, then **every possible combination of inputs must produce a value**. There is no such thing as "in this case, leave it".

Now look at what happens when you write a case statement and one branch forgets to assign Y:

\`\`\`
always_comb
  case (sel)
    0: Y = A;
    1: Y = B;
    2: ;          // nothing assigned
  endcase
\`\`\`

In the sel = 2 case you have not said what Y is, so the only reading left is that Y keeps whatever it had before. Keeping a value is **remembering**, and remembering needs storage. The tool has no choice: it builds a storage element. Since there is no clock here, the element it builds is a **latch**.

The block you drew was logic. The block you got is logic plus hidden memory, and it behaves correctly in every branch you tested.`, {
      terms: [
        ['Combinational logic', 'Logic with no memory: outputs are a function of the current inputs only.'],
        ['always_comb', 'The SystemVerilog block for combinational logic. The tool checks and warns if it is incomplete.'],
        ['Complete assignment', 'Every output gets a value on every possible path through the block.'],
        ['Latch inference', 'The tool creating a storage element because a signal was not assigned on some path.'],
        ['Propagation delay', 'The time for an output to settle after an input changes. Combinational logic has delay, not memory.'],
      ],
      widget: W('holdsim', {})
    }),
    q.info('H', 'A latch is not a register, and that is the problem', `Both a **latch** and a **register** hold a value, so why is one fine and the other a bug?

A **register** (an edge-triggered flip-flop) looks at its input for an instant, at the clock edge, and holds that value for the whole cycle. That single fact is what makes synchronous design work: everything has one clock period to settle, and the timing tool checks that every path from one register to the next fits inside it. One number to close.

A **latch** is **level-sensitive**. While its enable is high it is **transparent** — the output follows the input continuously, with delay, like a wire. When the enable falls it freezes whatever was there. So a latch's output can change at any moment during the enable window, and a signal can race straight through it and onwards into logic that was supposed to have a whole cycle. Instead of "settle by the next edge", the timing question becomes "settle by the moment the enable happens to fall", which depends on logic delays, so the analysis becomes far harder and the tools report it differently.

Add to that: an inferred latch was never in your design intent, so nobody wrote a test for the branch that creates it, and its enable is whatever combination of inputs happens to reach that branch.

Latches are not evil — they are used deliberately in some ASIC design — but a latch you did not ask for means the circuit is not the one you drew. Compare the two waveforms below on the same D and EN.`, {
      terms: [
        ['Latch (level-sensitive)', 'Storage that is transparent while its enable is high and freezes when the enable falls.'],
        ['Register / flip-flop (edge-triggered)', 'Storage that samples its input only at a clock edge and holds for the rest of the cycle.'],
        ['Transparent', 'Output follows input continuously, like a wire with delay.'],
        ['Static timing analysis', 'The tool\'s check that every path settles in time. Clean for edge-triggered logic, awkward across latches.'],
        ['Design intent', 'What you meant to build. An inferred latch is by definition unintended, so it is untested.'],
      ],
      widget: W('latchvsreg', { d: [1, 0, 1, 1, 0, 0, 1, 0], en: [1, 1, 0, 0, 1, 0, 1, 1] })
    }),
    q.info('H', 'Three ways to make the block complete', `All three do the same job: guarantee every path assigns every output.

**1. A default at the top.** Assign every output once at the start of the block, then let later assignments override:

\`\`\`
always_comb begin
  Y = 1'b0;              // default: now no path can leave Y undriven
  case (sel)
    0: Y = A;
    1: Y = B;
  endcase
end
\`\`\`

This is the habit worth having, because it stays correct when someone adds a branch later.

**2. A \`default:\` arm** covering every unlisted case. Good, but it only protects the outputs you remember to assign in it — with several outputs, method 1 is safer.

**3. A conditional expression**, \`assign Y = sel ? A : B;\`. A ternary has no path with no value, so it cannot infer a latch at all.

And the diagnostic: synthesis tools *tell you*. "Latch inferred for signal Y" is not advice, it is a report that the netlist does not match your intent. Treat latch warnings as errors in your build, exactly as you would treat a failing test. Simulation will not save you — it only exercised the branches you thought to write.`, {
      terms: [
        ['Default assignment', 'Assigning every output at the top of the block, before any conditional logic.'],
        ['default: arm', 'The catch-all branch of a case statement, covering every input combination you did not list.'],
        ['Ternary / conditional assign', 'assign Y = c ? A : B — both outcomes are given, so no path is undefined.'],
        ['Synthesis warning', 'A tool message about what it built. "Latch inferred" means the hardware differs from your intent.'],
        ['Warnings as errors', 'Configuring the build to fail on such warnings, so they cannot be scrolled past.'],
      ]
    }),
    q.info('H', 'Clock enables, not gated clocks', `A register that should only update sometimes. Two ways to write it, and only one is safe.

**The gated clock**: AND the clock with a control signal and use the result as the register's clock. It looks efficient — no clock edge, no update — and it is a classic source of silent failure.

Why: \`en\` is produced by ordinary logic, so it changes whenever that logic settles, which may be while the clock is **high**. AND that with the clock and you create a **runt pulse**: a short rising edge in the middle of a cycle that nobody designed and no timing tool analysed. The register loads mid-cycle while the rest of the design is still settling. Even with no runt, the AND gate delays the clock by a gate delay, so registers on the gated clock see the edge later than everyone else: **skew**, which eats hold-time margin on every path crossing between them. And an FPGA's clock network — the special low-skew routing that makes "every register sees the edge at once" true — is not available to a signal that has been through a lookup table.

**The clock enable**: keep the real clock everywhere and let the register decide whether to load.

\`\`\`
always @(posedge clk)
  if (en) q <= d;        // one clock domain, en is an ordinary synchronous input
\`\`\`

In hardware this is a multiplexer in front of the register choosing between \`d\` and \`q\`, and FPGA flip-flops have a dedicated enable pin for it, so it costs nothing. \`en\` is checked for setup like any other data input, all the timing analysis still works, and the behaviour is identical. Slide the moment \`en\` rises below and watch the runt appear.`, {
      terms: [
        ['Clock enable', 'An input deciding whether the register loads at this edge. Implemented as a mux (or a dedicated flip-flop pin).'],
        ['Gated clock', 'A clock ANDed with a control signal and used as a clock. Glitches, skew, unverifiable timing.'],
        ['Runt pulse', 'A short unintended clock pulse created when the gating signal changes while the clock is high.'],
        ['Clock skew', 'The difference in arrival time of one clock edge at different registers. A gate in the clock path adds it.'],
        ['Clock network', 'Dedicated low-skew routing for clocks in an FPGA. Logic outputs do not travel on it.'],
      ],
      widget: W('clken', { tr: 1.25 })
    }),
    q.goal('H', 'In the clock-enable simulation, move the moment `en` rises so that it changes while the clock is HIGH, producing a runt pulse on the gated clock (`clk & en`).', W('clken', { tr: 1.0 }), s => s.runt === true,
      'A rise anywhere in the first half of a cycle lands while clk is high, so clk & en goes high immediately: a rising edge in mid-cycle. The clock-enable flop is unaffected — it still waits for the real edge.'),
    q.mc('H', 'A combinational case statement has three branches and branch 2 does not assign Y. What does synthesis build?', ['A latch, to hold Y\'s previous value in that branch', 'Logic that drives Y to 0 in that branch', 'Logic that drives Y to an unknown but constant value', 'Nothing: the tool refuses to compile'], 0, 'Not assigning something means keeping it, and keeping a value without a clock is exactly a latch. The tool warns, and the handbook treats that warning as a bug report.'),
    q.mc('H', 'What is the cleanest fix for a combinational block whose outputs are not assigned on every path?', ['Assign every output a default value at the top of the block, before the conditional logic', 'Add a clock to the block', 'Delete the case statement', 'Ignore the warning if simulation passes'], 0, 'A default at the top survives someone adding a branch later, and covers every output at once. A default: arm helps too, but only for the signals you remember to assign in it.'),
    q.mc('H', 'What is the essential behavioural difference between a latch and an edge-triggered register?', ['A latch is transparent while its enable is high, so its output can change at any moment; a register samples only at the clock edge and holds for the whole cycle', 'A latch cannot store a 1', 'A register uses more power', 'A latch needs two clocks'], 0, 'Transparency is the whole story. It breaks the "everything settles between edges" argument that static timing analysis depends on.'),
    q.tf('H', 'A synthesis warning about an inferred latch can safely be ignored provided the simulation passes.', false, 'Simulation only exercised the branches you wrote tests for, and the latch is created by the branch you forgot. The netlist now differs from your intent and its timing is not properly analysed.'),
    q.mc('H', 'To make a register load only when `en` is high, which do you write?', ['`if (en) q <= d;` inside the block clocked by the real clk — a clock enable', 'Clock the register with `clk & en` — a gated clock', 'Put a latch in front of the register', 'Use an asynchronous reset driven by en'], 0, 'The enable is a mux in front of the register (FPGAs even have a dedicated pin for it). The gated version invents a new, glitchy, skewed clock for no benefit.'),
    q.mc('H', 'A gated clock `clk & en` is used and `en` happens to rise while `clk` is high. What exactly goes wrong?', ['A runt pulse is created: a rising edge in the middle of the cycle, so the register loads while the rest of the design is still settling', 'The clock frequency doubles', 'The register is held in reset', 'Nothing, provided en is registered'], 0, 'AND-ing a high clock with a rising enable produces an immediate rising edge. The timing tools analysed edges at cycle boundaries; this one is not among them.'),
    q.mc('H', 'Even when the enable never changes during the clock-high phase, a gated clock still causes a problem. What is it?', ['The gate delays the clock, so gated registers see the edge later than ungated ones: skew that eats hold-time margin on paths between them', 'The gate inverts the data', 'The gate consumes all the FPGA\'s lookup tables', 'The gate makes the enable asynchronous'], 0, 'Clock networks exist to make skew negligible. A signal routed through a lookup table is not on that network and arrives late, so a path from a gated register to an ungated one can violate hold time.'),
    q.code('H', 'Trace a latch and a register side by side. `solve(d, en)` takes two equal-length lists of 0/1 values, one entry per clock cycle: `d[k]` and `en[k]` are the levels held during cycle k. Both storage elements start at 0. The **latch** is transparent while the enable is high, so during cycle k its output is `d[k]` if `en[k]` is 1, and its previous value otherwise. The **register** samples at the edge that *starts* cycle k, which sees the values held during cycle k−1: its output during cycle k is `d[k-1]` if `en[k-1]` was 1, otherwise its previous value (and it is 0 during cycle 0, before any edge). Return `[latch_outputs, register_outputs]`.', {
      fn: 'solve',
      starter: 'def solve(d, en):\n    latch, reg = 0, 0\n    ql, qr = [], []\n    for k in range(len(d)):\n        # the register acts on what was held during the PREVIOUS cycle\n        # the latch follows d in THIS cycle whenever en is high\n        pass\n    return [ql, qr]\n',
      tests: [
        { args: [[], []], expect: [[], []], name: 'no cycles at all' },
        { args: [[1], [1]], expect: [[1], [0]], name: 'one cycle: the latch is already transparent, the register has not seen an edge yet' },
        { args: [[1, 1], [0, 0]], expect: [[0, 0], [0, 0]], name: 'enable never high: both hold their initial 0' },
        { args: [[0, 1, 0, 1], [1, 1, 1, 1]], expect: [[0, 1, 0, 1], [0, 0, 1, 0]], name: 'always enabled: the register output is the latch output delayed one cycle' },
        { args: [[1, 0, 1, 1, 0, 0, 1, 0], [1, 1, 0, 0, 1, 0, 1, 1]], expect: [[1, 0, 0, 0, 0, 0, 1, 0], [0, 1, 0, 0, 0, 0, 0, 1]], name: 'the waveform from the simulation: they disagree in five cycles' },
        { args: [[1, 1, 1], [0, 1, 0]], expect: [[0, 1, 1], [0, 0, 1]], name: 'a single enabled cycle: the latch shows it at once, the register a cycle later' },
      ],
      gen: 'def gen():\n    for _ in range(25):\n        n = random.randint(0, 12)\n        yield ([random.randint(0, 1) for _ in range(n)], [random.randint(0, 1) for _ in range(n)])',
      refCode: 'def ref(d, en):\n    l = r = 0; ql = []; qr = []\n    for k in range(len(d)):\n        if k > 0 and en[k-1]: r = d[k-1]\n        if en[k]: l = d[k]\n        ql.append(l); qr.append(r)\n    return [ql, qr]',
      solution: 'def solve(d, en):\n    latch, reg = 0, 0\n    ql, qr = [], []\n    for k in range(len(d)):\n        if k > 0 and en[k - 1]:\n            reg = d[k - 1]\n        if en[k]:\n            latch = d[k]\n        ql.append(latch)\n        qr.append(reg)\n    return [ql, qr]'
    }, 'The two lines are the two behaviours. `if en[k]: latch = d[k]` uses **this** cycle\'s data: the latch is transparent, so new data appears immediately. `if en[k-1]: reg = d[k-1]` uses the **previous** cycle\'s data, because an edge captures what was already stable before it. Order matters in the loop: the register must be updated from cycle k−1 before the latch is updated with cycle k, otherwise you would be modelling a register that sees data from its own cycle — which is exactly the race that nonblocking assignment (`<=`) prevents in real HDL. The fourth test is the general rule when the enable is always high: register output = latch output, delayed by one cycle.'),
    q.mc('H', 'Interview: you are shown a block that infers a latch and asked whether it might still be functionally correct. What is the strongest answer?', ['It can be functionally correct in simulation and still be a defect: the timing is analysed differently, the enable is an accidental function of the inputs, and the branch that creates it is untested', 'It is always functionally wrong', 'It is always fine, since latches store values reliably', 'It is only a problem above 100 MHz'], 0, 'The point is not that latches cannot work; it is that this one was not designed, not analysed and not tested. Correctness you did not intend is a coincidence, not a property.'),
    q.mc('H', 'Interview: a design meets timing in the tool but fails intermittently on the board, and the schematic shows one block clocked by `clk & en`. What is your first hypothesis?', ['The gated clock: a runt pulse or the skew it introduces makes some registers capture at a moment the timing analysis never checked', 'The design is running too slowly', 'The reset polarity is wrong', 'The enable signal is unused'], 0, 'Intermittent failures that timing analysis does not predict point at edges the analysis never saw. Replacing the gated clock with an enable puts every path back under the tool\'s control.'),

    // =====================================================================================================
    // CODE: seeds and replay (S01 L3)
    // =====================================================================================================
    q.info('S', 'Random tests are valuable; unrepeatable failures are not', `Hand-written tests only check the cases you thought of. Random tests generate cases you did not, which is exactly why they find real bugs — and why the bugs they find arrive at the worst possible moment: one failing run in the middle of a thousand, with an input you no longer have.

So random testing is only useful together with **determinism**: the ability to make the same run happen again, exactly, on demand. The debugging discipline from yesterday — preserve, reproduce, first wrong output — needs a failure you can summon.

That is what a **seed** buys you. Everything today is about how a seed produces repeatable randomness, and about the parts of a replay that a seed alone does **not** capture.`, {
      terms: [
        ['Random testing', 'Generating inputs at random to explore cases nobody wrote by hand.'],
        ['Determinism', 'Same inputs and same code give the same outputs, every time, on every machine.'],
        ['Replay', 'Re-running a past execution exactly, to see the same failure again.'],
        ['Flaky failure', 'A failure that cannot be reproduced. It cannot be debugged and cannot be shown to be fixed.'],
      ]
    }),
    q.info('S', 'How a "random" generator is completely predictable', `A **pseudo-random number generator** is not random at all. It holds a number, its **state**, and each time you ask for a value it applies a fixed arithmetic rule to that state and gives you part of the result.

The simplest real one, a **linear congruential generator**:

\`\`\`
state = (1103515245 * state + 12345) % 2**31
return state % 100
\`\`\`

Multiply, add, wrap. The outputs pass casual statistical tests and look shuffled — but nothing here is uncertain. Start from the same **seed** (the initial state) and you get the same sequence, in the same order, for ever. That is why it is called *pseudo*-random.

Two consequences follow, and both matter today.

**Reproducibility is free.** \`random.seed(4471)\` before a test makes the whole "random" run repeatable.

**Position matters as much as the seed.** The sequence is a fixed list, and each draw moves you one step along it. Insert one extra \`random.random()\` call anywhere earlier — say in a new logging line — and everything after it shifts by one position. A test that failed with seed 4471 may now pass, not because you fixed anything, but because it is running a different part of the sequence.`, {
      terms: [
        ['PRNG', 'Pseudo-random number generator: a deterministic algorithm whose output looks random.'],
        ['State', 'The number the generator holds between calls. Each draw updates it.'],
        ['Seed', 'The initial state. Same seed and same algorithm give the same sequence.'],
        ['LCG', 'Linear congruential generator: state = (a·state + c) mod m. The simplest usable PRNG.'],
        ['Draw', 'One request for a value, which advances the state by one step.'],
      ],
      widget: W('seedgen', {})
    }),
    q.info('S', 'A seed is not a replay', `The handbook is blunt about this: **a seed is not sufficient on its own**. A recorded failure needs four things.

**The seed.** Obviously — but only useful with the rest.

**The generator version.** Python's \`random\` is a specific algorithm, and library upgrades have changed how values are derived before. NumPy explicitly versions its generators for exactly this reason. "seed 4471" means nothing without "and this generator, this version".

**The configuration.** Message sizes, rates, the number of iterations, feature flags. The same numbers consumed by a differently configured test produce a different scenario. Also record how many draws were consumed before the interesting part, because the sequence is positional.

**The actual failing bytes.** The strongest evidence of all, because it survives everything above. Save the exact input that failed, and it can be replayed in a year, by someone else, on a different library version, with no generator at all.

Then **shrink** it. A 10,000-message failing input is evidence; the 3-message input that still fails is a regression test. Halve, keep whichever half still fails, repeat — yesterday's bisect, applied to inputs. What you commit alongside the fix is the small case.`, {
      terms: [
        ['Generator version', 'Which algorithm produced the numbers. Libraries change theirs; a seed is meaningless without it.'],
        ['Configuration', 'The parameters of the run: sizes, rates, flags, and how many draws were consumed first.'],
        ['Failing bytes', 'The literal input that failed, saved. The one piece of evidence that outlives every version change.'],
        ['Shrinking', 'Reducing a large failing input to the smallest one that still fails.'],
        ['Regression test', 'The permanent, small test committed with the fix, so the bug cannot come back unnoticed.'],
      ]
    }),
    q.mc('S', 'A script calls `random.seed(7)` and then draws ten numbers. It is run twice, on one machine, with one library version, with nothing else changed. What do the two runs produce?', ['Identical sequences', 'Different sequences, since the generator uses the clock', 'The sequence 7, 7, 7, …', 'An error, because a seed may only be used once'], 0, 'The seed sets the generator\'s state and the update rule is fixed arithmetic. Determinism is the entire point of seeding.'),
    q.multi('S', 'A random test failed on a build server. What should the recorded failure contain so it can be replayed later?', ['The seed', 'The generator or library version', 'The test configuration, including how many draws were consumed first', 'The actual failing input bytes', 'A photograph of the terminal'], [0, 1, 2, 3], 'The handbook: a seed is not sufficient alone. Version and configuration decide what the seed means, and the failing bytes survive changes to both.'),
    q.tf('S', 'Saving only the seed is enough to reproduce a random test failure a year later.', false, 'Library versions change the algorithm, configuration changes what the numbers are used for, and any extra draw added upstream shifts the whole sequence. The failing bytes themselves are the durable evidence.'),
    q.mc('S', 'You add one extra `random.random()` call early in a test for a logging feature, and a previously failing seed now passes. What has happened?', ['Every later draw shifted one position along the sequence, so the test is now exercising a different scenario — the bug is not fixed', 'The bug is fixed, since the test passes', 'The seed has been consumed and must be renewed', 'The generator has detected the change and reseeded'], 0, 'The sequence is a fixed list and each draw advances the position. This is why the configuration and the draw count are part of a replay record, and why the failing bytes matter more than the seed.'),
    q.mc('S', 'A random test fails on a 10,000-message input. What is the best next step?', ['Shrink it to the smallest input that still fails, and commit that as a regression test', 'Rerun with 1,000,000 messages', 'Delete the test as unreliable', 'Try new seeds until one passes'], 0, 'A minimal case is readable, fast and permanent. Halving the input and keeping whichever half still fails is the same binary search used to bisect history.'),
    q.code('S', 'Implement a replayable generator. `solve(seed, n, skip)` uses this exact rule, starting from `state = seed`: each draw sets `state = (1103515245 * state + 12345) % (2**31)` and produces `state % 100`. Discard the first `skip` draws, then return the next `n` draws as a list. (`skip` is what a replay record needs alongside the seed: the sequence is positional, so a run that consumed some draws before the interesting part must reproduce that too.) A 50,000-draw replay must finish within the time budget.', {
      fn: 'solve',
      starter: 'def solve(seed, n, skip):\n    state = seed\n    out = []\n    for i in range(skip + n):\n        state = (1103515245 * state + 12345) % (2 ** 31)\n        # keep this draw only once the skipped ones are behind you\n        pass\n    return out\n',
      tests: [
        { args: [1, 5, 0], expect: [90, 75, 84, 81, 74], name: 'seed 1, the first five draws' },
        { args: [1, 3, 2], expect: [84, 81, 74], name: 'seed 1 skipping two draws: the tail of the run above, which is what replay means' },
        { args: [4471, 4, 0], expect: [84, 69, 98, 15], name: 'a different seed gives a different sequence' },
        { args: [4471, 2, 2], expect: [98, 15], name: 'seed 4471, resuming after two consumed draws' },
        { args: [0, 3, 0], expect: [45, 6, 75], name: 'seed 0 is a perfectly ordinary seed' },
        { args: [7, 0, 0], expect: [], name: 'asking for no values' },
      ],
      gen: 'def gen():\n    for _ in range(20):\n        yield (random.randint(0, 10**6), random.randint(0, 20), random.randint(0, 20))',
      refCode: 'def ref(seed, n, skip):\n    s = seed; out = []\n    for i in range(skip + n):\n        s = (1103515245 * s + 12345) % (2 ** 31)\n        if i >= skip: out.append(s % 100)\n    return out',
      speed: { gen: 'def gen():\n    return [12345, 50000, 50000]', budgetMs: 1500, label: '50,000 draws after skipping 50,000' },
      solution: 'def solve(seed, n, skip):\n    state = seed\n    out = []\n    for i in range(skip + n):\n        state = (1103515245 * state + 12345) % (2 ** 31)\n        if i >= skip:\n            out.append(state % 100)\n    return out'
    }, 'Test 2 is the whole lesson: `solve(1, 3, 2)` equals the last three values of `solve(1, 5, 0)`, because the generator is a fixed list and `skip` is just a position in it. That is why "seed 4471" alone does not reproduce a failure — the run that failed had already consumed some draws, and starting from position 0 puts you somewhere else in the sequence. Note the modulo keeps the state below 2³¹, so every multiply stays a small fixed-size integer and 100,000 draws cost microseconds each; without it the numbers would grow without limit and each multiply would get slower, turning a linear loop into something much worse.'),
    q.mc('S', 'Interview: your generator is `state = (a*state + c) % m`. A colleague removes the `% m`, arguing that Python integers are unbounded so nothing overflows. What breaks?', ['The state grows without bound, so every multiplication gets slower and the loop stops being linear — and the output distribution changes completely', 'Nothing: the sequence is identical', 'The generator becomes truly random', 'It only breaks for negative seeds'], 0, 'The modulo is both the mathematics and the performance. Big integers make each step cost more than the last, and the values no longer wrap into a fixed range, so `% 100` no longer samples the range evenly.'),
    q.mc('S', 'Interview: you must let someone else reproduce a failure exactly, and you can send them only one thing. What do you send?', ['The failing input bytes themselves, since they do not depend on any library version, configuration or draw position', 'The seed', 'The name of the generator', 'The stack trace'], 0, 'A seed is an instruction for regenerating the input, and it only works if the algorithm, the version, the configuration and the draw position all match. The bytes are the input.'),

    // =====================================================================================================
    // MATHS: geometric waiting time (M06)
    // =====================================================================================================
    q.info('M', 'How long until it happens? First-step conditioning', `Repeat an experiment until something works: roll until a six, retry a packet until it is acknowledged, sample until you get a valid reading. Each attempt succeeds with probability **p**, independently of the others. How many attempts on average?

The elegant derivation is **first-step conditioning**: think about the very first attempt, and use the fact that a failure leaves you in *exactly* the situation you started in.

Let E be the expected number of attempts. You always spend one attempt. With probability p it works and you are finished. With probability 1 − p it fails, and now you need E more attempts — the same E, because nothing about the experiment has changed. So

**E = 1 + (1 − p)·E**

Solve it: E − (1 − p)E = 1, so pE = 1 and **E = 1/p**.

Expected rolls until a six: 1/(1/6) = **6**. Expected flips until a head: **2**. Expected attempts when p = 0.01: **100**.

Notice what the derivation avoided. There was no infinite sum, no distribution, no algebra beyond one line — just the observation that a failure returns you to the start. That trick reappears throughout stopping problems.`, {
      terms: [
        ['Trial', 'One independent attempt, succeeding with probability p.'],
        ['Waiting time', 'The number of trials up to and including the first success.'],
        ['First-step conditioning', 'Writing E in terms of what happens on the first trial, then solving the resulting equation.'],
        ['Geometric distribution', 'The distribution of that waiting time: P(T = k) = (1 − p)^(k−1)·p.'],
      ],
      widget: W('geomwait', { p: 1 / 6 })
    }),
    q.info('M', 'The distribution, its tail, and memorylessness', `The waiting time T has an easy distribution. To need exactly k trials, the first k − 1 must fail and the k-th must succeed:

**P(T = k) = (1 − p)^(k−1) · p.**

The tail is even easier and often more useful. To need **more than** k trials, the first k must all fail:

**P(T > k) = (1 − p)^k.**

With p = 1/6: P(more than 6 rolls without a six) = (5/6)⁶ = 0.335. So a third of the time you wait longer than the average, which is worth remembering whenever someone quotes a mean latency.

Now the property that trips everybody up. You have rolled five times with no six. How many more rolls do you expect? **Six.** The dice have no memory: P(T > k + j | T > k) = (1 − p)^j, the same as starting fresh. That is **memorylessness**, and the geometric distribution is the only discrete distribution with it.

The "gambler's fallacy" is the belief that a six becomes due. Nothing in the mechanism records the misses. What *is* true is that long runs of failure are rare — but once you are in one, the future looks exactly as it did at the start.`, {
      terms: [
        ['P(T = k)', '(1 − p)^(k−1)·p: fail k − 1 times, then succeed.'],
        ['Tail probability P(T > k)', '(1 − p)^k: the first k trials all fail. Usually the easiest thing to compute.'],
        ['Memoryless', 'Past failures do not change the future distribution of the wait.'],
        ['Gambler\'s fallacy', 'Believing that a run of failures makes success more likely. The mechanism records nothing.'],
      ]
    }),
    q.info('M', 'Two conventions, one off-by-one', `Textbooks use two different definitions of "the geometric distribution", and mixing them up is the most common way to lose a mark or an interview.

**Convention 1 — trials until (and including) the first success.** T = 1, 2, 3, … Mean **1/p**. This is the natural engineering count: "how many attempts did that take?"

**Convention 2 — failures before the first success.** F = T − 1 = 0, 1, 2, … Mean **(1 − p)/p**, exactly one less.

For a die: 6 rolls until a six, or 5 failures before it. Both are right; they answer different questions.

Two habits protect you. **Say which one you mean** ("expected number of rolls, counting the successful one"). And **sanity-check with p = 1**: if success is certain, the number of trials is 1 and the number of prior failures is 0. Convention 1 gives 1/1 = 1 ✓; convention 2 gives 0/1 = 0 ✓. That one substitution catches the mix-up instantly.`, {
      terms: [
        ['Trials until success', 'Counts the successful attempt. Mean 1/p.'],
        ['Failures before success', 'Excludes the successful attempt. Mean (1 − p)/p.'],
        ['Sanity check', 'Substituting an extreme value (here p = 1) to see which formula behaves correctly.'],
        ['Stating conventions', 'Saying explicitly what you are counting. Half of quantitative disagreements are definitional.'],
      ]
    }),
    q.num('M', 'A fair six-sided die is rolled repeatedly until the first six appears. What is the expected number of rolls, counting the successful one?', 6, 'Each roll succeeds with p = 1/6 independently, so E = 1/p = 6. From first-step conditioning: E = 1 + (5/6)E gives (1/6)E = 1.'),
    q.num('M', 'A fair coin is flipped repeatedly until the first head. Expected number of flips, counting the head?', 2, 'p = ½, so E = 1/p = 2.'),
    q.mc('M', 'Which equation expresses first-step conditioning for the expected number of trials E until a first success with probability p per trial?', ['E = 1 + (1 − p)·E', 'E = p·E', 'E = 1/(1 − p)', 'E = p + E'], 0, 'One trial is always spent. With probability 1 − p it fails and you face the identical problem again, needing E more. Solving gives E = 1/p.'),
    q.mc('M', 'A fair die has been rolled five times with no six. What is the expected number of further rolls until a six?', ['6 — the past does not change anything', '1', '5', '11'], 0, 'Memorylessness. Each roll is a fresh 1/6 and the die records nothing about the misses. Believing a six is "due" is the gambler\'s fallacy.'),
    q.num('M', 'A fair six-sided die is rolled repeatedly until the first six. What is the probability that this takes exactly 3 rolls? Give it to 4 d.p.', 0.1157, 'P(T = 3) = (5/6)² × (1/6) = 25/216 = 0.1157: two misses then a hit.', { tol: 0.0006 }),
    q.num('M', 'A fair six-sided die is rolled repeatedly until the first six. What is the probability that more than 4 rolls are needed, to 4 d.p.?', 0.4823, 'P(T > 4) = (5/6)⁴ = 625/1296 = 0.4823. Only the "first four all miss" event matters, which is why tail probabilities are usually the easiest to compute.', { tol: 0.0006 }),
    q.num('M', 'A fair six-sided die is rolled repeatedly until the first six. What is the expected number of **failures before** the first six (not counting the successful roll)?', 5, '(1 − p)/p = (5/6)/(1/6) = 5, exactly one less than the 6 trials including the success. Always say which of the two you are counting.'),
    q.num('M', 'A biased coin comes up heads with probability 0.3 on each flip, independently. Expected number of flips until the first head, counting it, to 3 d.p.?', 3.333, 'E = 1/p = 1/0.3 = 3.333 flips.', { tol: 0.005 }),
    q.num('M', 'Interview: two players take turns rolling a fair six-sided die, and the first to roll a six wins. Player A rolls first. What is the probability that A wins, to 4 d.p.?', 0.5455, 'A wins on their first roll (1/6), or both miss and the game restarts with A to roll. So P = 1/6 + (5/6)² · P, giving P(1 − 25/36) = 1/6, P = (1/6)(36/11) = 6/11 = 0.5455. The same first-step trick as the waiting time: after a full round of misses, the position is identical.', { tol: 0.0006 }),
    q.num('M', 'Interview: a link drops each packet independently with probability 0.02, and a dropped packet is retransmitted until it gets through. What is the expected number of transmissions per packet, counting the successful one, to 4 d.p.?', 1.0204, 'Success probability per attempt is 0.98, so E = 1/0.98 = 1.0204 transmissions. The 2% loss costs about 2% extra traffic — but the *tail* is what sizes a buffer: P(more than 3 attempts) = 0.02³ = 8 × 10⁻⁶.', { tol: 0.0006 }),
    q.mc('M', 'Interview: a candidate computes the expected wait for a success with p = 1/6 as Σ k·(5/6)^(k−1)·(1/6) and gets stuck on the infinite sum. What is the shortcut, and why is it valid?', ['First-step conditioning: E = 1 + (1 − p)E, valid because a failed trial leaves the situation exactly as it was at the start', 'Approximate the sum by its first ten terms', 'Assume the trials are dependent so the sum telescopes', 'Use E = p, which is the standard result'], 0, 'The sum is correct and unnecessary. Independence and identical trials mean a failure resets you to the original problem, which turns an infinite sum into a one-line equation.'),
    q.mc('M', 'Interview: someone argues "the mean wait for a six is 6 rolls, so waiting 10 rolls would be strange". How do you correct them?', ['P(T > 10) = (5/6)¹⁰ ≈ 0.16, so about one time in six you wait longer than 10 — a geometric wait has a long tail, and the mean is not a typical value', 'They are right: 10 rolls is essentially impossible', 'The mean is actually 10 for a fair die', 'Waits longer than the mean are impossible by definition'], 0, '(5/6)¹⁰ = 0.1615. Even P(T > 6) = (5/6)⁶ = 0.335: a third of waits exceed the mean. Quoting a mean latency without its tail is how capacity planning goes wrong.'),

    // =====================================================================================================
    // DEGREE: uncertainty propagation (EEEN11201 / E09 L2)
    // =====================================================================================================
    q.info('E', 'The mean of n readings: where the √n comes from', `Take one reading of a noisy voltage. Its random error has a typical size, the **standard deviation** σ: about how far a single reading lands from the true value.

Take n readings and average them. The average is better — but by how much?

Here is the reasoning. Random errors are independent and scatter both ways, so they partly cancel. The quantity that adds cleanly for independent errors is not σ but σ² (the **variance**). Adding n readings gives a total whose variance is n·σ². Dividing that total by n to get the mean divides the variance by n²:

variance of the mean = n·σ²/n² = σ²/n.

Take the square root and you have the **standard error of the mean**:

**SE = σ/√n.**

The √ is the important part. Four times as many readings halve the uncertainty; a hundred times as many divide it by ten. Improvement is real but expensive, and there is a floor: **σ/√n only shrinks the random part**. A calibration offset is identical in all n readings, so averaging leaves it completely untouched. Beyond a certain n you are just measuring your own bias very precisely.`, {
      terms: [
        ['Standard deviation σ', 'The typical distance of a single reading from the mean: the size of the scatter.'],
        ['Variance σ²', 'The square of the standard deviation. Variances of independent quantities add; standard deviations do not.'],
        ['Standard error σ/√n', 'The uncertainty of the mean of n readings.'],
        ['Diminishing returns', 'Because of the square root, each halving of the uncertainty costs four times the readings.'],
        ['Floor', 'The systematic part, which averaging cannot reduce at all.'],
      ],
      widget: W('uncertainty', { n: 4, sigma: 0.10 })
    }),
    q.info('E', 'Absolute, relative, and how uncertainty travels through a formula', `Two ways to write the same uncertainty. **Absolute**: 12.0 ± 0.1 V, in the units of the quantity. **Relative**: 0.1/12.0 = 0.83 %, as a fraction. Which one you use depends on the operation, and that is the whole content of the propagation rules.

**Sums and differences** — combine the **absolute** uncertainties. If y = a + b, then a wobble of δa in a moves y by δa regardless of how big a is. For independent random errors:

δy = √(δa² + δb²).

**Products and quotients** — combine the **relative** uncertainties. Here is why. Write a = a₀(1 + α) and b = b₀(1 + β) with small fractional errors α and β. Then

a·b = a₀b₀(1 + α)(1 + β) = a₀b₀(1 + α + β + αβ) ≈ a₀b₀(1 + α + β),

because αβ is tiny (0.01 × 0.02 = 0.0002). So the fractional errors add. For independent random errors, in quadrature:

δy/y = √((δa/a)² + (δb/b)²).

The same works for a/b: dividing by (1 + β) is multiplying by about (1 − β), which flips a sign that squaring removes.

**Powers** multiply the relative uncertainty: y = aⁿ gives δy/y = n·(δa/a). It follows from the product rule — a² is a×a, and the same 1 % error appears twice and reinforces itself, giving 2 %. Note it does **not** go in quadrature with itself: the two factors are the same measurement, not two independent ones.`, {
      terms: [
        ['Absolute uncertainty δa', 'The ± in the same units as the quantity: 12.0 ± 0.1 V.'],
        ['Relative uncertainty δa/a', 'The ± as a fraction or percentage: 0.1/12.0 = 0.83 %.'],
        ['Quadrature', 'Combining as √(x² + y²), the correct rule for independent random errors.'],
        ['Propagation', 'Working out the uncertainty of a computed result from the uncertainties of its inputs.'],
        ['Power rule', 'y = aⁿ ⇒ δy/y = n·δa/a. A square doubles the relative uncertainty.'],
      ]
    }),
    q.info('E', 'Quadrature or plain addition? And what must never go in either', `Why √(1² + 2²) = 2.24 % rather than 1 + 2 = 3 %?

Because independent random errors are **as likely to cancel as to reinforce**. For both to be at their maximum and in the same direction is rare, so adding them outright describes a case that almost never happens. Adding variances — squares — and taking the root gives the honest typical spread.

So there are two legitimate answers to "combine ±1 % and ±2 %", and you must say which you are giving:

- **Worst case: 3 %.** A guaranteed bound, and what a datasheet accuracy specification means. Use it when you must promise something, or when the errors might not be independent.
- **Statistical: 2.24 %.** The typical combined spread of independent random errors. Use it for repeated measurements and quoted uncertainties.

And the thing that belongs in neither: a **systematic** error. If your meter reads 0.05 V high on every reading, that is not a random contribution to be combined — it is a known correction. Subtract it first, then propagate what remains. Putting a bias into a quadrature sum both understates it (squares shrink it) and pretends it might cancel, which it never will.`, {
      terms: [
        ['Worst case (linear sum)', 'Adding uncertainties outright. A guaranteed bound; how datasheet specs are stated.'],
        ['Statistical (quadrature)', 'Adding in quadrature. The typical spread when the errors are independent and random.'],
        ['Independence', 'The assumption behind quadrature. Errors from a shared cause are not independent and should not be combined that way.'],
        ['Correction', 'Subtracting a known systematic error before propagating anything.'],
      ]
    }),
    q.num('E', 'Sixteen readings of a voltage have a standard deviation of 0.20 V. What is the standard error of their mean, in volts?', 0.05, 'SE = σ/√n = 0.20/√16 = 0.20/4 = 0.05 V.', { unit: 'V', tol: 0.002 }),
    q.mc('E', 'To halve the standard error of a mean, how many readings do you need?', ['Four times as many', 'Twice as many', 'Eight times as many', 'The same number, on a higher-resolution meter'], 0, 'SE = σ/√n, so halving it needs √n to double, which needs n × 4. Resolution is a different quantity entirely and does not enter this formula.', { grid: true }),
    q.mc('E', 'Why do independent random uncertainties combine as √(δa² + δb²) rather than δa + δb?', ['Independent errors are as likely to cancel as to reinforce, so plain addition describes a rare worst case; variances are what add for independent quantities', 'Because square roots are easier to compute', 'Because relative uncertainties must always be squared', 'Because it makes the answer larger, which is safer'], 0, 'Quadrature gives the typical spread; the plain sum gives a guaranteed bound. Both are useful, and you must say which you are quoting.'),
    q.num('E', 'A voltage is measured as V = 12.0 V ± 1 % and a current as I = 2.00 A ± 2 %, the two errors being independent and random. What is the uncertainty in the power P = V·I, in watts, to 2 d.p.?', 0.54, 'A product combines relative uncertainties: √(1² + 2²) = √5 = 2.236 %. P = 12.0 × 2.00 = 24 W, so δP = 0.02236 × 24 = 0.537 W.', { unit: 'W', tol: 0.02 }),
    q.num('E', 'A voltage is measured as V = 12.0 V ± 1 % and a current as I = 2.00 A ± 2 %, independent and random. What is the uncertainty in the resistance R = V/I, in ohms, to 3 d.p.?', 0.134, 'A quotient combines relative uncertainties exactly as a product does: √(1² + 2²) = 2.236 %. R = 12.0/2.00 = 6 Ω, so δR = 0.02236 × 6 = 0.134 Ω.', { unit: 'Ω', tol: 0.004 }),
    q.num('E', 'A rectangle is measured as L = 100 ± 1 mm and W = 50 ± 1 mm, the errors independent and random. What is the uncertainty in the perimeter 2L + 2W, in mm, to 2 d.p.?', 2.83, 'A sum combines absolute uncertainties. Doubling a length doubles its absolute uncertainty, so the terms are 2 mm and 2 mm: √(2² + 2²) = √8 = 2.83 mm.', { unit: 'mm', tol: 0.03 }),
    q.num('E', 'A current is measured to ±2 % and a resistance to ±1 %, independently. What is the relative uncertainty in the power P = I²R, in per cent, to 2 d.p.?', 4.12, 'The square doubles the current\'s relative uncertainty to 4 % (the same measurement appears twice, so it reinforces itself rather than combining in quadrature with itself). Then combine with R: √(4² + 1²) = √17 = 4.12 %.', { unit: '%', tol: 0.03 }),
    q.mc('E', 'Your meter is known to read 0.05 V high on every reading. What should you do before propagating uncertainties?', ['Subtract the 0.05 V systematic offset, then propagate only the remaining random uncertainty', 'Include 0.05 V as another term in the quadrature sum', 'Take more readings so it averages out', 'Nothing: a small offset is negligible'], 0, 'A known bias is a correction, not an uncertainty. Putting it in a quadrature sum both shrinks it and pretends it might cancel, which a systematic error never does.'),
    q.mc('E', 'Two uncertainties of ±1 % and ±2 % are combined. Which pair of values is right?', ['Worst case 3 %, statistical 2.24 %', 'Worst case 2.24 %, statistical 3 %', 'Both 3 %', 'Both 2.24 %'], 0, 'Plain addition 1 + 2 = 3 % is the guaranteed bound and is how datasheet specs are stated. Quadrature √(1 + 4) = 2.24 % is the typical spread for independent random errors.'),
    q.num('E', 'Exam-style: a resistor dissipates power P = V²/R. The voltage across it is measured as V = 5.00 ± 0.05 V and its resistance as R = 100 ± 2 Ω, independently. State the uncertainty in P, in milliwatts, to 2 d.p.', 7.07, 'Relative uncertainties: δV/V = 0.05/5.00 = 1 %, doubled by the square to 2 %; δR/R = 2/100 = 2 %. Combine: √(2² + 2²) = 2.828 %. P = 25/100 = 0.250 W, so δP = 0.02828 × 0.250 = 0.00707 W = 7.07 mW.', { unit: 'mW', tol: 0.05 }),
    q.num('E', 'Exam-style: a rectangle is measured as L = 100 ± 1 mm and W = 50 ± 1 mm, independently. State the uncertainty in its area L·W, in mm², to 1 d.p.', 111.8, 'An area is a product, so combine relative uncertainties: δL/L = 1 %, δW/W = 2 %. √(1² + 2²) = 2.236 %. A = 5000 mm², so δA = 0.02236 × 5000 = 111.8 mm². Note the contrast with the perimeter, where the absolute uncertainties combined instead.', { unit: 'mm²', tol: 1 }),
    q.num('E', 'Exam-style: a resistance is found from R = V/I with V = 12.0 ± 0.1 V and I = 2.00 ± 0.05 A, the errors independent and random. State the resistance uncertainty in ohms, to 3 d.p.', 0.158, 'δV/V = 0.1/12.0 = 0.833 %; δI/I = 0.05/2.00 = 2.5 %. Quadrature: √(0.833² + 2.5²) = √6.944 = 2.635 %. R = 6.00 Ω, so δR = 0.158 Ω. The current dominates: improving the voltmeter would be wasted effort.', { unit: 'Ω', tol: 0.005 }),
    q.num('E', 'Exam-style: repeated readings of a voltage have a standard deviation of 0.15 V. How many readings are needed for the standard error of the mean to fall to 0.03 V?', 25, 'σ/√n = 0.03 → √n = 0.15/0.03 = 5 → n = 25. Halving it again to 0.015 V would need 100 readings: the square root makes precision expensive.'),
    q.num('E', 'Exam-style: a length is measured as L = 2.00 ± 0.02 m. State the relative uncertainty in the volume of a cube of side L, in per cent.', 3, 'Volume = L³, and the power rule multiplies the relative uncertainty by 3: δL/L = 0.02/2.00 = 1 %, so δV/V = 3 %. The same measurement appears three times and reinforces itself, so it does not combine in quadrature with itself.', { unit: '%', tol: 0.05 }),
    q.mc('E', 'A student averages 400 readings from a meter that is known to read 0.1 V high, and quotes the result as accurate to σ/√400. What is wrong?', ['Averaging only shrinks the random part; the 0.1 V systematic offset is identical in all 400 readings and survives untouched, so the quoted accuracy is a false claim', 'Nothing: 400 readings is plenty', '√400 should be 400', 'The standard error formula does not apply above 100 readings'], 0, 'They have measured their own bias very precisely. σ/√n is a statement about repeatability alone; accuracy needs calibration against a standard.'),
    q.mc('E', 'Exam-style: in a measurement of R = V/I, the voltage contributes 0.8 % and the current contributes 2.5 % of relative uncertainty. Which change most improves the result, and why?', ['Improve the current measurement: in quadrature the largest term dominates, so reducing 2.5 % matters far more than reducing 0.8 %', 'Improve the voltage measurement, since voltage is the numerator', 'Improve both equally, since they combine equally', 'Take more readings, which fixes both'], 0, '√(0.8² + 2.5²) = 2.62 %. Halving the current term gives √(0.8² + 1.25²) = 1.48 %; halving the voltage term gives 2.53 %. Always find and attack the dominant term of an error budget first.'),
    ...genius(q, 18),
  ]
};
