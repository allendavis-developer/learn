import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(23);

export default {
  title: 'Latency vs throughput, bounds & duplicates, sample variance, AC power',
  emoji: '⏱️',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook H03. **Hardware**: why cutting logic into stages buys rate but not delay, what a stage register actually costs, why six-cycle latency and one item per cycle are not in conflict, what a stall does to each of the two numbers, and the fill/drain cost of a deep pipe on a short burst (with a cycle-level trace you write). **Code** (A02): binary search seen as "the first index where a yes/no test turns true", lower vs upper bound, counting duplicates, the half-open invariant that makes the loop terminate. **Maths** (M07 L1): mean, median, spread, why the squared deviation, and a full derivation of the n − 1 in the sample variance, checked by enumerating every sample of a tiny population. **Degree** (EEEN11101 / E10): instantaneous AC power derived from v(t)·i(t), where the three power words come from, why a poor power factor costs current and cable loss, and how to size the correction capacitor.',
  takeaway: 'Latency = time from a named input event to a named output event; throughput = accepted items per unit time. Stages raise throughput and usually make latency worse (register overhead is paid once per stage). A stalled cycle is lost throughput for ever; latency inside a stalled pipe stretches. lower_bound = first index with value ≥ x, upper_bound = first with value > x, and their gap counts x. Sample variance divides by n − 1 because the deviations were taken from the sample mean: E[Σ(x − x̄)²] = (n − 1)σ². AC: p(t) = P(1 − cos 2ωt) − Q sin 2ωt, so P = V·I·cos φ does the work and Q = V·I·sin φ only sloshes. Correcting to unity needs C = Q/(ω·V²).',
  steps: [
    // =====================================================================================================
    // HARDWARE (H03): pipelines — the two numbers, and what a stall does to each
    // =====================================================================================================
    q.info('H', 'Why cut a block of logic into stages', `Suppose one lump of combinational logic needs 20 ns to settle. Put a register in front of it and one behind it, and the clock period cannot be shorter than that 20 ns: the answer must be finished before the next edge captures it. So this design runs at 50 MHz and finishes one item every 20 ns.

Now cut the lump in half and put a register in the middle. Each half settles in 10 ns, so the clock can run at 100 MHz. An item now needs **two** clock edges to get through, so it still takes about 20 ns end to end — but while item 1 is in the second half, item 2 is already in the first half. Items come out **twice as often**.

That is the whole trick, and it is a trade, not a free win. You bought **rate** by allowing more items to be inside the machine at once. Each item's own journey did not get shorter; in a moment you will see it usually gets slightly longer.`, {
      terms: [
        ['Combinational logic', 'Gates with no memory: the output follows the input after a settling delay.'],
        ['Pipeline', 'A chain of logic blocks separated by registers, so several items are being worked on at once.'],
        ['Stage', 'One block of logic between two register boundaries. One item per stage at a time.'],
        ['Clock period', 'Time between clock edges. It must be at least the slowest stage delay plus the register overhead.'],
        ['In flight', 'Items that have entered but not yet left. At most one per stage.'],
      ],
      widget: W('pipeline', { stages: 4 })
    }),
    q.info('H', 'The two numbers, and why both need their events named', `A pipeline gives you two separate performance numbers, and they answer different questions.

**Latency** is the time from a **named** input event to a **named** output event: "from the cycle the last byte of the message was accepted, to the cycle the quote update was committed". A 6-stage pipeline with no stalls has 6-cycle latency, which at 125 MHz (8 ns per cycle) is 48 ns.

**Throughput** is items accepted (or delivered) per unit time. The same 6-stage pipeline accepts one item **every** cycle, because all six stages work at once on six different items. 6-cycle latency and 1 item/cycle are not a contradiction; they are answers to different questions.

The events matter more than the number. "48 ns" alone hides whether you measured from the first bit on the wire or from the accepted last byte, and whether anything stalled. A bare number is a claim, not a measurement. Move the stall in the picture below: every row is one item, and the row length is that item's latency.`, {
      terms: [
        ['Latency', 'Delay from a specified input event to a specified output event. Quote both events.'],
        ['Throughput', 'Items accepted or delivered per cycle or per second.'],
        ['Cycle time', '1/clock frequency. 125 MHz → 8 ns per cycle.'],
        ['Latency contract', 'A written statement of the two events, the clock, and the stall assumption the number holds under.'],
      ],
      widget: W('pipegantt', { stages: 4, cycles: 14, stallAt: 6, stallLen: 3 })
    }),
    q.goal('H', 'In the pipeline space-time chart, set the sink stall length to **3 cycles or more** and read the right-hand column: the latency of the items that were inside during the stall.', W('pipegantt', { stages: 4, cycles: 14, stallAt: 5, stallLen: 0 }), s => s.stallLen >= 3,
      'The stage count never changed, but rows that overlap the red columns are longer. Wall-clock latency includes waiting; processing latency does not.'),
    q.info('H', 'What a stall costs each of the two numbers', `When the sink stops taking, the last stage cannot empty, so the stage behind it cannot move, and the stop walks backwards up the pipe. Two different things happen to the two numbers.

**Throughput loses the stalled cycles for ever.** A cycle in which nothing was accepted cannot be made up later; the pipe was never going faster than one item per cycle. If the sink takes on 8 cycles out of every 10, throughput is 0.8 items/cycle, which at 125 MHz is 100 million items per second.

**Latency becomes variable.** An item that happened to be inside during a 10-cycle stall takes 6 + 10 = 16 cycles, while an item arriving after the stall takes 6. So with stalls there is no single latency: there is a distribution, and you should quote the median and a tail figure rather than one number.

This is why the honest way to write it is "6 cycles of processing latency, plus waiting", and why measuring processing time separately from queueing time is a habit worth having.`, {
      terms: [
        ['Stall / backpressure', 'The sink refusing items, which propagates back and freezes stages behind it.'],
        ['Bubble', 'An empty stage slot moving through the pipe: throughput that was never used.'],
        ['Processing latency', 'The part of the delay that is real work: stages × cycle time.'],
        ['Queueing (waiting) time', 'The part of the delay spent waiting for someone else. Variable, and not a property of your logic.'],
      ]
    }),
    q.info('H', 'Two costs deep pipelines really have', `**1. Register overhead is paid once per stage.** A register does not capture instantly: after a clock edge its output takes t_cq to appear, and its input must be steady for t_setup before the next edge. So the clock period is (stage logic delay) + t_cq + t_setup, not just the logic. Take 20 ns of logic and 1 ns of overhead: one stage needs 21 ns (47.6 MHz). Split into four 5 ns stages and the period is 6 ns (166.7 MHz) — 3.5× the rate, not 4×. Ten stages of 2 ns give 3 ns (333 MHz): 7× the rate from 10× the cuts. And the latency has gone from 21 ns to 4 × 6 = 24 ns and then to 30 ns. **Deeper pipes make each item slower.**

**2. Fill and drain.** A pipe only runs at full rate once every stage is busy. Pushing N items through S stages with no stalls takes **S + N − 1** cycles: S − 1 cycles to fill before the first item emerges, then one per item. For 100 items through 6 stages that is 105 cycles, so 95% efficiency. For 3 items it is 8 cycles: 37% efficiency. Deep pipelines are for long streams, not short bursts.`, {
      terms: [
        ['t_cq (clock-to-Q)', 'Delay from the clock edge to the register output being valid.'],
        ['t_setup', 'How long the register input must already be steady before the edge.'],
        ['Register overhead', 't_cq + t_setup: the fixed price of every extra stage boundary.'],
        ['Fill / drain', 'The S − 1 cycles at the start before the first item leaves, and the tail at the end.'],
        ['Pipeline efficiency', 'N / (S + N − 1): what fraction of the peak rate a burst of N items achieves.'],
      ]
    }),
    q.tf('H', 'A pipeline can have six-cycle latency and still accept one new item every cycle.', true, 'Six items are in flight at once, one per stage. Latency and throughput are independent measurements.'),
    q.num('H', 'A 6-stage pipeline runs at 125 MHz and never stalls. Latency in ns, from entering stage 1 to leaving stage 6?', 48, 'One cycle is 1/125 MHz = 8 ns. Six stages × 8 ns = 48 ns.', { unit: 'ns' }),
    q.mc('H', 'A 6-stage pipeline is running when its sink stops accepting for 10 cycles while the source keeps offering items. What happens to the wall-clock latency of the items already inside?', ['It grows: those items wait inside the pipe, even though the number of processing stages is unchanged', 'It stays exactly 6 cycles, because the stage count is fixed', 'It shrinks, because the pipe is fuller', 'It becomes zero until the sink returns'], 0, 'Stalling adds waiting time to items that are inside. Processing latency (6 stages) is fixed; elapsed latency is not.'),
    q.mc('H', 'Which of these is a complete latency statement for a hardware block?', ['48 ns from the accepted last byte of the message to the committed quote update, at 125 MHz, with no stalls', '48 ns', 'six cycles', 'about 50 nanoseconds, measured on the bench'], 0, 'Name the input event, the output event, the clock and the stall assumption. A bare number cannot be checked or reproduced.'),
    q.num('H', 'A stage accepts one item per cycle at 125 MHz, but its sink is ready on only 8 cycles out of every 10. Throughput in **million items per second**?', 100, '0.8 items per cycle × 125 million cycles/s = 100 million items/s. The 2 idle cycles in every 10 are never recovered.'),
    q.num('H', 'A block of combinational logic settles in 20 ns. Its registers add t_cq + t_setup = 1 ns. Minimum clock period in ns for a single-stage design?', 21, 'Period ≥ logic + t_cq + t_setup = 20 + 1 = 21 ns, so 47.6 MHz.', { unit: 'ns' }),
    q.num('H', 'A 20 ns block of combinational logic is split into **four** equal 5 ns stages; each stage register costs t_cq + t_setup = 1 ns. Minimum clock period in ns?', 6, 'Each stage needs 5 + 1 = 6 ns, so the period is 6 ns (166.7 MHz). Rate improves 21/6 = 3.5×, not 4×, because the 1 ns overhead is now paid four times.', { unit: 'ns' }),
    q.num('H', 'A 20 ns block of logic split into four 5 ns stages, each stage register costing 1 ns of t_cq + t_setup, runs at a 6 ns clock period. Total latency through the four stages, in ns?', 24, '4 stages × 6 ns = 24 ns. The unsplit version took 21 ns: pipelining made each individual item **slower** while making items come out 3.5× more often.', { unit: 'ns' }),
    q.num('H', 'How many clock cycles does it take to push **100** items through a **6**-stage pipeline that never stalls, counting from the cycle the first item enters to the cycle the last item leaves?', 105, 'S + N − 1 = 6 + 100 − 1 = 105. Five cycles to fill, then one item out per cycle. Efficiency 100/105 = 95%.'),
    q.mc('H', 'A design team splits a 4-stage pipeline into 12 stages, keeping the clock as fast as the slowest stage allows. Which statement is right?', ['Peak throughput rises (shorter clock period) while each item\'s own latency gets a little worse, because register overhead is paid 12 times instead of 4', 'Both latency and throughput improve by 3×', 'Latency improves and throughput stays the same', 'Nothing changes, since the same logic is being done'], 0, 'Stages buy rate. Latency = stages × (stage delay + overhead), and the overhead term multiplies with the stage count.'),
    q.code('H', 'Write `solve(stages, sink_ready)`, a cycle-level model of a pipeline with backpressure. There are `stages` register slots in a row. The source offers a new item every cycle (items are numbered 1, 2, 3 … in entry order). `sink_ready[t]` is 1 if the sink accepts from the last stage in cycle t. Each cycle: an item in slot s moves to slot s+1 if that slot is empty or is itself moving out this cycle; the last slot delivers when `sink_ready[t]` is 1; a new item enters slot 0 if slot 0 is empty or moving. Return the list of **latencies** (delivery cycle − entry cycle) of the delivered items, in delivery order, over `len(sink_ready)` cycles.', {
      fn: 'solve',
      starter: 'def solve(stages, sink_ready):\n    slots = [None] * stages          # each slot: None or [item_id, entry_cycle]\n    next_id = 1\n    latencies = []\n    for t in range(len(sink_ready)):\n        # 1) work out which slots can move, scanning from the sink backwards\n        # 2) deliver from the last slot if sink_ready[t]\n        # 3) shift the movers, then admit a new item into slot 0 if it is free\n        pass\n    return latencies\n',
      tests: [
        { args: [3, [1, 1, 1, 1, 1, 1]], expect: [3, 3, 3], name: '3 stages, no stalls: everyone takes 3 cycles' },
        { args: [1, [1, 1, 1]], expect: [1, 1], name: '1 stage: enters at t=0, leaves at t=1' },
        { args: [2, [1, 1, 0, 0, 1, 1, 1]], expect: [4, 4, 2], name: 'a 2-cycle stall stretches the items caught inside' },
        { args: [2, [0, 0, 0]], expect: [], name: 'sink never ready: nothing is delivered' },
      ],
      gen: 'def gen():\n    for _ in range(8):\n        yield (random.randint(1, 4), [random.randint(0, 1) for _ in range(random.randint(1, 12))])',
      refCode: 'def ref(stages, sink_ready):\n    slots = [None] * stages\n    nid = 1\n    lat = []\n    for t in range(len(sink_ready)):\n        move = [False] * stages\n        nxt_free = sink_ready[t] == 1\n        for s in range(stages - 1, -1, -1):\n            move[s] = slots[s] is None or nxt_free\n            nxt_free = slots[s] is None or move[s]\n        if slots[-1] is not None and sink_ready[t]:\n            lat.append(t - slots[-1][1])\n        new = [None] * stages\n        for s in range(stages):\n            if slots[s] is None: continue\n            if s == stages - 1:\n                if not sink_ready[t]: new[s] = slots[s]\n            elif move[s]: new[s + 1] = slots[s]\n            else: new[s] = slots[s]\n        if new[0] is None and (slots[0] is None or move[0]):\n            new[0] = [nid, t]; nid += 1\n        slots = new\n    return lat',
      solution: 'def solve(stages, sink_ready):\n    slots = [None] * stages\n    next_id = 1\n    latencies = []\n    for t in range(len(sink_ready)):\n        move = [False] * stages\n        next_free = sink_ready[t] == 1\n        for s in range(stages - 1, -1, -1):\n            move[s] = slots[s] is None or next_free\n            next_free = slots[s] is None or move[s]\n        if slots[-1] is not None and sink_ready[t]:\n            latencies.append(t - slots[-1][1])\n        new = [None] * stages\n        for s in range(stages):\n            if slots[s] is None:\n                continue\n            if s == stages - 1:\n                if not sink_ready[t]:\n                    new[s] = slots[s]\n            elif move[s]:\n                new[s + 1] = slots[s]\n            else:\n                new[s] = slots[s]\n        if new[0] is None and (slots[0] is None or move[0]):\n            new[0] = [next_id, t]\n            next_id += 1\n        slots = new\n    return latencies'
    }, 'The one subtle line is "can slot s move?". Scan from the sink backwards: the last slot can move if the sink is ready; any other slot can move if the slot ahead is empty or is itself moving. That backwards scan is exactly the direction a combinational ready chain propagates in real hardware, which is why long chains of it become the critical path.', { timeoutMs: 12000 }),
    q.mc('H', 'Interview: you are told "our matching core has 48 ns latency". Name the first thing you should ask.', ['Between which two events, at what clock rate, and with what stall assumption', 'Which vendor made the FPGA', 'How many LUTs it uses', 'Whether it is written in Verilog or VHDL'], 0, 'A latency number without its boundary is unfalsifiable. Wire-in to wire-out includes serialisation, MAC/PHY handling and buffering, and is never just stages × cycle time.'),
    q.num('H', 'Interview: a 4-stage pipeline at 200 MHz processes a burst of 3 items and then sits idle. How many clock cycles pass from the first item entering to the last item leaving?', 6, 'S + N − 1 = 4 + 3 − 1 = 6 cycles (30 ns). Efficiency is 3/6 = 50%: a deep pipe is wasted on a short burst.'),
    q.mc('H', 'Interview: a candidate proposes doubling a pipeline\'s stage count to hit a timing target, and claims "latency is unchanged because it is still the same logic". What is the flaw?', ['Each new stage boundary adds t_cq + t_setup, and latency is stages × period, so the total delay grows even though the logic did not', 'Nothing: latency really is unchanged', 'Doubling the stages halves the clock frequency', 'Adding registers removes logic delay entirely'], 0, 'Register overhead is paid per stage. More stages means more overhead in the total path, so item latency rises while item rate rises faster.'),

    // =====================================================================================================
    // ALGORITHMS (A02): the predicate view, lower/upper bound, duplicates
    // =====================================================================================================
    q.info('A', 'Binary search, seen as "where does the answer flip?"', `You know binary search as "look in the middle, throw away half". There is a sharper way to see it that makes every variant fall out.

Take a sorted list and a yes/no test that, once it turns true, stays true. For \`[1, 3, 3, 5]\` and the test "is this value ≥ 3?" the answers are **no, yes, yes, yes**. A test like that flips exactly once, and binary search's real job is to find **the first index where it turns true**.

That is why sortedness matters. It is not the sorting itself that binary search needs; it is that the test's answers form one block of no followed by one block of yes. Discarding a half is only justified because the test cannot flip back. On unsorted data the answers are scattered, half of them is thrown away for no reason, and you get a wrong index with no error message at all.

Once you think this way, "find x", "count x" and "where would x go" are all the same search with a different test.`, {
      terms: [
        ['Predicate', 'A yes/no test applied to an element: "value ≥ x?".'],
        ['Monotone predicate', 'One whose answers are all no, then all yes, along the list. This is what binary search actually requires.'],
        ['Flip point', 'The first index where the predicate says yes. Binary search finds it.'],
        ['Precondition', 'What must be true for an algorithm to be correct. Here: the predicate is monotone, which sortedness gives you.'],
      ]
    }),
    q.info('A', 'lower_bound and upper_bound: one character apart', `Two searches, two tests, and everything else identical.

- **lower_bound(x)**: first index whose value is **≥ x**. In \`[1, 3, 3, 5]\` with x = 3 that is index **1**.
- **upper_bound(x)**: first index whose value is **> x**. Same list, x = 3: index **3**.

Three things fall out for free:

**Counting.** Every copy of x sits between those two indices, so the number of x is \`upper_bound(x) − lower_bound(x)\` = 3 − 1 = **2**.

**Insertion.** Both are valid places to insert a new x and keep the list sorted. Inserting at the *upper* bound puts the newcomer after the equal keys already there, which keeps them in arrival order — a **stable** insertion, and what you want when equal keys carry a timestamp.

**Absence.** If x is not present, the two bounds are equal, so the count is 0, and that common index is where x would go.

In code the difference is a single character: \`arr[mid] < x\` for the lower bound, \`arr[mid] <= x\` for the upper. Python's \`bisect_left\` and \`bisect_right\` are exactly these two.`, {
      terms: [
        ['lower_bound(x)', 'First index with value ≥ x. Also the insertion point before any equal keys.'],
        ['upper_bound(x)', 'First index with value > x. Also the insertion point after any equal keys.'],
        ['Count of x', 'upper_bound(x) − lower_bound(x).'],
        ['Stable insertion', 'Inserting so that earlier equal keys stay before later ones.'],
      ],
      widget: W('bounds', { arr: [1, 3, 3, 3, 5, 8, 8, 9], x: 3 })
    }),
    q.info('A', 'The invariant that stops the off-by-one bugs', `Write the search with a **half-open** range \`[lo, hi)\`: lo is included, hi is not. Start with lo = 0 and hi = n (one past the end, so "not found" has somewhere to live).

Keep this promise true at every step: **the answer is somewhere in [lo, hi)**. Now the body writes itself. Look at \`mid = (lo + hi) // 2\`. If \`arr[mid] < x\`, then mid is not the flip point and neither is anything left of it, so the answer is in \`[mid + 1, hi)\`: set \`lo = mid + 1\`. Otherwise mid might itself be the answer, so you may only shrink to \`[lo, mid)\`: set \`hi = mid\`, **not** mid − 1. Losing mid there is the classic bug.

Why it always ends: mid is at least lo and less than hi, so \`lo = mid + 1\` strictly raises lo and \`hi = mid\` strictly lowers hi. The range shrinks every pass, so the loop cannot spin. When lo == hi the range is empty and, by the promise, lo is the answer.

The empty list works with no special case: lo = hi = 0 immediately, and 0 is the correct insertion point.`, {
      terms: [
        ['Half-open range [lo, hi)', 'lo included, hi excluded. Its size is hi − lo, and hi = n means "past the end".'],
        ['Loop invariant', 'A statement true before and after every pass. Here: the answer lies in [lo, hi).'],
        ['Termination argument', 'A quantity that strictly decreases every pass — here hi − lo — so the loop must stop.'],
        ['Sentinel index n', 'The value returned when x is larger than everything: the position one past the last element.'],
      ]
    }),
    q.num('A', 'In the sorted list `[1, 3, 3, 5]`, what is `lower_bound(3)`, the first index whose value is ≥ 3?', 1, 'Index 0 holds 1, which is < 3. Index 1 holds 3, which is ≥ 3. So the answer is 1.'),
    q.num('A', 'In the sorted list `[1, 3, 3, 5]`, what is `upper_bound(3)`, the first index whose value is > 3?', 3, 'Indices 1 and 2 hold 3, which is not > 3. Index 3 holds 5. So the answer is 3.'),
    q.num('A', 'How many 8s are in the sorted list `[2, 8, 8, 8, 9, 12]`? Use the two bounds.', 3, 'lower_bound(8) = 1, upper_bound(8) = 4, so the count is 4 − 1 = 3.'),
    q.num('A', 'In the sorted list `[2, 4, 6]`, what does `lower_bound(5)` return?', 2, '6 at index 2 is the first value ≥ 5. Since upper_bound(5) is also 2, the count of 5 is 0, and index 2 is where a 5 would be inserted.'),
    q.num('A', 'In the sorted list `[2, 4, 6]`, what does `upper_bound(9)` return, given that the search returns n when every value is smaller than the target?', 3, 'No value is > 9, so the flip point is one past the end: index 3 = n. That is why hi starts at n and not n − 1.'),
    q.num('A', 'What does `lower_bound(7)` return on the **empty** list `[]`?', 0, 'lo = hi = 0 before the loop even runs, so it returns 0: the only place an element could be inserted.'),
    q.mc('A', 'Running a binary search on an array that is **not** sorted does what?', ['It may return a wrong answer with no error at all: the precondition that the test flips only once has been broken', 'It still works, just more slowly', 'It raises an exception', 'It sorts the array first automatically'], 0, 'Silent wrongness is the worst failure mode. Assert the precondition in tests, especially when another function is supposed to have sorted the data.'),
    q.mc('A', 'In a lower_bound search over the half-open range [lo, hi), the branch for `arr[mid] >= x` sets `hi = mid` rather than `hi = mid - 1`. Why?', ['mid itself might be the first index with value ≥ x, and hi is excluded, so [lo, mid) still contains every candidate except mid… which is exactly the one we must not discard', 'Because mid − 1 could be negative', 'To make the loop run one extra time for safety', 'It makes no difference; both work'], 0, 'hi = mid − 1 throws away mid, which may be the answer. With a half-open range, hi = mid keeps mid as a candidate through lo, and the range still strictly shrinks.'),
    q.mc('A', 'A sorted list of trade records has several entries with the same price. A new record with that price arrives and must go **after** the existing equal ones. Which index do you insert at?', ['upper_bound(price)', 'lower_bound(price)', 'the middle of the two bounds', 'the end of the list'], 0, 'Inserting at the upper bound keeps equal keys in arrival order: a stable insertion. Inserting at the lower bound would put the newcomer in front of records that arrived earlier.'),
    q.code('A', 'Write `solve(arr, x)` returning how many times `x` occurs in the **sorted** list `arr`, using two binary searches: `lower_bound` (first index with value ≥ x) and `upper_bound` (first index with value > x). The answer is their difference. It must be O(log n) — the speed test counts a value in a sorted list of 2,000,000 elements, which a linear scan cannot do inside the budget.', {
      fn: 'solve',
      starter: 'def lower_bound(arr, x):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n\ndef upper_bound(arr, x):\n    # the same loop with one character changed: first index with arr[i] > x\n    pass\n\ndef solve(arr, x):\n    return upper_bound(arr, x) - lower_bound(arr, x)\n',
      tests: [
        { args: [[1, 3, 3, 5], 3], expect: 2, name: 'two copies in the middle' },
        { args: [[2, 8, 8, 8, 9, 12], 8], expect: 3 },
        { args: [[1, 2, 4], 3], expect: 0, name: 'absent: the two bounds coincide' },
        { args: [[], 1], expect: 0, name: 'empty list' },
        { args: [[5, 5, 5, 5], 5], expect: 4, name: 'every element equal' },
        { args: [[1, 2, 3], 3], expect: 1, name: 'at the very end: upper_bound returns n' },
      ],
      gen: 'def gen():\n    for _ in range(8):\n        arr = sorted(random.randint(0, 6) for _ in range(random.randint(0, 12)))\n        yield (arr, random.randint(0, 6))',
      refCode: 'def ref(arr, x):\n    return arr.count(x)',
      speed: { gen: 'def gen():\n    arr = sorted(random.randint(0, 1000) for _ in range(2000000))\n    return [arr, 500]', budgetMs: 50, label: 'count in 2,000,000 elements (a linear count takes ~60 ms)' },
      solution: 'def lower_bound(arr, x):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n\ndef upper_bound(arr, x):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] <= x:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n\ndef solve(arr, x):\n    return upper_bound(arr, x) - lower_bound(arr, x)'
    }, 'The only difference between the two searches is `<` versus `<=`. With `<`, an element equal to x fails the test and is kept as a candidate, so you land on the first equal element. With `<=`, an equal element passes and is discarded, so you land just past the last one. Both loops touch about 21 elements out of 2,000,000, which is why the speed test passes with room to spare.'),
    q.mc('A', 'Interview: a candidate writes binary search as `while lo <= hi` with `hi = len(arr) - 1`, and returns −1 when not found. You need the **insertion point** for a missing key instead. What is the cleanest fix?', ['Switch to the half-open form: hi = len(arr), loop while lo < hi, and return lo, which is the insertion point whether or not the key is present', 'Return hi + 1 when the loop exits', 'Search again from the start with a linear scan', 'Return len(arr) - 1 when not found'], 0, 'The half-open form returns something useful in both cases, needs no −1 sentinel, and handles the empty list without a special case.'),
    q.mc('A', 'Interview: you must count how many values in a sorted list of 10 million numbers lie in the half-open range [a, b). How, and at what cost?', ['lower_bound(b) − lower_bound(a), two binary searches, O(log n)', 'Scan the whole list and count, O(n)', 'upper_bound(b) − upper_bound(a), which counts a wrong endpoint', 'Sort the list again, then subtract the indices'], 0, 'lower_bound(a) is the first index ≥ a and lower_bound(b) is the first index ≥ b, so their gap is exactly the count in [a, b). Using upper_bound(b) would wrongly include values equal to b.'),
    q.mc('A', 'Interview: `mid = (lo + hi) // 2` is famously a bug in some languages but not in Python. Why, and what is the standard fix elsewhere?', ['lo + hi can overflow a fixed-width integer in C or Java; the fix is mid = lo + (hi - lo) // 2. Python integers grow without bound, so it cannot overflow there', 'It is a rounding bug; the fix is to round up', 'It is slow; the fix is a bit shift', 'It is not a bug anywhere: the story is a myth'], 0, 'The classic 2006 report on a broken binary search in the Java library. Python\'s ints are arbitrary precision, so the same line is safe, but the habit of writing lo + (hi − lo)//2 costs nothing.'),

    // =====================================================================================================
    // MATHS (M07 L1): describing measurements, and where n − 1 comes from
    // =====================================================================================================
    q.info('M', 'Two ways to say "the typical value"', `You have five latency measurements in microseconds: 10, 11, 10, 12, 900.

The **mean** adds them and divides by how many: 943/5 = **188.6 µs**. Not one of your measurements is anywhere near that. One slow run has dragged the answer, because the mean gives every measurement a vote whose weight is its size.

The **median** sorts them (10, 10, 11, 12, 900) and takes the middle one: **11 µs**. That does describe the typical run. The median only cares about the *order* of values, so a single huge outlier moves it by one position, not by hundreds.

Neither is right or wrong; they answer different questions. The mean is what you want when the total matters: total energy, total cost, total time for a batch, because mean × count = total. The median is what you want when you are describing one typical event. For latency, engineers report both, plus a tail figure like the 99th percentile, because the tail is what a user actually complains about.`, {
      terms: [
        ['Mean (average)', 'Sum ÷ count. Mean × count = total, which is why it is the right summary for totals.'],
        ['Median', 'The middle value once sorted (or the average of the two middle ones). Barely moved by extreme values.'],
        ['Outlier', 'A measurement far from the rest. It may be a real rare event, not an error — do not just delete it.'],
        ['Percentile / quantile', 'The value below which a given fraction of the measurements fall. p99 = only 1 in 100 is worse.'],
      ],
      widget: W('stats', { values: [10, 11, 10, 12], outlier: 12 })
    }),
    q.info('M', 'Spread, and why we square the deviations', `Knowing the centre is not enough: 5, 5, 5 and 1, 5, 9 have the same mean and are completely different. You want a number for how far the values sit from the centre.

The obvious try, the average of (x − mean), is always exactly **zero** — the positives and negatives cancel, because that is what the mean does. So you must kill the signs first. Two ways: take absolute values, or **square** them.

Squaring wins for reasons that are practical rather than deep. It is smooth (differentiable), which makes the algebra work; squared errors of independent things **add**, which absolute values do not; and the mean is exactly the point that minimises the total squared deviation. Squaring does mean big deviations count for much more, which is why variance is sensitive to outliers in exactly the way the mean is.

Squaring also breaks the units: latency in µs gives a variance in µs². So take the square root at the end and report the **standard deviation** in the original units.`, {
      terms: [
        ['Deviation', 'x − mean for one measurement. The raw deviations always sum to zero.'],
        ['Variance', 'The average of the squared deviations. Units are the square of the data units.'],
        ['Standard deviation', 'The square root of the variance, back in the original units.'],
        ['σ² (population variance)', 'The average squared deviation from the *true* mean of the whole population.'],
      ]
    }),
    q.info('M', 'Why the sample variance divides by n − 1', `You almost never know the true mean μ. You have a sample, so you use the sample mean x̄ instead — and x̄ is the number that makes Σ(x − x̄)² as **small as it can possibly be** for this sample. Measuring from any other point, μ included, gives a larger total. So the squared deviations you can compute are systematically a little too small.

Here is the exact size of the shortfall. Split each deviation into two parts: x − μ = (x − x̄) + (x̄ − μ). Squaring and summing, the cross term vanishes and you get

Σ(x − μ)² = Σ(x − x̄)² + n(x̄ − μ)².

Take averages over all possible samples. The left side averages n·σ². The last term averages n × σ²/n = σ², because the sample mean's own variance is σ²/n. Rearranging,

**average of Σ(x − x̄)² = (n − 1)·σ².**

So dividing that sum by n gives σ²·(n − 1)/n: too small every time, and badly so for small n. Dividing by **n − 1** lands on σ² exactly. The usual one-line version — "the mean used up one degree of freedom" — is this calculation in shorthand. Check it below on a population small enough to enumerate every sample.`, {
      terms: [
        ['Sample variance s²', 'Σ(x − x̄)² / (n − 1). The estimator that is right on average.'],
        ['Bias', 'The average error of an estimator over all possible samples. Dividing by n gives a bias of −σ²/n.'],
        ['Degrees of freedom', 'Independent pieces of information left after fitting something to the data. Fitting x̄ costs one, leaving n − 1.'],
        ["Bessel's correction", 'The name for using n − 1 instead of n.'],
      ],
      widget: W('bessel', { pop: 0, n: 2 })
    }),
    q.goal('M', 'In the "why n − 1" explorer, switch the sample size to **n = 3** and check that the ÷(n − 1) column still averages to the true population variance while the ÷n column still falls short.', W('bessel', { pop: 0, n: 2 }), s => s.n === 3, 'The ÷n average is always σ²·(n − 1)/n, so the gap shrinks as n grows but never closes. The ÷(n − 1) average is σ² for every n.'),
    q.info('M', 'Reporting a benchmark honestly', `You time two implementations 100 times each and report the **fastest** run of each. That sounds fair and is not. The minimum of a sample is a biased description of typical behaviour: it is the luckiest run, and it gets luckier the more runs you do, so a program that was measured 1000 times looks better than one measured 10 times for no real reason.

It also quietly describes a machine state you do not have in production: warm caches, a warm branch predictor, the CPU already boosted, nothing else running.

What to do instead: define the workload and the measurement boundary before you start, discard a stated warm-up, **interleave** the two implementations rather than running all of A then all of B (so drift in machine temperature or background load hits both equally), keep every measurement, and report the **median plus a declared tail quantile** with the sample count. Then say what you did. A number without its method cannot be reproduced, and a benchmark nobody can reproduce is an opinion.`, {
      terms: [
        ['Measurement boundary', 'Exactly what is inside the timer: does it include setup, I/O, teardown?'],
        ['Warm-up', 'Early runs discarded because caches and clock speeds have not settled. Say how many you dropped.'],
        ['Paired / interleaved runs', 'Alternating the two things being compared, so slow drift affects both equally.'],
        ['Selection bias', 'Reporting the best of many runs. The more runs, the better the "best" looks, with no change to the program.'],
      ]
    }),
    q.num('M', 'Three measurements are 4, 5 and 6. What is their sample variance (divide by n − 1)?', 1, 'Mean = 5. Deviations −1, 0, +1, squared 1, 0, 1, sum 2. Divide by n − 1 = 2: s² = 1. (The standard deviation is 1.)'),
    q.num('M', 'Four measurements are 2, 4, 6 and 8. What is their sample variance (divide by n − 1)?', 20 / 3, 'Mean = 5. Squared deviations 9, 1, 1, 9, sum 20. Divide by n − 1 = 3: 20/3 ≈ 6.667.', { tol: 0.01, display: '20/3 ≈ 6.667' }),
    q.num('M', 'Five measurements are 7, 7, 7, 7 and 7. What is their sample variance?', 0, 'Every deviation is zero, so the sum of squares is 0 and s² = 0/4 = 0. No spread at all.'),
    q.num('M', 'Latency measurements in µs: 10, 11, 10, 12, 900. What is the **median**?', 11, 'Sorted: 10, 10, 11, 12, 900. The middle of five values is the third: 11 µs. (The mean is 943/5 = 188.6 µs, which describes none of the runs.)', { unit: 'µs' }),
    q.mc('M', 'Why does the sample variance divide by n − 1 rather than n?', ['The deviations are measured from the sample mean, which was itself fitted to the data and makes the sum of squares as small as possible; on average Σ(x − x̄)² = (n − 1)σ², so dividing by n − 1 is right and dividing by n is too small', 'To make the number bigger so estimates are conservative', 'Because the first measurement carries no information', 'It is an arbitrary convention with no reason'], 0, 'It is a bias correction with an exact derivation, not a convention. The size of the error from dividing by n is a factor (n − 1)/n.'),
    q.mc('M', 'A team reports mean latency 188.6 µs from the measurements 10, 11, 10, 12, 900 µs. What should they report instead, and why?', ['Median 11 µs together with a tail figure such as the maximum or p99, because one rare slow event has dragged the mean away from every actual measurement', 'The minimum, 10 µs, since that is what the code can achieve', 'The mean is fine; 188.6 µs is the honest answer', 'Only the maximum, 900 µs, since worst case is all that matters'], 0, 'The mean answers "what is the total?"; the median answers "what is typical?"; the tail answers "how bad does it get?". A latency report needs the second and third.'),
    q.tf('M', 'Adding 100 to every measurement in a data set leaves the sample variance unchanged.', true, 'Every value and the mean shift by the same 100, so every deviation x − x̄ is unchanged, and so is every squared deviation. Variance measures spread, not position.'),
    q.num('M', 'Interview: a population contains only the three values 1, 2 and 3, each equally likely, so its true variance σ² is 2/3. You draw a sample of n = 2 **with replacement** and compute Σ(x − x̄)²/n. Averaged over all 9 equally likely samples, what value does that give? Answer to 3 d.p.', 0.333, 'The nine sums of squares are 0, 0.5, 2, 0.5, 0, 0.5, 2, 0.5, 0, totalling 6. Dividing each by n = 2 and averaging gives 6/(2 × 9) = 1/3 ≈ 0.333 = σ²·(n − 1)/n = (2/3)(1/2). Dividing by n − 1 = 1 instead gives 6/9 = 2/3 = σ² exactly.', { tol: 0.005 }),
    q.num('M', 'Interview: measurements have sample variance 4 (in seconds²). You now report every measurement in **milliseconds** instead. What is the sample variance of the new numbers, in ms²?', 4000000, 'Multiplying every value by k multiplies every deviation by k and every squared deviation by k². Here k = 1000, so the variance scales by 10⁶: 4 × 10⁶ ms². The standard deviation scales by k only: 2 s = 2000 ms.', { unit: 'ms²' }),
    q.mc('M', 'Interview: two sorting routines are timed 100 times each, and each is reported by its fastest run. Give the strongest objection.', ['The minimum is a biased summary that improves simply by running more times, and it describes a fully warmed machine rather than typical behaviour; report the median and a declared tail from interleaved runs', 'Timing is unreliable, so no comparison is ever possible', '100 runs is far too many and wastes time', 'They should have reported the mean of all 200 runs together'], 0, 'The estimator itself is the problem, not the noise. Interleaving the two routines also removes drift that would otherwise favour whichever ran while the machine was cool.'),

    // =====================================================================================================
    // DEGREE (EEEN11101 / E10): AC power from v(t)·i(t)
    // =====================================================================================================
    q.info('E', 'Instantaneous power in an AC circuit', `Power is always v(t) × i(t): the same product as in a DC circuit, evaluated at each instant. What is new in AC is that v and i are sinusoids that need not peak together.

Write them in rms terms, with the current lagging the voltage by an angle φ:

v(t) = √2·V·sin(ωt),  i(t) = √2·I·sin(ωt − φ).

Split the current into the part **in step** with the voltage and the part a quarter cycle away: i(t) = √2·I·cos φ·sin(ωt) − √2·I·sin φ·cos(ωt). Multiply by v(t) and use 2sin²θ = 1 − cos 2θ and 2 sin θ cos θ = sin 2θ:

**p(t) = V·I·cos φ·(1 − cos 2ωt) − V·I·sin φ·sin 2ωt.**

Read the two terms. The first never goes negative and has average **V·I·cos φ**: this is energy that leaves the supply and does not come back. The second is a pure sine at twice the supply frequency with average **zero**: energy that flows out and back, out and back, doing no net work. Notice both terms oscillate at 2ω, not ω — the power in a mains circuit pulses 100 times a second on a 50 Hz supply.`, {
      terms: [
        ['Instantaneous power p(t)', 'v(t)·i(t) at one moment, in watts. It can be negative, meaning energy is flowing back to the source.'],
        ['rms value', 'The steady DC value that would dissipate the same average power. For a sinusoid, peak/√2.'],
        ['Phase angle φ', 'How far the current lags (or leads) the voltage, in degrees or radians.'],
        ['Lagging / leading', 'Current behind the voltage (inductive, φ > 0) or ahead of it (capacitive, φ < 0).'],
      ],
      widget: W('acpower', { phi: 37 })
    }),
    q.goal('E', 'In the instantaneous-power simulation, set the phase angle to **90°** (a pure inductor) and compare the green area (energy in) with the red area (energy back out).', W('acpower', { phi: 0 }), s => s.phi >= 89, 'At 90° the two areas are equal, so the average power is zero. The load takes energy for a quarter cycle and gives every joule back the next quarter, yet the wires carry full current the whole time.'),
    q.info('E', 'Three power words, because there are three different questions', `The two terms in p(t) get names, and a third number ties them together.

- **Real power P = V·I·cos φ**, in **watts (W)**. The average of p(t): what heats, lifts and turns, and what the meter bills you for.
- **Reactive power Q = V·I·sin φ**, in **volt-amperes reactive (var)**. The amplitude of the part that averages to zero: energy shuttling between the supply and the magnetic field of an inductor or the electric field of a capacitor.
- **Apparent power S = V·I**, in **volt-amperes (VA)**. What the cable, fuse and transformer must be built for, because they only see current.

All three are volts × amps, so the different unit names exist purely to say which question is being answered — writing kW where you meant kVA is a real mistake, not a spelling one. Since cos²φ + sin²φ = 1, the three obey **S² = P² + Q²**: the power triangle, with P along the base, Q vertical, S the hypotenuse and φ the angle at the corner.

The **power factor** is cos φ = P/S: the fraction of the current you are paying to move that actually does work. By convention an inductive (lagging) load counts Q as positive and a capacitive (leading) load counts it negative.`, {
      terms: [
        ['Real power P (W)', 'Average power: V·I·cos φ. The part that does work.'],
        ['Reactive power Q (var)', 'V·I·sin φ. Energy that goes out and comes back each quarter cycle; zero net work.'],
        ['Apparent power S (VA)', 'V·I. What the wiring and transformer must carry, regardless of phase.'],
        ['Power factor', 'cos φ = P/S, between 0 and 1. 1 means voltage and current are in step.'],
        ['Power triangle', 'The right triangle with sides P and Q and hypotenuse S, so S² = P² + Q².'],
      ],
      widget: W('powertri', { V: 230, I: 10, pf: 0.8 })
    }),
    q.info('E', 'Why a poor power factor costs real money', `A factory needs P watts. The supply voltage V is fixed, so the current it must draw is

**I = P / (V·cos φ).**

Halve the power factor and you double the current for exactly the same useful work. That current has to travel down a cable with some resistance R, and the cable wastes I²R as heat. Since I goes as 1/cos φ, the wasted power goes as **1/cos²φ**.

Numbers make it concrete. A 10 kW load on 230 V at unity power factor draws 43.5 A. The same 10 kW at a power factor of 0.8 draws 54.3 A — 25% more current for the same work. Through a 0.2 Ω cable that is 378 W of heat instead of 590 W: the loss rose by 56%.

Nothing about the extra current is useful; it is the reactive part sloshing back and forth. The cable, the switchgear and the transformer must all be sized for it, and industrial tariffs charge for it, which is why the fix on the next card is worth doing.`, {
      terms: [
        ['Line loss', 'I²R heat in the cable feeding a load. Depends on current only, not on whether that current does work.'],
        ['Lagging load', 'Motors, transformers, fluorescent ballasts: inductive, current behind voltage, power factor below 1.'],
        ['kVA rating', 'The size of a supply or transformer. Set by current, so a poor power factor uses it up for nothing.'],
        ['Maximum-demand charge', 'A tariff based on kVA rather than kW, which is how utilities charge for reactive current.'],
      ]
    }),
    q.info('E', 'Power-factor correction: sizing the capacitor', `An inductor stores energy in a magnetic field, ½L·i², and it is doing so exactly when the current is large. A capacitor stores energy in an electric field, ½C·v², and being a quarter cycle the other way, it is storing when the inductor is releasing. Put the two side by side across the same supply and they trade energy **with each other**, locally, instead of dragging it up and down the supply cable.

That is all power-factor correction is: a capacitor across the load, chosen so its negative reactive power cancels the load's positive one.

**The sizing.** A capacitor across voltage V draws current I_C = V/X_C = V·ωC, and being pure reactance its reactive power is Q_C = V·I_C = **ω·C·V²**. To cancel a load's reactive power Q, set ωCV² = Q, so

**C = Q / (ω·V²),** with ω = 2πf.

Worked example: a 10 kW load at power factor 0.8 lagging on 230 V, 50 Hz. From cos φ = 0.8, tan φ = 0.75, so Q = P·tan φ = 7.5 kvar. Then C = 7500 / (2π × 50 × 230²) = 7500 / 16 619 000 = **451 µF**.

Correcting all the way to unity is rarely done: capacitors cost money, and over-correcting swings the phase the other way. Aim at 0.95, and size for Q_C = P(tan φ₁ − tan φ₂).`, {
      terms: [
        ['Reactance X', 'The opposition of an inductor or capacitor to AC: X_L = ωL, X_C = 1/(ωC), in ohms.'],
        ['Power-factor correction', 'Adding a capacitor in parallel with an inductive load so the reactive currents cancel locally.'],
        ['Q_C = ωCV²', 'The reactive power a capacitor of value C supplies at voltage V and angular frequency ω.'],
        ['Over-correction', 'Fitting too much capacitance, so the current leads instead of lagging. The power factor is poor again, the other way.'],
      ]
    }),
    q.num('E', 'A single-phase load draws 10 A rms at 230 V rms. What is the apparent power, in kVA?', 2.3, 'S = V·I = 230 × 10 = 2300 VA = 2.3 kVA. This is the number the cable and fuse must be rated for.', { unit: 'kVA' }),
    q.num('E', 'A single-phase load draws 10 A rms at 230 V rms with a power factor of 0.8. What is the real power, in kW?', 1.84, 'P = V·I·cos φ = 2300 × 0.8 = 1840 W = 1.84 kW. That is what does work and what the energy meter records.', { unit: 'kW' }),
    q.num('E', 'A single-phase load draws 10 A rms at 230 V rms with a power factor of 0.8. What is the reactive power, in kvar (2 d.p.)?', 1.38, 'cos φ = 0.8 gives sin φ = 0.6, so Q = V·I·sin φ = 2300 × 0.6 = 1380 var = 1.38 kvar. Check with the triangle: √(2.3² − 1.84²) = 1.38.', { unit: 'kvar', tol: 0.01 }),
    q.mc('E', 'A load has a power factor of 1. What does that tell you?', ['Voltage and current are in step, so all the current does work: the load looks purely resistive', 'No current flows at all', 'The load is purely inductive', 'The reactive power is at its maximum'], 0, 'cos 0° = 1, so P = V·I and Q = 0. Nothing is being stored and returned.'),
    q.num('E', 'A 10 kW load runs from a 230 V rms supply at a power factor of 0.8. What current does it draw, in amperes (1 d.p.)?', 54.3, 'I = P/(V·cos φ) = 10000/(230 × 0.8) = 54.35 A. At unity power factor the same 10 kW would need only 10000/230 = 43.5 A.', { unit: 'A', tol: 0.15 }),
    q.num('E', 'A 10 kW load at power factor 0.8 lagging draws 54.35 A from a 230 V, 50 Hz supply. It is fed through a cable of total resistance 0.2 Ω. What power is wasted heating the cable, in watts (nearest whole)?', 591, 'Cable loss = I²R = 54.35² × 0.2 = 2954 × 0.2 = 590.8 W. At unity power factor the current would be 43.5 A and the loss 378 W: 36% less heat for identical useful work.', { unit: 'W', tol: 4 }),
    q.mc('E', 'Why does a capacitor in parallel with an inductive load improve the power factor?', ['The capacitor stores energy on the quarter-cycle when the inductor is releasing it, so the two exchange energy locally and the supply cable no longer has to carry that current', 'The capacitor blocks some of the load current so the load draws less power', 'It converts reactive power into real power', 'It raises the supply voltage seen by the load'], 0, 'The reactive powers have opposite signs and cancel. The real power delivered to the load is completely unchanged; only the current in the cable falls.'),
    q.num('E', 'Exam-style: a 10 kW single-phase load operates at power factor 0.8 lagging from a 230 V, 50 Hz supply. Calculate the capacitance, in µF, of a parallel capacitor that corrects the power factor to unity. Give the nearest whole number of µF.', 451, 'cos φ = 0.8 → tan φ = 0.75, so Q = P·tan φ = 10 000 × 0.75 = 7500 var. A capacitor supplies Q_C = ωCV², so C = Q/(ωV²) = 7500/(2π × 50 × 230²) = 7500/16 619 043 = 4.513 × 10⁻⁴ F = 451 µF.', { unit: 'µF', tol: 3 }),
    q.num('E', 'Exam-style: a single-phase load takes 12 A rms at 240 V rms, 50 Hz, with a power factor of 0.75 lagging. Calculate the reactive power drawn by the load, in kvar (2 d.p.).', 1.9, 'S = 240 × 12 = 2880 VA. sin φ = √(1 − 0.75²) = √0.4375 = 0.6614. Q = S·sin φ = 2880 × 0.6614 = 1905 var = 1.90 kvar. (P = 2880 × 0.75 = 2.16 kW.)', { unit: 'kvar', tol: 0.03 }),
    q.num('E', 'Exam-style: a single-phase load takes 12 A rms at 240 V rms, 50 Hz, at power factor 0.75 lagging, so it draws 1905 var of reactive power. Calculate the parallel capacitance needed for unity power factor, in µF (1 d.p.).', 105.3, 'C = Q/(ωV²) = 1905/(2π × 50 × 240²) = 1905/(314.16 × 57 600) = 1905/18 095 574 = 1.053 × 10⁻⁴ F = 105.3 µF.', { unit: 'µF', tol: 1.5 }),
    q.mc('E', 'Exam-style: a 5 kW motor at power factor 0.7 lagging is fed from a fixed 400 V supply. State the effect on the **supply cable** of correcting its power factor to 0.95 lagging, with the mechanical output unchanged.', ['The cable current falls from 17.9 A to 13.2 A, so the I²R heating in the cable falls by about 46%, and the same cable now has spare capacity', 'The motor draws 5 kW/0.95 = 5.3 kW, so the cable carries more power', 'Nothing changes in the cable; only the bill changes', 'The cable current rises, because the capacitor draws extra current from the supply'], 0, 'I = P/(V·cos φ): 5000/(400 × 0.7) = 17.86 A becomes 5000/(400 × 0.95) = 13.16 A. Loss scales as I², so the ratio is (0.7/0.95)² = 0.543, a 46% reduction. The capacitor current circulates only between the capacitor and the motor.'),
    q.mc('E', 'Real power is in watts, reactive power in var and apparent power in VA, yet all three are volts multiplied by amps. Why the three different unit names?', ['They mark which question is being answered — energy actually converted, energy merely shuttled back and forth, or current the wiring must carry — and the names stop a 2.3 kVA cable rating being read as 2.3 kW of useful output', 'They are different physical dimensions', 'var and VA are older units that are being phased out', 'Watts are for DC and VA for AC'], 0, 'Dimensionally they are identical. The names are engineering discipline: writing kW where you meant kVA promises work that a reactive load never delivers.'),
    q.num('E', 'Exam-style: an industrial load absorbs 4 kW at a power factor of 0.6 lagging from a 415 V, 50 Hz single-phase supply. Calculate the apparent power, in kVA (2 d.p.).', 6.67, 'S = P/cos φ = 4000/0.6 = 6666.7 VA = 6.67 kVA. The supply must be rated for 6.67 kVA even though only 4 kW is being used.', { unit: 'kVA', tol: 0.03 }),
    q.num('E', 'Exam-style: an industrial load absorbs 4 kW at a power factor of 0.6 lagging from a 415 V, 50 Hz single-phase supply. Calculate the reactive power drawn, in kvar (2 d.p.).', 5.33, 'cos φ = 0.6 gives sin φ = 0.8, so tan φ = 1.3333 and Q = P·tan φ = 4000 × 1.3333 = 5333 var = 5.33 kvar. Check: √(6.667² − 4²) = 5.33.', { unit: 'kvar', tol: 0.03 }),
    q.num('E', 'Exam-style: a 4 kW load at power factor 0.6 lagging is supplied at 415 V, 50 Hz. Calculate the parallel capacitance, in µF (1 d.p.), that raises the power factor to 0.95 lagging.', 74.3, 'Q₁ = P·tan(cos⁻¹0.6) = 4000 × 1.3333 = 5333 var. Q₂ = P·tan(cos⁻¹0.95) = 4000 × 0.3287 = 1315 var. The capacitor must supply the difference, Q_C = 5333 − 1315 = 4019 var. Then C = Q_C/(ωV²) = 4019/(314.16 × 415²) = 4019/54 106 000 = 7.43 × 10⁻⁵ F = 74.3 µF.', { unit: 'µF', tol: 1.2 }),
    ...genius(q, 23),
  ]
};
