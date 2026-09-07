import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(15);

export default {
  title: 'Uni starts: registers & the clock edge, exit codes, Bayes, nodal analysis',
  emoji: '🎓',
  strands: ['J', 'H', 'S', 'M', 'E'],
  summary: 'Week 3, day 1 — Manchester teaching starts tomorrow. **Hardware** (H02 L1): why hardware needs one agreed instant for change, what goes wrong with a level-sensitive latch in a feedback loop, what the nonblocking assignment `<=` actually models, the a↔b swap traced over several edges, how blocking `=` in a clocked block breaks it and why the order of the lines then matters, plus a clocked-register model in code. **Code** (S03 L1): why a program has two output streams, what `>` does and does not redirect, pipes, exit status as the machine-readable verdict, the standard codes, and a program that returns `(code, out, err)`. **Maths** (M04 L2): conditioning as shrinking the sample space, the 10,000-trial table for a rare fault, why a 90%-sensitive detector still gives mostly false alarms, Bayes\' rule derived, which knob actually helps, a second detector under conditional independence, and the prosecutor\'s fallacy. **Degree** (E01): node-voltage analysis — why choosing a ground removes an unknown, writing KCL at each remaining node with every current replaced by ΔV/R, and two- and three-node worked circuits.',
  takeaway: 'A register captures at an **instant**, not during an interval, which is why one edge means exactly one update no matter how long the clock stays high. `a <= b; b <= a` swaps, because every right-hand side reads the value from **before** the edge and every register updates together. `>` redirects stdout only; the machine-readable verdict is the **exit status**, and 0 must mean success. A 90%-sensitive detector on a 1% fault gives P(fault | flag) = 90/585 ≈ 15%: the base rate dominates. Nodal analysis = pick a ground (one unknown gone), then one KCL equation per remaining node with every current written as ΔV/R.',
  steps: [
    q.info('J', 'Uni starts tomorrow: what the week-one plan actually is', `From tomorrow the handbook budgets **ten discretionary hours a week** on top of lectures, labs and coursework: five on hardware and the project, two on coding and algorithms, one on maths, one on review and retesting, one on the CV, documentation and working with other people.

This app is the review-and-retest hour, spread across the week. It is not the whole ten.

Three concrete moves for the first week. Join **one** society where you can actually deliver a component, not five where you attend. Find a peer or demonstrator willing to do a **fortnightly design review** — you bring one narrow question, a waveform and a test, and you write down the correction. Ask early about board access and vendor tool licences, because those have queues.

Reassess after two weeks using work you actually finished and how tired you are, not what you intended.`, {
      terms: [
        ['Discretionary hours', 'Time beyond what the degree requires, spent on the portfolio. Ten a week in term.'],
        ['Design review', 'A short session where a capable person looks at one narrow question of yours and you record the correction.'],
        ['Deliverable', 'Something finished that someone else can use or inspect. The unit of evidence for a CV.'],
      ]
    }),

    // =====================================================================================================
    // HARDWARE — registers, the clock edge, nonblocking assignment (H02 L1)
    // =====================================================================================================
    q.info('H', 'Why hardware needs one agreed instant', `Combinational logic has no memory: its outputs follow its inputs after a delay, and the delay is different down every path. Feed such logic back into itself — a counter whose "+1" output returns to its own input — and it never settles. The new value arrives, gets incremented again, and round it goes.

The fix is to put a **storage element** in the loop that only accepts a new value at agreed moments. Between those moments it holds, so the logic downstream has a stable input and time to settle.

That single decision organises all of digital design. Choose an instant, let everything between storage elements settle before it arrives, and the whole chip advances one step. The signal that names those instants is the **clock**.

The next question is the sharp one: should the storage element accept new values while the clock is *high*, or only at the single moment it *changes*? Those are two genuinely different machines.`, {
      terms: [
        ['Combinational logic', 'Logic whose output depends only on its present inputs, with no memory.'],
        ['Propagation delay', 'The time for a change at an input to reach the output. Different on every path.'],
        ['Clock', 'A signal that alternates high and low, naming the moments at which storage may change.'],
        ['Register', 'A storage element (one D flip-flop per bit) that captures its input at the clock and holds it.'],
        ['Settle', 'To finish changing. Logic must settle before the next capture, or the wrong value is stored.'],
      ]
    }),
    q.info('H', 'A level lets it run; an edge lets it step', `A **latch** is transparent while its enable is high: whatever arrives at the input passes straight to the output. Put one in the counter loop and, for as long as the clock is high, the incremented value falls through the latch, gets incremented again, falls through again. In one clock pulse the counter advances as many times as the gate delays allow.

That is a disaster for two reasons. The count now depends on how long the pulse was and how fast the gates happen to be — so it changes with temperature, with the chip, and between simulation and silicon. And nothing in your description says how many times it should count.

A **flip-flop** captures at the **edge**: the single instant the clock goes from 0 to 1. An instant has no duration, so the loop cannot go round twice. One edge means exactly one update, whether the pulse lasts 1 ns or 1 second.

That is the whole reason edge-triggered design won. Behaviour depends on the **number of edges**, which you control, instead of on delays, which you do not.`, {
      terms: [
        ['Latch (level-sensitive)', 'Transparent while its enable is high; holds when it is low.'],
        ['Flip-flop (edge-triggered)', 'Captures its input at one instant — the clock edge — and holds until the next.'],
        ['Rising edge (posedge)', 'The moment the clock goes from 0 to 1.'],
        ['Race', 'A result that depends on which of two signals happens to arrive first. What edges eliminate.'],
        ['Transparent', 'Passing the input straight through to the output, with no storage.'],
      ],
      widget: W('edgelevel', { width: 3, targetWidth: 3 })
    }),
    q.goal('H', 'In the edge-vs-level simulation, set the clock to stay high for **3 gate delays** and then apply one clock pulse, so you can compare what the latch-based counter and the flip-flop-based counter each did in that single pulse.', W('edgelevel', { width: 3, targetWidth: 3 }), s => s.pulses >= 1 && s.width === 3,
      'One pulse, three gate delays high: the flip-flop counter advanced by exactly 1, the latch counter advanced by 3 because the incremented value kept falling straight back through the transparent latch. Change the pulse width and the latch answer changes with it; the flip-flop answer never does.'),
    q.mc('H', 'A 4-bit counter is built by feeding its "+1" output back into its own storage. Why does a level-sensitive latch make this unusable?', ['While the clock is high the latch is transparent, so the incremented value loops round again and again, and the count depends on pulse width and gate delay rather than on the number of pulses', 'A latch cannot store 4 bits', 'The latch would never change at all', 'The counter would count backwards'], 0, 'Transparency means the feedback loop is closed for the whole time the clock is high. Nothing in the design fixes how many times it goes round, so the answer varies with temperature, silicon and simulator. An edge is an instant, so the loop closes exactly once.'),
    q.info('H', 'What `<=` actually models', `Inside a clocked block, Verilog offers two assignment operators, and choosing wrongly produces hardware that is not what you described.

A real chip has all its flip-flops wired to the same clock. At the edge, **every one of them samples the value present on its input at that moment**, and then they all change together. No flip-flop can see another's new value, because there was no time in between.

The **nonblocking** assignment \`<=\` models exactly that. Every right-hand side in the block is evaluated using the values from **before** the edge; only then does every left-hand side take its new value.

So these two lines, with a = 1 and b = 2:

\`\`\`
a <= b;      // reads the old b = 2
b <= a;      // reads the old a = 1
\`\`\`

produce a = 2 and b = 1 at the same instant. It is a **swap** — in real hardware, two flip-flops whose inputs are crossed over. On the next edge they swap back, so the pair alternates every cycle forever.`, {
      terms: [
        ['Nonblocking assignment (<=)', 'Every right-hand side reads the pre-edge value; every left-hand side updates together. Models flip-flops.'],
        ['Pre-edge value', 'The value a register held just before the clock edge — what every right-hand side sees.'],
        ['always_ff', 'The Verilog block for logic that happens on a clock edge.'],
        ['Swap', 'Two registers exchanging values in one edge. Impossible in software without a temporary; free in hardware.'],
      ],
      widget: W('regtrace', { init: { a: 1, b: 2 }, assigns: [['a', 'b'], ['b', 'a']] })
    }),
    q.mc('H', 'Two registers hold a = 1 and b = 2. A clocked block contains `a <= b;` and `b <= a;` with nonblocking assignments. What are a and b after **one** rising clock edge?', ['a = 2, b = 1', 'a = 2, b = 2', 'a = 1, b = 2', 'a = 1, b = 1'], 0, 'Both right-hand sides are evaluated from the pre-edge values (b = 2 and a = 1) and both registers update together, so the two values are exchanged. In hardware this is simply two flip-flops with crossed inputs.', { grid: true }),
    q.mc('H', 'Two registers hold a = 1 and b = 2. A clocked block contains `a <= b;` and `b <= a;` with nonblocking assignments. What are a and b after **two** rising clock edges?', ['a = 1, b = 2 — swapped back to where they started', 'a = 2, b = 1', 'a = 2, b = 2', 'a = 0, b = 0'], 0, 'The first edge gives a = 2, b = 1; the second swaps them again and restores a = 1, b = 2. The pair alternates with a period of two cycles, which is a genuinely useful circuit (a divide-by-two, or a ping-pong buffer select).', { grid: true }),
    q.tf('H', 'With nonblocking assignments in a clocked block, every right-hand side is evaluated using the value the register held **before** the clock edge.', true, 'That is precisely what `<=` means, and it is why it models hardware: all the flip-flops on a clock sample at the same instant, so none of them can see another\'s new value.'),
    q.mc('H', 'Two registers hold a = 1 and b = 2. A clocked block contains `a = b;` then `b = a;` with **blocking** assignments in that order. What are a and b after one rising clock edge?', ['a = 2, b = 2', 'a = 2, b = 1', 'a = 1, b = 2', 'a = 1, b = 1'], 0, 'Blocking assignments run in sequence like software. `a = b` makes a into 2 immediately, so `b = a` then copies the new 2 back into b. Both end at 2 and the value 1 is destroyed — not a swap, and not what the two crossed flip-flops would do.', { grid: true }),
    q.mc('H', 'Why does the **order** of the two lines matter with blocking `=` in a clocked block, but not with nonblocking `<=`?', ['Blocking assignments take effect immediately, so a later line sees an earlier line\'s new value; nonblocking assignments all read pre-edge values, so reordering them changes nothing', 'Nonblocking assignments are simply slower to simulate', 'Blocking assignments are evaluated in reverse order', 'Order never matters in Verilog'], 0, 'Order-independence is the point. Real flip-flops on one clock have no order between them, so the description that models them must have none either. If reordering your lines changes the result, you have described software, not hardware.'),
    q.code('H', 'Build: write `solve(init, assigns, k, mode)`, a cycle-level model of a bank of clocked registers. `init` is a dictionary mapping register name to starting value. `assigns` is a list of `[lhs, rhs]` pairs meaning "register lhs takes the value of register rhs", and no register appears as an lhs twice. `k` is the number of clock edges to apply. `mode` is `"nonblocking"` (every right-hand side reads the values from before the edge, then all registers update together) or `"blocking"` (the pairs are applied in order and each one takes effect immediately). Return a list of `k` dictionaries: the state of every register after each edge.', {
      fn: 'solve',
      starter: 'def solve(init, assigns, k, mode):\n    regs = dict(init)\n    trace = []\n    for _ in range(k):\n        if mode == "nonblocking":\n            pass    # read every rhs from a snapshot taken before the edge, then apply them all\n        else:\n            pass    # apply the pairs in order, each taking effect at once\n        trace.append(dict(regs))\n    return trace\n',
      tests: [
        { args: [{ a: 1, b: 2 }, [['a', 'b'], ['b', 'a']], 3, 'nonblocking'], expect: [{ a: 2, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 1 }], name: 'the classic swap, alternating every edge' },
        { args: [{ a: 1, b: 2 }, [['a', 'b'], ['b', 'a']], 2, 'blocking'], expect: [{ a: 2, b: 2 }, { a: 2, b: 2 }], name: 'blocking destroys the 1 on the first edge' },
        { args: [{ a: 1, b: 2, c: 3 }, [['a', 'b'], ['b', 'c'], ['c', 'a']], 1, 'nonblocking'], expect: [{ a: 2, b: 3, c: 1 }], name: 'a three-register rotate happens in one edge' },
        { args: [{ a: 1, b: 0, c: 0 }, [['b', 'a'], ['c', 'b']], 1, 'nonblocking'], expect: [{ a: 1, b: 1, c: 0 }], name: 'a two-stage shift register moves data one stage per edge' },
        { args: [{ a: 1, b: 0, c: 0 }, [['b', 'a'], ['c', 'b']], 1, 'blocking'], expect: [{ a: 1, b: 1, c: 1 }], name: 'the same lines with blocking: the data races through every stage at once' },
        { args: [{ a: 1, b: 0, c: 0 }, [['c', 'b'], ['b', 'a']], 1, 'blocking'], expect: [{ a: 1, b: 1, c: 0 }], name: 'blocking again, lines reordered: a different answer from the same circuit' },
        { args: [{ a: 5 }, [['a', 'a']], 4, 'nonblocking'], expect: [{ a: 5 }, { a: 5 }, { a: 5 }, { a: 5 }], name: 'a register that reloads itself holds its value' },
        { args: [{ a: 1, b: 2 }, [['a', 'b'], ['b', 'a']], 0, 'nonblocking'], expect: [], name: 'no edges: no state changes at all' },
      ],
      gen: 'def gen():\n    names = ["a", "b", "c", "d"]\n    for _ in range(30):\n        n = random.randint(1, 4)\n        ns = names[:n]\n        init = {x: random.randint(0, 9) for x in ns}\n        lhs = random.sample(ns, random.randint(1, n))\n        assigns = [[l, random.choice(ns)] for l in lhs]\n        yield [init, assigns, random.randint(0, 4), random.choice(["nonblocking", "blocking"])]',
      refCode: 'def ref(init, assigns, k, mode):\n    regs = dict(init)\n    trace = []\n    for _ in range(k):\n        if mode == "nonblocking":\n            snap = dict(regs)\n            nxt = dict(regs)\n            for l, r in assigns:\n                nxt[l] = snap[r]\n            regs = nxt\n        else:\n            for l, r in assigns:\n                regs[l] = regs[r]\n        trace.append(dict(regs))\n    return trace',
      speed: { gen: 'def gen():\n    init = {"a": 1, "b": 2, "c": 3, "d": 4}\n    return [init, [["a", "b"], ["b", "c"], ["c", "d"], ["d", "a"]], 20000, "nonblocking"]', budgetMs: 1500, label: '20,000 clock edges on a 4-register rotate' },
      solution: 'def solve(init, assigns, k, mode):\n    regs = dict(init)\n    trace = []\n    for _ in range(k):\n        if mode == "nonblocking":\n            pending = [(l, regs[r]) for l, r in assigns]\n            for l, v in pending:\n                regs[l] = v\n        else:\n            for l, r in assigns:\n                regs[l] = regs[r]\n        trace.append(dict(regs))\n    return trace'
    }, 'The two branches differ by one idea and that idea is the whole lesson. For nonblocking, every right-hand side is read into a pending list **before** any register is written, so no assignment can observe another\'s new value — exactly what flip-flops sharing a clock do. For blocking, each write lands immediately, so a later line sees the earlier one\'s result. The tests make the difference visible: the same two-stage shift register moves data one stage per edge with `<=`, but races all the way through in a single edge with `=` — and reordering the two blocking lines changes the answer again, which is the surest sign you are no longer describing hardware. Note also that each edge appends a **copy** of the register state; appending the live dictionary would give you k references to one object that keeps changing.'),
    q.mc('H', 'Interview: a designer writes a three-stage shift register as `c = b; b = a;` with blocking assignments inside `always_ff @(posedge clk)`. Simulation looks right. What is your concern?', ['It only looks right because of the line order; written the other way round the data would race through both stages in one edge, and the description no longer matches the hardware it is meant to build', 'Blocking assignments are illegal in Verilog', 'The shift register will run one cycle late', 'Nothing: blocking and nonblocking are equivalent in a clocked block'], 0, 'A correct-looking result that depends on statement order is fragile: the next person reorders the lines, or a tool schedules them differently, and the behaviour changes. Use `<=` in clocked blocks so order cannot matter, which is also what the synthesised flip-flops actually do.'),
    q.mc('H', 'Interview: how would you explain to a software engineer why `a <= b; b <= a;` swaps two registers with no temporary variable?', ['The two right-hand sides are read at the same instant from the pre-edge values, and only then are the registers written, so the read of a happens before the write to a — the temporary is the wire itself', 'The compiler inserts a hidden temporary variable', 'Verilog evaluates the second statement first', 'Registers in hardware can hold two values at once'], 0, 'In software the two statements happen at different times, so the first write destroys what the second needs. In hardware every flip-flop reads its input and writes its output at the same edge, and the value in flight lives on the wire between them. Nothing needs to be saved.'),
    q.mc('H', 'Interview: your design uses a gated clock — an AND gate between the clock and a register — so the register only updates on some cycles. Why is a clock **enable** on the flip-flop preferred?', ['A gated clock can produce glitches and skew that make the capture instant unreliable, while an enable leaves one clean clock reaching every flip-flop and simply selects whether the new value is taken', 'A clock enable uses fewer flip-flops', 'Gated clocks are slower to simulate', 'There is no difference; the two are interchangeable'], 0, 'Everything edge-triggered design buys you rests on the clock arriving cleanly and at nearly the same time everywhere. Putting logic in the clock path risks a glitch that looks like an extra edge. An enable keeps the clock pristine and puts the decision in the data path, where a glitch is harmless because it settles before the edge.'),

    // =====================================================================================================
    // CODE — streams, pipes and exit status (S03 L1)
    // =====================================================================================================
    q.info('S', 'Two output streams, and why one is not enough', `A program produces two very different kinds of text. **Results** — the data you asked for. **Diagnostics** — warnings, progress, errors.

If they shared one stream you could never separate them. Send the output of a decoder into a file and the error messages would land in the middle of your data. Pipe it into another program and the warnings would arrive as if they were records.

So every process gets two output channels. **stdout** carries results. **stderr** carries diagnostics. On a terminal they are interleaved and look identical, which is exactly why people forget they are separate.

They part company as soon as you redirect. \`prog > log.txt\` sends **only stdout** to the file. Errors keep going to the screen — which is a feature: the data is captured and you can still see something went wrong.

To capture errors too: \`2> errors.txt\` puts stderr in its own file, and \`> log.txt 2>&1\` sends both to one place. Read \`2>&1\` as "make stream 2 go wherever stream 1 is now going", which is why it must come **after** the \`>\`.`, {
      terms: [
        ['stdout (stream 1)', 'The results stream. Redirected by > and fed into a pipe by |.'],
        ['stderr (stream 2)', 'The diagnostics stream. Not touched by > — you need 2> for it.'],
        ['Redirect', 'Sending a stream somewhere other than the terminal: > for stdout, 2> for stderr.'],
        ['2>&1', '"Send stderr to wherever stdout is currently going." Order matters: it must follow the > it refers to.'],
      ],
      widget: W('terminal', {})
    }),
    q.mc('S', 'You run `python check.py bad.bin > out.txt`. An error message still appears on the screen and is not in out.txt. Why?', ['Error messages go to stderr, and `>` redirects stdout only', 'A text file cannot store error messages', 'The program crashed before it could write the file', 'Python ignores redirection'], 0, 'The two streams are separate on purpose. Use `2> errors.txt` to capture the diagnostics separately, or `> out.txt 2>&1` to merge both into one file.'),
    q.mc('S', 'Which command sends **both** stdout and stderr of `prog` into log.txt?', ['prog > log.txt 2>&1', 'prog > log.txt', 'prog 2> log.txt', 'prog | log.txt'], 0, '`> log.txt` points stdout at the file, and `2>&1` then points stderr at wherever stdout is now going. Writing `2>&1 > log.txt` instead would point stderr at the terminal (where stdout was at that moment) and only then move stdout to the file — a classic ordering bug.', { grid: true }),
    q.info('S', 'Pipes, and the status nobody prints', `\`a | b\` connects a's **stdout** directly to b's **stdin**, so the two programs run at the same time with data flowing between them. Errors are untouched: they go to the terminal, so you watch the complaints while the data keeps moving. That is the payoff for keeping the streams apart.

Now the part that automation actually reads. When a process ends it returns one small integer to whoever started it: its **exit status**. By convention **0 means success** and anything else means failure.

Nobody prints it, so it is easy to forget it exists. The shell keeps the last one in \`$?\`. Every \`if\`, \`&&\` and \`||\` in a script is testing it. A build system deciding whether your tests passed is reading it, and nothing else.

Which gives the rule: **a program that finds a problem and exits 0 is lying to everything downstream.** Your printed "3 FAILURES" is prose; no build system reads prose. Exit nonzero.

The usual codes: 0 success, 1 general failure, 2 wrong usage, 127 command not found. In a pipeline the status is the **last** command's unless you ask for stricter behaviour.`, {
      terms: [
        ['Pipe (|)', 'Connects one program\'s stdout to the next program\'s stdin, so they run concurrently.'],
        ['stdin', 'The input stream a program reads, whether from a keyboard, a file or a pipe.'],
        ['Exit status', 'The small integer a process returns when it ends. 0 = success by convention.'],
        ['$?', 'The shell variable holding the exit status of the command that just finished.'],
        ['CI (continuous integration)', 'A system that runs your build and tests on every change and decides pass or fail from the exit status.'],
      ]
    }),
    q.num('S', 'By convention, what exit status does a program return to indicate **success**?', 0, 'Zero means success; every nonzero value means some kind of failure. It is the other way round from a boolean, and it is that way because there is only one way to succeed and many ways to fail, so the nonzero values can carry the reason.'),
    q.mc('S', 'A test script finds 3 failing tests, prints them clearly, and then exits with status 0. What is the consequence?', ['Every calling script and the build system treat the run as a pass, so the failures are invisible to automation', 'Nothing: printing the failures is enough', 'The build system searches the printout for the word FAIL', 'The exit status is ignored by build systems'], 0, 'Automation reads the exit status, not your prose. A test runner that exits 0 on failure disables every gate downstream — and it fails silently, which is the worst kind.'),
    q.mc('S', 'Why is it useful that errors go to stderr rather than into the pipe when you run `decode data.bin | count_records`?', ['The data keeps flowing to count_records while the diagnostics appear on your terminal, so warnings can never be mistaken for records', 'Errors are faster to write to stderr', 'Pipes cannot carry more than one stream at a time for technical reasons', 'It makes the pipeline run in parallel'], 0, 'If diagnostics went down the pipe, the next program would try to parse "warning: skipping record 12" as data. Keeping them apart is what makes composing programs with pipes safe.'),
    q.code('S', 'Write `solve(lines)`, a small checking program modelled as a function. `lines` is a list of input records, each expected to be exactly `name=value` where `name` is one or more lowercase ASCII letters and `value` is one or more ASCII digits with numeric value 0 to 255 inclusive. Split each record at its **first** `=`. Return the three things a real program returns: `[code, out, err]`. For every valid record append the string `"name value"` (the value with any leading zeros removed) to `out`. For every invalid record append `"line N: bad record: <the original line>"` to `err`, where N is the 1-based position of the record. The exit code is `2` if `lines` is empty, `1` if any record was invalid, and `0` otherwise.', {
      fn: 'solve',
      starter: 'def solve(lines):\n    if not lines:\n        return [2, [], []]\n    out, err = [], []\n    for i, line in enumerate(lines, 1):\n        name, sep, value = line.partition("=")\n        # accept only: an "=" was present, name is lowercase ASCII letters,\n        # value is ASCII digits, and its numeric value is 0..255\n        pass\n    return [0, out, err]\n',
      tests: [
        { args: [['a=1', 'b=255']], expect: [0, ['a 1', 'b 255'], []], name: 'all valid: exit 0 and nothing on stderr' },
        { args: [['a=1', 'oops']], expect: [1, ['a 1'], ['line 2: bad record: oops']], name: 'good records still reach stdout while the bad one is reported' },
        { args: [[]], expect: [2, [], []], name: 'empty input is a usage problem, not a data problem' },
        { args: [['a=256']], expect: [1, [], ['line 1: bad record: a=256']], name: 'one past the upper limit' },
        { args: [['a=0']], expect: [0, ['a 0'], []], name: 'exactly at the lower limit' },
        { args: [['A=1']], expect: [1, [], ['line 1: bad record: A=1']], name: 'an uppercase name is not accepted' },
        { args: [['=5']], expect: [1, [], ['line 1: bad record: =5']], name: 'an empty name' },
        { args: [['a=007']], expect: [0, ['a 7'], []], name: 'leading zeros are digits, and the value is normalised' },
        { args: [['a=1=2']], expect: [1, [], ['line 1: bad record: a=1=2']], name: 'splitting at the first = leaves "1=2", which is not digits' },
        { args: [['a=²']], expect: [1, [], ['line 1: bad record: a=²']], name: 'superscript two: isdigit() says yes, so the ASCII check is what rejects it' },
      ],
      gen: 'def gen():\n    pieces = ["a", "bc", "A", "", "a1", "z"]\n    vals = ["0", "1", "255", "256", "007", "", "x", "1=2", "\\u00b2"]\n    for _ in range(30):\n        n = random.randint(0, 5)\n        yield [[random.choice(pieces) + random.choice(["=", ""]) + random.choice(vals) for _ in range(n)]]',
      refCode: 'import re\n\n\ndef ref(lines):\n    if not lines:\n        return [2, [], []]\n    out, err = [], []\n    for i, line in enumerate(lines, 1):\n        m = re.fullmatch(r"([a-z]+)=([0-9]+)", line)\n        if m and int(m.group(2)) <= 255:\n            out.append(m.group(1) + " " + str(int(m.group(2))))\n        else:\n            err.append("line " + str(i) + ": bad record: " + line)\n    return [1 if err else 0, out, err]',
      solution: 'def solve(lines):\n    if not lines:\n        return [2, [], []]\n    out, err = [], []\n    for i, line in enumerate(lines, 1):\n        name, sep, value = line.partition("=")\n        ok = (sep == "=" and name.isascii() and name.isalpha() and name.islower()\n              and value.isascii() and value.isdigit() and int(value) <= 255)\n        if ok:\n            out.append(name + " " + str(int(value)))\n        else:\n            err.append("line " + str(i) + ": bad record: " + line)\n    return [1 if err else 0, out, err]'
    }, 'This is the shape every command-line program has, written as a function so it can be tested without a shell. Results go to `out` (stdout), diagnostics to `err` (stderr), and the verdict is the exit code — which is the only part automation reads. Three details are the point. Good records still reach stdout even when a later one is rejected, so a pipeline keeps working while you are told what was dropped. The diagnostics name the **line number**, because "bad record" without a location is unusable at scale. And the codes are distinguished: 2 for "you called me wrongly" (no input at all) versus 1 for "your data had problems", so a calling script can react differently. On the validation itself: `partition` splits at the first `=` only, so `a=1=2` leaves the value `1=2`, and the ASCII checks matter because Python calls the superscript "²" a digit while `int()` refuses it.'),
    q.num('S', 'A shell command finishes and you immediately run `echo $?`, which prints 2. What does that tell you about the command that just ran?', 2, 'It exited with status 2 — a failure, and by the usual convention the "you called me wrongly" kind rather than the general failure of 1. Any nonzero value means failure; only 0 means success.'),
    q.mc('S', 'In a script, `make && ./run_tests.sh` runs the tests only if `make` succeeds. What is the shell actually testing?', ['The exit status of `make`: `&&` runs the right-hand command only when the left-hand one exited 0', 'Whether `make` printed anything to stdout', 'Whether `make` printed anything to stderr', 'Whether the makefile exists'], 0, 'Every conditional in a shell script — `if`, `&&`, `||` — branches on the exit status and nothing else. That is why a program which fails but exits 0 quietly disables the whole chain.'),
    q.mc('S', 'A program writes its progress messages ("processed 1000 records…") to **stdout** rather than stderr. What breaks?', ['Anything that redirects or pipes the results now receives the progress messages mixed in with the data', 'Nothing breaks; progress messages belong on stdout', 'The exit status becomes unreliable', 'The program can no longer be run interactively'], 0, 'Only the actual results belong on stdout. Progress, warnings and errors are diagnostics, and putting them on stderr is what lets someone capture the results cleanly while still watching the progress on screen.'),
    q.mc('S', 'Interview: a data pipeline runs `producer | consumer` and the producer dies half way through, but the whole command reports success. What is happening?', ['A shell reports the exit status of the **last** command in a pipeline, so the consumer\'s success masks the producer\'s failure unless the shell is told to fail on any stage', 'Pipes always report success', 'The producer\'s failure is reported on stderr instead of the exit status', 'The consumer restarts the producer automatically'], 0, 'By default only the last stage\'s status survives, which is exactly wrong for a data pipeline where the first stage supplies the data. Shells provide a strict mode for this, and a script that processes real data should enable it.'),
    q.mc('S', 'Interview: a build job runs `pytest > results.txt` and then searches results.txt for the word "failed" to decide whether to deploy. Give two independent reasons this is fragile.', ['It ignores the exit status, which is the one machine-readable verdict, and `>` does not capture stderr — so a crash that prints only to stderr leaves a results.txt with no "failed" in it at all', 'It is too slow, and results.txt uses too much disk space', 'pytest cannot be redirected, and the word "failed" is spelled differently in some versions', 'Searching a file is unreliable because files are written asynchronously'], 0, 'Parsing prose to decide a build is guessing at something the process already told you exactly. And because `>` leaves stderr on the terminal, the worst failures — a crash before any test ran — produce a clean-looking file. Branch on the exit status, and capture both streams if you want a log.'),
    q.mc('S', 'Interview: a colleague writes a script that prints "ERROR: checksum mismatch" and then calls `exit(0)` because "the message is clear enough". What do you tell them?', ['Nothing downstream reads the message — build systems, `&&` chains and calling scripts all branch on the exit status, so exiting 0 tells every one of them the run passed', 'The message should be printed to stdout instead', 'They should print the message twice to be sure', 'It is fine as long as a human runs the script'], 0, 'Prose is for people; the exit status is for machines. A run that detects a problem and exits 0 silently disables every automated gate that depends on it, and nobody notices until the bad artefact ships.'),

    // =====================================================================================================
    // MATHS — conditional probability and the rare-fault detector (M04 L2)
    // =====================================================================================================
    q.info('M', 'Conditioning is shrinking the world', `An ordinary probability is a share of everything that could happen. A **conditional** probability, written P(A | B), is a share of a smaller world: you are told B happened, so only outcomes inside B are still possible, and you ask what fraction of *those* are also in A.

That is the whole definition:

**P(A | B) = P(A and B) / P(B)**

The denominator is the new, smaller world. The numerator is the part of it you care about.

Two consequences follow immediately, and both trip people up.

Conditioning can move a probability either way — knowing B can make A more likely or less. And **P(A | B) is not P(B | A)**: the fraction of dogs that are brown is nothing like the fraction of brown things that are dogs. Today's whole strand is one long example of that second point.`, {
      terms: [
        ['Conditional probability P(A | B)', 'The probability of A once you know B happened: P(A and B) ÷ P(B).'],
        ['Conditional sample space', 'The shrunken world of outcomes still possible once B is known.'],
        ['Base rate (prior)', 'How common something is before any evidence arrives.'],
        ['Posterior', 'The updated probability after the evidence is taken into account.'],
      ]
    }),
    q.num('M', 'Two fair dice are rolled. Given that their sum is **even**, what is the probability that **both** dice show an even number? Give it as a decimal.', 0.5, 'Shrink the sample space to the even-sum outcomes. A sum is even when both dice are even (3 × 3 = 9 outcomes) or both are odd (3 × 3 = 9 outcomes), so the conditional world has 18 outcomes, not 36. Nine of them are both-even: 9/18 = 0.5.', { tol: 0.005, display: '9/18 = 1/2' }),
    q.mc('M', 'Two fair dice are rolled and you are told the sum is even. What has changed about the calculation you now do?', ['The sample space has shrunk from 36 outcomes to the 18 with an even sum, and every probability is now a share of those 18', 'Nothing changes; conditioning never affects the sample space', 'Each die now has only 3 faces available, so there are 9 outcomes', 'The dice are no longer independent of each other'], 0, 'Conditioning means discarding every outcome incompatible with what you were told and renormalising over what is left. That single move is the whole content of P(A | B) = P(A and B)/P(B).'),
    q.info('M', 'Ten thousand trials, counted honestly', `A fault occurs on **1%** of trials. A detector flags **90%** of the faults it sees. It also flags **5%** of the good trials. A flag appears. How likely is a real fault?

Do not reach for a formula. Count 10,000 imaginary trials.

- Faults: 1% of 10,000 = **100**. Flagged: 90% of 100 = **90**.
- Good trials: **9,900**. Wrongly flagged: 5% of 9,900 = **495**.
- Total flags: 90 + 495 = **585**, of which 90 are genuine.

**P(fault | flag) = 90/585 ≈ 15.4%.**

Better than the 1% you started with — the evidence did help — but more than five alarms in six are false.

The reason is visible in the numbers rather than any algebra. There are 99 good trials for every faulty one, so a small percentage of a very large group easily beats a large percentage of a tiny one. 5% of 9,900 is simply bigger than 90% of 100.

This is why "the test is 90% accurate" is not an answer to "how worried should I be?".`, {
      terms: [
        ['Sensitivity', 'P(flag | fault): the share of real faults the detector catches. Here 90%.'],
        ['False positive rate', 'P(flag | no fault): the share of good trials wrongly flagged. Here 5%.'],
        ['Specificity', 'P(no flag | no fault): the share of good trials correctly passed. Here 95%, i.e. 1 − the false positive rate.'],
        ['False alarm', 'A flag raised on a trial that was actually fine. 495 of them here.'],
      ],
      widget: W('bayesgrid', { base: 1, sens: 90, fpr: 5 })
    }),
    q.num('M', 'A fault occurs on 1% of trials. A detector flags 90% of faults and 5% of good trials. Out of 10,000 trials, how many **good** trials get flagged?', 495, '10,000 trials contain 100 faults and 9,900 good trials. 5% of 9,900 = 495 false alarms — already more than five times the 90 genuine detections.'),
    q.num('M', 'A fault occurs on 1% of trials. A detector flags 90% of faults and 5% of good trials. A flag appears. What is the probability it is a real fault, as a decimal to 3 d.p.?', 90 / 585, 'Of 10,000 trials: 100 faults give 90 flags; 9,900 good trials give 495 flags. Total 585 flags, 90 genuine: 90/585 = 0.154. You may type 90/585.', { tol: 0.002, display: '90/585 ≈ 0.154' }),
    q.mc('M', 'A detector with 90% sensitivity gives a posterior of only about 15% on a fault that occurs 1% of the time. Why is the posterior so much lower than the sensitivity?', ['The fault is rare, so 5% of the very many good trials produces more flags than 90% of the very few faulty ones', 'The detector must be faulty', 'Sensitivity and posterior are the same quantity, so one of the numbers is wrong', 'Because 90% is less than 95%'], 0, 'Sensitivity answers "given a fault, will it be flagged?" The posterior answers the reverse question, and the reverse question depends on how many faults there were to begin with. With 99 good trials per fault, the base rate dominates.'),
    q.info('M', "Bayes' rule, and which knob actually helps", `Where does the table come from? Write P(fault and flag) in the two obvious ways and set them equal:

P(fault | flag)·P(flag) = P(flag | fault)·P(fault)

Divide by P(flag) and you have **Bayes' rule**:

**P(fault | flag) = P(flag | fault) · P(fault) / P(flag)**

with P(flag) counted over both ways a flag can arise: 0.9 × 0.01 + 0.05 × 0.99 = 0.0585. Then 0.009/0.0585 = 0.154, as counted.

Now the engineering question: you can improve one number. Which?

**Raise sensitivity to 100%.** Every one of the 100 faults is caught, the 495 false alarms are untouched: 100/595 = **16.8%**. Almost nothing.

**Cut the false positive rate from 5% to 0.5%.** The 90 detections are untouched, the false alarms drop to 49.5: 90/139.5 = **64.5%**.

When the event is rare, the false positive rate is the number that matters, because it is multiplied by the huge group. Chasing sensitivity is the intuitive move and the wrong one.`, {
      terms: [
        ["Bayes' rule", 'P(A | B) = P(B | A)·P(A) / P(B). It reverses the conditioning, weighted by the base rate.'],
        ['Law of total probability', 'P(flag) = P(flag | fault)P(fault) + P(flag | no fault)P(no fault): every route to the evidence, added up.'],
        ['Prior odds / posterior odds', 'The odds before and after the evidence. The evidence multiplies the odds by its likelihood ratio.'],
      ]
    }),
    q.num('M', 'A fault occurs on 1% of trials. A detector flags 5% of good trials and its sensitivity is improved to a perfect 100%. Out of 10,000 trials, what is P(fault | flag) as a decimal to 3 d.p.?', 100 / 595, 'All 100 faults are now flagged, but the 495 false alarms are unchanged: 100/(100 + 495) = 100/595 = 0.168. Perfecting sensitivity moved the answer from 0.154 to 0.168 — almost nothing.', { tol: 0.003, display: '100/595 ≈ 0.168' }),
    q.num('M', 'A fault occurs on 1% of trials and a detector flags 90% of faults. Its false positive rate is improved from 5% to 0.5%. Out of 10,000 trials, what is P(fault | flag) as a decimal to 3 d.p.?', 90 / 139.5, 'The 90 genuine detections are unchanged; the false alarms fall from 495 to 0.5% of 9,900 = 49.5. So 90/(90 + 49.5) = 90/139.5 = 0.645. A tenfold cut in false positives is worth far more than perfect sensitivity.', { tol: 0.003, display: '90/139.5 ≈ 0.645' }),
    q.mc('M', 'A detector flags 90% of faults and 5% of good trials. If the fault rate rose from 1% to 50%, what would happen to P(fault | flag)?', ['It would rise to about 95%, because the two groups are now the same size and the detector\'s advantage shows', 'It would stay at about 15%', 'It would fall, because there are more faults to miss', 'It would become exactly 90%'], 0, '0.9 × 0.5 / (0.9 × 0.5 + 0.05 × 0.5) = 0.45/0.475 = 0.947. Same detector, same sensitivity, completely different answer — which shows the posterior is a property of the situation, not of the instrument.'),
    q.num('M', 'Interview: a fault occurs on 1% of trials. **Two** detectors, each flagging 90% of faults and 5% of good trials, are run on one trial and both raise a flag. Assuming their errors are independent given the true state, what is P(fault | both flag), to 3 d.p.?', 0.766, 'Weight each hypothesis by how likely it makes the evidence. Fault: 0.01 × 0.9 × 0.9 = 0.0081. No fault: 0.99 × 0.05 × 0.05 = 0.002475. Posterior = 0.0081/(0.0081 + 0.002475) = 0.766. Two independent 15% alarms combine into a fairly convincing one.', { tol: 0.004 }),
    q.mc('M', 'Interview: two detectors, each flagging 90% of faults and 5% of good trials on a fault that occurs 1% of the time, both flag one trial — but they share a temperature sensor, so when it drifts they both false-alarm together. What is wrong with multiplying their likelihoods to get 0.766?', ['Multiplying assumes the two false alarms are independent given the true state; with a shared cause a double flag is far more likely on a good trial than 0.05 × 0.05, so the real posterior is lower than 0.766', 'Nothing: the calculation is valid for any two detectors', 'The posterior would be higher, not lower, because two detectors are better than one', 'Likelihoods may never be multiplied under any circumstances'], 0, 'Conditional independence is an assumption about the world, not a property of arithmetic. When a common cause makes both detectors wrong at once, the second flag adds far less evidence than it appears to — and confidently reporting 0.766 is worse than admitting you do not know.'),
    q.mc('M', 'Interview: an engineer says "the detector is 90% accurate, so when it flags a board there is a 90% chance the board is faulty". Name the error.', ['They have swapped the conditioning: 90% is P(flag | fault), while the question asks for P(fault | flag), and the two differ enormously when faults are rare', 'They should have used 95% rather than 90%', 'The error is arithmetic: 90% should be 15% of 90%', 'There is no error; the two statements are equivalent'], 0, 'This swap is common enough to have a name — the prosecutor\'s fallacy. P(evidence | cause) and P(cause | evidence) are related by Bayes\' rule, and the bridge between them is the base rate. Here it turns 90% into about 15%.'),

    // =====================================================================================================
    // DEGREE — node-voltage analysis (E01)
    // =====================================================================================================
    q.info('E', 'Why a systematic method is needed', `So far you have solved circuits by recognising shapes: two resistors in series, two in parallel, a divider. That works until the shapes run out — put a source in the middle of a network and there is nothing left to combine.

You need a method that does not depend on recognising anything: write down equations, solve them, done. **Node-voltage analysis** is that method, and it is the one every simulator uses internally.

The idea is to choose the right unknowns. A circuit has currents in every branch and voltages across every component — far more quantities than are actually independent. But every component connects two **nodes**, and once you know the voltage at every node, every branch current follows from Ohm's law immediately.

So take the **node voltages** as the unknowns. There are only a few, and everything else can be computed from them.`, {
      terms: [
        ['Node', 'A junction: a piece of wire connecting components, all at the same voltage.'],
        ['Branch', 'A component connecting two nodes.'],
        ['Node voltage', 'The voltage of a node measured from the chosen reference node.'],
        ['Unknown', 'A quantity you solve for. Choosing good unknowns is most of the work.'],
      ]
    }),
    q.info('E', 'Choosing a ground removes one unknown for free', `Voltage is a **difference** — "the voltage at this node" means nothing until you say from where. That looks like a nuisance, and it is actually a gift.

Because only differences matter, you may declare any one node to be 0 V. Every other node's voltage is then measured from it. Shifting that choice adds the same constant to every node voltage and changes no difference, so no current and no power changes. Nothing physical depends on it.

The node you pick is the **reference node**, or **ground**. And picking it removes one unknown from the problem: a circuit with n nodes has only **n − 1** unknown node voltages.

Which node? Any of them works, so choose the convenient one: usually the node with the most components attached, typically the bottom rail. That is also the node the sources are usually referred to, so their voltages become known node voltages immediately, killing more unknowns.

Three nodes, one grounded: two equations. That is a size you can solve by hand.`, {
      terms: [
        ['Reference node (ground)', 'The node declared to be 0 V. All other node voltages are measured from it.'],
        ['Degrees of freedom', 'The number of quantities you must actually solve for: here n − 1 node voltages.'],
        ['Bottom rail', 'The common wire at the base of most schematics — usually the convenient ground.'],
      ]
    }),
    q.mc('E', 'A circuit has 4 nodes in total. How many unknown node voltages remain once one node is chosen as ground?', ['3', '4', '2', '1'], 0, 'Declaring one node to be 0 V is free, because only voltage differences are physical. That leaves n − 1 = 3 unknowns, and therefore 3 equations to write.', { grid: true }),
    q.mc('E', 'Which node is usually the most convenient choice for ground?', ['The node with the most components attached, typically the bottom rail — it is also where the sources are referenced, so more voltages become known immediately', 'The node with the highest voltage', 'Any node that touches a resistor', 'The node between the two largest resistors'], 0, 'Every choice is valid and gives identical currents and powers. The convenient one minimises the algebra: attached sources hand you known node voltages, which removes further unknowns.'),
    q.info('E', 'One equation per node: KCL with Ohm substituted', `Charge does not pile up at a junction, so at every node the currents leaving must add to zero. That is **Kirchhoff's current law**, and it is the equation you write at each unknown node.

The trick that makes it mechanical: express every current in terms of node voltages. The current leaving node A through a resistor R towards node B is

**i = (V_A − V_B) / R**

— Ohm's law applied to the difference, pointing away from A. A resistor to ground is the special case with V_B = 0, giving V_A/R. An independent current source contributes its own fixed value, with a sign set by whether it pushes current in or draws it out.

So the recipe is: at each unknown node, add up (this node − that node)/R for every resistor attached, subtract any current being injected, set the total to zero.

Worked example. A 10 V source drives node V through 2 Ω; a 3 Ω resistor runs from V to ground.

(V − 10)/2 + V/3 = 0 → multiply by 6 → 3V − 30 + 2V = 0 → **V = 6 V**.

Check: 2 A arrives through the 2 Ω, 2 A leaves through the 3 Ω.`, {
      terms: [
        ["Kirchhoff's current law (KCL)", 'The currents leaving any node sum to zero, because charge cannot accumulate there.'],
        ['ΔV/R substitution', 'Writing each branch current as (this node − that node) ÷ R, so the only unknowns left are node voltages.'],
        ['Injected current', 'Current pushed into a node by a current source. It enters the equation with the opposite sign to a leaving current.'],
        ['Simultaneous equations', 'One KCL equation per unknown node, solved together.'],
      ],
      widget: W('nodal', { Vs: 10, R1: 2, R2: 3, Is: 0, targetR2: 8 })
    }),
    q.goal('E', 'In the nodal-analysis simulation (a source Vs driving node A through R1, and R2 running from A to ground), set **R2 to 8 Ω** and read the node voltage the KCL equation produces.', W('nodal', { Vs: 10, R1: 2, R2: 3, Is: 0, targetR2: 8 }), s => s.R2 === 8, 'With Vs = 10 V, R1 = 2 Ω and R2 = 8 Ω, KCL at A gives (V − 10)/2 + V/8 = 0, so V(1/2 + 1/8) = 5 and V = 5/0.625 = 8 V. Raising R2 makes it harder for current to leave the node, so the node sits closer to the source voltage.'),
    q.num('E', 'A 10 V source connects to node V through a 2 Ω resistor, and a 3 Ω resistor runs from V to ground. Find the node voltage V, in volts.', 6, 'KCL at V: (V − 10)/2 + V/3 = 0. Multiply through by 6: 3V − 30 + 2V = 0, so 5V = 30 and V = 6 V. It is the divider result, but derived rather than recognised.', { unit: 'V' }),
    q.num('E', 'A 10 V source connects to node V through a 2 Ω resistor, and a 3 Ω resistor runs from V to ground. What current flows through the **3 Ω** resistor, in amperes?', 2, 'Solve the node first: (V − 10)/2 + V/3 = 0 gives V = 6 V. Then i = V/3 = 2 A. Check the other branch: (10 − 6)/2 = 2 A arrives, so current in equals current out, as KCL demands.', { unit: 'A' }),
    q.mc('E', 'In node-voltage analysis, the current flowing from node A (at voltage V_A) to node B (at voltage V_B) through a resistor R is written as…', ['(V_A − V_B)/R', '(V_A + V_B)/R', 'V_A/R', 'R/(V_A − V_B)'], 0, 'Ohm\'s law applied to the potential difference across the resistor, signed in the direction A to B. Every branch current in the circuit becomes an expression of this form, which is what leaves node voltages as the only unknowns.', { grid: true }),
    q.num('E', 'A 12 V source connects to node V through a 4 Ω resistor; a 6 Ω resistor runs from V to ground; and a current source injects 1 A into V. Find V, in volts, to 1 d.p.', 9.6, 'KCL at V, taking currents leaving as positive: (V − 12)/4 + V/6 − 1 = 0. Multiply by 12: 3V − 36 + 2V − 12 = 0, so 5V = 48 and V = 9.6 V. The injected current carries a minus sign because it enters the node.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 10 V source connects to node V1 through 1 Ω. A 2 Ω resistor runs from V1 to ground. A 2 Ω resistor runs from V1 to node V2. A 1 Ω resistor runs from V2 to ground. A current source injects 3 A into V2. State V2, in volts.', 4, 'KCL at V1: (V1 − 10)/1 + V1/2 + (V1 − V2)/2 = 0, which doubles to 4V1 − V2 = 20. KCL at V2: (V2 − V1)/2 + V2/1 − 3 = 0, which doubles to 3V2 − V1 = 6, so V1 = 3V2 − 6. Substituting: 4(3V2 − 6) − V2 = 20, so 11V2 = 44 and V2 = 4 V (with V1 = 6 V).', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 10 V source connects to node V1 through 1 Ω. A 2 Ω resistor runs from V1 to ground. A 2 Ω resistor runs from V1 to node V2. A 1 Ω resistor runs from V2 to ground. A current source injects 3 A into V2. State V1, in volts.', 6, 'The same pair of equations, 4V1 − V2 = 20 and 3V2 − V1 = 6, give V2 = 4 V and V1 = 6 V. Check by current balance at V1: (10 − 6)/1 = 4 A in; out through the 2 Ω to ground is 6/2 = 3 A and through the 2 Ω to V2 is (6 − 4)/2 = 1 A. 4 A in, 4 A out.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 5 A current source injects into node A. A 4 Ω resistor runs from A to ground. A 2 Ω resistor runs from A to node B. A 6 Ω resistor runs from B to ground. State the voltage at node A, in volts, to 1 d.p.', 13.3, 'KCL at B: (V_B − V_A)/2 + V_B/6 = 0, giving 3V_B − 3V_A + V_B = 0, so V_B = 0.75·V_A. KCL at A: V_A/4 + (V_A − V_B)/2 − 5 = 0. Substituting V_B: V_A/4 + 0.125·V_A = 5, so 0.375·V_A = 5 and V_A = 13.33 V. Sanity check: the source sees 4 ∥ (2 + 6) = 4∥8 = 2.667 Ω, and 5 × 2.667 = 13.33 V.', { unit: 'V', tol: 0.1 }),
    q.info('E', 'The awkward case: a source floating between two nodes', `The recipe assumes every branch current can be written as ΔV/R. A **voltage source** breaks that: it fixes the voltage across itself and lets whatever current is needed flow, so there is no equation for its current.

If one end of the source is at ground, there is no problem — the other end is simply a known node voltage and the unknown disappears.

The awkward case is a source **floating** between two unknown nodes. The fix is to stop treating them as two separate nodes for the purposes of KCL. Draw a bubble around both of them and the source, and apply KCL to the **whole bubble**: whatever current the source carries goes in one side of the bubble and out the other, so it cancels and never has to be named. That gives one equation. The source itself supplies the second: it fixes the difference between the two node voltages.

Two nodes, two equations, no unknown current. The bubble is called a **supernode**.`, {
      terms: [
        ['Supernode', 'Two nodes joined by a voltage source, treated as one region for KCL.'],
        ['Floating source', 'A source with neither terminal at ground, so both of its nodes are unknown.'],
        ['Constraint equation', 'The equation a source contributes: it fixes the difference between its two node voltages.'],
      ]
    }),
    q.mc('E', 'A 10 V source sits directly between two nodes, neither of which is ground. Why can you not write the usual KCL equation at each of those two nodes separately?', ['The current through a voltage source is not determined by its voltage, so it cannot be written as ΔV/R; enclosing both nodes in a supernode makes that unknown current cancel', 'A voltage source has infinite resistance, so no current flows through it', 'KCL does not apply to nodes attached to sources', 'The two nodes must be at the same voltage'], 0, 'A resistor tells you its current from the voltage across it; a voltage source does not. Apply KCL to the region containing both nodes and the source, and the unknown current enters and leaves that region, cancelling exactly. The source then supplies the missing second equation as a constraint on the difference.'),
    q.num('E', 'Exam-style: a 5 A current source injects into node A. A 2 Ω resistor runs from A to ground. A 10 V source connects node A to node B with B the more positive terminal, so V_B − V_A = 10 V. A 3 Ω resistor runs from B to ground. State V_A, in volts.', 2, 'Enclose A, B and the source in a supernode. Currents leaving it: V_A/2 through the 2 Ω and V_B/3 through the 3 Ω; the 5 A enters. So V_A/2 + V_B/3 = 5. The source gives the constraint V_B = V_A + 10. Substituting: V_A/2 + (V_A + 10)/3 = 5, multiply by 6 to get 3V_A + 2V_A + 20 = 30, so V_A = 2 V (and V_B = 12 V). Check: 1 A leaves through the 2 Ω and 4 A through the 3 Ω, totalling the 5 A injected.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 5 A current source injects into node A. A 2 Ω resistor runs from A to ground. A 10 V source connects node A to node B with B the more positive terminal, so V_B − V_A = 10 V. A 3 Ω resistor runs from B to ground. State the power **delivered by the 10 V source**, in watts.', 40, 'Solving the supernode gives V_A = 2 V and V_B = 12 V. The only path through the 10 V source is on into the 3 Ω, so it carries that branch current: 12/3 = 4 A. Power delivered = 10 V × 4 A = 40 W. Check the whole circuit: the 2 Ω dissipates 2²/2 = 2 W, the 3 Ω dissipates 12²/3 = 48 W, total 50 W; the current source delivers 5 A × 2 V = 10 W and the voltage source 40 W, also 50 W.', { unit: 'W', tol: 0.5 }),
    q.num('E', 'A 12 V source connects to node V through a 4 Ω resistor; a 6 Ω resistor runs from V to ground; and a current source injects 1 A into V. What current flows through the **4 Ω** resistor, in amperes, to 1 d.p.?', 0.6, 'Solve the node first: (V − 12)/4 + V/6 − 1 = 0 gives V = 9.6 V. Then the current arriving through the 4 Ω is (12 − 9.6)/4 = 0.6 A. Check KCL: 0.6 A in plus 1 A injected equals 9.6/6 = 1.6 A leaving through the 6 Ω.', { unit: 'A', tol: 0.05 }),
    q.num('E', 'Exam-style: a 5 A current source injects into node A. A 4 Ω resistor runs from A to ground. A 2 Ω resistor runs from A to node B. A 6 Ω resistor runs from B to ground. State the voltage at node B, in volts, to 1 d.p.', 10, 'From the two KCL equations, V_B = 0.75·V_A and V_A = 13.33 V, so V_B = 10.0 V. Check by the divider: the 2 Ω and 6 Ω form a chain from A to ground, so V_B = 13.33 × 6/8 = 10 V.', { unit: 'V', tol: 0.1 }),
    ...genius(q, 15),
  ]
};
