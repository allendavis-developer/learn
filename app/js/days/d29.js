import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(29);

export default {
  title: 'FIFO pointers & wrap bits, binary search on the answer, occupied buckets, vectors',
  emoji: '🧭',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook H04 L2/L4. **Hardware**: one extra bit on each FIFO pointer, derived from a counting argument, telling full from empty with no counter; and the read-during-write hazard, where a value read before the previous write lands gives 14 instead of 17, with forwarding and stalling as the two repairs. **Code** (A02 L3): searching over the answer instead of over the array, the greedy feasibility test and why it is optimal for positive values, and the bounds that make the search correct. **Maths** (worked example D): indicator variables, the expected number of occupied hash buckets, and the three different questions people confuse about one experiment. **Degree** (MATH19611): vectors, the dot product as projection times length derived from the cosine rule, the cross product as area with a direction, and work and torque.',
  takeaway: 'Pointer width = log₂(depth) + 1. Equal pointers mean empty; equal address bits with different top bits mean full; occupancy is (wr − rd) mod 2^(A+1). A synchronous RAM read sees only writes that have landed, so two updates to one symbol give 10 + 3 then 10 + 4 = 14 instead of 17 unless you forward the youngest pending write or stall. If a capacity works then every larger one does, so binary-search the capacity with a greedy feasibility test between max(times) and sum(times). E[occupied buckets] = m(1 − (1 − 1/m)ⁿ) by linearity, which never needs independence; for n = 3, m = 4 that is 37/16. a·b = |a||b|cos θ is zero for perpendicular vectors; |a × b| = |a||b|sin θ is zero for parallel ones.',
  steps: [
    // =====================================================================================================
    // HARDWARE: wrap bits and the read-during-write hazard (H04 L2/L4)
    // =====================================================================================================
    q.info('H', 'One extra bit, and why exactly one', `A depth-8 FIFO needs 3 bits to address its memory. Give each pointer a **fourth** bit instead, and the ambiguity between empty and full disappears.

Here is the derivation, because the rule is worth owning rather than memorising.

Let the pointers count **every** push and every pop since reset, wrapping modulo 2⁴ = 16 rather than modulo 8. Then the number of stored items is exactly

**occupancy = (wr − rd) mod 16**

and it can only ever run from 0 to 8, because the FIFO refuses a push at 8.

Now read off the two special cases.

- **Empty** is occupancy 0, so wr − rd ≡ 0: **all four bits equal**.
- **Full** is occupancy 8, so wr − rd ≡ 8 = 1000 in binary: the low three bits are unchanged and only the top bit differs. So **the address bits are equal and the top bits differ**.

Every other difference is a partly filled FIFO, and the same subtraction gives the occupancy directly if you want it.

Why exactly one extra bit and not two? Because there are 9 occupancies (0 to 8) and 3-bit pointers give only 8 distinguishable differences. One bit doubles that to 16, which is more than enough. Push and pop below and watch the top bits.`, {
      terms: [
        ['Wrap bit', 'The extra most significant bit on a ring pointer. It toggles every time the pointer passes the end of the memory.'],
        ['Address bits', 'The low log₂(depth) bits, which actually select a memory slot.'],
        ['Empty condition', 'All pointer bits equal, wrap bit included.'],
        ['Full condition', 'Address bits equal, wrap bits different: the write pointer is exactly one lap ahead.'],
        ['Occupancy from pointers', '(wr − rd) mod 2^(A+1), which is between 0 and depth.'],
      ],
      widget: W('wrapbit', { depth: 8 })
    }),
    q.info('H', 'Why hardware often prefers the extra bit to a counter', `A count register works and is easy to read. So why is the wrap bit the standard choice in real FIFO libraries?

**It is smaller.** Two extra flip-flops, one per pointer, against a whole counter with its own increment and decrement logic and its own comparison against the depth.

**Nothing has to be updated by two writers.** The count must go up on a push and down on a pop, so a cycle with both has to add and subtract at once. Each pointer, by contrast, is owned by exactly one side: the writer never touches rd and the reader never touches wr. Fewer shared registers means fewer race conditions to reason about.

**It survives a clock-domain crossing.** This is the decisive reason. In an asynchronous FIFO the writer and the reader run on different clocks, and a multi-bit value cannot simply be sampled across the boundary: the bits arrive at slightly different times and you can read a value that never existed. A **Gray-coded** pointer, where only one bit changes per step, can be sampled safely, because the worst you can catch is the value just before or just after. A count register changes several bits at once and has no such protection. That is unit H07's subject; the point today is that the wrap-bit design is the one that still works when you get there.`, {
      terms: [
        ['Asynchronous FIFO', 'A FIFO whose write and read sides run on different clocks. The usual way to move data between clock domains.'],
        ['Clock-domain crossing', 'Passing a signal between two unrelated clocks. Multi-bit values need special handling.'],
        ['Gray code', 'A counting order where consecutive values differ in exactly one bit, so a sample taken mid-change is still a real neighbouring value.'],
        ['Single ownership', 'Each pointer is written by one side only, which removes a whole class of race conditions.'],
      ]
    }),
    q.info('H', 'Read-during-write: 10 + 3 + 4 = 14', `Now the harder half of the unit. Keep the state of 256 symbols in a synchronous RAM. A synchronous RAM has **write latency**: the value you write this cycle is not visible to a read until the next cycle.

Two updates to the same symbol arrive back to back. The symbol starts at 10; the first adds 3, the second adds 4.

- Cycle 1: read symbol, get **10**. Compute 13. Write it.
- Cycle 2: read the same symbol. The write from cycle 1 has not landed yet, so the read returns **10** again. Compute 14. Write it.

Final value **14**. The right answer is **17**.

Nothing here is a coding error. Each stage does exactly what it was told; the arithmetic is right; the comparison logic is right. What is wrong is the **state observation**: the second operation looked at the world before its predecessor had finished changing it. That is a **read-during-write hazard**, and it is the central correctness problem in any pipeline that reads and updates the same state.

The handbook's version of this is a risk gate: available capacity 30, two commands each consuming 20, arriving on consecutive cycles for the same symbol. Both read 30, both pass, and 40 is consumed against a limit of 30. The limit check was locally correct every time, and the system still broke its own rule. Step the simulation below through all three modes.`, {
      terms: [
        ['Synchronous RAM', 'Memory read and written on clock edges. A write becomes visible to reads a cycle later.'],
        ['Read-during-write hazard', 'Reading a location whose most recent write is still in flight, and getting the old value.'],
        ['Stale read', 'A read that returns an out-of-date value. Locally correct logic on stale data is still wrong.'],
        ['Ordered admission', 'The promise that command B sees the effect of command A when A was accepted first.'],
      ],
      widget: W('rdw', { start: 10, deltas: [3, 4] })
    }),
    q.goal('H', 'The simulation below applies two back-to-back updates to one symbol: it starts at 10, the first adds 3, the second adds 4. Select forwarding and step until it finishes, so it reports the correct final value of 17.', W('rdw', { start: 10, deltas: [3, 4] }), s => s.done && s.final === 17,
      'Forwarding feeds the pending 13 straight to the second operation, which then computes 13 + 4 = 17 without waiting. In naive mode both operations read 10 and the answer is 14. In stall mode the answer is also 17, but it costs an extra cycle.'),
    q.info('H', 'Forwarding or stalling, and the detail that gets it wrong', `There are exactly two honest repairs.

**Stall.** Hold the second operation until the first write is visible. Order is preserved, the logic stays simple, and the cost is throughput: a burst of updates to one symbol runs at half rate or worse. For traffic that rarely repeats a symbol, this is a perfectly good answer.

**Forward (bypass).** Compare the address being read with the addresses of the writes still in flight. On a match, feed the pending value to the reader instead of the memory output. No cycles lost, more logic, and one detail that is easy to get wrong:

- Forward the **youngest** matching predecessor, not the oldest and not the first one you find. With three updates to one symbol in flight, only the most recent value is the correct one.
- Never forward a value from a command that was **rejected**. A rejected command reserved nothing, so forwarding its would-be result invents capacity that was never consumed.

**Testing it.** The bug depends on the **distance** between the two operations: adjacent cycles, one cycle apart, two apart, and so on until the pipeline is longer than the gap and the hazard disappears. Each distance is a separate test case, and each combination of operation types (new/new, new/cancel, cancel/fill, and so on) is another. Random traffic over 256 symbols almost never puts two operations on the same symbol close together, so a million random cycles can leave this completely untested.`, {
      terms: [
        ['Stalling', 'Holding an operation until the state it needs is visible. Correct, and costs throughput.'],
        ['Forwarding (bypass)', 'Routing a pending write value straight to a matching read. Correct, and costs logic.'],
        ['Youngest predecessor', 'The most recent pending write to that address. Forwarding an older one gives a stale answer again.'],
        ['Hazard distance', 'How many cycles apart two operations on the same address are. Every distance is its own test case.'],
        ['Hazard matrix', 'A table of operation type against distance, so no combination is left untested.'],
      ],
      widget: W('stale', { limit: 100, used: 70, cmds: [20, 20] })
    }),
    q.num('H', 'A FIFO has depth 8 and uses pointers with a wrap bit. How many bits wide is each pointer?', 4, 'log₂(8) = 3 bits are needed to address the eight slots, plus one wrap bit that toggles each time a pointer passes the end: 4 bits in total. The pointers then count pushes and pops modulo 16, and the occupancy is their difference modulo 16.', { unit: 'bits' }),
    q.num('H', 'A FIFO has depth 32 and uses pointers with a wrap bit. How many bits wide is each pointer?', 6, 'log₂(32) = 5 address bits plus 1 wrap bit = 6. The rule is always log₂(depth) + 1, and it exists because there are depth + 1 possible occupancies but only depth distinct address differences.', { unit: 'bits' }),
    q.mc('H', 'A depth-8 FIFO uses 4-bit pointers with a wrap bit. The write pointer is 1011 and the read pointer is 0011. What state is the FIFO in?', ['Full: the three address bits are equal (011) and the top bits differ, so the write pointer is exactly one lap ahead', 'Empty', 'Holding 3 items', 'In an illegal state'], 0, 'Subtract: (11 − 3) mod 16 = 8, which is the depth, so the FIFO is full. Reading it off the bits is quicker: identical address bits with different wrap bits is exactly a difference of 8.'),
    q.mc('H', 'A depth-8 FIFO uses 4-bit pointers with a wrap bit. Both the write and read pointers read 0110. What state is the FIFO in?', ['Empty: every bit matches, wrap bit included, so the difference is 0', 'Full', 'Holding 6 items', 'In an illegal state'], 0, 'All four bits equal means the two pointers have counted the same number of operations, so nothing is stored. With only 3-bit pointers this would be indistinguishable from the full case, which is the whole reason for the fourth bit.'),
    q.num('H', 'A depth-8 FIFO uses 4-bit pointers with a wrap bit. The write pointer is 0010 and the read pointer is 1101. How many items are stored?', 5, 'Occupancy = (wr − rd) mod 16 = (2 − 13) mod 16 = (−11) mod 16 = 5. The subtraction wraps just as the pointers do, and the answer is always between 0 and the depth for a correctly working FIFO.', { unit: 'items' }),
    q.mc('H', 'Why is a wrap bit usually preferred to a count register in an **asynchronous** FIFO, where the write and read sides run on different clocks?', ['Each pointer is owned and updated by one side only, and a Gray-coded pointer can be sampled safely across the clock boundary, whereas a count changes several bits at once and can be read as a value that never existed', 'A count register is slower to increment', 'Wrap bits use less power', 'A count register cannot represent the full state'], 0, 'A multi-bit value sampled by an unrelated clock can be caught mid-change, with some bits old and some new. Gray coding limits the damage to one bit, so the sampled value is always a genuine neighbour. A shared count register has no such protection and two writers besides.'),
    q.mc('H', 'A symbol\'s stored value is 10. Two updates arrive on consecutive cycles, adding 3 and then 4, but the second reads the memory before the first write has landed. What final value does the memory hold?', ['14: both operations read 10, so the second computes 10 + 4 and overwrites the first result', '17', '13', '10'], 0, 'The first writes 13, the second reads the stale 10 and writes 14 on top of it. The correct serialised answer is 17. Nothing in either operation is wrong on its own; the fault is that the second observed the state before the first had changed it.', { grid: true }),
    q.mc('H', 'Which repairs for a same-address read-during-write hazard are correct?', ['Stall the second operation until the first write is visible, or forward the pending value straight to it', 'Increase the clock frequency', 'Read the location twice and take the larger value', 'Nothing: the case is too rare to matter'], 0, 'Those are the only two honest repairs, and they trade throughput against logic. "Too rare to matter" is the answer that produces the bug: rare is not never, and in a risk or accounting pipeline a single occurrence is a breached limit.'),
    q.mc('H', 'Three updates to the same symbol are in flight when a fourth operation reads it. Which pending value should be forwarded?', ['The youngest: only the most recent pending write reflects everything that came before it', 'The oldest, because it was accepted first', 'The average of the three', 'None: forwarding is unsafe when more than one write is pending'], 0, 'Each pending write already includes the effect of its predecessors, so the newest one is the complete picture. Forwarding an older one reproduces exactly the staleness you were trying to remove. And a write from a command that was rejected must never be forwarded at all: it reserved nothing.'),
    q.mc('H', 'Your pipeline runs a million random cycles over 256 symbols with no failure, and then breaks in production on a same-symbol hazard. Why did the random test miss it?', ['With 256 symbols, two operations landing on the same symbol within a few cycles is rare, so the hazard distances were essentially never exercised', 'The random generator was broken', 'A million cycles is too few for any test', 'Production used a different clock frequency'], 0, 'Random traffic spreads itself over the address space, which is precisely what you do not want here. The fix is directed tests: force two operations onto one symbol at distance 1, then 2, then 3, and cross that with every pair of operation types, including a rejected predecessor.'),
    q.code('H', 'Model the hazard and its repair. `solve(ops, forwarding)` applies one `[address, delta]` operation per cycle to a memory that starts at 0 everywhere. A write issued in cycle t only becomes visible to reads from cycle t + 2 onwards, so it is "pending" for one cycle. Each operation reads its address, adds its delta, and writes the result back. With `forwarding` false a read sees only writes issued at cycle t − 2 or earlier; with `forwarding` true a read also sees the write issued in cycle t − 1 if it targets the same address. Return the final memory as a dictionary `{address: value}` covering every address written.', {
      fn: 'solve',
      starter: 'def solve(ops, forwarding):\n    mem = {}                    # values that have become visible\n    pending = None              # (address, value) written last cycle, not visible yet\n    for addr, delta in ops:\n        visible = mem.get(addr, 0)\n        if forwarding and pending is not None and pending[0] == addr:\n            visible = pending[1]\n        new_val = visible + delta\n        # commit last cycle\'s pending write into mem, then make this write the pending one\n        pass\n    # commit the final pending write\n    return mem\n',
      tests: [
        { args: [[[7, 3], [7, 4]], false], expect: { 7: 4 }, name: 'stale read: both operations see 0, so the answer is 4 and not 7' },
        { args: [[[7, 3], [7, 4]], true], expect: { 7: 7 }, name: 'forwarding: the second sees 3 and writes 7' },
        { args: [[[1, 5], [2, 6], [1, 1]], false], expect: { 1: 6, 2: 6 }, name: 'distance 2 to the same address: the write has landed, so no hazard' },
        { args: [[[3, 1], [3, 1], [3, 1]], false], expect: { 3: 2 }, name: 'three in a row without forwarding loses one update' },
        { args: [[[3, 1], [3, 1], [3, 1]], true], expect: { 3: 3 }, name: 'three in a row with forwarding is correct' },
        { args: [[[5, 2]], false], expect: { 5: 2 }, name: 'a single operation has no predecessor to be stale about' },
        { args: [[], true], expect: {}, name: 'no operations' },
      ],
      checker: 'def check(args, got, expect):\n    return {str(k): v for k, v in dict(got).items()} == {str(k): v for k, v in dict(expect).items()}',
      gen: 'def gen():\n    for _ in range(10):\n        yield ([[random.randint(0, 2), random.randint(1, 3)] for _ in range(random.randint(0, 7))], random.choice([True, False]))',
      refCode: 'def ref(ops, forwarding):\n    mem = {}; pending = None\n    for addr, delta in ops:\n        vis = mem.get(addr, 0)\n        if forwarding and pending is not None and pending[0] == addr: vis = pending[1]\n        nv = vis + delta\n        if pending is not None: mem[pending[0]] = pending[1]\n        pending = (addr, nv)\n    if pending is not None: mem[pending[0]] = pending[1]\n    return mem',
      solution: 'def solve(ops, forwarding):\n    mem = {}\n    pending = None\n    for addr, delta in ops:\n        visible = mem.get(addr, 0)\n        if forwarding and pending is not None and pending[0] == addr:\n            visible = pending[1]\n        new_val = visible + delta\n        if pending is not None:\n            mem[pending[0]] = pending[1]\n        pending = (addr, new_val)\n    if pending is not None:\n        mem[pending[0]] = pending[1]\n    return mem'
    }, 'Test 1 is the handbook checkpoint measured from a zero start: 0 + 3 then 0 + 4 gives 4 where the correct serialised answer is 7, the same shape as 14 instead of 17. Note where the commit sits in the loop: the pending write from the previous cycle must be committed **after** this cycle\'s read, or the model quietly forwards for free and you can never reproduce the bug. Test 3 is the control: at distance 2 the write has landed, both modes agree, and any difference there means your latency model is wrong rather than your forwarding.'),

    // =====================================================================================================
    // ALGORITHMS: binary search on the answer (A02 L3)
    // =====================================================================================================
    q.info('A', 'Search the answer, not the array', `Packet processing times [2, 3, 4] must be split into at most 2 **contiguous** batches, and you want the biggest batch total to be as small as possible. The splits are [2] | [3,4] with a maximum of 7, or [2,3] | [4] with a maximum of 5. The answer is **5**.

The direct approach is to try every split, which explodes as the list grows. The trick is to change the question.

Instead of "what is the best split?", ask **"can it be done with a batch capacity of C?"** That is a yes/no question with a cheap answer, and it has the property that makes searching possible:

**If capacity C works, every capacity larger than C also works.** Nothing about a bigger budget can force you into more batches; you can always keep the same split.

A yes/no test whose answer flips from no to yes exactly once, and never flips back, is a **monotone predicate**. That is precisely what binary search needs, and here you are searching over the *answers*, not over positions in an array. Find the smallest C for which the answer is yes, and that C is the optimum.

The technique is worth more than the problem. "Minimise the maximum something" is nearly always this pattern: guess the value, test feasibility, binary-search the guess.`, {
      widget: W('bsanswer', { times: [7, 2, 5, 10, 8], k: 2 }),
      terms: [
        ['Binary search on the answer', 'Search over candidate answers using a monotone yes/no feasibility test, instead of searching an array.'],
        ['Feasibility test', 'A function deciding whether a proposed answer is achievable. It must be monotone.'],
        ['Monotone predicate', 'Once the answer becomes yes it stays yes as the candidate grows. That is what makes a boundary exist to find.'],
        ['Contiguous batch', 'A run of consecutive items. You may choose where to cut, but not which items go together.'],
      ]
    }),
    q.info('A', 'The greedy feasibility test, and why it is safe', `Testing a capacity C is a single pass. Start a batch, add items while they still fit, and open a new batch the moment the next item would overflow. Count the batches and compare with k.

Why is greedy optimal here? Because you never gain by cutting early. Suppose some other valid split uses fewer batches than the greedy one. Walk both from the left: greedy's first cut is at least as far right as the other split's first cut, because greedy only stops when it must. By the same argument every later greedy cut is at least as far right, so greedy reaches the end in no more batches than the other split. It therefore uses the minimum, and if greedy needs more than k batches, no split can manage with k.

**Where the argument leans on positivity.** "Adding an item never helps" is only true when every item is at least 0. With a negative value, extending a batch could *reduce* its total, greedy's stopping rule stops meaning anything, and feasibility stops being monotone, which breaks the search rather than merely the greedy. The handbook makes the same point about sliding windows: shrinking on "too large" assumes non-negative values.

One more sanity condition. If any single item exceeds C it can never be placed, since batches are contiguous and items are not divisible. Starting the search at \`lo = max(times)\` rules that out before it can happen.`, {
      terms: [
        ['Greedy fill', 'Extend the current batch while the next item fits; otherwise start a new one.'],
        ['Exchange argument', 'Show greedy is never behind any alternative, step by step, so it cannot use more batches.'],
        ['Non-negative values', 'The assumption greedy rests on. Negative values break monotonicity and the whole approach.'],
        ['Indivisible item', 'One item cannot be split across batches, so no capacity below max(times) is ever feasible.'],
      ]
    }),
    q.info('A', 'Bounds, invariant, and why it is `hi = mid`', `The search needs two endpoints and an invariant you can state.

- **lo = max(times).** Any smaller capacity cannot hold the largest single item, so it is infeasible.
- **hi = sum(times).** One batch always fits everything, so this is certainly feasible (as long as k ≥ 1).

The invariant to hold on every iteration is: **the answer lies in [lo, hi]**, with hi always feasible and lo − 1 always infeasible. Now the update rules write themselves.

\`\`\`
while lo < hi:
    mid = (lo + hi) // 2
    if feasible(mid):
        hi = mid          # mid might BE the answer, so keep it
    else:
        lo = mid + 1      # mid is definitely too small
\`\`\`

The asymmetry catches people. When mid is feasible you write \`hi = mid\`, **not** \`hi = mid - 1\`, because mid itself may be the smallest feasible capacity and discarding it loses the answer. When mid is infeasible you may safely write \`lo = mid + 1\`, because mid is ruled out. The loop ends when lo equals hi, and that shared value is the answer.

The cost is one feasibility pass, which is O(n), per halving of a range of size sum(times), so **O(n log(sum))**. For 200,000 items summing to about 10⁸, that is about 27 passes: fast, and completely independent of how many ways there are to split.`, {
      terms: [
        ['Search bounds', 'lo = max(times), hi = sum(times). Below lo nothing fits; at hi one batch always works.'],
        ['Loop invariant', 'The answer stays inside [lo, hi] at every step, so when they meet you have it.'],
        ['hi = mid', 'Keep a feasible mid, because it might be the smallest feasible value. Only an infeasible mid can be discarded.'],
        ['O(n log(sum))', 'One linear feasibility pass per halving of the value range.'],
      ]
    }),
    q.num('A', 'Split the list [2, 3, 4] into at most 2 contiguous batches so that the largest batch total is as small as possible. What is that smallest possible largest total?', 5, 'Only two splits exist: [2] | [3,4] gives totals 2 and 7, so a maximum of 7; [2,3] | [4] gives 5 and 4, so a maximum of 5. The best is 5. Check it with the feasibility test: capacity 5 needs 2 batches (yes), capacity 4 needs 3 (no), so 5 is the boundary.'),
    q.mc('A', 'Why can the batch capacity be found by binary search rather than by trying every value?', ['Feasibility is monotone: if a capacity works then every larger capacity works, so there is a single boundary between no and yes', 'Because the input list is sorted', 'Because k is always small', 'It cannot: every value must be tried'], 0, 'A monotone yes/no test has exactly one crossing point, and binary search is the tool for finding a crossing point. If feasibility could flip back to no for a larger capacity there would be no single boundary and halving the range would be unsound.'),
    q.mc('A', 'When binary-searching the batch capacity, what should the initial range be?', ['[max(times), sum(times)]: nothing below the largest single item can work, and one batch holding everything always can', '[0, len(times)]', '[min(times), max(times)]', '[1, k]'], 0, 'The lower bound rules out the impossible case of an item that fits in no batch, and the upper bound is a capacity that is guaranteed feasible so the invariant holds from the start. Starting at 0 would still terminate but wastes iterations and hides the indivisibility argument.'),
    q.mc('A', 'In the binary search for the smallest feasible capacity, why is the feasible branch written `hi = mid` rather than `hi = mid - 1`?', ['Because mid itself may be the smallest feasible capacity, and mid − 1 would discard the answer', 'Because mid - 1 could be negative', 'Because the loop would never terminate otherwise', 'They are equivalent'], 0, 'The invariant is that hi is always feasible and the answer is in [lo, hi]. A feasible mid is a candidate, so keep it. The infeasible branch is different: mid is proved too small, so lo = mid + 1 discards a value that is genuinely ruled out.'),
    q.num('A', 'Test the capacity 18 on the list [7, 2, 5, 10, 8] with a greedy fill: add items while they fit, and start a new batch when the next would overflow. How many batches result?', 2, 'Start with 7, add 2 (9), add 5 (14); 10 would make 24 which exceeds 18, so cut. New batch 10, add 8 (18), which exactly fits. Two batches: [7,2,5] and [10,8]. So capacity 18 is feasible for k = 2, and it is in fact the smallest that is.', { unit: 'batches' }),
    q.mc('A', 'The greedy feasibility test relies on all the processing times being non-negative. What goes wrong if one of them is negative?', ['Adding an item could reduce a batch total, so "extend while it fits" no longer minimises the batch count and feasibility stops being monotone', 'The sum could overflow', 'The list could no longer be sorted', 'Nothing: greedy still works'], 0, 'Greedy is safe because extending a batch can only ever bring it closer to the capacity. With a negative item, extending can pull a batch total back down, so a batch you were forced to cut might have been extendable after all, and a capacity that fails might succeed at a smaller value. Both the greedy argument and the monotonicity die together.'),
    q.code('A', 'Write `solve(times, k)` returning the smallest possible value of the largest batch total when the list `times` of positive integers is split into at most `k` contiguous batches. Use a greedy feasibility test inside a binary search on the capacity, with the range from `max(times)` to `sum(times)`. The speed test uses 200,000 items with k = 50.', {
      fn: 'solve',
      starter: 'def feasible(times, k, cap):\n    batches, cur = 1, 0\n    for t in times:\n        if cur + t <= cap:\n            cur += t\n        else:\n            batches += 1\n            cur = t\n    return batches <= k\n\ndef solve(times, k):\n    lo, hi = max(times), sum(times)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        # feasible -> keep mid as the new hi; not feasible -> lo = mid + 1\n        pass\n    return lo\n',
      tests: [
        { args: [[2, 3, 4], 2], expect: 5, name: 'the worked example: [2,3] and [4]' },
        { args: [[7, 2, 5, 10, 8], 2], expect: 18, name: '[7,2,5] and [10,8]' },
        { args: [[1, 2, 3, 4, 5], 1], expect: 15, name: 'one batch must hold the whole sum' },
        { args: [[1, 2, 3, 4, 5], 5], expect: 5, name: 'k equal to the length: every item alone, so the answer is the maximum' },
        { args: [[1, 2, 3, 4, 5], 9], expect: 5, name: 'more batches allowed than items changes nothing' },
        { args: [[10], 3], expect: 10, name: 'a single item' },
        { args: [[4, 4, 4, 4], 2], expect: 8, name: 'an even split' },
      ],
      gen: 'def gen():\n    for _ in range(10):\n        n = random.randint(1, 8)\n        yield ([random.randint(1, 9) for _ in range(n)], random.randint(1, n))',
      refCode: 'def ref(times, k):\n    n = len(times)\n    best = None\n    def rec(i, left, cur_max):\n        nonlocal best\n        if i == n:\n            best = cur_max if best is None else min(best, cur_max)\n            return\n        if left == 0: return\n        s = 0\n        for j in range(i, n):\n            s += times[j]\n            rec(j + 1, left - 1, max(cur_max, s))\n    rec(0, k, 0)\n    return best',
      speed: { gen: 'def gen():\n    return [[random.randint(1, 1000) for _ in range(200000)], 50]', budgetMs: 2500, label: '200,000 items, k = 50' },
      solution: 'def feasible(times, k, cap):\n    batches, cur = 1, 0\n    for t in times:\n        if cur + t <= cap:\n            cur += t\n        else:\n            batches += 1\n            cur = t\n    return batches <= k\n\ndef solve(times, k):\n    lo, hi = max(times), sum(times)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if feasible(times, k, mid):\n            hi = mid\n        else:\n            lo = mid + 1\n    return lo'
    }, 'The random cases are checked against an exhaustive recursive splitter that tries every possible set of cuts, so the fast solution has to match brute force exactly on small inputs. That pairing — a fast implementation and an obviously correct slow one — is the same discipline as a hardware scoreboard. The speed test is the reason the exhaustive version cannot ship: 200,000 items have astronomically many splits, while the binary search needs about 27 linear passes.', { timeoutMs: 12000 }),
    q.mc('A', 'Interview: you have binary-searched the smallest feasible batch capacity for splitting a list of positive times into at most k contiguous batches, and now the caller also wants the actual batches, not just the number. What do you add?', ['One more greedy pass at the answer capacity, recording where each cut falls: O(n) extra work', 'A second binary search over the cut positions', 'Dynamic programming over all splits', 'Nothing can recover the split from a binary search'], 0, 'The feasibility test already builds a split; it just throws it away. Run it once more at the final capacity and keep the cut positions. Note the split it returns is one optimal split, not the only one, which is worth saying out loud if the interviewer asks for "the" answer.'),
    q.mc('A', 'Interview: what is the complexity of binary search on the answer here, and why is it not affected by how many ways the list can be split?', ['O(n log(sum)): one linear feasibility pass per halving of the value range, and the number of splits never enters the calculation', 'O(2ⁿ), because every split must be considered', 'O(n log n), the cost of sorting', 'O(n·k), one pass per batch'], 0, 'You never enumerate splits at all. You enumerate candidate answers, and there are only sum(times) of them, halved each round. For 200,000 items summing to about 10⁸ that is roughly 27 passes. This is the reason to reframe the question: the answer space is far smaller than the solution space.'),
    q.num('A', 'Interview: a list of 200,000 positive integers has a maximum of 1,000 and a sum of 100,000,000. Roughly how many feasibility passes does the binary search need? (Give the number of halvings, to the nearest whole number.)', 27, 'The range runs from lo = 1,000 to hi = 100,000,000, a width of about 10⁸, and each iteration halves it. log₂(10⁸) ≈ 26.6, so about 27 passes. Each pass is one linear scan, so the whole search is roughly 27 × 200,000 ≈ 5.4 million simple operations.', { unit: 'passes', tol: 1.5 }),

    // =====================================================================================================
    // MATHS: expected occupied buckets (worked example D)
    // =====================================================================================================
    q.info('M', 'Indicators: turn a count into a sum', `n keys are hashed into m buckets, each key landing in a uniformly random bucket, independently of the others. How many buckets end up holding at least one key?

The direct attack is hopeless: there are mⁿ ways the keys can land, and you would have to group them by how many buckets they cover.

The technique that works is to stop counting buckets and start **adding up ones and zeros**. For each bucket b define

**I_b = 1 if bucket b receives at least one key, 0 otherwise.**

Such a variable is an **indicator**. The number of occupied buckets is then just I₁ + I₂ + … + I_m, because each occupied bucket contributes exactly 1.

Now use **linearity of expectation**: the expected value of a sum is the sum of the expected values, always. And the expectation of an indicator is simply the probability that its event happens.

**E[occupied] = Σ P(bucket b is occupied)**

One hard question about a whole configuration has become m easy questions about a single bucket. That move — write the quantity as a sum of indicators, then take expectations term by term — is the single most reused trick in this part of the subject.`, {
      widget: W('buckets', { m: 4, n: 3 }),
      terms: [
        ['Indicator variable', '1 when an event happens, 0 when it does not. Its expected value is the probability of the event.'],
        ['Linearity of expectation', 'E[X + Y] = E[X] + E[Y]. True for any random variables at all.'],
        ['Occupied bucket', 'One holding at least one key.'],
        ['Uniform hashing', 'Each key is equally likely to land in each bucket, independently of the other keys. A model, not a guarantee.'],
      ]
    }),
    q.info('M', 'One bucket at a time, and why dependence does not matter', `Fix one bucket. It ends up empty only if **every** key avoids it. A single key avoids it with probability (m − 1)/m = 1 − 1/m, and the keys are independent, so all n avoid it with probability

**P(bucket is empty) = (1 − 1/m)ⁿ**

so **P(bucket is occupied) = 1 − (1 − 1/m)ⁿ**, and adding that over m identical buckets:

**E[occupied buckets] = m·(1 − (1 − 1/m)ⁿ)**

With n = 3 keys and m = 4 buckets: (3/4)³ = 27/64, so each bucket is occupied with probability 37/64, and the expectation is 4 × 37/64 = **37/16 = 2.3125**.

Now the objection that ought to bother you. The indicators are clearly **not independent**: if the first three buckets are all empty, the fourth is certainly occupied. Does adding their expectations not require independence?

**No.** Linearity of expectation holds for any random variables whatsoever, dependent or not. E[X + Y] = E[X] + E[Y] follows straight from the definition of expectation, with no independence anywhere in the derivation. Independence is needed for **products** — E[XY] = E[X]E[Y] — and for variances of sums. It is not needed for means, and forgetting that turns easy problems into impossible ones.`, {
      terms: [
        ['(1 − 1/m)ⁿ', 'The probability that a fixed bucket is missed by all n keys.'],
        ['Dependent indicators', 'Knowing one bucket is empty changes the chances for the others. Harmless for expectations.'],
        ['Where independence is needed', 'For E[XY] = E[X]E[Y] and for Var(X + Y) = Var(X) + Var(Y). Never for E[X + Y].'],
        ['m(1 − e^(−n/m))', 'The large-m approximation, since (1 − 1/m)ⁿ ≈ e^(−n/m).'],
      ]
    }),
    q.info('M', 'Three different questions about one experiment', `The same n-keys-into-m-buckets experiment supports several questions that people routinely mix up. They have different answers and different methods.

**Expected occupied buckets.** m(1 − (1 − 1/m)ⁿ). Indicators and linearity. For n = 3, m = 4: 37/16 ≈ 2.31.

**Probability of any collision at all.** Count the ways all keys land in different buckets: m(m − 1)…(m − n + 1) out of mⁿ, so P(collision) = 1 − that. For n = 3, m = 4: 1 − (4·3·2)/64 = 1 − 24/64 = **5/8**. This is the birthday calculation. Note it is 0 when n = 1 and forced to 1 as soon as n > m.

**Maximum bucket load.** How full is the fullest bucket? This is much harder: no clean formula, and it is what actually decides whether a hardware table overflows. Expected occupancy tells you nothing about it.

The engineering lesson matters as much as the maths. Sizing a hash table on the *average* load while the *maximum* is what overflows is a real and common mistake. And all three answers assume uniform, independent hashing. Real keys are not random: they share prefixes and arrive in bursts. Compute the model, then measure the skew, and report both.`, {
      terms: [
        ['Collision probability', 'P(some two keys share a bucket) = 1 − m(m−1)…(m−n+1)/mⁿ.'],
        ['Maximum load', 'The count in the fullest bucket. A different random variable, needing its own analysis.'],
        ['Skew', 'Real keys are not uniform. The model is a starting point to be checked against measurement.'],
        ['Expected empty buckets', 'm(1 − 1/m)ⁿ: the complement, sometimes the quantity you actually want.'],
      ]
    }),
    q.num('M', '3 keys are hashed independently and uniformly into 4 buckets. What is the expected number of buckets that hold at least one key? (Give the decimal value.)', 37 / 16, 'Each bucket is empty with probability (3/4)³ = 27/64, so occupied with probability 37/64. By linearity, add that over the 4 buckets: 4 × 37/64 = 37/16 = 2.3125.', { tol: 0.002, display: '37/16 = 2.3125' }),
    q.num('M', '3 keys are hashed independently and uniformly into 4 buckets. What is the probability that at least two of them land in the same bucket?', 5 / 8, 'Count the ways they all land differently: 4 × 3 × 2 = 24 out of 4³ = 64 equally likely outcomes. So P(all different) = 24/64 = 3/8 and P(collision) = 5/8. This is a different question from the expected number of occupied buckets, and it has a different answer.', { display: '5/8' }),
    q.num('M', '2 keys are hashed independently and uniformly into 2 buckets. What is the expected number of occupied buckets?', 1.5, 'Each bucket is empty with probability (1/2)² = 1/4, so occupied with probability 3/4, and 2 × 3/4 = 1.5. Check by enumeration: the four equally likely outcomes give 1, 2, 2, 1 occupied buckets, averaging 1.5.'),
    q.mc('M', 'Adding up the per-bucket occupancy probabilities gives the expected number of occupied buckets. Why is that valid even though the buckets are clearly not independent?', ['Linearity of expectation holds for any random variables, dependent or not; independence is only needed for products and for variances of sums', 'The buckets are independent when the keys are uniform', 'It is only an approximation that happens to be very close', 'Because n is small compared with m'], 0, 'E[X + Y] = E[X] + E[Y] comes straight from the definition of expectation and never uses independence. The indicators here are genuinely dependent — three empty buckets force the fourth to be occupied — and the sum of the means is still exactly right.'),
    q.num('M', '5 keys are hashed independently and uniformly into 10 buckets. What is the expected number of buckets that remain empty? Give the answer to 3 decimal places.', 5.905, 'A fixed bucket is empty with probability (9/10)⁵ = 0.59049, and by linearity the expected number of empty buckets is 10 × 0.59049 = 5.9049. The expected number of occupied buckets is the complement, 10 − 5.905 = 4.095.', { tol: 0.01 }),
    q.num('M', 'Interview: n keys are hashed uniformly into m buckets with n = m, and both are very large. What fraction of the buckets is occupied, to 3 decimal places?', 0.632, 'E[occupied]/m = 1 − (1 − 1/m)ⁿ, and with n = m the term (1 − 1/m)^m tends to 1/e ≈ 0.3679. So the occupied fraction tends to 1 − 1/e ≈ 0.632. Loading a hash table with as many keys as buckets leaves roughly 37 % of them empty, which is a useful number to carry in your head.', { tol: 0.004 }),
    q.num('M', 'Interview: 3 keys are hashed independently and uniformly into 4 buckets. What is the expected number of keys that end up alone in their bucket? Give the decimal value.', 1.6875, 'Use one indicator per key rather than per bucket: key i is alone if each of the other 2 keys misses its bucket, with probability (3/4)² = 9/16. By linearity, 3 × 9/16 = 27/16 = 1.6875. Choosing what to index the indicators by — keys here, buckets before — is the whole art.', { tol: 0.002, display: '27/16 = 1.6875' }),
    q.mc('M', 'Interview: a colleague sizes a hardware hash table so that each bucket holds the expected number of keys, and it overflows in production. What did they get wrong?', ['They sized on the average load when what overflows a bucket is the maximum load, which is a different and much larger random variable', 'They used the wrong hash function', 'The expected value calculation was arithmetically wrong', 'They should have used more keys'], 0, 'Expected occupancy says nothing about the fullest bucket. With n keys in m buckets the mean is n/m but the maximum grows with the number of buckets, and real keys are skewed on top of that. Size on a tail quantile or the measured maximum, and have a defined behaviour for overflow rather than hoping.'),

    // =====================================================================================================
    // DEGREE: vectors, dot and cross products (MATH19611)
    // =====================================================================================================
    q.info('E', 'Vectors: size and direction, written as components', `Some quantities need only a number: mass, temperature, resistance. Others are useless without a direction: a force of 10 N tells you nothing until you say which way it pushes. Those are **vectors**.

Write a vector by its **components** along the axes: **a** = (3, 1) means 3 units along x and 1 along y. Adding two vectors adds their components, which is the same as laying them nose to tail. Multiplying by a number stretches without turning.

Its **magnitude** (length) comes from Pythagoras:

**|a| = √(aₓ² + a_y² + a_z²)**, so |(3, 1)| = √10 ≈ 3.162.

Divide a vector by its own magnitude and you get a **unit vector**: same direction, length exactly 1. (3, 4) has length 5, so its unit vector is (0.6, 0.8). Unit vectors are how you separate "which way" from "how much", which is what you want whenever you resolve a force or define a direction of travel.

Two vectors can be multiplied in two quite different ways, and each answers a different question. The next two cards derive them.`, {
      terms: [
        ['Scalar', 'A quantity with size only: mass, charge, resistance, energy.'],
        ['Vector', 'A quantity with size and direction: force, velocity, electric field.'],
        ['Components', 'The amounts along each axis. (3, 1) is 3 along x and 1 along y.'],
        ['Magnitude |a|', 'The length, √(aₓ² + a_y² + a_z²).'],
        ['Unit vector', 'a / |a|: the direction alone, with length 1.'],
      ],
      widget: W('vectors', { ax: 3, ay: 1, bx: 1, by: 2 })
    }),
    q.info('E', 'The dot product: how much of one lies along the other', `Push a box with a force **F** while it moves along **d**. Only the part of the force pointing along the motion does any work; a sideways push does nothing. So the natural product is "the amount of **a** lying along **b**, times the length of **b**". That is the **dot product**, and it is a plain number, not a vector.

In components it is astonishingly simple:

**a·b = aₓbₓ + a_yb_y + a_zb_z**

And in terms of the angle θ between them:

**a·b = |a||b| cos θ**

Those two are the same thing, and here is why. Apply the cosine rule to the triangle formed by **a**, **b** and **b** − **a**:

|b − a|² = |a|² + |b|² − 2|a||b| cos θ

Now expand the left-hand side in components: |b − a|² = |b|² − 2(a·b) + |a|². Comparing the two lines, the |a|² and |b|² cancel and **a·b = |a||b| cos θ** falls out. No new assumption; it is the cosine rule in disguise.

Three things follow immediately. **a·b = 0** for non-zero vectors means cos θ = 0, so they are **perpendicular** — the cheapest perpendicularity test there is. The **projection** of **a** onto **b** has length (a·b)/|b|. And **work = F·d**, which is why work is a scalar even though force and displacement are not.`, {
      terms: [
        ['Dot (scalar) product', 'a·b = aₓbₓ + a_yb_y + a_zb_z = |a||b| cos θ. The result is a number.'],
        ['Perpendicular test', 'Two non-zero vectors are perpendicular exactly when their dot product is 0.'],
        ['Scalar projection', 'The length of a in the direction of b: (a·b)/|b|.'],
        ['Work', 'W = F·d. Only the component of force along the motion contributes.'],
      ]
    }),
    q.info('E', 'The cross product: an area with a direction', `Now turn a spanner. The same force does more when applied further from the pivot, and nothing at all when it points straight along the arm. The right product here has to grow with the **perpendicular** part, which means a sine rather than a cosine, and it has to remember which way the thing turns. So the result is itself a **vector**.

The **cross product a × b** is defined in three dimensions by:

- **Magnitude** |a||b| sin θ, which is exactly the area of the parallelogram the two vectors span.
- **Direction** perpendicular to both, chosen by the **right-hand rule**: curl the fingers of your right hand from **a** towards **b**, and your thumb points along a × b.

In components:

**a × b = (a_yb_z − a_zb_y, a_zbₓ − aₓb_z, aₓb_y − a_ybₓ)**

For vectors in the xy-plane only the last entry survives, so the 2-D "cross product" is the single number aₓb_y − a_ybₓ, whose sign tells you whether b is anticlockwise from a.

**a × b = 0** for non-zero vectors means sin θ = 0, so they are **parallel** or anti-parallel. That is the mirror image of the dot-product test.

Where it appears: torque **τ** = **r** × **F**, the force on a moving charge **F** = q**v** × **B**, and angular momentum. Note the order matters: **b** × **a** = −(**a** × **b**), because reversing the fingers reverses the thumb.`, {
      terms: [
        ['Cross (vector) product', 'a × b: perpendicular to both, magnitude |a||b| sin θ. Defined in three dimensions.'],
        ['Right-hand rule', 'Curl the right hand\'s fingers from a to b; the thumb gives the direction of a × b.'],
        ['Parallel test', 'Two non-zero vectors are parallel exactly when their cross product is the zero vector.'],
        ['Torque', 'τ = r × F, where r runs from the pivot to the point where the force acts.'],
        ['Anticommutative', 'b × a = −(a × b). Order matters, unlike the dot product.'],
      ]
    }),
    q.num('E', 'Two vectors are a = (3, 1) and b = (1, 2). Calculate a·b.', 5, 'Multiply matching components and add: 3 × 1 + 1 × 2 = 3 + 2 = 5.'),
    q.num('E', 'Two vectors are a = (3, 1) and b = (1, 2). Calculate the angle between them, in degrees.', 45, '|a| = √10, |b| = √5, and a·b = 5. So cos θ = 5/(√10 × √5) = 5/√50 = 0.7071, giving θ = 45°.', { unit: '°', tol: 0.5 }),
    q.num('E', 'Two vectors are a = (3, 1, 0) and b = (1, 2, 0). Calculate the z-component of a × b.', 5, 'The z-component is aₓb_y − a_ybₓ = 3 × 2 − 1 × 1 = 5. The x and y components are both zero because both vectors lie in the xy-plane, so their cross product must point along z.'),
    q.num('E', 'Two vectors are a = (1, 2, 3) and b = (4, 5, 6). Calculate the x-component of a × b.', -3, 'The x-component is a_yb_z − a_zb_y = 2 × 6 − 3 × 5 = 12 − 15 = −3. The full result is (−3, 6, −3), and you can check it is perpendicular to both: (−3, 6, −3)·(1, 2, 3) = −3 + 12 − 9 = 0 ✓.'),
    q.mc('E', 'Two non-zero vectors have a·b = 0. What does that tell you about them?', ['They are perpendicular, because a·b = |a||b| cos θ and neither length is zero, so cos θ must be 0', 'They are parallel', 'They are equal', 'They point in opposite directions'], 0, 'A zero dot product with non-zero lengths forces cos θ = 0 and θ = 90°. This is the standard perpendicularity test, and it needs no angles or square roots: just multiply components and add.', { grid: true }),
    q.mc('E', 'Two non-zero vectors have a × b equal to the zero vector. What does that tell you about them?', ['They are parallel or anti-parallel, because |a × b| = |a||b| sin θ and neither length is zero, so sin θ must be 0', 'They are perpendicular', 'They are both unit vectors', 'One of them must be zero after all'], 0, 'sin θ = 0 gives θ = 0° or 180°. It is the mirror image of the dot-product test: the dot product vanishes for perpendicular vectors, the cross product for parallel ones. The picture is the parallelogram they span, whose area collapses to nothing when they lie along the same line.'),
    q.num('E', 'A force F = (4, 3) N acts on a body that moves through a displacement d = (2, −1) m. Calculate the work done, in joules.', 5, 'Work is the dot product: F·d = 4 × 2 + 3 × (−1) = 8 − 3 = 5 J. Only the part of the force along the motion contributes, which is exactly what the dot product extracts. A force perpendicular to the motion does no work at all.', { unit: 'J' }),
    q.num('E', 'A force of 20 N is applied to a spanner at a point 0.5 m from the pivot, at an angle of 30° to the arm. Calculate the magnitude of the torque, in newton metres.', 5, 'Torque magnitude is |r||F| sin θ = 0.5 × 20 × sin 30° = 0.5 × 20 × 0.5 = 5 N·m. The sine picks out the component of the force perpendicular to the arm; a force pulled straight along the arm (θ = 0) produces no turning at all.', { unit: 'N·m' }),
    q.num('E', 'Two vectors are a = (3, 1) and b = (1, 2). Calculate the length of the projection of a onto b, to 3 decimal places.', 2.236, 'The scalar projection is (a·b)/|b| = 5/√5 = √5 ≈ 2.236. Dividing by |b| rather than |a| is the point: you want the length of the shadow a casts on the direction of b, so only b\'s direction matters, not its length.', { tol: 0.003 }),
    q.num('E', 'The vector a = (3, 4) is to be turned into a unit vector. What is its x-component, to 1 decimal place?', 0.6, '|a| = √(9 + 16) = 5, so the unit vector is (3/5, 4/5) = (0.6, 0.8). Check its length: 0.36 + 0.64 = 1 ✓.', { tol: 0.02 }),
    q.num('E', 'For what value of λ are the vectors (2, λ) and (3, −1) perpendicular?', 6, 'Perpendicular means the dot product is zero: 2 × 3 + λ × (−1) = 6 − λ = 0, so λ = 6. Check: (2, 6)·(3, −1) = 6 − 6 = 0 ✓.'),
    q.num('E', 'Exam-style: two vectors are a = (1, 2, 2) and b = (3, 0, 4). Calculate the angle between them, in degrees to 1 decimal place.', 42.8, 'a·b = 1×3 + 2×0 + 2×4 = 11. |a| = √(1 + 4 + 4) = 3 and |b| = √(9 + 0 + 16) = 5. So cos θ = 11/15 = 0.7333 and θ = 42.8°.', { unit: '°', tol: 0.2 }),
    q.num('E', 'Exam-style: two vectors are a = (1, 2, 2) and b = (3, 0, 4). Calculate the magnitude of a × b, to 3 decimal places.', 10.198, 'a × b = (2×4 − 2×0, 2×3 − 1×4, 1×0 − 2×3) = (8, 2, −6), whose magnitude is √(64 + 4 + 36) = √104 = 10.198. Cross-check with |a||b| sin θ: 3 × 5 × sin 42.83° = 15 × 0.6799 = 10.198 ✓.', { tol: 0.02 }),
    q.num('E', 'Exam-style: a force F = (2, −1, 3) N acts at a point whose position vector relative to the pivot is r = (1, 2, 0) m. Calculate the z-component of the torque r × F, in newton metres.', -5, 'The z-component of r × F is rₓF_y − r_yFₓ = 1 × (−1) − 2 × 2 = −1 − 4 = −5 N·m. The full torque is (2×3 − 0×(−1), 0×2 − 1×3, −5) = (6, −3, −5) N·m, and its magnitude is √70 ≈ 8.367 N·m.', { unit: 'N·m', tol: 0.05 }),
    q.num('E', 'Exam-style: a constant force of magnitude 50 N acts on a body at a constant angle of 60° to its direction of travel, and the body moves 4 m in a straight line. Calculate the work done, in joules.', 100, 'W = F·d = |F||d| cos θ = 50 × 4 × cos 60° = 200 × 0.5 = 100 J. Only the component of the force along the motion, 50 cos 60° = 25 N, does any work; the perpendicular 43.3 N does none.', { unit: 'J', tol: 0.5 }),
    q.num('E', 'Exam-style: three forces (2, 3) N, (−1, 4) N and (5, −2) N act at the same point. Calculate the magnitude of the resultant force, in newtons to 2 decimal places.', 7.81, 'Add components: x gives 2 − 1 + 5 = 6 and y gives 3 + 4 − 2 = 5, so the resultant is (6, 5) N. Its magnitude is √(36 + 25) = √61 = 7.81 N, at an angle of arctan(5/6) = 39.8° above the x-axis. Adding magnitudes instead of components would give a meaningless 3.61 + 4.12 + 5.39.', { unit: 'N', tol: 0.02 }),
    q.num('E', 'Exam-style: a triangle has vertices A = (0, 0, 0), B = (1, 2, 2) and C = (3, 0, 4). Calculate its area, to 3 decimal places.', 5.099, 'The vectors along two sides are AB = (1, 2, 2) and AC = (3, 0, 4). Their cross product is (2×4 − 2×0, 2×3 − 1×4, 1×0 − 2×3) = (8, 2, −6) with magnitude √104 = 10.198, which is the area of the parallelogram they span. A triangle is half of that: 5.099. Using the cross product is why no angle or perpendicular height is needed.', { tol: 0.02 }),
    q.mc('E', 'Why is b × a equal to −(a × b), when b·a is simply equal to a·b?', ['The cross product\'s direction comes from the right-hand rule, and curling your fingers from b to a instead of a to b reverses the thumb; the dot product has no direction to reverse', 'Because the cross product is only defined in three dimensions', 'Because sin θ is negative for reversed vectors', 'It is a convention with no reason behind it'], 0, 'The magnitude |a||b| sin θ is the same either way, since the parallelogram is the same parallelogram. What flips is the side of the plane the result points to, which the right-hand rule fixes. The dot product returns a plain number with no direction, so swapping the order changes nothing.'),
    ...genius(q, 29),
  ]
};
