import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(26);

export default {
  title: 'Composing stages, sorting & merging intervals, recurrences, mesh analysis',
  emoji: '🧩',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook H03 L4/L5. **Hardware**: what survives when you chain eight elastic stages (nothing lost, nothing reordered, and progress only under a stated assumption), why a combinational ready chain eats the clock period, why registering it costs a second slot in every stage, how much extra buffering a slow stop signal needs, and what a deadlock trace looks like. **Code** (A02): stability and why it is free, the n log n floor, merging closed and half-open intervals, and the sweep that finds peak occupancy. **Maths** (M03 L1/L2): building a recurrence by conditioning on the first symbol, no-adjacent-ones counts as Fibonacci, ordered compositions versus unordered multisets, and the growth rate. **Degree** (E01): mesh analysis from KVL, writing the matrix by inspection, cross-checking against nodal, and the supermesh when a current source sits between two loops.',
  takeaway: 'Composition: accepted-in − accepted-out = occupancy, the output is a prefix of the input, and progress needs a fairness assumption about the sink. A combinational ready chain is one gate per stage of extra delay; registering it makes every stage need two slots. A stop that takes k cycles to reach a source costs k extra slots. Merge intervals: sort by start, extend with max(end, b), never with b. Condition on the first symbol to get a recurrence; no-adjacent-ones gives 1, 2, 3, 5, 8, 13. Mesh: loop currents satisfy KCL for free, so only KVL is left; a current source between meshes becomes a supermesh plus a constraint equation.',
  steps: [
    // =====================================================================================================
    // HARDWARE: composing eight elastic stages (H03 L4/L5)
    // =====================================================================================================
    q.info('H', 'Eight stages in a row: the three things that must stay true', `A single elastic stage is easy to trust. Wire eight of them nose to tail and you have a pipeline that can hold eight items at once, with stalls arriving from the sink and gaps arriving from the source. What can you still promise about the whole chain?

Three properties, and it is worth naming them because each fails in a different way.

**Conservation.** Count every item the chain accepts and every item it hands out. At the end of any cycle, accepted-in − accepted-out must equal the number of items sitting inside. If it does not, an item was dropped or duplicated.

**Ordering.** The items handed out so far must be exactly the first few items accepted, in the same order. A pipeline is allowed to be behind; it is not allowed to reorder or skip.

**Progress.** Every accepted item eventually leaves. This one is different in kind: it cannot be true on its own. If the sink holds its ready signal low forever, nothing can leave, and no design can fix that. So progress is only ever claimed **under an assumption** that the sink eventually accepts. Say the assumption out loud; a claim of "no stalls forever" with no assumption stated is not a claim at all.

Step the chain below and watch the counters.`, {
      terms: [
        ['Composition', 'Connecting blocks that were each verified alone, and asking what is true of the whole.'],
        ['Conservation', 'accepted-in − accepted-out = items currently inside. Breaking it means loss or duplication.'],
        ['Prefix property (ordering)', 'The outputs so far are the first k inputs, in order.'],
        ['Progress (liveness)', '"Something good eventually happens." Only provable under a stated assumption about the environment.'],
        ['Fairness assumption', 'The promise you require from the sink, e.g. "ready is high at least once every 10 cycles".'],
      ],
      widget: W('readychain', { stages: 8, tGate: 0.4, period: 4 })
    }),
    q.info('H', 'Why a combinational ready chain eats the clock period', `Here is the natural way to build the chain. Stage i can accept a new item if it is empty, **or** if the item it holds is leaving this cycle, which happens when the stage downstream is ready:

\`ready_i = empty_i OR ready_(i+1)\`

Read it right to left. The sink's ready feeds stage 7, which feeds stage 6, and so on to the source. In one cycle the signal has to travel through eight OR gates and eight stages of wiring. That whole path has to settle before the clock edge, on top of the flip-flop's own clock-to-output delay and its setup time.

Put numbers on it. Say each stage adds 0.4 ns to the ready path, and clock-to-output plus setup plus routing costs 1.0 ns. A 250 MHz clock gives a 4 ns period, so the chain may use 4 − 1.0 = 3.0 ns, which buys 3.0 / 0.4 = 7.5, so **seven stages**. The eighth breaks timing.

That is the real trade. A combinational ready chain gives you the best possible behaviour (a stall is felt everywhere in the same cycle, so no item is ever accepted that cannot be stored) at the cost of a long path that gets longer with every stage you add.`, {
        terms: [
          ['Combinational path', 'Logic between two flip-flops, with no register in between. Its delay must fit inside one clock period.'],
          ['Ready chain', 'ready_i = empty_i OR ready_(i+1): the sink\'s stall rippling back to the source through pure logic.'],
          ['Clock period', '1 / clock frequency. 250 MHz → 4 ns.'],
          ['Setup time', 'How long data must already be stable before the clock edge for the flip-flop to capture it.'],
          ['Timing closure', 'Every combinational path fitting inside the period, with margin. A long ready chain is a classic reason it fails.'],
        ]
      }),
    q.info('H', 'Registering the ready signal, and the second slot it forces', `The fix for the long path is to put a flip-flop in it: stage i drives a **registered** ready, computed from last cycle's occupancy. Now the path between registers is one gate, and the clock can go as fast as you like.

But you have moved the problem, not removed it. Stage i−1 is now looking at ready information that is one cycle old. It can therefore send an item into stage i during the very cycle that stage i fills up. Stage i must be able to take that item anyway, or it is lost. So **each stage needs a second slot** to catch the item that was already on its way.

That second slot is the skid buffer from Day 25, applied at every hop. Its cost is one extra register's worth of flip-flops and one extra cycle of latency per stage; its benefit is a clock that does not care how long the chain is.

Neither choice is "correct". Short chains and modest clocks: keep the combinational ready and enjoy the single-slot stages. Long chains or a tight clock: register the ready and pay for the second slot. Switch modes in the simulation on the first card and watch the slots appear.`, {
        terms: [
          ['Registered backpressure', 'The ready signal is a flip-flop output, computed from the previous cycle\'s state. Short path, stale information.'],
          ['In flight', 'An item that has been accepted upstream but has not yet reached the stage that will hold it.'],
          ['Skid buffer', 'A second storage slot that catches the item already in flight when a stall arrives late.'],
          ['Latency cost', 'Each registered hop adds one cycle between input and output, even with no stalls.'],
        ]
      }),
    q.info('H', 'How much extra buffering a slow stop needs', `Generalise the previous card. A source sends one word per cycle. Something downstream decides to stop, but the stop signal takes **k cycles** to reach the source. During those k cycles the source is still sending, so up to **k extra words** arrive after the decision was made. They have to go somewhere.

So the buffer must hold: however many words the stall itself produces, **plus k**, **plus anything already stored**. The handbook's example: the receiver can stop consuming for up to 10 cycles, and the stop takes 2 further cycles to reach the source. Starting from empty, that is 10 + 2 = **12 slots**.

Two warnings that separate an engineer from a formula.

First, 12 depends on the edge convention. Draw the accepted push and pop events on a timeline before you commit to a depth; an off-by-one here is a dropped packet in the field.

Second, 12 only survives the assumptions "the buffer was empty when the stall began" and "service resumes before the next burst". Remove them and repeated stalls can outpace the drain, and no fixed depth is safe without a bound on arrivals and a guaranteed service rate.`, {
        terms: [
          ['Stop propagation delay (k)', 'Cycles between "stop" being decided and the source actually stopping.'],
          ['In-flight overshoot', 'The k extra words a one-word-per-cycle source sends during that delay.'],
          ['Buffer depth', 'Slots needed = stall length + k + words already stored, under stated assumptions.'],
          ['Edge convention', 'Exactly which clock edge counts a push or a pop. It changes the answer by one slot.'],
        ]
      }),
    q.info('H', 'Deadlock: two blocks each waiting for the other', `A deadlock is the failure of progress that no amount of waiting fixes. The classic shape: block A decides "I will raise valid once I see ready", and block B decides "I will raise ready once I see valid". Both are waiting for the other to move first, so neither ever does. Nothing is broken, nothing is lost, and the machine sits there forever.

The cure is a **rule about who is allowed to wait**. In the valid/ready contract from Day 22 it is written down explicitly:

- A source **must not** make valid depend on ready. If it has data, it says so.
- A sink **may** make ready depend on valid. Waiting to see an offer before committing is fine.

The asymmetry is what breaks the cycle. Somebody has to be willing to speak first, and the contract elects the source.

This is also why deadlock is a property of the *composition*, not of either block: A alone passes every test, B alone passes every test, and the pair hangs. Composition tests exist precisely to catch that. Try both rules in the simulation below.`, {
        terms: [
          ['Deadlock', 'A cycle of waiting: each party is waiting for another, so none can move. Not a crash; a permanent stall.'],
          ['valid / ready', 'valid: "I have data now". ready: "I can take data now". A transfer happens on an edge where both are 1.'],
          ['Combinational loop', 'Logic whose output feeds back to its own input with no register. The hardware version of the same trap.'],
          ['Composition bug', 'A failure that only appears when two individually correct blocks are connected.'],
        ],
        widget: W('deadlock', {})
      }),
    q.goal('H', 'In the two-block simulation, block A starts with "valid waits for ready" and block B with "ready waits for valid", and nothing ever transfers. Change block A to the legal rule (valid asserted whenever A has data) and step once so a transfer happens.', W('deadlock', {}), s => s.transfers >= 1,
      'Fixing A breaks the cycle: A now speaks first, B sees valid and raises ready, and the transfer happens. Fixing B instead would also work, but the contract puts the duty on the source, because a sink that must commit before seeing an offer would have to buffer unconditionally.'),
    q.num('H', 'Eight elastic stages are chained, each holding at most one item. What is the largest number of items that can be inside the chain at once?', 8, 'One slot per stage, eight stages. That is also the most items that can be "in flight" between the source and the sink, which is what you must be able to store if everything stops at once.'),
    q.mc('H', 'A chain of elastic stages has accepted inputs D0, D1, D2, D3 in that order, and has handed out D0 and D2 so far. Which property has it broken?', ['Ordering: the outputs must be the first k inputs in order, so D0 D1 was the only legal pair', 'Nothing: outputs are allowed to lag behind inputs', 'Conservation only', 'Progress only'], 0, 'Lagging is fine; skipping is not. Outputs so far must be a prefix of the inputs so far. Here D1 was either lost or overtaken, and both are fatal. Conservation might still hold (three in, two out, one inside) which is exactly why you check ordering separately.'),
    q.mc('H', 'A chain of elastic stages has accepted 9 items, handed out 4, and reports 4 items stored inside. Which property has it broken?', ['Conservation: 9 − 4 = 5 items should be inside, not 4, so one was dropped', 'Ordering', 'Progress', 'Nothing is wrong'], 0, 'accepted-in − accepted-out must equal occupancy every cycle. A shortfall of one means an item vanished; a surplus means one was duplicated. This check costs two counters and catches most handshake bugs on the first random test.'),
    q.mc('H', '"Every accepted item eventually leaves the pipeline" can only be proved if you also assume…', ['that the sink eventually asserts ready (a stated fairness assumption)', 'nothing: it follows from the handshake rules alone', 'that the source sends items as fast as possible', 'an upper bound on the clock frequency'], 0, 'If ready is low forever, the statement is simply false, and no design can rescue it. So the proof must carry an assumption such as "ready is high at least once in every N cycles", and the latency bound you claim depends on that N.'),
    q.mc('H', 'In a chain of stages with a combinational ready path, stage i computes `ready_i = empty_i OR ready_(i+1)`. Why is the OR there?', ['A full stage can still accept a new item this cycle if its current item is leaving this cycle, which is exactly when the next stage is ready', 'To make the logic symmetric', 'Because empty stages are never ready', 'To stop two items landing in one slot'], 0, 'Being empty is one reason to accept. Being about to empty is the other, and it is what lets a full pipeline still run at one item per cycle. Drop the OR and the chain can only accept on alternate cycles.'),
    q.num('H', 'A combinational ready chain adds 0.4 ns of delay per stage. Clock-to-output, setup and routing together use 1.0 ns of the period. At a 250 MHz clock, how many stages can be chained before the ready path misses timing?', 7, 'A 250 MHz clock has a 4 ns period. The chain may use 4.0 − 1.0 = 3.0 ns, and 3.0 / 0.4 = 7.5, so seven stages fit and the eighth does not. Either register the ready path or slow the clock.', { unit: 'stages' }),
    q.mc('H', 'You register the ready signal between stages so the ready path is only one gate deep. What must you add, and why?', ['A second storage slot in each stage, because the upstream stage is acting on ready information that is one cycle old and can send an item into a stage that has just filled', 'Nothing: registering a signal is always free', 'A faster clock', 'A second clock domain for the ready path'], 0, 'Registering trades fresh information for a short path. The stale ready means one item may already be on its way when the stall is decided, and the second slot is where it lands. That is the skid buffer, applied at every hop.'),
    q.num('H', 'A source sends one word per cycle. The sink can stop consuming for up to 10 cycles, and the stop signal takes a further 2 cycles to reach the source. The buffer is empty when the stall begins. How many slots must it have?', 12, '10 words pile up during the stall itself, and the source keeps sending for 2 more cycles before it hears the stop, adding 2 more: 10 + 2 = 12. If the buffer already held q words when the stall began, the answer is 12 + q.', { unit: 'slots' }),
    q.mc('H', 'A source raises valid only after it has seen ready, and the sink raises ready only after it has seen valid. What happens?', ['Deadlock: each is waiting for the other, so neither ever asserts and no transfer ever occurs', 'One transfer per cycle, as normal', 'A transfer happens after a two-cycle delay', 'The data is corrupted'], 0, 'A cycle of waiting with no one willing to move first. The contract forbids exactly this by making valid independent of ready: the source must announce data it holds, whatever the sink is doing.'),
    q.tf('H', 'In a valid/ready handshake it is legal for a sink to hold ready low until it sees valid, but illegal for a source to hold valid low until it sees ready.', true, 'The asymmetry is deliberate. If both sides could wait, they could deadlock. Electing the source to speak first breaks the cycle, and it costs the sink nothing: it can still decide, in the same cycle, whether to accept.'),
    q.code('H', 'Build a composition test. Write `solve(stages, source_valid, sink_ready)` that simulates a chain of `stages` one-slot elastic stages with a **combinational** ready chain. `source_valid[t]` and `sink_ready[t]` are 0/1 for cycle t (both lists have the same length). Each cycle, in this order: (1) compute `ready[stages] = sink_ready[t]` and, for i from stages−1 down to 0, `ready[i] = (stage i is empty) or ready[i+1]`; (2) if the last stage holds an item and `ready[stages]`, that item leaves; (3) for i from stages−2 down to 0, if stage i holds an item and `ready[i+1]`, move it to stage i+1; (4) if `source_valid[t]` and `ready[0]`, accept a new item into stage 0. Accepted items are numbered 1, 2, 3, … in acceptance order. Return `[accepted_count, items_that_left_in_order, items_still_inside]`.', {
      fn: 'solve',
      starter: 'def solve(stages, source_valid, sink_ready):\n    occ = [None] * stages      # occ[i] is an item id, or None if stage i is empty\n    accepted = 0\n    out = []\n    nxt = 1\n    for t in range(len(source_valid)):\n        ready = [False] * (stages + 1)\n        ready[stages] = sink_ready[t] == 1\n        for i in range(stages - 1, -1, -1):\n            ready[i] = (occ[i] is None) or ready[i + 1]\n        # 2) the last stage hands an item to the sink\n        # 3) move items forward, from the sink end back\n        # 4) accept a new item into stage 0\n        pass\n    return [accepted, out, sum(1 for x in occ if x is not None)]\n',
      tests: [
        { args: [1, [1, 1, 1], [0, 0, 1]], expect: [2, [1], 1], name: 'one stage, sink stalled for two cycles' },
        { args: [2, [1, 1, 1, 1], [1, 1, 1, 1]], expect: [4, [1, 2], 2], name: 'no stalls: one item accepted every cycle' },
        { args: [2, [1, 1, 1, 1, 1], [0, 0, 0, 0, 0]], expect: [2, [], 2], name: 'sink never ready: the chain fills and then refuses' },
        { args: [3, [], []], expect: [0, [], 0], name: 'no cycles at all' },
        { args: [2, [0, 0, 1, 1], [1, 1, 1, 1]], expect: [2, [], 2], name: 'two stages of latency: nothing has reached the sink yet' },
        { args: [3, [1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1]], expect: [6, [1, 2, 3], 3], name: 'output is a prefix of the input, three behind' },
      ],
      gen: 'def gen():\n    for _ in range(20):\n        n = random.randint(0, 14)\n        yield (random.randint(1, 4), [random.randint(0, 1) for _ in range(n)], [random.randint(0, 1) for _ in range(n)])',
      refCode: 'def ref(stages, source_valid, sink_ready):\n    slots = [0] * stages\n    ids = [0] * stages\n    acc = 0; out = []; nid = 0\n    for t in range(len(source_valid)):\n        rdy = [0] * (stages + 1)\n        rdy[stages] = sink_ready[t]\n        for i in range(stages - 1, -1, -1):\n            rdy[i] = 1 if (slots[i] == 0 or rdy[i + 1]) else 0\n        if slots[stages - 1] and rdy[stages]:\n            out.append(ids[stages - 1]); slots[stages - 1] = 0\n        for i in range(stages - 2, -1, -1):\n            if slots[i] and rdy[i + 1]:\n                slots[i + 1] = 1; ids[i + 1] = ids[i]; slots[i] = 0\n        if source_valid[t] and rdy[0]:\n            nid += 1; acc += 1; slots[0] = 1; ids[0] = nid\n    return [acc, out, sum(slots)]',
      solution: 'def solve(stages, source_valid, sink_ready):\n    occ = [None] * stages\n    accepted = 0\n    out = []\n    nxt = 1\n    for t in range(len(source_valid)):\n        ready = [False] * (stages + 1)\n        ready[stages] = sink_ready[t] == 1\n        for i in range(stages - 1, -1, -1):\n            ready[i] = (occ[i] is None) or ready[i + 1]\n        if occ[stages - 1] is not None and ready[stages]:\n            out.append(occ[stages - 1])\n            occ[stages - 1] = None\n        for i in range(stages - 2, -1, -1):\n            if occ[i] is not None and ready[i + 1]:\n                occ[i + 1] = occ[i]\n                occ[i] = None\n        if source_valid[t] == 1 and ready[0]:\n            occ[0] = nxt\n            nxt += 1\n            accepted += 1\n    return [accepted, out, sum(1 for x in occ if x is not None)]'
    }, 'Two invariants fall straight out of the return value. Conservation: accepted_count − len(out) must equal the number still inside, on every test. Ordering: out must always read 1, 2, 3, … with no gaps, because items only ever move forward one stage at a time. Test 5 shows the latency: with two stages, the first item cannot reach the sink until two cycles after it was accepted, so a short trace ends with an empty output list and nothing wrong. Test 3 shows the capacity: a permanently stalled sink lets exactly `stages` items in and then the ready chain refuses the rest, which is the whole point of backpressure.'),
    q.tokens('H', 'A buffer of capacity 2 starts empty. Cycle by cycle the push/pop pairs are (1,0), (1,0), (0,1), (1,1). Give the occupancy at the end of each of the four cycles, in order. (In a cycle with both, the pop is applied first.)', ['1', '2', '1', '1'], ['0', '3'], 'Occupancy changes by push − pop each cycle: 0+1 = 1, 1+1 = 2, 2−1 = 1, then 1−1+1 = 1. A monitor running beside the design checks this every cycle and reports the exact cycle where it breaks, instead of leaving you with a wrong answer a thousand cycles later.', { mono: true }),
    q.mc('H', 'A buffer holds one item and is therefore full. In the same cycle a push and a pop both arrive. Under the usual contract, what happens?', ['Both succeed: the pop is applied first, which frees the slot the push then uses, so occupancy stays at 1', 'The push is refused because the buffer was full at the start of the cycle', 'The pop is refused because the push would overflow', 'Both are refused'], 0, 'Applying the pop first is what lets a full one-slot buffer still run at one item per cycle. A monitor that checks the push against the start-of-cycle occupancy would report a false overflow here, which is worse than having no monitor, because you will spend a day chasing a bug that does not exist. Write the ordering into the contract and into the monitor.'),
    q.mc('H', 'Interview: you connect two blocks that each passed every test on their own, and the pair hangs after a few thousand cycles. What is the first thing you check?', ['Whether either block makes its valid depend on the other\'s ready, creating a cycle of waiting', 'Whether the clock frequency is too high', 'Whether the reset is asynchronous', 'Whether the data bus is wide enough'], 0, 'A hang with no error is the signature of deadlock, and deadlock is a composition property: neither block can show it alone. Look for a valid that waits on ready, or any two signals that each gate the other combinationally. A timing or reset problem usually shows up as corrupted data, not a clean stop.'),
    q.num('H', 'Interview: a design has six elastic stages with a combinational ready chain. Each stage adds 0.5 ns to that path and the fixed overhead (clock-to-output, setup, routing) is 1.2 ns. What is the highest clock frequency, in MHz, at which the ready path still closes?', 238, 'The path is 6 × 0.5 + 1.2 = 4.2 ns, so the period must be at least 4.2 ns and the frequency at most 1/4.2 ns = 238 MHz. To go faster you register the ready and add a second slot per stage, or you split the chain with one registered hop in the middle.', { unit: 'MHz', tol: 3 }),
    q.mc('H', 'Interview: a reviewer says "our pipeline has a fixed six-cycle latency and never loses data with a four-slot buffer". What is wrong with that claim?', ['Latency is only fixed when nobody stalls, and losslessness with finite buffering needs a stated bound on arrivals and a guaranteed service rate', 'Six cycles is too many for a pipeline', 'Four slots is always too few', 'Nothing is wrong with it'], 0, 'Both halves are unconditional claims about a system with backpressure. Under stalls the elapsed latency varies even though the number of stages does not, and a fixed buffer depth is only safe under a stated worst case: how long the sink can stop, how fast the stop reaches the source, and how much was already stored.'),

    // =====================================================================================================
    // ALGORITHMS: stability, sorting, intervals, sweeps (A02)
    // =====================================================================================================
    q.info('A', 'Stable sorting, and why it is worth paying for', `Sort a list of orders by price. Two orders have the same price. Which comes first?

A **stable** sort answers: whichever came first in the input. An unstable sort makes no promise, and may put them in either order. Python's \`sorted\` and \`list.sort\` are stable, and that is a guarantee you can build on, not an accident of the implementation.

Why it matters. An exchange fills orders by **price first, then arrival time**. If you sort by price with a stable sort and the input was already in arrival order, you get price-time priority for free, with no second key. More generally, stability lets you sort by one key, then by another, and the earlier sort survives inside groups that tie on the later one.

The cost of a comparison sort is **O(n log n)**, and that is a floor, not just what the good algorithms happen to achieve. Here is the argument: there are n! possible orderings of the input, and each comparison answers one yes/no question, so it can at best halve the set of orderings still possible. To get down to one you need at least log₂(n!) comparisons, which grows like n log₂ n.`, {
      terms: [
        ['Stable sort', 'Items that compare equal keep their input order. Python\'s sorted and list.sort are stable.'],
        ['Sort key', 'The value compared, chosen with key=. Example: key=lambda o: (-o.price, o.time).'],
        ['Price-time priority', 'Best price first; among equal prices, the earliest order first. Falls out of a stable sort.'],
        ['Comparison sort', 'A sort that only ever asks "is a before b?". Any such sort needs about n log₂ n comparisons in the worst case.'],
      ]
    }),
    q.info('A', 'Sorting by more than one key without writing a comparator', `You almost never need to write a comparison function. Return a **tuple** from the key and Python compares tuples left to right: it looks at the first entries, and only if they tie does it look at the second.

\`\`\`
orders.sort(key=lambda o: (-o.price, o.time))
\`\`\`

Highest price first (because \`-price\` puts the biggest price at the most negative value, so it sorts earliest), and among equal prices the earliest time first. One line, no comparator.

Two traps worth knowing before you hit them.

**Negation only works for numbers.** There is no \`-name\` for a string. To sort one text key descending and another ascending, sort twice, relying on stability: sort by the ascending key first, then by the descending key.

**\`reverse=True\` is not the same as negating the key.** It reverses the ordering of the comparison, but ties still keep their input order (Python guarantees this). So \`sort(key=price, reverse=True)\` gives highest price first with earliest arrival first among ties, whereas reversing the whole sorted list would put the *latest* arrival first among ties.`, {
      terms: [
        ['Tuple key', 'key=lambda x: (a, b): compare a first, and only use b to break a tie.'],
        ['Descending by negation', 'key=-value for numbers. There is no equivalent for strings.'],
        ['reverse=True', 'Reverses the comparison but preserves stability among equal keys. Not the same as reversing the output list.'],
        ['Two-pass sorting', 'Sort by the minor key, then by the major key. Stability keeps the minor order inside each group.'],
      ]
    }),
    q.info('A', 'Merging intervals: sort by start, then sweep', `Given a pile of intervals like [1, 3], [8, 10], [2, 6], merge every group that overlaps. The whole problem collapses once you **sort by start**.

Walk through the sorted list keeping one "current" interval. For each next interval [a, b]: if \`a\` is at or before the current end, the two touch, so extend the current end. Otherwise there is a gap, so emit the current interval and start a new one at [a, b].

Why sorting by start is the right choice: after sorting, any interval that overlaps the current one must start inside it, so a single comparison against the current end decides the case. Sorting by end instead loses that, because a later-ending interval can start long before the current one.

**The bug everyone writes once.** Extending must be \`end = max(end, b)\`, never \`end = b\`. Given [1, 10] then [2, 3], plain assignment shrinks the merged interval to [1, 3] and quietly loses seven units.

**Closed or half-open?** Decide before you write the comparison. Closed [1, 3] and [3, 5] share the point 3, so they merge into [1, 5]; half-open [1, 3) and [3, 5) share nothing and stay apart. The code differs by one character: \`a <= end\` versus \`a < end\`.`, {
      widget: W('mergeint', {}),
      terms: [
        ['Interval', 'A pair [a, b] with a ≤ b, meaning everything from a to b.'],
        ['Closed / half-open', '[a, b] includes b; [a, b) excludes it. Half-open is usual for time, because [1,3) and [3,5) tile without overlapping.'],
        ['Sweep', 'One pass over sorted data carrying a small running state (here, the current merged interval).'],
        ['Merge condition', 'a <= current_end for closed intervals, a < current_end for half-open.'],
      ]
    }),
    q.info('A', 'The same sort, used to find peak occupancy', `A related question: given start and end times, how many intervals are active at the busiest moment? That is the number of meeting rooms you need, or the peak occupancy of a buffer.

Turn each interval into two **events**: +1 at its start, −1 at its end. Sort all the events by time, sweep through adding them up, and record the largest running total. One sort and one pass.

**Tie ordering is the whole problem.** At a time where one interval ends and another begins, which event goes first?

- **Half-open** intervals [a, b): the ending interval no longer occupies time b, so process the **−1 first**. A room freed at 10:00 can be reused at 10:00.
- **Closed** intervals [a, b]: both occupy the instant b, so process the **+1 first**. Two meetings that touch at 10:00 need two rooms.

Same data, different answers, and neither is wrong. What is wrong is not deciding. Sorting event tuples as \`(time, delta)\` puts −1 before +1 at equal times, because −1 < +1: that is the half-open rule, and it is the default you get by accident. If you want closed intervals, sort by \`(time, -delta)\`.`, {
      terms: [
        ['Sweep events', 'A start becomes (time, +1) and an end becomes (time, −1). Sort by time and add them up.'],
        ['Peak occupancy', 'The largest running total: how many intervals overlap at the busiest instant.'],
        ['Tie ordering', 'Which event wins when two share a time. It decides whether touching intervals overlap.'],
        ['Minimum rooms', 'Exactly the peak occupancy: you need one room per simultaneously active meeting.'],
      ]
    }),
    q.mc('A', 'Three orders arrive in this order: A (price 10, time 1), B (price 10, time 2), C (price 12, time 3). A **stable** sort by price, highest first, produces…', ['C, A, B', 'C, B, A', 'A, B, C', 'B, A, C'], 0, 'C has the best price so it leads. A and B tie on price, and a stable sort leaves tied items in their input order, so A comes before B. That is price-time priority obtained without writing a second key.'),
    q.mc('A', 'What is the worst-case lower bound on the number of comparisons any comparison sort needs for n items, and where does it come from?', ['About n log₂ n, because there are n! possible orderings and each comparison can at best halve the set still possible', 'About n, because every item must be looked at once', 'About n², because every pair may need comparing', 'There is no lower bound'], 0, 'Each yes/no comparison distinguishes at most two groups, so k comparisons distinguish at most 2^k orderings. You need 2^k ≥ n!, i.e. k ≥ log₂(n!) ≈ n log₂ n. Counting sorts beat this only because they do not compare: they use the values as array indices.'),
    q.mc('A', 'A list of employee records must end up sorted by department name ascending, and within each department by salary descending. Salary is a number, department is a string. The cleanest single sort is…', ['key=lambda e: (e.department, -e.salary)', 'key=lambda e: (-e.department, e.salary)', 'key=lambda e: (e.department, e.salary), reverse=True', 'sorted twice with reverse=True both times'], 0, 'A tuple key compares left to right, so department decides first and salary only breaks ties. Negating the number gives descending salary; you cannot negate the string, but you do not need to, because department is the ascending key.'),
    q.tf('A', 'To merge a list of possibly overlapping intervals correctly with a single pass, you must sort them by start time first.', true, 'Without sorting, an interval that overlaps one you have already emitted can turn up later, and a single pass has no way to go back and fix it. After sorting by start, every overlapping interval must begin inside the current one, so one comparison against the current end settles each case.'),
    q.mc('A', 'Merging **closed** intervals, you process [1, 10] and then meet [2, 3]. What must the code do with the current end?', ['Keep 10: the new end is max(current_end, 3)', 'Set the end to 3', 'Emit [1, 10] and start [2, 3]', 'Discard [2, 3] without changing anything'], 0, '[2, 3] sits entirely inside [1, 10], so the merged interval is still [1, 10]. Writing `end = b` instead of `end = max(end, b)` shrinks it to [1, 3] and silently drops seven units of coverage. This is the single most common bug in interval merging.'),
    q.tokens('A', 'Merge these **closed** intervals: [1, 3], [2, 6], [8, 10], [15, 18]. Give the merged list in order.', ['[1,6]', '[8,10]', '[15,18]'], ['[1,3]', '[2,6]', '[1,18]'], 'Sorted by start they already are. [1,3] and [2,6] overlap (2 ≤ 3) so they merge to [1,6]. Then 8 > 6, so emit and start again; 15 > 10, emit and start again. Three intervals out.', { mono: true }),
    q.mc('A', 'Are [1, 3] and [3, 5] merged into one interval?', ['Yes if the intervals are closed (both contain the point 3), no if they are half-open (3 belongs only to the second)', 'Yes, always', 'No, always', 'Only if you sort by end time'], 0, 'The convention decides it, and it is one character of code: `a <= current_end` merges touching closed intervals, `a < current_end` keeps half-open ones apart. Half-open is the usual choice for time ranges, because [1,3) and [3,5) tile the line with no overlap and no gap.'),
    q.num('A', 'Meetings run [0, 30), [5, 10) and [15, 20) as half-open intervals. What is the peak number of simultaneously active meetings?', 2, 'Events sorted: (0,+1) → 1, (5,+1) → 2, (10,−1) → 1, (15,+1) → 2, (20,−1) → 1, (30,−1) → 0. The peak is 2, so two rooms are enough. The long meeting overlaps each short one but the two short ones never overlap each other.'),
    q.num('A', 'Two meetings run [9, 10] and [10, 11] as **closed** intervals, so both occupy the instant 10. What is the peak number of simultaneously active meetings?', 2, 'With closed intervals the +1 at 10 must be processed before the −1 at 10, giving a running total of 2 at that instant. With half-open intervals [9,10) and [10,11) the −1 comes first and the peak is 1. Same data, different convention, different answer.'),
    q.code('A', 'Write `solve(intervals)`: merge overlapping or touching **closed** intervals `[a, b]` and return the merged list, sorted by start. Touching counts as overlapping, so `[1,3]` and `[3,5]` merge into `[1,5]`. The input may be in any order and may be empty. Your solution must be O(n log n): the speed test uses 200,000 intervals.', {
      fn: 'solve',
      starter: 'def solve(intervals):\n    if not intervals:\n        return []\n    xs = sorted(intervals)          # by start, then by end\n    out = [list(xs[0])]\n    for a, b in xs[1:]:\n        # if a is at or before the current end: extend it (careful how!)\n        # otherwise: start a new interval\n        pass\n    return out\n',
      tests: [
        { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expect: [[1, 6], [8, 10], [15, 18]], name: 'the standard case' },
        { args: [[[1, 4], [4, 5]]], expect: [[1, 5]], name: 'touching closed intervals merge' },
        { args: [[]], expect: [], name: 'empty input' },
        { args: [[[5, 7]]], expect: [[5, 7]], name: 'a single interval' },
        { args: [[[5, 7], [1, 3]]], expect: [[1, 3], [5, 7]], name: 'unsorted input, no overlap' },
        { args: [[[1, 10], [2, 3], [4, 5]]], expect: [[1, 10]], name: 'contained intervals must not shrink the end' },
        { args: [[[1, 2], [1, 2], [1, 2]]], expect: [[1, 2]], name: 'exact duplicates collapse to one' },
      ],
      gen: 'def gen():\n    for _ in range(10):\n        n = random.randint(0, 8)\n        yield ([sorted([random.randint(0, 20), random.randint(0, 20)]) for _ in range(n)],)',
      refCode: 'def ref(intervals):\n    xs = sorted(intervals)\n    out = []\n    for a, b in xs:\n        if out and a <= out[-1][1]:\n            out[-1][1] = max(out[-1][1], b)\n        else:\n            out.append([a, b])\n    return out',
      speed: { gen: 'def gen():\n    return [[sorted([random.randint(0, 10**7), random.randint(0, 10**7)]) for _ in range(200000)]]', budgetMs: 2500, label: '200,000 intervals' },
      solution: 'def solve(intervals):\n    if not intervals:\n        return []\n    xs = sorted(intervals)\n    out = [list(xs[0])]\n    for a, b in xs[1:]:\n        if a <= out[-1][1]:\n            out[-1][1] = max(out[-1][1], b)\n        else:\n            out.append([a, b])\n    return out'
    }, 'The sort costs O(n log n) and dominates; the sweep after it is one pass, so the whole thing is O(n log n) with O(n) extra space for the output. Two details carry the test suite: `max(out[-1][1], b)` for the contained-interval case, and `a <= out[-1][1]` (not `<`) for touching closed intervals. Comparing whole lists in `sorted(intervals)` sorts by start and then by end, which is exactly the order the sweep wants.', { timeoutMs: 12000 }),
    q.mc('A', 'Interview: someone proposes merging intervals by sorting on the **end** time instead of the start. Why does the one-pass sweep stop working?', ['After sorting by end, an interval can start long before the current one, so a single comparison against the current end no longer decides whether they overlap', 'Sorting by end is slower', 'Sorting by end is unstable', 'Nothing changes; both work'], 0, 'Sorting by start guarantees that any overlap with the current interval must begin inside it, which is what makes one comparison enough. Sorting by end breaks that guarantee: [5, 6] then [1, 100] is end-sorted, but the second swallows the first from the left, and the sweep has already emitted it. (Sorting by end is the right move for a different problem: choosing the most non-overlapping intervals.)'),
    q.mc('A', 'Interview: your interval merger takes a list of 200,000 intervals that are **already sorted by start**. What is the complexity, and can you do better?', ['Still O(n log n) if you call sorted() unconditionally; drop the sort when the input is known sorted and the sweep alone is O(n)', 'Always O(n²) because of the merging', 'Always O(n) because Python\'s sort is linear on sorted input', 'O(log n), because binary search applies'], 0, 'The sweep is a single pass, so the sort is the only super-linear part. Python\'s Timsort does detect an already-sorted run and finishes in O(n), so in CPython you would get linear behaviour anyway, but the honest answer in an interview is: the algorithm is O(n log n) unless you can rely on the input order, and then it is O(n).'),
    q.num('A', 'Interview: a booking system holds meetings [0, 30), [5, 10), [15, 20) and [25, 35), all half-open. What is the smallest number of rooms that can hold them all?', 2, 'Events: (0,+1)→1, (5,+1)→2, (10,−1)→1, (15,+1)→2, (20,−1)→1, (25,+1)→2, (30,−1)→1, (35,−1)→0. The peak is 2, and the peak is exactly the number of rooms needed, because at any instant every active meeting needs its own room and no more are ever active at once.', { unit: 'rooms' }),

    // =====================================================================================================
    // MATHS: recurrences (M03 L1/L2)
    // =====================================================================================================
    q.info('M', 'Building a recurrence: condition on the first symbol', `Count the binary strings of length n that never have two 1s next to each other. For n = 3 the good ones are 000, 001, 010, 100, 101: five of them.

Listing works until n = 5 and then stops working. The trick that scales: **look at the first symbol and let it decide what can follow.**

- If the string starts with **0**, everything after it is an arbitrary valid string of length n−1. Nothing is forced.
- If the string starts with **1**, the next symbol is forced to be 0, and after that "10" the rest is an arbitrary valid string of length n−2.

Those two cases cannot both happen and together they cover everything, so the counts simply add:

**a(n) = a(n−1) + a(n−2)**

Now the base cases, which is where people slip. a(1) = 2 (the strings "0" and "1"). a(0) = 1, because there is exactly one string of length 0: the empty one. That is not a convention pulled from nowhere; it is what makes a(2) = a(1) + a(0) = 3 come out right, and 00, 01, 10 really are three.

The sequence is 1, 2, 3, 5, 8, 13, 21, … the Fibonacci numbers, shifted.`, {
      widget: W('recur', {}),
      terms: [
        ['Recurrence', 'A rule that gives a(n) from earlier values, plus enough starting values to get going.'],
        ['Initial conditions', 'The base values. Here a(0) = 1 and a(1) = 2; get these wrong and every later term is wrong.'],
        ['Case split', 'Divide the objects into groups that do not overlap and cover everything, then add the group counts.'],
        ['Forced symbol', 'A choice that removes freedom later: a leading 1 forces the next symbol to be 0.'],
      ]
    }),
    q.info('M', 'The same move, wearing different clothes', `Once you see "condition on the first (or last) step", the same recurrence turns up everywhere.

**Climbing stairs.** You take 1 or 2 steps at a time. Ways to climb n stairs: the first move is either a 1 (leaving n−1) or a 2 (leaving n−2), so w(n) = w(n−1) + w(n−2), with w(0) = 1 and w(1) = 1. That gives 1, 1, 2, 3, 5, 8: the same numbers with a different start.

**Tiling.** A 2×n strip covered by 1×2 dominoes: the right-hand end is either one vertical domino (leaving 2×(n−1)) or two stacked horizontal ones (leaving 2×(n−2)). Same recurrence again.

**How fast do they grow?** Divide the recurrence by a(n−1) and suppose the ratio settles to some r: r = 1 + 1/r, so r² = r + 1, so r = (1 + √5)/2 ≈ **1.618**, the golden ratio. Check it: 21/13 = 1.615, 34/21 = 1.619. The counts grow exponentially, roughly ×1.618 per extra symbol, which is far below the 2ⁿ of unrestricted strings. Banning adjacent 1s costs you real information capacity, and that is exactly the calculation a coding engineer does when choosing a line code.`, {
      terms: [
        ['Same recurrence, different start', 'a(n) = a(n−1) + a(n−2) with a(0)=1, a(1)=2 versus w(0)=1, w(1)=1. The rule is shared; the base cases are not.'],
        ['Golden ratio φ', '(1 + √5)/2 ≈ 1.618. The growth rate of any sequence obeying x(n) = x(n−1) + x(n−2).'],
        ['Characteristic equation', 'Substitute a(n) = rⁿ into the recurrence to get r² = r + 1, whose roots give the growth rate.'],
        ['Exponential growth', 'The count multiplies by a fixed factor per extra symbol, here about 1.618 instead of 2.'],
      ]
    }),
    q.info('M', 'Ordered or unordered? The question to ask before counting', `Make a total of 6 out of parts of size 1, 2 and 3. How many ways?

There are two completely different answers, and which one you want is a question about the problem, not about the maths.

**Ordered (compositions).** 1+2+3 and 3+2+1 are different, because the order the parts arrive matters. Condition on the first part: it is 1, 2 or 3, leaving 5, 4 or 3 to make. So c(n) = c(n−1) + c(n−2) + c(n−3), with c(0) = 1 and no negative terms. That gives 1, 1, 2, 4, 7, 13, **24**.

**Unordered (partitions).** 1+2+3 and 3+2+1 are the same multiset. Now you cannot condition on "the first part"; you count by how many 3s, then how many 2s, and the 1s fill the rest: 3+3, 3+2+1, 3+1+1+1, 2+2+2, 2+2+1+1, 2+1+1+1+1, 1+1+1+1+1+1. Seven.

24 against 7, from one sentence of English. Before you count anything, write down whether order matters and whether repeats are allowed. In a hardware setting the ordered count is the number of legal message **sequences** that fill a 6-cycle window; the unordered count is the number of distinct message **mixes**. They answer different engineering questions.`, {
      terms: [
        ['Composition', 'An ordered sum: the sequence of parts matters. 1+2 and 2+1 are different compositions of 3.'],
        ['Partition (multiset)', 'An unordered collection of parts. 1+2 and 2+1 are the same partition of 3.'],
        ['Tribonacci', 'c(n) = c(n−1) + c(n−2) + c(n−3): the composition count when parts of size 1, 2 and 3 are allowed.'],
      ]
    }),
    q.tokens('M', 'Let a(n) be the number of binary strings of length n with no two adjacent 1s. Give a(0), a(1), a(2), a(3), a(4), a(5) in that order.', ['1', '2', '3', '5', '8', '13'], ['4', '6', '21'], 'a(0) = 1 (the empty string), a(1) = 2 ("0" and "1"), and after that each is the sum of the previous two: 1+2 = 3, 2+3 = 5, 3+5 = 8, 5+8 = 13. Check a(3) = 5 by listing: 000, 001, 010, 100, 101.', { mono: true }),
    q.num('M', 'Let a(n) be the number of binary strings of length n with no two adjacent 1s, so a(0) = 1, a(1) = 2, and a(n) = a(n−1) + a(n−2). What is a(6)?', 21, 'The sequence runs 1, 2, 3, 5, 8, 13, 21. a(6) = a(5) + a(4) = 13 + 8 = 21.'),
    q.mc('M', 'Why does the count a(n) of length-n binary strings with no two adjacent 1s satisfy a(n) = a(n−1) + a(n−2)?', ['A valid string either starts with 0 followed by any valid string of length n−1, or starts with 10 followed by any valid string of length n−2, and those two groups do not overlap', 'Because Fibonacci numbers turn up in most counting problems', 'Because 1 + 1 = 2', 'It is a definition, not something you derive'], 0, 'Split by the first symbol. A leading 0 constrains nothing after it; a leading 1 forces the next symbol to be 0 and constrains nothing after that. The two cases are disjoint and together cover every valid string, so the counts add.'),
    q.num('M', 'Let a(n) count length-n binary strings with no two adjacent 1s, with a(0) = 1 and a(1) = 2. What is a(10)?', 144, 'Continue the sequence: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144. So a(10) = 144, out of 2¹⁰ = 1024 strings altogether.'),
    q.num('M', 'You climb a staircase of 5 steps, taking either 1 or 2 steps at a time. How many different sequences of steps reach the top?', 8, 'Condition on the first move: a 1 leaves 4 steps, a 2 leaves 3. So w(n) = w(n−1) + w(n−2) with w(0) = 1 (one way to do nothing) and w(1) = 1. The sequence is 1, 1, 2, 3, 5, 8, so w(5) = 8.'),
    q.num('M', 'How many **ordered** ways are there to make a total of 6 from parts of size 1, 2 and 3 (so 1+2+3 and 3+2+1 count separately)?', 24, 'Condition on the first part: c(n) = c(n−1) + c(n−2) + c(n−3), with c(0) = 1. That gives c(1) = 1, c(2) = 2, c(3) = 4, c(4) = 7, c(5) = 13, c(6) = 13 + 7 + 4 = 24.'),
    q.num('M', 'How many **unordered** ways are there to make a total of 6 from parts of size 1, 2 and 3 (so 1+2+3 and 3+2+1 count as the same way)?', 7, 'Count by how many 3s: two 3s (3+3); one 3 with the remaining 3 made from 1s and 2s (3+2+1, 3+1+1+1); no 3s, so 6 from 1s and 2s (2+2+2, 2+2+1+1, 2+1+1+1+1, 1+1+1+1+1+1). Total 7, against 24 when order matters.'),
    q.mc('M', 'For a sequence obeying a(n) = a(n−1) + a(n−2), what does the ratio a(n)/a(n−1) approach as n grows, and why?', ['(1 + √5)/2 ≈ 1.618, because if the ratio settles at r then r = 1 + 1/r, so r² = r + 1', 'It approaches 2, like unrestricted binary strings', 'It approaches 1: the sequence flattens out', 'It does not settle at all'], 0, 'Divide the recurrence by a(n−1): a(n)/a(n−1) = 1 + a(n−2)/a(n−1) = 1 + 1/r. Setting that equal to r gives r² − r − 1 = 0 and the positive root is the golden ratio. Check: 89/55 = 1.618.'),
    q.num('M', 'Interview: of all 1024 binary strings of length 10, how many have at least one pair of adjacent 1s? (Strings with no adjacent 1s number 144.)', 880, 'Count the complement, which is far easier. Total 2¹⁰ = 1024; the good strings number a(10) = 144; so 1024 − 144 = 880 contain at least one adjacent pair. Whenever a condition says "at least one somewhere", try counting the strings that have none.'),
    q.num('M', 'Interview: six bits are arranged in a **circle**, so position 6 is adjacent to position 1. How many of the 64 arrangements have no two adjacent 1s?', 18, 'Condition on the first bit. If it is 0, the other five form a straight line with no adjacent 1s: a(5) = 13. If it is 1, its two neighbours (positions 2 and 6) are forced to 0, and positions 3, 4, 5 form a straight line: a(3) = 5. Total 13 + 5 = 18. The circle is harder than the line only because the two ends now constrain each other.'),
    q.mc('M', 'Interview: a colleague computes the number of length-n binary strings with no two adjacent 1s using a(n) = a(n−1) + a(n−2) with a(1) = 1 and a(2) = 2, and gets 89 for n = 10. Where did they go wrong?', ['The base cases: there are 2 strings of length 1 and 3 of length 2, so a(1) = 2 and a(2) = 3, giving 144', 'The recurrence should be a(n) = a(n−1) + a(n−3)', 'The recurrence should have a minus sign', 'Nothing is wrong; 89 is correct'], 0, 'The rule was right and the starting values were wrong, which shifts the whole sequence one place and gives 89 instead of 144. Always check a recurrence by listing the small cases by hand: length 1 gives "0" and "1", length 2 gives 00, 01, 10.'),

    // =====================================================================================================
    // DEGREE: mesh analysis (EEEN11101)
    // =====================================================================================================
    q.info('E', 'Mesh analysis: why loop currents get KCL for free', `Nodal analysis picks node voltages as unknowns and writes **KCL** (currents into a node sum to zero) at each one. Mesh analysis is its mirror image: pick **loop currents** as unknowns and write **KVL** (voltages round a loop sum to zero) around each one.

The idea that makes it work: imagine a current circulating all the way round one loop of the circuit, like water round a ring. Call it I₁. A real branch current is then just the sum of the loop currents that flow through that branch. A branch on the boundary between two loops carries **I₁ − I₂**, because the two loops push through it in opposite directions.

Here is the payoff. A circulating current enters every node of its loop and leaves it again, so **KCL is satisfied automatically**, whatever values the loop currents take. You never have to write a current law at all. All that is left is KVL, one equation per loop.

How many loops do you need? For a flat circuit with b branches and n nodes, the number of independent loops is **b − n + 1**. Six branches and four nodes give three mesh equations.

The word **mesh** means a loop with nothing inside it: a "window pane" of the drawn circuit. Meshes are the easy way to pick independent loops, because no mesh can be built out of the others.`, {
      terms: [
        ['Mesh', 'A loop of a flat circuit with no components inside it: one window pane of the drawing.'],
        ['Mesh (loop) current', 'A current imagined circulating right round one mesh. Not directly measurable; branch currents are built from it.'],
        ['Branch current', 'The real current in a component: the sum of the loop currents passing through it, with signs.'],
        ['Independent loops', 'b − n + 1 of them for b branches and n nodes. Any other loop is a combination of these.'],
        ['KVL', 'Round any closed loop, the voltage rises equal the voltage drops. It is conservation of energy per coulomb.'],
      ]
    }),
    q.info('E', 'Writing the equations, and reading them straight off the circuit', `Take two meshes sharing one resistor, with both loop currents drawn **clockwise**. Mesh 1 has a source V₁ and its own resistor R₁; mesh 2 has V₂ and R₃; they share R₂.

Walk round mesh 1 in the direction of I₁ and add up the drops. R₁ carries only I₁, so it drops R₁·I₁. R₂ carries I₁ downwards and I₂ upwards, so the drop in the direction I₁ is travelling is R₂·(I₁ − I₂). Setting rises equal to drops:

**V₁ = R₁·I₁ + R₂·(I₁ − I₂)**, i.e. **(R₁ + R₂)·I₁ − R₂·I₂ = V₁**

Round mesh 2 the same way: **(R₂ + R₃)·I₂ − R₂·I₁ = V₂**.

Look at the pattern, because after a few circuits you can write it down without walking round anything.

- The coefficient of a loop's **own** current is the total resistance in that loop (its **self-resistance**), always positive.
- The coefficient of a **neighbour's** current is minus the resistance they share (the **mutual resistance**), when both loop currents are drawn the same way round.
- The right-hand side is the sum of the source rises driving that loop.

The matrix is symmetric, and that symmetry is a free error check: if your two off-diagonal numbers differ, you have made a sign slip.`, {
      terms: [
        ['Self-resistance', 'The sum of all resistances in a loop. It multiplies that loop\'s own current, with a plus sign.'],
        ['Mutual resistance', 'The resistance shared with a neighbouring loop. It multiplies the neighbour\'s current, with a minus sign when both loops are drawn clockwise.'],
        ['Symmetric matrix', 'The coefficient of I₂ in equation 1 equals the coefficient of I₁ in equation 2. A quick check on your signs.'],
        ['Source rise', 'A source pushing current in the direction of the loop current contributes a positive term on the right-hand side.'],
      ],
      widget: W('mesh', { V1: 10, V2: 4, R1: 2, R2: 4, R3: 2 })
    }),
    q.info('E', 'Cross-checking, and choosing between mesh and nodal', `Two methods that both describe the same physics must agree. Solve a circuit by mesh analysis, then solve it again with nodal analysis and compare a shared quantity, usually the voltage across the shared branch. If the numbers differ, one of them has a sign or algebra slip; there is no third possibility, and no version of "both are right".

That is the cheapest **independent reference** you will ever build, and it is the same habit as writing a Python model to check a hardware design.

**Which method to use?** Count the unknowns.

- Mesh gives b − n + 1 equations. Good when the circuit is a flat ladder of loops and the sources are mostly voltage sources.
- Nodal gives n − 1 equations (one node is the reference). Good when there are many loops but few nodes, and when the sources are mostly current sources.

A circuit with 7 branches and 5 nodes needs 3 mesh equations but 4 nodal ones, so mesh wins. Swap the numbers and nodal wins. Neither is more correct; the arithmetic is just shorter one way.

One warning: a mesh current is a bookkeeping device, not something a meter can read. To report a real current, combine the loop currents in that branch.`, {
      terms: [
        ['Independent reference', 'A second, differently derived answer used to check the first. Two methods agreeing is real evidence.'],
        ['Nodal analysis', 'Unknowns are node voltages; you write KCL at each node except the reference. n − 1 equations.'],
        ['Reference node (ground)', 'The node you declare to be 0 V. Choosing a different one shifts all node voltages equally and changes nothing physical.'],
        ['Measurable quantity', 'A branch current or a voltage between two points. A mesh current is neither until you combine it.'],
      ]
    }),
    q.info('E', 'The supermesh: when a current source sits between two loops', `Mesh analysis needs the voltage drop across every element in the loop. A **current source** breaks that: it fixes the current through itself and lets its voltage be whatever the rest of the circuit demands. You do not know that voltage, so you cannot write KVL through it.

There are two cases.

**A current source in one mesh only.** Then that mesh's current is simply known: I = I_source (with a sign for direction). One unknown gone, one fewer equation to write.

**A current source on the boundary between two meshes.** Here neither loop current is known on its own, but their difference is. The trick is to avoid the source entirely:

1. Write **one** KVL equation round the outside of the two meshes together, going the long way round and never crossing the current source. That combined loop is the **supermesh**.
2. Add the **constraint equation** the source gives you: the difference of the two loop currents equals the source current, with the sign set by which way it points.

Two equations, two unknowns, and the source's unknown voltage never appears. If you do need that voltage afterwards, get it by writing KVL round one of the original meshes once the currents are known.`, {
      terms: [
        ['Current source', 'A source that forces a fixed current through itself. Its terminal voltage is set by the rest of the circuit.'],
        ['Supermesh', 'Two meshes treated as one loop, taken the long way round so the shared current source is never crossed.'],
        ['Constraint equation', 'The extra equation a current source gives: the difference of the two loop currents equals its current.'],
        ['Recovering the source voltage', 'Apply KVL round one original mesh after solving; the current source\'s voltage is the only unknown left.'],
      ]
    }),
    q.num('E', 'Two meshes share a 4 Ω resistor, both loop currents drawn clockwise. KVL gives 10 = 2·I₁ + 4·(I₁ − I₂) for the left mesh and 4 = 2·I₂ + 4·(I₂ − I₁) for the right mesh. Find I₁ in amperes.', 3.8, 'Tidy the equations: 6I₁ − 4I₂ = 10 and −4I₁ + 6I₂ = 4. The determinant is 6×6 − (−4)(−4) = 20, so I₁ = (10×6 − (−4)×4)/20 = 76/20 = 3.8 A and I₂ = (6×4 − (−4)×10)/20 = 64/20 = 3.2 A. Check in the first equation: 6(3.8) − 4(3.2) = 22.8 − 12.8 = 10 ✓.', { unit: 'A', tol: 0.02 }),
    q.num('E', 'Two meshes share a 4 Ω resistor, both loop currents clockwise, with KVL equations 10 = 2·I₁ + 4·(I₁ − I₂) and 4 = 2·I₂ + 4·(I₂ − I₁). What current, in amperes, actually flows in the shared 4 Ω resistor?', 0.6, 'Solving gives I₁ = 3.8 A and I₂ = 3.2 A, so the branch current in the shared resistor is I₁ − I₂ = 0.6 A in the direction I₁ travels through it. The two loops push through that resistor in opposite directions, so most of each loop current cancels.', { unit: 'A', tol: 0.02 }),
    q.num('E', 'Two meshes share a 4 Ω resistor, both loop currents clockwise, with KVL equations 10 = 2·I₁ + 4·(I₁ − I₂) and 4 = 2·I₂ + 4·(I₂ − I₁). What is the voltage across the shared 4 Ω resistor, in volts?', 2.4, 'The shared branch carries I₁ − I₂ = 3.8 − 3.2 = 0.6 A, so Ohm\'s law gives 4 × 0.6 = 2.4 V. This is the number to compare against a nodal solution: the node at the top of that resistor must come out at 2.4 V above the bottom.', { unit: 'V', tol: 0.02 }),
    q.mc('E', 'A resistor sits on the boundary between two meshes whose loop currents I₁ and I₂ are both drawn clockwise. What current does it actually carry?', ['I₁ − I₂: the two loop currents pass through it in opposite directions, so they partly cancel', 'I₁ + I₂', 'Whichever of I₁ and I₂ is larger', 'Zero, because the loops cancel exactly'], 0, 'Draw both loops clockwise and look at the shared branch: one loop goes down it and the other goes up it. Superpose the two circulating currents and the branch carries their difference. If you had drawn the second loop anticlockwise instead, the same branch would carry the sum, and the off-diagonal coefficient in the equations would be positive.'),
    q.num('E', 'A flat circuit has 6 branches and 4 nodes. How many independent mesh equations does mesh analysis need?', 3, 'b − n + 1 = 6 − 4 + 1 = 3. Nodal analysis on the same circuit would need n − 1 = 3 equations too, so here neither method is shorter; you would choose on the basis of which sources are present.', { unit: 'equations' }),
    q.mc('E', 'Mesh analysis gives you three loop currents. A meter measures the current in one branch. Which statement is right?', ['The meter reads a branch current, which is the sum or difference of the loop currents passing through that branch; a loop current on its own is a bookkeeping device', 'The meter reads whichever loop current is largest', 'Loop currents can be measured directly with a clamp meter', 'Loop currents and branch currents are always the same thing'], 0, 'A loop current is a chosen unknown that makes KCL automatic. Only the combination flowing in a real component is physical, which is why the last step of a mesh solution is always to turn loop currents back into branch currents.'),
    q.mc('E', 'You solve one circuit by mesh analysis and again by nodal analysis, and get different voltages across the shared branch. What do you conclude?', ['One solution contains an algebra or sign error; the two methods are derivations of the same physics and must agree', 'Both are valid: the methods use different conventions', 'Mesh analysis does not apply to that circuit', 'The circuit must contain a non-linear component'], 0, 'KCL and KVL both hold in the same circuit, so any correct route to the answer gives the same measurable numbers. A disagreement is a bug hunt, and it is a cheap one because you already have two independent derivations to compare line by line.'),
    q.mc('E', 'Why can you not simply write KVL through a branch that contains only an ideal current source?', ['Its voltage is unknown: a current source fixes the current through itself and lets the rest of the circuit set its voltage', 'Current sources have infinite resistance so the loop is broken', 'KVL does not apply to circuits with current sources', 'Its voltage is always zero'], 0, 'KVL needs a value for every drop round the loop, and the current source supplies a current instead. The supermesh sidesteps it: go the long way round both meshes so you never cross the source, and add the constraint that the difference of the loop currents equals the source current.'),
    q.num('E', 'A left mesh (clockwise I₁) contains a 20 V source and a 4 Ω resistor. A right mesh (clockwise I₂) contains a 6 Ω resistor. The branch they share contains only a 2 A current source, oriented so that I₂ − I₁ = 2 A. Find I₂ in amperes.', 2.8, 'Take KVL round the supermesh, the outside path that avoids the current source: 20 = 4·I₁ + 6·I₂. Add the constraint I₂ = I₁ + 2 and substitute: 20 = 4I₁ + 6I₁ + 12 = 10I₁ + 12, so I₁ = 0.8 A and I₂ = 2.8 A.', { unit: 'A', tol: 0.03 }),
    q.num('E', 'A left mesh (clockwise I₁) contains a 20 V source and a 4 Ω resistor; a right mesh (clockwise I₂) contains a 6 Ω resistor; the shared branch contains only a 2 A current source with I₂ − I₁ = 2 A. What is the voltage across the current source, in volts?', 16.8, 'Solve first: the supermesh gives 20 = 4I₁ + 6I₂ and the constraint gives I₂ = I₁ + 2, so I₁ = 0.8 A and I₂ = 2.8 A. Now write KVL round the right mesh alone, where the only unknown left is the source voltage: it must balance the 6 Ω drop, so V = 6 × 2.8 = 16.8 V. Check with the left mesh: 20 = 4(0.8) + V = 3.2 + 16.8 ✓.', { unit: 'V', tol: 0.1 }),
    q.num('E', 'Exam-style: two meshes share a 10 Ω resistor. Both loop currents are drawn clockwise, and KVL gives 20 = 5·I₁ + 10·(I₁ − I₂) for the left mesh and 10 = 5·I₂ + 10·(I₂ − I₁) for the right mesh. Calculate I₁, in amperes.', 3.2, 'Tidy: 15I₁ − 10I₂ = 20 and −10I₁ + 15I₂ = 10, or after dividing by 5: 3I₁ − 2I₂ = 4 and −2I₁ + 3I₂ = 2. Determinant 9 − 4 = 5, so I₁ = (4×3 − (−2)×2)/5 = 16/5 = 3.2 A and I₂ = (3×2 − (−2)×4)/5 = 14/5 = 2.8 A.', { unit: 'A', tol: 0.02 }),
    q.num('E', 'Exam-style: two meshes share a 10 Ω resistor, both loop currents clockwise, with KVL equations 20 = 5·I₁ + 10·(I₁ − I₂) and 10 = 5·I₂ + 10·(I₂ − I₁). Calculate the power dissipated in the shared 10 Ω resistor, in watts.', 1.6, 'The loop currents are I₁ = 3.2 A and I₂ = 2.8 A, so the shared branch carries I₁ − I₂ = 0.4 A. Power is I²R = 0.4² × 10 = 0.16 × 10 = 1.6 W. Using a loop current instead of the branch current here is the classic exam slip: 3.2² × 10 = 102 W is nonsense.', { unit: 'W', tol: 0.02 }),
    q.num('E', 'Exam-style: a left mesh (clockwise I₁) contains a 20 V source and a 4 Ω resistor; a right mesh (clockwise I₂) contains a 6 Ω resistor; the shared branch contains only a 2 A current source with I₂ − I₁ = 2 A. Calculate the total power dissipated in the two resistors, in watts.', 49.6, 'The supermesh gives I₁ = 0.8 A and I₂ = 2.8 A. The 4 Ω carries I₁: 0.8² × 4 = 2.56 W. The 6 Ω carries I₂: 2.8² × 6 = 47.04 W. Total 49.6 W. Check against the sources: the 20 V source delivers 20 × 0.8 = 16 W and the current source delivers 2 × 16.8 = 33.6 W, and 16 + 33.6 = 49.6 W ✓.', { unit: 'W', tol: 0.3 }),
    q.mc('E', 'Exam-style: a flat circuit has 9 branches and 7 nodes. How many equations does each method need, and which is shorter?', ['Mesh needs b − n + 1 = 3, nodal needs n − 1 = 6, so mesh is shorter', 'Mesh needs 6, nodal needs 3, so nodal is shorter', 'Both need 9', 'Both need 7'], 0, 'Mesh: b − n + 1 = 9 − 7 + 1 = 3 equations. Nodal: n − 1 = 6, because one node is the reference. Count them before you start writing, and remember the other tie-breaker: each current source sitting in a single mesh fixes that loop current outright and removes an unknown, while each voltage source between two non-reference nodes forces a supernode in the nodal method.'),
    ...genius(q, 26),
  ]
};
