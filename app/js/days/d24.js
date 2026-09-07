import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(24);

export default {
  title: 'One-entry buffers, two pointers, Little\'s law, damping',
  emoji: '📦',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook H03 L2. **Hardware**: the elastic register — one slot of storage between two blocks, the four decisions you must make before writing a line of RTL (empty, full, bypass, reset), why refusing a same-cycle push and pop halves your throughput, the lost-item counterexample to changing data while stalled, and two cycle-level models you write, one combinational and one a full trace with a conservation check. **Code** (A02): two pointers, the monotonicity argument that licenses dropping an index, the same-direction variant, and the memory trade against a hash map. **Maths** (M08 L2): Little\'s law derived as an area between two staircases, why it is bookkeeping rather than a queue model, why the boundary must be declared, and using it backwards to size buffers and in-flight data. **Degree** (MATH19611 / E02 L4): why two energy stores make an oscillator, the standard second-order form derived from a series RLC circuit, and what ζ < 1, ζ = 1 and ζ > 1 look like physically.',
  takeaway: 'An elastic register is one slot with valid/ready on both sides. Decide empty, full, bypass and reset **before** coding. in_ready = !full OR out_ready keeps throughput at 1 item/cycle but makes in_ready depend combinationally on out_ready; refusing same-cycle push+pop drops you to 0.5. Hold the payload while stalled or items vanish. Accepted in − delivered out = occupancy, always. Two pointers: each move discards an index for a proven reason, and the proof needs sorted data. Little: L = λW, an accounting identity for any stable system with a declared boundary. Second order: ωn = 1/√(LC), ζ = (R/2)√(C/L); ζ < 1 rings, ζ = 1 is the fastest response with no overshoot, ζ > 1 is sluggish.',
  steps: [
    // =====================================================================================================
    // HARDWARE (H03 L2): the elastic register
    // =====================================================================================================
    q.info('H', 'Why put one slot of storage between two blocks', `Two blocks are wired together with a valid/ready handshake: the source raises **valid** when it has an item, the sink raises **ready** when it can take one, and the item transfers on a clock edge where both are 1.

Wire them directly and two problems appear. First, the sink's ready wire runs straight into the source's logic, and if you chain several blocks this way, each stage's ready depends on the next stage's ready, so one long combinational path runs from the far end of the pipe back to the front. That path becomes the slowest thing on the chip and caps your clock speed. Second, a single hiccup anywhere downstream freezes everything upstream in the same cycle, so a source that could have carried on working stops dead.

An **elastic register** fixes both by holding exactly **one** item. It is the smallest thing that lets the two sides disagree about what is happening this cycle: the sink can stall for a cycle while the source keeps delivering, because there is somewhere to put the item.`, {
      terms: [
        ['valid / ready handshake', 'valid = "I have an item"; ready = "I can take one". A transfer happens on an edge where both are 1.'],
        ['Elastic register', 'A one-entry buffer with a valid/ready interface on each side. Also called a pipeline register with valid.'],
        ['Occupancy', 'How many items the buffer holds right now: 0 or 1 for a single slot.'],
        ['Critical path', 'The slowest combinational route between two registers. It sets the minimum clock period.'],
        ['Decoupling', 'Letting two blocks stall independently for a short time instead of moving in lockstep.'],
      ],
      widget: W('elastic', { bypass: false })
    }),
    q.info('H', 'Four decisions to make before you write any RTL', `A one-slot buffer sounds trivial and has four separate design choices hiding in it. Every one of them is a promise you make to the blocks either side, so write them down first.

**1. Empty.** Nothing stored: out_valid = 0, and in_ready = 1 because there is room.

**2. Full.** Something stored: out_valid = 1. Is in_ready 0 (simple), or is it 1 in a cycle where the stored item is also leaving? Allowing that is "push and pop together" — the next card shows what it is worth.

**3. Bypass.** When the buffer is empty and an item arrives, may it appear at the output in the **same** cycle? That gives zero added latency, but it means out_valid now depends combinationally on in_valid, so you have moved the long path from the ready side to the valid side rather than removing it.

**4. Reset.** What happens to a stored item when reset is asserted? Discarding it is completely fine — as long as the contract says so. An undeclared flush looks exactly like a lost item to whoever is checking your design.

Notice that choices 2 and 3 both trade timing against throughput or latency. There is no version that is best at everything, which is why it must be a decision and not an accident.`, {
      terms: [
        ['out_valid / in_ready', 'The two signals the buffer drives: "I have an item for you" and "I can take one from you".'],
        ['Bypass (pass-through)', 'Presenting an arriving item at the output in the same cycle, when the slot is empty.'],
        ['Flush', 'Deliberately discarding stored contents, usually on reset. Legitimate only if it is declared.'],
        ['Contract', 'The written promises about valid, ready, payload stability, reset and ordering that both sides rely on.'],
      ]
    }),
    q.info('H', 'Push and pop in the same cycle, and what refusing it costs', `Say the slot is full and the sink is ready this cycle. The stored item is leaving. Can you accept a new one at the same time?

**If you say no** (in_ready = !full), watch what happens with a source that always has data and a sink that always takes. Cycle 1: empty, so accept — now full. Cycle 2: full, so refuse the source; the stored item leaves; now empty. Cycle 3: accept. You move one item every **two** cycles. Throughput 0.5 items/cycle, from a buffer whose whole purpose was to not get in the way.

**If you say yes**, the rule becomes

in_ready = (not full) OR out_ready

and the same trace moves one item every cycle: throughput 1.0. The price is in that OR: in_ready now depends **combinationally** on out_ready, so the sink's stall signal still races straight through to the source in the same cycle. You kept full throughput and you did not shorten the ready path.

Both are correct designs. Which one you want depends on whether your problem is timing or throughput — and the buffer that fixes **both** at once costs two slots, which is tomorrow's topic.`, {
      terms: [
        ['Same-cycle push and pop', 'Accepting a new item in the cycle the stored one leaves. Needs in_ready to see out_ready.'],
        ['Ready chain', 'A combinational path where each stage\'s ready is computed from the next stage\'s ready.'],
        ['Throughput', 'Items transferred per cycle. 1.0 is full rate for a single-item interface.'],
        ['Timing versus throughput', 'The trade this choice makes: a short critical path, or full rate, or (with more storage) both.'],
      ]
    }),
    q.goal('H', 'In the elastic-register simulation, drive it so that at least one cycle has a **push and a pop happening together**, then empty it: get the pops counter to 2 or more.', W('elastic', { bypass: false }), s => s.sawBoth && s.pops >= 2,
      'Push once with in_valid = 1 to fill the slot. Then keep in_valid = 1 and set out_ready = 1: the stored item leaves and the new one is accepted in the same cycle. Drop in_valid and clock once more to drain. The conservation line stays balanced throughout.'),
    q.info('H', 'The payload must not change while you are stalled', `Here is the counterexample that makes the rule stick. The buffer is full, so in_ready = 0. The source is holding valid = 1 with item **D1** on its data wires. Nothing transfers, because ready is 0.

Now the source gets bored and swaps its data to **D2**, keeping valid = 1. Next cycle the buffer frees up, in_ready goes to 1, a transfer happens — and what is captured is D2. **D1 was announced as valid and never transferred anywhere. It has simply vanished**, and nothing in the design will report an error.

So the protocol rule is: **once valid is asserted, valid stays asserted and the payload stays unchanged until the transfer happens.** The source is not allowed to withdraw or edit an offer. Only the transfer clears it.

This is the single most common handshake bug, and it is worth having a matching invariant in every test bench: **items accepted in − items delivered out = occupancy**, checked every cycle, and the delivered sequence must be the accepted sequence in the same order with nothing added or removed (apart from a declared reset flush). Those two assertions catch loss, duplication and reordering together.`, {
      terms: [
        ['Payload stability', 'The rule that data and valid must be held unchanged until the transfer is accepted.'],
        ['Conservation invariant', 'accepted in − delivered out = occupancy, true after every cycle.'],
        ['Scoreboard', 'A test-bench queue holding what went in, compared against what comes out, in order.'],
        ['Silent loss', 'A dropped item that no signal reports. Only an invariant or a scoreboard finds it.'],
      ],
      widget: W('buffer', { depth: 1 })
    }),
    q.mc('H', 'A source holds valid = 1 with item D1 while the sink\'s ready is 0, then changes its data lines to D2 while keeping valid = 1. What concretely goes wrong?', ['D1 was announced as available and is never transferred anywhere: an item has been silently lost, and nothing in the design reports it', 'Nothing at all: ready was 0, so the cycle did not count', 'The clock glitches and the buffer enters an illegal state', 'The sink receives both D1 and D2, so an item is duplicated'], 0, 'valid means "this exact item is on offer until you take it". Withdrawing or editing the offer destroys an item that the source has already counted as sent.'),
    q.num('H', 'A one-entry buffer sets in_ready = NOT full (it refuses to accept in the same cycle a stored item leaves). A source always has data and a sink is always ready. How many items per cycle move through, as a decimal?', 0.5, 'Accept, then a cycle where it can only deliver, then accept again: one item every two cycles, so 0.5 items/cycle. The buffer meant to decouple the two sides has halved the rate.'),
    q.mc('H', 'For a one-entry buffer that does allow a push and a pop in the same cycle, in_ready is…', ['in_ready = (not full) OR out_ready — so in_ready depends combinationally on the sink\'s ready signal', 'in_ready = 1 always', 'in_ready = NOT full, with no dependence on the sink', 'in_ready registered from the previous cycle\'s out_ready'], 0, 'The slot can take a new item if it is empty, or if the item in it is leaving this cycle. That OR is exactly the combinational ready path that a longer pipeline pays for.'),
    q.mc('H', 'A one-entry buffer is built with **bypass**: when it is empty, an arriving item appears at the output in the same cycle. What has that bought and what has it cost?', ['Zero added latency when the buffer is empty, at the cost of out_valid (and the data) now depending combinationally on in_valid — the long path has moved from the ready side to the valid side', 'Lower latency and a shorter critical path in every direction', 'Higher throughput, with no cost at all', 'It removes the need for a reset contract'], 0, 'A single slot can break the valid path or the ready path, not both. Breaking both needs two slots.'),
    q.mc('H', 'Reset discards the item stored in an elastic register. Is that a bug?', ['Not if the contract declares it: a flush on reset is a legitimate design choice, and only becomes a bug when the checker was told the buffer is lossless', 'Yes: hardware must never discard an accepted item', 'No, and it never needs to be documented because reset is special', 'Yes, unless the item is re-sent automatically after reset'], 0, 'The handbook\'s wording: the accepted-input sequence must equal the accepted-output sequence apart from an *explicitly declared* reset flush. Undeclared, it is indistinguishable from data loss.'),
    q.code('H', 'Write the combinational half of a one-entry buffer. `solve(state, in_valid, out_ready, item)` takes `state` (either `None` for empty, or the id of the stored item), the two handshake inputs (0 or 1), and `item`, the id the source is offering this cycle. Return `(new_state, in_ready, out_valid, out_item)`, where in_ready and out_valid are 0 or 1 and out_item is what the output presents this cycle (or `None`). Rules: **no bypass** (an arriving item is never visible at the output in the same cycle); **same-cycle push and pop are allowed** (a full slot accepts if the stored item is leaving); an item leaves when out_valid and out_ready are both 1.', {
      fn: 'solve',
      starter: 'def solve(state, in_valid, out_ready, item):\n    full = state is not None\n    out_valid = 1 if full else 0\n    out_item = state\n    popped = full and out_ready == 1\n    in_ready = 1 if (not full or popped) else 0\n    new_state = state\n    # clear the slot on a pop, then load the offered item on an accepted push\n    return (new_state, in_ready, out_valid, out_item)\n',
      tests: [
        { args: [null, 1, 1, 'A'], expect: ['A', 1, 0, null], name: 'empty + push: stored, nothing out yet (no bypass)' },
        { args: ['A', 0, 1, 'B'], expect: [null, 1, 1, 'A'], name: 'full, pop only: A leaves, slot empties' },
        { args: ['A', 1, 1, 'B'], expect: ['B', 1, 1, 'A'], name: 'full, push + pop in one cycle: A out, B in' },
        { args: ['A', 1, 0, 'B'], expect: ['A', 0, 1, 'A'], name: 'full and stalled: refuse the push, hold A' },
        { args: [null, 0, 1, 'C'], expect: [null, 1, 0, null], name: 'empty and idle: ready for anything' },
        { args: [null, 0, 0, 'C'], expect: [null, 1, 0, null], name: 'empty, sink stalled: in_ready is still 1' },
      ],
      gen: 'def gen():\n    for i in range(12):\n        st = random.choice([None, "X"])\n        yield (st, random.randint(0, 1), random.randint(0, 1), "I%d" % i)',
      refCode: 'def ref(state, in_valid, out_ready, item):\n    full = state is not None\n    out_valid = 1 if full else 0\n    popped = full and out_ready == 1\n    in_ready = 1 if (not full or popped) else 0\n    new_state = None if popped else state\n    if in_valid == 1 and in_ready == 1:\n        new_state = item\n    return [new_state, in_ready, out_valid, state]',
      solution: 'def solve(state, in_valid, out_ready, item):\n    full = state is not None\n    out_valid = 1 if full else 0\n    out_item = state\n    popped = full and out_ready == 1\n    in_ready = 1 if (not full or popped) else 0\n    new_state = None if popped else state\n    if in_valid == 1 and in_ready == 1:\n        new_state = item\n    return (new_state, in_ready, out_valid, out_item)'
    }, 'This function is the RTL, minus the syntax: the outputs are computed from the current state and the current inputs (that is combinational logic), and new_state is what the flip-flops capture at the edge. Note the order of the last two lines — the pop clears the slot *before* the push is judged, which is exactly why the same-cycle case works. The random cases check you against a hidden reference on every combination of state, in_valid and out_ready.'),
    q.code('H', 'Run a one-entry buffer over a whole trace and check that nothing is lost. `solve(in_valid, out_ready)` takes two equal-length lists of 0/1, one entry per cycle. The buffer starts empty, has **no bypass** and **allows a same-cycle push and pop**. In cycle t the source offers the item whose id is the integer `t`, but only when `in_valid[t]` is 1. Return `[accepted, delivered, occupancy]`: the list of item ids accepted (in the cycle each was accepted), the list of ids delivered (in delivery order), and the occupancy (0 or 1) after the last cycle. The conservation law `len(accepted) - len(delivered) == occupancy` must hold, and `delivered` must be the front of `accepted` in the same order.', {
      fn: 'solve',
      starter: 'def solve(in_valid, out_ready):\n    state = None\n    accepted = []\n    delivered = []\n    for t in range(len(in_valid)):\n        full = state is not None\n        out_valid = 1 if full else 0\n        # popped? then in_ready, then push. Record the ids as they happen.\n        pass\n    return [accepted, delivered, 0 if state is None else 1]\n',
      tests: [
        { args: [[1, 1, 1, 1], [0, 0, 1, 1]], expect: [[0, 2, 3], [0, 2], 1], name: 'stalled sink: cycle 1 offer is refused and must be held' },
        { args: [[1, 1, 1], [1, 1, 1]], expect: [[0, 1, 2], [0, 1], 1], name: 'full rate: one in and one out every cycle once primed' },
        { args: [[1, 0, 0], [0, 0, 1]], expect: [[0], [0], 0], name: 'one item in, later drained' },
        { args: [[1, 1], [0, 0]], expect: [[0], [], 1], name: 'sink never ready: only one item fits, the rest is backpressure' },
        { args: [[0, 0], [1, 1]], expect: [[], [], 0], name: 'source idle: nothing happens' },
        { args: [[], []], expect: [[], [], 0], name: 'no cycles at all' },
      ],
      gen: 'def gen():\n    for _ in range(10):\n        n = random.randint(0, 14)\n        yield ([random.randint(0, 1) for _ in range(n)], [random.randint(0, 1) for _ in range(n)])',
      refCode: 'def ref(in_valid, out_ready):\n    state = None; acc = []; out = []\n    for t in range(len(in_valid)):\n        full = state is not None\n        popped = full and out_ready[t] == 1\n        in_ready = 1 if (not full or popped) else 0\n        if popped: out.append(state)\n        new = None if popped else state\n        if in_valid[t] == 1 and in_ready == 1:\n            acc.append(t); new = t\n        state = new\n    return [acc, out, 0 if state is None else 1]',
      solution: 'def solve(in_valid, out_ready):\n    state = None\n    accepted = []\n    delivered = []\n    for t in range(len(in_valid)):\n        full = state is not None\n        popped = full and out_ready[t] == 1\n        in_ready = 1 if (not full or popped) else 0\n        if popped:\n            delivered.append(state)\n        new_state = None if popped else state\n        if in_valid[t] == 1 and in_ready == 1:\n            accepted.append(t)\n            new_state = t\n        state = new_state\n    return [accepted, delivered, 0 if state is None else 1]'
    }, 'The first test is the whole lesson in one trace. In cycle 1 the buffer is full and the sink is stalled, so in_ready is 0 and the item offered in cycle 1 is never accepted — the source has to keep offering it, and here it does not, so id 1 never appears. Run the two invariants over your own output: accepted − delivered = occupancy, and delivered is a prefix of accepted. Those two lines are what a real test bench asserts every cycle, and they catch loss, duplication and reordering at once.'),
    q.mc('H', 'Interview: your test bench for a one-entry buffer asserts only that every delivered item was previously accepted. Which real bug does that miss?', ['Loss: an accepted item that is simply never delivered still passes, because the check never compares the counts or the order', 'Duplication of items', 'Anything at all — the check is complete', 'A reset flush'], 0, 'Add the counting invariant (accepted − delivered = occupancy) and an in-order scoreboard. One check alone catches only half the failure modes.'),
    q.mc('H', 'Interview: a reviewer says "your elastic register has zero latency because it can bypass, and a clean ready path because ready is registered". What is wrong?', ['One slot cannot do both: a bypass puts a combinational path on the valid side, and a registered ready needs somewhere to store the items that arrive before the source sees the stop — that means at least two slots', 'Nothing: a one-entry buffer does both by construction', 'Registered ready makes bypass impossible in any design at any depth', 'Bypass and registered ready are the same optimisation'], 0, 'This is exactly why the two-slot skid buffer exists. A single slot buys you one of the two paths, never both.'),

    // =====================================================================================================
    // ALGORITHMS (A02): two pointers
    // =====================================================================================================
    q.info('A', 'Two pointers: throwing away a candidate for a proven reason', `Here is the problem. A **sorted** list, say \`[1, 2, 4, 7, 11]\`, and a target of 9. Find two entries that add to the target.

Checking every pair takes n²/2 comparisons. Instead put **L** at the first element and **R** at the last, and look at their sum.

- \`arr[L] + arr[R] > target\` → the sum is too big, so move **R** one step left.
- \`arr[L] + arr[R] < target\` → too small, so move **L** one step right.
- Equal → you are done.

For 1 + 11 = 12 that is too big, so R moves: 1 + 7 = 8, too small, so L moves: 2 + 7 = 9. Found, in three comparisons.

Each step throws away one index for good, so the pointers meet after at most n steps: **O(n) time and O(1) extra memory**. But "throw away an index" is a strong claim, and it is only allowed because of the argument on the next card.`, {
      terms: [
        ['Two pointers', 'Two indices that walk through the data, each moving only one way, so the total work is linear.'],
        ['O(n) time', 'Work proportional to the number of elements: each element is looked at a bounded number of times.'],
        ['O(1) extra space', 'Memory used beyond the input does not grow with n. Here it is two integers.'],
      ],
      widget: W('twoptr', { arr: [1, 2, 4, 7, 11], target: 9 })
    }),
    q.info('A', 'Why sortedness is what makes the discarding legal', `Suppose \`arr[L] + arr[R] < target\` and you move L right, discarding index L for ever. That is only safe if arr[L] has no valid partner anywhere in the remaining range.

Here is the argument. arr[R] is the **largest** value still in play, because the list is sorted and R is the rightmost surviving index. So arr[L] + arr[R] is the biggest sum that L can still make with anything left. If even that is below the target, then no partner of arr[L] reaches the target, so L can go. The mirror argument covers moving R when the sum is too big.

Every step of the scan is protected by that one sentence, and every word of it uses sortedness. On an unsorted list arr[R] is just some value, not the largest, so the sum you looked at says nothing about the other candidates and you will discard an index that had a valid partner — quietly, with no error.

If your input is unsorted you have two honest options: sort it first, paying O(n log n), or use a hash map, paying O(n) memory. The technique itself does not "mostly work" on unsorted data; its proof simply evaporates.`, {
      terms: [
        ['Monotonicity argument', 'The proof that moving a pointer cannot skip a valid answer. It is what licenses the discard.'],
        ['Invariant', 'Here: any valid pair still lies inside the range [L, R].'],
        ['Precondition', 'Sorted input. Without it the algorithm is not slower — it is wrong.'],
      ]
    }),
    q.goal('A', 'Step the two-pointer simulation on the sorted list [1, 2, 4, 7, 11] with target 9 until it reports the pair it has found.', W('twoptr', { arr: [1, 2, 4, 7, 11], target: 9 }), s => s.found !== null,
      '12 is too big so R moves left; 8 is too small so L moves right; 2 + 7 = 9. Three comparisons instead of ten.'),
    q.info('A', 'The same-direction variant, and what makes both linear', `Two pointers do not have to start at opposite ends. A very common shape is a **fast** pointer that reads and a **slow** pointer that writes.

Remove duplicates from a sorted list in place: walk \`read\` from index 1 to the end; whenever \`arr[read]\` differs from \`arr[write]\`, advance \`write\` and copy the value there. At the end the first \`write + 1\` entries are the distinct values, no extra list was allocated, and every element was looked at once.

What both shapes have in common is the reason they are O(n): **neither pointer ever moves backwards.** Add up all the moves and you get at most 2n, no matter how the data is arranged. That is the thing to check when you invent your own variant. If some case makes a pointer step back, your linear-time claim is gone and you may have an accidental quadratic loop.

The trade against a hash map is worth stating plainly. A hash map solves the pair-sum problem in one pass over unsorted data, but needs O(n) memory. Two pointers need no extra memory but demand sorted data. Neither is better; they buy different things.`, {
      terms: [
        ['Fast / slow pointers', 'A read index that scans and a write index that lags behind, used for in-place filtering.'],
        ['In place', 'Modifying the input array itself rather than building a new one. O(1) extra memory.'],
        ['Amortised counting', 'Adding up all the pointer moves across the whole run instead of per iteration.'],
        ['Hash map trade', 'One pass on unsorted data at O(n) memory, versus O(1) memory but sorted input required.'],
      ]
    }),
    q.mc('A', 'The sorted list [1, 2, 4, 7, 11] with target 9, two pointers starting at both ends. What is the first step?', ['1 + 11 = 12, which is bigger than 9, so R moves left', '1 + 11 = 12, which is smaller than 9, so L moves right', 'The pair is found immediately', 'Both pointers move inwards together'], 0, 'Too big means the largest remaining value cannot be part of any pair with the current L, so drop it.'),
    q.mc('A', 'Which pair does the two-pointer scan find in the sorted list [1, 2, 4, 7, 11] for target 9?', ['2 and 7, at indices 1 and 3', '1 and 8', '4 and 5', 'There is no such pair'], 0, '12 is too big → R moves; 1 + 7 = 8 is too small → L moves; 2 + 7 = 9 ✓.'),
    q.tf('A', 'The two-pointer pair-sum method works correctly on an unsorted array.', false, 'Discarding an index relies on arr[R] being the largest remaining value, which only sortedness guarantees. On unsorted data it silently misses pairs. Sort first, or use a hash map.'),
    q.mc('A', 'Compared with the hash-map solution to pair sum, the two-pointer method on sorted data…', ['uses O(1) extra memory instead of O(n), but requires the input to be sorted', 'uses more memory but is faster', 'takes O(n²) time', 'is identical in every respect'], 0, 'A genuine trade: the hash map buys freedom from sorting with memory; two pointers buy memory back by demanding order.'),
    q.num('A', 'A two-pointer scan runs on a sorted list of 1000 elements and finds no pair. How many additions of `arr[L] + arr[R]` did it perform, at most?', 999, 'Every comparison moves exactly one pointer, and the pointers start 999 apart and stop when they meet. So at most 999 comparisons — versus about 500,000 for checking every pair.'),
    q.mc('A', 'A sorted list of prices contains duplicates and you want a two-pointer scan to report **distinct** pairs summing to a target, not the same pair repeatedly. What must you add?', ['After recording a hit, advance L past all copies of arr[L] and pull R back past all copies of arr[R]', 'Nothing: duplicates cannot produce repeated pairs', 'Restart the scan from the beginning after each hit', 'Sort the list a second time'], 0, 'Otherwise [2, 2, 2, 7] with target 9 reports the same value pair several times. Skipping equal neighbours after a hit is the standard fix, and it keeps the scan linear.'),
    q.code('A', 'Write `solve(arr, target)` for a **sorted** list `arr`, using two pointers. Return `[i, j]` with i < j and `arr[i] + arr[j] == target`, or `None` if no such pair exists. It must run in O(n) time with O(1) extra memory — the speed test is a sorted list of 1,000,000 elements with no valid pair, which a nested loop cannot finish.', {
      fn: 'solve',
      starter: 'def solve(arr, target):\n    i, j = 0, len(arr) - 1\n    while i < j:\n        s = arr[i] + arr[j]\n        # equal: return the pair. too small: i += 1. too big: j -= 1.\n        pass\n    return None\n',
      tests: [
        { args: [[1, 2, 4, 7, 11], 9], expect: [1, 3], name: '2 + 7 = 9' },
        { args: [[1, 2, 4, 7, 11], 100], expect: null, name: 'no pair exists' },
        { args: [[], 3], expect: null, name: 'empty list' },
        { args: [[3], 6], expect: null, name: 'one element cannot pair with itself' },
        { args: [[2, 2, 2], 4], expect: [0, 2], name: 'all equal: the outermost pair is reached first' },
        { args: [[-5, -1, 0, 3, 8], -6], expect: [0, 1], name: 'negative values are fine: only the ordering matters' },
      ],
      gen: 'def gen():\n    for _ in range(8):\n        arr = sorted(random.randint(0, 20) for _ in range(random.randint(0, 9)))\n        yield (arr, random.randint(0, 40))',
      checker: 'def check(args, got, expect):\n    arr, target = args\n    if expect is None:\n        return got is None\n    if got is None or len(got) != 2: return False\n    i, j = got\n    return 0 <= i < j < len(arr) and arr[i] + arr[j] == target',
      refCode: 'def ref(arr, target):\n    n = len(arr)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if arr[i] + arr[j] == target: return [i, j]\n    return None',
      speed: { gen: 'def gen():\n    arr = sorted(random.randint(0, 10**9) for _ in range(1000000))\n    return [arr, -1]', budgetMs: 1500, label: '1,000,000 elements, no pair' },
      solution: 'def solve(arr, target):\n    i, j = 0, len(arr) - 1\n    while i < j:\n        s = arr[i] + arr[j]\n        if s == target:\n            return [i, j]\n        if s < target:\n            i += 1\n        else:\n            j -= 1\n    return None'
    }, 'Any valid pair is accepted: the checker verifies the sum rather than the exact indices, because a correct scan can legitimately land on a different pair when several exist. Note that negative numbers cause no trouble here — the argument only ever used the *order* of the values, never their sign.'),
    q.mc('A', 'Interview: extend pair sum to **triples** that add to a target, in a sorted list. What is the standard approach and its cost?', ['Fix the first element with an outer loop and run a two-pointer scan on the rest for the remaining target: O(n²) time, O(1) extra space', 'Three nested loops, O(n³), which cannot be improved', 'Three pointers all moving inwards at once, O(n)', 'Build a hash map of triples, O(n) time'], 0, 'Each of the n choices of first element leaves a pair-sum problem solved in O(n). Sorting first costs O(n log n), which is dominated by the O(n²) scan.'),
    q.mc('A', 'Interview: a candidate uses two pointers to find a pair summing to a target, but sorts a list of (value, original_index) pairs first and returns the sorted positions. What is the bug, and the fix?', ['The returned indices are positions in the sorted list, not in the caller\'s original list; carry the original index alongside each value and return those', 'Sorting breaks the two-pointer proof, so the whole approach is invalid', 'The sort makes it O(n²)', 'There is no bug'], 0, 'A classic interview trip-up: sorting destroys the caller\'s indexing. Either return the values, or pair each value with where it came from before sorting.'),

    // =====================================================================================================
    // MATHS (M08 L2): Little's law
    // =====================================================================================================
    q.info('M', "Little's law is an area, counted two ways", `Draw two staircases against time. **A(t)** counts everything that has entered by time t; **D(t)** counts everything that has left. Both only ever go up, and D never gets ahead of A.

Two readings of the same picture:

- At any instant, the **vertical** gap A(t) − D(t) is how many items are inside right now.
- For any one item, the **horizontal** gap between its arrival step and its departure step is how long it stayed.

Now measure the **area** between the two staircases. Sweeping it vertically, it is the sum over all time of "how many were inside", which is (average number inside) × (total time) = L × T. Sweeping it horizontally, it is the sum over all items of "how long each stayed", which is N × W, where W is the average stay.

The same area, so L × T = N × W. Divide by T and note that N/T is the arrival rate λ:

**L = λ · W.**

That is the whole proof. No assumption about arrival patterns, service times or how many servers there are — just a picture measured two ways.`, {
      terms: [
        ['A(t) / D(t)', 'Cumulative arrivals and cumulative departures up to time t. Both non-decreasing staircases.'],
        ['L', 'Average number of items inside the boundary.'],
        ['λ (lambda)', 'Average arrival rate: items entering per unit time. Equals the departure rate in a stable system.'],
        ['W', 'Average time an item spends inside the boundary.'],
      ],
      widget: W('arrivals', { gap: 2, w: 5 })
    }),
    q.goal('M', 'In the arrivals/departures staircase picture, set the time each item stays to **8 cycles or more** and check that λ × W still comes out equal to L.', W('arrivals', { gap: 2, w: 3 }), s => s.w >= 8,
      'Widening the horizontal gaps widens the shaded area in exact proportion, so L rises by the same factor. The identity is not a model that could be wrong; it is the same area divided two ways.'),
    q.info('M', 'What you must declare, and what the law does not tell you', `Little's law is an accounting identity, so the only way to get it wrong is to be sloppy about the accounting.

**Declare the boundary.** "Inside" must mean the same thing in L and in W. Draw a box around the queue only, and W is the waiting time. Draw it around the queue **and** the server, and W is waiting plus service — a different, larger number, with a correspondingly larger L. Neither is wrong; mixing them is.

**The system must be stable.** Over the window you measure, what goes in must come out; nothing may pile up for ever. Otherwise L keeps growing and there is no average to speak of.

**Count the same items in both.** If some items are dropped rather than served, decide whether they are inside the boundary at all, and keep that choice consistent.

And here is what the law does **not** say. It says nothing about the distribution of waits, nothing about the peak occupancy, and nothing about how big a buffer must be. Averages are all it deals in. Sizing a buffer needs a burst bound, which is the topic tomorrow.`, {
      terms: [
        ['Boundary', 'Exactly what counts as "inside". Must be identical in the definitions of L and W.'],
        ['Stable system', 'Backlog does not grow without bound: over the long run, departures keep up with arrivals.'],
        ['Accounting identity', 'A statement true by definition, not a model that could be falsified by data.'],
      ]
    }),
    q.info('M', 'Using it backwards to size things', `The most useful way to apply L = λW is to work out whichever of the three you cannot measure.

**How long did it stay?** A pipeline stage holds 40 items on average and passes 20 million items per second. W = L/λ = 40 / (20 × 10⁶) = **2 µs** inside that stage.

**How many are inside?** A stage that accepts 100 million items/s and holds each for 5 µs contains L = 10⁸ × 5 × 10⁻⁶ = **500 items** on average. If your buffer is 64 deep, you have just proved the design cannot work at that rate.

**How much data is in flight?** A 10 Gbit/s link with a 40 µs round trip has L = 10¹⁰ × 40 × 10⁻⁶ = 400,000 bits = **50 kB** of data in the air at any moment. That is why a sender needs at least 50 kB of un-acknowledged window to keep such a link busy — the same identity, in networking clothes.

Same three letters every time. The skill is choosing the boundary so that the number you want is the one you do not know.`, {
      terms: [
        ['In-flight data', 'Bytes sent but not yet acknowledged: rate × round-trip time.'],
        ['Bandwidth-delay product', 'The networking name for λW when the items are bits.'],
        ['Sizing backwards', 'Fixing two of L, λ, W from requirements and reading off the third.'],
      ]
    }),
    q.num('M', 'A pipeline stage holds 40 items on average and passes 20 million items per second. How long does an item spend inside, in µs?', 2, 'W = L/λ = 40 / (20 × 10⁶ s⁻¹) = 2 × 10⁻⁶ s = 2 µs.', { unit: 'µs' }),
    q.num('M', 'A queue holds 6 items on average and customers arrive at 3 per second. What is the average time a customer spends in it, in seconds?', 2, 'W = L/λ = 6/3 = 2 s. Note this counts time inside whatever boundary "the queue" means — say so when you report it.', { unit: 's' }),
    q.num('M', 'Items spend 5 µs inside a stage that accepts 100 million items per second. What is the average number of items inside?', 500, 'L = λW = 10⁸ × 5 × 10⁻⁶ = 500 items. A 64-deep buffer could not sustain this.'),
    q.mc('M', "Little's law L = λW requires which assumptions?", ['A stable system and one consistent boundary for what counts as "inside" — nothing about arrival or service distributions', 'Poisson arrivals', 'Exponential service times', 'A single server with first-come-first-served order'], 0, 'It is derived by measuring one area two ways, so no distributional assumption enters. That generality is exactly why it is so useful.'),
    q.mc('M', 'A team measures average occupancy L around the queue **and the server together**, but measures W as waiting time in the queue **only**. What happens?', ['The two do not match, and λ = L/W comes out wrong: L and W must be defined over the same boundary', 'Nothing: the law holds for any pair of measurements', 'Only the units change', 'The result is right but the confidence interval widens'], 0, 'This is the commonest misuse. Fix the box first, then define both L and W with respect to that box.'),
    q.num('M', 'Interview: a 10 Gbit/s link has a 40 µs round-trip time. How many **kilobytes** of data are in flight at any instant (take 1 kB = 1000 bytes)?', 50, 'L = λW = 10 × 10⁹ bits/s × 40 × 10⁻⁶ s = 400,000 bits = 50,000 bytes = 50 kB. A sender with a smaller un-acknowledged window would leave the link idle waiting for replies.', { unit: 'kB' }),
    q.num('M', 'Interview: a coffee shop has on average 20 customers inside, and a customer stays 15 minutes on average. How many customers walk in per hour?', 80, 'λ = L/W = 20 / (0.25 h) = 80 per hour. The same identity works for shops, queues, warehouses and pipeline stages.'),
    q.num('M', 'A processing stage holds 12 items on average, and each item spends 3 µs inside it. What is the arrival rate, in **million items per second**?', 4, 'λ = L/W = 12 / (3 × 10⁻⁶ s) = 4 × 10⁶ items/s = 4 million per second.'),
    q.tf('M', 'In a stable system measured over a long window, the average arrival rate and the average departure rate are the same number.', true, 'Stability means nothing accumulates for ever, so A(t) and D(t) rise at the same long-run rate. That is why λ can be measured at either end of the box.'),
    q.mc('M', 'Interview: a colleague argues "our average occupancy is 3 items and Little\'s law is exact, so an 8-deep buffer is certainly enough". What is the flaw?', ['Little\'s law is about averages only; it says nothing about the peak, and a bursty arrival pattern with the same mean can overflow any fixed buffer', 'Little\'s law does not apply to hardware buffers', 'The average should have been the median', 'Occupancy of 3 means the buffer must be at least 6 deep, so the arithmetic is wrong'], 0, 'Averages do not bound peaks. Sizing needs a bound on arrivals over an interval plus a service guarantee, not a mean.'),

    // =====================================================================================================
    // DEGREE (MATH19611 / E02 L4): second-order systems and damping
    // =====================================================================================================
    q.info('E', 'Two energy stores are what make something oscillate', `A first-order circuit — one resistor and one capacitor — can only decay towards its final value. It has one place to keep energy, so once the energy is leaving, it just leaves.

Give a system **two** different stores and something new happens: the energy can move back and forth between them. A mass on a spring swaps kinetic energy for stretch energy. In a circuit, an inductor stores energy in a magnetic field as ½L·i², and a capacitor stores it in an electric field as ½C·v². The inductor's store is largest when the current is largest, and the capacitor's when the voltage is largest, and those two moments are a quarter cycle apart. So the energy sloshes: current charges the capacitor, the charged capacitor drives current back the other way, and round it goes.

The resistor is the friction. Every pass, some energy leaves as heat and never comes back. **How fast it leaves compared with how fast the energy sloshes is the single number that decides what the response looks like** — and that number is the damping ratio.`, {
      terms: [
        ['Second-order system', 'One whose behaviour needs two stored quantities to describe: an RLC circuit, a mass on a spring, a servo.'],
        ['Energy exchange', 'The back-and-forth transfer between the two stores. This is what oscillation physically is.'],
        ['Damping', 'The loss mechanism (resistance, friction) that removes energy from the exchange each cycle.'],
      ]
    }),
    q.info('E', 'Deriving the standard form from a series RLC', `Take a voltage source V in series with R, L and C, and call the capacitor voltage v. Two facts: the current through a capacitor is i = C·dv/dt, and going round the loop, L·di/dt + R·i + v = V.

Substitute i = C·dv/dt into the loop equation:

LC·v″ + RC·v′ + v = V, so **v″ + (R/L)·v′ + (1/LC)·v = V/(LC).**

Everyone writes second-order systems in one agreed shape so that the numbers can be compared across mechanical, electrical and control problems:

**y″ + 2ζωₙ·y′ + ωₙ²·y = ωₙ²·u.**

Match the two, term by term. The coefficient of y gives **ωₙ = 1/√(LC)**, the **natural frequency** in rad/s: how fast it would oscillate with no resistance at all. The coefficient of y′ gives 2ζωₙ = R/L, so

**ζ = R/(2Lωₙ) = (R/2)·√(C/L),**

the **damping ratio** — and notice it has no units. That is the point of writing it this way: ζ compares the loss to the oscillation, so a value of 0.3 means the same thing in a circuit, a suspension and a servo loop.`, {
      terms: [
        ['Natural frequency ωₙ', 'The undamped oscillation rate, in rad/s. For a series RLC, 1/√(LC).'],
        ['Damping ratio ζ', 'A dimensionless comparison of loss to oscillation. For a series RLC, (R/2)√(C/L).'],
        ['Standard form', 'y″ + 2ζωₙy′ + ωₙ²y = ωₙ²u. The agreed shape that makes ζ and ωₙ readable at a glance.'],
        ['Characteristic equation', 's² + 2ζωₙs + ωₙ² = 0, whose roots (the poles) decide the shape of the response.'],
      ]
    }),
    q.info('E', 'The three regimes, and what each looks like', `Solve s² + 2ζωₙs + ωₙ² = 0 and you get **s = −ζωₙ ± ωₙ√(ζ² − 1)**. Everything follows from whether that square root is imaginary, zero or real.

**ζ < 1, underdamped.** The root is imaginary, so the poles are a complex pair. The response overshoots its target and rings at ωd = ωₙ√(1 − ζ²) while decaying as e^(−ζωₙt). The peak overshoot is e^(−πζ/√(1 − ζ²)): 16% at ζ = 0.5, 4.3% at ζ = 0.707, 35% at ζ = 0.316. Physically: the resistor is not draining energy fast enough to stop the sloshing.

**ζ = 1, critically damped.** The two roots collide at −ωₙ. This is the **fastest** approach to the final value with **no** overshoot at all — the boundary case, not a compromise.

**ζ > 1, overdamped.** Two real roots, one slow and one fast, and the slow one dominates. No overshoot, but sluggish: too much resistance drags the response out.

For settling, a handy figure is the 2% settling time ≈ 4/(ζωₙ), because the envelope decays as e^(−ζωₙt).

A system is stable when every pole has a **negative real part**, which here means ζ > 0: any real resistance at all.`, {
      terms: [
        ['Underdamped / critically damped / overdamped', 'ζ < 1 (rings), ζ = 1 (fastest with no overshoot), ζ > 1 (slow and smooth).'],
        ['Poles', 'Roots of the characteristic equation. Real part sets the decay rate, imaginary part the ringing frequency.'],
        ['Damped frequency ωd', 'ωₙ√(1 − ζ²): the rate the underdamped response actually rings at, always below ωₙ.'],
        ['Overshoot', 'How far past the final value the first peak goes, as a fraction: e^(−πζ/√(1 − ζ²)).'],
        ['Settling time', 'Time to stay within a stated band of the final value. For 2%, about 4/(ζωₙ).'],
      ],
      widget: W('damping', { zeta: 0.3, wn: 10 })
    }),
    q.info('E', 'Choosing the damping you want', `Design usually runs the other way: you know what the response must look like and you pick a component.

Set ζ = 1 in ζ = (R/2)√(C/L) and solve for R: **R_crit = 2√(L/C)**. For L = 1 mH and C = 1 µF that is 2√1000 = 63.2 Ω. Below it the circuit rings, above it the response drags.

In practice ζ = 1 exactly is a knife edge — real components have tolerances, so a design aimed at exactly 1 lands on either side of it. Two common targets instead:

- **ζ ≈ 0.707** — about 4% overshoot with a fast rise, the usual choice when a little overshoot is harmless. It is also the value that keeps the frequency response as flat as possible.
- **ζ slightly above 1** when overshoot is genuinely forbidden, for example a voltage that must never exceed a rail.

The related word you will meet is the **quality factor Q = 1/(2ζ)**: high Q means a sharp, ringing, narrowband response, low Q means a broad damped one. A resonant filter wants high Q; a power supply's output step wants low.`, {
      terms: [
        ['Critical resistance', 'R = 2√(L/C): the series resistance that makes ζ exactly 1.'],
        ['ζ = 0.707', 'The common design target: ~4% overshoot, fast, and the flattest frequency response.'],
        ['Quality factor Q', '1/(2ζ). High Q = sharp and ringing; low Q = broad and damped.'],
        ['Tolerance', 'Real parts vary by a few percent, so a design must work over a range of ζ, not at one exact value.'],
      ]
    }),
    q.mc('E', 'A second-order system has a damping ratio ζ = 0.3. What does its step response look like?', ['It overshoots the final value and rings before settling: underdamped, because the poles are a complex pair', 'It rises to the final value as fast as possible with no overshoot', 'It creeps slowly to the final value with no overshoot', 'It grows without bound'], 0, 'ζ < 1 makes √(ζ² − 1) imaginary, so the poles are complex and the response oscillates inside a decaying envelope.'),
    q.num('E', 'A second-order system has a damping ratio ζ = 0.5. What is its percentage overshoot, to the nearest whole percent?', 16, 'Overshoot = e^(−πζ/√(1 − ζ²)) = e^(−π × 0.5/√0.75) = e^(−1.814) = 0.163, i.e. 16%.', { unit: '%', tol: 1 }),
    q.num('E', 'A series RLC circuit has L = 1 mH and C = 1 µF. What is its natural frequency ωₙ, in rad/s?', 31623, 'ωₙ = 1/√(LC) = 1/√(10⁻³ × 10⁻⁶) = 1/√(10⁻⁹) = 31,623 rad/s, which is about 5.03 kHz.', { unit: 'rad/s', tol: 50 }),
    q.num('E', 'A series RLC circuit has R = 20 Ω, L = 10 mH and C = 10 µF. What is its damping ratio ζ, to 3 d.p.?', 0.316, 'ζ = (R/2)√(C/L) = 10 × √(10⁻⁵/10⁻²) = 10 × √(10⁻³) = 10 × 0.03162 = 0.316. Under 1, so it will ring.', { tol: 0.005 }),
    q.mc('E', 'A continuous-time second-order system is stable when…', ['every pole has a negative real part (all poles in the left half-plane)', 'every pole lies inside the unit circle', 'ζ is exactly 1', 'ωₙ is large enough'], 0, 'The response terms go as e^(st), so a negative real part means decay. "Inside the unit circle" is the discrete-time criterion; mixing the two is a category error.'),
    q.num('E', 'A series RLC circuit has L = 1 mH and C = 1 µF. What series resistance, in ohms (1 d.p.), makes it exactly critically damped?', 63.2, 'Set ζ = (R/2)√(C/L) = 1, so R = 2√(L/C) = 2√(10⁻³/10⁻⁶) = 2√1000 = 63.25 Ω. Below that it overshoots; above it, it is sluggish.', { unit: 'Ω', tol: 0.4 }),
    q.mc('E', 'Why do designers often aim for ζ ≈ 0.707 rather than exactly 1?', ['It is much faster than critical damping for only about 4% overshoot, and ζ = 1 is a knife edge that component tolerances will not hold anyway', 'ζ = 1 is unstable', 'ζ = 0.707 removes all overshoot', '0.707 makes the natural frequency higher'], 0, 'Critical damping is the boundary case, not a robust target. 0.707 is fast, has small overshoot, and gives the flattest frequency response.'),
    q.num('E', 'Exam-style: a series RLC circuit has R = 100 Ω, L = 50 mH and C = 0.2 µF. Calculate the natural frequency ωₙ, in rad/s.', 10000, 'ωₙ = 1/√(LC) = 1/√(50 × 10⁻³ × 0.2 × 10⁻⁶) = 1/√(10⁻⁸) = 10⁴ rad/s (1.59 kHz).', { unit: 'rad/s', tol: 30 }),
    q.num('E', 'Exam-style: a series RLC circuit has R = 100 Ω, L = 50 mH and C = 0.2 µF. Calculate its damping ratio ζ, to 3 d.p.', 0.1, 'ζ = (R/2)√(C/L) = 50 × √(0.2 × 10⁻⁶ / 50 × 10⁻³) = 50 × √(4 × 10⁻⁶) = 50 × 2 × 10⁻³ = 0.100. Very lightly damped: expect a lot of ringing.', { tol: 0.004 }),
    q.num('E', 'Exam-style: a series RLC circuit with R = 100 Ω, L = 50 mH and C = 0.2 µF has ωₙ = 10⁴ rad/s and ζ = 0.1. Calculate the frequency at which its step response actually rings, ωd, in rad/s (nearest whole).', 9950, 'ωd = ωₙ√(1 − ζ²) = 10⁴ × √0.99 = 10⁴ × 0.99499 = 9950 rad/s. Light damping barely changes the ringing frequency; it changes how long the ringing lasts.', { unit: 'rad/s', tol: 25 }),
    q.num('E', 'Exam-style: a second-order step response has ζ = 0.1 and ωₙ = 10⁴ rad/s. Calculate the 2% settling time, in milliseconds (1 d.p.), using the standard estimate 4/(ζωₙ).', 4, 'The envelope decays as e^(−ζωₙt), and 4 time constants take it to about 2%. Settling time ≈ 4/(0.1 × 10⁴) = 4 × 10⁻³ s = 4.0 ms. Raising ζ to 1 would cut it to 0.4 ms.', { unit: 'ms', tol: 0.15 }),
    q.num('E', 'An inductor of 10 mH is carrying a current of 2 A. How much energy is stored in its magnetic field, in millijoules?', 20, 'w = ½L·i² = 0.5 × 0.01 H × 4 A² = 0.02 J = 20 mJ. This is the store that is fullest when the current peaks.', { unit: 'mJ' }),
    q.num('E', 'A 10 µF capacitor is charged to 100 V. How much energy is stored in its electric field, in millijoules?', 50, 'w = ½C·v² = 0.5 × 10 × 10⁻⁶ F × (100 V)² = 0.05 J = 50 mJ. This store is fullest a quarter cycle away from the inductor\'s, which is what makes the energy slosh.', { unit: 'mJ' }),
    q.mc('E', 'A second-order system has ζ = 2. Describe its step response and its poles.', ['Two distinct real negative poles and no overshoot at all; the slower pole dominates, so it reaches its final value sluggishly', 'A complex pair of poles with heavy ringing', 'Two equal real poles and the fastest possible response without overshoot', 'Poles in the right half-plane, so it is unstable'], 0, 'ζ > 1 makes √(ζ² − 1) real, so s = −ζωₙ ± ωₙ√(ζ² − 1) gives two real roots. No oscillation, but the response is slower than critical damping.'),
    q.num('E', 'A series RLC circuit with R = 20 Ω, L = 10 mH and C = 10 µF has ζ = 0.316. What is its percentage overshoot on a step input, to the nearest whole percent?', 35, 'Overshoot = e^(−πζ/√(1 − ζ²)) = e^(−π × 0.316/0.9487) = e^(−1.047) = 0.351, i.e. 35%.', { unit: '%', tol: 1.5 }),
    q.num('E', 'Exam-style: a second-order system has natural frequency ωₙ = 10 rad/s and damping ratio ζ = 0.6. Calculate the damped ringing frequency ωd, in rad/s.', 8, 'ωd = ωₙ√(1 − ζ²) = 10 × √(1 − 0.36) = 10 × 0.8 = 8 rad/s.', { unit: 'rad/s', tol: 0.1 }),
    q.num('E', 'Exam-style: a second-order system has natural frequency ωₙ = 10 rad/s and damping ratio ζ = 0.6. Calculate its percentage overshoot on a unit step, to 1 d.p.', 9.5, 'Overshoot = e^(−πζ/√(1 − ζ²)) = e^(−π × 0.6/0.8) = e^(−2.356) = 0.0948, i.e. 9.5%.', { unit: '%', tol: 0.4 }),
    q.num('E', 'Exam-style: a second-order system has natural frequency ωₙ = 10 rad/s and damping ratio ζ = 0.6. Estimate its 2% settling time, in seconds (2 d.p.), using 4/(ζωₙ).', 0.67, 'The decay envelope is e^(−ζωₙt) with ζωₙ = 6 s⁻¹, so four time constants take 4/6 = 0.67 s.', { unit: 's', tol: 0.02 }),
    ...genius(q, 24),
  ]
};
