import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(4);

// Day 4, rewritten to the standing rules: ground-up "why before what", short plain cards,
// every prompt self-contained, a full ~60-minute session. See C:\dev\study\CLAUDE.md and app/CONTENT_GUIDE.md.
export default {
  title: 'Mux & adder, loops, conditional probability, dividers',
  emoji: '🔧',
  strands: ['H', 'S', 'M', 'E'],
  summary: '**Hardware** (H01): why hardware cannot skip work and every `if` becomes a multiplexer, where `Y = ¬s·a + s·b` comes from, growing a mux taller and wider, the half adder, why a full adder\'s carry is the majority function, and a ripple-carry adder written as Python. **Code** (S01): `range` and the half-open rule, the accumulator pattern and its loop invariant, where a starting value comes from, `while` loops and why they terminate, local names and early returns, and the cost of a loop inside a loop. **Maths** (M04): conditioning as shrinking the sample space, where P(A|B) = P(A∩B)/P(B) comes from, the general multiplication rule, drawing without replacement, and the "at least one six" trap. **Degree** (E01): series and parallel derived from KCL and KVL, conductances adding, the divider as a ratio, and why the unloaded value lies once a load is attached.',
  takeaway: 'Hardware computes both branches and throws one away: a mux is `Y = (¬s AND a) OR (s AND b)`. A full adder counts the ones and writes the count in binary — low bit is the sum, high bit is the carry, which is therefore the majority of its three inputs. An accumulator\'s starting value is the answer for no items. P(A|B) = P(A and B)/P(B): shrink the sample space, then count. Series resistances add, parallel conductances add, Vout = Vs·R2/(R1+R2) — until you attach a load.',
  steps: [
    // =====================================================================================================
    // HARDWARE: the multiplexer and the adder
    // =====================================================================================================
    q.info('H', 'Hardware cannot skip work', `In software an \`if\` skips work: the branch not taken never runs. Hardware cannot skip. Every gate you place sits there permanently, computing on whatever its inputs happen to be.

So how does a circuit make a choice? It computes **both** answers, and then throws one away.

The part that throws one away is a **multiplexer**, or mux. A 2-to-1 mux has two data inputs a and b, a **select** input s, and one output Y. When s = 0 the output is a; when s = 1 it is b. A switch for signals, with no moving parts.

Every \`if\` in a hardware description becomes a mux, and every \`case\` becomes a bigger one. That is not trivia — it tells you the price. Writing "if the flag is set use this expensive calculation, otherwise that one" builds *both* calculations on the chip, and pays for both in area and power.`, {
      terms: [
        ['Multiplexer (mux)', 'A selector: passes one of several data inputs to the output, chosen by the select input.'],
        ['Select', 'The control input that decides which data input gets through. n select bits choose among 2ⁿ inputs.'],
        ['Data input', 'One of the values a mux chooses between. All of them are computed, all of the time.'],
        ['Branch', 'One arm of an if/else. In software only the taken branch costs time; in hardware every branch costs area.'],
      ]
    }),
    q.info('H', 'Where `Y = ¬s·a + s·b` comes from', `Write the mux truth table over s, a and b, and apply yesterday's sum-of-products recipe.

Y is 1 on four of the eight rows: the two with s=0 and a=1 (either value of b), and the two with s=1 and b=1. Collect each pair, whose two rows differ only in the input that is being ignored, and the expression collapses to

\`Y = (NOT s AND a) OR (s AND b)\`.

Now read it as machinery rather than algebra. \`NOT s AND a\` is an AND gate with one input held at \`NOT s\`. When s = 1 that input is 0, and an AND gate with a 0 on any input outputs 0 whatever the other input does — the a branch is switched off. At the same instant the other AND gate is enabled.

Exactly one term can be non-zero, so the OR simply collects whichever survived. A gate with a 0 on one input is a closed door.`, {
      terms: [
        ['Sum of products', 'OR of AND terms, read straight off the 1-rows of a truth table (Day 3).'],
        ['Enable', 'Holding one input of an AND gate at 1 lets the other through; holding it at 0 blocks it.'],
        ['Ternary', 'The one-line if/else: `b if s else a` in Python, `s ? b : a` in C and Verilog. It compiles to a mux.'],
      ],
      widget: W('muxsel', { s: 0, a: 1, b: 0 })
    }),
    q.goal('H', 'Using the gate-level mux simulator, try **all eight** combinations of the select bit s and the two data bits a and b.', W('muxsel', { s: 0, a: 0, b: 0 }), s => s.visited === 8,
      'Three inputs means 2³ = 8 combinations. Across all of them Y equals a whenever s = 0 and equals b whenever s = 1 — including the four rows where the ignored input is 1 and gets blocked by its AND gate anyway.'),
    q.mc('H', 'A 2-to-1 multiplexer has data inputs A and B and select S, with S = 1, A = 0, B = 1. What is the output Y?', ['1, because S = 1 selects B', '0, because S = 1 selects A', '1, because Y is A OR B', '0, because Y is A AND B'], 0, 'S = 1 routes B to the output, so Y = B = 1. The value of A is computed and then discarded.'),
    q.mc('H', 'Which Boolean expression is a 2-to-1 multiplexer with select S and data inputs A and B?', ['`(NOT S AND A) OR (S AND B)`', '`(S AND A) OR (S AND B)`', '`A XOR B`', '`(A OR B) AND S`'], 0, 'Exactly one of the two AND terms is enabled by S, so exactly one data input reaches the OR. The second option ANDs both branches with S, which loses A entirely.'),
    q.mc('H', 'Interview: a colleague argues that writing `if slow_a else slow_b` in an HDL is cheap because only one branch runs. Why is that wrong?', ['Hardware has no "runs": both calculations are built as permanent circuits, and the mux only chooses which result to forward — you pay area and power for both', 'It is right; synthesis deletes the unused branch', 'It is wrong only when the condition is constant', 'It is wrong because HDLs have no if statement'], 0, 'This is the single biggest mental shift from software to hardware. If both branches are expensive, you look for a way to share the expensive part before the mux, not after it.'),
    q.info('H', 'Growing a mux: taller and wider', `Two independent directions, and beginners mix them up.

**Taller** means more choices. A 4-to-1 mux picks one of four inputs, so it needs 2 select bits — n select bits address 2ⁿ inputs, the same place-value counting as Day 1. Build one from three 2-to-1 muxes: two of them pick between pairs using s0, and a third picks between those two results using s1.

**Wider** means bigger values. To choose between two 8-bit buses you do not need a cleverer mux, you need eight copies of the 1-bit mux, all sharing one select wire. The copies work side by side, so width costs area in proportion and costs no extra delay.

So: the select width comes from how many *choices* there are, and the gate count comes from choices × bus width.`, {
      terms: [
        ['4-to-1 mux', 'Chooses one of four data inputs using 2 select bits. Buildable from three 2-to-1 muxes.'],
        ['Select width', 'Number of select bits. n bits address 2ⁿ inputs, exactly as n address bits address 2ⁿ memory entries.'],
        ['Bus', 'A group of wires carrying one multi-bit value, e.g. an 8-bit bus.'],
        ['Mux tree', 'Muxes arranged in layers, each layer using one select bit.'],
      ]
    }),
    q.num('H', 'How many select bits does a **16-to-1** multiplexer need?', 4, '2⁴ = 16, so 4 select bits address the 16 inputs. The same counting as address bits for a 16-entry memory.'),
    q.num('H', 'How many **2-to-1** multiplexers are needed to build an 8-to-1 multiplexer as a tree?', 7, 'Four muxes pick between the four pairs, two pick between those results, and one final mux picks between those: 4 + 2 + 1 = 7. In general a 2ⁿ-to-1 tree needs 2ⁿ − 1 of them.'),
    q.num('H', 'A multiplexer chooses between two **32-bit** buses. How many 1-bit 2-to-1 multiplexers does it contain?', 32, 'One per bit position, all driven by the same single select wire. Width multiplies area but adds no delay, because the copies operate in parallel.'),
    q.info('H', 'One column of addition: the half adder', `Add two bits. 0+0 = 0, 0+1 = 1, 1+0 = 1, and 1+1 = 2, which in binary is \`10\`: a **sum** bit of 0 with a **carry** of 1 into the next column.

Look at those four rows. The sum bit is 1 exactly when the two inputs differ — that is XOR. The carry is 1 only when both are 1 — that is AND.

\`sum = a XOR b\` and \`carry = a AND b\`.

Two gates, and one column of binary addition is finished.

It is called a **half** adder because it has nowhere to accept a carry arriving *from* the column on its right. Every column except the rightmost needs that, which is why the half adder on its own is never enough for a real adder.`, {
      terms: [
        ['Half adder', 'Adds two bits: sum = a XOR b, carry = a AND b. No carry input.'],
        ['Sum bit', 'The bit that stays in this column.'],
        ['Carry', 'The overflow into the next column left, exactly like carrying a 1 in decimal addition.'],
      ]
    }),
    q.mc('H', 'A half adder is given A = 1 and B = 1. What does it produce?', ['sum 0, carry 1', 'sum 1, carry 0', 'sum 1, carry 1', 'sum 0, carry 0'], 0, '1 + 1 = 2, which is binary 10: the column keeps 0 and passes a 1 into the next column left.'),
    q.info('H', 'Three bits in, two out: the full adder', `A real column has three bits arriving: a, b, and the carry coming in from the column on its right. Their total is 0, 1, 2 or 3.

Now write that total in binary, because the two output wires *are* its two bits:

| total | carry-out | sum |
|---|---|---|
| 0 | 0 | 0 |
| 1 | 0 | 1 |
| 2 | 1 | 0 |
| 3 | 1 | 1 |

The **sum** bit is the low bit of the total, so it is 1 when the number of 1s is odd: \`sum = a XOR b XOR cin\`.

The **carry-out** is the high bit, so it is 1 when the total is 2 or more — that is, when **at least two** of the three inputs are 1. That function has a name: **majority**. As gates, \`cout = a·b + a·cin + b·cin\`.

You never need to memorise either formula. Count the ones, write the count in binary: low bit is the sum, high bit is the carry.`, {
      terms: [
        ['Full adder', 'Adds three bits (a, b, carry-in) and produces a sum bit and a carry-out.'],
        ['Carry-in / carry-out', 'The carry arriving from the column to the right / leaving towards the column to the left.'],
        ['Majority function', 'Output 1 when more than half of the inputs are 1. For three inputs it is exactly the full adder carry.'],
        ['Parity', 'Whether the number of 1s is odd. XOR of several bits is their parity, and that is the sum bit.'],
      ]
    }),
    q.mc('H', 'A full adder is given A = 1, B = 1 and carry-in = 1. What does it produce?', ['sum 1, carry-out 1', 'sum 0, carry-out 1', 'sum 1, carry-out 0', 'sum 0, carry-out 0'], 0, 'The three inputs total 3, which is binary 11: sum bit 1 (odd number of 1s) and carry-out 1 (at least two 1s).'),
    q.num('H', 'A full adder has 8 rows in its truth table. On how many of them is the **carry-out** equal to 1?', 4, 'Carry-out is the majority of three bits: it is 1 when at least two inputs are 1. That is the three rows with exactly two 1s plus the one row with three: 3 + 1 = 4. By symmetry it is exactly half the rows.'),
    q.mc('H', 'Why is a full adder\'s carry-out described as the **majority** of its three inputs?', ['The carry-out is the high bit of the total, so it is 1 exactly when the total is 2 or 3 — when at least two of the three inputs are 1', 'Because it is the most common output value', 'Because it equals A XOR B XOR carry-in', 'Because most adders are built that way by convention'], 0, 'Counting the ones and writing the count in binary gives both outputs at once: low bit = parity = sum, high bit = "two or more" = majority = carry.'),
    q.info('H', 'Ripple carry: chaining the columns', `Place one full adder per bit position, wire each carry-out into the next carry-in, and tie the rightmost carry-in to 0. That is a **ripple-carry adder**: long addition, done in parallel hardware.

Two consequences follow immediately.

**Width.** Adding two n-bit unsigned numbers can produce n+1 bits: 255 + 255 = 510, which needs 9. That extra bit is the final carry-out. Throw it away and you get Day 2's wrap-around; keep it and the result is exact.

**Delay.** The top sum bit cannot settle until the carry has rippled all the way up from the bottom. An n-bit ripple adder therefore takes roughly n carry delays, so a 32-bit one is about 32 times slower than a 1-bit one. That linear growth is the reason cleverer carry structures exist at all.`, {
      terms: [
        ['Ripple-carry adder', 'A chain of full adders, each carry-out feeding the next carry-in.'],
        ['Carry-in of the lowest bit', 'Tied to 0 for addition. Tying it to 1 while inverting one input performs subtraction (Day 2).'],
        ['Critical path', 'The slowest signal route through a circuit. In a ripple adder it is the carry chain.'],
        ['Result width', 'n-bit + n-bit needs n+1 bits to be exact. The extra bit is the final carry-out.'],
      ],
      widget: W('adder', { width: 4, a: 0b1011, b: 0b0110, signed: false, allowSignedToggle: false })
    }),
    q.num('H', 'Two unsigned 4-bit values `1011` and `0110` are added. What is the true sum, in decimal?', 17, '11 + 6 = 17 = binary 10001. That needs 5 bits: the 4-bit result 0001 with a carry-out of 1.'),
    q.mc('H', 'Adding two unsigned **8-bit** values with no loss of information needs a result of how many bits?', ['9 bits', '8 bits', '16 bits', '10 bits'], 0, 'The largest possible sum is 255 + 255 = 510, and 510 < 512 = 2⁹. One extra bit is always enough for an addition (multiplication is a different story).'),
    q.num('H', 'Interview: you must add sixteen unsigned **12-bit** numbers and keep every result exact. How many bits does the accumulator need?', 16, 'The worst case is 16 × 4095 = 65,520, and 2¹⁶ = 65,536 covers it. The rule of thumb: summing 2ᵏ values of width n needs n + k bits, here 12 + 4 = 16. Sizing this by guesswork is how "logically plausible but wrong" arithmetic gets shipped.'),
    q.num('H', 'Interview: a 32-bit ripple-carry adder has a carry delay of 0.25 ns per bit stage and nothing else in the path. What is the highest clock frequency it can support, in MHz?', 125, '32 stages × 0.25 ns = 8 ns for the carry to reach the top. A clock period must be at least 8 ns, so the frequency is at most 1/8 ns = 125 MHz. Halving the width would double the ceiling, which is the trade every adder architecture is arguing about.', { unit: 'MHz', tol: 1 }),
    q.mc('H', 'Interview: a 4-bit ripple-carry adder gives 3 + 4 = 8 and 0 + 0 = 1. Every full adder tests correct on its own. What is the most likely wiring fault?', ['The carry-in of the lowest full adder is tied to 1 instead of 0, adding an extra 1 to every result', 'The sum outputs are reversed', 'The two operands are swapped', 'The carry-out of the top bit is left unconnected'], 0, 'Both results are exactly one too large, whatever the inputs, including the all-zero case. A constant +1 points straight at the carry-in of bit 0 — which is also the wire deliberately tied to 1 when the adder is asked to subtract.'),
    q.code('H', 'Build a ripple-carry adder. Write `solve(a, b, cin)` where `a` and `b` are equal-length lists of 0/1 bits with the **most significant bit first**, and `cin` is the carry into the rightmost column (0 or 1). Walk the columns from right to left with one full adder each: the sum bit is `a XOR b XOR carry` and the new carry is the majority of the three. Return `[sum_bits, carry_out]`, where `sum_bits` is a list of the same length, most significant first. Do **not** convert the lists to integers and use `+`; model the hardware.', {
      fn: 'solve',
      starter: 'def solve(a, b, cin):\n    n = len(a)\n    out = [0] * n\n    carry = cin\n    for i in range(n - 1, -1, -1):     # rightmost column first\n        # sum bit = a[i] ^ b[i] ^ carry ; new carry = majority(a[i], b[i], carry)\n        pass\n    return [out, carry]\n',
      tests: [
        { args: [[1, 0, 1, 1], [0, 1, 1, 0], 0], expect: [[0, 0, 0, 1], 1], name: '11 + 6 = 17: four sum bits plus a carry-out' },
        { args: [[0], [0], 0], expect: [[0], 0], name: 'one bit, nothing set' },
        { args: [[1], [1], 0], expect: [[0], 1], name: '1 + 1 = 10' },
        { args: [[1], [1], 1], expect: [[1], 1], name: '1 + 1 + 1 = 11: the full adder at its busiest' },
        { args: [[1, 1, 1, 1], [0, 0, 0, 1], 0], expect: [[0, 0, 0, 0], 1], name: '15 + 1 wraps to 0 with a carry-out' },
        { args: [[1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0], 0], expect: [[1, 1, 1, 1, 1, 1, 1, 1], 0], name: '255 + 0: the carry never fires' },
        { args: [[], [], 1], expect: [[], 1], name: 'zero-width adder: the carry passes straight through' },
      ],
      gen: 'def gen():\n    for _ in range(50):\n        n = random.randint(0, 12)\n        yield [[random.randint(0, 1) for _ in range(n)], [random.randint(0, 1) for _ in range(n)], random.randint(0, 1)]',
      refCode: 'def ref(a, b, cin):\n    n = len(a)\n    va = int("".join(str(x) for x in a), 2) if n else 0\n    vb = int("".join(str(x) for x in b), 2) if n else 0\n    t = va + vb + cin\n    return [[(t >> (n - 1 - i)) & 1 for i in range(n)], t >> n]',
      solution: 'def solve(a, b, cin):\n    n = len(a)\n    out = [0] * n\n    carry = cin\n    for i in range(n - 1, -1, -1):\n        x, y = a[i], b[i]\n        out[i] = x ^ y ^ carry\n        carry = (x & y) | (x & carry) | (y & carry)\n    return [out, carry]'
    }, 'Each pass is one full adder: XOR of the three bits for the sum, majority of the three for the carry that moves left. Going right to left matters, because a column cannot be finished until the column on its right has decided its carry — which is exactly the physical carry chain, and exactly why a wide ripple adder is slow. The reference check converts the lists to integers and adds, so the model is compared against real arithmetic on random widths, including the zero-width case where the carry just passes through.'),

    // =====================================================================================================
    // CODE: loops, accumulators, functions
    // =====================================================================================================
    q.info('S', 'range: counting without writing the numbers', `\`for i in range(5):\` runs its indented block with i = 0, 1, 2, 3, 4. Five passes, and not a single number typed out.

\`range(a, b)\` counts from a up to **but not including** b, so \`range(2, 5)\` gives 2, 3, 4. That is the half-open rule from Day 2's slices, and it earns its keep the same way: the count of numbers is just b − a, and \`range(0, k)\` followed by \`range(k, n)\` covers \`range(0, n)\` exactly once, with no overlap and no gap.

\`range(a, b, step)\` skips: \`range(10, 20, 5)\` gives 10 and 15, because 20 is excluded. Two passes.

A range does not build a list. It hands out one number at a time, so \`range(10**9)\` is instant and uses almost no memory. Wrap it in \`list(...)\` only when you genuinely want the numbers, and only when there are few of them.`, {
      terms: [
        ['range(a, b)', 'The integers a, a+1, …, b−1. range(3) means range(0, 3): 0, 1, 2.'],
        ['Half-open', 'Includes the start, excludes the stop. Length is stop − start, and adjacent ranges tile.'],
        ['Step', 'The third argument: range(10, 20, 5) gives 10, 15. A negative step counts down.'],
        ['Lazy', 'A range produces its numbers on demand instead of storing them, so a huge range costs nothing.'],
      ],
      widget: W('repl', { lines: [['list(range(3))', '[0, 1, 2]'], ['list(range(2, 5))', '[2, 3, 4]'], ['list(range(10, 20, 5))', '[10, 15]'], ['len(range(0, 10, 3))', '4'], ['list(range(3, 3))', '[]'], ['sum(range(4))', '6'], ['list(range(3, 0, -1))', '[3, 2, 1]']] })
    }),
    q.tokens('S', 'What does `range(2, 5)` produce, in order?', ['2', '3', '4'], ['5', '1'], 'Start at 2, stop before 5. Three numbers, because 5 − 2 = 3.', { mono: true }),
    q.num('S', 'What does `sum(range(4))` evaluate to?', 6, 'range(4) is 0, 1, 2, 3, and 0 + 1 + 2 + 3 = 6.'),
    q.num('S', 'How many times does the body of `for i in range(10, 20, 5):` run?', 2, 'i takes the values 10 and 15. The next would be 20, which is excluded by the half-open rule.'),
    q.num('S', 'What does `len(range(0, 10, 3))` evaluate to?', 4, 'The values are 0, 3, 6, 9 — the next would be 12, past the stop. Four of them.'),
    q.info('S', 'The accumulator, and where its starting value comes from', `Almost every loop you will write has one skeleton: a variable holding the answer so far, updated once per item.

\`\`\`
def total(xs):
    s = 0
    for x in xs:
        s = s + x
    return s
\`\`\`

\`s\` is the **accumulator**. Here is the claim that makes the function correct: *after k passes, s is the sum of the first k items.* It is true before the loop starts (zero items, sum 0), and each pass keeps it true, so it is still true at the end — when k is the whole list. A claim like that is a **loop invariant**, and it is how you check a loop without running it.

The starting value is not arbitrary. It is the answer for **no items at all**: 0 for a sum, 1 for a product. For a maximum there is no such value, which is exactly why \`max([])\` raises an error, and why your own function has to decide what an empty input means and say so.`, {
      terms: [
        ['Accumulator', 'The variable that carries the answer-so-far through a loop.'],
        ['Loop invariant', 'A statement that is true before the loop and stays true after every pass, so it is true at the end.'],
        ['Identity value', 'The starting value: the answer when there are no items. 0 for a sum, 1 for a product.'],
        ['Empty input', 'The zero-item case. Decide it deliberately, document it, and test it.'],
      ]
    }),
    q.mc('S', 'A function sums a list with `s = 0` before the loop and `s = s + x` inside it. Why must the starting value be 0 rather than, say, the first item?', ['0 is the sum of no items, so the invariant "s is the sum of the items seen so far" is already true before the first pass — and the empty list then works for free', 'Because Python requires variables to start at 0', 'Because 0 is the smallest integer', 'It makes no difference which value is used'], 0, 'The starting value is the answer for an empty input. Choosing it that way is what makes the empty case correct without a special branch.'),
    q.mc('S', 'You write a function that returns the largest item of a list. What should it do when the list is empty?', ['Decide deliberately — return None, or raise — then document and test that choice; there is no "largest of nothing"', 'Return 0, which is always safe', 'Return the empty list', 'Nothing needs deciding; Python handles it'], 0, 'There is no identity value for a maximum, so the empty case is a genuine design decision. `max([])` raises ValueError precisely because Python refused to invent an answer.'),
    q.info('S', 'while: when you do not know how many passes', `A \`for\` loop needs to know its items in advance. Sometimes you only know when to **stop**.

\`\`\`
def halvings(n):
    count = 0
    while n > 0:
        n = n // 2
        count = count + 1
    return count
\`\`\`

That counts how many times you can halve n before reaching 0 — Day 1's repeated halving, which is also how many bits n needs.

A \`while\` loop is only safe if something moves. Here n is a whole number that strictly shrinks every pass and cannot go below 0, so the loop must stop. That argument — *some non-negative whole number gets strictly smaller each pass* — is the standard way to prove a loop terminates.

Forget it and you get the classic bug: a condition that never becomes false, and a program that hangs with no error message at all.`, {
      terms: [
        ['while', 'Repeat the block as long as a condition is true. The condition is tested before each pass.'],
        ['Termination', 'The guarantee that a loop stops. Usually: a non-negative whole number that strictly decreases every pass.'],
        ['Infinite loop', 'A while whose condition never becomes false. The program hangs, silently.'],
        ['for versus while', 'for when you know the items in advance; while when you only know the stopping condition.'],
      ],
      widget: W('whileloop', {
        title: 'while n > 0: n = n // 2  — starting from n = 19',
        code: 'def halvings(n):\n    count = 0\n    while n > 0:\n        n = n // 2\n        count = count + 1\n    return count\n\nhalvings(19)',
        header: ['pass', 'n at the start of the pass', 'n after n = n // 2', 'count'],
        rows: [[1, 19, 9, 1], [2, 9, 4, 2], [3, 4, 2, 3], [4, 2, 1, 4], [5, 1, 0, 5]],
        note: 'n reached 0, so the condition n > 0 is false and the loop stops. 19 is 10011 in binary: 5 bits, 5 halvings.'
      })
    }),
    q.goal('S', 'Step the trace of `halvings(19)` (which repeatedly does `n = n // 2` while `n > 0`) all the way to the end, and watch n march down to 0.', W('whileloop', {
      title: 'while n > 0: n = n // 2  — starting from n = 19',
      code: 'count = 0\nwhile n > 0:\n    n = n // 2\n    count = count + 1',
      header: ['pass', 'n at the start of the pass', 'n after n = n // 2', 'count'],
      rows: [[1, 19, 9, 1], [2, 9, 4, 2], [3, 4, 2, 3], [4, 2, 1, 4], [5, 1, 0, 5]],
      note: 'Five passes, so 19 needs 5 bits.'
    }), s => s.step === s.total, 'n goes 19 → 9 → 4 → 2 → 1 → 0: five passes. n is a non-negative whole number that strictly shrinks every pass, so the loop cannot run forever. The count, 5, is the number of bits in 19 = 10011.'),
    q.num('S', 'Trace by hand: `n = 19`, `count = 0`, then `while n > 0: n = n // 2; count = count + 1`. What is `count` at the end?', 5, '19 → 9 → 4 → 2 → 1 → 0, which is five passes. That is also the number of bits in 19 (binary 10011).'),
    q.mc('S', 'What guarantees that `while n > 0: n = n // 2` finishes, for any positive whole number n?', ['n is a non-negative whole number that gets strictly smaller every pass, so it must reach 0', 'Python limits every loop to 1000 passes', 'Floor division always returns 0 eventually because of rounding errors', 'Nothing guarantees it; the loop may run forever'], 0, 'A strictly decreasing non-negative integer cannot decrease forever. Replace `n // 2` with `n - 0` and the same loop never ends — the difference is exactly this argument.'),
    q.info('S', 'Functions: local names, early returns, several results', `Day 1 gave you \`def\` and \`return\`. Three more things worth owning.

**Names inside a function are local.** A variable created in the body exists only during the call and vanishes when it returns. Two different functions can both use \`i\` and never collide. That isolation is why you can reuse a function without reading its insides.

**\`return\` ends the call immediately.** Nothing after it runs, which lets you deal with an awkward case first and get it out of the way:

\`\`\`
def first_even(xs):
    for x in xs:
        if x % 2 == 0:
            return x
    return None
\`\`\`

The loop stops the moment it finds an answer. The final \`return None\` is reached only when the list ran out — the empty case, decided on purpose.

**You can return several values** by returning a list or tuple: \`return [total, count]\`. The caller unpacks with \`total, count = f(xs)\`. Every exercise here checks what you return, never what you print.`, {
      terms: [
        ['Local name', 'A variable created inside a function. It exists only during that call.'],
        ['Early return', 'Returning from the middle of a function, usually as soon as the answer is known.'],
        ['Returning several values', 'Return a list or tuple; the caller unpacks it with `a, b = f(...)`.'],
        ['Sentinel', 'A stand-in value such as None meaning "there was no answer".'],
      ]
    }),
    q.mc('S', 'A function body runs `print(x)` and has no `return` statement. What does a caller receive from it?', ['None', '0', 'the printed value', 'an error'], 0, 'Printing puts text on the screen; returning hands a value back. A function with no return gives None, so a test that checks the result sees None.', { grid: true }),
    q.mc('S', 'In `def first_even(xs):` a `for` loop returns `x` as soon as `x % 2 == 0`, and there is a final `return None` after the loop. When is that final line reached?', ['Only when the loop finished without finding an even number, including when the list was empty', 'On every call, after the loop returns', 'Never; it is unreachable code', 'Only when the list is empty'], 0, 'An early return exits the function at once, so the line after the loop runs only if the loop ran out of items. That covers both "no even numbers" and "no items at all".'),
    q.info('S', 'One pass, or a pass per item', `Find, for each item of a list, how far it is below the list's maximum.

The straightforward version scans the whole list to find the maximum *inside* the loop, once per item. That is n scans of n items: about n² work.

The one-pass-then-another version finds the maximum once, then walks the list subtracting. That is n + n work.

At n = 100 you cannot tell the difference. At n = 50,000 it is 2.5 billion steps against 100,000 — a coffee break against an instant.

The habit to build: whenever you see a loop inside a loop, ask whether the inner one recomputes the same thing every time. If it does, lift it out. Most slow code in the wild is one forgotten lift, not a deep algorithmic mistake.`, {
      terms: [
        ['Nested loop', 'A loop inside a loop. Its total work is roughly the product of the two counts.'],
        ['Hoisting', 'Moving a computation out of a loop when it does not depend on the loop variable.'],
        ['O(n) versus O(n²)', 'Work in step with the input, versus work in step with its square.'],
      ],
      widget: W('bigo', { n: 512 })
    }),
    q.mc('S', 'Interview: a function loops over a list of n numbers and, inside that loop, calls `max(xs)` to compare each item against the largest. How slow is it, and what is the fix?', ['O(n²), because each `max(xs)` scans the whole list; compute the maximum once before the loop, giving O(n)', 'O(n), because `max` is a built-in and therefore free', 'O(n log n), because `max` sorts the list', 'O(n²), and nothing can be done about it'], 0, '`max(xs)` does not depend on the loop variable, so it is the same answer every pass. Hoisting it out is the whole fix, and the output is unchanged.'),
    q.code('S', 'Write `solve(xs)`, a single-pass accumulator over a list of integers. Return `[total, largest, index_of_largest]`, where `index_of_largest` is the position of the **first** occurrence of the largest value. For the empty list return `[0, None, -1]`. Make one pass with a `for` loop: no `sum()`, no `max()`, no second walk over the list. A 50,000-item list must finish inside the time budget.', {
      fn: 'solve',
      starter: 'def solve(xs):\n    total = 0\n    best = None\n    at = -1\n    for i in range(len(xs)):\n        # add xs[i] to total; if xs[i] beats best, record it and its index\n        pass\n    return [total, best, at]\n',
      tests: [
        { args: [[3, 1, 4, 1, 5]], expect: [14, 5, 4] },
        { args: [[]], expect: [0, null, -1], name: 'empty list: no largest exists' },
        { args: [[7]], expect: [7, 7, 0], name: 'a single item is its own maximum' },
        { args: [[-3, -1, -7]], expect: [-11, -1, 1], name: 'all negative: 0 is not a safe starting maximum' },
        { args: [[2, 2, 2]], expect: [6, 2, 0], name: 'ties keep the first index' },
        { args: [[0, 0]], expect: [0, 0, 0], name: 'zeros are still real items' },
        { args: [[5, 9, 9, 1]], expect: [24, 9, 1], name: 'the second 9 must not move the index' },
      ],
      gen: 'def gen():\n    for _ in range(50):\n        n = random.randint(0, 15)\n        yield [[random.randint(-50, 50) for _ in range(n)]]',
      refCode: 'def ref(xs):\n    if not xs:\n        return [0, None, -1]\n    m = max(xs)\n    return [sum(xs), m, xs.index(m)]',
      speed: { gen: 'def gen():\n    return [[random.randint(-10**6, 10**6) for _ in range(50000)]]', budgetMs: 2000, label: '50,000 items' },
      solution: 'def solve(xs):\n    total = 0\n    best = None\n    at = -1\n    for i in range(len(xs)):\n        x = xs[i]\n        total = total + x\n        if best is None or x > best:\n            best = x\n            at = i\n    return [total, best, at]'
    }, 'Three accumulators, one pass. The invariant after k passes: total is the sum of the first k items, and best/at describe the largest of them. Two details do real work. Starting `best` at None rather than 0 is what makes the all-negative test pass — 0 is the identity for a sum, not for a maximum. And using a strict `>` is what keeps the *first* index on a tie; `>=` would silently report the last one. Both are the kind of thing an interviewer probes with exactly these inputs.'),
    q.mc('S', 'What does this loop compute? `ones = 0`, then `while n > 0: ones = ones + n % 2; n = n // 2`, for a non-negative integer n.', ['the number of 1 bits in the binary form of n', 'the number of binary digits n needs', 'n divided by 2', 'the largest power of 2 below n'], 0, '`n % 2` is the lowest bit, and `n // 2` throws it away, so each pass adds one bit of n to the accumulator. Counting the passes instead of the remainders would give the number of bits.'),
    q.num('S', 'Run `ones = 0`, then `while n > 0: ones = ones + n % 2; n = n // 2`, starting from n = 19. What is `ones` at the end?', 3, '19 is 10011 in binary. The remainders come out 1, 1, 0, 0, 1 as n goes 19 → 9 → 4 → 2 → 1 → 0, and three of them are 1. The accumulator starts at 0 because that is the count for no bits at all.'),

    // =====================================================================================================
    // MATHS: conditional probability (M04)
    // =====================================================================================================
    q.info('M', 'Given that…', `Two fair dice are rolled behind a screen. Someone tells you the sum is even. What is the chance both dice are even?

Before the news, 36 outcomes were on the table. After it, only 18 are still possible — the ones with an even sum. The other 18 have been ruled out, so they are no longer competing for your probability.

Now recount inside what is left. Of those 18, both dice are even in 9 (even + even) and both odd in the other 9. So the answer is 9/18 = **½**.

That is all conditioning is: **shrink the sample space to the outcomes the condition allows, then count normally**. The notation is P(A | B), read "the probability of A given B".

Notice what changed. Before the news, P(both even) was 9/36 = ¼. The information did not touch the dice. It changed which outcomes were still in the running.`, {
      terms: [
        ['Conditional probability', 'P(A | B): the probability of A once you know B happened. Read "|" as "given".'],
        ['Conditioning', 'Throwing away every outcome where the condition fails, then counting inside what remains.'],
        ['Conditional sample space', 'The outcomes that survive the condition. They are the new "everything".'],
        ['Joint probability', 'P(A and B), also written P(A ∩ B): both happen.'],
      ],
      widget: W('dice', { event: (a, b) => a % 2 === 0 && b % 2 === 0, eventName: 'both dice even', cond: (a, b) => (a + b) % 2 === 0, condName: 'sum is even' })
    }),
    q.num('M', 'Two fair dice are rolled. How many of the 36 outcomes have an **even** sum?', 18, 'Even + even gives 3 × 3 = 9, and odd + odd gives another 9. Total 18, exactly half — because whatever the first die shows, three of the six second-die values match its parity.'),
    q.num('M', 'Two fair dice are rolled and the sum turns out to be even. P(both dice are even) = ?', 0.5, 'The condition leaves 18 outcomes. Nine of them are even + even, the other nine odd + odd. So 9/18 = ½ — up from 9/36 = ¼ before the news.', { display: '9/18 = 1/2' }),
    q.info('M', 'Where the formula comes from', `Write that recount as a formula and the division appears on its own.

P(A | B) = (number of outcomes in both A and B) ÷ (number of outcomes in B).

Divide the top and the bottom by the total number of outcomes, and each count turns into a probability:

**P(A | B) = P(A and B) / P(B)**

The denominator is doing exactly one job: **renormalising**. The surviving outcomes have to add up to 1 again, and between them they only held P(B) of the probability, so everything inside B is scaled up by 1/P(B).

Two consequences worth carrying. P(A | B) is undefined when P(B) = 0 — you cannot condition on something impossible. And rearranged, the same formula becomes the general **multiplication rule**

**P(A and B) = P(B) · P(A | B)**,

which is true always, independent or not. Day 3's product rule is just the case where P(A | B) happens to equal P(A).`, {
      terms: [
        ['Renormalising', 'Rescaling the surviving probabilities by 1/P(B) so they add to 1 again.'],
        ['Multiplication rule (general)', 'P(A and B) = P(B)·P(A | B). Always true; independence is the special case P(A | B) = P(A).'],
        ['Undefined condition', 'P(A | B) makes no sense when P(B) = 0: you cannot be told something impossible happened.'],
      ]
    }),
    q.mc('M', 'Which expression defines the conditional probability of A given B?', ['P(A | B) = P(A and B) / P(B)', 'P(A | B) = P(A)·P(B)', 'P(A | B) = P(A) + P(B) − P(A and B)', 'P(A | B) = P(B) / P(A)'], 0, 'Count the outcomes where both happen, then divide by the size of the condition — that division is what makes the surviving outcomes add back up to 1.'),
    q.num('M', 'Two fair dice are rolled and the first die shows a 5. P(the sum is 10 or more) = ?', 1 / 3, 'The condition leaves the six outcomes (5,1) … (5,6). A sum of 10 or more needs the second die to be 5 or 6: two of the six. 2/6 = 1/3.', { display: '2/6 = 1/3' }),
    q.info('M', 'The multiplication rule, and drawing without replacement', `A bag holds 3 red and 2 blue counters. Draw two, without putting the first one back. What is P(both red)?

The first draw is red with probability 3/5. *Given* that it was red, the bag now holds 2 red and 2 blue, so the second draw is red with probability 2/4. Multiply along the branch:

P(both red) = (3/5) × (2/4) = 6/20 = **3/10**.

That is P(A and B) = P(A) · P(B | A) at work. The second factor is a conditional probability, which is exactly why the rule still holds even though the two draws are *not* independent.

Putting the counter back would make the second factor 3/5 again, giving 9/25 — and that is what independence looks like.

This is why tree diagrams work: every branch carries a conditional probability, and the probability of a whole path is the product along it.`, {
      terms: [
        ['Without replacement', 'The first item is not returned, so it changes what is left for the second draw.'],
        ['Tree diagram', 'Branches labelled with conditional probabilities. Multiply along a path, add across paths.'],
        ['Dependent draws', 'The second probability depends on the first outcome, so a single fixed probability will not do.'],
      ]
    }),
    q.num('M', 'A bag holds 3 red and 2 blue counters. Two are drawn without replacement. P(both are red) = ?', 0.3, 'First red: 3/5. Given that, the bag holds 2 red of 4, so the second is red with probability 2/4. Multiply along the branch: (3/5)(2/4) = 6/20 = 3/10.', { display: '3/10', tol: 0.002 }),
    q.num('M', 'A bag holds 3 red and 2 blue counters. Two are drawn, the first being **put back** before the second. P(both are red) = ?', 0.36, 'Replacing restores the bag, so both draws are red with probability 3/5 and they are independent: (3/5)² = 9/25 = 0.36. Compare 0.30 without replacement — removing a red makes a second red less likely.', { display: '9/25', tol: 0.002 }),
    q.num('M', 'Two cards are dealt from a well-shuffled 52-card deck, without replacement. P(both are aces), to 5 decimal places?', 1 / 221, 'First card an ace: 4/52. Given that, 3 aces remain among 51 cards: 3/51. So (4/52)(3/51) = 12/2652 = 1/221 ≈ 0.00452.', { display: '1/221 ≈ 0.00452', tol: 0.0001 }),
    q.info('M', "The trap: \"at least one\"", `Two fair dice are rolled behind a screen and you are told **at least one** of them shows a six. What is P(both are sixes)?

The tempting answer is 1/6: "one die is a six, so it comes down to the other one." It is wrong.

Shrink the space properly. "At least one six" is satisfied by 11 outcomes — the six with a six on the first die, plus the six with a six on the second, minus the double-counted (6,6). Of those 11, exactly one is (6,6).

So the answer is **1/11**.

The 1/6 answer is secretly conditioning on a *different* statement: "the **first** die is a six", which leaves 6 outcomes, one of which is (6,6). The phrase "at least one" does not single out a die, and that is the entire difference.

Read the condition literally, list what survives, count. Every version of this puzzle is that one discipline.`, {
      terms: [
        ['At least one', 'One or more, with no particular one singled out. Its conditional sample space is larger than "the first one".'],
        ['Double counting', 'Adding two overlapping groups counts the shared outcomes twice; subtract the overlap once.'],
        ['Reading the condition literally', 'The exact wording decides which outcomes survive. "At least one is a six" and "the first is a six" are different conditions.'],
      ],
      widget: W('dice', { event: (a, b) => a === 6 && b === 6, eventName: 'both dice are sixes', cond: (a, b) => a === 6 || b === 6, condName: 'at least one six' })
    }),
    q.num('M', 'Two fair dice are rolled and you are told at least one of them shows a six. P(both dice show a six) = ?', 1 / 11, 'The condition leaves 6 + 6 − 1 = 11 outcomes, and only (6,6) has two sixes. So 1/11 ≈ 0.0909, not 1/6.', { display: '1/11 ≈ 0.0909', tol: 0.002 }),
    q.num('M', 'Two fair dice are rolled and you are told the **first** die shows a six. P(both dice show a six) = ?', 1 / 6, 'This condition leaves only the six outcomes (6,1) … (6,6), one of which is (6,6). So 1/6 — a different answer from the "at least one six" version, because it is a different condition.', { display: '1/6 ≈ 0.1667', tol: 0.002 }),
    q.num('M', 'Interview: a fair coin is flipped twice and you are told at least one flip came up heads. P(both flips are heads) = ?', 1 / 3, 'The condition leaves HH, HT, TH — TT is ruled out. One of those three is HH, so 1/3, not 1/2. The instinct to say 1/2 comes from silently reading the condition as "the first flip was heads", which would leave HH and HT.', { display: '1/3', tol: 0.002 }),
    q.mc('M', 'Interview: "You told me at least one of your two dice is a six, so the other one is an ordinary fair die and P(both sixes) = 1/6." Where exactly does this argument break?', ['There is no "the other one": the condition does not name a die, so all 11 outcomes containing a six survive, not the 6 outcomes with a six on a named die', 'It should have used 1/36, since (6,6) is one of 36 outcomes', 'Dice are never independent, so no calculation applies', 'Nothing is wrong; 1/6 is correct'], 0, 'Naming a die is extra information that the statement never gave. "At least one is a six" survives 11 outcomes; "the first is a six" survives 6. Same words in English, different conditional sample spaces.'),
    q.mc('M', 'Interview: almost everyone who has flu has a headache, so someone with a headache probably has flu. Which quantities has this argument confused?', ['P(headache | flu) with P(flu | headache): the two are different, and they differ most when flu is rare and headaches are common', 'P(flu) with P(headache)', 'Conditional probability with independence', 'Joint probability with the sum rule'], 0, 'Conditioning is not symmetric. P(A|B) = P(A and B)/P(B) and P(B|A) = P(A and B)/P(A) share a numerator but divide by different things, so the rarity of each event decides the answer.'),

    // =====================================================================================================
    // DEGREE: series, parallel and the voltage divider (EEEN11101 / E01)
    // =====================================================================================================
    q.info('E', 'Series: one path, one current', `Two resistors sit in a single path, with nothing else joined between them. KCL at the joint says whatever leaves the first must enter the second, so both carry the **identical current** I.

KVL round the loop says the source voltage equals the sum of the drops:

V = I·R1 + I·R2 = I·(R1 + R2)

Look at that last bracket. As far as the source can tell, it is driving one resistor of value R1 + R2. **Series resistances add.**

Day 1's physical picture says the same thing: a wire twice as long has twice the resistance, and two resistors in a row are simply one longer obstacle course for the charge.

Nothing new was assumed here. It is KCL, KVL and Ohm's law, three lines apart.`, {
      terms: [
        ['Series', 'Components in a single path with no junction between them: same current through each, voltages add.'],
        ['Equivalent resistance', 'The single resistance that would draw the same current from the source. Series: R1 + R2 + …'],
        ['Same current', 'A consequence of KCL: a two-connection joint has nowhere to send current except onward.'],
      ]
    }),
    q.num('E', 'A 100 Ω resistor and a 300 Ω resistor are connected in **series**. What is the total resistance, in ohms?', 400, 'Series resistances add: 100 + 300 = 400 Ω. Both carry the same current, so their voltages add and the source sees one 400 Ω resistor.', { unit: 'Ω' }),
    q.info('E', 'Parallel: one voltage, and lanes add', `Now join both ends of two resistors to the same pair of nodes. Both of their ends are common, so both resistors have the **identical voltage** V across them. KCL at the top node says the current splits and then adds back:

I = V/R1 + V/R2 = V·(1/R1 + 1/R2)

So it is the **reciprocals** that add. 1/R has a name — **conductance**, measured in siemens — and conductances add in parallel because you are opening extra lanes for the same push.

For exactly two resistors, rearranging gives R = R1·R2/(R1 + R2), the "product over sum" shortcut. It works for two and only two.

Two sanity checks never to skip. The total is always **smaller than the smallest** resistor, because an extra lane cannot slow traffic down. And n equal resistors of value R in parallel give R/n.`, {
      terms: [
        ['Parallel', 'Components sharing both end nodes: same voltage across each, currents add.'],
        ['Conductance (G = 1/R)', 'How easily current gets through, in siemens (S). Conductances add in parallel.'],
        ['Product over sum', 'R1·R2/(R1 + R2): the parallel formula for exactly two resistors.'],
        ['Smaller than the smallest', 'The sanity check for any parallel combination. If your answer is bigger, you inverted something.'],
      ],
      widget: W('serpar', { R1: 100, R2: 300 })
    }),
    q.num('E', 'A 100 Ω resistor and a 300 Ω resistor are connected in **parallel**. What is the total resistance, in ohms?', 75, '1/R = 1/100 + 1/300 = 4/300, so R = 75 Ω. Or product over sum: 100 × 300 / 400 = 75. It is below 100, as any parallel combination must be.', { unit: 'Ω' }),
    q.num('E', 'Three 300 Ω resistors are connected in **parallel**. What is the total resistance, in ohms?', 100, 'Conductances add: 3 × (1/300) = 1/100, so R = 100 Ω. n equal resistors in parallel give R/n — three equal lanes carry three times the current for the same push.', { unit: 'Ω' }),
    q.num('E', 'A 100 Ω resistor is connected in parallel with an unknown resistor, and the combination measures 75 Ω. What is the unknown resistance, in ohms?', 300, '1/75 − 1/100 = 4/300 − 3/300 = 1/300, so the unknown is 300 Ω. Working in conductances turns this from an algebra problem into a subtraction.', { unit: 'Ω' }),
    q.mc('E', 'Why is the resistance of two resistors in parallel always smaller than either one of them?', ['Adding a second path gives the current somewhere extra to go, so the same voltage pushes more total current, which means less resistance', 'Because the formula has a division in it', 'Because the currents cancel each other', 'It is not always smaller; it depends on the values'], 0, 'Conductance is what adds, and adding a positive conductance always increases the total, so the resistance always falls. If your parallel answer exceeds the smaller resistor, you have inverted something.'),
    q.info('E', 'The voltage divider', `Two resistors in series across a supply, with the output taken across the lower one. There is only one path, so both carry the same current:

I = Vs / (R1 + R2)

The output is then just Ohm's law applied to R2:

**Vout = I·R2 = Vs · R2/(R1 + R2)**

That is the divider formula, and it is worth reading as a **ratio**: R2's share of the total resistance is R2's share of the voltage. Equal resistors split the supply in half. Make R2 nine times R1 and it takes nine tenths.

Notice what the formula does *not* contain: the actual resistance values, only their ratio. 1 kΩ over 1 kΩ and 1 MΩ over 1 MΩ both give exactly half — but they draw a thousand times different current, which decides the wasted power and, as the next card shows, how well the divider survives a load.`, {
      terms: [
        ['Voltage divider', 'Two series resistors splitting a supply voltage in the ratio of their resistances.'],
        ['Vout = Vs·R2/(R1+R2)', 'The output taken across R2. It follows from one shared current and Ohm\'s law.'],
        ['Ratio, not values', 'The output depends only on R1:R2. The absolute values set the current and the power wasted.'],
      ],
      widget: W('vdiv', { Vs: 10, R1: 1000, R2: 1000 })
    }),
    q.num('E', 'A 10 V source drives R1 = 1 kΩ in series with R2 = 1 kΩ. What is the voltage across **R2**, in volts?', 5, 'Vout = 10 × 1000/(1000 + 1000) = 5 V. Equal resistors carry the same current and so drop the same voltage.', { unit: 'V' }),
    q.num('E', 'Exam-style: a 12 V supply drives R1 = 4 kΩ in series with R2 = 8 kΩ. Find the current, in **milliamps**.', 1, 'The resistances add: 12 kΩ. I = 12 V / 12,000 Ω = 0.001 A = 1 mA.', { unit: 'mA', tol: 0.02 }),
    q.num('E', 'Exam-style: a 12 V supply drives R1 = 4 kΩ in series with R2 = 8 kΩ. Find the voltage across **R2**, in volts.', 8, 'Vout = 12 × 8000/12000 = 8 V. Check with Ohm\'s law on the 1 mA current: 0.001 × 8000 = 8 V, and 4 V + 8 V = 12 V as KVL demands.', { unit: 'V' }),
    q.num('E', 'Exam-style: a 12 V supply drives R1 = 4 kΩ in series with R2 = 8 kΩ. Find the power dissipated in the **4 kΩ** resistor, in **milliwatts**.', 4, 'P = I²R = (0.001)² × 4000 = 0.004 W = 4 mW. (Or 4 V across it × 1 mA = 4 mW.) The 8 kΩ takes 8 mW, and the supply delivers 12 V × 1 mA = 12 mW in total.', { unit: 'mW', tol: 0.1 }),
    q.num('E', 'Exam-style: design a divider that turns a 12 V supply into 3 V, using a total series resistance of 12 kΩ. What value must the **lower** resistor R2 have, in kilohms?', 3, 'The output is the ratio: 3/12 = ¼, so R2 must be a quarter of the total: R2 = 3 kΩ and R1 = 9 kΩ. Check: 12 × 3/12 = 3 V, with 1 mA flowing.', { unit: 'kΩ', tol: 0.05 }),
    q.info('E', 'The unloaded value is a promise it cannot keep', `Build a divider from 10 V with two 1 kΩ resistors and it reads 5 V. Connect anything to that output — a sensor input, the next stage, even a meter — and the reading drops.

Why: the load sits **in parallel** with R2. With a 1 kΩ load, R2 in parallel with the load is 500 Ω, so the divider is now 1 kΩ over 500 Ω and the output is 10 × 500/1500 = **3.33 V**. The 5 V was only ever true with nothing attached.

There is a tidy way to think about this, which Day 5 makes precise. From the load's point of view the whole divider behaves like a single source of 5 V — its **open-circuit** value — sitting behind a single resistance of R1 in parallel with R2, here 500 Ω. That pair is the divider's **Thévenin equivalent**.

The working rule that falls out: a divider only keeps its promise when the load resistance is much larger, say ten times, than R1 ∥ R2.`, {
      terms: [
        ['Loading', 'Drawing current from an output, which changes the voltage the output can hold.'],
        ['Open-circuit voltage', 'The output with nothing connected. For a divider, Vs·R2/(R1+R2).'],
        ['Thévenin equivalent (preview)', 'Any such network looks, from its terminals, like one source behind one resistance. Day 5 derives it.'],
        ['Rule of thumb', 'Keep the load at least ten times R1 ∥ R2 if you want the unloaded value to be roughly true.'],
      ],
      widget: W('divider', { Vs: 10, R1: 1000, R2: 1000, RL: 1000 })
    }),
    q.goal('E', 'In the divider simulator (10 V supply, R1 = 1 kΩ, R2 = 1 kΩ, load 1 kΩ), press the button that connects the load and watch the output fall away from 5 V.', W('divider', { Vs: 10, R1: 1000, R2: 1000, RL: 1000 }), s => s.loaded === true,
      'The 1 kΩ load sits in parallel with R2, making 500 Ω. The divider becomes 1 kΩ over 500 Ω, so the output is 10 × 500/1500 = 3.33 V. Nothing was faulty: the 5 V simply assumed no current was being drawn.'),
    q.num('E', 'Exam-style: a 10 V supply drives R1 = 1 kΩ in series with R2 = 1 kΩ, and a 1 kΩ load is then connected across R2. Find the output voltage, in volts, to 2 decimal places.', 3.33, 'The load is in parallel with R2: 1 kΩ ∥ 1 kΩ = 500 Ω. The divider is now 1000 over 500, so Vout = 10 × 500/1500 = 3.33 V. The unloaded 5 V was a promise the divider could not keep.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'Exam-style: a 9 V supply drives R1 = 3 kΩ in series with R2 = 6 kΩ, and a 6 kΩ load is connected across R2. Find the output voltage, in volts, to 1 decimal place.', 4.5, 'R2 in parallel with the load is 6 k ∥ 6 k = 3 kΩ. The divider becomes 3 kΩ over 3 kΩ, so Vout = 9 × 3/(3 + 3) = 4.5 V. Loading pulled it down from the unloaded 6 V.', { unit: 'V', tol: 0.05 }),
    q.mc('E', 'Exam-style: a divider made of two 1 kΩ resistors from 10 V reads 5.00 V on a very high-resistance meter, but only 3.33 V when a 1 kΩ load is attached. What is the correct explanation?', ['The load sits in parallel with the lower resistor, changing the ratio; the divider behaves as a 5 V source behind 500 Ω, so drawing current drops the output', 'The load has broken the divider', 'The supply voltage has fallen to 6.7 V', 'The meter was misreading the unloaded value'], 0, 'Nothing is faulty. Every divider has an internal resistance of R1 ∥ R2 = 500 Ω here, and any current drawn falls across it. Choosing a load at least ten times that resistance keeps the error small.'),
    ...genius(q, 4),
  ]
};
