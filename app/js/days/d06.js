import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(6);

// Rewritten to the standing content rules (C:\dev\study\CLAUDE.md + app/CONTENT_GUIDE.md):
// short plain cards (90-220 words), why before what, every prompt self-contained,
// a code exercise in H and in A, and Exam-style / Interview questions closing every strand.
export default {
  title: 'Carry chains, loop invariants, expectation, derivatives',
  emoji: '⛓️',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Week 1, day 6. **Hardware** (H01 L1/L5): why a ripple-carry adder is slow, what propagation delay and a critical path actually are, the generate / propagate / kill trick that says which columns must wait, the input pattern that makes the worst case, why you size a clock from the worst case and not the average, what a carry-lookahead tree buys and pays, and a Python model that computes the settling time of every carry. **Algorithms** (A01 L1): a loop invariant as a three-part proof (establishment, maintenance, termination), the max-and-first-index loop, why the empty list has no answer, why `>` and `>=` decide the tie, and n − 1 comparisons. **Maths** (M06): expectation as a long-run average, linearity without independence, indicator variables, and why E[X²] is not E[X]². **Degree** (E02 L1): the derivative built as the limit of secant slopes, the power rule derived rather than quoted, what dx means, stationary points, and rates of change in circuits.',
  takeaway: 'A ripple adder\'s delay grows with its width because a column with **different** input bits must copy its carry-in and wait; equal bits settle on their own. Worst case: `11111111 + 00000001`, a carry through all 8 stages. An **invariant** is a proof, not a comment: true before the loop, preserved by each pass, and at the exit it hands you the answer. E[X] = Σ x·P(x) is a long-run average the die never shows, and E[X + Y] = E[X] + E[Y] needs no independence at all. The derivative is the limit of secant slopes: [f(x+h) − f(x)]/h for x² is 2x + h exactly, and 2x in the limit.',
  steps: [
    // =====================================================================================================
    // HARDWARE: the carry chain (H01)
    // =====================================================================================================
    q.info('H', 'Column addition, in gates', `Add two bits and the answer can be 2, which needs two bits of its own: a **sum** bit and a **carry**. That is why a single adder cell has two outputs.

A **full adder** is one column of primary-school addition: it takes bit a, bit b and a carry coming in from the column on its right, and produces the sum bit and a carry going out to the left. Sum is 1 when an odd number of its three inputs is 1; carry-out is 1 when at least two of them are.

Chain w of these, each one's carry-out feeding the next one's carry-in, and you have a **ripple-carry adder**. All w columns exist at once as real hardware, so it looks as if the whole addition happens simultaneously.

It does not, and the reason is the chain. Column 3 cannot know its answer until column 2 tells it the carry, and column 2 is waiting on column 1. The columns are wired in parallel but they *compute* in sequence.

Everything else today follows from that one sentence.`, {
      terms: [
        ['Full adder', 'One column of binary addition: inputs a, b and carry-in; outputs a sum bit and a carry-out.'],
        ['Carry-in / carry-out', 'The carry a column receives from its right and passes to its left.'],
        ['Ripple-carry adder', 'w full adders chained carry-out to carry-in. Simple, small, and slow at large widths.'],
        ['Combinational', 'Logic with no memory: outputs follow inputs after a delay, with no clock involved.'],
      ]
    }),
    q.info('H', 'Propagation delay and the critical path', `A gate is not instant. When its input changes, its output follows some time later, because the transistors have to charge the capacitance of the wire and of the gates they drive. That time is the gate's **propagation delay**.

Delays add along a path. If a signal must pass through 8 gates in a row, you wait 8 delays. The longest such chain of gates anywhere between the inputs and the outputs of a block is its **critical path**, and it is the number that matters: the clock period has to be longer than it, or the next register will capture a value that has not finished settling.

In a ripple-carry adder the carry can have to travel through every full adder, so the critical path grows with the width. Double the width, double the delay. That is the whole objection to ripple carry, and it is why a 64-bit adder is a serious piece of engineering while an 8-bit one is not.

Note what does *not* grow: the number of full adders is w either way. Ripple carry is small. It is the delay that is expensive.`, {
      terms: [
        ['Propagation delay', 'The time between an input changing and a gate\'s output settling.'],
        ['Critical path', 'The slowest input-to-output chain in a combinational block. It sets the minimum clock period.'],
        ['Clock period', 'The time between clock edges. Must exceed the critical path, or a register captures an unsettled value.'],
        ['Area vs delay', 'The standard trade: more gates working in parallel can shorten the critical path.'],
      ]
    }),
    q.info('H', 'Generate, propagate, kill: which columns actually have to wait', `A column does not always have to wait for its carry. Look at its two input bits before any carry arrives.

- Both 1: the column produces a carry whatever comes in. It **generates**.
- Both 0: it cannot produce a carry whatever comes in. It **kills**.
- One of each: its carry-out is a *copy* of its carry-in. It **propagates**.

Only the propagating columns wait. Generate and kill columns settle one full-adder delay after the inputs arrive, and — this is the useful part — they **break the chain**, because everything to their left can start from a carry that is already known.

So the delay of the whole adder is set by the longest unbroken run of propagating columns. That gives a rule you can apply by hand:

> the carry out of column 0 settles at time 1; after that, a generate or kill column settles at time 1, and a propagate column settles one step after its right-hand neighbour.

The tallest bar in the simulator is the adder's delay. Tap bits and watch a single generate column collapse a long chain.`, {
      terms: [
        ['Generate (G)', 'Both input bits are 1: the column makes a carry regardless of its carry-in.'],
        ['Kill (K)', 'Both input bits are 0: no carry can leave, regardless of the carry-in.'],
        ['Propagate (P)', 'The input bits differ: the carry-out simply copies the carry-in, so the column must wait.'],
        ['Carry chain', 'A run of propagating columns that must settle one after another. Its length is the adder\'s delay.'],
      ],
      widget: W('ripple', { width: 8, a: 0b11111111, b: 0b00000001 })
    }),
    q.goal('H', 'In the 8-bit ripple-carry timing simulator, set A and B so that the longest carry chain reaches **all 8** stages — the adder\'s worst case.', W('ripple', { width: 8, a: 0b00001111, b: 0b00001111 }), s => s.depth === 8,
      'A = 11111111, B = 00000001 does it. Column 0 has 1 + 1, so it generates at time 1. Every column above has 1 + 0, so each propagates and waits for the one below: times 2, 3, … 8. One carry travels the whole width.'),
    q.num('H', 'In an 8-bit ripple-carry adder, the worst-case carry has to pass through how many full adders?', 8, 'Column 0\'s carry-out feeds column 1, and so on up to column 7: eight stages in series. The delay grows in proportion to the width.'),
    q.mc('H', 'An 8-bit unsigned ripple-carry adder computes `11111111 + 00000001`. What appears at the outputs?', ['00000000 with carry-out 1', '11111111 with carry-out 0', '00000001 with carry-out 1', '100000000, since the result widens to 9 bits'], 0, '255 + 1 = 256 needs a ninth bit, which the adder does not have. The 8-bit result is 0 and the carry-out flags the loss. It is also the slowest case: one carry crosses all eight columns.'),
    q.num('H', 'An 8-bit unsigned adder computes 200 + 100. What 8-bit result appears?', 44, '300 does not fit in 0 … 255. What comes out is 300 − 256 = 44, with carry-out 1. Check the carry-out or widen to 9 bits.'),
    q.mc('H', 'In one column of a binary adder the input bits are a = 1 and b = 0. How does that column behave?', ['It propagates: its carry-out is a copy of its carry-in, so it must wait for the column to its right', 'It generates a carry regardless of the carry-in', 'It kills the carry regardless of the carry-in', 'It cannot produce a sum bit'], 0, 'One 1 and one 0 means the column\'s output carry equals whatever arrives. Equal input bits (1+1 or 0+0) decide the carry on their own and break the chain.'),
    q.num('H', 'An 8-bit ripple-carry adder is given A = `01010101` and B = `10101010`, so every column has one 1 and one 0. Counting the carry out of column 0 as settling at time 1, at what time does the carry out of column 7 settle?', 8, 'Every column propagates, so nothing breaks the chain: the settle times run 1, 2, 3, … 8. Note the carry-in is 0, so no carry actually travels — the *circuit* still cannot know that until the wave has crossed.'),
    q.num('H', 'An 8-bit ripple-carry adder is given A = `11110000` and B = `11110000`, so every column has two equal bits. At what time does the last carry settle, counting one full-adder delay as 1?', 1, 'Every column either generates (1+1) or kills (0+0), so each decides its own carry-out immediately. Nothing waits: depth 1, the best case.'),
    q.num('H', 'A full adder has a delay of 0.2 ns. What is the worst-case settling time of a 16-bit ripple-carry adder, in nanoseconds?', 3.2, '16 stages in series in the worst case: 16 × 0.2 = 3.2 ns. Widening to 32 bits would make it 6.4 ns — the delay is proportional to the width.', { unit: 'ns', tol: 0.05 }),
    q.mc('H', 'A faster adder replaces the ripple chain with a tree of carry logic. What is being traded?', ['More gates and area, for less delay', 'Less area for less delay', 'It is faster at no cost', 'The numeric result changes'], 0, 'A carry-lookahead or prefix adder computes the generate and propagate signals for whole blocks at once, so the depth grows like log of the width instead of the width. It pays for that with extra logic. H01 L5 measures exactly this trade on a real device.'),
    q.mc('H', 'Interview: a colleague benchmarks an adder with random inputs and reports an average settling time of 0.4 ns. Why is that number useless for closing timing?', ['The clock must be safe for every input, not a typical one, so only the worst case counts; a rare all-propagate pattern would produce a wrong value once in a while', 'Averages are always wrong', 'Random inputs are not representative of real data', 'Because 0.4 ns is too fast to measure'], 0, 'Same discipline as worst-case complexity in software. A circuit that is fast on average and too slow once in ten million inputs fails once in ten million inputs, silently.'),
    q.mc('H', 'Interview: you must add two 64-bit numbers inside a 2 ns clock period, and one full adder costs 0.05 ns. Does a ripple-carry adder meet timing, and what is the reasoning?', ['No: 64 × 0.05 = 3.2 ns, well over 2 ns, so you need a lookahead or prefix adder, or the addition must be split across two cycles', 'Yes: 64 × 0.05 = 3.2 ns, which is under 2 ns', 'Yes, because the average case is far below the worst', 'It cannot be decided without knowing the input values'], 0, 'Worst-case depth times the per-stage delay is the whole calculation. 3.2 ns against a 2 ns budget fails, and the honest options are a shallower carry structure or pipelining.'),
    q.mc('H', 'Interview: someone claims a ripple-carry adder is slow because it has more gates than a lookahead adder. Correct them.', ['It has fewer gates: ripple carry is the smallest adder there is. It is slow because its gates are in series, so its critical path grows with the width', 'They are right: ripple adders use more gates', 'Both designs use the same number of gates', 'Gate count and delay are unrelated in every design'], 0, 'Area and delay are different axes. Ripple carry wins on area and loses on delay; lookahead spends area to shorten the path.'),
    q.code('H', 'Build: write `solve(w, a, b)`, a timing model of a `w`-bit ripple-carry adder. `a` and `b` are non-negative integers that fit in `w` bits. Return `[sum, carry_out, depth]`: `sum` is the `w`-bit result, `carry_out` is 0 or 1, and `depth` is when the last carry settles in full-adder delays. Timing rule: the carry into column 0 is known at time 0; a column whose two input bits are **equal** settles its carry-out at time 1; a column whose bits **differ** settles one step after the column to its right. `depth` is the largest of those times.', {
      fn: 'solve',
      starter: 'def solve(w, a, b):\n    t = 0          # settle time of the carry out of the column to the right\n    depth = 0\n    for i in range(w):\n        ai = (a >> i) & 1\n        bi = (b >> i) & 1\n        # equal bits settle at 1; different bits settle one step after t\n        pass\n    total = a + b\n    return [total & ((1 << w) - 1), total >> w, depth]\n',
      tests: [
        { args: [8, 255, 1], expect: [0, 1, 8], name: 'the worst case: 11111111 + 00000001' },
        { args: [8, 240, 240], expect: [224, 1, 1], name: 'every column has equal bits, so depth 1' },
        { args: [8, 85, 170], expect: [255, 0, 8], name: '01010101 + 10101010: every column propagates' },
        { args: [8, 200, 100], expect: [44, 1, 3], name: '200 + 100 wraps to 44, and its longest chain is only 3' },
        { args: [8, 0, 0], expect: [0, 0, 1], name: 'all columns kill: depth 1' },
        { args: [1, 1, 1], expect: [0, 1, 1], name: 'width 1: one column, which generates' },
        { args: [4, 7, 1], expect: [8, 0, 3], name: '0111 + 0001: generate at the bottom, then two propagates' },
        { args: [8, 1, 2], expect: [3, 0, 2], name: 'columns 0 and 1 differ, the rest kill, so depth 2' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        w = random.choice([1, 2, 4, 8, 12, 17])\n        yield [w, random.randint(0, (1 << w) - 1), random.randint(0, (1 << w) - 1)]',
      refCode: 'def ref(w, a, b):\n    t, depth = 0, 0\n    for i in range(w):\n        if ((a >> i) & 1) == ((b >> i) & 1):\n            t = 1\n        else:\n            t = t + 1\n        depth = max(depth, t)\n    s = a + b\n    return [s & ((1 << w) - 1), s >> w, depth]',
      speed: { gen: 'def gen():\n    w = 4000\n    return [w, random.getrandbits(w), random.getrandbits(w)]', budgetMs: 1500, label: 'a 4000-bit addition' },
      solution: 'def solve(w, a, b):\n    t = 0\n    depth = 0\n    for i in range(w):\n        ai = (a >> i) & 1\n        bi = (b >> i) & 1\n        if ai == bi:\n            t = 1\n        else:\n            t = t + 1\n        if t > depth:\n            depth = t\n    total = a + b\n    return [total & ((1 << w) - 1), total >> w, depth]'
    }, 'The loop is the hardware. A column with equal bits generates or kills, so it decides its own carry-out and the running time resets to 1 — that is the chain being broken. A column with different bits copies its carry-in, so its time is one more than its neighbour\'s. The maximum over all columns is the critical path. Notice the result and the depth are computed independently: 200 + 100 gives the same 44 however fast the carries settle, which is exactly why a timing bug is invisible in a functional simulation and only shows up as a wrong value on real silicon.'),

    // =====================================================================================================
    // ALGORITHMS: loop invariants (A01 L1)
    // =====================================================================================================
    q.info('A', 'An invariant is a proof, not a comment', `You cannot test a loop on every possible input. So how do you *know* it is right?

You find one sentence about the variables that stays true all the way through, and check it in three places.

1. **Establishment** — it is true before the first pass.
2. **Maintenance** — if it is true at the start of a pass, it is still true at the end.
3. **Termination** — when the loop stops, that sentence plus the reason it stopped gives you the answer.

Those three checks cover a loop of any length, because 1 and 2 together mean it holds after every pass, however many there are. That is exactly the induction argument in today's maths thread: base case, then each step passing the truth to the next.

This is why an invariant is a **proof** and a comment is not. A comment says what you hope. An invariant is a claim you can check line by line, and a bug shows up as a specific pass where maintenance fails.

It is also why "what is your loop invariant?" is the first thing an interviewer asks. If you cannot state one, you do not yet know why your loop works — you only know it passed the examples you tried.`, {
      terms: [
        ['Loop invariant', 'A statement about the variables that is true before the loop and after every pass.'],
        ['Establishment', 'Checking the invariant holds before the first pass.'],
        ['Maintenance', 'Checking that one pass preserves it.'],
        ['Termination', 'Combining the invariant with the exit condition to get the result.'],
        ['Induction', 'Proving something for every n by proving it for the first case and showing each case implies the next.'],
      ]
    }),
    q.info('A', 'Max and its first index: the invariant in full', `The task: find the largest value in a list and the **first** index where it appears.

Keep two variables, \`best\` and \`best_idx\`, and walk once from left to right. Here is the invariant:

> after processing \`arr[0..i-1]\`, \`best\` is the maximum of those elements and \`best_idx\` is the smallest index where it occurs.

**Establishment.** Take \`arr[0]\` and set \`i = 1\`. The maximum of one element is that element, at index 0. True.

**Maintenance.** Look at \`arr[i]\`. If it is strictly greater than \`best\`, it is the new maximum and this is its only occurrence so far, so update both. If it is not strictly greater, \`best\` is still the maximum, and since \`arr[i]\` did not beat it the earliest occurrence has not moved. Either way the sentence is true again for \`i + 1\`.

**Termination.** The loop ends with \`i = n\`, so the sentence now covers the whole list. That is the answer.

Notice where the two design decisions live. \`>\` keeps the **first** index; \`>=\` would keep the last. Neither is more correct — the specification decides, and a list with a repeated maximum is the test that catches the wrong choice.`, {
      terms: [
        ['Prefix', 'The part of the list processed so far, arr[0..i-1]. Invariants are usually statements about a prefix.'],
        ['Strict comparison', '> rather than >=. With >, a tie leaves best_idx alone, so the earliest occurrence survives.'],
        ['Tie-breaking', 'The rule deciding which of several equal maxima is reported. A specification, not a detail.'],
        ['Comparison count', 'How many element comparisons the loop makes: n − 1 here, since the first element is taken without one.'],
      ],
      widget: W('arraystep', { arr: [3, 9, 2, 9, 5] })
    }),
    q.goal('A', 'Step the max-finder all the way through the list `[3, 9, 2, 9, 5]` and watch what the invariant promises after each pass.', W('arraystep', { arr: [3, 9, 2, 9, 5] }), s => s.i === 5,
      'The 9 at index 1 becomes best. The 9 at index 3 is not strictly greater, so best_idx stays 1. Four comparisons for five elements, and at the end the invariant covers the whole list: max 9, first index 1.'),
    q.info('A', 'The empty list, and why sum([]) is fine but max([]) is not', `Try to establish the invariant on an empty list and you cannot. "The maximum of zero elements" does not exist — not because of a coding accident, but because a maximum has to *be* one of the elements, and there are none.

So the function must make an explicit decision: raise an error, or return \`None\`, and say which in its documentation. Returning 0 or −1 is the worst option, because the caller cannot tell that answer apart from a real one. It is a silent lie.

Compare a running sum. Its invariant is "after k passes, \`total\` is the sum of the first k items", and that *can* be established on an empty list: the sum of nothing is 0. There is a real reason — adding 0 changes nothing, so 0 is the natural starting value for adding, in the same way that 1 is for multiplying. So \`sum([]) == 0\` is honest and \`max([])\` raising is honest, and the difference is not arbitrary.

How to find an invariant of your own: ask what your variables *mean* half way through, in a sentence that mentions the loop counter. If you cannot say it, the loop is probably doing too much.`, {
      terms: [
        ['Empty case', 'What a function does with zero items. Decide it deliberately; never let it fall out of the code.'],
        ['Precondition', 'What must be true of the input for the function to make sense. "Non-empty" is a precondition of max.'],
        ['Identity element', 'The value that leaves an operation unchanged: 0 for adding, 1 for multiplying. It is the honest empty answer.'],
        ['Silent lie', 'Returning a plausible value for a case that has no answer, so the caller cannot detect it.'],
      ]
    }),
    q.num('A', 'Finding the maximum of a list of 5 elements in one pass takes how many comparisons between elements?', 4, 'The first element is adopted without any comparison; each of the remaining 4 is compared once. In general n − 1.'),
    q.num('A', 'Finding the maximum of a list of 1000 elements in one pass takes how many comparisons between elements?', 999, 'n − 1 again. It is also the best possible: every element except the winner has to lose a comparison at least once, and each comparison produces one loser.'),
    q.mc('A', 'A one-pass max-finder runs over `[3, 9, 2, 9, 5]` and updates only when `arr[i] > best` (strictly greater). Which index does it report for the maximum?', ['1', '3', '4', '0'], 0, 'The 9 at index 1 sets best. The 9 at index 3 is not strictly greater, so best_idx is left alone. With >= it would move to 3.', { grid: true }),
    q.mc('A', 'What should `find_max([])` do?', ['Raise an error or return None — a documented, explicit choice', 'Return 0', 'Return −1 as the maximum', 'Return the smallest possible integer'], 0, 'A maximum has to be one of the elements, and there are none. Returning 0 is a value the caller cannot distinguish from a real answer.'),
    q.mc('A', 'Which sentence is a correct invariant for a one-pass loop finding the maximum of a list?', ['After each pass, best is the maximum of the elements seen so far', 'best is the maximum of the whole list', 'i is less than the length of the list', 'best is always positive'], 0, 'An invariant talks about the prefix processed so far. "The whole list" is only true at the end, and the other two say nothing that would give you the answer at termination.'),
    q.order('A', 'Put the three obligations of an invariant proof in the order you check them.', ['establishment: the invariant is true before the first pass', 'maintenance: one pass preserves it', 'termination: the invariant plus the exit condition gives the answer'], 'Establish, maintain, then read off the result. Establishment and maintenance together give you every pass by induction; termination turns that into the answer you wanted.'),
    q.mc('A', 'Why is `sum([]) == 0` a defensible answer while `max([])` raising an error is also defensible?', ['Adding 0 changes nothing, so 0 is the natural starting value for a sum, but a maximum must be one of the elements and an empty list has none', 'Both are arbitrary conventions with no reason behind them', 'Because sums are faster to compute than maxima', 'Because 0 is smaller than every possible maximum'], 0, 'The empty answer for an operation is its identity element, when it has one. Maximum has no identity among the numbers, so there is nothing honest to return.'),
    q.mc('A', 'Interview: a candidate writes `best = 0` before the loop instead of `best = arr[0]`. On which inputs does it fail, and which part of the invariant proof breaks?', ['It fails on any list whose values are all negative, returning 0; establishment breaks, because 0 is not the maximum of the empty prefix and is not an element at all', 'It fails only on empty lists; maintenance breaks', 'It fails on lists with duplicates; termination breaks', 'It never fails, it is just less readable'], 0, 'For [−4, −2, −9] it returns 0, a value that is not in the list. Starting from arr[0] establishes the invariant honestly; starting from 0 quietly assumes a non-negative input.'),
    q.mc('A', 'Interview: you must return the index of the **last** occurrence of the maximum instead of the first. What changes in the code and what changes in the invariant?', ['The comparison becomes >=, and the invariant\'s word "smallest index" becomes "largest index"; nothing else changes', 'You must sort the list first', 'You must run the loop backwards and reverse the answer', 'Nothing changes: the two are the same for any list'], 0, 'One character in the code and one word in the sentence. That is the sign of a good invariant: the specification and the code line up one to one.'),
    q.mc('A', 'Interview: why can no algorithm find the maximum of n distinct values with fewer than n − 1 comparisons?', ['Every element except the maximum must lose at least one comparison to be ruled out, and each comparison produces exactly one loser, so at least n − 1 comparisons are needed', 'Because the loop has to visit every element', 'Because comparisons are the slowest operation available', 'It can be done in fewer using a divide-and-conquer scheme'], 0, 'A counting argument, not an implementation detail: n − 1 losers, one loser per comparison. It also proves the simple loop is optimal, which is a satisfying thing to be able to say.'),
    q.code('A', 'Write `solve(arr)` returning `(max_value, first_index)`, or `None` when `arr` is empty. Use one pass and a strict `>` comparison, so a tie keeps the earliest index. The speed test runs 300,000 elements, so anything that sorts or rescans will be too slow.', {
      fn: 'solve',
      starter: 'def solve(arr):\n    # return (max_value, first_index), or None for an empty list\n    if not arr:\n        return None\n    best = arr[0]\n    best_idx = 0\n    for i in range(1, len(arr)):\n        # your comparison here\n        pass\n    return (best, best_idx)\n',
      tests: [
        { args: [[3, 9, 2, 9, 5]], expect: [9, 1] },
        { args: [[]], expect: null, name: 'the empty case: no maximum exists' },
        { args: [[-4, -2, -9]], expect: [-2, 1], name: 'all negative: starting from 0 would fail here' },
        { args: [[7]], expect: [7, 0], name: 'a single element' },
        { args: [[1, 1, 1]], expect: [1, 0], name: 'all equal: the first index wins' },
        { args: [[5, 4, 3, 2]], expect: [5, 0], name: 'maximum at the front' },
        { args: [[2, 3, 4, 5]], expect: [5, 3], name: 'maximum at the end' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(1, 30)\n        yield [[random.randint(-5, 5) for _ in range(n)]]',
      refCode: 'def ref(arr):\n    if not arr:\n        return None\n    m = max(arr)\n    return [m, arr.index(m)]',
      speed: { gen: 'def gen():\n    return [[random.randint(-10**6, 10**6) for _ in range(300000)]]', budgetMs: 1500, label: '300,000 elements' },
      solution: 'def solve(arr):\n    if not arr:\n        return None\n    best, best_idx = arr[0], 0\n    for i in range(1, len(arr)):\n        if arr[i] > best:\n            best, best_idx = arr[i], i\n    return (best, best_idx)'
    }, 'The empty check comes first because the invariant cannot be established without at least one element. Inside the loop, strict `>` is what keeps the earliest index: on a tie nothing is updated, so best_idx never moves to a later duplicate. The hidden checks compare against `max(arr)` with `arr.index`, which is the same specification written a different way — a small second opinion on your own code, in the spirit of the handbook\'s "independent oracle".'),

    // =====================================================================================================
    // MATHS: expectation (M06)
    // =====================================================================================================
    q.info('M', 'Expectation: the number a long run averages to', `Roll a fair die many times and keep a running average. It jumps about early on and then settles near **3.5**. That number is the **expected value** of the roll.

Why 3.5? Roll N times. Each face comes up about N/6 times, so the total is about (N/6)(1 + 2 + 3 + 4 + 5 + 6) = 21N/6 and the average is 21/6 = 3.5. The N cancels, which is the point: the answer does not depend on how long you roll. Replace "about N/6 times" by "with probability 1/6" and you have the general formula:

**E[X] = Σ x · P(X = x)**

so expectation is defined without rolling anything at all.

**The die never shows 3.5.** That is not a flaw. E[X] is the balance point of the distribution — put equal weights at 1 … 6 on a ruler and it balances in the middle — and a balance point need not be one of the weights' positions.

One more habit: expectation keeps the units of X. If X is a payout in pounds then E[X] is in pounds, and a payout table with a probability column is a question about money, not about numbers.`, {
      terms: [
        ['Expected value E[X]', 'Σ x·P(X = x): the probability-weighted average, and the long-run average of repeated trials.'],
        ['Balance point', 'The mechanical picture of a mean: probabilities as weights placed at the values.'],
        ['Fair die', 'Six faces, each with probability 1/6.'],
        ['Units', 'E[X] carries the units of X: pounds, seconds, packets.'],
      ],
      widget: W('dieavg', {})
    }),
    q.goal('M', 'Roll the die in the running-average simulator at least 50 times and watch where the running average settles.', W('dieavg', {}), s => s.n >= 50,
      'The average wanders wildly for the first few rolls and then closes in on the dashed line at 3.5. That line is E[X]: a value no single roll can produce.'),
    q.info('M', 'Linearity: add the averages, never mind the dependence', `Two rules make expectation the most useful tool in the subject:

**E[X + Y] = E[X] + E[Y]** and **E[cX] = c · E[X]**.

The first holds **always** — whether or not X and Y have anything to do with each other. Why? Because the sum is worked out outcome by outcome: Σ (x + y)·P is just Σ x·P + Σ y·P, a rearrangement of a finite sum. Dependence changes which outcomes are likely; it does not change the fact that each term is counted once on both sides.

That is a big deal, because independence is usually the hard thing to check.

Immediate payoffs. Two dice: 3.5 + 3.5 = 7, with no 36-cell table. Ten fair flips: 10 × 1/2 = 5 heads, with no listing of 1024 sequences.

The move that generalises it is the **indicator**: to count things, write the count as a sum of 0/1 variables, one per thing, each equal to 1 when that thing happens. Then E[count] = Σ P(that thing happens).

Example: how many adjacent equal pairs in 10 fair flips? There are 9 adjacent positions, each matching with probability 1/2, so the answer is 4.5 — and the pairs *overlap*, so they are not independent, and linearity does not care.`, {
      terms: [
        ['Linearity of expectation', 'E[X + Y] = E[X] + E[Y] and E[cX] = c·E[X], with no independence required.'],
        ['Indicator variable', 'A variable that is 1 when an event happens and 0 otherwise. Its expectation is the event\'s probability.'],
        ['Counting by indicators', 'Write a count as a sum of indicators, then add their probabilities.'],
        ['Dependence', 'When one variable\'s value changes another\'s distribution. It blocks many rules, but never linearity of expectation.'],
      ]
    }),
    q.info('M', 'What a mean does not tell you', `Two distributions can share a mean and be nothing alike. A fair die averages 3.5. A coin paying 0 or 7 with equal chance also averages 3.5. One never strays far from the middle; the other is never near it. How far values spread from the mean is a separate question, and Day 23 answers it.

A trap that follows: **E[X²] is not E[X]²**. For a fair die, E[X²] = (1 + 4 + 9 + 16 + 25 + 36)/6 = 91/6 ≈ 15.17, while E[X]² = 3.5² = 12.25. The gap between them, 2.92, is exactly the spread you were just warned about.

The general shape: E[g(X)] = Σ g(x)·P(x), and that equals g(E[X]) only when g is a straight line. Averaging and then squaring is not the same as squaring and then averaging.

A real-world version: drive one mile at 60 mph and one mile at 20 mph. The average speed is not 40 mph, because speed is distance over time and it is the *times* that add. So check whether the quantity you are averaging is the one that adds — expectation is linear, but the quantity you feed it might not be.`, {
      terms: [
        ['Spread', 'How far values sit from the mean. Two distributions with the same mean can have very different spreads.'],
        ['E[g(X)]', 'Σ g(x)·P(x). Equal to g(E[X]) only when g is linear.'],
        ['Non-linear function', 'Squaring, inverting, taking a maximum. Averaging does not pass through these unchanged.'],
      ]
    }),
    q.num('M', 'What is the expected value of one roll of a fair six-sided die?', 3.5, '(1 + 2 + 3 + 4 + 5 + 6)/6 = 21/6 = 3.5. Each face carries weight 1/6, and the balance point of six equal weights at 1 … 6 is the middle.'),
    q.num('M', 'A fair coin is flipped 10 times. What is the expected number of heads?', 5, 'Each flip contributes 1/2 in expectation, and expectations add: 10 × 1/2 = 5.'),
    q.num('M', 'Two fair six-sided dice are rolled. What is the expected value of their total?', 7, 'E[die] + E[die] = 3.5 + 3.5 = 7, by linearity — no need to build the 36-cell table.'),
    q.tf('M', 'Linearity of expectation, E[X + Y] = E[X] + E[Y], requires X and Y to be independent.', false, 'It never does. Adding expectations is a rearrangement of a finite sum, so dependence cannot break it — which is exactly why it solves problems where independence fails, such as counting overlapping pairs.'),
    q.num('M', 'A fair six-sided die is rolled once and you are paid £2 for each pip showing. What is your expected payment, in pounds?', 7, 'Payment = 2X, so E[2X] = 2 × 3.5 = £7. Every term of Σ x·P(x) is multiplied by the same 2.', { unit: '£' }),
    q.num('M', 'Three fair six-sided dice are rolled. What is the expected value of their total?', 10.5, '3 × 3.5 = 10.5 by linearity. Note that 10.5 is not a possible total for three dice, which is fine.'),
    q.num('M', 'A fair six-sided die is rolled once. What is E[X²], where X is the number showing?', 91 / 6, '(1 + 4 + 9 + 16 + 25 + 36)/6 = 91/6 ≈ 15.17. Compare E[X]² = 12.25: squaring after averaging is a different operation from averaging after squaring.', { display: '91/6 ≈ 15.17', tol: 0.02 }),
    q.num('M', 'A fair coin is flipped 10 times, giving 9 adjacent pairs of consecutive flips. What is the expected number of adjacent pairs that match (HH or TT)?', 4.5, 'Use an indicator per pair: each of the 9 pairs matches with probability 1/2, so the expected count is 9 × 1/2 = 4.5. The pairs overlap and are not independent; linearity does not care.'),
    q.num('M', 'A fair six-sided die is rolled 30 times. What is the expected number of sixes?', 5, 'An indicator per roll, each with probability 1/6: 30 × 1/6 = 5.'),
    q.num('M', 'Interview: five letters are put into five addressed envelopes completely at random, one per envelope. What is the expected number of letters that end up in the right envelope?', 1, 'Indicator per letter: each has probability 1/5 of reaching its own envelope, so the expected count is 5 × 1/5 = 1. The letters are heavily dependent — one being right changes the others — and linearity still applies. The answer is 1 for any number of letters.'),
    q.num('M', 'Interview: a fair six-sided die is rolled once. You win £1 per pip, except that rolling a 1 costs you £5. What is your expected profit, in pounds?', 2.5, 'Payouts are −5, 2, 3, 4, 5, 6, each with probability 1/6. Sum = 15, so E = 15/6 = £2.50. Work with the payout column, not the face column.', { unit: '£', tol: 0.02 }),
    q.mc('M', 'Interview: "The expected value of a die is 3.5, so the total of 10 rolls is 35." What is right and what is wrong in that sentence?', ['The expected total really is 35, by linearity; but the actual total is random and 35 is only its centre, not a prediction', 'Everything is right', 'The expected total is not 35: expectations of dependent variables do not add', 'The expected total is 35 only if the rolls are independent'], 0, 'The arithmetic is correct and the certainty is not. Independence is not needed for the sum of expectations; the missing idea is spread, not dependence.'),
    q.num('M', 'Interview: a fair six-sided die is rolled twice. What is the expected number of *distinct* faces seen?', 11 / 6, 'Put an indicator on each of the six faces: face k appears at least once with probability 1 − (5/6)² = 11/36. Six faces give 6 × 11/36 = 11/6 ≈ 1.83. Counting by cases (same or different) gives the same answer with more work.', { display: '11/6 ≈ 1.833', tol: 0.02 }),

    // =====================================================================================================
    // DEGREE: the derivative as a limit of secant slopes (E02 L1, MATH19611)
    // =====================================================================================================
    q.info('E', 'The problem: what does "the rate right now" mean?', `The average rate of change of f between two points is easy. Take the rise, divide by the run:

(f(x + h) − f(x)) / h

That is the slope of the straight line through the two points on the curve — the **secant**. Distance over time, rise over run, nothing mysterious.

The rate *at a single instant* is a puzzle. Over zero time nothing moves, so you get 0/0, which means nothing.

The way out is not to set h to zero, but to watch what the quotient does as h shrinks. Try f(x) = x²:

((x + h)² − x²) / h = (2xh + h²) / h = **2x + h**

for every h that is not zero. The algebra is exact and we never divided by zero. Now let h shrink: the answer heads towards 2x and towards nothing else. So we *define* the instantaneous rate to be 2x.

That is what a **limit** is: the value an expression closes in on, not a value it is required to reach. Slide h towards zero in the simulator and watch the secant tilt onto the tangent.`, {
      terms: [
        ['Secant', 'The straight line through two points on a curve. Its slope is the average rate of change between them.'],
        ['Tangent', 'The line touching the curve at one point with the same slope as the curve there.'],
        ['Difference quotient', '(f(x + h) − f(x)) / h: the secant slope, before any limit is taken.'],
        ['Limit', 'The value an expression closes in on as a variable approaches something. It need never be attained.'],
        ['Derivative', "f'(x) or df/dx: the limit of the difference quotient as h → 0. The slope of the tangent."],
      ],
      widget: W('secant', { x0: 1, h: 1 })
    }),
    q.goal('E', 'In the secant simulator for f(x) = x² + 3x + 2, slide h down to **0.05 or less** and compare the secant slope with the tangent slope.', W('secant', { x0: 1, h: 1 }), s => s.h <= 0.05,
      'At x = 1 the tangent slope is f′(1) = 2(1) + 3 = 5. The secant slope is exactly 5 + h, so at h = 0.05 it reads 5.05 and at h = 0.01 it reads 5.01. The gap is h itself, closing to nothing.'),
    q.info('E', 'The rules, derived rather than quoted', `Every rule you need today comes out of the same difference quotient.

**A constant.** (c − c)/h = 0 for every h. A flat line has slope 0.

**A straight line, 3x.** (3(x + h) − 3x)/h = 3h/h = 3, for every h. Its slope is 3 everywhere, so no limit is even needed.

**x².** Shown already: 2x + h, so the derivative is 2x.

**Sums.** The difference quotient of f + g is the difference quotient of f plus that of g, so derivatives add.

**Any power.** Expand (x + h)ⁿ = xⁿ + n·xⁿ⁻¹h + (terms with h² and above). Subtract xⁿ, divide by h: n·xⁿ⁻¹ + (terms that still contain h). Let h go and the leftovers vanish: **d/dx xⁿ = n·xⁿ⁻¹**.

Put it together for f(x) = x² + 3x + 2: **f′(x) = 2x + 3**. At x = 1 that is 5, so near x = 1 the curve climbs about 5 units for each unit of x. Check it numerically: f(1) = 6, f(1.01) = 6.0501, and 0.0501/0.01 = 5.01. ✓

**What dx means.** dy/dx grew out of Δy/Δx with both shrinking. It is one symbol, not a division of two numbers — but because it is the limit of genuine fractions, it behaves like one in everything you will do this year. Reading it as "how much y changes per unit of x" is always safe.`, {
      terms: [
        ['Power rule', 'd/dx (xⁿ) = n·xⁿ⁻¹. Follows from the first two terms of the expansion of (x + h)ⁿ.'],
        ['Sum rule', 'Derivatives add: the difference quotient of a sum is the sum of the difference quotients.'],
        ['dy/dx', 'Leibniz notation for the derivative. One symbol, born from a genuine fraction Δy/Δx.'],
        ['Δ vs d', 'Δ is a finite change you could measure; d is the limit of a shrinking one.'],
      ],
      widget: W('tangent', { x0: 1 })
    }),
    q.info('E', 'Reading the shape, and rates in circuits', `The sign of the derivative tells you the shape at a glance: positive means rising, negative means falling, zero means momentarily flat. A point where f′ = 0 is a **stationary point** — the top of a hill, the bottom of a valley, or a flat spot.

For f(x) = x² + 3x + 2: f′(x) = 2x + 3 is zero at x = −1.5, and f(−1.5) = 2.25 − 4.5 + 2 = −0.25. Is that a minimum or a maximum? The slope 2x + 3 goes from negative to positive as x increases through −1.5, so the curve falls then rises: a **minimum**.

This is how every optimisation problem is solved: write the quantity as a function, differentiate, set to zero. Today's stretch does exactly that for R/(R + 2)², and the answer turns out to be the maximum-power-transfer result from yesterday's Thévenin work.

Rates of change are also the language of circuits. A capacitor obeys **i = C·dv/dt**: no change of voltage, no current, which is why a capacitor blocks a steady supply. An inductor obeys v = L·di/dt. Power is the rate at which energy is delivered, p = dE/dt. Day 8 runs all of these backwards by integrating.`, {
      terms: [
        ['Stationary point', "Where f'(x) = 0: the tangent is horizontal."],
        ['Minimum / maximum', 'A stationary point where the slope changes from negative to positive / positive to negative.'],
        ['Optimisation', 'Finding a best value by differentiating and setting the derivative to zero.'],
        ['dv/dt', 'The rate at which a voltage changes, in volts per second. A capacitor\'s current is C times this.'],
      ]
    }),
    q.num('E', "For f(x) = x² + 3x + 2, what is f'(1)?", 5, "f'(x) = 2x + 3, so f'(1) = 5. Check it numerically: f(1) = 6 and f(1.01) = 6.0501, giving a secant slope of 5.01."),
    q.num('E', "For f(x) = x² + 3x + 2, at what value of x is f'(x) = 0?", -1.5, "2x + 3 = 0 gives x = −1.5. The slope passes from negative to positive there, so it is the bottom of the parabola."),
    q.num('E', 'For f(x) = x² + 3x + 2, what is the value of f at its stationary point x = −1.5?', -0.25, 'f(−1.5) = 2.25 − 4.5 + 2 = −0.25. That is the lowest value the function ever takes.', { tol: 0.01 }),
    q.mc('E', 'The derivative of a function at a point tells you…', ['The slope of the curve there, i.e. its rate of change', 'The area under the curve so far', 'The value of the function there', 'The average value of the function'], 0, 'Slope is rise per run. Accumulated area is the integral, which is Day 8.'),
    q.num('E', 'For f(x) = x², what is the slope of the secant line between x = 1 and x = 1.1?', 2.1, 'The difference quotient is 2x + h with x = 1 and h = 0.1, giving 2.1. The tangent slope at x = 1 is 2, so the secant is exactly h too steep.', { tol: 0.01 }),
    q.num('E', 'For f(x) = x³, what is the derivative at x = 2?', 12, 'The power rule gives 3x², and 3 × 4 = 12.'),
    q.num('E', 'What is the derivative of the constant function f(x) = 5?', 0, 'The difference quotient is (5 − 5)/h = 0 for every h. A flat line has no slope.'),
    q.mc('E', 'Why is the derivative defined as a limit rather than by substituting h = 0 into (f(x + h) − f(x))/h?', ['Substituting h = 0 gives 0/0, which has no value; the limit instead asks what the quotient closes in on as h shrinks, which for x² is 2x + h → 2x', 'Because 0/0 equals 1 and that would be the wrong answer', 'Because computers cannot divide by zero', 'Because the difference quotient is only an approximation at any h'], 0, 'The algebra (2x + h) is exact for every non-zero h; the limit is how we extract a single number from it without ever dividing by zero.'),
    q.mc('E', 'A student writes "dy/dx is a fraction, so I can multiply both sides by dx". Is that safe?', ['It is a single symbol, not a division of two numbers, but because it is the limit of genuine fractions Δy/Δx it behaves like one in the manipulations of this course', 'Yes: dy and dx are ordinary numbers', 'No: any manipulation treating it as a fraction gives wrong answers', 'It depends on whether the function is increasing'], 0, 'The honest description is "not a fraction, but a limit of fractions, and that is why the fraction moves work". You will use exactly this when separating variables in a first-order equation on Day 11.'),
    q.num('E', 'The voltage across a 2 µF capacitor is changing at a steady rate of 3 V per millisecond. What current flows into it, in **milliamps**?', 6, 'i = C·dv/dt. Convert the rate: 3 V/ms is 3000 V/s. Then i = 2 × 10⁻⁶ × 3000 = 6 × 10⁻³ A = 6 mA.', { unit: 'mA', tol: 0.05 }),
    q.num('E', 'Exam-style: the charge passing a point in a circuit is q(t) = 3t² + 2t coulombs, with t in seconds. Calculate the current at t = 2 s, in amperes.', 14, 'Current is the rate of flow of charge: i = dq/dt = 6t + 2. At t = 2 s that is 14 A.', { unit: 'A' }),
    q.num('E', 'Exam-style: the voltage across a 10 µF capacitor is v(t) = 5t² volts, with t in seconds. Calculate the current into the capacitor at t = 2 s, in **microamps**.', 200, 'i = C·dv/dt with dv/dt = 10t. At t = 2 s, dv/dt = 20 V/s, so i = 10 × 10⁻⁶ × 20 = 2 × 10⁻⁴ A = 200 µA.', { unit: 'µA', tol: 1 }),
    q.num('E', 'Exam-style: a body moves so that its displacement is s(t) = t³ − 6t² + 9t metres, with t in seconds. It is momentarily at rest at two times. Give the later of the two, in seconds.', 3, 'Velocity is ds/dt = 3t² − 12t + 9 = 3(t − 1)(t − 3), which is zero at t = 1 s and t = 3 s. The later is 3 s.', { unit: 's' }),
    q.mc('E', 'A function has f′(x) = 0 at a point. How do you tell a minimum from a maximum without any new machinery?', ['Look at the sign of f′ just either side: negative then positive means the curve falls then rises, so it is a minimum; positive then negative means a maximum', 'A stationary point is always a minimum', 'Compare the value with f(0)', 'Check whether the function is positive there'], 0, 'A stationary point is only where the tangent is flat. What kind of point it is depends on how the slope behaves around it. For x² + 3x + 2 the slope 2x + 3 goes from negative to positive through x = −1.5, so it is a minimum.'),
    q.num('E', 'Exam-style: the current in a 50 mH inductor is i(t) = 4t² amperes, with t in seconds. The voltage across an inductor is v = L·di/dt. Calculate the voltage at t = 3 s, in volts.', 1.2, 'di/dt = 8t, which is 24 A/s at t = 3 s. Then v = 0.050 × 24 = 1.2 V.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'Exam-style: the energy delivered to a component up to time t is E(t) = 2t³ joules, with t in seconds. Power is the rate of delivery of energy. Calculate the power at t = 2 s, in watts.', 24, 'p = dE/dt = 6t². At t = 2 s that is 6 × 4 = 24 W.', { unit: 'W' }),
    q.num('E', 'Exam-style: a load resistance R is connected to a source whose Thévenin resistance is 2 Ω, so the power in the load is proportional to R/(R + 2)². Differentiate and find the value of R > 0 that maximises it, in ohms.', 2, 'Using the quotient rule, d/dR of R/(R + 2)² is ((R + 2)² − R·2(R + 2))/(R + 2)⁴ = (2 − R)/(R + 2)³. Setting the top to zero gives R = 2 Ω, matching the Thévenin resistance. That is the maximum-power-transfer result, derived rather than quoted.', { unit: 'Ω' }),
    ...genius(q, 6),
  ]
};
