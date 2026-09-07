import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(27);

export default {
  title: 'FIFOs, stacks & brackets, waiting for HH, Norton & source transformation',
  emoji: '🔃',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook H04 L1/L2. **Hardware**: the synchronous FIFO built from a memory array and two pointers that chase each other round a ring, why equal pointers are ambiguous, what the contract must say at full and empty and when push and pop land together, and a cycle-level model you write and test. **Code** (A03 L1): the stack, why nesting needs last-in-first-out, the three ways brackets can be wrong, and a validator that reports the first error position. **Maths** (M06 L2): why waiting problems need states, first-step conditioning, the expected wait for HH derived rather than recalled, and why HT is quicker. **Degree** (E01): the Norton equivalent derived from Thévenin, source transformation as a simplification tool, finding an equivalent from two measurements, and maximum power transfer derived by differentiating.',
  takeaway: 'A FIFO is memory plus a write pointer, a read pointer and a count; both pointers wrap with modulo depth. Equal pointers mean empty or full, so you need a count (or an extra bit). Pop before push in the same cycle and a full one-slot FIFO still runs at full rate. A stack matches each closer to the most recent unmatched opener, so store the index with the opener and you can report exactly where the error is. E[flips to HH] = 6 from E₀ = 1 + ½E₀ + ½E₁ and E₁ = 1 + ½E₀; E[HT] = 4, yet each is equally likely to appear first. Norton: I_N = V_th/R_th with the same resistance. Maximum power at R_L = R_th, where P = V_th²/(4R_th) and efficiency is exactly 50 %.',
  steps: [
    // =====================================================================================================
    // HARDWARE: the synchronous FIFO (H04 L1/L2)
    // =====================================================================================================
    q.info('H', 'A queue built from memory and two pointers', `A **FIFO** is a queue in hardware: items come out in the order they went in. You could build one by shuffling every stored item forward each time something leaves, but that means rewriting the whole array every cycle, which costs power and does not scale.

The real design leaves the data still and moves two small numbers instead.

- The **write pointer** says which slot the next push will fill.
- The **read pointer** says which slot holds the oldest item, the one the next pop takes.

Push: write at the write pointer, then advance it. Pop: read at the read pointer, then advance it. Neither pointer ever goes backwards, so the read pointer chases the write pointer round the array forever. When a pointer runs off the end it goes back to slot 0: \`ptr = (ptr + 1) % depth\`. That is the same modulo wrap as a counter, and it turns a plain array into a **ring**.

The number of stored items is the gap between the pointers. Keep it in a **count** register that goes up on an accepted push and down on an accepted pop, and two flags fall out: **empty** when count is 0, **full** when count equals the depth.

Push and pop the ring below and watch the two pointers move.`, {
      terms: [
        ['FIFO', 'First in, first out: a queue. Items leave in the order they arrived.'],
        ['Write pointer (wr)', 'Index of the slot the next push will write.'],
        ['Read pointer (rd)', 'Index of the slot holding the oldest item, which the next pop will take.'],
        ['Ring buffer', 'A fixed array used in a circle: after the last slot comes slot 0 again, via index % depth.'],
        ['Count register', 'How many items are stored. Up on an accepted push, down on an accepted pop.'],
        ['Full / empty', 'count == depth / count == 0. These drive whether the FIFO can accept and whether it has anything to offer.'],
      ],
      widget: W('fifo', { depth: 8, initial: 3 })
    }),
    q.info('H', 'Why equal pointers are ambiguous', `Here is the trap that catches everyone who tries to save the count register.

The pointers start equal, at slot 0, with the FIFO empty. Push until the FIFO is full: the write pointer has gone all the way round and landed back on slot 0, so the pointers are **equal again**. Empty and full both look identical from the pointers alone.

It has to be that way, and the reason is a counting argument. A depth-8 FIFO has **nine** possible occupancies (0 to 8 inclusive), but two 3-bit pointers can only describe 8 different gaps between them. Nine states will not fit into eight, so one more bit of information is needed from somewhere.

Two places to get it.

- A **count register**: log₂(depth) + 1 bits holding the occupancy directly. Simple to read, simple to test, and full and empty are one comparison each.
- One **extra bit on each pointer**, which is what Day 29 develops. It costs two bits instead of a whole counter and it survives being carried across clock domains, which a count cannot.

Both are correct. What is not correct is trusting the pointers alone: that bug shows up as a FIFO that silently reports empty when it is actually full, and it will not appear in a short test that never fills it.`, {
      terms: [
        ['Ambiguous pointers', 'wr == rd happens both when the FIFO is empty and when it is completely full.'],
        ['State counting', 'A depth-d FIFO has d + 1 occupancies but only d distinct pointer gaps, so one extra bit is unavoidable.'],
        ['Count register', 'One way to supply that bit: store the occupancy in log₂(depth) + 1 bits.'],
        ['Wrap bit', 'The other way: an extra most significant bit on each pointer that toggles on every wrap (Day 29).'],
      ]
    }),
    q.info('H', 'The contract at the edges', `Most FIFO bugs live at full and empty, so decide what happens there before writing a line of RTL, and write it into the model as well.

**Push while full.** The right answer is to refuse it, and to have said so in advance: the FIFO drives \`in_ready = 0\` when it is full, and the source must hold its data and its valid until ready comes back. Overwriting the oldest item instead is silent data loss; growing is not an option in hardware.

**Pop while empty.** Refuse it the same way, by driving \`out_valid = 0\`. A pop that is taken anyway returns whatever stale bits are in memory, and the reader has no way to know.

**Push and pop in the same cycle.** This is the interesting one, and it is where a contract earns its keep. If you apply the **pop first**, it frees a slot, so a push into a full FIFO succeeds and the occupancy stays put. If you check the push against the occupancy at the start of the cycle instead, a full FIFO refuses the push and the throughput halves whenever the FIFO happens to be full. Both are implementable; only one is fast, and neither is obvious to the person reading your code. Say which.

Worked trace, depth 8 starting at occupancy 3: push, then push and pop together, then pop, then nothing. Occupancies **4, 4, 3, 3**.`, {
      terms: [
        ['in_ready', 'The FIFO\'s "I can accept" signal: low when full.'],
        ['out_valid', 'The FIFO\'s "I have something for you" signal: low when empty.'],
        ['Refuse, do not overwrite', 'A full FIFO rejects the push. Overwriting loses data that the handshake existed to protect.'],
        ['Simultaneous push and pop', 'Legal at any occupancy if the pop is applied first. State this in the contract; do not leave it to the reader.'],
      ]
    }),
    q.info('H', 'Depth is not free, and not every depth is the same', `A FIFO stores depth × width bits, and where those bits live changes the design.

**Small depths become flip-flops.** A depth-2 or depth-4 FIFO is usually built from registers and a multiplexer. It reads out combinationally, so the item is available the same cycle you ask for it.

**Larger depths become block RAM.** An FPGA has dedicated memory blocks, and the synthesis tool will infer one if your code looks like a memory: an array written on the clock edge and read through a registered address. That saves a great deal of logic, but it brings **read latency**: you present the address in one cycle and the data appears in the next. Your FIFO must either add a cycle of output latency or keep a small register in front to hide it.

**And not every depth maps neatly.** Block RAMs come in fixed sizes. A depth of 7 does not fill one, and the tool may either round up to a whole block or give up and build it from flip-flops. The handbook is blunt about this: build the FIFO at depths 1, 2, 7 and 16, then look at the implementation report rather than assuming.

The point is not the exact numbers, which change with every device. It is the habit: after synthesis, read what the tool actually built.`, {
      terms: [
        ['Block RAM (BRAM)', 'A dedicated memory block inside an FPGA. Far cheaper than flip-flops for large arrays.'],
        ['Inference', 'Writing RTL that looks like a memory so the tool chooses a BRAM for you, rather than instantiating one by hand.'],
        ['Read latency', 'A synchronous memory returns data one cycle after the address. Flip-flop storage does not.'],
        ['Implementation report', 'The tool\'s account of what it actually built: how many BRAMs, how many flip-flops, at what depth.'],
      ]
    }),
    q.goal('H', 'The FIFO below is depth 8 and starts at occupancy 3. Perform, in order: push, then push and pop together, then pop, then no-op. You should finish back at occupancy 3.', W('fifo', { depth: 8, initial: 3 }), s => s.ops >= 4 && s.count === 3,
      'The occupancies are 4, 4, 3, 3. The middle step is the one worth watching: a simultaneous push and pop moves both pointers on by one and leaves the count exactly where it was.'),
    q.tokens('H', 'A depth-8 FIFO holds 3 items. It then performs, in order: a push; a push and a pop in the same cycle; a pop; and no operation. Give the occupancy after each of those four cycles.', ['4', '4', '3', '3'], ['5', '2', '6'], 'Push adds one (4). Push and pop together cancel out (still 4). Pop removes one (3). No operation changes nothing (3). This is the handbook\'s worked checkpoint for H04.', { mono: true }),
    q.num('H', 'A FIFO has depth 8 and its read pointer currently holds the value 7. After the next accepted pop, what value does the read pointer hold?', 0, 'The pointer advances with (7 + 1) % 8 = 0: it wraps back to the start of the array. That modulo is what turns a fixed array into a ring, so the queue never runs off the end no matter how many items pass through.'),
    q.mc('H', 'In a FIFO the write and read pointers are found to be equal. What does that tell you?', ['Either the FIFO is empty or it is completely full: the pointers alone cannot distinguish the two', 'The FIFO is empty', 'The FIFO is full', 'The FIFO is exactly half full'], 0, 'Both states have the pointers on the same slot: empty because nothing has been written since the last read caught up, full because the write pointer has gone all the way round. Something extra, a count register or a wrap bit, has to break the tie.'),
    q.num('H', 'How many different occupancy values can a depth-16 FIFO have, counting empty and full?', 17, '0 through 16 inclusive is 17 values. Four-bit pointers give only 16 distinguishable gaps, which is exactly why the pointers alone cannot represent every state and one more bit is needed.'),
    q.num('H', 'A count register must hold every possible occupancy of a depth-16 FIFO. How many bits wide must it be?', 5, 'It must represent 0 to 16, and 16 needs a bit of weight 16, so 4 bits (max 15) is not enough and 5 bits (max 31) is. The "+1" over log₂(depth) exists solely so that "full" is representable.', { unit: 'bits' }),
    q.mc('H', 'A push arrives at a FIFO that is already full, with no pop in the same cycle. Under a sound contract, what happens?', ['The push is refused: the FIFO had already lowered in_ready, and the source must hold its data and valid until ready returns', 'The oldest stored item is overwritten to make room', 'The newest item is dropped silently', 'The FIFO grows by one slot'], 0, 'The handshake exists to prevent loss. The FIFO announces "I cannot take anything" before the push arrives, and the source is required to wait. Any design that overwrites has thrown away the only protection it had.'),
    q.mc('H', 'A depth-4 FIFO is full when a push and a pop arrive in the same cycle. What should happen, and why?', ['Both succeed if the contract applies the pop first: the pop frees a slot for the push, so the occupancy stays at 4 and throughput is maintained', 'The push must be refused because the FIFO was full at the start of the cycle', 'The pop must be refused', 'Both must be refused to avoid a race'], 0, 'Applying the pop first is what keeps a full FIFO running at one item per cycle, which is the whole reason a streaming design tolerates a full FIFO at all. Checking the push against the start-of-cycle occupancy instead halves the throughput whenever the FIFO fills, and it is a legal design, so the contract has to say which one you built.'),
    q.mc('H', 'You write a depth-64 FIFO as an array written on the clock edge and read through a registered address, and the tool maps it to a block RAM. What changes about the design?', ['The read now has one cycle of latency, so the FIFO must add an output register or a small bypass to present data when it is asked for', 'Nothing: block RAM behaves exactly like flip-flops', 'The FIFO can no longer be full', 'The write pointer must count backwards'], 0, 'A synchronous memory gives data one cycle after the address. A flip-flop-based FIFO does not, so moving to block RAM silently changes the output timing. Either declare an extra cycle of latency or keep the head item in a register in front of the memory.'),
    q.code('H', 'Write a cycle-level FIFO model. `solve(depth, ops)` starts with an empty FIFO of that depth and applies one `[push, pop]` pair (each 0 or 1) per cycle. Accepted pushes store the items 1, 2, 3, … in order. Rules: apply the pop **first** — it is ignored if the FIFO is empty — then the push, which is refused if the FIFO is full at that moment. Return the dictionary `{"occupancy": [occupancy at the end of each cycle], "popped": [items popped, in order], "refused_pushes": count, "ignored_pops": count}`. Use a real ring: two pointers advanced with `% depth`, plus a count.', {
      fn: 'solve',
      starter: 'def solve(depth, ops):\n    mem = [None] * depth\n    wr = 0\n    rd = 0\n    count = 0\n    nxt = 1\n    occupancy = []\n    popped = []\n    refused = 0\n    ignored = 0\n    for push, pop in ops:\n        # pop first: if count is 0 it is ignored, otherwise take mem[rd] and advance rd\n        # then push: if count == depth it is refused, otherwise write nxt at wr and advance wr\n        occupancy.append(count)\n    return {"occupancy": occupancy, "popped": popped, "refused_pushes": refused, "ignored_pops": ignored}\n',
      tests: [
        { args: [8, [[1, 0], [1, 0], [1, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], expect: { occupancy: [1, 2, 3, 4, 4, 3, 3], popped: [1, 2], refused_pushes: 0, ignored_pops: 0 }, name: 'the handbook trace: fill to 3, then push, push+pop, pop, no-op' },
        { args: [2, [[1, 0], [1, 0], [1, 0]]], expect: { occupancy: [1, 2, 2], popped: [], refused_pushes: 1, ignored_pops: 0 }, name: 'the third push into two slots is refused' },
        { args: [2, [[1, 0], [1, 0], [1, 1]]], expect: { occupancy: [1, 2, 2], popped: [1], refused_pushes: 0, ignored_pops: 0 }, name: 'push and pop on a full FIFO: the pop frees the slot first' },
        { args: [3, [[0, 1], [1, 0], [0, 1], [0, 1]]], expect: { occupancy: [0, 1, 0, 0], popped: [1], refused_pushes: 0, ignored_pops: 2 }, name: 'pops on an empty FIFO are ignored, not fatal' },
        { args: [3, [[1, 0], [1, 0], [1, 0], [0, 1], [0, 1], [0, 1], [1, 0], [1, 0], [1, 0]]], expect: { occupancy: [1, 2, 3, 2, 1, 0, 1, 2, 3], popped: [1, 2, 3], refused_pushes: 0, ignored_pops: 0 }, name: 'both pointers wrap right round and the FIFO still works' },
        { args: [1, []], expect: { occupancy: [], popped: [], refused_pushes: 0, ignored_pops: 0 }, name: 'no operations at all' },
      ],
      gen: 'def gen():\n    for _ in range(12):\n        yield (random.randint(1, 4), [[random.randint(0, 1), random.randint(0, 1)] for _ in range(random.randint(0, 12))])',
      refCode: 'def ref(depth, ops):\n    q = []\n    nid = 1; occ = []; pop_list = []; ref_ = 0; ign = 0\n    for push, pop in ops:\n        if pop:\n            if q: pop_list.append(q.pop(0))\n            else: ign += 1\n        if push:\n            if len(q) < depth:\n                q.append(nid); nid += 1\n            else: ref_ += 1\n        occ.append(len(q))\n    return {"occupancy": occ, "popped": pop_list, "refused_pushes": ref_, "ignored_pops": ign}',
      solution: 'def solve(depth, ops):\n    mem = [None] * depth\n    wr = 0\n    rd = 0\n    count = 0\n    nxt = 1\n    occupancy = []\n    popped = []\n    refused = 0\n    ignored = 0\n    for push, pop in ops:\n        if pop == 1:\n            if count == 0:\n                ignored += 1\n            else:\n                popped.append(mem[rd])\n                rd = (rd + 1) % depth\n                count -= 1\n        if push == 1:\n            if count == depth:\n                refused += 1\n            else:\n                mem[wr] = nxt\n                nxt += 1\n                wr = (wr + 1) % depth\n                count += 1\n        occupancy.append(count)\n    return {"occupancy": occupancy, "popped": popped, "refused_pushes": refused, "ignored_pops": ignored}'
    }, 'The random cases are checked against a reference that uses a plain Python list as the queue, so your ring-pointer version has to agree with the obvious model on every trace. That is exactly what a scoreboard does in a real testbench: an independent, simpler description of the specification, run beside the design. Test 5 is the one that catches a missing `% depth`: without it a pointer runs past the end of the array. Test 3 encodes the pop-before-push contract, and test 4 makes "ignored" a counted, reported event rather than a crash.'),
    q.mc('H', 'Interview: a colleague removes the count register from a FIFO and reports full and empty from the pointers alone, saying it saves logic. What do you tell them?', ['A depth-d FIFO has d + 1 occupancies but only d distinct pointer gaps, so one extra bit is unavoidable: either keep the count or add a wrap bit to each pointer', 'It is fine as long as the depth is a power of two', 'It is fine as long as pushes and pops never happen in the same cycle', 'It is fine: full can be detected from the write pointer alone'], 0, 'This is a counting argument, not a matter of coding style. Nine states cannot be encoded in eight. The cheap fix is one extra bit on each pointer, which costs two bits instead of a whole counter and has the further advantage of surviving a clock-domain crossing.'),
    q.num('H', 'Interview: a source pushes one item per cycle into a FIFO for 100 consecutive cycles. During those same 100 cycles the sink accepts exactly 20 items. Starting from empty, what is the smallest depth that loses nothing?', 80, '100 items arrive and 20 leave, so 80 must be held: depth 80. The rate comparison is comforting and useless here — the sink could easily be fast enough on average — because what fills a buffer is the burst, not the average. Buffer sizing needs a bound on arrivals over an interval and a guaranteed service rate, not two long-run averages.', { unit: 'slots' }),
    q.mc('H', 'Interview: your FIFO passes thousands of random cycles but fails in the lab after an hour. Which untested behaviour is the most likely cause?', ['The full and wrap cases: random traffic with balanced push and pop rates almost never fills the FIFO or wraps the pointers, so those paths were never exercised', 'The clock frequency drifting', 'Reading the wrong data width', 'The reset polarity'], 0, 'Random tests concentrate on the easy middle of the state space. Full, empty and the wrap point are the corners, and they need directed tests: push until refused, pop until ignored, and run at least depth + 1 pushes so both pointers go round. A million cycles of comfortable traffic tell you very little about the corner that eventually happens.'),

    // =====================================================================================================
    // ALGORITHMS: stacks and brackets (A03 L1)
    // =====================================================================================================
    q.info('A', 'The stack, and why nesting needs one', `A **stack** has two operations: push an item on the top, and pop the item off the top. Last in, first out. In Python a list is already a stack: \`append\` pushes, \`pop()\` pops, and both are O(1).

Why is that the right shape for brackets? Look at what a closing bracket means. In \`{ [ ( ) ] }\` the \`)\` closes the \`(\`, which is the **most recent** opener still waiting. Not the first, not any other: the innermost one, which is by definition the one opened most recently. "Most recent unfinished thing" is exactly what the top of a stack holds.

That is the whole algorithm. Scan left to right; push every opener; on a closer, look at the top of the stack. If it is the matching opener, pop it and carry on. If it is not, or the stack is empty, you have found an error.

The same shape turns up everywhere the word "nested" appears: the call stack (the function that returns next is the one called most recently), undo history, HTML tags, expression evaluation, and depth-first search. When you see nesting, reach for a stack before you reach for anything else.`, {
      widget: W('stackbr', { s: '{[()]}(' }),
      terms: [
        ['Stack (LIFO)', 'Push and pop at one end only. Last in, first out. Python: list.append and list.pop.'],
        ['Top of stack', 'The most recently pushed item still there. For brackets, the innermost opener still waiting to be closed.'],
        ['Nesting', 'Structures inside structures, each closed before the one containing it. Always a stack.'],
        ['Stack depth', 'How many items are on it. For brackets, the current nesting depth.'],
      ]
    }),
    q.info('A', 'Three ways brackets go wrong, and where each is found', `A validator that returns True or False is easy. One that says **where** the problem is has to distinguish three different failures, and each is detected at a different moment.

**A closer with nothing open.** Scanning \`())\`, the second \`)\` finds an empty stack. There is no opener it could belong to, so the error is at that closer: index 2.

**A closer that does not match the top.** Scanning \`([)]\`, at index 2 the \`)\` sees \`[\` on top. Whatever the writer meant, the innermost open bracket is a square one, so the error is at index 2.

**Openers left over at the end.** Scanning \`{[((\`, the input runs out with four openers still on the stack. Nothing is wrong at any particular character; the fault is that the string ended. Which position do you report? The most useful answer is the **top of the stack**, the innermost unclosed opener at index 3, because that is where the reader's attention should go: everything after it was meant to be inside it.

Two implementation details make all of this easy. Push the **index alongside the character**, so a leftover can name its own position. And keep a dictionary mapping each closer to its opener, so matching is one lookup rather than a chain of ifs.`, {
      terms: [
        ['First error location', 'The index of the earliest character the scan cannot account for. Far more useful than a bare False.'],
        ['Unmatched closer', 'A closer with an empty stack, or one whose partner on top is the wrong kind. Reported at the closer.'],
        ['Unclosed opener', 'An opener still on the stack when the input ends. Reported at the top of the stack: the innermost one.'],
        ['Pair table', 'A dictionary from each closer to its opener, so the match test is one lookup.'],
      ]
    }),
    q.info('A', 'Cost, and the neighbours of this problem', `Each character is pushed at most once and popped at most once, so the scan is **O(n) time**. The extra memory is the stack, which is **O(n)** in the worst case: a string of n openers puts all n on the stack. There is no way to do better in general, because you genuinely have to remember every unclosed opener.

One special case is worth knowing. If there is only **one kind** of bracket, you do not need a stack at all: keep a counter, add one for \`(\`, subtract one for \`)\`, fail if it ever goes negative, and fail at the end if it is not zero. That is O(1) memory. The stack only earns its keep when there are several kinds and you must remember *which*.

The next structure along this road is the **monotonic stack**, which keeps only the items that could still matter and throws away the rest. That is how "the maximum in every window of length k" becomes linear instead of quadratic. It is the same discipline as here: each item enters once and leaves once, so the total work is linear even though a single step can pop many items.`, {
      terms: [
        ['O(n) time', 'Every character is pushed at most once and popped at most once.'],
        ['O(n) space', 'The stack, in the worst case of n consecutive openers.'],
        ['Counter trick', 'With one bracket kind, a single integer replaces the stack. Fail on negative, and on non-zero at the end.'],
        ['Monotonic stack', 'A stack that discards items that can no longer be the answer. The basis of linear-time sliding maxima.'],
        ['Amortised analysis', 'Bounding total work rather than per-step work: a step that pops five items is paid for by the five pushes.'],
      ]
    }),
    q.mc('A', 'Scanning the string "([)]" with a stack, where is the first error and why?', ['Index 2: the closer ")" meets "[" on top of the stack, so the innermost open bracket is the wrong kind', 'Index 0: the string starts with the wrong bracket', 'Index 3', 'There is no error: all four brackets are paired'], 0, 'Every bracket does have a partner of the right kind, but they interleave instead of nesting. A closer must match the most recent unmatched opener, and at index 2 that opener is a square bracket. Counting pairs is not enough; the order is the point.'),
    q.num('A', 'What is the maximum stack depth reached while scanning "((()))" with a bracket validator?', 3, 'Three openers are pushed before the first closer arrives, so the stack reaches 3 and then unwinds. Maximum stack depth is exactly the nesting depth of the string.'),
    q.mc('A', 'A validator scans "(()" and reaches the end of the string with one opener still on the stack. Which index should it report as the first error, and why?', ['Index 0: the leftover opener on top of the stack is the one at index 0, and it is the innermost unclosed bracket', 'Index 1', 'Index 2, where the string ends', 'No error: the brackets are balanced'], 0, 'The "(" at index 1 was closed by the ")" at index 2. What survives on the stack is the opener at index 0, which is therefore the innermost unclosed one. Reporting the end of the string would be technically true and useless; reporting the position of the bracket the reader must fix is what a compiler does.'),
    q.mc('A', 'Why does bracket matching need a stack rather than, say, a queue?', ['A closer must pair with the most recently opened bracket still waiting, and "most recent" is what the top of a stack holds; a queue would hand back the oldest', 'A queue would be too slow', 'A stack uses less memory', 'A queue cannot hold characters'], 0, 'Nesting means the innermost thing closes first, and innermost is the same as most recent. A queue gives first in, first out, which would pair "(" with the wrong closer as soon as anything is nested.'),
    q.tf('A', 'If a string contains only round brackets, a bracket validator can decide validity with a single integer counter instead of a stack.', true, 'Add one for "(", subtract one for ")", fail immediately if the counter goes below zero, and fail at the end if it is not zero. With one kind of bracket there is nothing to remember except how many are open. The moment a second kind appears you must remember which, and the stack comes back.'),
    q.code('A', 'Write `solve(s)` for a string containing only the characters `()[]{}`. Return `-1` if the brackets are valid. Otherwise return the index of the **first** error: for a closer with an empty stack or with a non-matching opener on top, the index of that closer; and if the string ends with openers still unclosed, the index of the **innermost** unclosed opener, which is the one on top of the stack. The empty string is valid. The speed test uses 400,000 characters.', {
      fn: 'solve',
      starter: 'PAIRS = {")": "(", "]": "[", "}": "{"}\n\ndef solve(s):\n    stack = []                  # store (character, index) so a leftover can name its position\n    for i, c in enumerate(s):\n        if c in "([{":\n            stack.append((c, i))\n        else:\n            # a closer: empty stack, or a top that does not match, means the error is at i\n            pass\n    # anything left on the stack is unclosed: report the top one\n    return -1\n',
      tests: [
        { args: ['([]{})'], expect: -1, name: 'properly nested and mixed' },
        { args: [''], expect: -1, name: 'the empty string is valid' },
        { args: ['([)]'], expect: 2, name: 'interleaved, not nested' },
        { args: ['())'], expect: 2, name: 'a closer with nothing open' },
        { args: ['(()'], expect: 0, name: 'unclosed: the survivor is the opener at index 0' },
        { args: ['((]'], expect: 2, name: 'wrong kind of closer' },
        { args: ['{[(('], expect: 3, name: 'several unclosed: report the innermost, on top of the stack' },
        { args: ['()()()'], expect: -1, name: 'flat sequence, never nested' },
      ],
      gen: 'def gen():\n    for _ in range(14):\n        yield ("".join(random.choice("()[]{}") for _ in range(random.randint(0, 9))),)',
      refCode: 'def ref(s):\n    P = {")": "(", "]": "[", "}": "{"}\n    st = []\n    for i, c in enumerate(s):\n        if c in "([{": st.append((c, i))\n        else:\n            if not st or st[-1][0] != P[c]: return i\n            st.pop()\n    return st[-1][1] if st else -1',
      speed: { gen: 'def gen():\n    return ["(" * 200000 + ")" * 200000]', budgetMs: 1500, label: '400,000 characters' },
      solution: 'PAIRS = {")": "(", "]": "[", "}": "{"}\n\ndef solve(s):\n    stack = []\n    for i, c in enumerate(s):\n        if c in "([{":\n            stack.append((c, i))\n        else:\n            if not stack or stack[-1][0] != PAIRS[c]:\n                return i\n            stack.pop()\n    return stack[-1][1] if stack else -1'
    }, 'Storing `(character, index)` rather than just the character is what lets the last line report a position: without the index, a leftover opener cannot say where it was. The speed test is 200,000 openers followed by 200,000 closers, which is the worst case for memory, and it still runs in one pass because each character is pushed once and popped once. A common wrong answer returns `len(s)` for unclosed brackets, which passes a True/False test suite and is useless to the person reading the error.'),
    q.mc('A', 'Interview: your bracket validator returns `len(s)` when the string ends with unclosed openers, and it passes every test. Why would a reviewer still reject it?', ['The reported position points past the end of the input instead of at the bracket the reader must fix, so the message is technically true and practically useless', 'It is too slow', 'It uses too much memory', 'len(s) can overflow'], 0, 'Error location is the feature. A compiler that said "something is unclosed, somewhere before the end of the file" would be unusable. Reporting the top of the stack points at the innermost unclosed bracket, which is where the fix belongs and where every real parser points.'),
    q.mc('A', 'Interview: what is the worst-case extra memory of a stack-based bracket validator on a string of length n, and can it be reduced?', ['O(n), reached by n consecutive openers; it cannot be reduced in general, though a single-bracket-kind input needs only a counter', 'O(1) always, because the stack only holds one item', 'O(log n), because of nesting', 'O(n²), because indices are stored too'], 0, 'A string of n openers puts all n on the stack, and each one genuinely must be remembered, because any of them could be closed by the wrong kind of bracket later. The only reduction available is the special case of one bracket kind, where "which opener" carries no information and a counter suffices.'),
    q.mc('A', 'Interview: you must report **every** unclosed opener in a file, not just the first. What changes in the algorithm?', ['Nothing until the end: the leftover stack already holds every unclosed opener with its index, so return them all instead of only the top one', 'You need a second pass over the string', 'You need a queue instead of a stack', 'You need to store the whole string a second time'], 0, 'The stack at the end of the scan is precisely the list of unclosed openers, in the order they were opened, each carrying its index because you stored it. Reporting all of them costs nothing extra, which is a good sign that storing the index was the right call in the first place.'),

    // =====================================================================================================
    // MATHS: expected waiting time for HH (M06 L2)
    // =====================================================================================================
    q.info('M', 'Waiting problems need states, and here is what a state is', `Flip a fair coin until you see two heads in a row. How many flips on average?

The temptation is to reach for a formula. Resist it, because there is a technique here that solves a whole family of problems, and the answer to this one is only worth having if it comes with the method.

The technique starts with a question: **what do I need to remember?** Not the whole history. If the last flip was a tail, it makes no difference whether you have been flipping for three throws or three hundred: you are back where you started. If the last flip was a head, you are one head away from finishing. Nothing else matters.

So there are only two situations to be in before you are done:

- **State 0**: no useful trailing head. Either you have just started, or the last flip was a tail.
- **State 1**: exactly one trailing head.

That is a **state**: a summary of the past that is enough to predict the future. Compressing an unbounded history into two labels is what makes the problem finite, and it is the same idea as the state of a hardware machine or the invariant of a loop.

Let E₀ and E₁ be the expected number of **further** flips from each state. Two unknowns, so you will need two equations.`, {
      widget: W('hhwalk', {}),
      terms: [
        ['State', 'A summary of the past that is enough to predict the future. Here: the length of the current run of heads.'],
        ['E₀, E₁', 'Expected number of further flips from state 0 and from state 1.'],
        ['Memoryless', 'Once you know the state, the earlier history changes nothing.'],
        ['Absorbing state', 'The finish line, HH here. Its expected remaining time is 0.'],
      ]
    }),
    q.info('M', 'First-step conditioning: one equation per state', `Now build the equations. From any state, take **one flip** and see where it lands you. That flip always costs 1, and then you are in a new state whose expected remaining time you already have a name for.

**From state 0.** Spend a flip. Heads (probability ½) puts you in state 1; tails (probability ½) leaves you in state 0.

E₀ = 1 + ½·E₁ + ½·E₀

**From state 1.** Spend a flip. Heads (½) finishes, so 0 further flips. Tails (½) sends you all the way back to state 0, because a tail destroys the run.

E₁ = 1 + ½·0 + ½·E₀

Solve. The second gives E₁ = 1 + E₀/2. Put that into the first:

E₀ = 1 + ½(1 + E₀/2) + E₀/2 = 1.5 + 0.75·E₀

so 0.25·E₀ = 1.5 and **E₀ = 6**, and then E₁ = 4.

Sanity check the shape before you trust the number. E₁ < E₀, as it must be, since being one head in is better than starting. And 6 is comfortably more than 4, which is what you would get if the two flips were simply independent tries at "HH" — the extra cost is the price of restarting.`, {
      terms: [
        ['First-step conditioning', 'Take one step, then use the expected time from wherever you land. Gives one equation per state.'],
        ['The +1', 'The flip you just spent. Forgetting it is the classic error and makes every answer come out 0.'],
        ['Simultaneous equations', 'One per state, solved together. Two states, two equations.'],
        ['Sanity check', 'Compare states that ought to be ordered, and compare with a crude estimate, before believing an answer.'],
      ]
    }),
    q.info('M', 'Why HT is quicker than HH, and why that is not the same as "more likely"', `Now wait for a head followed by a tail instead. Same two states, but state 1 behaves differently: a **head** from state 1 does not destroy anything, because the new head is just as good a starting point as the old one.

E₁ = 1 + ½·0 + ½·E₁, so ½·E₁ = 1 and E₁ = 2, and then E₀ = 1 + ½·2 + ½·E₀ gives E₀ = **4**.

So HT takes 4 flips on average and HH takes 6. The difference is entirely about what a failure costs. Waiting for HH, a tail at the wrong moment throws away all your progress. Waiting for HT, a wrong flip is a head, and a head is exactly what you wanted to start with. **Patterns that can overlap themselves wait longer**, and that is a general rule: HHH takes 14, HHHH takes 30.

Now the question that catches almost everyone. HH is slower on average, so is HT more likely to appear first?

**No: they are equally likely, at ½ each.** Wait for the first head, which certainly comes. The very next flip decides both races at once: another head gives HH, a tail gives HT, each with probability ½. Nothing else can happen.

A longer average wait does not mean a smaller chance of winning a race. The HH wait has a long tail of unlucky restarts that drags its mean up, while the two patterns start level once the first head appears.`, {
      terms: [
        ['Self-overlap', 'HH can partly match itself: the second H of a failure is the first H of the next attempt. HT cannot.'],
        ['Cost of failure', 'How far back a wrong flip sends you. For HH, all the way; for HT, nowhere.'],
        ['Mean versus race', 'A larger expected waiting time does not imply a smaller chance of coming first.'],
        ['Long tail', 'A distribution with rare very large values. It raises the mean without changing who usually wins.'],
      ]
    }),
    q.num('M', 'A fair coin is flipped until two heads appear in a row. What is the expected number of flips?', 6, 'Let E₀ be the expected further flips with no trailing head and E₁ with one trailing head. E₀ = 1 + ½E₁ + ½E₀ and E₁ = 1 + ½·0 + ½E₀. Substituting the second into the first gives E₀ = 1.5 + 0.75E₀, so E₀ = 6.'),
    q.num('M', 'A fair coin is flipped until two heads appear in a row. Given that the last flip was a head and you have not finished yet, what is the expected number of **further** flips?', 4, 'That is E₁ = 1 + ½·0 + ½E₀. With E₀ = 6 it gives E₁ = 1 + 3 = 4. Being one head in saves you two flips on average compared with starting from scratch.'),
    q.mc('M', 'Waiting for two heads in a row with a fair coin, with E₀ the expected further flips from no trailing head and E₁ from one trailing head, which equation is right for E₀?', ['E₀ = 1 + ½E₁ + ½E₀', 'E₀ = ½E₁ + ½E₀', 'E₀ = 1 + E₁', 'E₀ = 2E₁'], 0, 'Spend one flip, which is the leading 1. With probability ½ it is a head and you move to state 1; with probability ½ it is a tail and you are back in state 0. Dropping the +1 is the standard mistake and makes every equation collapse to 0 = 0.'),
    q.num('M', 'A fair coin is flipped until a head is immediately followed by a tail (the pattern HT). What is the expected number of flips?', 4, 'E₁ = 1 + ½·0 + ½E₁, because a head from state 1 leaves you still one head in rather than sending you back. So E₁ = 2, and E₀ = 1 + ½·2 + ½E₀ gives E₀ = 4. HT is quicker than HH because a failed attempt costs nothing.'),
    q.mc('M', 'Why does waiting for HH take longer on average than waiting for HT with the same fair coin?', ['A wrong flip while waiting for HH is a tail, which destroys the whole run; a wrong flip while waiting for HT is a head, which is exactly what you needed to start again', 'HH is a rarer pattern than HT in a random string', 'The coin is biased towards tails once a head has appeared', 'HT can appear at the start of the sequence and HH cannot'], 0, 'Both patterns occur with the same frequency in a long random string. The difference is the cost of a near miss: waiting for HH, a tail sends you back to the beginning, while waiting for HT, a head keeps all your progress. Self-overlapping patterns wait longer.'),
    q.num('M', 'Interview: a fair coin is flipped until three heads appear in a row. What is the expected number of flips?', 14, 'Three states by run length. E₂ = 1 + ½·0 + ½E₀; E₁ = 1 + ½E₂ + ½E₀; E₀ = 1 + ½E₁ + ½E₀. From the last, E₀ = 2 + E₁. Substituting E₂ = 1 + ½E₀ into E₁ gives E₁ = 1.5 + 0.75E₀, so E₀ = 3.5 + 0.75E₀ and E₀ = 14. The pattern 2, 6, 14, 30 is 2^(k+1) − 2 for k heads in a row.'),
    q.mc('M', 'Interview: waiting for HH takes 6 flips on average and waiting for HT takes 4. In a single sequence of flips, which pattern is more likely to appear first?', ['Neither: each has probability ½, because after the first head one flip decides both races at once', 'HT, because its expected waiting time is shorter', 'HH, because it is the harder pattern', 'It depends on whether the first flip is a head'], 0, 'Wait for the first head, which always comes. The next flip settles everything: another head completes HH, a tail completes HT, each with probability ½. The expected waiting times differ because HH has a long tail of unlucky restarts, and a longer mean does not mean a worse chance in a head-to-head race.'),
    q.num('M', 'Interview: a biased coin lands heads with probability 1/3. It is flipped until two heads appear in a row. What is the expected number of flips?', 12, 'With p = P(head): E₁ = 1 + (1 − p)E₀ and E₀ = 1 + pE₁ + (1 − p)E₀, so pE₀ = 1 + pE₁ and E₀ = 1/p + E₁ = 1/p + 1 + (1 − p)E₀. Hence pE₀ = (1 + p)/p and E₀ = (1 + p)/p². With p = 1/3 that is (4/3)/(1/9) = 12. Check with p = ½: (3/2)/(1/4) = 6 ✓.'),

    // =====================================================================================================
    // DEGREE: Norton, source transformation, maximum power (EEEN11101)
    // =====================================================================================================
    q.info('E', 'Norton: the same box, described the other way round', `Day 5 gave you **Thévenin**: whatever is inside a two-terminal box, as long as it is linear, the outside world cannot tell it from a single voltage source V_th in series with a single resistance R_th.

**Norton** says the same thing with a current source. Take the Thévenin box and short its terminals with a wire: all of V_th appears across R_th, so the short-circuit current is V_th/R_th. Now build a box containing a current source of exactly that value with R_th in parallel, and short *its* terminals: the resistor has no voltage across it so carries nothing, and the whole source current goes down the wire. Same short-circuit current. Leave both boxes open instead: the Thévenin box shows V_th, and the Norton box pushes its current through R_th to give the same V_th.

Two linear boxes that agree on the open-circuit voltage and the short-circuit current agree on **everything**, because a straight line is fixed by two points, and the terminal behaviour of a linear box is a straight line relating V and I. So:

**I_N = V_th / R_th** and **R_N = R_th**.

Neither form is more real than the other. They are two descriptions of one line, and you pick whichever makes the next step of the algebra shorter.`, {
      terms: [
        ['Thévenin equivalent', 'A voltage source V_th in series with R_th, indistinguishable from the original box at its terminals.'],
        ['Norton equivalent', 'A current source I_N in parallel with R_N, doing the same job.'],
        ['Open-circuit voltage V_oc', 'The terminal voltage with nothing connected. Equals V_th.'],
        ['Short-circuit current I_sc', 'The current through a wire placed across the terminals. Equals I_N.'],
        ['Linear box', 'One whose terminal V and I lie on a straight line. Two points therefore fix it completely.'],
      ],
      widget: W('norton', { Vth: 5, Rth: 500, RL: 1000 })
    }),
    q.info('E', 'Source transformation: the fastest simplification you own', `Because the two forms are interchangeable, you may swap between them **anywhere in a circuit**, not just at the output. That is a **source transformation**, and it is how a messy network collapses one step at a time:

**V in series with R  ⇄  (V/R) in parallel with R.**

Why it is so useful: series resistors combine easily, and parallel resistors combine easily, but a series resistor next to a parallel one does not. Swapping the source form moves a resistor from series to parallel or back, which puts it next to something it can merge with.

A worked chain. A 12 V source in series with 4 Ω feeds a node that also has 12 Ω to ground.

1. Transform: 12 V with 4 Ω in series becomes 3 A with 4 Ω in parallel.
2. The 4 Ω is now in parallel with the 12 Ω: combine to 3 Ω.
3. Transform back: 3 A with 3 Ω in parallel becomes 9 V in series with 3 Ω.

Three lines, and a two-resistor network has become a single source with a single resistance, ready for whatever load comes next. Do this a few times and you will stop reaching for simultaneous equations on ladder circuits.

One restriction to remember: you can only transform a source that has a resistor **with** it. An ideal voltage source alone has no series resistance to move, so it has no Norton form.`, {
      terms: [
        ['Source transformation', 'Swapping V in series with R for V/R in parallel with R, and back. Identical at the terminals.'],
        ['Why it helps', 'It moves a resistor between series and parallel so it can merge with its neighbour.'],
        ['Ideal source', 'A voltage source with no series resistance, or a current source with no parallel resistance. Neither can be transformed.'],
        ['Terminal equivalence', 'The swap changes nothing outside the box; internal currents and powers are generally different.'],
      ]
    }),
    q.info('E', 'Finding the equivalent, including when a dependent source is present', `To find the equivalent of a real network you need two of these three numbers:

- **V_oc**, the open-circuit terminal voltage, which is V_th.
- **I_sc**, the short-circuit terminal current, which is I_N.
- **R_th**, which is V_oc / I_sc.

There is also a shortcut for R_th: **zero every independent source** (a voltage source becomes a wire, because a 0 V source holds its two ends at the same potential; a current source becomes a gap, because a 0 A source passes nothing) and combine the remaining resistors as seen from the terminals.

That shortcut has one important exception. A **dependent source** — one whose value is set by a voltage or current elsewhere in the circuit, which is how transistors and amplifiers are modelled — is not an input to the circuit. It is part of how the circuit behaves. Zeroing it would delete the behaviour you are trying to measure, and the R_th you get would be wrong.

With a dependent source present, use **R_th = V_oc / I_sc**, or apply a 1 V test source across the terminals with the independent sources zeroed and measure the current it draws. Both keep the dependent source alive and doing its job.`, {
      terms: [
        ['Zeroing a source', 'Voltage source → wire (short). Current source → open circuit (gap). Only ever for independent sources.'],
        ['Dependent (controlled) source', 'A source whose value is a function of a voltage or current elsewhere. The model of a transistor or op-amp.'],
        ['Test-source method', 'Apply 1 V across the terminals, measure the current drawn, and R_th = 1 V / that current.'],
        ['R_th = V_oc / I_sc', 'Always valid, and the safe route whenever a dependent source is present.'],
      ]
    }),
    q.info('E', 'Maximum power transfer, derived rather than quoted', `A source with Thévenin voltage V_th and resistance R_th drives a load R_L. What R_L takes the most power?

Think about the extremes first. Make R_L tiny: the current is large but the voltage across the load is almost nothing, so P = V·I is small. Make R_L huge: the voltage is nearly V_th but hardly any current flows, so P is small again. Somewhere in between there is a maximum.

Now find it. The current is I = V_th / (R_th + R_L), so

**P(R_L) = I²·R_L = V_th²·R_L / (R_th + R_L)²**

Differentiate with the quotient rule and tidy:

dP/dR_L = V_th²·[(R_th + R_L)² − R_L·2(R_th + R_L)] / (R_th + R_L)⁴ = V_th²·(R_th − R_L) / (R_th + R_L)³

The numerator is zero exactly when **R_L = R_th**, and it is positive below that and negative above, so this really is a maximum. Substituting back:

**P_max = V_th² / (4·R_th)**

Now the part people quote without noticing. At the match, R_L and R_th carry the same current and have the same resistance, so they burn the **same** power: the **efficiency is exactly 50 %**. That is a disaster for a power supply, which is why the grid runs with source resistance far below the load. Matching is for **signals**, where getting the most out of a weak source matters and the wasted half is negligible in absolute terms.`, {
      terms: [
        ['Maximum power transfer', 'A load takes the most power when R_L = R_th, and that power is V_th²/(4R_th).'],
        ['Efficiency', 'Load power ÷ total power = R_L/(R_th + R_L). Exactly 50 % at the match.'],
        ['Impedance matching', 'Choosing the load to equal the source resistance. A signal technique, not a power-delivery technique.'],
        ['Why the grid is not matched', 'Half the energy would be burnt in the generator. Power systems want R_source far below R_load.'],
      ],
      widget: W('maxpower', { Vth: 5, Rth: 500, RL: 1000 })
    }),
    q.goal('E', 'In the power-against-load graph below, the source has V_th = 5 V and R_th = 500 Ω. Slide the load resistance to the value that draws the most power from it.', W('maxpower', { Vth: 5, Rth: 500, RL: 1000 }), s => s.matched,
      'The peak sits at R_L = R_th = 500 Ω, giving P = V_th²/(4R_th) = 25/2000 = 12.5 mW. Notice the green efficiency line passing through 50 % at exactly that point: half the power is being burnt inside the source.'),
    q.num('E', 'A source has a Thévenin equivalent of V_th = 5 V in series with R_th = 500 Ω. What is its Norton current, in milliamps?', 10, 'Short the terminals: all 5 V appears across the 500 Ω, so I_sc = 5/500 = 0.01 A = 10 mA. That short-circuit current is the Norton current, and the Norton resistance is the same 500 Ω.', { unit: 'mA' }),
    q.num('E', 'A source has a Thévenin equivalent of V_th = 5 V in series with R_th = 500 Ω, and it drives a 1 kΩ load. What current flows in the load, in milliamps, to 3 decimal places?', 3.333, 'Thévenin route: I = 5/(500 + 1000) = 3.333 mA. Norton route: the 10 mA source splits between 500 Ω and 1000 Ω, and a current divider sends the fraction 500/(500 + 1000) = 1/3 through the load, giving 3.333 mA. The two forms must agree, and checking that they do is a free error check.', { unit: 'mA', tol: 0.005 }),
    q.mc('E', 'A 12 V voltage source in series with a 4 Ω resistor is transformed into its Norton form. What do you get?', ['A 3 A current source in parallel with 4 Ω', 'A 48 A current source in parallel with 4 Ω', 'A 3 A current source in series with 4 Ω', 'A 12 A current source in parallel with 3 Ω'], 0, 'I_N = V/R = 12/4 = 3 A, and the resistance keeps its value but moves from series to parallel. Check it by shorting both versions: the original gives 12/4 = 3 A and the Norton form sends all 3 A down the short.'),
    q.num('E', 'A 12 V source in series with 4 Ω feeds a node that also has 12 Ω to ground. Using source transformation, what is the Thévenin voltage seen at that node, in volts?', 9, 'Transform the source: 12 V with 4 Ω becomes 3 A with 4 Ω in parallel. That 4 Ω is now in parallel with the 12 Ω, giving (4 × 12)/16 = 3 Ω. Transform back: 3 A with 3 Ω in parallel is 9 V in series with 3 Ω. Check with a plain divider: 12 × 12/(4 + 12) = 9 V ✓.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'A 10 V source in series with 2 Ω feeds node A; node A connects to ground through 3 Ω; and a 1 A current source also pushes current into node A. What is the Norton current at node A with respect to ground, in amperes?', 6, 'Short node A to ground. The 3 Ω then has no voltage across it and carries nothing. The 10 V source drives 10/2 = 5 A through the short, and the 1 A source adds its own 1 A, so I_sc = 6 A.', { unit: 'A' }),
    q.num('E', 'A 10 V source in series with 2 Ω feeds node A; node A connects to ground through 3 Ω; and a 1 A current source pushes current into node A. What is the Norton (Thévenin) resistance at node A, in ohms, to 1 decimal place?', 1.2, 'Zero the independent sources: the 10 V source becomes a wire and the 1 A source becomes a gap. Looking back from node A you then see 2 Ω and 3 Ω in parallel: (2 × 3)/5 = 1.2 Ω. Check: V_oc should be I_N × R_th = 6 × 1.2 = 7.2 V, and a direct nodal calculation agrees.', { unit: 'Ω', tol: 0.05 }),
    q.num('E', 'A source has V_th = 5 V and R_th = 500 Ω. What load resistance draws the maximum power from it, in ohms?', 500, 'Differentiating P = V_th²R_L/(R_th + R_L)² gives dP/dR_L proportional to (R_th − R_L), which is zero at R_L = R_th = 500 Ω, positive below it and negative above it. So the match is a genuine maximum, not just a turning point.', { unit: 'Ω' }),
    q.num('E', 'A source has V_th = 5 V and R_th = 500 Ω, driving the load that takes the most power. What is that power, in milliwatts?', 12.5, 'At the match R_L = 500 Ω, so the current is 5/1000 = 5 mA and the load voltage is 2.5 V, giving 12.5 mW. The formula P_max = V_th²/(4R_th) = 25/2000 = 0.0125 W says the same thing in one step.', { unit: 'mW', tol: 0.02 }),
    q.num('E', 'A source with V_th = 5 V and R_th = 500 Ω is matched with a 500 Ω load. What percentage of the total power delivered by the source ends up in the load?', 50, 'The two resistances are equal and carry the same current, so they dissipate the same power: efficiency = R_L/(R_th + R_L) = 500/1000 = 50 %. This is why matching is a signal technique. A power supply matched to its load would burn half the fuel inside itself.', { unit: '%', tol: 0.5 }),
    q.mc('E', 'A network contains a dependent source (its value is set by a voltage elsewhere in the circuit). How should you find its Thévenin resistance?', ['Compute V_oc / I_sc, or apply a test source with only the independent sources zeroed: the dependent source must stay live', 'Zero every source, dependent ones included, and combine the resistors', 'Ignore the dependent source and treat the network as passive', 'R_th is undefined for such a network'], 0, 'A dependent source describes how the circuit behaves, not what is driving it. Zeroing it deletes exactly the behaviour you are trying to summarise, and a transistor stage would come out with the resistance of its bias network instead of its real output resistance.'),
    q.num('E', 'Exam-style: a 24 V source with an internal resistance of 8 Ω is connected to a load resistor R_L. Calculate the value of R_L, in ohms, that dissipates the greatest power.', 8, 'Maximum power transfer requires R_L = R_th. Setting dP/dR_L = 0 for P = V²R_L/(R_th + R_L)² gives a numerator proportional to (R_th − R_L), so R_L = 8 Ω.', { unit: 'Ω' }),
    q.num('E', 'Exam-style: a 24 V source with an internal resistance of 8 Ω is connected to the load resistance that dissipates the greatest power. Calculate that power, in watts.', 18, 'With R_L = 8 Ω the total resistance is 16 Ω, so I = 24/16 = 1.5 A and P_L = I²R_L = 2.25 × 8 = 18 W. Equivalently P_max = V²/(4R_th) = 576/32 = 18 W. The internal resistance dissipates another 18 W, so the source delivers 36 W in total.', { unit: 'W', tol: 0.1 }),
    q.num('E', 'Exam-style: a 20 V supply feeds two 10 Ω resistors in series; a load R_L is connected across the second of them. Calculate the Thévenin resistance seen by that load, in ohms.', 5, 'Zero the supply, which turns it into a wire. Looking back from the load terminals you then see the two 10 Ω resistors in parallel: (10 × 10)/20 = 5 Ω. The open-circuit voltage is the divider output, 20 × 10/20 = 10 V.', { unit: 'Ω', tol: 0.05 }),
    q.num('E', 'Exam-style: a 20 V supply feeds two 10 Ω resistors in series, and a load R_L is connected across the second of them. Calculate the greatest power, in watts, that can be delivered to R_L, and state the value of R_L that achieves it.', 5, 'The Thévenin equivalent is V_th = 10 V (the divider output) with R_th = 5 Ω (the two resistors in parallel). Maximum power needs R_L = 5 Ω, giving P = V_th²/(4R_th) = 100/20 = 5 W. Note that the unloaded 10 V is not what the load actually sees: with R_L = 5 Ω the terminal voltage falls to 5 V, which is exactly why the Thévenin resistance had to be found first.', { unit: 'W', tol: 0.05 }),
    ...genius(q, 27),
  ]
};
