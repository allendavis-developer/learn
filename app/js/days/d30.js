import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(30);

export default {
  title: 'Month test — the mini Foundation paper',
  emoji: '🏆',
  kind: 'checkpoint',
  minutes: 45,
  strands: ['H', 'S', 'A', 'M', 'E', 'G'],
  summary: 'The handbook\'s Foundation paper in miniature: signed arithmetic and widths, stall tracing, prefix-sum counting, detector probability, explaining a failing test, plus your degree material in course order. Three code exercises (two medium). The mathematician\'s thread closes the month with parity, telescoping, pigeonhole, symmetry, stopping, random walks and eigenvectors. New values throughout. 80% first-try passes; record the result in the ledger without judging it against an invented cutoff.',
  takeaway: 'Month 1 complete. You can now use invariants, cancellation, extremal counting, symmetry, backward induction, random-walk boundaries and eigen-directions as deliberate problem-solving tools. Next: the Foundation gate (Jan/Feb 2027) needs H01–H04 at L3 with real RTL and a simulator. Month 2 continues the separate mathematical-genius thread alongside H04 FIFOs in RTL, H05 scoreboards, H06 vendor tools, and A03–A04.',
  steps: [
    // ---- H01/H02: arithmetic and state ----
    q.num('H', 'Decode `10011010` as signed 8-bit.', -102, '−128 + 16 + 8 + 2 = −102.'),
    q.num('H', 'Signed 8-bit 90 + 70, wrapped?', -96, '160 − 256.'),
    q.num('H', 'Signed 8-bit 90 + 70, saturated?', 127, 'Clamp.'),
    q.mc('H', 'Signed overflow is detected by…', ['same-sign operands producing an opposite-sign result', 'carry-out = 1', 'a negative result', 'any carry into the MSB'], 0, 'Signs, not carry.'),
    q.num('H', 'Unsigned 20-bit × 12-bit: product width?', 32, 'm + n.'),
    q.num('H', 'A 13-bit unsigned counter counts up to at most…', 8191, '2¹³ − 1.'),
    q.mc('H', 'p=3, r=8. After one edge with `p <= r; r <= p;`…', ['p=8, r=3', 'p=8, r=8', 'p=3, r=8', 'p=3, r=3'], 0, 'Swap.', { grid: true }),
    q.mc('H', 'A reset that only re-initialises the state register is insufficient because…', ['other registers (counts, lengths, checksums) keep stale values that corrupt the next transaction', 'resets must be asynchronous', 'the state register is read-only', 'it is sufficient'], 0, 'Clear or invalidate all observable partial state.'),
    q.mc('H', 'An `always_comb` block that assigns Y in only two of three case branches will…', ['infer a latch', 'set Y = 0 in the third', 'be optimised away', 'fail to compile'], 0, 'Latch inference.', { grid: true }),
    // ---- H03/H04: stalls, buffers ----
    q.mc('H', 'valid = [1,1,1,0,1], ready = [0,0,1,1,1]. Transfers at…', ['2 and 4', '0, 2 and 4', '2, 3 and 4', '1 and 4'], 0, 'Both 1 at 2 and 4.', { grid: true }),
    q.mc('H', 'For valid = [1,1,1,0,1] and ready = [0,0,1,1,1], what must the source do between cycles 0 and 2?', ['hold the same payload: it is stalled until the transfer at cycle 2', 'present new data each cycle', 'lower valid', 'raise ready'], 0, 'Payload must remain stable while valid = 1 and ready = 0.'),
    q.num('H', 'Stop propagation 4 cycles, sink may stall 6 cycles, buffer empty at start: conservative capacity?', 10, '6 + 4.'),
    q.tokens('H', 'Depth-8 FIFO at occupancy 5: after pop, push+pop, push, push:', ['4', '4', '5', '6'], ['3', '7'], '−1, 0, +1, +1.', { mono: true }),
    q.mc('H', 'Two consecutive updates to the same symbol, the second reading before the first write is visible, produce…', ['a stale-read hazard: the second update uses the old value', 'correct results if the adder is correct', 'a timing violation', 'a reset'], 0, 'Correct comparators, wrong state observation.'),
    q.code('H', 'Hardware model (medium). Write `solve(ops)` for a **buy-only exposure limit** with limit 100 (inclusive). `ops` is a list of commands processed strictly in order, each `["new", qty]`, `["cancel", qty]` or `["fill", qty]`. State: `reserved` (accepted but unfilled) and `filled`. A `new` is **accepted** if `filled + reserved + qty <= 100`, adding qty to reserved; otherwise **rejected** with no state change. `cancel` releases min(qty, reserved) from reserved. `fill` moves min(qty, reserved) from reserved to filled. Return `{"accepted": n, "rejected": n, "reserved": r, "filled": f}`.', {
      fn: 'solve',
      starter: 'LIMIT = 100\n\ndef solve(ops):\n    reserved = 0\n    filled = 0\n    accepted = rejected = 0\n    for kind, qty in ops:\n        if kind == "new":\n            pass\n        elif kind == "cancel":\n            pass\n        elif kind == "fill":\n            pass\n    return {"accepted": accepted, "rejected": rejected, "reserved": reserved, "filled": filled}\n',
      tests: [
        { args: [[['new', 20], ['new', 20]]], expect: { accepted: 2, rejected: 0, reserved: 40, filled: 0 } },
        { args: [[['new', 70], ['new', 20], ['new', 20]]], expect: { accepted: 2, rejected: 1, reserved: 90, filled: 0 }, name: 'the H10 worked checkpoint: 70 + 20 passes, the next 20 must fail' },
        { args: [[['new', 50], ['fill', 30], ['cancel', 20], ['new', 80]]], expect: { accepted: 1, rejected: 1, reserved: 0, filled: 30 }, name: 'fill moves to filled; cancel releases; 30 + 0 + 80 > 100 → reject' },
        { args: [[['new', 100], ['new', 1]]], expect: { accepted: 1, rejected: 1, reserved: 100, filled: 0 }, name: 'inclusive limit: exactly 100 passes' },
        { args: [[['cancel', 10], ['fill', 5]]], expect: { accepted: 0, rejected: 0, reserved: 0, filled: 0 }, name: 'cancel/fill with nothing reserved: no-ops' },
        { args: [[]], expect: { accepted: 0, rejected: 0, reserved: 0, filled: 0 } },
      ],
      gen: 'def gen():\n    for _ in range(10):\n        yield ([[random.choice(["new","cancel","fill"]), random.randint(1, 60)] for _ in range(random.randint(0, 8))],)',
      refCode: 'def ref(ops):\n    r = f = a = j = 0\n    for k, q in ops:\n        if k == "new":\n            if f + r + q <= 100: r += q; a += 1\n            else: j += 1\n        elif k == "cancel":\n            r -= min(q, r)\n        elif k == "fill":\n            m = min(q, r); r -= m; f += m\n    return {"accepted": a, "rejected": j, "reserved": r, "filled": f}',
      solution: 'LIMIT = 100\n\ndef solve(ops):\n    reserved = 0\n    filled = 0\n    accepted = rejected = 0\n    for kind, qty in ops:\n        if kind == "new":\n            if filled + reserved + qty <= LIMIT:\n                reserved += qty\n                accepted += 1\n            else:\n                rejected += 1\n        elif kind == "cancel":\n            reserved -= min(qty, reserved)\n        elif kind == "fill":\n            moved = min(qty, reserved)\n            reserved -= moved\n            filled += moved\n    return {"accepted": accepted, "rejected": rejected, "reserved": reserved, "filled": filled}'
    }, 'This is P2\'s reference model in miniature (H10 L3): reservation, release, fill, and a rejection that must not change state. Conservation: every accepted qty is either reserved, filled, or cancelled.'),
    // ---- S/A ----
    q.mc('S', 'Bytes `01 00` big-endian 16-bit is…', ['256', '1', '65536', '16'], 0, '1 × 256 + 0.', { grid: true }),
    q.mc('S', 'A parser meets reserved byte = 5. Correct action?', ['reject with a reason code', 'ignore the byte', 'treat as version 5', 'crash'], 0, 'Explicit rejection.'),
    q.mc('S', 'After `a = [[1], [2]]; b = a.copy(); b[0].append(9)`, `a` is…', ['[[1, 9], [2]]: shallow copy shares the inner lists', '[[1], [2]]', '[[9], [2]]', 'an error'], 0, 'Shallow copy.'),
    q.mc('S', 'A test that fails only for seed 913 should first be…', ['preserved: save seed, versions, config and the failing input', 'deleted', 'rerun with a new seed', 'ignored'], 0, 'Evidence first.'),
    q.num('A', 'How many contiguous subarrays of [2, −1, 2, −1] sum to 1?', 3, 'The three are indices 0–1: [2, −1], indices 1–2: [−1, 2], and indices 2–3: [2, −1]. With prefix sums 0, 2, 1, 3, 2, count earlier values equal to current sum − 1.'),
    q.num('A', 'Lower bound of 7 in [1, 4, 7, 7, 9, 12]?', 2, 'First ≥ 7.'),
    q.num('A', 'log₂(65536) = ?', 16, '2¹⁶.'),
    q.code('A', 'Algorithms (medium). Write `solve(streams)`: merge k sorted lists of `[timestamp, source_id]` events into one list ordered by timestamp, breaking ties by source_id ascending (A03 L2). Use a heap for O(N log k); the speed test has 50 streams × 10,000 events.', {
      fn: 'solve',
      starter: 'import heapq\n\ndef solve(streams):\n    heap = []\n    for src, s in enumerate(streams):\n        if s:\n            heapq.heappush(heap, (s[0][0], s[0][1], src, 0))\n    out = []\n    while heap:\n        # pop the smallest (timestamp, source_id), append it, push the next from that stream\n        pass\n    return out\n',
      tests: [
        { args: [[[[1, 0], [4, 0]], [[2, 1], [3, 1]]]], expect: [[1, 0], [2, 1], [3, 1], [4, 0]] },
        { args: [[[[5, 2]], [[5, 1]], [[5, 0]]]], expect: [[5, 0], [5, 1], [5, 2]], name: 'tie on timestamp → source_id order' },
        { args: [[[], [[1, 1]], []]], expect: [[1, 1]], name: 'empty streams' },
        { args: [[]], expect: [], name: 'no streams' },
      ],
      gen: 'def gen():\n    for _ in range(6):\n        k = random.randint(0, 4)\n        streams = []\n        for src in range(k):\n            ts = sorted(random.randint(0, 9) for _ in range(random.randint(0, 5)))\n            streams.append([[t, src] for t in ts])\n        yield (streams,)',
      refCode: 'def ref(streams):\n    return sorted([e for s in streams for e in s], key=lambda e: (e[0], e[1]))',
      speed: { gen: 'def gen():\n    streams = []\n    for src in range(50):\n        ts = sorted(random.randint(0, 10**6) for _ in range(10000))\n        streams.append([[t, src] for t in ts])\n    return [streams]', budgetMs: 4000, label: '50 streams × 10,000 events' },
      solution: 'import heapq\n\ndef solve(streams):\n    heap = []\n    for src, s in enumerate(streams):\n        if s:\n            heapq.heappush(heap, (s[0][0], s[0][1], src, 0))\n    out = []\n    while heap:\n        ts, sid, src, i = heapq.heappop(heap)\n        out.append([ts, sid])\n        if i + 1 < len(streams[src]):\n            nxt = streams[src][i + 1]\n            heapq.heappush(heap, (nxt[0], nxt[1], src, i + 1))\n    return out'
    }, 'Stable tie-breaking is part of the specification, not an afterthought: (timestamp, source_id) in the heap key does it.', { timeoutMs: 15000 }),
    q.code('A', 'Algorithms (medium). Write `solve(nums)`: the length of the longest strictly increasing **contiguous** run, then, separately, return `[run_length, count_of_pairs]` where `count_of_pairs` is the number of index pairs i < j with `nums[i] + nums[j] == 0` (counted with a hash map in O(n)). Speed test: 300,000 elements.', {
      fn: 'solve',
      starter: 'def solve(nums):\n    # part 1: longest strictly increasing contiguous run\n    best = run = 0\n    # part 2: pairs summing to zero using a count map of values seen so far\n    pairs = 0\n    seen = {}\n    return [best, pairs]\n',
      tests: [
        { args: [[1, 2, 3, 1, 2, -1, -2]], expect: [3, 4], name: 'run 1,2,3; pairs (1,−1) ×2 and (2,−2) ×2' },
        { args: [[]], expect: [0, 0], name: 'empty' },
        { args: [[0, 0, 0]], expect: [1, 3], name: 'zeros pair with each other: C(3,2) = 3' },
        { args: [[5, 4, 3]], expect: [1, 0], name: 'strictly decreasing: run length 1' },
        { args: [[2, -2, 2, -2]], expect: [2, 4] },
      ],
      gen: 'def gen():\n    for _ in range(8):\n        yield ([random.randint(-3, 3) for _ in range(random.randint(0, 10))],)',
      refCode: 'def ref(nums):\n    best = 0\n    i = 0\n    n = len(nums)\n    while i < n:\n        j = i\n        while j + 1 < n and nums[j + 1] > nums[j]: j += 1\n        best = max(best, j - i + 1); i = j + 1\n    pairs = sum(1 for a in range(n) for b in range(a + 1, n) if nums[a] + nums[b] == 0)\n    return [best, pairs]',
      speed: { gen: 'def gen():\n    return [[random.randint(-1000, 1000) for _ in range(300000)]]', budgetMs: 2500, label: '300,000 elements' },
      solution: 'def solve(nums):\n    best = run = 0\n    for i, x in enumerate(nums):\n        run = run + 1 if i > 0 and x > nums[i - 1] else 1\n        best = max(best, run)\n    pairs = 0\n    seen = {}\n    for x in nums:\n        pairs += seen.get(-x, 0)\n        seen[x] = seen.get(x, 0) + 1\n    return [best, pairs]'
    }, 'Two linear passes. The zero-pair count is two-sum generalised to counting: look up −x before recording x, so zeros pair correctly with earlier zeros only.'),
    // ---- Maths ----
    q.num('M', 'Fault rate 0.5%, sensitivity 95%, false-positive 4%. P(fault | flag) to 3 d.p.?', 0.00475 / (0.00475 + 0.0398), '0.95×0.005 / (0.95×0.005 + 0.04×0.995) = 0.00475/0.04455 = 0.107.', { tol: 0.002, display: '≈ 0.107' }),
    q.num('M', 'Ordered triples of distinct symbols from 7?', 210, '7·6·5.'),
    q.num('M', 'C(9, 4) = ?', 126, '9·8·7·6/24.'),
    q.num('M', 'Distinct arrangements of AABBCC?', 90, '6!/(2!2!2!) = 720/8.'),
    q.num('M', 'Expected adjacent equal pairs in 31 fair flips?', 15, '30 × ½.'),
    q.num('M', 'P(at least one drop in 50 packets, p = 0.02) to 3 d.p.?', 1 - 0.98 ** 50, '1 − 0.98⁵⁰ = 0.636.', { tol: 0.002, display: '≈ 0.636' }),
    q.num('M', 'Occupancy 24 items, throughput 8 million/s: time in system (µs)?', 3, 'L/λ.', { unit: 'µs' }),
    q.num('M', 'Expected flips until HH?', 6, 'States.'),
    // ---- Degree, course order ----
    q.num('E', '15 V across 5 Ω: power (W)?', 45, 'V²/R.', { unit: 'W' }),
    q.num('E', '9 V divider, R1 = 3 kΩ, R2 = 6 kΩ: open-circuit output (V)?', 6, '9 × 6/9.', { unit: 'V' }),
    q.num('E', 'For a 9 V divider with R1 = 3 kΩ and R2 = 6 kΩ, what is the Thévenin resistance seen from the output (kΩ)?', 2, 'Turn off the ideal voltage source: R1 and R2 are then in parallel, so 3 ∥ 6 = 2 kΩ.', { unit: 'kΩ' }),
    q.num('E', 'f(x) = 2x³ − x. f′(1) = ?', 5, '6x² − 1.'),
    q.num('E', '∫₀³ (2x + 1) dx = ?', 12, '[x² + x]₀³ = 9 + 3.'),
    q.num('E', '|5 − 12i| = ?', 13, '√(25 + 144).'),
    q.num('E', 'R = 10 kΩ, C = 0.47 µF: τ in ms (2 d.p.)?', 4.7, '4.7 ms.', { unit: 'ms', tol: 0.02 }),
    q.num('E', 'Steady state of dy/dt + 5y = 20?', 4, 'b/a.'),
    q.num('E', '8 V → 2 Ω → node V → 6 Ω → ground. V (V)?', 6, '(8 − V)/2 = V/6 → 24 − 3V = V → V = 6.', { unit: 'V' }),
    q.num('E', 'Inverting op-amp, Rf = 47 kΩ, Rin = 4.7 kΩ: gain?', -10, '−Rf/Rin.'),
    q.num('E', 'Thévenin 6 V, 1.5 kΩ. Norton current in mA?', 4, '6/1500.', { unit: 'mA' }),
    q.num('E', 'a = (2, −1, 0), b = (1, 3, 0). a·b = ?', -1, '2 − 3.'),
    q.num('E', 'z-component of a × b for those vectors?', 7, '2×3 − (−1)×1 = 7.'),
    q.num('E', 'V ± 2 %, I ± 2 %: relative uncertainty in P = V·I, in %, 2 d.p.?', 2.83, '√(4 + 4) = 2.83 %.', { unit: '%', tol: 0.02 }),
    q.num('E', 'L = 50 mH, R = 25 Ω: RL time constant in ms?', 2, 'L/R = 0.002 s.', { unit: 'ms' }),
    q.num('E', 'Reactance of a 0.2 H inductor at 100 Hz (Ω, 1 d.p.)?', 125.7, '2π·100·0.2.', { unit: 'Ω', tol: 0.3 }),
    q.num('E', '4 A rms, 230 V rms, pf 0.9: real power (W)?', 828, '230 × 4 × 0.9.', { unit: 'W' }),
    q.mc('E', 'ζ = 0.2 gives…', ['strong overshoot and ringing', 'no overshoot', 'critical damping', 'instability'], 0, 'Lightly damped.', { grid: true }),
    q.num('E', 'Meshes: 9 = 5I1 − 3I2, 0 = 6I2 − 3I1. I2 (A)?', 1.286, 'I1 = 2I2 → 9 = 10I2 − 3I2 = 7I2 → I2 = 9/7 = 1.286.', { unit: 'A', tol: 0.005 }),
    q.mc('E', 'A node has a 1 MΩ Thévenin resistance. A 10 MΩ voltmeter is connected to measure its open-circuit voltage. What does the meter read?', ['about 9% low: the meter loads the node', 'exactly right', '50% low', 'twice the true value'], 0, 'The meter and source resistance form a divider: 10/(1 + 10) = 0.909 of the open-circuit voltage.'),
    // ---- Mathematician's thread: the month-end mixed paper ----
    ...genius(q, 30),
  ]
};
