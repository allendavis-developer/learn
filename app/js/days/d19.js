import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(19);

export default {
  title: 'Counters & UART frames, unit tests, induction, Taylor & trapezoid',
  emoji: '📡',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Handbook week 3, H02 L3. **Hardware**: why a counter is a register plus an adder, why a divider produces a slower *enable* rather than a new clock, why a UART frame needs a start bit, why the data goes LSB first, and how much baud-divisor rounding error a receiver can tolerate (with a cycle-level transmitter model). **Code** (S03/H05): what a unit test is for, why a test earns its place by the bug it distinguishes, boundary and mutation thinking, a requirements checker and a trapezoid integrator you verify on a known integral. **Maths** (M01): why "true for n = 1, 2, 3, 4" is not a proof, induction as dominoes, a fully worked proof, strong induction and loop invariants. **Degree** (MATH19611 / E02 L3): where Taylor\'s series comes from (matching derivatives), what the error term means, why the trapezoid rule\'s error shrinks with h² and Simpson\'s with h⁴, and Newton–Raphson as the tangent line used again.',
  takeaway: 'A counter is a register + adder; a divider makes a one-cycle **enable** every N clocks, never a new clock. UART: idle high, start 0 (the edge the receiver aligns to), 8 data bits LSB first, stop 1; divisor = clock/baud, and a few percent of error is survivable because every start bit re-aligns. A test is valuable for the behaviour it distinguishes; boundaries catch what random never hits. Induction: base case + step, each for *every* k. Taylor: match derivatives, the error is about the first omitted term. Trapezoid error ∝ h² (halve h, ÷4); Simpson ∝ h⁴; verify on ∫₀^π sin x dx = 2 first.',
  steps: [
    // =====================================================================================================
    // HARDWARE: counters, dividers, the UART frame, the baud divisor
    // =====================================================================================================
    q.info('H', 'A counter is a register plus an adder', `Day 15 gave you the **register**: a row of flip-flops that copies its input on the clock edge and holds it in between. On its own a register only remembers. To *count*, wire an **adder** from the register\'s output back to its input, with the constant 1 on the other adder input:

\`\`\`
always @(posedge clk)
    count <= count + 1;     // next value = old value + 1, sampled at the edge
\`\`\`

Every edge, the adder has already computed \`count + 1\` from the *current* value (combinational logic works continuously), and the register captures it. Nonblocking \`<=\` (Day 15) is exactly what you want: the right-hand side uses the pre-edge value. That is the whole machine: **register = memory, adder = the step, clock = when to take the step**. Compare a software loop \`count = count + 1\`: same arithmetic, but in hardware the "loop" is a physical wire from output to input and the clock decides the pace.

Two consequences. First, a w-bit counter cannot hold 2^w, so after all-ones it **wraps** to 0 (Day 1\'s \`260 % 256 = 4\`). Second, add an **enable** input and the counter only steps on edges where enable is 1: \`if (en) count <= count + 1;\`. Enables are how one clock drives things that move at different speeds, which is the next card.

Press the clock below: the register holds, the adder proposes, the comparator watches for the terminal count.`, {
      terms: [
        ['Counter', 'A register whose next value is its current value plus one (or plus a step). It advances only on clock edges.'],
        ['Adder (increment)', 'Combinational logic that continuously computes count + 1 from the register output. The register captures it at the edge.'],
        ['Enable', 'An input that gates the update: the register only takes its new value on edges where enable is 1. Otherwise it holds.'],
        ['Wrap', 'What a w-bit counter does after 2^w − 1: the carry out is lost and the value returns to 0.'],
        ['Terminal count', 'The value at which a counter is told to stop or restart, e.g. N − 1 for a divide-by-N.'],
      ],
      widget: W('counterdiv', { divisor: 4 })
    }),
    q.info('H', 'A clock divider makes a slower enable, not a slower clock', `You have a 50 MHz clock and something that must happen 115,200 times a second (one UART bit). Divide: 50,000,000 / 115,200 ≈ 434 clock cycles per bit. So build a counter that counts 0 … 433 and emits a one-cycle pulse, **tick**, when it reaches 433, then wraps to 0. tick is high for one clock in every 434: a **divide-by-434**.

**The tempting mistake** is to treat tick as a *new clock* and write \`always @(posedge tick)\`. Do not. A clock in an FPGA travels on special low-skew wiring so that every register sees the edge at the same instant; tick comes out of ordinary logic, arrives at different registers at different times, can glitch while the comparator settles, and the timing tools can no longer check paths that cross between the two "clocks" (that is a clock-domain crossing, handbook H07). The handbook rule: **prefer clock enables to inventing a new logic-gated clock.**

**The right structure**: every register in the UART keeps the 50 MHz clock and takes tick as its enable:

\`\`\`
always @(posedge clk)
    if (tick) bit_index <= bit_index + 1;   // advances once per bit period
\`\`\`

Everything stays in one clock domain, the tools verify every path, and the design still moves at the slow rate. The counter\'s width follows Day 1: 434 needs 9 bits (2⁹ = 512 ≥ 434; 2⁸ = 256 is too small).`, {
      terms: [
        ['Clock divider', 'A counter that produces one pulse every N clock cycles. The pulse is used as an enable.'],
        ['Clock enable', 'A signal that says "this edge counts". Registers keep the real clock and simply hold when the enable is 0.'],
        ['Gated / derived clock', 'A clock made from logic (an AND gate, a counter output). Skew, glitches and unverifiable timing: avoid.'],
        ['Clock domain', 'The set of registers driven by one clock. Signals crossing between domains need special care (H07).'],
        ['Skew', 'The difference in arrival time of one clock edge at different registers. Clock networks minimise it; ordinary logic does not.'],
      ]
    }),
    q.goal('H', 'In the divide-by-4 counter below, press the clock until the tick pulse has fired **three** times.', W('counterdiv', { divisor: 4, targetTicks: 3 }), s => s.ticks >= 3,
      'tick fires when count = 3, i.e. on edges 4, 8 and 12. One pulse per 4 clocks: the tick rate is f_clk / 4.'),
    q.mc('H', 'A hardware counter is built from which two parts, and what does the clock do?', ['A register (holds the value) and an adder (computes value + 1 continuously); the clock edge is when the register captures the adder\'s result', 'A register and a comparator; the clock resets the register', 'An adder alone; the clock feeds the carry', 'A shift register; the clock shifts in a 1'], 0, 'Memory plus step. The adder is combinational and always shows count + 1; the edge decides when that becomes the new count.'),
    q.num('H', 'A counter must count 0 … 433 to divide a 50 MHz clock down to 115,200 ticks per second. Minimum register width in bits?', 9, '434 distinct values need 2^w ≥ 434: 2⁸ = 256 is too small, 2⁹ = 512 fits. So 9 bits.'),
    q.mc('H', 'A divide-by-434 counter produces a one-cycle pulse `tick`. How should the UART\'s bit counter use it?', ['As an enable: `if (tick) bit_index <= bit_index + 1;` inside the 50 MHz clocked block', 'As a clock: `always @(posedge tick)`', 'As an asynchronous reset', 'Connect it to the data line directly'], 0, 'One clock domain, verified timing, no glitchy derived clock. The register only advances on edges where tick is 1.'),
    q.mc('H', 'Why is using a counter output as a new clock (`always @(posedge tick)`) a bad idea in an FPGA?', ['It leaves the dedicated clock network: skew and glitches, and the timing tools cannot verify paths between the two clocks', 'Counters cannot drive anything', 'It would run too fast', 'Verilog does not allow two always blocks'], 0, 'Clocks travel on low-skew routing so every register sees the same edge. Logic outputs do not, and crossing between "clocks" is a clock-domain crossing that needs special handling.'),
    q.info('H', 'UART: sending a byte over one wire with no shared clock', `A **UART** sends bytes down a single wire to a receiver that has its **own** clock. Nothing tells the receiver where a bit begins or how long it lasts, so the format must carry that information itself. Three design decisions, each with a reason:

**The line idles high (1).** A disconnected or broken wire reads as 0 on most inputs, so idle-high makes "no transmitter" distinguishable from "idle transmitter". More importantly, it guarantees that the start of every byte is a **falling edge**.

**A start bit (0) comes first.** The receiver needs an *event* to align to. The falling edge of the start bit says "a byte begins now", and from that instant the receiver counts: half a bit period to reach the middle of the start bit, then one full bit period per data bit, sampling each in its **middle** where the level is most stable and furthest from the transitions.

**8 data bits, least significant first (d0 first).** Why LSB first? The transmitter is a **shift register** (Day 15 in a new role) that shifts its byte out one end; shifting the low end out is the natural direction for arithmetic-style hardware, and the receiver rebuilds the byte by shifting each new sample in from the top, which lands d0 at bit 0 after eight shifts. The convention is arbitrary in principle but universal in practice; its consequence is that a scope trace, read left to right, shows the byte **backwards**.

**A stop bit (1) ends the frame.** It returns the line to idle for at least one bit period, which guarantees that the *next* start bit is again a falling edge, even if the next byte follows immediately and even if the last data bit was 0.

10 bit-times per byte, so 115,200 baud carries at most 11,520 bytes per second. Both ends must agree the baud in advance: there is no clock wire to negotiate with.`, {
      terms: [
        ['UART', 'Universal asynchronous receiver/transmitter: sends bytes over one wire with no clock wire, using start and stop bits for timing.'],
        ['Baud rate', 'Bits per second on the line. 115,200 baud → each bit lasts 1/115200 s = 8.68 µs.'],
        ['Start / stop bit', 'The 0 that announces a byte (its falling edge aligns the receiver) and the 1 that ends it (so the next start is a falling edge again).'],
        ['LSB first', 'Bit 0 goes on the wire first. A scope trace read left-to-right shows the byte reversed.'],
        ['Mid-bit sampling', 'The receiver samples each bit half a bit period after its expected start, where the level is most reliable.'],
        ['Frame', 'One complete unit: start + 8 data + stop = 10 bit-times.'],
      ],
      widget: W('uart', { byte: 0x55, baud: 115200, clk: 50e6 })
    }),
    q.goal('H', 'Set the data byte in the UART simulation to **0x41** (ASCII "A") and look at the order the bits leave.', W('uart', { byte: 0, baud: 115200, clk: 50e6, target: 0x41 }), s => s.byte === 0x41,
      '0x41 = 01000001. On the wire after the start bit: d0..d7 = 1,0,0,0,0,0,1,0. LSB first!'),
    q.mc('H', 'The first **data** bit a UART transmits is…', ['d0, the least significant bit', 'd7, the most significant bit', 'the parity bit', 'the stop bit'], 0, 'LSB first. A scope trace reads the byte reversed.'),
    q.num('H', 'At 115,200 baud with 10 bits per frame (start, 8 data, stop), the maximum byte rate in bytes per second is…', 11520, '115200 / 10 = 11,520 bytes per second. The framing costs 20% of the raw bit rate.'),
    q.mc('H', 'Why does a UART frame begin with a start bit rather than just sending the data bits?', ['The receiver has no shared clock; the start bit\'s falling edge is the event it aligns its bit timing to', 'To make the byte an even number of bits', 'Because the first data bit is always 1', 'To carry the baud rate'], 0, 'Without an edge to count from, the receiver cannot know where bit 0 begins. Idle-high plus a 0 start bit guarantees an edge for every byte.'),
    q.mc('H', 'A UART sends the byte **0x0F** (00001111). Reading a scope trace left to right, the eight data bits appear as…', ['1111 0000 (d0…d7: the low nibble first)', '0000 1111', '1000 0000', '0111 1000'], 0, 'LSB first: d0 = 1, d1 = 1, d2 = 1, d3 = 1, then d4…d7 = 0. Left to right on the trace: 11110000, the byte reversed.'),
    q.mc('H', 'What would go wrong if a UART frame had **no stop bit** and the next byte followed immediately?', ['If the last data bit were 0 and the next start bit is 0, there is no falling edge for the receiver to align the next byte to', 'Nothing; the receiver counts bits anyway', 'The baud rate would double', 'The data would be sent MSB first'], 0, 'The stop bit forces at least one bit-time of 1, so the next start bit is always a 1→0 edge. That edge is what re-synchronises the receiver every byte.'),
    q.mc('H', 'Where in each bit period does a UART receiver sample the line, and why?', ['In the middle: furthest from both transitions, so small timing errors do not land on an edge', 'At the very start of the bit', 'At the end of the bit', 'Three times, then averages the voltage'], 0, 'Half a bit period after the start edge, then every full bit period. Mid-bit sampling gives ±half a bit of margin against timing error.'),
    q.info('H', 'The baud divisor and how much rounding error a receiver can tolerate', `The divider counts an **integer** number of clock cycles per bit, but 50,000,000 / 115,200 = **434.03**. Rounding to 434 makes each bit 434/50e6 = 8.680 µs instead of 8.681 µs, so the transmitter actually runs at 50e6/434 = 115,207 baud: an error of **0.006%**. With a 1 MHz clock and 9600 baud the divisor is 104.17 → 104, an error of 0.16%. The error is the price of an integer counter; the question is how much is tolerable.

**Work it out from the sampling picture.** The receiver aligns to the start edge, then samples the middle of each bit. The last sample (the stop bit) is 9.5 bit-times after the edge. If the transmitter\'s bit period is wrong by a fraction e, that last sample drifts by 9.5·e bit-times; it must stay inside its bit, i.e. drift less than half a bit: 9.5·e < 0.5, so **e < 5.3%** in total. Both ends can be wrong in opposite directions and real edges are not infinitely sharp, so the usual budget is **≤ 2% per end**. Every start bit re-aligns the receiver, which is why the error never accumulates beyond one frame.

That is why the classic UART crystal is 1.8432 MHz: it divides *exactly* by 16 × 115,200. And it is why a divisor error of 5% is a real bug that a test on "a declared baud divisor" (H02 L3) must catch, while 0.16% is fine. Below, a transmitter model at the clock-cycle level: each frame bit is held for \`divisor\` clock cycles.`, {
      terms: [
        ['Baud divisor', 'Clock frequency ÷ baud rate, rounded to an integer: how many clock cycles one bit lasts.'],
        ['Baud error', '|actual − nominal| / nominal. Caused by rounding the divisor; 0.006% at 50 MHz / 115200.'],
        ['Accumulated drift', 'Error per bit × number of bits since the last alignment. Resets at every start edge.'],
        ['Tolerance budget', 'About 2% per end: the 9.5-bit drift to the stop-bit sample must stay under half a bit, shared between both ends.'],
        ['1.8432 MHz crystal', 'The traditional UART clock: an exact multiple of 16 × 115,200, so common baud rates divide with zero error.'],
      ]
    }),
    q.num('H', '50 MHz clock, 115,200 baud: the integer baud divisor?', 434, '50,000,000 / 115,200 = 434.03 → 434 (0.006% error).'),
    q.num('H', 'A 1 MHz clock, 9600 baud, divisor rounded to 104. Baud error in percent, to 2 d.p.?', 0.16, '|104 × 9600 − 1,000,000| / 1,000,000 = 1600 / 1,000,000 = 0.16%.', { unit: '%', tol: 0.01 }),
    q.mc('H', 'A UART receiver samples mid-bit and re-aligns on every start edge. Roughly how much total baud mismatch (transmitter vs receiver) can a 10-bit frame survive, and why?', ['About 5%: the last sample is 9.5 bit-times after the start edge and must drift less than half a bit (9.5·e < 0.5)', 'About 50%: it only has to get the start bit', 'Zero: any mismatch loses the byte', 'About 0.5%: one bit of drift per byte'], 0, 'Drift accumulates only within one frame because each start bit re-aligns. Budget about 2% per end to leave margin for edge slopes and both ends erring in opposite directions.'),
    q.code('H', 'Build: a cycle-level UART transmitter model. Write `solve(byte, divisor)` returning the line level on **every clock cycle** of one frame: the start bit 0, the eight data bits of `byte` (0..255) LSB first, then the stop bit 1, with each of the 10 bits held for `divisor` consecutive clock cycles. The result has 10 × divisor entries. With divisor 434 (50 MHz, 115,200 baud) that is 4340 samples; the speed test uses that.', {
      fn: 'solve',
      starter: 'def solve(byte, divisor):\n    frame = [0]                  # start\n    # add the 8 data bits, bit 0 first, then the stop bit\n    out = []\n    for b in frame:\n        # hold b for divisor clock cycles\n        pass\n    return out\n',
      tests: [
        { args: [0x41, 1], expect: [0, 1, 0, 0, 0, 0, 0, 1, 0, 1], name: 'divisor 1: just the 10 frame bits' },
        { args: [0x00, 2], expect: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], name: '0x00, divisor 2: 18 lows then 2 highs' },
        { args: [0xFF, 3], expect: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], name: '0xFF, divisor 3: a 3-cycle start bit then 27 highs' },
        { args: [0x80, 1], expect: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1], name: 'MSB set: it is the last data bit' },
        { args: [0x01, 4], expect: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1], name: 'LSB set, divisor 4' },
      ],
      gen: 'def gen():\n    for _ in range(12):\n        yield (random.randint(0, 255), random.randint(1, 6))',
      refCode: 'def ref(byte, divisor):\n    frame = [0] + [(byte >> i) & 1 for i in range(8)] + [1]\n    out = []\n    for b in frame:\n        out.extend([b] * divisor)\n    return out',
      speed: { gen: 'def gen():\n    return [0xA5, 434]', budgetMs: 1500, label: 'divisor 434 (50 MHz / 115200 baud): 4340 clock samples' },
      solution: 'def solve(byte, divisor):\n    frame = [0] + [(byte >> i) & 1 for i in range(8)] + [1]\n    out = []\n    for b in frame:\n        out.extend([b] * divisor)\n    return out'
    }, 'Two nested ideas: the frame (10 bits, LSB first) and the divider (each bit held for divisor clocks). In hardware the divider is the counter from the first card and the frame is a bit index advanced by its tick; this model is the reference a testbench compares the RTL against, sample by sample.'),

    // =====================================================================================================
    // CODE: unit tests, what to test, a checker and an integrator you verify on a known answer
    // =====================================================================================================
    q.info('S', 'Why tests exist: a claim you can rerun', `You wrote \`solve(byte)\` above and believed it worked. A month later you change one line for a new feature. Does it still work? Without a test, you find out when something downstream misbehaves, and the search starts from the symptom. A **unit test** is the alternative: a small program that calls one function on a chosen input and **asserts** the result:

\`\`\`
def test_frame_of_0x41():
    assert solve(0x41) == [0, 1, 0, 0, 0, 0, 0, 1, 0, 1]
\`\`\`

\`assert\` does nothing when the condition is true and raises \`AssertionError\` when it is false, so a failing test stops the run loudly. \`print\` would need a human to read and compare; nobody does that on the 200th run. A test runner such as **pytest** collects every \`test_*\` function, runs them all and reports which failed; the whole collection is the **regression suite**, rerun after every change so an old bug cannot come back unnoticed (a *regression*). Day 16\'s Git and Day 17\'s debugging-by-hypothesis both lean on this: a test is a hypothesis about the code that a machine checks for you, every time.

Three properties make a test worth having: it is **automatic** (no human in the loop), **deterministic** (the same inputs every run, so a failure can be reproduced), and its expected value is **independent** of the code under test, which is the next card.`, {
      terms: [
        ['Unit test', 'A small automated check of one function: given this input, expect exactly this output.'],
        ['Assertion', 'assert condition: silent when true, raises AssertionError when false. The failure is loud and automatic.'],
        ['Regression', 'A bug that returns after having been fixed, usually because a later change undid the fix without anyone noticing.'],
        ['Regression suite', 'All the tests, rerun after every change. Its job is to make regressions impossible to miss.'],
        ['pytest', 'The standard Python test runner: it finds test_* functions, runs them, and reports failures with the values involved.'],
      ]
    }),
    q.info('S', 'What to test: the behaviour a test distinguishes', `The handbook\'s standard (H05): **a test is valuable because of the behaviour it distinguishes.** Run a message parser on the same valid 16-byte message a million times and you have learned one thing a million times. Run it on a message one byte short, and you learn whether the length check exists.

Why do bugs cluster at edges? Because an edge is where the code\'s *conditions* change: a comparison flips, a loop runs zero times, an index reaches the last element, a counter wraps. The classic example from the handbook: a check written as \`length > 16\` instead of \`length >= 16\`. Every input except **exactly 16** behaves identically under both versions. Random inputs over a huge range almost never hit the equality, so "we ran 10,000 random tests" proves nothing about it; one **directed boundary test** at 16 settles it.

So build the suite from cases that would each catch a *different* bug: **empty input**, **one element**, **exactly at the limit**, **one past the limit**, **duplicates**, **an unknown opcode**, **a reset half-way through**. Then keep a **requirement-to-test mapping**: a table with one row per requirement and the test that proves it. A requirement with an empty row is untested, however many tests the suite has. Switch tests on below and watch which requirements each one actually covers.`, {
      widget: W('testmatrix', {}),
      terms: [
        ['Boundary (edge) case', 'An input where a condition in the code changes: exactly at a limit, one past it, zero items, the last index.'],
        ['Directed test', 'A hand-chosen input aimed at one specific behaviour, as opposed to a random one.'],
        ['Requirement-to-test mapping', 'A table saying which test proves which requirement. Gaps are visible instead of assumed.'],
        ['Functional coverage', 'Which interesting situations (bins) the tests actually exercised, as opposed to which lines of code ran.'],
        ['Nominal case', 'The ordinary valid input. Necessary, but repeating it adds no new evidence.'],
      ]
    }),
    q.multi('S', 'A parser accepts 16-byte messages with an opcode field and a quantity field. Which of these tests each distinguish a **different** bug?', ['a message one byte short', 'a message with an unknown opcode', 'a delete with non-zero quantity', 'a length exactly at the maximum', 'five copies of the same valid message'], [0, 1, 2, 3], 'Repeating a nominal case adds nothing new; each of the others targets a distinct rule (length check, opcode check, delete rule, boundary).'),
    q.tf('S', 'A suite with 10,000 tests is stronger evidence than one with 40, regardless of what they check.', false, 'What matters is which behaviours are distinguished. The handbook: a test count can supplement claims, not replace them.'),
    q.mc('S', 'Which single line is a unit test assertion?', ['assert find_max([]) is None', 'print(find_max([]))', 'find_max([])', '# find_max handles empty'], 0, 'An assertion fails loudly when the behaviour is wrong; a print requires a human to notice.', { grid: true }),
    q.mc('S', 'Why keep a requirement-to-test mapping?', ['so untested requirements are visible instead of assumed', 'to make the suite run faster', 'because pytest requires it', 'to count tests'], 0, 'H05 pass evidence: requirement-to-test mapping, independent expected results, deterministic replay.'),
    q.mc('S', 'A length check was accidentally written as `length > 16` instead of `length >= 16`. Which input distinguishes the two versions?', ['length exactly 16', 'length 0', 'length 1000', 'any random length'], 0, 'Every other input behaves identically under both. Random testing over a wide range almost never hits the single value that matters; a directed boundary test does.', { grid: true }),
    q.mc('S', 'A student writes a test\'s expected value by running the code and pasting whatever it returned. What is wrong?', ['The expected value is not independent: the test now proves only that the code still does what it did, bugs included', 'Nothing; that is how expected values are made', 'Pasting is slower than typing', 'pytest cannot compare pasted values'], 0, 'Expected results must come from a hand calculation, a specification, or a simpler independent model (H05). Otherwise a wrong output is frozen in as "correct".'),
    q.info('S', 'Writing a test: arrange, act, assert; then break the code on purpose', `Every test has the same three-beat shape. **Arrange** the input (build the message, the list, the byte). **Act**: call the function once. **Assert** the result against an expected value you obtained *independently*: by hand, from the specification, or from a simpler model (for the UART frame, the definition "start, LSB first, stop" is the independent source). One test, one behaviour, a name that says which: \`test_delete_with_nonzero_qty_is_rejected\` tells the reader what broke without opening the file.

**Make failures useful.** \`assert got == expected\` in pytest prints both values on failure. For anything richer, put the input in the message: \`assert got == exp, f"msg={msg}"\`. A failure you cannot read is a failure you will re-debug from scratch.

**Check that the test can fail.** A test that passes has proved only that it did not fail; it might be asserting something vacuous. The cheap check is a **mutation**: deliberately break the code (change \`>=\` to \`>\`, delete the length check), run the suite, and confirm it goes red. The handbook makes this a level-5 skill for hardware (H05 L5, five deliberate RTL mutations), but the habit starts here. Finally, keep tests **deterministic**: if a test uses random inputs, fix the seed (Day 18) and print it, so a failure can be replayed exactly.`, {
      terms: [
        ['Arrange / act / assert', 'The three parts of a test: set up the input, call the function, check the result.'],
        ['Independent expected result', 'A value obtained without running the code under test: by hand, from the spec, or from a simpler model.'],
        ['Mutation', 'A deliberate bug inserted to check that the suite notices. If nothing fails, there is a blind spot.'],
        ['Deterministic replay', 'The same seed and inputs reproduce the same failure. Required before a bug can be bisected (Day 16).'],
        ['Failure message', 'What a failing assertion prints. Include the input so the reader can reproduce it immediately.'],
      ]
    }),
    q.order('S', 'Put the steps of writing one unit test for a message parser in order.', ['decide which single behaviour the test distinguishes', 'arrange: build the input message', 'work out the expected result independently of the code', 'act: call the parser once', 'assert the result equals the expected value, with a useful message', 'break the parser deliberately and confirm the test fails'], 'Behaviour first (it names the test), then arrange, independent expected value, act, assert, and finally the mutation check that the test can actually fail.'),
    q.tokens('S', 'Arrange the tokens into a pytest assertion that a UART frame function `solve` returns `[0, 1, 0, 0, 0, 0, 0, 1, 0, 1]` for the byte 0x41.', ['assert', 'solve(0x41)', '==', '[0, 1, 0, 0, 0, 0, 0, 1, 0, 1]'], ['print', 'return', '!='], 'assert solve(0x41) == [0, 1, 0, 0, 0, 0, 0, 1, 0, 1]. The expected list comes from the frame definition (start, LSB first, stop), not from running solve.', { mono: true }),
    q.mc('S', 'You change `>=` to `>` in a length check on purpose, rerun the test suite, and every test still passes. What have you learned?', ['The suite has a blind spot: no test exercises the boundary, so it must be added', 'The code was correct either way', 'The tests are too strict', 'pytest is broken'], 0, 'A mutation that survives means no test distinguishes the two behaviours. Add the directed test at the limit and confirm it goes red before restoring the code.'),
    q.match('S', 'Match each test input to the bug it is designed to distinguish in a 16-byte message parser.', [['a 15-byte message', 'missing length check'], ['opcode 7 (not 1 or 2)', 'missing opcode check'], ['delete (opcode 2) with quantity 5', 'missing delete rule'], ['message exactly 16 bytes', 'off-by-one at the limit']], 'Each directed input flips exactly one condition in the code. Together they map to the requirements; five copies of a nominal message would map to nothing new.'),
    q.code('S', 'Write a requirements checker `solve(msg)` for a message given as a list of byte values. Rules: **R1** the message is exactly 16 bytes; **R2** `msg[0]` (version) is 1; **R3** `msg[1]` (opcode) is 1 (add) or 2 (delete); **R4** if the opcode is 2 then `msg[2]` (quantity) is 0. Return the list of violated rule names in order `["R1", "R2", "R3", "R4"]` (an empty list if the message is valid). Check R2, R3 and R4 only when that byte exists (index in range); R4 needs both an opcode of 2 and a byte at index 2.', {
      fn: 'solve',
      starter: 'def solve(msg):\n    bad = []\n    # R1: length exactly 16\n    # R2: msg[0] == 1 (only if the byte exists)\n    # R3: msg[1] in (1, 2) (only if it exists)\n    # R4: opcode 2 requires msg[2] == 0 (only if both exist)\n    return bad\n',
      tests: [
        { args: [[1, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: [], name: 'nominal add message: valid' },
        { args: [[1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: [], name: 'nominal delete with quantity 0: valid' },
        { args: [[1, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: ['R1'], name: 'one byte short' },
        { args: [[1, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: ['R3'], name: 'unknown opcode 7' },
        { args: [[1, 2, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: ['R4'], name: 'delete with non-zero quantity' },
        { args: [[2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: ['R2'], name: 'wrong version' },
        { args: [[]], expect: ['R1'], name: 'empty message: only R1 can be judged' },
        { args: [[2, 7, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: ['R1', 'R2', 'R3'], name: 'several rules at once, in order' },
        { args: [[1, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], expect: ['R1'], name: 'one byte too long' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.choice([0, 1, 2, 3, 15, 16, 16, 16, 17])\n        msg = [random.choice([1, 1, 2]), random.choice([1, 2, 2, 7]), random.choice([0, 0, 5])] + [0] * max(0, n - 3)\n        yield (msg[:n],)',
      refCode: 'def ref(msg):\n    bad = []\n    if len(msg) != 16: bad.append("R1")\n    if len(msg) > 0 and msg[0] != 1: bad.append("R2")\n    if len(msg) > 1 and msg[1] not in (1, 2): bad.append("R3")\n    if len(msg) > 2 and msg[1] == 2 and msg[2] != 0: bad.append("R4")\n    return bad',
      solution: 'def solve(msg):\n    bad = []\n    if len(msg) != 16:\n        bad.append("R1")\n    if len(msg) > 0 and msg[0] != 1:\n        bad.append("R2")\n    if len(msg) > 1 and msg[1] not in (1, 2):\n        bad.append("R3")\n    if len(msg) > 2 and msg[1] == 2 and msg[2] != 0:\n        bad.append("R4")\n    return bad'
    }, 'Each rule is one condition, and each directed test flips exactly one of them. The index guards matter: a short message must report R1 without crashing on msg[1]. Note the "several rules at once" test: order is part of the contract, and a checker that returned a set would fail it.'),
    q.info('S', 'Testing numerical code: verify on an answer you already know', `Some functions return floats, and floats are never exactly equal (Day 1: 0.1 + 0.2 ≠ 0.3). The test discipline is the same, with one change: assert **closeness**, \`abs(got − expected) < tol\`, and choose the tolerance from the method\'s error, not from what happens to pass.

Where does an *independent* expected value come from for a numerical method? From a case with a **known exact answer**. The trapezoid rule (this afternoon\'s E cards) approximates an integral by joining sample points with straight lines; you cannot test it on an integral you cannot do, so test it on ∫₀^π sin x dx = 2 or ∫₀¹ x² dx = 1/3 and check two things: the answer converges to the known value, and the error falls at the **expected rate** (÷4 each time the step halves). A method that converges to the right answer at the wrong rate has a bug too.

The exercise below is an integrator that halves its step until two successive estimates agree within a tolerance. Its output is checked against a reference with a floating-point tolerance, exactly as your own tests should be.`, {
      terms: [
        ['Closeness assertion', 'abs(got − expected) < tol, because floats carry rounding error. Choose tol from the method, not from convenience.'],
        ['Known-answer test', 'An input whose exact result is known independently, used to verify a numerical method before trusting it elsewhere.'],
        ['Convergence check', 'Halve the step repeatedly and confirm the estimate settles and the error shrinks at the predicted rate.'],
        ['Step (h)', 'The spacing between sample points in a numerical method. Smaller h, more work, smaller error.'],
      ]
    }),
    q.code('S', 'Write `solve(coeffs, a, b, tol)`: integrate the polynomial with coefficients `coeffs` (so `coeffs = [c0, c1, c2]` means c0 + c1·x + c2·x²) from `a` to `b` by the **trapezoid rule**, starting with n = 1 strip and doubling n until two successive estimates differ by less than `tol`. Return `[estimate, n]` where `estimate` is the trapezoid value at the final n. Trapezoid with n strips: h = (b − a)/n, T = h·(f(a)/2 + f(a+h) + … + f(b−h) + f(b)/2). Compare `abs(T_n − T_prev) < tol`.', {
      fn: 'solve',
      starter: 'def solve(coeffs, a, b, tol):\n    def f(x):\n        return sum(c * x ** i for i, c in enumerate(coeffs))\n    def trap(n):\n        h = (b - a) / n\n        # f(a)/2 + interior samples + f(b)/2, times h\n        return 0.0\n    n = 1\n    prev = trap(n)\n    while True:\n        n *= 2\n        cur = trap(n)\n        # stop when |cur - prev| < tol\n        prev = cur\n',
      tests: [
        { args: [[0, 0, 1], 0, 1, 0.001], expect: [0.33349609375, 32], name: 'x² on [0,1]: exact 1/3; stops at n = 32' },
        { args: [[1, 2], 0, 3, 0.001], expect: [12.0, 2], name: 'a straight line: the trapezoid rule is exact, so n = 2 already agrees' },
        { args: [[5], 0, 2, 1e-9], expect: [10.0, 2], name: 'a constant' },
        { args: [[0, 0, 0, 1], 0, 2, 0.01], expect: [4.0009765625, 64], name: 'x³ on [0,2]: exact 4' },
        { args: [[0, 0, 1], 0, 1, 0.1], expect: [0.34375, 4], name: 'loose tolerance stops early' },
      ],
      gen: 'def gen():\n    for _ in range(20):\n        coeffs = [random.randint(-3, 3) for _ in range(random.randint(1, 4))]\n        a = random.randint(-2, 1); b = a + random.randint(1, 3)\n        yield (coeffs, a, b, random.choice([0.1, 0.01, 0.001]))',
      refCode: 'def ref(coeffs, a, b, tol):\n    def f(x):\n        return sum(c * x ** i for i, c in enumerate(coeffs))\n    def trap(n):\n        h = (b - a) / n\n        s = 0.5 * (f(a) + f(b))\n        for i in range(1, n):\n            s += f(a + i * h)\n        return s * h\n    n = 1\n    prev = trap(n)\n    while True:\n        n *= 2\n        cur = trap(n)\n        if abs(cur - prev) < tol:\n            return [cur, n]\n        prev = cur',
      checker: 'def check(args, got, exp):\n    return isinstance(got, (list, tuple)) and len(got) == 2 and abs(got[0] - exp[0]) <= 1e-9 * max(1.0, abs(exp[0])) and got[1] == exp[1]',
      solution: 'def solve(coeffs, a, b, tol):\n    def f(x):\n        return sum(c * x ** i for i, c in enumerate(coeffs))\n    def trap(n):\n        h = (b - a) / n\n        s = 0.5 * (f(a) + f(b))\n        for i in range(1, n):\n            s += f(a + i * h)\n        return s * h\n    n = 1\n    prev = trap(n)\n    while True:\n        n *= 2\n        cur = trap(n)\n        if abs(cur - prev) < tol:\n            return [cur, n]\n        prev = cur'
    }, 'For x² on [0, 1]: T₁ = 0.5, T₂ = 0.375, T₄ = 0.34375, T₈ = 0.33594, T₁₆ = 0.33398, T₃₂ = 0.33350. Successive differences 0.125, 0.031, 0.0078, 0.0020, 0.00049: each a quarter of the last, the h² signature; the first difference under 0.001 appears at n = 32. The straight-line case stops at n = 2 because trapezoids are exact for lines, which is itself a known-answer test of your implementation.'),

    // =====================================================================================================
    // MATHS: proof by induction
    // =====================================================================================================
    q.info('M', 'Why "it works for n = 1, 2, 3, 4" is not a proof', `Check 1 = 1·2/2, 1 + 2 = 2·3/2, 1 + 2 + 3 = 3·4/2. Four cases, all fine. Does that prove 1 + 2 + … + n = n(n+1)/2 for **every** n? No, and here is why the question is not pedantic. Fermat noticed that 2^(2ⁿ) + 1 is prime for n = 0, 1, 2, 3, 4 (3, 5, 17, 257, 65537) and conjectured it always is. It fails at n = 5: 4,294,967,297 = 641 × 6,700,417. The expression n² + n + 41 is prime for n = 0, 1, 2, …, 39 and composite at n = 40. Patterns that hold for the first few cases break all the time.

A **proof** is different in kind from evidence: it is an argument that covers *every* case, including the ones nobody will ever compute. For a statement P(n) about every whole number n ≥ 1, the difficulty is that there are infinitely many cases and you can only write finitely many lines. **Induction** is the tool that closes that gap: a finite argument with an infinite reach.

What a proof must show, precisely: (1) P(1) is true, checked directly; and (2) for **every** k ≥ 1, *if* P(k) is true *then* P(k+1) is true. Note what (2) is not: it is not "P(k+1) is true". You are allowed to assume P(k), because you only need the implication.`, {
      terms: [
        ['Conjecture', 'A pattern you believe from cases but have not proved. Fermat\'s 2^(2ⁿ) + 1 was one; it was false.'],
        ['Proof', 'A finite argument that establishes a statement for every case it claims, not just the ones checked.'],
        ['P(n)', 'The statement being proved, as a function of n. "1 + 2 + … + n = n(n+1)/2" is P(n); P(3) is the case n = 3.'],
        ['Implication', '"If A then B". Proving it lets you assume A. It says nothing about whether A is actually true.'],
      ]
    }),
    q.info('M', 'Induction is dominoes: two obligations, both for every k', `Line up dominoes labelled 1, 2, 3, … forever. Two facts guarantee that **every** domino falls: the first one is pushed, and each domino is close enough to knock over the next. Neither alone is enough. Push the first without the spacing guarantee and it falls alone. Guarantee the spacing without pushing and nothing moves.

Translate: **base case** = "P(1) is true" (push domino 1). **Inductive step** = "for every k ≥ 1, P(k) ⇒ P(k+1)" (each domino knocks over the next). Then P(1) gives P(2), P(2) gives P(3), and so on: P(n) for every n, reached in n − 1 steps that you never have to write out.

The phrase to watch is *for every k*. A famous fake proof "shows" all horses are the same colour: base case, one horse, trivially one colour; step, in any k+1 horses, the first k are one colour and the last k are one colour, and they overlap, so all k+1 match. The overlap argument fails at exactly **k = 1**: two horses, "the first 1" and "the last 1" share nothing. One broken domino breaks the chain, and it is usually the first spacing you did not check. Try the two buttons below in each order.`, {
      widget: W('dominoes', {}),
      terms: [
        ['Base case', 'The starting instance proved directly, usually P(1) or P(0).'],
        ['Inductive hypothesis', 'The assumption "P(k) holds" that you are allowed to use while proving P(k+1).'],
        ['Inductive step', 'The proof that P(k) implies P(k+1), valid for every k from the base case upwards.'],
        ['Domino picture', 'Base case pushes the first domino; the step guarantees each knocks over the next. Both are needed.'],
        ['All-horses fallacy', 'A step whose argument silently needs k ≥ 2. The chain breaks at the first k where the step does not apply.'],
      ]
    }),
    q.goal('M', 'In the domino simulation, establish both parts of an induction proof so that every domino falls.', W('dominoes', {}), s => s.base && s.step,
      'Base case pushes the first domino; the step guarantees each knocks over the next. Only with both do all the dominoes fall.'),
    q.info('M', 'A complete worked proof: 1 + 2 + … + n = n(n+1)/2', `**Claim** P(n): 1 + 2 + … + n = n(n+1)/2 for every n ≥ 1.

**Base case.** n = 1: the left side is 1, the right side is 1·2/2 = 1. ✓

**Inductive step.** Let k ≥ 1 and assume P(k): 1 + 2 + … + k = k(k+1)/2. We must show P(k+1), i.e. 1 + 2 + … + k + (k+1) = (k+1)(k+2)/2.

Start from the left side of P(k+1) and use the hypothesis on the first k terms:

1 + 2 + … + k + (k+1) = k(k+1)/2 + (k+1)   [by P(k)]
= (k+1)·(k/2 + 1)   [factor out (k+1)]
= (k+1)(k+2)/2.   ✓

That is exactly the right side of P(k+1). Since P(1) holds and P(k) ⇒ P(k+1) for every k ≥ 1, P(n) holds for all n ≥ 1. ∎

Read the algebra move again: the *only* place the hypothesis is used is to replace the first k terms. Everything after is ordinary algebra aimed at the target expression. Writing the target down first ("we must show …") is what keeps you from wandering.

**Second example, by picture.** 1 + 3 + 5 + … + (2n − 1) = n². Base: 1 = 1². Step: assume the first k odd numbers sum to k²; add the next odd number 2k + 1: k² + 2k + 1 = (k+1)². Geometrically, an L-shaped strip of 2k + 1 squares wraps a k × k square into a (k+1) × (k+1) square.`, {
      terms: [
        ['Target expression', 'The right-hand side of P(k+1), written down before you start so the algebra has a destination.'],
        ['Using the hypothesis', 'The one step where P(k) replaces a sub-expression. If you never use it, something is wrong.'],
        ['∎', 'End of proof: every obligation has been discharged.'],
        ['Triangular number', 'n(n+1)/2: the sum 1 + 2 + … + n, and the number of dots in a triangle with n rows.'],
      ]
    }),
    q.num('M', '1 + 2 + … + 100 = ?', 5050, '100 × 101 / 2. Gauss\'s pairing (1 + 100, 2 + 99, …) gives the same: 50 pairs of 101.'),
    q.order('M', 'Order the parts of an induction proof.', ['state the claim P(n) precisely', 'prove the base case P(1)', 'assume P(k) for some k ≥ 1', 'show P(k) implies P(k+1)', 'conclude P(n) for all n ≥ 1'], 'Claim, base, hypothesis, step, conclusion.'),
    q.num('M', 'The sum of the first n odd numbers is n². What is 1 + 3 + 5 + 7 + 9 + 11?', 36, 'Six odd numbers: 6² = 36.'),
    q.mc('M', 'In the inductive step for 1 + 2 + … + n = n(n+1)/2, where exactly is the hypothesis P(k) used?', ['To replace 1 + 2 + … + k by k(k+1)/2, leaving k(k+1)/2 + (k+1) to simplify', 'To prove that k + 1 is a whole number', 'It is not used; the step is pure algebra', 'To prove the base case'], 0, 'The hypothesis is used exactly once, on the first k terms. After that it is algebra towards the target (k+1)(k+2)/2.'),
    q.mc('M', 'Fermat checked that 2^(2ⁿ) + 1 is prime for n = 0, 1, 2, 3, 4 and conjectured it always is. It fails at n = 5. What does this show about proof?', ['Checking cases, however many, is evidence but not proof; only an argument covering every n settles a statement about all n', 'Five cases are too few; ten would have been a proof', 'Prime numbers cannot be reasoned about', 'Induction cannot be used for primes'], 0, 'Patterns break at cases nobody computed. Induction is a finite argument with infinite reach; case checking is not.'),
    q.mc('M', 'The fake proof that all horses are the same colour has a base case (one horse) and a step that says "in any k+1 horses, the first k match and the last k match, and they overlap". Which domino is broken?', ['k = 1: two horses, the first one and the last one, do not overlap, so the step fails there', 'The base case: one horse has no colour', 'k = 100: too many horses to compare', 'None; the proof is valid'], 0, 'The overlap argument needs k ≥ 2. The step is false for k = 1, so P(1) never reaches P(2), and the chain never starts.'),
    q.mc('M', 'Proving a loop invariant is induction where the base case is…', ['the invariant holds before the first iteration', 'the loop terminates', 'the array is sorted', 'n = 0 has no elements'], 0, 'Then each iteration is the inductive step: if the invariant held before an iteration, it holds after.'),
    q.info('M', 'Induction beyond sums: divisibility, inequalities, loops, and the strong form', `Induction proves anything indexed by whole numbers, not just sums. The step always has the same shape: express the k+1 case in terms of the k case, use the hypothesis, finish with algebra.

**Divisibility.** Claim: 7ⁿ − 1 is divisible by 6 for every n ≥ 1. Base: 7 − 1 = 6 ✓. Step: 7^(k+1) − 1 = 7·7^k − 1 = 7·(7^k − 1) + 6. The first part is divisible by 6 by the hypothesis, the second is 6. ✓

**Inequality.** Claim: 2ⁿ ≥ n + 1 for n ≥ 1. Base: 2 ≥ 2 ✓. Step: 2^(k+1) = 2·2^k ≥ 2(k + 1) = 2k + 2 ≥ k + 2. ✓ (The last inequality needs k ≥ 0.)

**Loop invariants** (Day 6) are induction on the iteration count: "true before the loop" is the base case, "each iteration preserves it" is the step, and when the loop exits, the invariant plus the exit condition give you the result. Day 22\'s binary search is proved exactly this way.

**Strong induction** lets you assume P(1), P(2), …, P(k) all at once when proving P(k+1). Use it when the k+1 case depends on a *smaller* case that is not k. Claim: every whole number n ≥ 2 has a prime factor. If n is prime, done. If not, n = a·b with 2 ≤ a < n; by the strong hypothesis a has a prime factor, so n does too. You needed P(a), not P(n − 1). The domino picture still works: every domino before k+1 has already fallen.`, {
      terms: [
        ['Strong induction', 'Assume P(1) … P(k) all hold when proving P(k+1). Equivalent in power to ordinary induction, often more convenient.'],
        ['Divisibility proof', 'Rewrite the k+1 case as (a multiple of the k case) + (an obvious multiple of the divisor).'],
        ['Loop invariant as induction', 'Base case: true before the loop. Step: one iteration preserves it. Exit condition + invariant = the result.'],
        ['Recurrence', 'A rule giving the n-th term from earlier terms, e.g. H(n) = 2H(n−1) + 1. Induction is how closed forms for them are proved.'],
      ]
    }),
    q.mc('M', 'Stretch: to prove that 7ⁿ − 1 is divisible by 6 for all n ≥ 1, the inductive step rewrites 7^(k+1) − 1 as…', ['7·(7^k − 1) + 6, so both parts are multiples of 6', '7^k − 1 + 7, which is obviously divisible by 6', '(7^k − 1)², which is divisible by 6', '6·7^k, by the hypothesis'], 0, '7^(k+1) − 1 = 7·7^k − 1 = 7·7^k − 7 + 6 = 7(7^k − 1) + 6. The hypothesis covers the first term; 6 covers the second.'),
    q.num('M', 'Stretch: the formula 1² + 2² + … + n² = n(n+1)(2n+1)/6 is proved by induction. Use it: what is 1² + 2² + … + 20²?', 2870, '20 × 21 × 41 / 6 = 17220 / 6 = 2870. (The inductive step adds (k+1)² to k(k+1)(2k+1)/6 and factors out (k+1).)'),
    q.num('M', 'Stretch: the Tower of Hanoi with n discs needs H(n) = 2·H(n−1) + 1 moves, H(1) = 1. Induction proves H(n) = 2ⁿ − 1 (step: 2(2^k − 1) + 1 = 2^(k+1) − 1). How many moves for 10 discs?', 1023, '2¹⁰ − 1 = 1023. Base H(1) = 1 = 2¹ − 1; the step shows the closed form survives the recurrence.'),
    q.mc('M', 'Stretch: to prove "every whole number n ≥ 2 has a prime factor", the natural tool is strong induction. Why is ordinary induction awkward here?', ['When n = a·b is composite, the case you need is P(a) for some smaller a, not P(n − 1)', 'Because primes are infinite', 'Because the base case is n = 2, not n = 1', 'Ordinary induction cannot handle products'], 0, 'Strong induction lets you assume every smaller case. The domino picture is unchanged: all dominoes before n have already fallen.'),

    // =====================================================================================================
    // DEGREE: Taylor approximation, error, trapezoid & Simpson, Newton–Raphson (MATH19611, E02 L3)
    // =====================================================================================================
    q.info('E', 'Why approximate: near a point, a curve looks like its tangent', `Zoom in on any smooth curve and it straightens out. Near x = a, the curve f(x) is close to its **tangent line** there: f(x) ≈ f(a) + f′(a)·(x − a). Day 6 built the derivative as the slope of that tangent; today the tangent becomes a tool. sin x ≈ x for small x; e^x ≈ 1 + x; √(1 + x) ≈ 1 + x/2.

Why bother, when a calculator computes sin x exactly? Because engineering reasoning needs formulas you can **manipulate**. The whole of "small-signal" circuit analysis (Day 16\'s op-amp models, next semester\'s transistor amplifiers) works by replacing a curved device characteristic with its tangent at the operating point, so that the linear tools of Days 3, 15 and 16 apply. A pendulum\'s equation contains sin θ; replacing it by θ turns an unsolvable equation into simple harmonic motion, valid for small swings.

Two honest questions come with every approximation, and the handbook insists on both: **how far from a can I go** (the validity range) and **how big is the error** there? The tangent line answers neither by itself; adding more terms, and understanding what governs the error, is the next card.`, {
      terms: [
        ['Linearisation', 'Replacing f near a by its tangent line f(a) + f′(a)(x − a). Keeps only the first-order behaviour.'],
        ['Operating point', 'The value a around which a device is linearised. Small-signal analysis is Taylor to first order about it.'],
        ['Validity range', 'The set of x for which an approximation is good enough for the purpose at hand. Always state it.'],
        ['Small-angle approximation', 'sin θ ≈ θ, cos θ ≈ 1 − θ²/2, tan θ ≈ θ for θ in radians and small.'],
      ]
    }),
    q.info('E', 'Taylor\'s series: match the derivatives', `The tangent line matches f at a in **value** and **slope**. To do better, match the **curvature** too, then the next derivative, and so on. Suppose we want a polynomial p(x) = c₀ + c₁x + c₂x² + c₃x³ + … that agrees with f at x = 0 in as many derivatives as possible. Set x = 0 in each derivative:

- p(0) = c₀, so **c₀ = f(0)**.
- p′(x) = c₁ + 2c₂x + 3c₃x² + …, so p′(0) = c₁: **c₁ = f′(0)**.
- p″(x) = 2c₂ + 6c₃x + …, so p″(0) = 2c₂: **c₂ = f″(0)/2**.
- p‴(0) = 6c₃ = 3!·c₃: **c₃ = f‴(0)/3!**.

Each differentiation pulls down the exponent and the factorial builds up: the n-th coefficient is **f⁽ⁿ⁾(0)/n!**. That is the entire origin of Taylor\'s series; nothing else was assumed. About a general point a, replace x by (x − a): **f(x) = f(a) + f′(a)(x−a) + f″(a)(x−a)²/2! + f‴(a)(x−a)³/3! + …**

Apply it. For e^x every derivative is e^x, all equal to 1 at 0: **e^x = 1 + x + x²/2 + x³/6 + …** For sin x the derivatives cycle sin, cos, −sin, −cos, giving 0, 1, 0, −1 at 0: **sin x = x − x³/3! + x⁵/5! − …** (only odd powers, alternating). For cos x: **1 − x²/2! + x⁴/4! − …** The tangent line is the series stopped after one term. Slide x below and add terms.`, {
      terms: [
        ['Taylor series', 'f(a) + f′(a)(x−a) + f″(a)(x−a)²/2! + …: the polynomial whose derivatives at a all match f\'s.'],
        ['Maclaurin series', 'A Taylor series about a = 0. The e^x, sin x and cos x series above are Maclaurin series.'],
        ['n! in the denominator', 'Comes from differentiating xⁿ n times: n(n−1)…1. Each derivative pulls down one factor.'],
        ['Taylor polynomial', 'The series cut off after a finite number of terms. Degree 1 is the tangent line.'],
      ],
      widget: W('taylor', { x: 0.5, order: 3 })
    }),
    q.num('E', 'Using sin x ≈ x − x³/6, estimate sin(0.5) to 4 d.p.', 0.4792, '0.5 − 0.125/6 = 0.5 − 0.02083 = 0.4792 (true value 0.4794).', { tol: 0.0005 }),
    q.num('E', 'Using cos x ≈ 1 − x²/2, estimate cos(0.3) to 3 d.p.', 0.955, '1 − 0.09/2 = 1 − 0.045 = 0.955 (true value 0.9553).', { tol: 0.001 }),
    q.num('E', 'Using e^x ≈ 1 + x + x²/2, estimate e^0.1 to 3 d.p.', 1.105, '1 + 0.1 + 0.005 = 1.105 (true value 1.10517).', { tol: 0.001 }),
    q.mc('E', 'Where does the 1/n! in the n-th Taylor coefficient come from?', ['Differentiating xⁿ n times gives n!, so cₙ must be f⁽ⁿ⁾(a)/n! for the n-th derivatives to match', 'It is a convention chosen to make the series converge', 'From the binomial theorem', 'From integrating n times'], 0, 'The coefficients are forced by matching derivatives at a: p⁽ⁿ⁾(a) = n!·cₙ must equal f⁽ⁿ⁾(a).'),
    q.mc('E', 'Why does the Maclaurin series of sin x contain only odd powers of x?', ['sin is an odd function (sin(−x) = −sin x), and its even derivatives at 0 (sin 0, −sin 0, …) are all zero', 'Because π is irrational', 'Because the derivative of sin is sin', 'It also contains even powers, with coefficient 1'], 0, 'The derivatives at 0 cycle 0, 1, 0, −1: every even-order derivative vanishes, killing the even powers. cos x, an even function, keeps only even powers.'),
    q.info('E', 'The error term: how wrong, and how far can you go', `Cut a Taylor series after the xⁿ term and the discarded part is the **remainder** Rₙ. Its size is governed by the next derivative: **|Rₙ| ≤ M·|x − a|^(n+1)/(n+1)!**, where M is the largest |f⁽ⁿ⁺¹⁾| between a and x. Read it as "the error is about the size of the first term you left out". For sin and cos every derivative is bounded by 1, so M = 1 and the bound is just the next term.

**Example.** sin x ≈ x − x³/6 at x = 0.5: the next term is x⁵/120 = 0.03125/120 = **0.00026**, and the true error is 0.00026. For an alternating series like this, the first omitted term is a guaranteed upper bound.

**Validity range from a tolerance.** When is sin x ≈ x within 1%? The relative error is about (x³/6)/x = x²/6, so x²/6 < 0.01 gives **x < 0.245 rad ≈ 14°**. That is the kind of statement the handbook wants next to every approximation: not "for small x" but "within 1% for |x| < 0.245".

**The error grows like |x − a|^(n+1).** Halve the distance from a and the tangent-line error falls by 4 (it is second order), the quadratic approximation\'s by 8. Far from a the polynomial can be wildly wrong however many terms you keep in practice, which is why a small-signal model is only trusted near its operating point.`, {
      terms: [
        ['Remainder Rₙ', 'The exact error after truncating at degree n: f(x) − pₙ(x).'],
        ['Lagrange error bound', '|Rₙ| ≤ M|x−a|^(n+1)/(n+1)!, with M the maximum of |f⁽ⁿ⁺¹⁾| on the interval.'],
        ['Alternating series bound', 'If the terms alternate in sign and shrink, the error is at most the first omitted term.'],
        ['Relative error', 'error ÷ true value. For sin x ≈ x it is about x²/6.'],
        ['Order of an approximation', 'The power of |x − a| the error scales with. Tangent line: second order.'],
      ]
    }),
    q.num('E', 'sin x is approximated by x − x³/6 at x = 0.5. Upper bound on the error from the first omitted term x⁵/120, to 5 d.p.?', 0.00026, '0.5⁵ = 0.03125; divided by 120 = 0.00026. The true error is 0.4794 − 0.4792 = 0.0003, within the bound.', { tol: 0.00003 }),
    q.num('E', 'Exam-style: for what largest x (in radians, 3 d.p.) is the approximation sin x ≈ x accurate to within 1%? Use relative error ≈ x²/6.', 0.245, 'x²/6 = 0.01 → x² = 0.06 → x = 0.2449 rad, about 14°.', { tol: 0.003 }),
    q.mc('E', 'You use the tangent-line approximation f(a) + f′(a)(x − a) and halve the distance |x − a|. The error becomes roughly…', ['a quarter (error ∝ (x − a)²)', 'a half', 'an eighth', 'unchanged'], 0, 'The tangent line is a first-degree Taylor polynomial; its remainder scales with (x − a)². Halve the distance, quarter the error.', { grid: true }),
    q.info('E', 'The trapezoid rule and why its error shrinks with h²', `Many integrals have no closed form (∫e^(−x²) dx, a measured current waveform), so we integrate **numerically**: sample f at points spaced h apart and add up areas. The **trapezoid rule** joins consecutive samples with straight lines and adds the trapezoids: one strip contributes h·(f(x₀) + f(x₁))/2; over n strips from a to b (h = (b − a)/n):

**T = h·[ f(a)/2 + f(a+h) + f(a+2h) + … + f(b−h) + f(b)/2 ]**

Interior points are counted once (each belongs to two strips at half weight); the ends once at half weight.

**Where the error comes from.** A straight chord ignores the curve\'s **curvature** f″. Taylor tells you how much: across one strip, the curve deviates from its chord by about f″·h²/8 at the middle, and integrating that bump over a width h gives a per-strip error of about **f″·h³/12**. There are n = (b − a)/h strips, so the total error is about **(b − a)·h²·f″/12**: proportional to **h²**. Halve h and the error drops by **4**. Check it on ∫₀¹ x² dx = 1/3 with n = 2: T = 0.375, error 0.0417; the formula predicts 1 × 0.25 × 2/12 = 0.0417 exactly, because f″ = 2 is constant.

**Simpson\'s rule** fits a parabola through each *pair* of strips instead of a line, weights 1, 4, 1 times h/3. The parabola captures the curvature term, and by symmetry the cubic term cancels too, so the error is proportional to **h⁴**: halving h divides it by 16. Try both on the known integral below: ∫₀^π sin x dx = 2.`, {
      terms: [
        ['Trapezoid rule', 'Join samples with straight lines: T = h·(f₀/2 + f₁ + … + fₙ₋₁ + fₙ/2). Error ∝ h².'],
        ['Simpson\'s rule', 'Fit parabolas through triples of samples: (h/3)(f₀ + 4f₁ + 2f₂ + 4f₃ + … + fₙ); n must be even. Error ∝ h⁴.'],
        ['Order of a method', 'The power of h the error scales with: trapezoid 2, Simpson 4. Determines how fast halving h pays off.'],
        ['Convergence check', 'Halve h repeatedly and confirm the estimate settles and the error falls at the expected rate (÷4 or ÷16).'],
        ['Richardson extrapolation', '(4·T₂ₙ − Tₙ)/3 cancels the h² error term of the trapezoid rule; the result is Simpson\'s rule.'],
      ],
      widget: W('trapz', { n: 4 })
    }),
    q.mc('E', 'You halve the step h of a trapezoid-rule integration. The error becomes roughly…', ['a quarter', 'a half', 'a sixteenth', 'unchanged'], 0, 'Error ∝ h². Simpson would give a sixteenth.', { grid: true }),
    q.num('E', 'Trapezoid rule with n = 2 for ∫₀^π sin x dx (h = π/2, samples 0, 1, 0). Result to 3 d.p.?', 1.571, 'h·(0/2 + 1 + 0/2) = h = π/2 = 1.571. Exact is 2, so the error is 0.429.', { tol: 0.005 }),
    q.num('E', 'Trapezoid rule with n = 4 for ∫₀^π sin x dx (h = π/4, samples 0, 0.7071, 1, 0.7071, 0). Result to 3 d.p.?', 1.896, 'h·(0 + 0.7071 + 1 + 0.7071 + 0) = (π/4) × 2.4142 = 1.896. Error 0.104: about a quarter of the n = 2 error 0.429, as h² predicts.', { tol: 0.005 }),
    q.num('E', 'Simpson\'s rule with n = 2 for ∫₀^π sin x dx (h = π/2, samples 0, 1, 0, weights 1, 4, 1 times h/3). Result to 3 d.p.?', 2.094, '(π/6)·(0 + 4·1 + 0) = 2π/3 = 2.094. Error 0.094 from just three samples, versus 0.429 for the trapezoid with the same samples.', { tol: 0.005 }),
    q.mc('E', 'Why test a numerical integrator on ∫₀^π sin x dx first?', ['its exact value (2) is known, so the error and its convergence rate can be verified', 'because sin is fast to compute', 'it is required by the trapezoid rule', 'no reason'], 0, 'The handbook: use a function with a known integral for verification. A wrong convergence rate reveals a bug even when the answer looks plausible.'),
    q.num('E', 'Exam-style: apply the trapezoid rule with n = 2 to ∫₀¹ x² dx (h = 0.5, samples 0, 0.25, 1). Result to 3 d.p.?', 0.375, '0.5 × (0/2 + 0.25 + 1/2) = 0.5 × 0.75 = 0.375. Exact 1/3: error 0.0417, matching (b−a)h²f″/12 = 1 × 0.25 × 2/12 exactly since f″ = 2 is constant.', { tol: 0.002 }),
    q.num('E', 'Exam-style: the trapezoid rule for ∫₀¹ x² dx gives 0.375 with n = 2 and 0.34375 with n = 4. Richardson extrapolation (4·T₄ − T₂)/3 gives what value, to 4 d.p.?', 0.3333, '(4 × 0.34375 − 0.375)/3 = (1.375 − 0.375)/3 = 0.3333 = 1/3 exactly: the h² error term cancelled, which is why this combination equals Simpson\'s rule.', { tol: 0.0005 }),
    q.mc('E', 'Why is the trapezoid rule exact for a straight line f(x) = mx + c?', ['Its error is proportional to f″, which is zero for a line: the chord is the curve', 'Because lines are easy to integrate', 'It is not exact; every method has error', 'Because h cancels'], 0, 'The per-strip error is about f″h³/12. No curvature, no error. Testing an integrator on a line is a cheap known-answer test.'),
    q.info('E', 'Newton–Raphson: the tangent line, used to solve equations', `The tangent line does one more job: **solving f(x) = 0** when there is no formula. Start from a guess x₀. Replace f near x₀ by its tangent, f(x₀) + f′(x₀)(x − x₀), and ask where *that* crosses zero: x = x₀ − f(x₀)/f′(x₀). Take that as the next guess and repeat:

**xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ)**

Example: solve x² − 5 = 0 (so x = √5) from x₀ = 2. f(2) = −1, f′(2) = 4: x₁ = 2 − (−1)/4 = **2.25**. Then f(2.25) = 0.0625, f′(2.25) = 4.5: x₂ = 2.25 − 0.0139 = **2.2361**, already correct to four figures (√5 = 2.23607). Each step roughly **doubles** the number of correct digits, because the error after a step is proportional to the square of the error before it: the tangent\'s own (x − a)² remainder again.

When it fails: if f′(xₙ) ≈ 0 the tangent is nearly flat and the next guess flies off; a poor start can converge to a different root or cycle. So Newton–Raphson is used with a sensible starting point and a check that |f(xₙ)| is actually shrinking. It is MATH19611 material and the workhorse behind every "solve" button.`, {
      terms: [
        ['Newton–Raphson', 'xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ): follow the tangent to zero, repeat.'],
        ['Quadratic convergence', 'The error after a step is proportional to the square of the previous error: correct digits roughly double per step.'],
        ['Root', 'A value x with f(x) = 0. Newton–Raphson finds one root at a time, the one its start leads to.'],
        ['Failure modes', 'A flat tangent (f′ ≈ 0), a bad starting guess, or a cycle. Always check |f(x)| is decreasing.'],
      ]
    }),
    q.num('E', 'Newton–Raphson (MATH19611): solve x² − 5 = 0 starting at x₀ = 2. x₁, 2 d.p.?', 2.25, 'x₁ = x₀ − f/f′ = 2 − (4 − 5)/4 = 2.25. Next step gives 2.2361.', { tol: 0.005 }),
    q.num('E', 'Exam-style: Newton–Raphson on x² − 5 = 0 from x₁ = 2.25. Compute x₂ to 4 d.p. (f(2.25) = 0.0625, f′(2.25) = 4.5).', 2.2361, 'x₂ = 2.25 − 0.0625/4.5 = 2.25 − 0.01389 = 2.2361. √5 = 2.23607: four correct figures after two steps.', { tol: 0.0005 }),
    q.mc('E', 'Why does Newton–Raphson converge so fast near a root?', ['The tangent-line remainder is proportional to (x − root)², so each step\'s error is about the square of the last: correct digits roughly double', 'Because it uses the second derivative', 'Because it halves the interval each step like binary search', 'It does not; it converges linearly'], 0, 'Quadratic convergence comes straight from the Taylor remainder of the tangent line. Bisection-style halving would gain only one bit per step.'),
    ...genius(q, 19),
  ]
};
