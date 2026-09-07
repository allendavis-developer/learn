import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(8);

// Rewritten to the standing content rules (C:\dev\study\CLAUDE.md + app/CONTENT_GUIDE.md):
// short plain cards (90-220 words), why before what, every prompt self-contained,
// a code exercise in H and in A, and Exam-style / Interview questions closing every strand.
export default {
  title: 'Signed overflow, two-sum, product rule, integrals',
  emoji: '⚠️',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Week 2 begins. **Hardware** (H01 L2): why a signed adder has no spare pattern to mean "did not fit", the overflow test derived from the negative weight of the top bit, why two same-sign operands giving the opposite sign is exactly overflow, why a positive plus a negative can never overflow, why carry-out answers a different question, the one-gate hardware test, and a full-adder model returning sum, carry-out and overflow. **Algorithms** (A01 L2): why the quadratic scan dies at scale, the reframing that turns "which pair?" into "have I seen the partner?", what makes a dictionary lookup fast and what "expected" hides, and why looking up before inserting is the whole algorithm. **Maths** (M01 L1): the product rule for counting, the condition people forget, ordered versus unordered selections, and why dividing by k! is an over-counting argument rather than a formula. **Degree** (E02 L1): the integral as accumulated area, Riemann sums squeezing from both sides, the fundamental theorem argued from a thin sliver, signed area, and charge and energy as integrals.',
  takeaway: 'Signed overflow is **two same-sign operands producing the opposite sign** — 100 + 60 gives −96 in 8 bits. Carry-out cannot see it, because carry-out answers the *unsigned* question: 100 + 60 has carry-out 0 and overflows, while −1 + 1 has carry-out 1 and is perfectly correct. Two-sum: look up `target − x` **before** inserting x, so the partner is always at an earlier index. Ordered choices multiply (5 × 4 × 3 = 60) provided the number of later options never depends on the earlier pick; divide by k! only when order does not matter. An integral is the limit of Σ f(x)·Δx, and F(b) − F(a) computes it because the area function\'s derivative is f.',
  steps: [
    // =====================================================================================================
    // HARDWARE: signed overflow (H01 L2)
    // =====================================================================================================
    q.info('H', 'There is no pattern left to mean "did not fit"', `An 8-bit signed value uses the top bit with weight −128 and the rest with their usual weights. So the largest value is \`01111111\` = **127** and the smallest is \`10000000\` = **−128**. That is 256 values from 256 patterns.

Count them again, because the consequence is the whole card: every one of the 256 patterns already means a number. **None is spare.** There is nothing an adder could output to say "this did not fit".

So when an 8-bit adder is asked for 100 + 60, it must produce one of those 256 patterns, and whatever it produces will be read as an ordinary number by whatever comes next. Hardware cannot refuse, cannot raise an exception and cannot grow a bit.

That is why overflow is a **flag**: a separate wire coming out of the adder alongside the result, saying "the number on the result wires is not the number you asked for". A processor keeps such flags in a status register; an FPGA design has to route them somewhere deliberate. Either way, a flag nobody reads is the same as no flag at all.`, {
      terms: [
        ['Signed range', 'For width w: −2^(w−1) … 2^(w−1) − 1. For 8 bits, −128 … 127.'],
        ['Overflow', 'The true result lies outside the range, so the pattern produced means a different number.'],
        ['Flag', 'A one-bit output reporting something about a result that the result itself cannot express.'],
        ['Status register', 'Where a processor keeps its flags (carry, overflow, zero, negative) after an operation.'],
      ]
    }),
    q.info('H', 'Deriving the overflow test from the top bit', `Add 100 + 60 as signed 8-bit values. The true answer is 160. The 8-bit pattern of 160 is \`10100000\`, and read as signed that is −128 + 32 = **−96**. Two positive numbers produced a negative one.

Why exactly −96? An 8-bit adder throws away the carry out of the top, which means it computes the true sum **modulo 256**. So 160 and 160 − 256 = −96 share a pattern, and signed 8-bit can only show the one that lies inside −128 … 127. That is overflow: the pattern is right, and the number it stands for is the wrong one of the pair.

Now the test. Add two non-negative values: the true sum lies in 0 … 254. If it fits (0 … 127) the top bit is 0 and the result reads positive. If it does not (128 … 254) the top bit is 1 and the result reads negative. So **two positives giving a negative is exactly overflow**, with no exceptions either way. The mirror argument covers two negatives giving a non-negative result.

And a positive plus a negative can **never** overflow. Their true sum lies strictly between the two operands, so it is already inside the range before you start.`, {
      terms: [
        ['Signed overflow', 'Two operands of the same sign producing a result of the opposite sign.'],
        ['Modulo 2^w', 'What an adder computes when it discards the carry out of the top bit.'],
        ['Wrap', 'Keeping the low w bits, so a value outside the range reappears as a different one inside it.'],
        ['Saturate', 'Clamping to the largest or smallest representable value instead of wrapping. Day 9.'],
      ],
      widget: W('adder', { width: 8, a: 100, b: 60, signed: true })
    }),
    q.goal('H', 'In the 8-bit adder simulator (set to SIGNED), set A = 100 and B = 60 and read the true sum, the wrapped result and the carry-out.', W('adder', { width: 8, a: 0, b: 0, signed: true, targetA: 100, targetB: 60 }), s => s.a === 100 && s.b === 60,
      'True sum 160, wrapped result −96, carry-out **0**. Two positives gave a negative, so the overflow flag is set, while the carry-out — the unsigned flag — stayed at 0. The two flags disagree, and both are right about their own question.'),
    q.num('H', 'Two signed 8-bit values 100 and 60 are added by an 8-bit adder that wraps. What signed value appears in the result?', -96, 'The true sum 160 is outside −128 … 127. The adder keeps the low 8 bits: 160 − 256 = −96, pattern 10100000.'),
    q.mc('H', 'Which condition detects signed overflow in an addition?', ['The operands have the same sign and the result has the opposite sign', 'The carry-out is 1', 'The result is negative', 'Either operand is negative'], 0, 'Only same-sign operands can overflow, and when they do the top bit flips the result to the wrong sign. A negative result on its own is perfectly legal.'),
    q.tf('H', 'For signed addition, a carry-out of 1 means the result overflowed.', false, 'Adding −1 and 1 in 8 bits (11111111 + 00000001) produces carry-out 1 and the correct answer 0. Adding 100 and 60 produces carry-out 0 and the wrong answer. Carry-out answers the unsigned question, not the signed one.'),
    q.num('H', 'Two signed 8-bit values 100 and 60 are added by an adder that **saturates** instead of wrapping. What value appears?', 127, 'The true sum 160 is above the maximum, so it is clamped to 127. Nothing teleports; the value sticks at the edge instead.'),
    q.mc('H', 'Two signed 8-bit values −100 and −60 are added by an 8-bit adder that wraps. What signed value appears?', ['96', '−160', '−96', '−128'], 0, 'The true sum −160 is below −128, so add 256: −160 + 256 = 96. Two negatives produced a positive, which is overflow on the negative side.', { grid: true }),
    q.num('H', 'Two signed 8-bit values 120 and 10 are added by an 8-bit adder that wraps. What signed value appears?', -126, 'The true sum 130 exceeds 127, so the result is 130 − 256 = −126. Being only three over the limit is no protection at all: the value jumps to the far end of the range.'),
    q.num('H', 'Two signed **4-bit** values 7 and 1 (range −8 … 7) are added by a 4-bit adder that wraps. What signed value appears?', -8, 'The true sum 8 is one above the maximum 7, so 8 − 16 = −8. The largest value plus one becomes the smallest.'),
    q.num('H', 'Two signed 8-bit values 100 and 27 are added by an 8-bit adder. What signed value appears?', 127, '127 is exactly the maximum, so it fits and no overflow occurs. Testing exactly at the limit as well as just past it is what the handbook means by boundary tests.'),
    q.tf('H', 'Adding a positive signed value to a negative signed value can never cause signed overflow.', true, 'Their true sum lies strictly between the two operands, and both operands are already inside the range, so the sum is too. Only same-sign additions can leave the range.'),
    q.mc('H', 'In hardware, signed overflow is often computed as the XOR of the carry **into** the top bit and the carry **out of** it. Why does that work?', ['When the operand top bits are equal, the result sign is the carry-in and the carry-out equals the shared operand sign, so a mismatch means the sign flipped; when the operand top bits differ that column merely propagates, so the two carries are equal and the XOR is 0', 'Because carry-in and carry-out are always equal in a correct addition', 'Because XOR is the cheapest gate available', 'Because the carry-out is the sign of the result'], 0, 'It is the same sign test, expressed in the carries the adder already has. The "differing operand bits" case is exactly Day 6\'s propagate column, where carry-out copies carry-in — so the XOR is 0 and it correctly reports no overflow. One gate.'),
    q.mc('H', 'Interview: a processor sets both a carry flag and an overflow flag after every addition, and lets the program choose which to test. Why not just one flag?', ['The bits of an addition are identical whether the operands were meant as signed or unsigned; only the program knows which, so the hardware computes both answers and the program picks', 'Because two flags are faster than one', 'Because the carry flag is for subtraction and the overflow flag is for addition', 'Because older processors had spare bits in the status register'], 0, 'The interpretation of a bit pattern is a choice made outside the adder — Day 1\'s point, with real consequences. Testing the wrong flag is a genuine and common bug.'),
    q.mc('H', 'Interview: a design adds two signed 16-bit values into a signed 16-bit register and asserts "if both inputs are ≥ 0 then the result is ≥ 0". Is that a good check?', ['Yes: for same-sign operands a flipped result sign is precisely signed overflow, so the assertion fires exactly when the addition is wrong — though it only covers the positive half, and a mirror assertion is needed for two negatives', 'No: the assertion can fire on perfectly correct additions', 'No: signed overflow cannot be detected from the operands', 'Yes, and it covers every overflow case on its own'], 0, 'It is the overflow test written as an assertion. Its one weakness is coverage, not correctness: add the negative-side mirror and you have the whole condition.'),
    q.mc('H', 'Interview: a risk gate keeps a position in a signed 8-bit register with wrapping arithmetic and blocks any buy once the position reaches 120. The position is 100 and a buy of 50 arrives. What happens?', ['The register wraps to −106, so the next check sees a value far below 120 and lets more buys through: the check fails open', 'The register clamps at 127 and all later buys are blocked', 'The adder raises an exception and the system stops', 'Nothing goes wrong: 150 is stored correctly'], 0, '150 wraps to −106, so a limit check now believes the position is short. Wrapping makes a limit fail in the direction that lets bad orders through, which is why the policy at the limit belongs in the interface contract. Day 9 takes this further.'),
    q.code('H', 'Build: write `solve(w, a, b)`, a full-adder-by-full-adder model of a `w`-bit adder. `a` and `b` are the raw bit patterns as non-negative integers that fit in `w` bits. Loop over the bits from 0 upward, carrying as you go, and return `[sum, carry_out, overflow]`: `sum` is the raw `w`-bit result pattern, `carry_out` is the carry leaving the top column, and `overflow` is `True` when the addition is wrong **read as signed**. Compute the overflow from the carries (carry into the top column XOR carry out of it), not from Python\'s big integers. Width 1 must work.', {
      fn: 'solve',
      starter: 'def solve(w, a, b):\n    carry = 0\n    result = 0\n    carry_into_top = 0\n    for i in range(w):\n        ai = (a >> i) & 1\n        bi = (b >> i) & 1\n        # remember the carry going INTO the top column before you update it\n        total = ai + bi + carry\n        # sum bit is total % 2, new carry is total // 2\n        pass\n    return [result, carry, False]\n',
      tests: [
        { args: [8, 100, 60], expect: [160, 0, true], name: '100 + 60: overflow with carry-out 0' },
        { args: [8, 255, 1], expect: [0, 1, false], name: '−1 + 1: carry-out 1 and no overflow' },
        { args: [8, 156, 196], expect: [96, 1, true], name: '−100 + −60: two negatives give +96' },
        { args: [8, 100, 27], expect: [127, 0, false], name: 'exactly at the maximum: no overflow' },
        { args: [8, 1, 2], expect: [3, 0, false], name: 'an ordinary small addition' },
        { args: [8, 200, 100], expect: [44, 1, false], name: 'unsigned wrap, but read as signed it is −56 + 100 = 44, which is correct' },
        { args: [4, 7, 1], expect: [8, 0, true], name: 'width 4: 7 + 1 leaves the range −8 … 7' },
        { args: [1, 1, 1], expect: [0, 1, true], name: 'width 1: −1 + −1 is −2, which is out of the range −1 … 0' },
        { args: [8, 0, 0], expect: [0, 0, false], name: 'zero plus zero' },
        { args: [8, 128, 128], expect: [0, 1, true], name: 'the two most negative values sum to 0: overflow' },
      ],
      gen: 'def gen():\n    for _ in range(50):\n        w = random.choice([1, 2, 4, 8, 12, 17])\n        yield [w, random.randint(0, (1 << w) - 1), random.randint(0, (1 << w) - 1)]',
      refCode: 'def ref(w, a, b):\n    s = a + b\n    res = s & ((1 << w) - 1)\n    cout = s >> w\n    low = (a & ((1 << (w - 1)) - 1)) + (b & ((1 << (w - 1)) - 1))\n    cin_top = low >> (w - 1)\n    return [res, cout, bool(cin_top ^ cout)]',
      solution: 'def solve(w, a, b):\n    carry = 0\n    result = 0\n    carry_into_top = 0\n    for i in range(w):\n        ai = (a >> i) & 1\n        bi = (b >> i) & 1\n        if i == w - 1:\n            carry_into_top = carry\n        total = ai + bi + carry\n        result |= (total % 2) << i\n        carry = total // 2\n    return [result, carry, bool(carry_into_top ^ carry)]'
    }, 'The loop is one full adder per column: sum bit = total mod 2, carry = total div 2, exactly the primary-school rule in base 2. Two different questions come out of the same loop. The carry leaving the top column is the **unsigned** overflow flag: it says the true unsigned sum needed a (w+1)th bit. The XOR of the carry into the top column with the carry out of it is the **signed** overflow flag. Test 2 (−1 + 1) has carry-out 1 and no overflow; test 1 (100 + 60) has carry-out 0 and overflow. Width 1 is the sharp edge: the only values are 0 and −1, so −1 + −1 = −2 cannot be represented. There are no columns below the top one, so the carry into it is 0 while the carry out is 1, and the XOR correctly reports overflow. Code that assumed a width of at least 8 usually breaks here, which is why the handbook insists on testing widths 1, 4, 8 and 17.'),

    // =====================================================================================================
    // ALGORITHMS: two-sum with a hash map (A01 L2)
    // =====================================================================================================
    q.info('A', 'Two-sum, and why the obvious method dies at scale', `The task: given a list of numbers and a target, find two **different positions** whose values add up to the target.

The obvious method is to try every pair. With n items there are n(n−1)/2 pairs, so the work grows like n². For n = 1000 that is half a million pairs and it finishes instantly. For n = 200,000 it is two times ten to the tenth, and you will not be waiting for it. Nothing about the method is *wrong*; it simply cannot be used where the data is.

The reframing that fixes it is worth more than the algorithm. Stop asking "which pair?" — there are n² of those. Instead fix one element at a time. Once you have chosen x, its partner is not a choice at all: it must be **target − x**. So the question becomes "have I already seen target − x?", and there are only n of those questions, one per element.

That is the whole idea. A dictionary answers each question in roughly constant time, so the work drops from n² to n.`, {
      terms: [
        ['Two-sum', 'Find two distinct positions whose values add to a target.'],
        ['Quadratic', 'Work growing like n². Fine for hundreds of items, hopeless for hundreds of thousands.'],
        ['Linear', 'Work growing like n: one bounded piece of work per element.'],
        ['Reframing', 'Changing the question so the answer is determined rather than searched for.'],
      ],
      widget: W('twosum', { arr: [3, 5, 2, 5, 1], target: 10 })
    }),
    q.info('A', 'Why a dictionary lookup is fast, and what "expected" hides', `A Python dictionary stores keys in an array of slots. To find a key it computes a number from the key — the **hash** — and uses that number to jump straight to a slot, instead of scanning. That is why a lookup does not get slower as the dictionary grows.

The honest phrasing is **expected** constant time, not guaranteed. Different keys can land in the same slot, which is a **collision**, and then the dictionary has to look at more than one place. With a good hash and plenty of spare slots, collisions are rare and the average cost stays small. But an attacker who knows your hash function can deliberately choose keys that all collide and turn every lookup into a scan — a real denial-of-service technique, and the reason Python randomises string hashing on each run.

The cost of all this speed is memory: the dictionary can grow to hold n entries. That is the trade being made — **memory for time** — and it is a trade worth naming out loud in an interview, because it is the same trade an FPGA design makes when it spends block RAM on a lookup table to avoid a slow search.`, {
      terms: [
        ['Hash', 'A number computed from a key, used to pick the slot where the key is stored.'],
        ['Collision', 'Two keys landing in the same slot. Handled by looking further, at some cost.'],
        ['Expected O(1)', 'Constant time on average, not guaranteed. Adversarial keys can make it linear.'],
        ['Space–time trade', 'Spending extra memory to avoid repeated work. Here: O(n) extra space to turn O(n²) into O(n).'],
      ]
    }),
    q.info('A', 'Lookup before insert: the order of two lines is the algorithm', `Walk the list once, keeping a dictionary \`seen\` of value → index. For each element x at index i:

1. compute \`need = target - x\`;
2. **look up** \`need\` in \`seen\`; if it is there, you have the answer;
3. only then **insert** x.

The invariant is what makes it correct: at the start of the pass for index i, \`seen\` holds exactly the values at indices 0 … i−1. So if \`need\` is found, its index is strictly less than i — a genuinely different position. The "two distinct positions" requirement is discharged by the invariant, not by a check.

Swap the two lines and it breaks. Insert first, and \`seen\` now contains x at index i itself. If the target happens to be 2x, the lookup finds x at index i and reports the pair (i, i): one element used twice. \`solve([5], 10)\` must return "not found", and insert-first returns (0, 0).

Two things that are *not* bugs. Repeated values are fine and necessary: \`[5, 1, 5]\` with target 10 is a real pair at indices 0 and 2. And keeping only the **first** index of a repeated value is a deliberate tie-break, the same kind of decision as Day 6's strict \`>\`.

Empty list, or a single element: no pair exists. Decide what "not found" looks like and document it.`, {
      terms: [
        ['seen', 'The dictionary of values already passed, mapped to their indices.'],
        ['Lookup-before-insert', 'The ordering that guarantees any partner found sits at an earlier, and therefore different, index.'],
        ['Distinct positions', 'The two indices must differ. The two values may be equal.'],
        ['Not-found value', 'What the function returns when no pair exists: None, or another explicit marker. Never a plausible-looking index pair.'],
      ]
    }),
    q.goal('A', 'Step the two-sum simulator through the list `[3, 5, 2, 5, 1]` with target 10 until it reports a pair.', W('twosum', { arr: [3, 5, 2, 5, 1], target: 10 }), s => !!s.found,
      'At index 3 the value is 5 and the partner needed is 5, which was recorded at index 1. Same value, different positions: a valid answer, (1, 3).'),
    q.mc('A', 'A one-pass hash-map two-sum runs on `[3, 5, 2, 5, 1]` with target 10. Which pair of indices does it report?', ['1 and 3', '0 and 2', '1 and 1', '2 and 4'], 0, 'At index 3 the value is 5 and it needs 5, which is in the dictionary at index 1. Two equal values at different positions form a legitimate pair.'),
    q.mc('A', 'In a one-pass hash-map two-sum, why must you look up `target − x` **before** inserting x?', ['So that x cannot be paired with its own position', 'To save memory', 'Because dictionaries keep insertion order', 'It makes no difference'], 0, 'With target 10 and x = 5, inserting first would put 5 in the dictionary at the current index, and the lookup would then find it and report (i, i) — the same element used twice.'),
    q.mc('A', 'What is the cost of the one-pass hash-map two-sum on n items?', ['O(n) time and O(n) extra space', 'O(n²) time and O(1) space', 'O(n log n) time', 'O(1) time'], 0, 'One dictionary lookup and at most one insertion per element, and the dictionary can grow to n entries. That extra memory is what buys the speed.'),
    q.mc('A', 'A one-pass two-sum is run on an empty list. What should it return?', ['Nothing found — None, or another explicit marker', 'The indices (0, 0)', 'The indices (0, 1)', 'It should raise an IndexError from the loop'], 0, 'Zero elements means zero pairs. Returning an index pair for a list with no elements is a value the caller cannot tell apart from a real answer.'),
    q.mc('A', 'A one-pass two-sum is run on `[5]` with target 10. What should it return?', ['Nothing found: a value cannot pair with its own position, so one element can never form a pair', 'The indices (0, 0)', 'The index 0 on its own', '5'], 0, 'This single test catches insert-before-lookup, which would find 5 in the dictionary at index 0 and report (0, 0).'),
    q.num('A', 'A brute-force two-sum checks every unordered pair of distinct positions in a list of 1000 elements. How many pairs does it check?', 499500, 'n(n − 1)/2 = 1000 × 999/2 = 499,500. At 200,000 elements the same formula gives about 2 × 10¹⁰, which is why the one-pass method exists.'),
    q.mc('A', 'Interview: a candidate "tidies up" their two-sum by removing duplicate values from the list first. What breaks?', ['Genuine pairs of equal values are lost: [5, 1, 5] with target 10 has an answer at indices 0 and 2, and deduplication destroys it — and the surviving indices no longer refer to the original list', 'Nothing, it is a valid optimisation', 'It becomes quadratic', 'It only breaks for negative numbers'], 0, 'Distinct *positions* was the requirement, not distinct values. Deduplicating also renumbers everything, so any index returned is meaningless without a mapping back.'),
    q.mc('A', 'Interview: your two-sum passes every unit test but times out on the 200,000-element case. What is the single most likely cause?', ['A nested loop or a linear membership test such as `if need in list_of_seen`, which turns each step into a scan and the whole run into quadratic work', 'The target is too large', 'The dictionary uses too much memory', 'Python is simply too slow for 200,000 items'], 0, '`x in some_list` is a scan; `x in some_dict` is a hash lookup. The two lines look almost identical and differ by a factor of n. Small tests cannot tell them apart, which is exactly what a speed test is for.'),
    q.mc('A', 'Interview: why is the hash-map two-sum not worst-case linear, and when would you care?', ['Lookups are expected constant time, but adversarial keys chosen to collide can make every lookup a scan; you care when an untrusted party chooses the inputs', 'Because the dictionary must be sorted first', 'Because inserting is O(log n)', 'It is worst-case linear; there is no caveat'], 0, 'For your own data the expected case is the honest answer. For attacker-supplied data it is not, and the mitigations are randomised hashing or a structure with a guaranteed bound.'),
    q.code('A', 'Write `solve(arr, target)` returning the pair of indices `[i, j]` with i < j found first by a one-pass hash-map scan, or `None` if no two distinct positions sum to the target. It must be linear: the speed test uses 200,000 elements with no pair, so a nested loop will time out.', {
      fn: 'solve',
      starter: 'def solve(arr, target):\n    seen = {}   # value -> index of its first occurrence\n    for i, x in enumerate(arr):\n        need = target - x\n        # look up need BEFORE inserting x\n        pass\n    return None\n',
      tests: [
        { args: [[3, 5, 2, 5, 1], 10], expect: [1, 3] },
        { args: [[2, 7, 11, 15], 9], expect: [0, 1] },
        { args: [[1, 2, 3], 100], expect: null, name: 'no pair sums to the target' },
        { args: [[], 5], expect: null, name: 'an empty list has no pairs' },
        { args: [[5, 1, 5], 10], expect: [0, 2], name: 'equal values at different positions are a valid pair' },
        { args: [[5], 10], expect: null, name: 'a value cannot pair with itself' },
        { args: [[0, 0], 0], expect: [0, 1], name: 'two zeros with target zero' },
        { args: [[-3, 8, 5], 2], expect: [0, 2], name: 'negative values work unchanged' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(0, 12)\n        yield [[random.randint(-6, 6) for _ in range(n)], random.randint(-6, 12)]',
      refCode: 'def ref(arr, target):\n    seen = {}\n    for i, x in enumerate(arr):\n        need = target - x\n        if need in seen:\n            return [seen[need], i]\n        if x not in seen:\n            seen[x] = i\n    return None',
      speed: { gen: 'def gen():\n    arr = [random.randint(0, 10**9) for _ in range(200000)]\n    return [arr, -1]', budgetMs: 1500, label: '200,000 elements with no pair, forcing a full scan' },
      solution: 'def solve(arr, target):\n    seen = {}\n    for i, x in enumerate(arr):\n        need = target - x\n        if need in seen:\n            return [seen[need], i]\n        if x not in seen:\n            seen[x] = i\n    return None'
    }, 'The dictionary holds exactly the values at earlier indices, so anything the lookup finds is at a strictly smaller index and the two positions are automatically different. `if x not in seen` keeps the first occurrence of a repeated value, which is the tie-break that makes [5, 1, 5] answer (0, 2) rather than (1, 2). The speed test deliberately contains no pair, so the loop cannot exit early and a quadratic solution has nowhere to hide.'),

    // =====================================================================================================
    // MATHS: the product rule for counting (M01 L1)
    // =====================================================================================================
    q.info('M', 'Why choices multiply', `Three shirts and two pairs of trousers. How many outfits? Lay them out as a grid: three rows, two columns. Every cell is one complete outfit, and there are 3 × 2 = 6 cells.

That is the **product rule**: if a task is done in stages, with a options at the first stage and b at the second, there are a × b ways to do it. It extends to any number of stages, because you can always fold the first two into one.

There is a condition people forget. The **number** of options at the later stage must be the same whichever option you took earlier — the options themselves may differ. "Pick a starter, then a main that is not the same colour as the starter" breaks the rule if some starters rule out two mains and others rule out one. Then you split into cases and add them.

That gives the pair of rules that covers most counting: alternatives that cannot both happen **add**; successive choices **multiply**. Or: "or" adds, "and then" multiplies.

It is the same shape as independence in probability, one level up. There, probabilities multiply when one event does not change the other's chances. Here, counts multiply when one choice does not change the number of later options.`, {
      terms: [
        ['Product rule', 'Successive choices with a, then b, then c options give a × b × c outcomes.'],
        ['Stage', 'One decision in building an outcome. A 4-digit PIN is four stages of ten options.'],
        ['Sum rule', 'Alternatives that cannot both happen are added, not multiplied.'],
        ['Case split', 'When the number of later options depends on the earlier choice, count each case separately and add.'],
      ],
      widget: W('counting', { symbols: ['A', 'B', 'C', 'D', 'E'], k: 3 })
    }),
    q.info('M', 'Order, repeats, and where the k! comes from', `Before counting anything, answer three questions: what are the objects, does order matter, may things repeat? Different answers give different formulas for problems that look identical.

**Order matters, repeats allowed.** Every stage keeps all its options: nᵏ. A 4-digit PIN: 10 × 10 × 10 × 10 = 10,000.

**Order matters, no repeats.** Each stage has one fewer option than the last. Ordered triples from 5 symbols: 5 × 4 × 3 = **60**. A 4-digit PIN with no repeated digit: 10 × 9 × 8 × 7 = 5040.

**Order does not matter, no repeats.** Count the ordered version, then correct for over-counting. Each *set* of 3 symbols was counted once for every order it can be written in, and 3 symbols can be ordered in 3 × 2 × 1 = 6 ways. So the number of sets is 60/6 = **10**.

That division is an argument, not a formula to memorise: every unordered answer appears exactly k! times in the ordered count, so dividing by k! removes the duplication exactly. Notice the argument needs "exactly k! times each" — which is why it works only when the k items are all different.

The fourth box, unordered with repeats, is Day 12.`, {
      terms: [
        ['Ordered selection', 'ABC and BAC count as different. Counted with a falling product n(n−1)(n−2)…'],
        ['Unordered selection', 'Only which items were chosen matters. Counted as the ordered count divided by k!.'],
        ['With / without repetition', 'Whether an item may be used again. Without, each stage loses one option.'],
        ['Over-counting', 'Counting each object several times on purpose, then dividing by how many times.'],
      ]
    }),
    q.num('M', 'How many **ordered** triples of distinct symbols can be made from 5 different symbols?', 60, '5 choices for the first slot, 4 for the second, 3 for the third: 5 × 4 × 3 = 60. ABC and BAC are counted separately.'),
    q.num('M', 'How many **unordered** triples (sets of three) can be chosen from 5 different symbols?', 10, 'Each set appears 3! = 6 times among the 60 ordered triples, once for each order. So 60/6 = 10.'),
    q.num('M', 'A PIN has 4 digits, each from 0–9, and digits may repeat. How many PINs are there?', 10000, 'Four stages of 10 options each: 10⁴ = 10,000, from 0000 to 9999.'),
    q.num('M', 'A PIN has 4 digits, each from 0–9, and no digit may be repeated. How many PINs are there?', 5040, '10 × 9 × 8 × 7 = 5040. Each stage has one fewer option than the last.'),
    q.num('M', 'A wardrobe has 3 shirts, 2 pairs of trousers and 4 ties. How many outfits of one of each are possible?', 24, '3 × 2 × 4 = 24. Each choice is independent of the others, so the counts multiply.'),
    q.num('M', 'An 8-bit register can hold how many different patterns?', 256, 'Eight stages of 2 options each: 2⁸ = 256. The product rule is exactly why each extra bit doubles the count.'),
    q.mc('M', 'Before counting anything, which three questions should you settle?', ['What the objects are, whether order matters, and whether repeats are allowed', 'The mean, the variance and the range', 'The base, the exponent and the modulus', 'The inputs, the outputs and the states'], 0, 'Different answers give different formulas for problems that look the same on the page, which is why the answers come first.'),
    q.mc('M', 'Which condition must hold before the product rule may be used?', ['The number of options at each later stage must not depend on which option was chosen earlier, although the options themselves may differ', 'The stages must be independent events with equal probabilities', 'Every stage must have the same number of options', 'Repeats must be allowed'], 0, 'Only the *count* has to be stable. If some earlier choices leave more options than others, split into cases and add them instead.'),
    q.num('M', 'How many 4-digit whole numbers are there from 1000 to 9999 inclusive?', 9000, 'The first digit has 9 options (1–9, since a leading zero would make it a 3-digit number) and the other three have 10 each: 9 × 10³ = 9000. Not 10⁴.'),
    q.num('M', 'Interview: three distinguishable jobs are assigned to 5 machines, and a machine may take more than one job. How many assignments are possible?', 125, 'Go job by job: each of the 3 jobs independently picks one of 5 machines, so 5 × 5 × 5 = 125. Choosing machine by machine instead would be a much harder count — pick the stages that keep the option count fixed.'),
    q.mc('M', 'Interview: an interviewer says "there are 5 × 4 × 3 = 60 ways to pick 3 people from 5 for a team". What is wrong, and what is the right answer?', ['A team is unordered, so each team of 3 has been counted 3! = 6 times; the answer is 60/6 = 10', 'Nothing is wrong: 60 is correct', 'The answer should be 5³ = 125, since people may be reused', 'The answer should be 5 × 4 × 3 × 2 × 1 = 120'], 0, 'The falling product counts ordered selections. Asking whether order matters before you multiply is the habit that prevents this.'),
    q.num('M', 'Interview: a 4-character password uses the 26 lower-case letters and the 10 digits, and must contain at least one digit. How many passwords are there?', 1222640, 'Count everything and subtract the bad ones. All: 36⁴ = 1,679,616. With no digit at all: 26⁴ = 456,976. Difference: 1,222,640. Counting "at least one" directly would need four overlapping cases; the complement is one subtraction.'),
    q.num('M', 'Interview: an instruction has a 3-bit opcode field and a 5-bit register field. How many distinct instruction encodings exist?', 256, '2³ opcodes times 2⁵ register values = 8 × 32 = 256, which is also just 2⁸ — the two fields together are 8 bits, and the product rule is the reason a width of 8 means 256 patterns.'),

    // =====================================================================================================
    // DEGREE: the integral as accumulated area (E02 L1, MATH19611)
    // =====================================================================================================
    q.info('E', 'Accumulation: adding up a changing rate', `Drive at a steady 20 m/s for 3 s and you cover 60 m. On a speed–time graph that is the **area** of a rectangle: rate times time.

Now let the speed vary. No single rectangle works. But chop the 3 seconds into short slices, short enough that the speed barely changes inside each one, use a rectangle for each slice, and add them up. That sum is a **Riemann sum**, and each rectangle is f(x) · Δx — a rate times a width.

Look at the units of one rectangle and the whole idea falls into place. m/s × s = metres. Amps × seconds = coulombs. Watts × seconds = joules. This is why the integral of current is charge and the integral of power is energy: multiplying a rate by a width is what accumulation *is*.

For a rising curve, taking each rectangle's height from the left edge undershoots and from the right edge overshoots. The true area is trapped between the two, and the gap shrinks as the slices get thinner. Both sums close in on one number, and that number is the **integral**.

Slide n upwards in the simulator and watch the two estimates squeeze together.`, {
      terms: [
        ['Riemann sum', 'Σ f(x)·Δx: the area of a row of rectangles approximating the area under a curve.'],
        ['Δx', 'The width of one slice. Making it smaller makes the approximation better.'],
        ['Definite integral', '∫ₐᵇ f(x) dx: the number the Riemann sums close in on. The signed area from a to b.'],
        ['Left / right sum', 'Rectangle heights taken from the left or right edge of each slice. They bracket the true area for a monotonic curve.'],
      ],
      widget: W('riemann', { n: 4 })
    }),
    q.goal('E', 'In the Riemann-sum simulator for f(x) = x² + 3x + 2 on [0, 1] (exact area 23/6 ≈ 3.833), slide the number of rectangles up to **32 or more** and watch the error shrink.', W('riemann', { n: 4 }), s => s.n >= 32,
      'With 4 left rectangles the sum is about 3.53; with 64 it is about 3.80, and the right sums come down from above. Both close in on 23/6 ≈ 3.833. The error falls roughly in proportion to 1/n.'),
    q.info('E', 'Why an antiderivative gives the area', `Rectangles are a definition, not a method. Here is why you almost never need them.

Let A(x) be the area under f from a fixed start a up to x. Push x along by a tiny h. The extra area is a thin sliver of width h whose height is about f(x), so

A(x + h) − A(x) ≈ f(x) · h.

Divide by h and let h shrink: **A′(x) = f(x)**. The area function's derivative is the original function. So finding an area is undoing a derivative.

A function whose derivative is f is called an **antiderivative** of f. Any two antiderivatives differ by a constant — their difference has slope zero everywhere, so it cannot change. That means if F is *any* antiderivative,

∫ₐᵇ f dx = A(b) − A(a) = **F(b) − F(a)**

and the unknown constant cancels. That is the **fundamental theorem of calculus**, and it is also why "+C" never matters for a definite integral.

Running Day 6's power rule backwards: since d/dx of x^(n+1) is (n+1)xⁿ, we get **∫ xⁿ dx = x^(n+1)/(n+1)** for n ≠ −1.

Worked: f(x) = x² + 3x + 2 gives F(x) = x³/3 + 3x²/2 + 2x, so ∫₀¹ f dx = 1/3 + 3/2 + 2 = **23/6 ≈ 3.833**. Sanity check: f runs from 2 to 6 across a width of 1, so the area must lie between 2 and 6, and near 4. It does.`, {
      terms: [
        ['Antiderivative', 'A function whose derivative is f. Any two differ by a constant.'],
        ['Fundamental theorem of calculus', '∫ₐᵇ f dx = F(b) − F(a). Differentiation and integration undo each other.'],
        ['Reverse power rule', '∫ xⁿ dx = x^(n+1)/(n+1) for n ≠ −1.'],
        ['Constant of integration', 'The +C in an indefinite integral. It cancels in every definite integral.'],
      ],
      widget: W('area', { b: 1 })
    }),
    q.info('E', 'Signed area, averages, and integrals in circuits', `Area below the axis counts as **negative**. Over one full cycle of a sine wave the positive and negative halves cancel exactly, so the integral is 0 — which is the same statement as "no net charge flows through a capacitor over a whole cycle".

Three properties follow from the picture and are worth having ready. Swapping the limits flips the sign: ∫ₐᵇ = −∫_bᵃ. An interval of zero width has zero area: ∫ₐᵃ = 0. And areas over adjacent intervals add: ∫ₐᶜ = ∫ₐᵇ + ∫_bᶜ.

The **average value** of f over [a, b] is (1/(b − a))·∫ₐᵇ f dx — the height of the rectangle with the same area and the same width. The average of sin² over one period is 1/2, which is where the root-mean-square value peak/√2 comes from on Day 12.

And the circuit versions, all the same statement read in different units:

- charge is accumulated current, q = ∫ i dt;
- energy is accumulated power, E = ∫ p dt;
- a capacitor's voltage is accumulated current divided by C, v = (1/C)∫ i dt.

That last one is Day 6's i = C·dv/dt read backwards. A capacitor differentiates its voltage to make a current, and integrates its current to make a voltage.`, {
      terms: [
        ['Signed area', 'Area below the axis counts negative, so an integral can be zero or negative.'],
        ['Additivity', '∫ₐᶜ = ∫ₐᵇ + ∫_bᶜ: areas over adjacent intervals add.'],
        ['Average value', '(1/(b − a))·∫ₐᵇ f dx: the height of the equal-area rectangle.'],
        ['Integrator', 'A component or block whose output accumulates its input. A capacitor integrates current.'],
      ]
    }),
    q.num('E', 'Evaluate ∫₀¹ (x² + 3x + 2) dx.', 23 / 6, 'An antiderivative is F(x) = x³/3 + 3x²/2 + 2x, so the value is F(1) − F(0) = 1/3 + 3/2 + 2 = 23/6 ≈ 3.833.', { tol: 0.01, display: '23/6 ≈ 3.833' }),
    q.num('E', 'Evaluate ∫₀² x dx.', 2, 'F(x) = x²/2, so F(2) − F(0) = 2. Check it as a shape: the region is a triangle of base 2 and height 2, area ½ × 2 × 2 = 2.'),
    q.num('E', 'Evaluate ∫₀¹ x² dx.', 1 / 3, 'F(x) = x³/3, so the value is 1/3 − 0 = 1/3 ≈ 0.333.', { display: '1/3 ≈ 0.333', tol: 0.005 }),
    q.num('E', 'Evaluate ∫₁² x² dx.', 7 / 3, 'F(x) = x³/3, so F(2) − F(1) = 8/3 − 1/3 = 7/3 ≈ 2.333.', { display: '7/3 ≈ 2.333', tol: 0.01 }),
    q.num('E', 'Evaluate ∫₀³ 2 dx.', 6, 'A constant height 2 over a width 3 is a rectangle: 6. Formally F(x) = 2x, so F(3) − F(0) = 6.'),
    q.mc('E', 'A definite integral gives you…', ['The accumulated signed area under the curve between the two limits', 'The slope of the curve', 'The maximum value of the curve', 'The average slope'], 0, 'Area accumulates a rate; slope is the derivative. Below the axis the area counts negative.'),
    q.num('E', 'Estimate ∫₀¹ x² dx using two rectangles of width 0.5 whose heights are taken at the **left** edge of each slice.', 0.125, 'Heights f(0) = 0 and f(0.5) = 0.25, each times a width of 0.5: 0 + 0.125 = 0.125. The true value is 1/3, so a left sum badly undershoots a rising curve when the slices are wide.', { tol: 0.005 }),
    q.num('E', 'Estimate ∫₀¹ x² dx using two rectangles of width 0.5 whose heights are taken at the **right** edge of each slice.', 0.625, 'Heights f(0.5) = 0.25 and f(1) = 1, each times 0.5: 0.125 + 0.5 = 0.625. Together with the left sum of 0.125 this brackets the true value 1/3 ≈ 0.333.', { tol: 0.005 }),
    q.mc('E', 'Why does F(b) − F(a) give the area under f between a and b, for any antiderivative F?', ['The area-so-far function A has A′ = f, because growing the interval by h adds a sliver of area about f(x)·h; any other antiderivative differs from A only by a constant, which cancels in the subtraction', 'Because integration is defined as subtraction of antiderivatives', 'Because F is always positive between a and b', 'Because rectangles of width h have area F(h)'], 0, 'The sliver argument gives A′ = f, and "two functions with the same derivative differ by a constant" lets you use any antiderivative you like.'),
    q.num('E', 'A steady current of 2 A flows for 5 s. How much charge has passed, in coulombs?', 10, 'q = ∫ i dt, and with a constant current that is just i × t = 2 × 5 = 10 C — the area of a rectangle on the current–time graph.', { unit: 'C' }),
    q.num('E', 'Exam-style: the current through a component is i(t) = 3t² amperes for 0 ≤ t ≤ 2 s. Calculate the total charge delivered in that time, in coulombs.', 8, 'q = ∫₀² 3t² dt = [t³]₀² = 8 C.', { unit: 'C' }),
    q.num('E', 'Exam-style: the power delivered to a resistor is p(t) = 4t watts for 0 ≤ t ≤ 3 s. Calculate the energy delivered in that time, in joules.', 18, 'E = ∫₀³ 4t dt = [2t²]₀³ = 18 J. On the power–time graph this is a triangle of base 3 s and height 12 W: ½ × 3 × 12 = 18 J.', { unit: 'J' }),
    q.num('E', 'Exam-style: a 1000 µF capacitor, initially uncharged, is fed a current i(t) = 0.02t amperes for 0 ≤ t ≤ 1 s. Calculate its voltage at t = 1 s, in volts.', 10, 'Charge first: q = ∫₀¹ 0.02t dt = [0.01t²]₀¹ = 0.01 C. Then v = q/C = 0.01/(1000 × 10⁻⁶) = 10 V.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Evaluate ∫₀^(2π) sin(t) dt.', 0, 'The first half of the cycle contributes an area of +2 and the second half contributes −2, because area below the axis counts negative. They cancel exactly. This is the same statement as "no net charge flows through a capacitor over one full cycle".'),
    q.num('E', 'Exam-style: an initially uncharged 1000 µF capacitor is fed a constant current of 5.0 mA for 4.0 s. Calculate its voltage at the end, in volts.', 20, 'Charge is the accumulated current: q = i·t = 0.0050 × 4.0 = 0.020 C. Then v = q/C = 0.020/(1000 × 10⁻⁶) = 20 V. A constant current into a capacitor makes its voltage rise as a straight line.', { unit: 'V', tol: 0.1 }),
    q.num('E', 'Exam-style: calculate the average value of f(x) = x² + 3x + 2 over the interval from x = 0 to x = 1.', 23 / 6, 'Average = (1/(b − a))·∫ₐᵇ f dx, and here b − a = 1, so it equals the integral itself: 23/6 ≈ 3.833. It is the height of the rectangle of width 1 with the same area.', { tol: 0.01, display: '23/6 ≈ 3.833' }),
    q.num('E', 'Exam-style: a sinusoidal voltage has an average value of sin²(t) over one full period equal to some constant. State that average, as a decimal.', 0.5, '∫₀^(2π) sin²(t) dt = π, and dividing by the period 2π gives 1/2. That is why the root-mean-square value of a sine wave is its peak divided by √2 — the mean of the square is half the peak squared.', { tol: 0.005 }),
    ...genius(q, 8),
  ]
};
