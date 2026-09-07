import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(22);

export default {
  title: 'valid/ready, binary search, binomial, AC impedance',
  emoji: '🤝',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook week 4. **Hardware** (H03 L1): the valid/ready contract — a transfer only on an edge where both are true, payload stability while stalled, why valid must never wait for ready, whether a combinational ready is allowed and what registering it costs in extra storage, and a protocol monitor you write yourself. **Algorithms** (A02 L1): binary search as the search for the flip point of a monotone question, lower_bound with its invariant and termination argument, the three classic bugs, and what upper_bound and the equal-range give you for free. **Maths** (M05): the binomial distribution derived by counting arrangements, why the probabilities sum to one, mean np from indicators and variance np(1−p), and what the shape says about how far from np a result can wander. **Degree** (EEEN11101/MATH19611): why a sinusoid into a linear circuit comes out as a sinusoid at the same frequency, the phasor as a complex amplitude, d/dt becoming multiplication by jω, and impedance Z_R = R, Z_L = jωL, Z_C = 1/(jωC).',
  takeaway: 'A transfer happens **only** on an edge where valid and ready are both 1; while stalled the source holds valid and holds its payload unchanged; ready may depend on valid, valid must never depend on ready. Registering ready buys timing at the cost of storing the items already in flight. lower_bound keeps the invariant "everything before lo is < x, everything from hi on is ≥ x", halves the gap every step, and returns len(arr) when nothing qualifies. Binomial: C(n,k)pᵏ(1−p)ⁿ⁻ᵏ — count the arrangements, weight one of them; mean np, variance np(1−p), spread ≈ √(np(1−p)). AC: differentiate → multiply by jω, so Z_L = jωL and Z_C = 1/(jωC), and Ohm\'s law works again with complex numbers.',
  steps: [
    // =====================================================================================================
    // HARDWARE: the valid/ready handshake (H03 L1)
    // =====================================================================================================
    q.info('H', 'Two blocks, different speeds: the two-wire contract', `A block that produces data and a block that consumes it almost never run at the same rate. The producer might stall waiting for memory; the consumer might be busy for three cycles on some items and one on others. Wire them together with no agreement and you have to *know* each other's timing, exactly, for ever — and any change to either block silently loses data.

The alternative costs two wires. Alongside the payload:

- **valid** goes from source to sink: "there is a real item on the payload wires this cycle".
- **ready** goes from sink to source: "I can take an item this cycle".

A **transfer** happens on a clock edge where **both** are 1. That is the whole definition, and it is the only event that counts: not "valid went high", not "the data changed", but the coincidence of the two at an edge. Everything else in a streaming design — throughput, occupancy, loss, ordering — is counted in transfers.

The contract is symmetric in a useful way: the source may wait as long as it likes before offering an item, and the sink may wait as long as it likes before taking one. Neither has to know anything about the other's internals.`, {
      terms: [
        ['valid', 'Source → sink: the payload on the bus is real this cycle.'],
        ['ready', 'Sink → source: I can accept a transfer this cycle.'],
        ['Transfer (accepted item)', 'A clock edge on which valid and ready are both 1. The unit everything else is counted in.'],
        ['Backpressure', 'A sink holding ready low to make the source wait, instead of losing its data.'],
        ['Payload', 'The data wires that travel with valid. Their meaning is only defined on a transfer.'],
      ],
      widget: W('waveform', { cycles: 6, valid: [1, 1, 0, 1, 0, 0], ready: [0, 1, 1, 1, 1, 1], data: ['D0', 'D0', 'x', 'D1', 'x', 'x'] })
    }),
    q.mc('H', 'A source and a sink use a valid/ready handshake. Over cycles 0 to 3, valid = [1, 1, 0, 1] and ready = [0, 1, 1, 1]. At which cycle indices does a transfer happen?', ['1 and 3', '0 and 3', '0, 1 and 3', '1, 2 and 3'], 0, 'Only where both signals are 1: cycle 0 has valid without ready (a stall), cycle 2 has ready without valid (an idle sink). Two items move.', { grid: true }),
    q.num('H', 'A source holds valid high on every cycle, and a sink raises ready on exactly every second cycle. Over 100 cycles, how many items are transferred?', 50, 'A transfer needs both. The sink is the bottleneck at one item per two cycles: 50 transfers, a throughput of 0.5 items per cycle.'),
    q.info('H', 'The four rules, and what breaks without each', `The two wires only work because both sides obey the same small set of rules. Each one exists to stop a specific failure.

**1. A transfer is valid and ready at an edge, nothing else.** A sink that accepts because "valid rose last cycle" will take an item twice; a source that assumes acceptance because ready was high will lose one.

**2. While valid is 1 and ready is 0, the payload must not change.** Say the source shows A, the sink is stalled, and the source swaps in B. Next cycle the sink accepts B. Item A was offered, was never refused, and never arrived — silent loss, and no signal anywhere records it. This is the counterexample H03 L2 asks you to find, and it is the single most common home-made handshake bug.

**3. Once valid is asserted it stays asserted until the transfer happens.** Withdrawing it means the sink cannot decide anything on the cycle it sees valid, since the offer may evaporate. Some protocols do allow withdrawal; then it must be written down, because the sink has to be built differently.

**4. ready may depend on valid; valid must never depend on ready.** If the source waits to see ready before raising valid, and the sink waits to see valid before raising ready, both wait for ever: **deadlock**, with no error, no timeout, and a perfectly innocent-looking waveform of two low signals.

Rule 4 is asymmetric on purpose. Someone has to move first, and it is always the side that has the data.`, {
      terms: [
        ['Payload stability', 'The rule that a stalled source keeps valid high and its data unchanged until the item is accepted.'],
        ['Stall', 'A cycle with valid = 1 and ready = 0: an item is offered but not taken.'],
        ['Withdrawal', 'Lowering valid before the item was accepted. Forbidden under the standard contract.'],
        ['Deadlock', 'Two parties each waiting for the other, so neither ever proceeds. No error is reported; nothing simply happens.'],
      ]
    }),
    q.mc('H', 'In a valid/ready stream, cycle 0 has valid = 1 and ready = 0, and cycle 1 has valid = 1 and ready = 1. Which payload must be held unchanged between those two cycles?', ['The item the source presented in cycle 0: it was offered but not accepted, so it must still be there when the sink takes it', 'Whatever the sink produces on its output', 'None: the payload may change every cycle', 'The item presented in cycle 2'], 0, 'Valid without ready is a stall. The transfer happens in cycle 1, so the item transferred must be the one that was on offer in cycle 0.'),
    q.goal('H', 'Edit the trace in the simulation so that exactly **3** transfers happen and the source is stalled at cycle 0 (valid 1, ready 0 there).', W('waveform', { cycles: 6, valid: [1, 0, 0, 0, 0, 0], ready: [0, 1, 1, 1, 1, 1], targetValid: [1, 1, 1, 1, 0, 0], targetReady: [0, 1, 1, 1, 1, 1] }),
      s => { let n = 0; for (let i = 0; i < 6; i++) if (s.valid[i] && s.ready[i]) n++; return n === 3 && s.valid[0] === 1 && s.ready[0] === 0; },
      'Any pattern with valid = 1 and ready = 0 at cycle 0, plus three later cycles where both are 1. Note that the stalled item is not lost — it is transferred on the first cycle where ready comes up.'),
    q.tf('H', 'Under the standard valid/ready contract, a source that has raised valid may lower it again before any transfer happens, if it changes its mind about the item.', false, 'Once valid is asserted it must stay asserted, with the payload unchanged, until the cycle where ready is also 1. Otherwise the sink can never rely on what it sees. A protocol that allows withdrawal has to say so explicitly, and the sink must then be built for it.'),
    q.mc('H', 'A source raises valid only after it has seen ready high, and the sink raises ready only after it has seen valid high. What happens?', ['Deadlock: both wait for the other for ever, with no error and no timeout', 'It works, but transfers take two cycles each', 'Throughput doubles because both sides are careful', 'The first transfer is lost and the rest work'], 0, 'This is why the rule is asymmetric: ready is allowed to depend on valid, valid is not allowed to depend on ready. H03 L5 asks for exactly this trace as a deliverable, because it is invisible unless you look for it.'),
    q.mc('H', 'Interview: a source is stalled (valid 1, ready 0) holding item A, and on the next cycle it replaces the payload with B while keeping valid high. The sink then accepts. What has happened, and what would notice?', ['Item A was silently lost — offered, never refused, never delivered — and only a monitor checking payload stability during stalls would catch it', 'Nothing: the sink takes B, which is the newest item', 'The sink receives both A and B', 'The sink reports a protocol error automatically'], 0, 'Nothing in the hardware complains: A simply never existed downstream. The counts still look plausible if you only count transfers, which is why the property to check is stability during stalls, not just the transfer count.'),
    q.info('H', 'Is a combinational ready allowed, and what does registering it cost?', `Yes — the contract deliberately permits **ready to be a combinational function of valid** in the same cycle. A sink may decide "I can take this if I am empty, or if my own output is being taken right now", and that decision reads valid. What is forbidden is the other direction, valid computed from ready, which is rule 4.

So why not always do it? Because "ready is combinational from downstream" chains. Connect eight stages, each passing the stall backwards through its own logic, and a single sink stalling has to ripple through eight levels of gates before the source sees it — inside one clock period. That is one long combinational path, and it is what stops the design meeting timing at any decent clock rate.

The alternative is to **register** ready: each stage stores the stall signal and passes it on a cycle later. Now every path is short and the clock can be fast. The price is that stop information arrives **late**. If a source can send one item per cycle and the stop takes two cycles to reach it, two more items are already on their way, and you must have somewhere to put them: **reserve two extra entries of storage** on top of whatever the stage already holds. Lose that arithmetic and the stall overruns the buffer, which is silent data loss again.

Timing versus storage, with the item count set by how many cycles the stop takes. Day 25's skid buffer is the standard two-entry answer.`, {
      terms: [
        ['Combinational ready', 'ready computed from downstream signals (including valid) within the same cycle. Legal, but the path can be long.'],
        ['Registered backpressure', 'ready stored in a flip-flop, so a stall reaches the source a cycle or more later. Short paths, extra storage needed.'],
        ['In-flight items', 'Items already sent that cannot be recalled because the stop has not reached the source yet.'],
        ['Timing closure', 'Getting every combinational path short enough to fit in one clock period.'],
      ]
    }),
    q.mc('H', 'Under the standard streaming contract, which of these dependencies is allowed within one cycle?', ['ready computed from valid: a sink may decide it can accept based on whether an item is being offered', 'valid computed from ready: a source may wait to see ready before offering', 'Both, in the same design', 'Neither: both signals must always be registered'], 0, 'Allowing ready to see valid is what lets a stage be transparent when empty. Allowing valid to see ready would let both sides wait for each other, which deadlocks.'),
    q.num('H', 'A source can send one item per cycle. Its sink registers backpressure, so a stall takes 2 cycles to reach the source. How many extra items of storage must the sink reserve, beyond the item it is already holding?', 2, 'Once the sink decides to stop, the source keeps sending for 2 more cycles at one per cycle: 2 items are already in flight and must land somewhere. That is the H03 L4 calculation, and it is why the standard elastic buffer holds two entries.'),
    q.mc('H', 'Interview: eight processing stages are chained, each passing its sink\'s ready straight through to its source combinationally. The design fails timing at the target clock rate. What is the trade-off in registering the ready path instead?', ['Each stage\'s paths get short, but the stop reaches the source later, so every stage needs storage for the items sent in the meantime', 'Registering ready removes the need for valid', 'It halves the throughput permanently, with no way back', 'Nothing is lost: registering ready is strictly better'], 0, 'You are trading a combinational path for storage. Full throughput is still possible with the extra buffering (that is exactly what a skid buffer provides); it is the depth arithmetic you must not skip.'),
    q.code('H', 'Write a handshake monitor: the block of logic a testbench uses to police the protocol from outside.\n\n`solve(valid, ready, data)` takes three equal-length lists describing a trace cycle by cycle: `valid[i]` and `ready[i]` are 0 or 1, and `data[i]` is the payload presented in cycle i. Return `{"accepted": [...], "violation": v}` where `accepted` lists, in order, the payload of every cycle where valid and ready are both 1, and `violation` is the index of the **first** cycle i where the source was stalled (valid[i] = 1, ready[i] = 0) and then, while still valid in cycle i+1, changed its payload (`data[i+1] != data[i]`). Use `None` if there is no such cycle; a stall on the very last cycle cannot be judged, since there is no next cycle to compare with.', {
      fn: 'solve',
      starter: 'def solve(valid, ready, data):\n    accepted = []\n    violation = None\n    n = len(valid)\n    for i in range(n):\n        # a transfer: both signals high\n        # a stability breach: stalled here, still valid next cycle, payload changed\n        pass\n    return {"accepted": accepted, "violation": violation}\n',
      tests: [
        { args: [[1, 1, 0, 1], [0, 1, 1, 1], ['D0', 'D0', 'x', 'D1']], expect: { accepted: ['D0', 'D1'], violation: null }, name: 'the handbook trace: transfers at cycles 1 and 3, payload held through the stall' },
        { args: [[1, 1, 1], [0, 1, 1], ['A', 'B', 'C']], expect: { accepted: ['B', 'C'], violation: 0 }, name: 'payload changed during the stall at cycle 0: A was silently lost' },
        { args: [[0, 0], [1, 1], ['x', 'x']], expect: { accepted: [], violation: null }, name: 'nothing offered: an idle source is legal' },
        { args: [[1], [0], ['A']], expect: { accepted: [], violation: null }, name: 'stall on the last cycle: no next cycle, so nothing can be judged' },
        { args: [[1, 0, 1], [0, 0, 1], ['A', 'B', 'A']], expect: { accepted: ['A'], violation: null }, name: 'valid dropped after the stall, so the payload change is not a stability breach' },
        { args: [[1, 1, 1, 1], [0, 0, 0, 1], ['A', 'A', 'B', 'B']], expect: { accepted: ['B'], violation: 1 }, name: 'a long stall: the change at cycle 1→2 is the first breach' },
        { args: [[], [], []], expect: { accepted: [], violation: null }, name: 'empty trace' },
      ],
      gen: 'def gen():\n    for _ in range(30):\n        n = random.randint(0, 8)\n        v = [random.randint(0, 1) for _ in range(n)]\n        r = [random.randint(0, 1) for _ in range(n)]\n        d = [random.choice("ABC") for _ in range(n)]\n        yield (v, r, d)',
      refCode: 'def ref(valid, ready, data):\n    acc = []\n    vio = None\n    for i in range(len(valid)):\n        if valid[i] and ready[i]: acc.append(data[i])\n        if vio is None and valid[i] and not ready[i] and i + 1 < len(valid) and valid[i+1] and data[i+1] != data[i]: vio = i\n    return {"accepted": acc, "violation": vio}',
      solution: 'def solve(valid, ready, data):\n    accepted = []\n    violation = None\n    n = len(valid)\n    for i in range(n):\n        if valid[i] and ready[i]:\n            accepted.append(data[i])\n        stalled = valid[i] and not ready[i]\n        if violation is None and stalled and i + 1 < n and valid[i + 1] and data[i + 1] != data[i]:\n            violation = i\n    return {"accepted": accepted, "violation": violation}'
    }, 'A monitor watches the wires and judges them against the contract, independently of anything the design claims about itself. Two lines of it are the whole protocol: transfers are the both-high cycles, and a stall must not be followed by a different payload while valid stays up. Comparing the accepted list against the sequence the sink actually received is the loss-and-ordering check of H03 L3; keeping this monitor around is why a later refactor cannot quietly break the handshake.'),

    // =====================================================================================================
    // ALGORITHMS: binary search done properly (A02 L1)
    // =====================================================================================================
    q.info('A', 'Binary search is a search for where a yes/no answer flips', `Day 20 priced halving: about log₂ n probes. Now build it, and the first move is to stop thinking about "finding a value".

Take a sorted array and any x, and ask each position the same question: **is arr[i] ≥ x?** For [1, 3, 3, 5, 8] with x = 5 the answers, left to right, are no, no, no, yes, yes. Because the array is sorted, the answers can only run no…no yes…yes: once true, always true. A question with that shape is called **monotone**, and it has exactly one flip point.

Binary search finds that flip point. Probe the middle: a "no" means the flip is strictly to the right, so throw away the left half *and* the probe; a "yes" means the flip is here or to the left, so throw away everything right of the probe. Either way half the candidates disappear.

The index of the flip is called the **lower bound** of x: the first position holding a value ≥ x. It answers more questions than "is x present": it is also where x would be inserted to keep the array sorted, and where a run of equal values begins.

Framing it as a monotone question is not decoration. It is why the same three lines search a sorted array, a range of possible answers, or anything else where a yes/no test flips exactly once.`, {
      terms: [
        ['Monotone predicate', 'A yes/no question over an ordered range whose answer changes at most once: no…no yes…yes.'],
        ['Flip point', 'The first position where a monotone predicate becomes true. What binary search returns.'],
        ['Lower bound', 'The first index i with arr[i] ≥ x, in a sorted array.'],
        ['Insertion point', 'The index where x can be inserted leaving the array sorted. For lower_bound, before any equal values.'],
      ],
      widget: W('bsearch', { arr: [1, 3, 3, 5, 8, 13, 21], x: 5 })
    }),
    q.info('A', 'lower_bound: the invariant, the two moves, and why it stops', `Keep two indices, lo and hi, standing for a **half-open** range [lo, hi): lo is still a candidate, hi is one past the last candidate. State the invariant precisely, because everything else follows from it:

> every index **below lo** holds a value **< x**; every index **from hi onward** holds a value **≥ x**.

Start lo = 0, hi = len(arr). The invariant is true for free: there are no indices below 0 and none from len onward.

\`\`\`
while lo < hi:
    mid = (lo + hi) // 2        # lo <= mid < hi
    if arr[mid] < x:  lo = mid + 1
    else:             hi = mid
return lo
\`\`\`

**Why each move is legal.** If arr[mid] < x then, the array being sorted, every index up to and including mid holds a value < x — so lo may jump past mid. If arr[mid] ≥ x then every index from mid onward holds a value ≥ x — so hi may come down to mid. Both preserve the invariant.

**Why it stops.** With lo < hi, integer division gives lo ≤ mid < hi. So lo = mid + 1 strictly increases lo, and hi = mid strictly decreases hi. The gap hi − lo shrinks every pass and can never go negative.

**Why the answer is lo.** When lo == hi the invariant reads: everything before lo is < x, everything from lo on is ≥ x. That is the definition of the lower bound. It may equal len(arr) — the honest answer "no element is ≥ x" — and for an empty array it is 0.`, {
      terms: [
        ['Half-open range [lo, hi)', 'Includes lo, excludes hi. Lengths subtract cleanly (hi − lo) and an empty range is lo == hi.'],
        ['Invariant', 'A statement that is true before the loop and after every pass. It turns a loop into a proof.'],
        ['Termination argument', 'A quantity that strictly decreases and cannot fall below a floor. Here it is hi − lo.'],
        ['Answer past the end', 'lower_bound = len(arr) means nothing in the array is ≥ x. A valid result, not an error.'],
      ]
    }),
    q.num('A', 'Sorted array [1, 3, 3, 5, 8, 13, 21], searching for the first index whose value is ≥ 5. What index does lower_bound return?', 3, 'Values 1, 3, 3 are below 5; index 3 holds the first value ≥ 5. Positions 0, 1, 2 answer "no" to "is arr[i] ≥ 5?"; positions 3 onwards answer "yes".'),
    q.num('A', 'Sorted array [1, 3, 3, 5, 8, 13, 21], searching for the first index whose value is ≥ 3. What does lower_bound return?', 1, 'There are two 3s, at indices 1 and 2. The lower bound is the **first** of them: index 1. That is why duplicates are not a special case — the invariant already says "everything from hi on is ≥ x", which the first 3 satisfies.'),
    q.num('A', 'Sorted array [1, 3, 3, 5, 8, 13, 21] (length 7), searching for the first index whose value is ≥ 100. What does lower_bound return?', 7, 'No element is ≥ 100, so the answer is len(arr) = 7: one past the end. Returning the length rather than −1 is what makes it usable as an insertion point.'),
    q.info('A', 'The three bugs everyone writes at least once', `**Bug 1: no progress.** Writing \`lo = mid\` instead of \`lo = mid + 1\`. With lo = 3 and hi = 4, mid = 3; if arr[3] < x the loop sets lo = 3 again and spins for ever. The fix is not a special case, it is the invariant: arr[mid] < x means mid itself is *ruled out*, so lo must move past it.

**Bug 2: skipping the answer.** Writing \`hi = mid − 1\` in this half-open version. arr[mid] ≥ x means mid is still a candidate, so hi = mid keeps it; mid − 1 throws away the very element you were looking for. (In the other, closed-interval style with hi = len − 1 and \`while lo <= hi\`, mid − 1 is correct. Both styles work; **mixing them** is what fails, so pick one and write its invariant down.)

**Bug 3: the overflow.** \`mid = (lo + hi) / 2\` overflows when lo + hi exceeds the width of the integer type. It sat in the Java standard library for nine years and in Bentley's *Programming Pearls* before that. Write \`mid = lo + (hi - lo) // 2\`, which cannot overflow. Python's integers are unbounded so it never bites there, but in C, Java, or a fixed-width counter in RTL, it does.

And the silent one: **an unsorted input**. The predicate is no longer monotone, so half the array is discarded on evidence that does not apply, and you get a wrong answer with no complaint at all. If the sortedness comes from elsewhere, check it in tests, not in the hot loop.`, {
      terms: [
        ['Infinite loop', 'A pass that can leave lo and hi unchanged. Prevented by proving hi − lo strictly decreases.'],
        ['Closed interval [lo, hi]', 'The other convention: hi is the last candidate, the loop runs while lo ≤ hi, and hi = mid − 1 is correct there.'],
        ['Integer overflow', 'lo + hi exceeding the type\'s range. lo + (hi − lo)//2 computes the same midpoint safely.'],
        ['Precondition', 'Something the algorithm assumes and does not check: here, that the input is sorted.'],
      ],
      widget: W('bounds', { arr: [1, 3, 3, 3, 5, 8, 8, 9], x: 3 })
    }),
    q.mc('A', 'In the half-open lower_bound loop `while lo < hi: mid = (lo + hi) // 2`, a student writes `lo = mid` when `arr[mid] < x`. What goes wrong?', ['With hi = lo + 1 the midpoint is lo, so lo never changes and the loop spins for ever', 'It returns an index one too large', 'It works but is slower by a constant factor', 'It fails only on empty arrays'], 0, 'arr[mid] < x rules mid out, so the candidate range must start after it. Skipping the + 1 leaves the range the same size and the loop makes no progress.'),
    q.mc('A', 'Why does the half-open lower_bound loop use `hi = mid` rather than `hi = mid - 1` when `arr[mid] >= x`?', ['Because mid is still a candidate answer — it may be the first index with a value ≥ x — and hi is exclusive, so hi = mid keeps mid in the range', 'Because mid − 1 could be negative', 'Because it makes the loop faster', 'Because the array might contain duplicates'], 0, 'hi is one past the last candidate. Setting hi = mid − 1 would exclude mid itself, which is exactly the element that satisfied the test.'),
    q.mc('A', 'Interview: `mid = (lo + hi) / 2` was a bug in a widely used standard library for nine years. What was the bug, and what is the fix?', ['lo + hi can overflow the integer type on very large arrays, giving a negative or wrapped midpoint; write mid = lo + (hi − lo) // 2', 'Integer division rounds the wrong way; use ceiling division', 'It is biased towards the left half, so the search is slower', 'It breaks on arrays with duplicate values'], 0, 'The sum can exceed the type\'s range even though each of lo and hi fits. lo + (hi − lo)//2 is the same value computed without ever forming the large sum. In Python it cannot happen, in C, Java or RTL it can.'),
    q.mc('A', 'Interview: a binary search is handed a list that is *almost* sorted — one element out of place. What happens?', ['It returns a wrong answer silently: the predicate is no longer monotone, so a discarded half may have contained the answer', 'It raises an error, because the invariant fails', 'It still returns the correct index, just more slowly', 'It loops for ever'], 0, 'Nothing in the loop looks at more than log n elements, so it cannot notice. Sortedness is a precondition: assert it in tests or in a debug build, never inside the loop, which would cost the O(n) you were avoiding.'),
    q.info('A', 'What lower_bound gives you for nothing', `One primitive answers a family of questions, which is why library authors expose the bound rather than a "find" function.

- **upper_bound**, the first index with a value **strictly greater** than x: the identical loop with \`arr[mid] <= x\` in the test.
- **How many times x occurs**: upper_bound(x) − lower_bound(x). For [1, 3, 3, 3, 5] and x = 3, that is 4 − 1 = **3**, without touching the three elements.
- **Is x present?** lower_bound(x) < len(arr) **and** arr[lower_bound(x)] == x. The length check comes first, or you index past the end.
- **Where to insert** and keep the order: lower_bound puts x before any equal values, upper_bound after them. Inserting at upper_bound keeps equal keys in arrival order, which is what "stable" means.

Each costs one or two searches: 2·log₂ n probes. Without the bounds, each question costs a scan.`, {
      terms: [
        ['upper_bound', 'The first index with a value strictly greater than x. Same loop, ≤ instead of <.'],
        ['Equal range', 'The half-open block [lower_bound, upper_bound) holding every copy of x.'],
        ['Stability', 'Keeping equal keys in the order they arrived. Insert at upper_bound to get it.'],
        ['Membership test', 'Present if lower_bound is in range and the element there equals x. Check the range first.'],
      ]
    }),
    q.num('A', 'Sorted array [1, 3, 3, 3, 5, 8, 8, 9]. upper_bound(3) is the first index with a value strictly greater than 3. What index is that?', 4, 'The 3s occupy indices 1, 2 and 3, so the first value greater than 3 is the 5 at index 4.'),
    q.num('A', 'Sorted array [1, 3, 3, 3, 5, 8, 8, 9], with lower_bound(3) = 1 and upper_bound(3) = 4. How many times does 3 occur, computed from those two numbers?', 3, 'upper − lower = 4 − 1 = 3. Counting a value costs two searches, about 2·log₂ n probes, regardless of how many copies there are.'),
    q.mc('A', 'A sorted list of events keeps items with equal timestamps in the order they arrived. To insert a new event with a timestamp that already appears, which index should be used?', ['upper_bound of that timestamp, so the new event lands after the existing equal ones', 'lower_bound, so it lands before the equal ones', 'Either: for equal keys the position does not matter', 'The end of the list, then re-sort'], 0, 'Inserting at upper_bound preserves arrival order among equal keys — that is exactly what stability means. Inserting at lower_bound would put the newest event first.'),
    q.code('A', 'Write `solve(arr, x)`: the **lower bound** of x in a sorted list `arr` — the first index i with `arr[i] >= x`, or `len(arr)` if no element qualifies. An empty list gives 0, and duplicates give the first of them.\n\nIt must halve the range, not scan: the speed test asks for one query on a sorted list of 1,000,000 elements within 50 ms, which a linear scan cannot meet. Random cases are compared against a hidden linear-scan reference, so both must agree exactly on empty lists, duplicates and values beyond the last element.', {
      fn: 'solve',
      starter: 'def solve(arr, x):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        # everything below lo is < x; everything from hi on is >= x\n        pass\n    return lo\n',
      tests: [
        { args: [[1, 3, 3, 5, 8, 13, 21], 5], expect: 3, name: 'the plain case' },
        { args: [[1, 3, 3, 5, 8, 13, 21], 3], expect: 1, name: 'duplicates → the first of them' },
        { args: [[1, 3, 3, 5, 8, 13, 21], 4], expect: 3, name: 'a value that is not present → the insertion point' },
        { args: [[1, 3, 3, 5, 8, 13, 21], 100], expect: 7, name: 'beyond the last element → len(arr)' },
        { args: [[], 4], expect: 0, name: 'empty list → 0' },
        { args: [[5, 6, 7], 1], expect: 0, name: 'before the first element → 0' },
        { args: [[2, 2, 2, 2], 2], expect: 0, name: 'every element equal to x → index 0' },
        { args: [[1], 1], expect: 0, name: 'single element, equal' },
        { args: [[1], 2], expect: 1, name: 'single element, too small' },
      ],
      gen: 'def gen():\n    for _ in range(30):\n        arr = sorted(random.randint(0, 20) for _ in range(random.randint(0, 10)))\n        yield (arr, random.randint(-1, 22))',
      refCode: 'def ref(arr, x):\n    for i, v in enumerate(arr):\n        if v >= x:\n            return i\n    return len(arr)',
      speed: { gen: 'def gen():\n    arr = sorted(random.randint(0, 10**9) for _ in range(1000000))\n    return [arr, 500000000]', budgetMs: 50, label: 'one query on 1,000,000 sorted elements (a linear scan needs hundreds of ms)' },
      solution: 'def solve(arr, x):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo'
    }, 'The invariant dictates both moves and there is nothing else to decide: arr[mid] < x rules mid out, so lo = mid + 1; otherwise mid is still a candidate, so hi = mid. Twenty passes settle a million elements, which is why the budget is 50 ms while the linear reference used to check the small random cases would need hundreds. Notice the tests: empty, single element both ways, all-equal, absent value, past the end — each one flips a different condition in the loop.'),

    // =====================================================================================================
    // MATHS: the binomial distribution (M05)
    // =====================================================================================================
    q.info('M', 'Counting the arrangements: where the binomial formula comes from', `Run n independent trials, each succeeding with probability p. How likely are exactly k successes?

**Step 1: price one particular pattern.** Take n = 5, k = 2 and the specific outcome SSFFF. The trials are independent, so multiply: p·p·(1−p)·(1−p)·(1−p) = p²(1−p)³. Now take FSFSF: (1−p)·p·(1−p)·p·(1−p) — the same factors in a different order, so the **same value**. Every pattern with exactly 2 successes out of 5 costs p²(1−p)³.

**Step 2: count the patterns.** How many arrangements have exactly 2 successes among 5 trials? Choose which 2 of the 5 trials succeeded: that is C(5, 2) = 10.

**Step 3: multiply**, because the patterns are separate outcomes and probabilities of separate outcomes add — ten of them, each worth the same:

**P(K = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ**

The two halves do different jobs and it is worth keeping them apart in your head: **pᵏ(1−p)ⁿ⁻ᵏ is one pattern's probability**, and **C(n, k) is how many patterns there are**. Nearly every mistake with this formula is dropping the second half, which is the same as forgetting that the successes could have happened in any order.`, {
      terms: [
        ['Bernoulli trial', 'One yes/no experiment with success probability p.'],
        ['Binomial(n, p)', 'The number of successes in n independent Bernoulli trials with the same p.'],
        ['C(n, k)', 'The number of ways to choose which k of the n trials succeeded: n!/(k!(n−k)!).'],
        ['Probability mass function', 'The list of probabilities for each possible value of a whole-number result. Here P(K = k) for k = 0 … n.'],
      ],
      widget: W('binomialpmf', { n: 10, p: 0.1 })
    }),
    q.info('M', 'A worked case, and why the probabilities add to one', `Three packets, each dropped independently with probability 0.1. Write out all eight outcomes and group them by the number of drops:

| drops k | patterns | count | probability |
|---|---|---|---|
| 0 | KKK | 1 | 0.9³ = 0.729 |
| 1 | DKK, KDK, KKD | 3 | 3 × 0.1 × 0.81 = 0.243 |
| 2 | DDK, DKD, KDD | 3 | 3 × 0.01 × 0.9 = 0.027 |
| 3 | DDD | 1 | 0.001 |

The counts 1, 3, 3, 1 are C(3, 0) … C(3, 3): a row of Pascal's triangle, which is what "count the arrangements" always produces. The probabilities total exactly 1.

That is not a coincidence of these numbers. The binomial theorem says (a + b)ⁿ = Σ C(n,k)·aᵏ·bⁿ⁻ᵏ. Put a = p and b = 1 − p:

Σ C(n,k)·pᵏ(1−p)ⁿ⁻ᵏ = (p + (1 − p))ⁿ = 1ⁿ = **1**

So the distribution sums to one *because* it is a binomial expansion — which is where the name comes from. The k = 0 term, (1 − p)ⁿ, is Day 20's "no drop at all", so "at least one" = 1 − P(K = 0) is the same statement read from this table.`, {
      terms: [
        ['Pascal\'s triangle', 'The rows of C(n, k). Row 3 is 1, 3, 3, 1.'],
        ['Binomial theorem', '(a + b)ⁿ = Σ C(n,k)aᵏbⁿ⁻ᵏ. Setting a = p, b = 1 − p makes the distribution sum to 1.'],
        ['Support', 'The values the result can take: k = 0, 1, …, n for a binomial.'],
      ]
    }),
    q.num('M', 'Three packets are each dropped independently with probability 0.1. P(exactly one drop), to 3 decimal places?', 0.243, 'C(3,1)·0.1·0.9² = 3 × 0.1 × 0.81 = 0.243. The factor 3 counts which packet was the one that dropped.', { tol: 0.001 }),
    q.num('M', 'Three packets are each dropped independently with probability 0.1. P(no drops at all), to 3 decimal places?', 0.729, 'C(3,0)·0.1⁰·0.9³ = 0.729. One pattern, KKK. This is the k = 0 bar, and 1 − 0.729 = 0.271 is the chance of at least one drop.', { tol: 0.001 }),
    q.num('M', 'A fair coin is flipped 4 times. P(exactly 2 heads), as a fraction or decimal?', 6 / 16, 'C(4,2)·(½)²·(½)² = 6/16 = 0.375. With p = ½ every one of the 16 patterns is equally likely, so the probability is just the count of patterns over 16.', { display: '6/16 = 3/8' }),
    q.num('M', 'A fair coin is flipped 5 times. P(exactly 3 heads), to 4 decimal places?', 0.3125, 'C(5,3)/2⁵ = 10/32 = 0.3125.', { tol: 0.001 }),
    q.num('M', 'Ten packets are each dropped independently with probability 0.2. P(exactly 2 drops), to 3 decimal places?', 0.302, 'C(10,2)·0.2²·0.8⁸ = 45 × 0.04 × 0.16777 = 0.302.', { tol: 0.003 }),
    q.mc('M', 'In P(K = k) = C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ, what job does the C(n,k) factor do?', ['It counts how many different orderings of successes and failures give exactly k successes; each has the same probability pᵏ(1−p)ⁿ⁻ᵏ', 'It normalises the answer so probabilities sum to 1', 'It corrects for the trials not being independent', 'It converts the count into a percentage'], 0, 'pᵏ(1−p)ⁿ⁻ᵏ prices one specific pattern; C(n,k) says how many patterns share that price. Forgetting it is the same as assuming the successes had to come in one particular order.'),
    q.tf('M', 'For n independent trials each succeeding with probability p, the probabilities P(K = 0), P(K = 1), …, P(K = n) add up to exactly 1.', true, 'Σ C(n,k)pᵏ(1−p)ⁿ⁻ᵏ = (p + (1−p))ⁿ = 1ⁿ = 1 by the binomial theorem. Some number of successes between 0 and n must happen.'),
    q.info('M', 'Mean np with no algebra, and how far the result wanders', `**The mean.** Give trial i an indicator: 1 if it succeeds, 0 if not. Its average value is p (that is what a probability is: the average of its indicator). The number of successes is the sum of the n indicators, and the average of a sum is the sum of the averages — always, with no independence needed. So

**E[K] = n·p**

No factorials, no series. That is why indicators are the first tool a quant reaches for.

**The spread.** Variance measures average squared distance from the mean. For one indicator, I² = I (since 0² = 0 and 1² = 1), so E[I²] = p and Var(I) = p − p² = **p(1 − p)**. Variances of *independent* things add — this step does need independence — so

**Var(K) = n·p(1 − p)**, and the standard deviation is **√(np(1−p))**.

That is the number that tells you how far a real run drifts from np. Flip a fair coin 100 times: mean 50, standard deviation √25 = 5, so 45–55 heads is unremarkable and 70 is not. Flip it a million times: mean 500,000, standard deviation 500 — a wider absolute spread, but as a *fraction* of the total it has shrunk from 10% to 0.1%, because np grows like n while √(np(1−p)) grows like √n. That shrinking ratio is exactly why long-run frequencies settle down.`, {
      terms: [
        ['Indicator variable', '1 if an event happens, 0 if not. Its average equals the event\'s probability.'],
        ['Linearity of expectation', 'The average of a sum is the sum of the averages, whether or not the parts are independent.'],
        ['Variance / standard deviation', 'Average squared distance from the mean; its square root, in the original units.'],
        ['√n growth', 'Spread grows like √n while the total grows like n, so the relative spread shrinks like 1/√n.'],
      ]
    }),
    q.num('M', 'One hundred packets are each dropped independently with probability 0.01. Expected number of drops?', 1, 'n·p = 100 × 0.01 = 1, by linearity over 100 indicators.'),
    q.num('M', 'One hundred packets are each dropped independently with probability 0.01. Variance of the number of drops, to 2 decimal places?', 0.99, 'np(1−p) = 100 × 0.01 × 0.99 = 0.99. The standard deviation is √0.99 ≈ 0.995, about the same size as the mean — typical of rare events.', { tol: 0.01 }),
    q.num('M', 'A fair coin is flipped 10,000 times. Standard deviation of the number of heads, √(np(1−p))?', 50, '√(10000 × 0.5 × 0.5) = √2500 = 50. So a count of heads outside about 4,850–5,150 (three standard deviations) would be a genuine surprise.'),
    q.mc('M', 'Interview: a fair coin is flipped 100 times. Roughly how likely is exactly 50 heads?', ['About 8%: the mean is 50 but the outcome is spread over roughly ±5, so no single value carries much probability', 'About 50%, since heads has probability ½', 'Almost certain, by the law of large numbers', 'About 1%, since there are 100 possible counts'], 0, 'C(100,50)/2¹⁰⁰ ≈ 0.0796. The standard deviation is √25 = 5, so the probability is spread across roughly ten plausible values. "The mean is 50" says where the middle is, not that the middle happens.'),
    q.mc('M', 'Interview: ten packets are each dropped independently with probability 0.1, so the expected number of drops is 1. Which is more likely, exactly 0 drops or exactly 1 drop?', ['Exactly 1, at 0.387 against 0.349 for zero drops', 'Exactly 0, since it is the single most likely pattern', 'They are equal, because the mean is 1', 'Exactly 0, because 0.9¹⁰ is large'], 0, 'P(0) = 0.9¹⁰ = 0.349; P(1) = 10 × 0.1 × 0.9⁹ = 0.387. The k = 1 bar wins because ten different patterns feed it while only one feeds k = 0 — the mode of a binomial sits near np, not at 0.'),
    q.mc('M', 'Interview: a machine makes 1,000,000 independent parts, each faulty with probability 0.001. A colleague says "expect 1000 faults, so anything from 0 to 5000 is plausible". What does the spread actually say?', ['The standard deviation is √(1000 × 0.999) ≈ 31.6, so counts outside roughly 900–1100 are already extraordinary', 'The colleague is right: with a million parts anything can happen', 'The spread is np = 1000, so 0 to 2000 is plausible', 'Nothing can be said without knowing the fault mechanism'], 0, 'Var = np(1−p) ≈ 999, so the standard deviation is about 32, not 1000. Three standard deviations is ±95. Seeing 5000 would mean the model is wrong, which is the useful conclusion.'),

    // =====================================================================================================
    // DEGREE: phasors and impedance (EEEN11101 / MATH19611)
    // =====================================================================================================
    q.info('E', 'Why a sinusoid in gives a sinusoid out', `Drive a circuit of resistors, capacitors and inductors with V·cos(ωt) and, once any switch-on transient has died away, every voltage and current in it is a sinusoid at **exactly the same frequency**. Different size, shifted in time, but the same frequency. That fact is what makes AC analysis possible at all, so it deserves a reason rather than a shrug.

Look at what those components can do to a signal. A resistor **multiplies by a constant**. Kirchhoff's laws **add** signals. A capacitor and an inductor **differentiate** (i = C·dv/dt, v = L·di/dt). That is the complete list — and each operation keeps a sinusoid a sinusoid of the same frequency:

- multiply cos(ωt) by a constant: same frequency, new size;
- differentiate cos(ωt): −ω·sin(ωt), which is ω·cos(ωt + 90°) — same frequency, new size and a shift;
- add two sinusoids of frequency ω: the sum is again a sinusoid of frequency ω (add them as arrows, or expand with the compound-angle formula).

No operation available to the circuit can create a new frequency. So the *only* things that can change are **amplitude and phase**, and the whole problem shrinks to tracking those two numbers per signal. Add one nonlinear part — a diode, a saturating amplifier — and this collapses: squaring a sinusoid produces a component at 2ω. Linear is the hypothesis doing all the work.`, {
      terms: [
        ['Sinusoidal steady state', 'The behaviour after switch-on transients have died away, with a sinusoidal source driving the circuit.'],
        ['Linear circuit', 'One built only from elements whose behaviour is scaling, adding, differentiating or integrating: R, L, C and ideal sources.'],
        ['Amplitude', 'The peak size of a sinusoid.'],
        ['Phase', 'Where the sinusoid sits in its cycle, measured as an angle: a shift in time expressed in degrees or radians.'],
        ['ω (angular frequency)', '2πf in radians per second. One full cycle is 2π radians.'],
      ],
      widget: W('phasor', { comp: 'C' })
    }),
    q.mc('E', 'A circuit made only of resistors, capacitors and inductors is driven by a 50 Hz sinusoid. Why does every current and voltage in it settle into a 50 Hz sinusoid?', ['Those components only scale, add and differentiate signals, and none of those operations changes a sinusoid\'s frequency', 'Because 50 Hz is the mains frequency', 'Because capacitors block other frequencies', 'It is an approximation that only holds for small signals'], 0, 'Scaling changes size, differentiating changes size and phase, adding sinusoids of one frequency gives that frequency. No linear operation can create a new one. A nonlinear component would.'),
    q.info('E', 'The phasor: hide the spinning part', `Every signal in the circuit is A·cos(ωt + φ), and they all share the same ω. Only A and φ differ from one signal to the next, so we want algebra that carries A and φ and never mentions t.

Day 9's complex numbers do it. Write

A·cos(ωt + φ) = Re{ A·e^(jφ) · e^(jωt) }

The factor **e^(jωt)** is the same for every signal in the circuit, so it can be carried along silently and cancelled at the end. What is left, **A·e^(jφ)**, holds exactly the two numbers that matter: magnitude A and angle φ. That complex number is the **phasor**.

Now the payoff. Differentiate:

d/dt [ A·e^(jφ)·e^(jωt) ] = jω · A·e^(jφ)·e^(jωt)

**Differentiation has become multiplication by jω.** Every differential equation in the circuit turns into ordinary algebra with complex numbers. And it is not a trick with no meaning: multiplying by j rotates a complex number by +90° and multiplying by ω scales it, which is precisely what differentiating a cosine does — it advances the phase by 90° and multiplies the amplitude by ω.

Two cautions. A phasor holds no information about frequency, so every phasor calculation is at one fixed ω. And phasors describe the steady state only; a switch-on transient is not a sinusoid, which is why Day 20's e^(−t/τ) needed a different method.`, {
      terms: [
        ['Phasor', 'The complex amplitude A·e^(jφ) of a sinusoid: its magnitude and phase, with the e^(jωt) removed.'],
        ['e^(jθ)', 'cos θ + j·sin θ: the unit complex number at angle θ. Multiplying by it rotates by θ.'],
        ['d/dt → jω', 'In phasor form, differentiating a signal multiplies its phasor by jω: 90° of rotation and a factor ω.'],
        ['Re{ }', 'The real part. The physical signal is the real part of the rotating complex quantity.'],
      ],
      widget: W('complex', { re: 3, im: 4 })
    }),
    q.mc('E', 'In phasor form, what does differentiating a sinusoidal signal with respect to time do to its phasor?', ['Multiplies it by jω: the phase advances 90° and the amplitude is scaled by ω', 'Multiplies it by ω only, leaving the phase alone', 'Divides it by jω', 'Leaves it unchanged'], 0, 'd/dt of e^(jωt) is jω·e^(jωt). The j is the 90° rotation you can see directly: differentiating cos gives −sin, which is cos advanced by 90°.'),
    q.info('E', 'Impedance: Ohm\'s law, with complex numbers', `Apply d/dt → jω to each component's own law and every one of them ends up looking like Ohm's law.

**Capacitor.** i = C·dv/dt becomes I = jωC·V, so V/I = **Z_C = 1/(jωC) = −j/(ωC)**.
**Inductor.** v = L·di/dt becomes V = jωL·I, so **Z_L = jωL**.
**Resistor.** v = R·i has no derivative, so **Z_R = R**.

Each of these ratios is the component's **impedance** Z, measured in ohms, and every component now obeys **V = Z·I** with complex V, I and Z. Read Z in polar form: its **magnitude** is the ratio of the voltage amplitude to the current amplitude, and its **angle** is how far the voltage leads the current.

Because Kirchhoff's laws are still just adding, the combination rules survive unchanged: impedances in series add, impedances in parallel combine as 1/(1/Z₁ + 1/Z₂), and the voltage divider is Z₂/(Z₁ + Z₂). Every DC technique you already have — series/parallel reduction, the divider, nodal analysis, Thévenin — works on AC circuits with R replaced by Z and real arithmetic replaced by complex arithmetic. That is the whole reason for the machinery: not new laws, just old laws over a bigger number system.`, {
      terms: [
        ['Impedance Z', 'The complex ratio V/I for a component or network, in ohms. Magnitude = amplitude ratio, angle = phase of V relative to I.'],
        ['Reactance X', 'The imaginary part of Z: X_L = ωL for an inductor, X_C = −1/(ωC) for a capacitor.'],
        ['Z_L = jωL', 'Inductor impedance: grows with frequency, angle +90°.'],
        ['Z_C = 1/(jωC)', 'Capacitor impedance: shrinks with frequency, angle −90°.'],
        ['Series/parallel rules', 'Unchanged from DC, with complex arithmetic: series impedances add, parallel ones combine reciprocally.'],
      ],
      widget: W('impedance', { f: 50, R: 100, L: 0.1, C: 10 })
    }),
    q.num('E', 'A 0.1 H inductor at 50 Hz. Magnitude of its impedance, in ohms (1 d.p.)?', 31.4, '|Z_L| = ωL = 2π × 50 × 0.1 = 31.42 Ω.', { unit: 'Ω', tol: 0.15 }),
    q.num('E', 'A 10 µF capacitor at 50 Hz. Magnitude of its impedance, in ohms (1 d.p.)?', 318.3, '|Z_C| = 1/(ωC) = 1/(2π × 50 × 10 × 10⁻⁶) = 1/(3.1416 × 10⁻³) = 318.3 Ω.', { unit: 'Ω', tol: 1 }),
    q.mc('E', 'As the frequency rises, the magnitude of a capacitor\'s impedance…', ['falls, as 1/(ωC)', 'rises, as ωC', 'stays constant', 'becomes negative'], 0, 'A capacitor passes high frequencies easily and blocks DC entirely (infinite impedance at ω = 0), which is the frequency-domain version of "a capacitor is an open circuit at steady state".', { grid: true }),
    q.mc('E', 'In an inductor driven by a sinusoid, what is the phase relationship between its current and its voltage?', ['The current lags the voltage by 90°, because Z_L = jωL has angle +90°', 'The current leads the voltage by 90°', 'They are in phase', 'The phase depends on the amplitude'], 0, 'v = L·di/dt, so the voltage is largest when the current is changing fastest — as the current crosses zero, a quarter of a cycle before its own peak. In a capacitor the roles swap and the current leads.'),
    q.match('E', 'Match each component to how its impedance behaves in a sinusoidal steady state.', [['resistor', 'The same at every frequency, with the current in phase with the voltage'], ['inductor', 'Grows in proportion to frequency, with the current lagging the voltage by a quarter cycle'], ['capacitor', 'Shrinks in inverse proportion to frequency, with the current leading the voltage by a quarter cycle'], ['ideal wire', 'Zero at every frequency, so it never drops any voltage']], 'The magnitude says how much the amplitude is divided down; the angle says how far the voltage leads the current: zero for a resistor, a quarter cycle ahead for an inductor, a quarter cycle behind for a capacitor.'),
    q.num('E', 'Exam-style: a 100 Ω resistor in series with a 0.1 H inductor, driven at 50 Hz. Magnitude of the total impedance, in ohms (1 d.p.)?', 104.8, 'X_L = 2π × 50 × 0.1 = 31.42 Ω, so Z = 100 + j31.42 and |Z| = √(100² + 31.42²) = √10987 = 104.8 Ω.', { unit: 'Ω', tol: 0.3 }),
    q.num('E', 'Exam-style: a 100 Ω resistor in series with a 0.1 H inductor, driven at 50 Hz, giving Z = 100 + j31.4 Ω. Phase angle of Z, in degrees (1 d.p.)?', 17.4, 'arg Z = arctan(31.42/100) = arctan(0.3142) = 17.4°. The voltage across the combination leads the current by 17.4°, so the network is mildly inductive.', { unit: '°', tol: 0.3 }),
    q.num('E', 'Exam-style: a 10 V amplitude sinusoid at 50 Hz drives a 100 Ω resistor in series with a 0.1 H inductor, whose total impedance has magnitude 104.8 Ω. Amplitude of the current, in milliamperes (1 d.p.)?', 95.4, '|I| = |V|/|Z| = 10/104.8 = 0.0954 A = 95.4 mA. Magnitudes divide; the angles subtract, so the current lags the source by 17.4°.', { unit: 'mA', tol: 0.5 }),
    q.num('E', 'Exam-style: a 1 kΩ resistor and a 1 µF capacitor in series form a divider whose output is taken across the capacitor. At what frequency does |Z_C| equal R, in hertz (nearest whole)?', 159, '1/(ωC) = R → ω = 1/(RC) = 1/(10³ × 10⁻⁶) = 1000 rad/s, so f = 1000/2π = 159.2 Hz. This is the corner frequency of the RC low-pass filter, where the output amplitude is 1/√2 of the input and the phase shift is −45°.', { unit: 'Hz', tol: 1 }),
    q.num('E', 'Exam-style: a 1 kΩ resistor in series with a 1 µF capacitor is driven by a 10 V amplitude sinusoid at 159 Hz, where |Z_C| = 1000 Ω. Amplitude of the voltage across the capacitor, in volts (2 d.p.)?', 7.07, 'The divider works with impedances: |V_C| = |V|·|Z_C|/|Z_R + Z_C| = 10 × 1000/|1000 − j1000| = 10 × 1000/1414 = 7.07 V. That is 1/√2 of the input — the −3 dB point of an RC low-pass filter.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 1 kΩ resistor in series with a 1 µF capacitor, output taken across the capacitor, driven at the frequency where |Z_C| = R. Phase of the output relative to the input, in degrees (sign included)?', -45, 'Output/input = Z_C/(R + Z_C) = −j1000/(1000 − j1000). The denominator has angle −45° and the numerator −90°, so the ratio has angle −45°: the output lags the input by 45°.', { unit: '°', tol: 1 }),
    q.num('E', 'A 1 µF capacitor driven at 1 kHz. Magnitude of its impedance, in ohms (1 d.p.)?', 159.2, '1/(ωC) = 1/(2π × 1000 × 10⁻⁶) = 1/(6.283 × 10⁻³) = 159.2 Ω. Ten times the frequency of the 50 Hz case gives a tenth of the impedance.', { unit: 'Ω', tol: 1 }),
    q.tf('E', 'An impedance Z is a phasor, so it rotates at ω like the voltage and current phasors do.', false, 'Z is the *ratio* of two phasors, V/I. The shared e^(jωt) cancels in the division, so Z is a fixed complex number for a given frequency — it changes with ω, not with time.'),
    q.mc('E', 'At DC (frequency 0), what do the impedance formulas Z_L = jωL and Z_C = 1/(jωC) say about an inductor and a capacitor?', ['The inductor becomes 0 Ω (a short) and the capacitor becomes infinite (an open) — the same steady-state behaviour reached from the time-domain equations', 'Both become 0 Ω', 'Both become infinite', 'The formulas do not apply at DC'], 0, 'Setting ω = 0 gives Z_L = 0 and Z_C = ∞, matching v = L·di/dt = 0 for a steady current and i = C·dv/dt = 0 for a steady voltage. Two routes, one answer, which is a good sign the machinery is honest.'),
    q.num('E', 'A series circuit of a 0.1 H inductor and a 10 µF capacitor. Resonant frequency, where the two reactances cancel, in hertz (nearest whole)?', 159, 'ωL = 1/(ωC) → ω = 1/√(LC) = 1/√(0.1 × 10⁻⁵) = 1000 rad/s → f = 159.2 Hz. At resonance the series impedance is just whatever resistance is present.', { unit: 'Hz', tol: 1 }),
    q.mc('E', 'Exam-style: a series R, L and C circuit is driven at its resonant frequency, where ωL = 1/(ωC). What is the total impedance there?', ['Exactly R: the inductive and capacitive parts are equal and opposite, so they cancel', 'Zero, since the reactances cancel and R is bypassed', 'jωL, since the inductor dominates', 'Infinite'], 0, 'Z = R + j(ωL − 1/(ωC)), and at resonance the bracket is zero. The current is then largest and exactly in phase with the driving voltage.'),
    ...genius(q, 22),
  ]
};
