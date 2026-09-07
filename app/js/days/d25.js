import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(25);

export default {
  title: 'Skid buffers, sliding windows, utilisation, measuring without lying',
  emoji: '🛑',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook H03 L4 and worked example C. **Hardware**: why a chain of combinational ready signals becomes the critical path, what registering the stop costs you in storage, the derivation that a stop taking D cycles to arrive needs D spare slots, worked example C cycle by cycle, why the edge convention must be drawn before the depth is fixed, the two-entry skid buffer, and what the famous "12 slots" answer does *not* survive (with a simulation you write). **Code** (A02 L2): the sliding window as an invariant between two forward-only indices, longest substring without repeats with the stale last-seen trap, and why a window that shrinks on "too large" needs non-negative values. **Maths** (M08 L1): service rate, arrival rate, utilisation ρ = λ/μ, why delay blows up like 1/(1 − ρ), and why ρ < 1 does not size a buffer. **Degree** (EEEN11201 / E09 L1): choosing an instrument that can resolve the signal, probe loading at DC and above it, the 15 pF that rounds your edges, ground-lead ringing, and telling a measurement artefact from circuit behaviour.',
  takeaway: 'Registered backpressure buys a short timing path and costs storage: reserve one slot for every cycle the stop takes to reach the source, plus whatever is already stored. Worked example C: a 10-cycle stall with a 2-cycle stop needs 12 slots — and that number dies the moment stalls repeat without an arrival bound. Assert stop when free slots ≤ D, not when full. A sliding window is linear because neither index ever moves backwards; L = max(L, last[c] + 1), and shrinking on "too big" only works when the values cannot be negative. ρ = λ/μ; delay grows like 1/(1 − ρ) and ρ ≥ 1 means unbounded backlog. A probe is a resistor, a capacitor and a small inductor hung on your circuit: 10 MΩ ∥ 15 pF, f_c = 1/(2πR_sC), and a long ground lead rings at a frequency your circuit never produced.',
  steps: [
    // =====================================================================================================
    // HARDWARE (H03 L4, worked example C): registered backpressure and skid buffers
    // =====================================================================================================
    q.info('H', 'Why the stop signal gets registered', `Chain eight blocks together with valid/ready handshakes, each one able to accept a new item in the cycle it passes its own item on. Then block 7's ready is computed from block 8's ready, block 6's from block 7's, and so on: a single combinational path runs all the way from the far end back to the source, through eight lots of logic.

That path has to settle inside one clock period. It usually cannot, and it gets worse every time someone adds a stage. It also has an unpleasant property for a design team: adding a block at the *end* slows down the *front*, so a local change breaks timing somewhere nobody was looking.

The fix is to put a flip-flop in the stop signal. Now each stage's ready is a **registered** output: it depends only on state, so the path between registers is short and the clock can be fast.

The message just got slower. A stage that decides to stop this cycle does not stop the source this cycle; the news arrives one or more cycles later. And in every one of those cycles, the source is still sending.`, {
      terms: [
        ['Backpressure', 'The stop signal travelling upstream: "I cannot take any more".'],
        ['Combinational ready chain', 'ready computed straight through from the far end to the source, with no register in between.'],
        ['Registered ready', 'ready produced by a flip-flop. Short timing path, but the news is one cycle late.'],
        ['Critical path', 'The slowest combinational route between two registers; it sets the minimum clock period.'],
      ],
      widget: W('stopprop', { delay: 2, capacity: 4 })
    }),
    q.info('H', 'A late stop costs storage, and you can count exactly how much', `Here is the derivation, and it is short.

The source emits one item per cycle. At some cycle you decide to stop it. The stop takes **D** cycles to reach it. So it emits in that cycle and in the D − 1 after it… or D items, or D + 1, depending on exactly where you start counting. That ambiguity is not a detail to hand-wave: **draw the edge convention first**. Say precisely whether "stop asserted in cycle t" means the source's cycle-t emission is already suppressed, or whether the first suppressed emission is cycle t + D. Then count.

With the convention "the source's emission in cycle t + D is the first one suppressed", exactly **D** more items arrive after you assert stop. Every one of them must land somewhere, so the buffer needs **D free slots at the moment stop is asserted**.

That is the whole idea of a **skid buffer**: extra room for the items that are already skidding towards you when you hit the brakes. The name is from a car, and the picture is exact — the stopping distance is the reaction time multiplied by the speed, and here the speed is one item per cycle.`, {
      terms: [
        ['Stop propagation delay D', 'Cycles between asserting the stop and the source actually pausing.'],
        ['Skid buffer', 'Storage reserved for the items that arrive after the stop is asserted but before the source sees it.'],
        ['Reserve capacity', 'Free slots kept in hand for those in-flight items: at least D.'],
        ['Edge convention', 'The precise statement of which cycle a signal is sampled and which cycle it takes effect. Fix it before counting slots.'],
      ]
    }),
    q.info('H', 'Worked example C, in full', `The handbook question: a source sends one word per cycle. The receiver may stop consuming for up to **ten** cycles, and the internal stop takes **two** more cycles to stop the source. How deep must the buffer be?

Count the two contributions separately.

**The stall itself.** For ten cycles nothing is taken out while one word per cycle arrives, so ten words accumulate.

**The stop propagation.** After the stop is asserted, two more words are still on their way, because the source has not heard yet.

Ten plus two is **twelve** slots, under the stated assumptions: the buffer was empty when the stall began, and service resumes before the next burst. If the buffer already held **q** words, the answer is 12 + q — the in-flight words do not care what was already there.

Note what the number is not. It is not "the depth of a buffer for this design"; it is the depth **under one traced worst case with a declared edge convention**. A small precise number that a reader can check beats a large confident one they cannot.`, {
      terms: [
        ['Occupancy', 'How many items the buffer holds right now.'],
        ['Conservative capacity', 'The depth that covers the stated worst case, not the average.'],
        ['Initial occupancy q', 'What was already stored when the stall began. It adds directly to the requirement.'],
      ],
      widget: W('skidtrace', { D: 2, stall: 10, capacity: 12, threshold: 10 })
    }),
    q.info('H', 'The rule that follows: stop early, not when full', `A tempting design asserts stop when the buffer is full. Trace it: the buffer fills, stop goes out, and D more items arrive with nowhere to go. Data lost, silently.

The correct rule falls straight out of the last card. Assert stop while there are still enough free slots for the items in flight:

**assert stop when (capacity − occupancy) ≤ D.**

Equivalently, pick a threshold on occupancy of **capacity − D** and assert at or above it. With a 12-slot buffer and D = 2, that means asserting at occupancy 10, and the peak occupancy then reaches exactly 10 + 2 = 12. The buffer is used right up to its edge and never past it.

Two more consequences worth remembering. First, this is why the standard component is the **two-entry skid buffer**: two slots is the smallest depth that lets you register both the ready path and the valid path while still accepting one item every cycle. Second, whenever you change D (someone adds a pipeline register in the stop path), the threshold must change with it, so make D a parameter rather than a number typed into the comparison.`, {
      terms: [
        ['Threshold (almost-full)', 'The occupancy at which stop is asserted: capacity − D.'],
        ['Two-entry skid buffer', 'The standard two-slot component that registers both handshake directions and still runs at one item per cycle.'],
        ['Parameterised depth', 'Writing the threshold in terms of D so changing the stop path does not silently break the sizing.'],
      ]
    }),
    q.info('H', 'What the number twelve does not survive', `The twelve is correct and it is fragile. It came with two assumptions written into the question, and both are load-bearing.

**"The buffer is empty when the stall begins."** Drop it and you add whatever was already stored.

**"Service resumes before the next burst."** Drop this one and the whole approach collapses. If stalls repeat before the buffer has drained, each one leaves a little more behind, and the backlog climbs without limit. No fixed depth survives that. What you need instead is a **bound on arrivals over any interval** (at most b + r·t items in t cycles) together with a **service guarantee** (rate R after a delay T, with r < R). Then the backlog is bounded by roughly b + r·T. That is the general method, and it is what a real buffer contract states.

**And upstream may not be listening at all.** Backpressure only works if the source obeys it. Packets arriving from a physical Ethernet port do not: they come at line rate whether you are ready or not. There the honest options are enough external buffering or a declared **drop policy** — never a claim of losslessness with finite storage.`, {
      terms: [
        ['Arrival bound', 'A promise of the form "at most b + r·t items arrive in any t cycles". Without one, no buffer size can be justified.'],
        ['Service guarantee', 'A promise of the form "at least rate R after a delay T".'],
        ['Drop policy', 'A declared rule for what is discarded when the buffer cannot cope. Better than an unstated overflow.'],
        ['Lossless claim', 'Only meaningful together with a stated arrival bound, a service guarantee and a finite depth.'],
      ]
    }),
    q.num('H', 'A source sends one item per cycle. A stop signal takes 2 cycles to reach it. Under the convention that the first suppressed emission is D cycles after the stop is asserted, how many further items arrive after stop is asserted?', 2, 'One per cycle for D = 2 cycles. That is the reaction distance: rate × reaction time.'),
    q.num('H', 'A receiver may stop consuming for up to 10 cycles while a source sends one word per cycle, and the internal stop takes 2 further cycles to pause the source. The buffer is empty when the stall begins. What conservative capacity, in words, does it need?', 12, '10 words accumulate during the stall, and 2 more are still in flight when the stop is asserted: 12. If q words were already stored, the answer would be 12 + q.'),
    q.mc('H', 'A buffer with a stop-propagation delay of D cycles should assert its stop signal when…', ['the free slots left, capacity − occupancy, have fallen to D, so the items still in flight have room', 'the buffer is completely full', 'every cycle in which the sink is not ready, regardless of how much is stored', 'never — the source will notice the backpressure by itself'], 0, 'Waiting until full guarantees that D items arrive with nowhere to go. Asserting at occupancy = capacity − D means the peak lands exactly on the capacity.'),
    q.mc('H', 'Comparing a combinational ready chain with registered backpressure across eight pipeline stages, the trade is…', ['a zero-delay stop but one long combinational path that limits the clock, versus a short path plus extra storage for the items that arrive before the source hears the stop', 'registered backpressure is better in every respect', 'a combinational chain is better in every respect', 'the two are equivalent, since the same items eventually arrive'], 0, 'The extra storage is the price of the clean timing path. That is precisely the derivation H03 L4 asks for.'),
    q.num('H', 'A buffer has capacity 16 words and its stop signal takes 3 cycles to reach a source that sends one word per cycle. At what occupancy should the stop be asserted, so the buffer fills exactly to capacity and no further?', 13, 'Threshold = capacity − D = 16 − 3 = 13. From occupancy 13, three more words still arrive, reaching exactly 16.'),
    q.mc('H', 'Why does the handbook insist that you "draw the actual edge convention before deciding the final buffer depth"?', ['Whether "stop asserted in cycle t" suppresses the cycle-t emission or the cycle-(t+D) one changes the count by an item or two, and an off-by-one here means silent data loss', 'Because different FPGA vendors number cycles differently', 'It only matters for asynchronous designs', 'It is a documentation habit with no effect on the answer'], 0, 'The reserve is a small integer, so an off-by-one is a large relative error. Writing the sampling and effect cycles down turns an argument into a count.'),
    q.goal('H', 'The skid-buffer trace starts with a stop threshold of 12 in a buffer of capacity 8, and overflows. Use the "assert stop when free slots ≤ D" rule (set the threshold to capacity − D) and get the trace to fit.', W('skidtrace', { D: 2, stall: 10, capacity: 8, threshold: 12 }), s => !s.overflow,
      'Capacity 8 with D = 2 means the threshold must be 6. The peak then lands on 6 + 2 = 8, exactly the capacity, and the red overflow rows disappear.'),
    q.code('H', 'Simulate the sizing argument. `solve(sink_ready, D, threshold)`: a source emits one item per cycle unless stopped, and occupancy starts at 0. In each cycle t: (1) record `stop_now = occupancy >= threshold`; (2) the source emits in cycle t if stop was **not** asserted in cycle t − D (for t < D it always emits); (3) if `sink_ready[t]` is 1 and occupancy > 0, one item is popped; (4) occupancy += emitted − popped. Return the **maximum occupancy** reached over `len(sink_ready)` cycles.', {
      fn: 'solve',
      starter: 'def solve(sink_ready, D, threshold):\n    occ = 0\n    peak = 0\n    stops = []          # stops[t] = was stop asserted in cycle t?\n    for t in range(len(sink_ready)):\n        stop_now = occ >= threshold\n        stops.append(stop_now)\n        emitted = 1 if (t < D or not stops[t - D]) else 0\n        popped = 0\n        # pop one item if the sink is ready and something is stored\n        occ += emitted - popped\n        peak = max(peak, occ)\n    return peak\n',
      tests: [
        { args: [[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1], 2, 10], expect: 12, name: 'worked example C: long stall, D = 2, threshold 10 → peak 12' },
        { args: [[1, 1, 1, 1, 1, 1], 2, 10], expect: 1, name: 'sink always ready: one in and one out, occupancy never exceeds 1' },
        { args: [[0, 0, 0, 0, 0, 0, 0, 0], 1, 3], expect: 4, name: 'threshold 3 with D = 1 peaks at 4' },
        { args: [[0, 0, 0, 0, 0, 0, 0, 0], 3, 2], expect: 5, name: 'threshold 2 with D = 3 peaks at 5' },
        { args: [[0, 0, 0], 2, 9], expect: 3, name: 'a stall too short to reach the threshold: the stall length limits the peak instead' },
      ],
      gen: 'def gen():\n    for _ in range(8):\n        n = random.randint(1, 14)\n        yield ([random.randint(0, 1) for _ in range(n)], random.randint(0, 3), random.randint(1, 5))',
      refCode: 'def ref(sink_ready, D, threshold):\n    occ = 0; peak = 0; stops = []\n    for t in range(len(sink_ready)):\n        stop_now = occ >= threshold\n        stops.append(stop_now)\n        emitted = 1 if (t < D or not stops[t - D]) else 0\n        popped = 1 if (sink_ready[t] == 1 and occ > 0) else 0\n        occ += emitted - popped\n        peak = max(peak, occ)\n    return peak',
      solution: 'def solve(sink_ready, D, threshold):\n    occ = 0\n    peak = 0\n    stops = []\n    for t in range(len(sink_ready)):\n        stop_now = occ >= threshold\n        stops.append(stop_now)\n        emitted = 1 if (t < D or not stops[t - D]) else 0\n        popped = 1 if (sink_ready[t] == 1 and occ > 0) else 0\n        occ += emitted - popped\n        peak = max(peak, occ)\n    return peak'
    }, 'In the long-stall case the peak is exactly threshold + D, because the threshold is what triggers the stop and D more items land afterwards. Run it with your own capacity: if the peak exceeds it, you have just produced a trace proving the design loses data, which is a far better bug report than an opinion. The last test is the reminder that a short stall never reaches the threshold at all, so the stall length can be the binding limit instead.'),
    q.mc('H', 'Interview: your design has a 12-deep buffer sized for a 10-cycle stall and a 2-cycle stop. In the lab it overflows. What is the most likely reason, and what would you ask for?', ['Stalls are repeating before the buffer drains, so backlog accumulates across bursts; ask for a bound on arrivals over an interval and a service guarantee, then re-derive the depth', 'The clock is too fast', 'The stop signal is not registered', 'The buffer should have been 13 deep to allow for rounding'], 0, 'The 12 depended on "empty at the start of the stall" and "service resumes before the next burst". Repeated stalls break the second, and no fixed depth survives without an arrival bound.'),
    q.mc('H', 'Interview: a colleague states "our block is lossless". What must accompany that claim for it to mean anything?', ['A bound on arrivals over any interval, a service guarantee, the buffer depth, and the stop-propagation delay it was sized for', 'A simulation run of a million transfers with no loss', 'The name of the FPGA family', 'A statement that the ready signal is registered'], 0, 'A passing test campaign shows no loss was observed under the traffic tested. Losslessness is a claim about all admissible traffic, so it needs the contract that defines admissible.'),
    q.mc('H', 'Interview: a stage feeding your buffer is a physical Ethernet port. What changes about the sizing argument?', ['The source does not honour backpressure at all: it sends at line rate regardless, so you need either enough buffering for the declared burst or an explicit drop policy', 'Nothing: backpressure works the same way over a wire', 'The stop propagation delay becomes zero', 'The buffer can be one slot, because Ethernet frames arrive one at a time'], 0, 'Backpressure is a contract between two blocks that both implement it. A physical input has not agreed to anything, so the honest design states what it drops and when.'),

    // =====================================================================================================
    // ALGORITHMS (A02 L2): sliding windows
    // =====================================================================================================
    q.info('A', 'A sliding window is an invariant between two forward-only indices', `Many questions about a list or a string ask about a **contiguous** stretch: the longest run with no repeated character, the shortest stretch containing every required letter, the longest stretch whose sum stays under a limit. Checking every stretch means n²/2 of them.

The sliding window replaces that with two indices, **L** and **R**, and one promise: **the stretch [L, R) always satisfies the condition**. Then you only ever do two things. Push R one step right to try to grow the answer. If that breaks the promise, move L right until the promise holds again. Record the best length you ever legally had.

Why is it linear? Because **neither index ever moves backwards**. Over the entire run, R takes n steps and L takes at most n, so the total work is at most 2n regardless of the data.

That single sentence is also the test for any window you invent yourself. If some case forces L back to re-examine an earlier position, the linear-time claim is gone and you probably have an accidental quadratic loop.`, {
      terms: [
        ['Sliding window', 'A contiguous stretch [L, R) maintained by two indices that only move forward.'],
        ['Window invariant', 'The condition the stretch is promised to satisfy at all times.'],
        ['Contiguous', 'Neighbouring elements with nothing skipped. A window can never model "pick any elements you like".'],
        ['Monotone pointers', 'Indices that only increase. The reason the total work is linear.'],
      ]
    }),
    q.info('A', 'Longest substring without a repeated character', `The invariant: **no character appears twice inside [L, R)**. To keep it as R advances you need to know, instantly, whether the incoming character is already inside. So carry a dictionary **last[c]** = the most recent index where c was seen.

For each new character c = s[R]:

1. If c is in last **and last[c] ≥ L**, then c is inside the window, so the window would now contain a repeat. Move L to \`last[c] + 1\`, just past that earlier copy.
2. Record \`last[c] = R\`.
3. The current window has length R − L + 1; keep the best.

The condition **last[c] ≥ L** is the part people get wrong. A character can be in the dictionary from long ago, outside the current window, and its stale index must not drag L backwards. Take \`"abba"\`. At the second \`a\` (index 3), last[a] is 0, but L is already 2. Writing \`L = last[a] + 1\` blindly would set L back to 1, which re-admits a \`b\` that was deliberately excluded, and the answer comes out 3 instead of 2. Writing \`L = max(L, last[c] + 1)\` is the fix, and it is the same "never move backwards" rule that makes the whole thing linear.`, {
      terms: [
        ['last-seen map', 'A dictionary from character to its most recent index. Makes each window adjustment O(1).'],
        ['Stale index', 'A last-seen position that is now outside the window. It must not be allowed to move L back.'],
        ['L = max(L, last[c] + 1)', 'The one-line fix; "abba" is the smallest test that catches its absence.'],
      ],
      widget: W('window', { s: 'abcabcbb' })
    }),
    q.goal('A', 'Step the sliding-window simulation all the way through the string "abcabcbb" and read off the longest stretch with no repeated character.', W('window', { s: 'abcabcbb' }), s => s.best === 3,
      'The answer is 3 ("abc", and later "bca" and "cab"). Watch L jump each time an incoming character was already inside the window.'),
    q.info('A', 'The shrinking window, and why negative values break it', `The other common shape has a numeric condition: "the longest stretch whose sum is at most K". Grow R, and **while** the sum is too big, drop elements from the left. It looks like the same technique, but it quietly relies on something extra.

Dropping arr[L] must **help**. That is only guaranteed when the values are **non-negative**: removing a non-negative number cannot make the sum bigger, so shrinking always moves you towards a legal window, and once it is legal there is no point shrinking further.

With a negative value in the list the reasoning dies. Take \`[5, −6, 5]\` with K = 4. The window \`[5]\` has sum 5, too big, so a shrinking window throws the 5 away and carries on — and never discovers that the whole list sums to 4 and is legal at length 3. Nothing in the algorithm is buggy; its **precondition** was violated, exactly as with binary search on unsorted data.

For sums with negative values you need a different tool: prefix sums with a structure over them, not a window. The general rule to carry away: a window works when growing R only ever makes the condition harder, and shrinking from the left only ever makes it easier.`, {
      terms: [
        ['Shrinking window', 'Advance R, then move L right while the condition is violated.'],
        ['Non-negativity precondition', 'What makes "drop from the left" a guaranteed improvement.'],
        ['Prefix sums', 'Running totals; the right tool when values can be negative, because they do not need monotone windows.'],
        ['Counterexample', '[5, −6, 5] with K = 4: the shrinking window returns 2, the true answer is 3.'],
      ]
    }),
    q.num('A', 'What is the length of the longest substring with no repeated character in `"abcabcbb"`?', 3, '"abc" has length 3, and so do "bca" and "cab". Any stretch of length 4 in this string must repeat a letter.'),
    q.num('A', 'What is the length of the longest substring with no repeated character in `"pwwkew"`?', 3, '"wke", length 3. "pwke" is not an answer because a substring must be contiguous, and dropping the second w would break that.'),
    q.num('A', 'What is the length of the longest substring with no repeated character in `"abba"`?', 2, '"ab" and "ba" both work; "bba" and "abb" repeat b. This is the case that catches a missing max(): at the final a, its last-seen index 0 is already outside the window.'),
    q.num('A', 'What is the length of the longest substring with no repeated character in `"bbbbb"`?', 1, 'Every window of length 2 repeats b, so the best is a single character.'),
    q.num('A', 'What is the length of the longest substring with no repeated character in `"dvdf"`?', 3, '"vdf". At the second d (index 2) L moves to 1, and the window then grows to "vdf" of length 3. Answering 2 usually means the best length was recorded before extending R.'),
    q.mc('A', 'In a longest-substring-without-repeats scan, why must L never be moved **backwards** when the incoming character was last seen at an index before L?', ['That earlier copy is already outside the window, so the window is still valid; moving L back would re-admit characters that were deliberately excluded and give a wrong, longer answer', 'Because strings are immutable in Python', 'It would still be correct, only slower', 'L can move backwards safely as long as the dictionary is updated'], 0, 'Use L = max(L, last[c] + 1). Keeping both indices moving forward is also what keeps the algorithm linear.'),
    q.mc('A', 'A window that keeps the sum of its elements at most K works by shrinking from the left whenever the sum is too big. On which inputs is that reasoning valid?', ['Only when the values are non-negative, because removing a non-negative element cannot increase the sum, so shrinking is guaranteed to help', 'On any list of numbers', 'Only when the list is sorted', 'Only when K is positive'], 0, 'With a negative value present, dropping from the left can make the sum larger, and a legal longer window can be skipped entirely. [5, −6, 5] with K = 4 is the standard counterexample.'),
    q.num('A', 'A shrinking window is used to find the longest stretch of `[5, -6, 5]` whose sum is at most 4. What length does it report, when the true answer is 3?', 2, 'It sees sum 5 > 4 at the first element and drops it, so it never considers a window containing that 5 again. It ends up reporting 2 for [−6, 5]. The whole list sums to 4 and is legal, but the algorithm cannot reach it.'),
    q.mc('A', 'What makes a sliding-window scan O(n) rather than O(n²)?', ['Both indices only ever move forward, so their combined movement over the whole run is at most 2n steps, whatever the data', 'The window has a fixed size', 'The dictionary lookups are O(1)', 'The input is sorted'], 0, 'The dictionary keeps each step O(1), but the linear total comes from the monotone indices. If any case pushes an index backwards, the bound is lost.'),
    q.code('A', 'Write `solve(s)` returning the length of the longest substring of `s` containing no repeated character. Use a window [L, R] and a dictionary of last-seen indices so the whole scan is O(n) — the speed test is a 500,000-character string, which the obvious "try every starting point" solution cannot finish inside the budget.', {
      fn: 'solve',
      starter: 'def solve(s):\n    last = {}\n    L = 0\n    best = 0\n    for R, c in enumerate(s):\n        # if c was last seen at an index inside the window, move L just past it\n        # then record last[c] = R, and update best with the current window length\n        pass\n    return best\n',
      tests: [
        { args: ['abcabcbb'], expect: 3 },
        { args: ['bbbbb'], expect: 1, name: 'every character the same' },
        { args: ['pwwkew'], expect: 3, name: 'the answer is a substring, not a subsequence' },
        { args: [''], expect: 0, name: 'empty string' },
        { args: ['abba'], expect: 2, name: 'the stale last-seen trap: needs max(L, last + 1)' },
        { args: ['dvdf'], expect: 3, name: 'the best window appears after L has already moved' },
        { args: ['abcdef'], expect: 6, name: 'no repeats at all: the whole string' },
      ],
      gen: 'def gen():\n    for _ in range(10):\n        yield ("".join(random.choice("abcd") for _ in range(random.randint(0, 14))),)',
      refCode: 'def ref(s):\n    best = 0\n    for i in range(len(s)):\n        seen = set()\n        for j in range(i, len(s)):\n            if s[j] in seen: break\n            seen.add(s[j])\n            best = max(best, j - i + 1)\n    return best',
      speed: { gen: 'def gen():\n    return ["".join(random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(500000))]', budgetMs: 1500, label: '500,000 characters (the quadratic version would take minutes)' },
      solution: 'def solve(s):\n    last = {}\n    L = 0\n    best = 0\n    for R, c in enumerate(s):\n        if c in last and last[c] >= L:\n            L = last[c] + 1\n        last[c] = R\n        best = max(best, R - L + 1)\n    return best'
    }, 'The reference used for the random cases is deliberately the quadratic "try every start" version — obviously correct, far too slow for the speed test. That pairing is the pattern worth copying: a slow, clearly-right implementation to check a fast, clever one against.'),
    q.mc('A', 'Interview: extend the technique to "the longest substring containing at most K distinct characters". What changes?', ['Keep a count per character in the window instead of a last-seen index; after adding s[R], while the number of distinct characters exceeds K, drop s[L] and advance L, removing the character from the map when its count hits zero', 'Nothing changes: the same last-seen map works', 'It cannot be done with a window; it needs sorting first', 'Use two windows, one for each half of the string'], 0, 'The invariant becomes "at most K distinct inside", and it is restored by shrinking. Deleting the key at count zero is what keeps "number of distinct" equal to the size of the map.'),
    q.mc('A', 'Interview: a candidate\'s longest-substring-without-repeats function returns 3 for "abba" instead of 2. What is the single most likely line, and why does the bug hide?', ['They wrote L = last[c] + 1 instead of L = max(L, last[c] + 1); it hides because it only shows when a character\'s last-seen index is already behind L, which needs a specific pattern like abba', 'They forgot to handle the empty string', 'They used a set instead of a dictionary, which cannot work at all', 'They compared characters with is instead of =='], 0, 'Most random tests never generate the pattern, which is why the boundary test "abba" earns its place in the suite: it distinguishes exactly this bug.'),

    // =====================================================================================================
    // MATHS (M08 L1): utilisation
    // =====================================================================================================
    q.info('M', 'Utilisation: the fraction of the time a server is busy', `Two rates describe a server. The **service rate μ** is how many items it could finish per unit time if it never ran out of work. The **arrival rate λ** is how many turn up per unit time. Their ratio is the **utilisation**:

**ρ = λ / μ.**

Take a pipeline stage that accepts one item per cycle at 125 MHz. Its service rate is 125 million items per second. If items arrive at 80 million per second, ρ = 80/125 = **0.64**: the stage is doing useful work 64% of the time and idle the other 36%.

ρ is a pure number, and it is also a direct reading of "busy fraction", because in a long run the server must spend exactly enough time working to clear everything that arrived: (busy fraction) × μ = λ.

The condition **ρ < 1** is the stability condition: on average the server keeps up. It is easy to read that as "so we are fine", and the next card is about why that reading is wrong.`, {
      terms: [
        ['Service rate μ', 'Items the server could complete per unit time when never idle.'],
        ['Arrival rate λ', 'Items arriving per unit time.'],
        ['Utilisation ρ', 'λ/μ: the fraction of time the server is busy.'],
        ['Stability condition', 'ρ < 1. Necessary for a finite average backlog, and nowhere near sufficient for a small buffer.'],
      ],
      widget: W('util', { rho: 0.64 })
    }),
    q.info('M', 'Why the queue explodes as ρ approaches 1', `Suppose a burst leaves you with a backlog of B items. The server clears them at rate μ while new work still arrives at rate λ, so the backlog shrinks at rate **μ − λ = μ(1 − ρ)**. The time to recover is B/(μ(1 − ρ)).

That factor **1/(1 − ρ)** is the whole story. At ρ = 0.5 recovery takes twice as long as the work itself; at 0.9, ten times; at 0.99, a hundred times. The spare capacity is what pays off backlogs, and it is what you are throwing away when you push utilisation up.

The standard simple queue model (random arrivals, random service, one server) makes this exact: the average number waiting is ρ/(1 − ρ) and the average time in the system is 1/(μ − λ). At ρ = 0.64 that is 1.8 items; at ρ = 0.95 it is 19; at ρ = 0.99 it is 99. Between 95% and 99% utilisation you gained 4% more throughput and made the queue five times longer.

This is why engineers design for 60–80% utilisation and treat 95% as an alarm, not an achievement.`, {
      terms: [
        ['Drain rate', 'μ − λ: how fast a backlog shrinks. It is the spare capacity, not the total capacity.'],
        ['1/(1 − ρ)', 'The blow-up factor. Delay and queue length both scale with it.'],
        ['Headroom', 'Deliberately unused capacity. It is what absorbs bursts and pays off backlogs.'],
      ]
    }),
    q.info('M', 'Utilisation does not size a buffer', `ρ is an average, computed from two averages, and averages say nothing about peaks.

Two workloads can have identical ρ = 0.6 and need wildly different buffers. One delivers three items in every five cycles, evenly. The other delivers twelve items in one cycle and then nothing for nineteen. Same mean rate, same utilisation, same stability — but the second needs eleven slots at the instant of the burst and the first needs almost none.

So "average capacity exceeds average traffic" is a **necessary** condition and never a sufficient one. To size a buffer you need a statement about arrivals over an **interval**: "at most b + r·t items arrive in any t cycles". Then, together with a service guarantee, the backlog is bounded.

And if ρ ≥ 1 there is nothing to discuss. Over t cycles at least λt items arrive and at most μt can be served, so the backlog grows by at least (λ − μ)t and passes any fixed buffer eventually. No buffer size, cleverness or scheduling policy rescues an overloaded server; only more capacity or less work does.`, {
      terms: [
        ['Burst', 'A run of arrivals faster than the long-run average. The reason buffers exist even when ρ is low.'],
        ['Burstiness', 'How lumpy the arrivals are. Not captured by ρ at all.'],
        ['Overload (ρ ≥ 1)', 'Arrivals meet or exceed capacity: backlog grows without bound.'],
      ],
      widget: W('queuesim', { rho: 0.64, burst: 1 })
    }),
    q.goal('M', 'In the queue simulation, raise the utilisation ρ to **0.9 or above** with a burst size of 1 and look at what happens to the average and peak backlog.', W('queuesim', { rho: 0.4, burst: 1 }), s => s.rho >= 0.89,
      'The same server, the same arrival pattern, just less headroom. Delay scales like 1/(1 − ρ), so going from 0.4 to 0.9 multiplies the typical backlog by about six.'),
    q.num('M', 'A pipeline stage accepts one item per cycle and is clocked at 125 MHz. What is its service capacity, in million items per second?', 125, 'One item per cycle × 125 million cycles per second = 125 million items/s.'),
    q.num('M', 'Items arrive at 80 million per second into a stage whose service capacity is 125 million items per second. What is the utilisation ρ?', 0.64, 'ρ = λ/μ = 80/125 = 0.64. The stage is busy 64% of the time.'),
    q.num('M', 'A server can complete 100 items per second and items arrive at 90 per second. By what factor does the 1/(1 − ρ) rule say the delay is stretched compared with the service time alone?', 10, 'ρ = 0.9, so 1/(1 − ρ) = 1/0.1 = 10. Ten percent spare capacity means backlogs take ten times as long to clear as the work in them.'),
    q.mc('M', 'Running a stage at utilisation 0.95 rather than 0.64 means…', ['much longer queues and delays on average, and far less headroom for bursts: the 1/(1 − ρ) factor rises from about 2.8 to 20', 'the same buffer requirement, since ρ is still below 1', 'shorter queues, because the server is working harder', 'nothing changes as long as ρ stays below 1.0'], 0, 'Spare capacity is what clears backlogs. Removing most of it multiplies delay even though the average throughput barely improves.'),
    q.tf('M', 'If a server\'s average capacity exceeds the average traffic, some fixed buffer size is guaranteed to be enough.', false, 'Averages do not bound bursts. Without a statement about how many items can arrive in an interval, an arbitrarily large burst can arrive at any moment, and no fixed depth covers it.'),
    q.mc('M', 'A stage runs at ρ = 1.02. What follows?', ['The backlog grows without bound: over t cycles at least λt arrive and at most μt can be served, so no fixed buffer ever holds it', 'Delay is high but finite, roughly 1/(1 − ρ)', 'It is fine as long as the buffer is at least 50 deep', 'It works, but only if arrivals are perfectly smooth'], 0, 'Above ρ = 1 the shortfall accumulates linearly with time. The formula 1/(1 − ρ) is meaningless there — it goes negative, which is the model telling you the assumption has failed.'),
    q.num('M', 'A server completes 500 items per second and items arrive at 400 per second. What is the utilisation ρ?', 0.8, 'ρ = λ/μ = 400/500 = 0.8: busy 80% of the time, with 20% of its capacity left as headroom to clear backlogs.'),
    q.mc('M', 'Why is the utilisation ρ = λ/μ also exactly the fraction of time the server is busy?', ['Over a long run the server must do just enough work to clear everything that arrived, so (busy fraction) × μ = λ, giving busy fraction = λ/μ', 'Because arrivals are assumed to be evenly spaced', 'Because the queue is assumed to be empty at the start', 'It is only approximately true and depends on the service distribution'], 0, 'It is a conservation argument, not a model: work in must equal work out in a stable system. That is why ρ needs no distributional assumptions at all.'),
    q.num('M', 'Interview: in the simple single-server queue model, the average number of items waiting is ρ/(1 − ρ). At a utilisation of ρ = 0.9, how many items are waiting on average?', 9, '0.9/(1 − 0.9) = 0.9/0.1 = 9 items. At ρ = 0.95 it is 19 and at ρ = 0.99 it is 99: the last few percent of utilisation are extraordinarily expensive.'),
    q.mc('M', 'Interview: two links both run at ρ = 0.6. One receives 3 items every 5 cycles evenly; the other receives 12 items in one cycle then nothing for 19. What does ρ tell you about their buffer needs?', ['Nothing: ρ is built from averages and both have the same one, while the bursty link needs about eleven slots and the smooth one needs almost none', 'Both need the same buffer, since ρ is identical', 'The bursty link needs a smaller buffer because it is idle more often', 'ρ = 0.6 means a buffer of 6 items in both cases'], 0, 'Utilisation is necessary for stability and useless for sizing. Sizing needs a bound on arrivals over an interval, which is exactly the burstiness that ρ throws away.'),
    q.num('M', 'Interview: a single server handles 100 requests per second and requests arrive at 80 per second. Using the simple-queue result "average time in the system = 1/(μ − λ)", what is that time in milliseconds?', 50, '1/(100 − 80) = 1/20 s = 50 ms — even though each request only needs 10 ms of actual service. Forty of those milliseconds are queueing caused by having only 20% headroom.', { unit: 'ms' }),

    // =====================================================================================================
    // DEGREE (EEEN11201 / E09 L1): measuring without lying
    // =====================================================================================================
    q.info('E', 'A reading is not yet a measurement', `"3.3 V" is a number someone read off a screen. It cannot be checked, compared or reproduced, because it does not say what was measured, how, or how well.

A **measurement** is a value plus three more things:

- the **method**: which instrument, which range, which probe;
- the **boundary**: between which two points, referenced to what;
- the **uncertainty**: the ± , and where it came from.

So the honest version is "3.29 ± 0.02 V, DMM on the 20 V range, node A referenced to ground". Now a reader knows whether 3.29 and 3.31 disagree, and another engineer can repeat it.

The uncertainty has two quite different parts, and confusing them is the classic lab error. **Repeatability** is the scatter you see when you take the reading again — averaging more readings reduces it. **Calibration bias** is a fixed offset in the instrument itself — averaging does nothing to it at all. Ten identical readings feel convincing and tell you nothing about the second kind.`, {
      terms: [
        ['Reading', 'The raw number an instrument displays.'],
        ['Measurement', 'A value plus its method, boundary and uncertainty.'],
        ['Repeatability', 'Scatter between repeated readings. Reduced by averaging.'],
        ['Calibration bias', 'A systematic offset in the instrument. Not reduced by averaging at all.'],
        ['Resolution', 'The smallest step the display can show. A floor on precision, and not the same thing as accuracy.'],
      ]
    }),
    q.info('E', 'Choosing an instrument that can resolve the signal', `A **digital multimeter** integrates over a window of many milliseconds and gives you one number. That is exactly right for a DC rail and hopeless for a 100 ns pulse — the pulse is averaged into invisibility, and a 3.3 V line pulsing 1% of the time reads about 33 mV.

An **oscilloscope** plots voltage against time, but only within two limits. Its **bandwidth** is the highest frequency it passes without significant loss, and its **sample rate** is how often it takes a point.

The rule that connects bandwidth to what you actually care about — edges — is

**rise time ≈ 0.35 / bandwidth.**

A 100 MHz scope therefore cannot show an edge faster than about 3.5 ns. And what you see is the two rise times combined roughly in quadrature: a genuine 2 ns edge viewed on that scope appears as √(2² + 3.5²) ≈ 4.0 ns. The instrument has not lied; it has added its own limits to the answer, and it is your job to know by how much.

Turned round, this is how you choose: for a signal with 10 ns edges you need at least 0.35/10 ns = 35 MHz, and in practice three to five times more for a faithful shape.`, {
      terms: [
        ['DMM', 'Digital multimeter. Integrates over a window, so it reports DC or rms levels, never waveform shape.'],
        ['Oscilloscope bandwidth', 'The frequency at which the displayed amplitude has fallen by 3 dB (to about 71%).'],
        ['Sample rate', 'Points captured per second. Must comfortably exceed twice the highest frequency of interest.'],
        ['0.35 / bandwidth', 'The rise time a first-order-limited instrument can show. 100 MHz → 3.5 ns.'],
        ['Quadrature addition', 'Combining rise times as √(t₁² + t₂²) when two first-order limits act in series.'],
      ]
    }),
    q.info('E', 'At DC, the probe is a resistor across your node', `Connect a meter to a node and you have added a resistor to the circuit. What you now read is the node **with the meter on it**, which is not the circuit you designed.

Model the node as its Thévenin equivalent: an ideal source V behind a source resistance R_s. The probe adds R_p to ground, and the two form a divider:

**V_measured = V × R_p / (R_s + R_p).**

Numbers. A node at 1.000 V behind 100 kΩ, measured with a 1 MΩ input, reads 1 × 1000/1100 = **0.909 V**: 9% low. The same node on a 10 MΩ input reads 0.990 V: 1% low. On a 50 Ω input it reads 0.5 mV and the circuit has effectively been short-circuited.

Two lessons. **The error depends on the ratio R_p/R_s**, so a 10 MΩ meter is not "accurate" in the abstract — it is accurate on low-impedance nodes and still wrong on a 10 MΩ one. And when two instruments disagree about the same node, suspect their input impedances long before you suspect the circuit.`, {
      terms: [
        ['Probe loading', 'The probe\'s own impedance in parallel with the node, changing what you measure.'],
        ['Input impedance', 'The resistance (and capacitance) an instrument presents. 10 MΩ ∥ 15 pF is typical for a ×10 scope probe.'],
        ['Source resistance R_s', 'The Thévenin resistance the node is driven through. It decides how much loading matters.'],
        ['High-impedance node', 'One driven through a large resistance. Easily disturbed by measurement.'],
      ],
      widget: W('probe', { Rs: 100 })
    }),
    q.info('E', 'Above DC, the 15 pF is what gets you', `A scope probe is not just 10 MΩ. It is **10 MΩ in parallel with about 15 pF**, and at any real frequency the capacitor is the part that matters: at 10 MHz, 15 pF has an impedance of about 1 kΩ, not 10 MΩ.

That capacitance and the node's source resistance form a low-pass filter:

**f_c = 1/(2π·R_s·C)**, and the rise time it adds is about **2.2·R_s·C**.

For a node driven through 1 kΩ with a 15 pF probe, f_c = 10.6 MHz and the added rise time is 33 ns. Move to a 10 kΩ node and it is 1.06 MHz and 330 ns. Your fast edge has been rounded off — by the probe, not by the circuit.

This is also why a **×10 probe** exists. It puts a 9 MΩ resistor in the tip, which divides the signal by ten (so you lose amplitude and resolution) but also divides the capacitance the node sees, typically from around 100 pF for a ×1 probe down to 15 pF. Trading a factor of ten in amplitude for a factor of seven in bandwidth is almost always worth it, which is why ×10 is the default setting.`, {
      terms: [
        ['Probe capacitance', 'Roughly 15 pF for a ×10 probe, 100 pF or more for ×1 or bare coax.'],
        ['f_c = 1/(2πR_sC)', 'The corner frequency of the low-pass the probe forms with the node\'s source resistance.'],
        ['Added rise time', 'About 2.2·R_s·C: how much the probe alone slows the edge you see.'],
        ['×10 probe', 'A 9 MΩ tip resistor: one tenth the amplitude, but far less capacitance loading the node.'],
      ],
      widget: W('probecap', { Rs: 1, probe: 0, lead: 15 })
    }),
    q.info('E', 'The ground lead rings, and the circuit did not', `The last piece of the probe is the crocodile clip on the end of a wire. That wire is an inductor: roughly **1 nH per millimetre**, so a 15 cm ground lead is about 150 nH.

Put 150 nH in a loop with the probe's own 15 pF and you have built a resonator that rings at

f = 1/(2π√(LC)) = 1/(2π√(150 nH × 15 pF)) ≈ **106 MHz**.

Hit that loop with a fast edge and it rings at 106 MHz for a few cycles. It appears on the screen sitting on top of your signal, and it looks exactly like a circuit problem. It is not: it is the measurement apparatus oscillating.

How to tell an artefact from real behaviour, in order of cost: shorten the ground path (use the spring tip that clips to the ground ring next to the pin — a few millimetres instead of 150), and see whether the ringing frequency changes. **Real circuit ringing does not care how you hold the probe; an artefact changes or vanishes.** Then also move the probe to a different point, and try a different probe.

Record what you observed before you change anything. The observation is the data; the component swap is a hypothesis.`, {
      terms: [
        ['Ground-lead inductance', 'About 1 nH per mm of ground wire. 15 cm ≈ 150 nH.'],
        ['Probe resonance', 'The ringing of the ground-lead inductance with the probe capacitance: f = 1/(2π√(LC)).'],
        ['Measurement artefact', 'Something on the screen created by the act of measuring, not present in the circuit.'],
        ['Spring ground tip', 'A very short ground connection right at the test point. The standard fix for lead ringing.'],
      ]
    }),
    q.goal('E', 'In the probe-loading simulation, select the **×10 probe** and set the ground lead length to **0 cm**, and watch the ringing marker leave the plot.', W('probecap', { Rs: 1, probe: 1, lead: 20 }), s => s.pi === 0 && s.lead === 0,
      'The ×10 probe lowers the capacitance loading the node, and removing the ground-lead inductance removes the resonance entirely. What is left on the plot is the honest RC roll-off of probe capacitance against source resistance.'),
    q.mc('E', 'You need to see the shape of a 100 ns pulse. Which instrument, and why?', ['An oscilloscope with enough bandwidth, because it plots voltage against time; a DMM integrates over milliseconds and would average the pulse away', 'A DMM on the DC range', 'A DMM on the AC range', 'An ammeter in series with the load'], 0, 'A 3.3 V line pulsing for 100 ns in every 10 µs reads about 33 mV on a DMM: a true average and a useless description.'),
    q.num('E', 'A node sits at a true 1.000 V behind a source resistance of 100 kΩ. You measure it with an instrument whose input resistance is 1 MΩ. What does it read, in volts (3 d.p.)?', 0.909, 'The probe forms a divider: V = 1 × R_p/(R_s + R_p) = 1 × 1000/(100 + 1000) = 0.909 V. The act of measuring pulled the node down by 9%.', { unit: 'V', tol: 0.002 }),
    q.num('E', 'A node sits at a true 1.000 V behind a source resistance of 100 kΩ. You measure it with a 10 MΩ input instead. What does it read, in volts (3 d.p.)?', 0.99, 'V = 1 × 10000/(100 + 10000) = 0.990 V, an error of 1%. Ten times the input resistance gives roughly one tenth the error.', { unit: 'V', tol: 0.002 }),
    q.mc('E', 'Two instruments give different readings on the same node of a working circuit. What should you check first?', ['Their input impedances: a lower-impedance input loads a high-impedance node more and genuinely reads a lower voltage', 'Whether the circuit changed between the two readings', 'Which instrument is broken', 'Whether Ohm\'s law applies to this circuit'], 0, 'Both may be reading correctly; they are simply measuring two slightly different circuits, because each one has added itself to the node.'),
    q.mc('E', 'Which of these is a complete measurement?', ['3.29 ± 0.02 V, DMM on the 20 V range, node A referenced to ground', '3.3 V', 'about 3 volts', 'the LED lit up'], 0, 'Value, method, boundary and uncertainty. Anything less cannot be compared with another engineer\'s number.'),
    q.mc('E', 'You take the same reading ten times and get exactly 3.290 V each time. What does that establish?', ['Good repeatability only: a fixed calibration offset would appear in all ten readings identically and cannot be detected this way', 'That the reading is accurate to within the display resolution', 'That the instrument has been calibrated recently', 'That the circuit is stable and the instrument is therefore correct'], 0, 'Repeatability and accuracy are different things. Averaging attacks random scatter and does nothing whatever to a systematic offset.'),
    q.num('E', 'Exam-style: an oscilloscope has a bandwidth of 100 MHz. Estimate the fastest rise time it can display, in nanoseconds (1 d.p.), using the relation rise time ≈ 0.35 / bandwidth.', 3.5, 't_r = 0.35/(100 × 10⁶ Hz) = 3.5 × 10⁻⁹ s = 3.5 ns. Any edge faster than this is displayed at the scope\'s own speed, not its true one.', { unit: 'ns', tol: 0.1 }),
    q.num('E', 'Exam-style: a signal with a true rise time of 2.0 ns is viewed on an oscilloscope whose own rise time is 3.5 ns. Estimate the rise time seen on the screen, in nanoseconds (1 d.p.), combining the two in quadrature.', 4, 't_displayed = √(t_signal² + t_scope²) = √(2.0² + 3.5²) = √(4 + 12.25) = √16.25 = 4.03 ns. The instrument dominates, so this measurement cannot support a claim about the true edge.', { unit: 'ns', tol: 0.15 }),
    q.num('E', 'Exam-style: a circuit node is driven through a source resistance of 10 kΩ and is probed with a ×10 probe of 15 pF input capacitance. Calculate the −3 dB corner frequency of the low-pass filter this forms, in MHz (2 d.p.).', 1.06, 'f_c = 1/(2π·R_s·C) = 1/(2π × 10 × 10³ × 15 × 10⁻¹²) = 1/(9.425 × 10⁻⁷) = 1.061 × 10⁶ Hz = 1.06 MHz. Anything faster than about a microsecond is being rounded off by the probe.', { unit: 'MHz', tol: 0.03 }),
    q.num('E', 'Exam-style: a node driven through 10 kΩ is probed with a 15 pF ×10 probe. Estimate the rise time this loading adds, in nanoseconds, using t_r ≈ 2.2·R_s·C.', 330, 't_r = 2.2 × 10 × 10³ Ω × 15 × 10⁻¹² F = 3.3 × 10⁻⁷ s = 330 ns. On a high-impedance node the probe, not the circuit, sets the edge you see.', { unit: 'ns', tol: 8 }),
    q.num('E', 'Exam-style: a probe ground lead 15 cm long has an inductance of about 1 nH per mm, and the probe tip has 15 pF of capacitance. Calculate the frequency at which this loop rings, in MHz (nearest whole).', 106, 'L = 150 mm × 1 nH/mm = 150 nH. f = 1/(2π√(LC)) = 1/(2π√(150 × 10⁻⁹ × 15 × 10⁻¹²)) = 1/(2π × 1.5 × 10⁻⁹) = 1.06 × 10⁸ Hz ≈ 106 MHz.', { unit: 'MHz', tol: 3 }),
    q.mc('E', 'Exam-style: a fast digital edge shows ringing at about 100 MHz on the screen. Describe the single most informative next step and what each outcome would mean.', ['Replace the long ground lead with a short spring tip and look again: if the ringing frequency changes or disappears it was the probe\'s ground loop, and if it is unchanged the ringing is in the circuit', 'Add a capacitor across the node and see whether the ringing stops', 'Replace the driving component, since 100 MHz ringing indicates a faulty output', 'Reduce the clock frequency until the ringing goes away'], 0, 'Change the measurement first, the circuit second. A 15 cm lead with 15 pF resonates near 106 MHz, which is suspiciously close, and the test costs nothing.'),
    ...genius(q, 25),
  ]
};
