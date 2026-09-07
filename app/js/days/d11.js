import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(11);

export default {
  title: 'Fixed point, prefix sums, repeated labels, first-order ODE',
  emoji: '🎯',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Week 2, day 4. **Hardware** (H01 L4): why hardware stores fractions as integers with an agreed scale, Q-notation, what happens to the scale when you add and when you multiply, the four rounding policies and the bias each one has, and how the choice of fractional bits trades range against resolution. **Algorithms** (A01 L3, handbook worked example A): the quadratic baseline as an oracle, the prefix-sum identity, counting subarrays that sum to K with a frequency map, why count[0] = 1, why the lookup must come before the record, and where the counter overflows. **Maths** (M01 L2): proving the division by repeated-label factorials instead of quoting it, the same answer by choosing positions, MISSISSIPPI and binary strings, and a restricted arrangement solved two ways. **Degree** (E02 L2): dy/dt + 2y = 4 solved as a steady piece plus a fading piece, verified by substitution, derived again with an integrating factor, and its time constant matched to Day 10\'s RC circuit.',
  takeaway: 'Fixed point is an integer plus an agreed scale: adding keeps the scale, **multiplying multiplies the scales**, and the rescale afterwards needs a written rounding policy (floor drifts down; nearest-ties-to-even does not). Prefix sums turn "sum of a range" into one subtraction, so counting subarrays with sum K is: read x, update the running prefix, **add count[prefix − K], then record prefix**, starting from count[0] = 1. AABBC has 5!/(2!2!) = 30 arrangements because each real word appears exactly 2!·2! times in the labelled list. dy/dt + a·y = b has solution y = b/a + (y(0) − b/a)e^(−at), with τ = 1/a — the same equation as an RC circuit with a = 1/RC.',
  steps: [
    // =====================================================================================================
    // HARDWARE: fixed point (H01 L4)
    // =====================================================================================================
    q.info('H', 'Fixed point: an integer with an agreed scale', `Hardware would rather not deal with fractions. A multiplier for whole numbers is small and fast; one for floating-point numbers is many times larger, and its rounding is easy to get subtly different between two implementations.

So we cheat. Agree that a stored integer means that integer divided by a fixed number. Store **2688**, agree the scale is **256**, and both ends read it as 2688/256 = **10.5**.

Nothing in the bits marks where the point is. 2688 is just 2688. The scale lives in the specification and in the heads of the people who wrote each end. If the two ends disagree, the number is wrong by a factor of 256 and nothing complains.

Scales are almost always powers of two, because then dividing by the scale is a shift right — free in hardware. A scale of 2^f is called **f fractional bits**, and a 16-bit value with 8 of them is written **Q8.8**: eight bits of whole number, eight of fraction.

The smallest step such a number can represent is 1/2^f. With f = 8 that is 0.00390625.`, {
      terms: [
        ['Fixed point', 'A number stored as an integer times a fixed, agreed scale.'],
        ['Scale', 'The agreed multiplier, usually a power of two. Scale 256 means the stored integer is 256 × the real value.'],
        ['Fractional bits (f)', 'How many bits sit after the binary point. Scale = 2^f.'],
        ['Q-notation', 'Q8.8 means 8 integer bits and 8 fractional bits, 16 bits in total.'],
        ['Resolution', 'The smallest difference the format can represent: 1/2^f.'],
      ],
      widget: W('fixedpoint', { qty: 3, price: 2560, scale: 256 })
    }),
    q.info('H', 'Where the scale goes when you add and when you multiply', `**Adding.** Two numbers at the same scale add with no thought: (a·S) + (b·S) = (a + b)·S, still at scale S. Two numbers at *different* scales cannot be added at all until one is shifted to match the other. That is the single most common fixed-point bug, and it is invisible: the addition still runs.

**Multiplying.** (a·S) × (b·S) = a·b·S². **The scales multiply.** Two Q8.8 values multiply into a Q16.16 value: 32 bits wide (Day 10's m + n rule) and at scale 65,536, not 256.

To come back to the working scale, divide by S once. Two habits that matter:

- Rescale **once**, at the end of a chain, not after every multiply. Every rescale throws bits away and the errors accumulate.
- Keep the wide intermediate value. Two 16-bit inputs need a real 32-bit product before anything is shifted back down.

If one operand is a plain count at scale 1 — a quantity, say — then the product is already at the other operand's scale and needs no shift at all.`, {
      terms: [
        ['Scale alignment', 'Shifting one operand so both are at the same scale before adding. Required; addition will not warn you.'],
        ['Scales multiply', '(a·S)(b·S) = ab·S². A product of two scaled values is at the square of the scale.'],
        ['Wide intermediate', 'The full-width product held before the rescale. Two 16-bit values need 32 bits.'],
        ['Rescale point', 'The one place in a chain of arithmetic where the product is divided back to the working scale.'],
      ]
    }),
    q.info('H', 'Rounding is a decision, not a detail', `Dividing back by 2^f throws bits away, and something has to happen to them. There are four common answers and they disagree.

**Floor** (an arithmetic shift right) always moves down: 30.99 → 30, and −30.01 → −31. It is a wire, so it costs nothing. But it is **biased**: each result is on average half a step low, so ten thousand of them accumulating drift by about five thousand steps.

**Truncate toward zero** is what C's integer division does: 30.99 → 30 but −30.01 → −30. It differs from floor only for negative values, which is a fine source of bugs — a shift right in the hardware is a floor, while the C reference model may be truncating.

**Round to nearest** adds half a step before shifting. The bias almost cancels, for the price of one adder. Exact halves still all lean the same way.

**Round half to even** sends ties to the even neighbour, so ties lean neither way. It is what floating point does by default, and what a long accumulation wants.

Whichever you choose goes in the contract, with a test exactly on a half and a test with a negative input.`, {
      terms: [
        ['Floor', 'Round towards −∞. What an arithmetic shift right does. Biased downwards.'],
        ['Truncate toward zero', 'Chop the fraction. Same as floor for positives, one different for negatives.'],
        ['Round to nearest', 'Add half a step, then floor. Removes most of the bias.'],
        ['Ties to even', 'On an exact half, pick the even neighbour, so ties do not all push the same way.'],
        ['Bias', 'A rounding error whose average is not zero, so it accumulates instead of cancelling.'],
      ],
      widget: W('fxmul', { a: 384, b: 512, f: 8, mode: 'floor', goalMode: 'nearest' })
    }),
    q.info('H', 'Choosing the scale: range against resolution', `A width w and f fractional bits split one register two ways. The step size is 2^−f and the largest value is about 2^(w−f−1) for a signed number. Every bit you give the fraction halves the step **and** halves the range.

Take prices to 1/256 of a tick in a 32-bit signed register. With f = 8 the whole part keeps 23 bits plus a sign, so values up to about 8.3 million ticks. Comfortable. Move to f = 16 and the range collapses to about ±32,000 ticks, which a real price would sail straight through, and the register would wrap or saturate (Day 9).

So the method is: pick f from the smallest difference you must be able to represent, pick w from the largest value you must hold, then check both against real recorded data rather than the typical case.

And do not forget the multiply. Two Q8.8 values need 32 bits of intermediate even though the answer goes back into 16.`, {
      terms: [
        ['Range', 'The largest and smallest values a format can hold: about ±2^(w−f−1) signed.'],
        ['Range/resolution trade', 'One extra fractional bit halves the step size and halves the range.'],
        ['Headroom', 'Range kept in reserve above the largest expected value, so a surprise does not wrap.'],
      ]
    }),
    q.goal('H', 'In the fixed-point multiply simulation, switch the rounding policy from floor to **nearest** and watch the rescaled result and the error change.', W('fxmul', { a: 385, b: 512, f: 8, mode: 'floor', goalMode: 'nearest' }), s => s.mode === 'nearest',
      'The exact product sits between two representable values. Floor always takes the lower one, so its error is between 0 and −1 LSB; nearest takes whichever is closer, so its error is between −0.5 and +0.5 LSB and does not build up over a long sum.'),
    q.num('H', 'A price is stored as the integer 2560 with an agreed scale of 256. What is the real price?', 10, '2560/256 = 10.0. The stored integer alone means nothing; the scale is what gives it a value.'),
    q.num('H', 'A value is stored in Q8.8 format (scale 256) as the integer 384. What real number does it represent?', 1.5, '384/256 = 1.5. In binary 384 is 1 1000 0000, and putting the point 8 bits from the right gives 1.1000 0000 = 1 + 1/2.'),
    q.num('H', 'The real number 2.5 is to be stored at a scale of 256. What integer is stored?', 640, '2.5 × 256 = 640. Encoding multiplies by the scale; decoding divides by it.'),
    q.num('H', 'A fixed-point format uses a scale of 256. What is the smallest non-zero difference it can represent? (Give the decimal value.)', 0.00390625, 'One step of the stored integer is 1/256 = 0.00390625. Nothing between two neighbouring stored integers exists in the format.', { tol: 1e-9 }),
    q.num('H', 'A quantity of 3 (a plain integer, scale 1) is multiplied by a price stored as 2560 at a scale of 256. What is the real order value?', 30, '3 × 2560 = 7680, and that integer is at scale 1 × 256 = 256. So the real value is 7680/256 = 30. Because one operand had scale 1, no shift was needed to keep the working scale.'),
    q.mc('H', 'Two numbers are each stored at a scale of 256. Their stored integers are multiplied together. What is the scale of that product?', ['65536, because 256 × 256 = 65536', '256, because both inputs used 256', '512, because the scales add', '128, because multiplication halves the scale'], 0, 'The scales multiply along with the values. To get back to scale 256 you divide the product by 256 once, and then decide what happens to the bits that fall off.', { grid: true }),
    q.num('H', 'Two 16-bit fixed-point values in Q8.8 format are multiplied. How many bits does the exact product need before it is rescaled?', 32, 'm + n = 16 + 16 = 32 (Day 10). The result is Q16.16: 16 integer bits, 16 fractional bits. Shifting right by 8 then returns it to Q8.8 — after the full 32-bit value has existed.'),
    q.num('H', 'A multiplication at scale 256 produces the exact product 7808, which must be rescaled to scale 1. Using **floor** rounding, what integer results?', 30, '7808/256 = 30.5 exactly. Floor takes the value below, so 30. Round-to-nearest with ties away from zero would give 31, and ties-to-even would give 30. Three defensible answers, which is exactly why the policy has to be written down.'),
    q.num('H', 'A multiplication produces the exact product −7683 at scale 256, and it is rescaled by an arithmetic shift right of 8 bits. What integer results?', -31, '−7683/256 = −30.01. An arithmetic shift right rounds towards −∞, so the answer is −31. C\'s integer division would truncate towards zero and give −30 — the same expression, two different answers, and only for negative values.'),
    q.mc('H', 'Interview: a design applies floor rounding after each of 10⁶ multiply-and-accumulate steps. Roughly how far does the accumulated total drift, and in which direction?', ['About 500,000 steps too low: floor loses on average half a step every time and the errors all point the same way', 'It does not drift: rounding errors cancel over many samples', 'About 1,000,000 steps too high', 'It drifts randomly, with a typical size of about 1000 steps'], 0, 'Floor is biased, not noisy. Mean error −0.5 LSB per operation × 10⁶ operations = −5 × 10⁵ LSB. Round-to-nearest has a mean near zero, so its error grows like √n instead of n.'),
    q.mc('H', 'Interview: why would a DSP block round exact halves to the **even** neighbour rather than always upwards?', ['Always rounding halves the same way leaves a small systematic bias that accumulates over a long sum; sending them to the even value makes ties cancel on average', 'Because even numbers are cheaper to represent', 'Because it avoids overflow at the top of the range', 'Because it makes the result independent of the input scale'], 0, 'Non-tie cases are already unbiased under round-to-nearest. Ties are the only remaining lean, and half of them land on an even value, so the bias cancels.'),
    q.mc('H', 'Interview: a specification says "compare the order value against the limit". The value is fixed point at scale 256 and the limit is a whole number. What must the specification add before two implementations can agree?', ['Whether the comparison happens on the full-precision product against limit × 256, or after rescaling and rounding the value to a whole number', 'The clock frequency of the comparator', 'Whether the limit is stored in a register or in memory', 'Nothing: both orderings always give the same verdict'], 0, 'The two orderings differ only within one unit of the limit — which is precisely the case a limit check exists for. Both are valid designs; leaving the choice unstated is the bug.'),
    q.code('H', 'Build a fixed-point multiply with a declared rounding policy. Write `solve(a, b, f, mode)`, where `a` and `b` are integers stored at scale 2^f (their real values are a/2^f and b/2^f). Return the stored integer representing their real product **at the same scale 2^f**, rounded according to `mode`: `"floor"` (towards −∞), `"trunc"` (towards zero), `"nearest"` (nearest, ties away from zero), `"even"` (nearest, ties to the even neighbour). Use integer arithmetic only — no float division, which would lose exactness for large inputs.', {
      fn: 'solve',
      starter: 'def solve(a, b, f, mode):\n    s = 1 << f\n    p = a * b            # exact product, at scale s*s\n    q, r = divmod(p, s)  # q = floor(p/s); r is in 0..s-1\n    # q is already the "floor" answer; build the other three policies from q and r\n    return q\n',
      tests: [
        { args: [384, 512, 8, 'floor'], expect: 768, name: '1.5 × 2.0 = 3.0, exact, so every policy agrees' },
        { args: [1, 128, 8, 'floor'], expect: 0, name: 'exactly half a step: floor takes the lower value' },
        { args: [1, 128, 8, 'nearest'], expect: 1, name: 'exactly half a step: nearest goes away from zero' },
        { args: [1, 128, 8, 'even'], expect: 0, name: 'exactly half a step: ties to even picks 0' },
        { args: [-1, 128, 8, 'floor'], expect: -1, name: 'negative half: floor goes down' },
        { args: [-1, 128, 8, 'trunc'], expect: 0, name: 'negative half: truncation goes towards zero' },
        { args: [-1, 128, 8, 'nearest'], expect: -1, name: 'negative half: away from zero is downwards' },
        { args: [-1, 128, 8, 'even'], expect: 0, name: 'negative half: 0 is the even neighbour' },
        { args: [-3, 2561, 8, 'floor'], expect: -31, name: '−30.01 floors to −31' },
        { args: [-3, 2561, 8, 'trunc'], expect: -30, name: '−30.01 truncates to −30' },
        { args: [-3, 2561, 8, 'nearest'], expect: -30, name: '−30.01 is nearest to −30' },
        { args: [5, 7, 0, 'floor'], expect: 35, name: 'f = 0: scale 1, so the product passes straight through' },
        { args: [0, 12345, 8, 'nearest'], expect: 0, name: 'zero times anything' },
        { args: [70000, 70000, 16, 'floor'], expect: 74768, name: 'large inputs: 4.9 × 10⁹ divided by 65536' },
        { args: [70000, 70000, 16, 'nearest'], expect: 74768, name: 'the same product, rounded to nearest' },
      ],
      gen: 'def gen():\n    for _ in range(60):\n        f = random.choice([0, 1, 4, 8, 16])\n        a = random.randint(-5000, 5000)\n        b = random.choice([random.randint(-5000, 5000), (1 << f) // 2, 1 << f])\n        yield [a, b, f, random.choice(["floor", "trunc", "nearest", "even"])]',
      refCode: 'def ref(a, b, f, mode):\n    s = 1 << f\n    p = a * b\n    q, r = divmod(p, s)\n    if mode == "floor":\n        return q\n    if mode == "trunc":\n        return q if (p >= 0 or r == 0) else q + 1\n    if 2 * r > s:\n        return q + 1\n    if 2 * r < s:\n        return q\n    if mode == "nearest":\n        return q + 1 if p > 0 else q\n    return q if q % 2 == 0 else q + 1',
      solution: 'def solve(a, b, f, mode):\n    s = 1 << f\n    p = a * b\n    q, r = divmod(p, s)\n    if mode == "floor":\n        return q\n    if mode == "trunc":\n        return q if (p >= 0 or r == 0) else q + 1\n    if 2 * r > s:\n        return q + 1\n    if 2 * r < s:\n        return q\n    if mode == "nearest":\n        return q + 1 if p > 0 else q\n    return q if q % 2 == 0 else q + 1'
    }, 'Python\'s `divmod` gives the floor quotient and a remainder in 0 … s−1, which is exactly what an arithmetic shift right produces in hardware, so `q` is the floor answer for free. Everything else is built from `r`: 2r > s means the exact value is past the halfway point, 2r < s means it is short of it, and 2r == s is the tie the policy has to name. Truncation only differs from floor when the product is negative and inexact. The tests deliberately pile up on the halves and on the negatives, because that is where four "reasonable" implementations give four different numbers.'),

    // =====================================================================================================
    // ALGORITHMS: counting subarrays that sum to K (A01 L3, handbook worked example A)
    // =====================================================================================================
    q.info('A', 'The obvious method first, and why you keep it', `Count the contiguous runs of a list that add up to K. The direct method: try every start, extend to every end, add as you go, and count the times the running total hits K.

For a list of n items there are n(n + 1)/2 runs, so this is roughly n²/2 work. At n = 1000 that is half a million additions — fine. At n = 200,000 it is twenty billion, which is not.

Do not throw the slow version away. It is short enough to be obviously correct, so it makes an excellent **oracle**: generate small random lists, run both, and compare. Any disagreement is a real bug in the fast one, with a small input attached. That is exactly what the handbook asks for here, and it catches the off-by-one mistakes that reading the code never does.

One word on vocabulary: a **subarray** is contiguous. [1, 3] is not a subarray of [1, 2, 3], though it is a subsequence. Confusing the two changes the answer.`, {
      terms: [
        ['Subarray', 'A contiguous run of elements. Order and adjacency both matter.'],
        ['Oracle', 'A slow but obviously correct implementation used to check a fast one on random inputs.'],
        ['Quadratic', 'Work proportional to n², here from n(n+1)/2 start-and-end pairs.'],
        ['Randomised comparison', 'Testing by running two implementations on many random inputs and comparing.'],
      ]
    }),
    q.info('A', 'Prefix sums turn a range into a subtraction', `Let P[j] be the sum of the first j elements, with **P[0] = 0** for the empty prefix. For [2, 3, −1] the prefixes are 0, 2, 5, 4.

Then the sum of the elements from position i up to just before j is

**P[j] − P[i]**

because P[j] counts everything up to j, P[i] counts everything up to i, and subtracting removes exactly the part they share. Sum of [3, −1] = P[3] − P[1] = 4 − 2 = 2 ✓.

That is the whole trick: **any range sum is one subtraction**, once the prefixes are known, and the prefixes cost one pass to build.

P[0] = 0 is not a special case bolted on. The sum of no elements is 0, and defining it that way is what lets a range that starts at position 0 use the same formula as every other range.`, {
      terms: [
        ['Prefix sum P[j]', 'The sum of the first j elements. P[0] = 0, the empty prefix.'],
        ['Range sum', 'The sum of arr[i] … arr[j−1], equal to P[j] − P[i].'],
        ['Empty prefix', 'The sum of nothing, defined as 0, so ranges starting at index 0 need no special treatment.'],
      ]
    }),
    q.info('A', 'Counting: look up, then record', `A run ending at the current position sums to K exactly when some earlier prefix equals **current − K**, because current − earlier = K. So instead of searching for that earlier prefix, keep a dictionary counting **how many times each prefix value has already been seen**.

The loop, per element: add it to the running prefix; add \`count[current − K]\` to the answer; then record the current prefix.

Trace [1, −1, 1] with K = 1, starting with current = 0 and count = {0: 1}:

- read 1 → current 1. Need a prior prefix of 0: present once → answer 1. Record prefix 1.
- read −1 → current 0. Need −1: absent → answer stays 1. Record prefix 0 (now seen twice).
- read 1 → current 1. Need 0: present **twice** → answer 3. Record prefix 1.

Three runs: [1] at the start, [1, −1, 1], and [1] at the end. ✓

**Order matters.** Look up before recording. Record first and, with K = 0, the current prefix would match itself and you would count the empty run.`, {
      terms: [
        ['Frequency map', 'A dictionary from a value to how many times it has been seen.'],
        ['count[0] = 1', 'The empty prefix, seeded before the loop, so a run starting at index 0 can be found.'],
        ['Lookup before record', 'Add count[current − K] to the answer first, then increment count[current].'],
        ['Invariant', 'Just before recording, the map holds exactly the multiplicities of the strictly earlier prefixes.'],
      ],
      widget: W('prefixsum', { arr: [1, -1, 1], k: 1 })
    }),
    q.info('A', 'What it costs, and where it breaks', `**Time.** One pass, with one dictionary lookup and one insert per element: expected linear. "Expected" is the honest word — a hash map's guarantee is average-case, and an adversary who knows the hash function can force collisions and drag it back towards n². For the trusted internal data this runs on, that is a stated assumption rather than a threat.

**Space.** One entry per *distinct* prefix value, so up to n.

**Why each run is counted once.** Every run has exactly one end position, and it is counted only at that position. Nothing is double counted and nothing is missed.

**Where it overflows.** For n zeros with K = 0 every run qualifies, giving n(n + 1)/2. At n = 65,536 that is 2,147,516,416, which is past the largest signed 32-bit value. The counter itself needs a width argument, exactly like Day 10's notional.

**Why not a sliding window?** A window that shrinks when its total is too large assumes adding an element cannot reduce the total. With negative numbers it can, so the window logic silently returns wrong answers. Prefix counting has no such assumption.`, {
      terms: [
        ['Expected linear time', 'One pass with constant expected work per element, assuming the hash map behaves.'],
        ['Adversarial input', 'Data chosen to defeat the hash function and force worst-case behaviour.'],
        ['Sliding window', 'Two pointers moving forward, valid only when the running total is monotone — so, not with negatives.'],
        ['Counter width', 'The answer can be about n²/2, which outgrows a 32-bit counter well before the input does.'],
      ]
    }),
    q.goal('A', 'In the prefix-sum simulation for the list [1, −1, 1] with K = 1, step through all three elements until the widget reports the final count.', W('prefixsum', { arr: [1, -1, 1], k: 1 }), s => s.ans === 3,
      'Prefixes 1, 0, 1 against count = {0: 1}. Step 1 finds one earlier 0; step 2 finds no −1; step 3 finds two earlier 0s. Total 3.'),
    q.num('A', 'How many contiguous subarrays of the list [1, −1, 1] have a sum of exactly 1?', 3, '[1] at index 0, the whole list [1, −1, 1], and [1] at index 2. The prefix method finds all three in one pass.'),
    q.num('A', 'How many contiguous subarrays of the list [1, 2, 3] have a sum of exactly 3?', 2, '[1, 2] and [3]. Prefixes are 1, 3, 6 against count = {0: 1}: at prefix 3 we need an earlier 0 (found once), at prefix 6 we need an earlier 3 (found once).'),
    q.tokens('A', 'The list [2, 3, −1] is read left to right. Put its three running prefix sums in order.', ['2', '5', '4'], ['3', '6'], '2, then 2 + 3 = 5, then 5 − 1 = 4. Together with the empty prefix P[0] = 0 these are every prefix of the list.', { mono: true }),
    q.mc('A', 'A subarray counter keeps a frequency map of prefix sums seen so far. Why does it start with count[0] = 1 before reading anything?', ['The empty prefix has sum 0, so a subarray that starts at index 0 has an earlier prefix to match against', 'Because array indices start at zero', 'To avoid dividing by zero later', 'It is optional and only affects performance'], 0, 'When the running prefix itself equals K, the qualifying subarray is the whole run from the start. Finding it needs a recorded prefix of 0 from before the list began.'),
    q.mc('A', 'In a one-pass subarray counter, why must `answer += count[current − K]` come **before** `count[current] += 1`?', ['Recording first would let the current prefix match itself, counting an empty subarray whenever K = 0', 'Because dictionary inserts are slower than lookups', 'Because the answer must be initialised before the map', 'It makes no difference; either order works'], 0, 'With K = 0 the needed prior prefix is the current value itself. Recording first puts it in the map, and the lookup then finds a "subarray" of no elements.'),
    q.num('A', 'A list of 4 zeros is searched for contiguous subarrays summing to 0. How many are there?', 10, 'Every subarray qualifies, and a list of n elements has n(n + 1)/2 = 4 × 5/2 = 10 of them.'),
    q.num('A', 'How many contiguous subarrays does a list of 10 elements have in total (counting every start and end, but not the empty one)?', 55, 'Choose a start and an end with start ≤ end: 10 + 9 + … + 1 = 10 × 11/2 = 55. That count is also the work the quadratic baseline does.'),
    q.num('A', 'A counter of subarrays summing to K is stored in a signed 32-bit integer. Given a list of n zeros and K = 0, the count is n(n+1)/2. What is the smallest n whose count exceeds the largest signed 32-bit value, 2³¹ − 1 = 2,147,483,647?', 65536, 'n = 65,535 gives 65,535 × 65,536/2 = 2,147,450,880, which still fits. n = 65,536 gives 2,147,516,416, which does not. The input is nowhere near overflowing; the answer is.'),
    q.mc('A', 'Interview: why can a sliding window (grow the right end, shrink the left when the total is too big) not be used to count subarrays summing to K when the list contains negative numbers?', ['Shrinking assumes the total only rises as the window grows; with negatives it can fall, so the window can skip past valid subarrays', 'Because the window needs a sorted list', 'Because negatives make the prefix sums non-unique', 'It works fine; it is only slower'], 0, 'The window rule depends on the running total being monotone in the window size. Negative values break that, so the shrink step throws away positions that could still form a valid subarray.'),
    q.mc('A', 'Interview: how would you change the prefix-sum counter to count subarrays whose sum is **divisible by 7** instead of equal to K?', ['Key the frequency map on the running prefix modulo 7, and count earlier prefixes with the same remainder', 'Key on the prefix and look up prefix − 7', 'Sort the prefix sums first and use binary search', 'It cannot be done in one pass'], 0, 'A range sum P[j] − P[i] is divisible by 7 exactly when P[j] and P[i] leave the same remainder mod 7. So the map has at most 7 keys and the lookup asks for the current remainder itself — still one pass.'),
    q.mc('A', 'Interview: your one-pass counter is described as expected linear time. What input would make it quadratic, and is that a real risk here?', ['Keys chosen to collide in the hash map: every lookup then walks a long chain. It is a real risk only when an untrusted party controls the values', 'A very long list of zeros, because the answer gets large', 'A list with many negative numbers, because the prefixes go down', 'Nothing can; the bound is worst case'], 0, 'The linear bound rests on the hash map, whose guarantee is average-case. Stating that assumption — and who supplies the data — is part of claiming the complexity honestly.'),
    q.code('A', 'Build the linear-time counter. Write `solve(arr, k)` returning the number of contiguous subarrays of `arr` whose elements sum to exactly `k`. Use a running prefix sum and a dictionary of how often each earlier prefix has been seen, seeded with `{0: 1}`, adding to the answer **before** recording the current prefix. Values may be negative. The hidden random checks compare you with a quadratic brute force, and a 50,000-element list must finish within the time budget.', {
      fn: 'solve',
      starter: 'def solve(arr, k):\n    counts = {0: 1}   # prefix sum -> how many times it has been seen\n    current = 0\n    answer = 0\n    for x in arr:\n        current += x\n        # add counts.get(current - k, 0) to answer, then record current\n        pass\n    return answer\n',
      tests: [
        { args: [[1, -1, 1], 1], expect: 3, name: 'the handbook example: [1], [1,−1,1], [1]' },
        { args: [[1, 2, 3], 3], expect: 2, name: '[1,2] and [3]' },
        { args: [[], 0], expect: 0, name: 'empty list: no subarrays at all' },
        { args: [[5], 5], expect: 1, name: 'a single matching element' },
        { args: [[5], 0], expect: 0, name: 'a single element that does not match' },
        { args: [[0, 0, 0, 0], 0], expect: 10, name: 'four zeros with k = 0: n(n+1)/2' },
        { args: [[2, -2, 2, -2], 0], expect: 4, name: 'negatives, so no sliding window' },
        { args: [[1, 1, 1], 2], expect: 2, name: 'overlapping matches are both counted' },
        { args: [[-1, -1, 1], -2], expect: 1, name: 'a negative target' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(0, 14)\n        yield [[random.randint(-3, 3) for _ in range(n)], random.randint(-2, 2)]',
      refCode: 'def ref(arr, k):\n    n = len(arr)\n    c = 0\n    for i in range(n):\n        s = 0\n        for j in range(i, n):\n            s += arr[j]\n            if s == k:\n                c += 1\n    return c',
      speed: { gen: 'def gen():\n    return [[random.randint(-5, 5) for _ in range(50000)], 3]', budgetMs: 1500, label: '50,000 elements' },
      solution: 'def solve(arr, k):\n    counts = {0: 1}\n    current = 0\n    answer = 0\n    for x in arr:\n        current += x\n        answer += counts.get(current - k, 0)\n        counts[current] = counts.get(current, 0) + 1\n    return answer'
    }, 'The random cases are checked against a hidden quadratic brute force that tries every start and end — the handbook\'s "test against quadratic enumeration" — and the 50,000-element run would take billions of additions that way, which is the whole point. The invariant to state in an interview: just before `counts[current]` is incremented, the map holds exactly the multiplicities of the prefixes strictly before this position, so the lookup counts precisely the subarrays ending here, and each subarray is counted once because it has one end.'),

    // =====================================================================================================
    // MATHS: arrangements with repeated labels (M01 L2)
    // =====================================================================================================
    q.info('M', 'Repeated letters: prove the division, do not quote it', `How many distinct arrangements of the letters **AABBC**?

Start by pretending the repeats are different: A₁A₂B₁B₂C. Five distinct symbols give 5! = 120 arrangements.

Now rub the subscripts out. A₁A₂B₁B₂C and A₂A₁B₁B₂C both become AABBC, and so do the versions with the Bs swapped. Each real word therefore comes from exactly 2! × 2! = 4 of the labelled ones: two ways to decide which A is which, times two for the Bs.

That "exactly 4" is the part worth proving, because it is what makes division legal. Fix any real word. Its labelled versions are in one-to-one correspondence with the ways of assigning the labels A₁, A₂ to its two A positions and B₁, B₂ to its two B positions — 2! × 2! choices, independently of *which* word you fixed. So the 120 labelled words split into equal groups of 4.

Equal groups → divide: 120/4 = **30**.`, {
      terms: [
        ['Distinct arrangement', 'An ordering that looks different once identical letters are indistinguishable.'],
        ['Labelling', 'Temporarily marking identical items apart, counting, then dividing by how many labellings gave the same object.'],
        ['Equal groups', 'The condition that makes dividing valid: every real object came from the same number of labelled ones.'],
        ['Multinomial coefficient', 'n! divided by the factorial of each repeat count.'],
      ],
      widget: W('overcount', { word: 'AABBC' })
    }),
    q.info('M', 'The same answer by choosing positions', `Here is a second route to the 30, and agreeing answers from two honest arguments is the best evidence you have that both are right.

AABBC has five positions. Instead of arranging letters, **choose which positions each letter takes**:

- choose 2 of the 5 positions for the As: C(5, 2) = 10
- choose 2 of the remaining 3 for the Bs: C(3, 2) = 3
- the last position must be the C: 1 way

Stages with fixed counts, so multiply: 10 × 3 × 1 = **30** ✓

This view shows what the multinomial coefficient really is: a product of ordinary combinations. And it explains a fact you already met — a binary string of length n with exactly k ones is an arrangement of k ones and n − k zeros, so there are n!/(k!(n − k)!) of them, which is C(n, k). Choosing a subset and arranging two kinds of identical item are the same problem wearing different clothes.`, {
      terms: [
        ['Choose-the-positions view', 'Building an arrangement by deciding which slots each repeated letter occupies.'],
        ['Product rule', 'Stages with fixed numbers of options multiply together.'],
        ['Binary string count', 'Length n with exactly k ones: C(n, k), the same count as arranging k ones among n − k zeros.'],
      ]
    }),
    q.info('M', 'Bigger words, and one restriction', `**The general rule.** For n letters with repeat counts k₁, k₂, …, the number of distinct arrangements is n!/(k₁! k₂! …). MISSISSIPPI has 11 letters: 4 I, 4 S, 2 P, 1 M, so 11!/(4! 4! 2! 1!) = **34,650**.

**A restriction.** How many arrangements of AABBC have **no two As next to each other**?

*Method 1 — subtract the bad ones.* Glue the two As into a single block. Arranging the block with B, B and C means arranging 4 objects of which two are identical: 4!/2! = 12. So 30 − 12 = **18**.

*Method 2 — build only good ones.* Arrange the other letters first: B, B, C gives 3!/2! = 3 orders. Each leaves 4 gaps (before, between, between, after). Drop the two As into 2 different gaps: C(4, 2) = 6. Total 3 × 6 = **18** ✓

Two different arguments, one answer. The gap method is the one that scales: it is how you handle "no two of these ever adjacent" for any number of items.`, {
      terms: [
        ['Gluing (block method)', 'Treat items that must be adjacent as one object, then multiply by the orders inside the block.'],
        ['Gap method', 'Place the unrestricted items first, then drop the restricted ones into the gaps between them.'],
        ['Complement counting', 'Count everything, subtract the arrangements that break the rule.'],
      ]
    }),
    q.goal('M', 'In the AABBC simulation, turn the subscripts **off** so the identical letters collapse, and read off how many distinct words remain.', W('overcount', { word: 'AABBC' }), s => s.labelled === false,
      'With subscripts on there are 5! = 120 labelled words. Turning them off collapses each group of 2! × 2! = 4 into one, leaving 120/4 = 30.'),
    q.num('M', 'How many distinct arrangements are there of the letters AABBC?', 30, '5!/(2! · 2!) = 120/4 = 30: each real word appears four times among the labelled arrangements, once per way of ordering the two As and the two Bs.'),
    q.num('M', 'How many distinct arrangements are there of the letters AAB?', 3, 'AAB, ABA, BAA. By formula 3!/2! = 6/2 = 3.'),
    q.mc('M', 'Counting arrangements of AABBC starts from 5! = 120 and then divides by 2! for the two As. What justifies that division?', ['Every real word appears exactly 2! times among the labelled words, once per way of ordering A₁ and A₂, so the labelled words split into equal pairs', 'Because A is the first letter of the word', 'Because dividing makes the answer small enough to be plausible', 'Because there are 2 letters that are not repeated'], 0, 'Label the As A₁ and A₂. Each real word corresponds to exactly two labelled words, and "exactly two, for every word" is the equal-group condition that makes division valid.'),
    q.num('M', 'How many distinct arrangements are there of the digits 1, 1, 1, 2?', 4, '4!/3! = 24/6 = 4. Equivalently: the 2 can occupy any one of the four positions, and the rest are forced.'),
    q.num('M', 'How many distinct arrangements are there of the letters of BANANA?', 60, 'Six letters: 3 A, 2 N, 1 B. So 6!/(3! · 2! · 1!) = 720/12 = 60.'),
    q.num('M', 'How many distinct arrangements are there of the letters of MISSISSIPPI?', 34650, 'Eleven letters: 4 I, 4 S, 2 P, 1 M. 11!/(4! · 4! · 2!) = 39,916,800/(24 × 24 × 2) = 39,916,800/1152 = 34,650.'),
    q.num('M', 'A 7-letter word is made of three identical letters of one kind, two of a second kind and two of a third. How many distinct arrangements does it have?', 210, '7!/(3! · 2! · 2!) = 5040/(6 × 2 × 2) = 5040/24 = 210.'),
    q.num('M', 'How many binary strings of length 8 contain exactly three 1s?', 56, 'It is an arrangement of three 1s and five 0s: 8!/(3! · 5!) = 56. Same number as C(8, 3), because choosing which three positions hold the 1s *is* the arrangement.'),
    q.num('M', 'Interview: how many arrangements of the letters AABBC have **no two As adjacent**?', 18, 'Subtract the bad ones: glue AA into one block and arrange {AA, B, B, C}, which is 4!/2! = 12 arrangements with the As together, so 30 − 12 = 18. Or build only good ones: arrange B, B, C in 3!/2! = 3 ways, then choose 2 of the 4 gaps for the As, C(4, 2) = 6, giving 3 × 6 = 18. Two arguments, one answer.'),
    q.mc('M', 'Interview: a candidate says "arrangements of AABBC = 5!/(2! + 2!) = 30". The answer is right. What is wrong?', ['The reasoning: the divisor is 2! × 2! = 4, not 2! + 2! = 4; each real word is counted once per *combination* of label orderings, so the counts multiply', 'Nothing: adding and multiplying the repeat factorials are equivalent', 'The formula should use 5!/(2! · 3!)', 'The answer should be 60'], 0, '2! + 2! and 2! × 2! both happen to be 4, so the arithmetic survives. Test it on AAABB: the correct 5!/(3!·2!) = 10, while 5!/(3! + 2!) = 15. Getting the right number from the wrong argument is the most dangerous outcome in a counting interview.'),

    // =====================================================================================================
    // DEGREE: a first-order linear ODE (E02 L2, MATH19611)
    // =====================================================================================================
    q.info('E', 'What dy/dt + 2y = 4 is telling you', `An equation with a derivative in it is a **differential equation**: it does not give you y, it gives you a rule connecting y to how fast y is changing. Solving it means finding the function that obeys the rule.

Read **dy/dt + 2y = 4** out loud: *the rate of change of y, plus twice y, is always 4.*

Rearrange to dy/dt = 4 − 2y and the behaviour appears without any calculus.

- If y is small, 4 − 2y is positive, so y climbs.
- If y is large, 4 − 2y is negative, so y falls.
- If y = 2, the rate is zero and y stops. That is the **steady state**, the value the equation is pulling towards.

Better still: dy/dt = −2(y − 2). **The speed is proportional to how far y is from 2.** That is the same sentence as Day 10's charging capacitor, where the rate was proportional to the remaining gap — so the answer will be the same shape, an exponential approach.`, {
      terms: [
        ['Differential equation', 'An equation linking a function to its own rate of change.'],
        ['First order', 'Only the first derivative appears. The solutions are exponential approaches to a steady value.'],
        ['Steady state', 'The value that makes dy/dt zero: here 4/2 = 2. Where the solution ends up.'],
        ['Linear', 'y and dy/dt appear on their own, not squared or inside a function. This is what lets solutions be added.'],
      ]
    }),
    q.info('E', 'Two pieces: one flat, one fading', `Every solution of dy/dt + a·y = b (with constant a and b) is one flat piece plus one fading piece.

**The flat piece.** Guess that y is a constant. Then dy/dt = 0 and the equation says a·y = b, so y = b/a. For our equation, y = 2. This is the **particular solution**: one function that satisfies the equation.

**The fading piece.** Set b to zero and ask what solves dy/dt = −a·y. This says the rate of fall is proportional to the current size, which is exponential decay: y = C·e^(−at) for any constant C. Check: dy/dt = −aC·e^(−at) = −a·y ✓.

**Add them.** Because the equation is linear, adding a solution of the full equation to a solution of the zero version gives another solution of the full equation. So

**y(t) = b/a + C·e^(−at)**

Now use the starting value. With y(0) = 0: 0 = 2 + C, so C = −2 and **y = 2(1 − e^(−2t))**.

The fading piece is not an extra; it is the memory of where y started, dying away.`, {
      terms: [
        ['Particular solution', 'Any one function that satisfies the full equation. For constant b, the steady state b/a.'],
        ['Homogeneous solution', 'A solution of the equation with the right-hand side set to zero: C·e^(−at).'],
        ['General solution', 'Particular + homogeneous, covering every possible solution.'],
        ['Initial condition', 'The known value at t = 0. It fixes the constant C, and only then is the answer unique.'],
      ],
      widget: W('odeparts', { a: 2, b: 4, y0: 0, goalA: 2 })
    }),
    q.info('E', 'Verify by substitution — the final value is not a check', `Claiming y = 2(1 − e^(−2t)) solves dy/dt + 2y = 4 costs two lines to confirm.

Differentiate: dy/dt = 2 × 2e^(−2t) = 4e^(−2t).
Substitute: 2y = 4 − 4e^(−2t), so dy/dt + 2y = 4e^(−2t) + 4 − 4e^(−2t) = **4** ✓
Check the start: y(0) = 2(1 − 1) = **0** ✓

Both parts are needed. Many functions satisfy the equation, and only one of them also passes through your starting value.

Now the trap the handbook singles out. Someone offers y = 2(1 − e^(−5t)). It starts at 0 and ends at 2, so it looks right on a plot. Substitute: dy/dt = 10e^(−5t), and dy/dt + 2y = 10e^(−5t) + 4 − 4e^(−5t) = 4 + 6e^(−5t), which is not 4. **Matching the final value checks nothing about the rate**, and the rate is what the equation is about. Only substitution is a check.`, {
      terms: [
        ['Substitution check', 'Put the candidate and its derivative into the equation and confirm both sides match for all t.'],
        ['Uniqueness', 'A first-order linear equation plus one initial value has exactly one solution.'],
        ['Plausible but wrong', 'A curve with the right start and end can still have the wrong rate everywhere in between.'],
      ]
    }),
    q.info('E', 'The integrating factor, and the link back to RC', `Guessing the two pieces worked because b was constant. The method that always works is the **integrating factor**.

Multiply dy/dt + a·y = b through by e^(at):

e^(at)·dy/dt + a·e^(at)·y = b·e^(at)

The left side is now exactly the product-rule derivative of y·e^(at) (Day 8). So d/dt (y·e^(at)) = b·e^(at). Integrate both sides: y·e^(at) = (b/a)e^(at) + C, and dividing by e^(at) gives y = b/a + C·e^(−at) — the same answer, this time derived rather than guessed. The same trick handles a right-hand side that varies with time.

**The link to Day 10.** A resistor charging a capacitor obeys RC·dv/dt + v = V, which is dv/dt + (1/RC)v = V/RC. Compare with dy/dt + a·y = b: a = 1/RC and b = V/RC. So the steady state is b/a = V ✓ and the **time constant is τ = 1/a = RC** ✓.

For dy/dt + 2y = 4, τ = 1/2 s. Same mathematics, different physical clothing — which is why heating, cooling, mixing and discharge all produce the same curve.`, {
      terms: [
        ['Integrating factor', 'Multiplying by e^(at) so the left side becomes a single derivative you can integrate.'],
        ['Time constant τ', 'τ = 1/a. After one τ the fading piece has lost 63 % of its size.'],
        ['Same equation, different physics', 'RC charging, Newton cooling and mixing tanks all give dy/dt + a·y = b.'],
      ]
    }),
    q.goal('E', 'In the differential-equation simulation of dy/dt + a·y = b, set a = 2 and press the button that shows the two pieces the solution is made of.', W('odeparts', { a: 2, b: 4, y0: 0, goalA: 2 }), s => s.parts && Math.abs(s.a - 2) < 1e-9,
      'The dashed flat line is the steady state b/a and the dashed curve is the fading piece (y(0) − b/a)e^(−at). Their sum is the solid curve. With a = 2 the fading piece has time constant 1/2 s.'),
    q.num('E', 'For the equation dy/dt + 2y = 4, what value does y settle at once it has stopped changing?', 2, 'Settled means dy/dt = 0, so 2y = 4 and y = 2. It is the value the equation pulls towards from either side.'),
    q.num('E', 'For the equation dy/dt + 2y = 4, what is the time constant, in seconds?', 0.5, 'For dy/dt + a·y = b the fading piece is e^(−at), so τ = 1/a = 1/2 = 0.5 s. The 4 on the right sets where it ends up, not how fast it gets there.', { unit: 's' }),
    q.num('E', 'For the equation dy/dt + 5y = 15, what value does y settle at?', 3, 'Set dy/dt = 0: 5y = 15, so y = 3. The steady state is b/a.'),
    q.num('E', 'For the equation dy/dt + 4y = 8, what is the time constant, in seconds?', 0.25, 'τ = 1/a = 1/4 = 0.25 s.', { unit: 's' }),
    q.mc('E', 'Which function solves dy/dt + 2y = 4 with y(0) = 0?', ['y = 2(1 − e^(−2t))', 'y = 2e^(−2t)', 'y = 4(1 − e^(−t/2))', 'y = 2 + e^(−2t)'], 0, 'It must start at 0, settle at 4/2 = 2, and decay at rate 2. Substituting confirms it: dy/dt = 4e^(−2t) and 2y = 4 − 4e^(−2t), which add to 4.'),
    q.mc('E', 'Which of these actually verifies that a proposed function solves a first-order differential equation?', ['Substitute the function and its derivative into the equation, confirm both sides agree for all t, and confirm the initial value', 'Check that it approaches the right value as t → ∞', 'Check its value at t = 0 only', 'Plot it and see whether the shape looks right'], 0, 'The equation is a statement about the rate at every instant. y = 2(1 − e^(−5t)) has the right start and the right end and still fails: substituting gives 4 + 6e^(−5t), not 4.'),
    q.num('E', 'The function y = 2(1 − e^(−2t)) describes a quantity starting at 0. What is y at t = 0.5 s? (3 d.p.)', 1.264, 'y = 2(1 − e^(−1)) = 2(1 − 0.36788) = 1.264. t = 0.5 s is exactly one time constant, so y has covered 63.2 % of its journey to 2.', { tol: 0.005 }),
    q.num('E', 'A quantity obeys dy/dt + 2y = 4 and starts at y(0) = 1. What is y at t = 0.5 s? (3 d.p.)', 1.632, 'Steady state 2, so y = 2 + C·e^(−2t) with 1 = 2 + C, giving C = −1 and y = 2 − e^(−2t). At t = 0.5: 2 − e^(−1) = 2 − 0.36788 = 1.632. Only the constant changed; the steady state and time constant are properties of the equation.', { tol: 0.005 }),
    q.mc('E', 'For the equation dy/dt + 3y = 0, what are all the possible solutions?', ['y = C·e^(−3t) for any constant C', 'y = C·e^(3t) for any constant C', 'y = 0 only', 'y = C − 3t for any constant C'], 0, 'The equation says the rate of fall is proportional to the current size, which is exponential decay at rate 3. The constant C is whatever the value was at t = 0, and it is fixed by the initial condition.'),
    q.num('E', 'A quantity obeys dy/dt + 2y = 4 and starts at y(0) = 5, which is higher than the value it settles to. What is y at t = 1 s? (3 d.p.)', 2.406, 'Steady state 2, so y = 2 + C·e^(−2t) with 5 = 2 + C, giving C = 3 and y = 2 + 3e^(−2t). At t = 1: 2 + 3 × 0.13534 = 2.406. Starting above the steady state simply makes the fading piece positive; it decays at the same rate.', { tol: 0.005 }),
    q.num('E', 'A quantity obeys dy/dt + 2y = 4 with y(0) = 0, so it rises from 0 towards 2. How long does it take to reach y = 1.5, in seconds (3 d.p.)?', 0.693, 'y = 2(1 − e^(−2t)) = 1.5 gives e^(−2t) = 0.25, so 2t = ln 4 and t = (ln 4)/2 = 0.693 s. Reaching three quarters of the way takes 2·ln 2 = 1.386 time constants.', { unit: 's', tol: 0.005 }),
    q.mc('E', 'Multiplying dy/dt + a·y = b through by e^(at) is a standard technique. What does it achieve?', ['The left side becomes the product-rule derivative of y·e^(at), so both sides can simply be integrated', 'It cancels the constant b, leaving a simpler equation', 'It converts the derivative into a second derivative, which is easier to integrate', 'It makes the equation dimensionless'], 0, 'e^(at)·dy/dt + a·e^(at)·y is exactly d/dt(y·e^(at)). Integrating gives y·e^(at) = (b/a)e^(at) + C, and dividing back gives y = b/a + C·e^(−at). The same method works when b varies with time, which is why it is the general recipe rather than a guess.'),
    q.num('E', 'Exam-style: a quantity obeys dy/dt = −2y + 6 with y(0) = 0. Find y at t = 1 s (3 d.p.).', 2.594, 'Rewrite as dy/dt + 2y = 6: steady state 6/2 = 3, decay rate 2, start 0, so y = 3(1 − e^(−2t)). At t = 1: 3(1 − 0.13534) = 2.594.', { tol: 0.005 }),
    q.num('E', 'Exam-style: a quantity obeys dy/dt + 0.5y = 3 with y(0) = 1. Find y at t = 4 s (3 d.p.).', 5.323, 'Steady state 3/0.5 = 6 and τ = 1/0.5 = 2 s, so y = 6 + C·e^(−0.5t) with 1 = 6 + C, giving C = −5. At t = 4: y = 6 − 5e^(−2) = 6 − 0.6767 = 5.323.', { tol: 0.005 }),
    q.num('E', 'Exam-style: a 9 V step is applied at t = 0 to a 10 kΩ resistor in series with an uncharged 4.7 µF capacitor, so the capacitor voltage obeys RC·dv/dt + v = 9. How long does the capacitor take to reach 6 V, in milliseconds (1 d.p.)?', 51.6, 'τ = RC = 10⁴ × 4.7 × 10⁻⁶ = 47 ms, and v = 9(1 − e^(−t/τ)). Setting v = 6 gives e^(−t/τ) = 1/3, so t = τ·ln 3 = 47 × 1.0986 = 51.6 ms.', { unit: 'ms', tol: 0.3 }),
    q.num('E', 'Exam-style: a quantity obeys dy/dt + a·y = b with y(0) = 0 and a = 2 s⁻¹. Find the time at which it reaches 99 % of its steady-state value, in seconds (3 d.p.).', 2.303, 'y = (b/a)(1 − e^(−at)), so 99 % means e^(−at) = 0.01 and t = ln(100)/a = 4.60517/2 = 2.303 s. Equivalently 4.605 time constants, since τ = 1/a = 0.5 s. Note the answer does not depend on b: b sets where it goes, a sets how fast.', { unit: 's', tol: 0.005 }),
    q.num('E', 'Exam-style: a body at 80 °C cools in air at 20 °C, and its temperature obeys dT/dt = −(T − 20)/300 with t in seconds. Find its temperature after 600 s, in °C (2 d.p.).', 28.12, 'The gap above air temperature obeys dg/dt = −g/300, so g = 60·e^(−t/300) and T = 20 + 60e^(−t/300). At t = 600: 20 + 60e^(−2) = 20 + 8.120 = 28.12 °C. Identical mathematics to the RC circuit, with τ = 300 s.', { unit: '°C', tol: 0.05 }),
    ...genius(q, 11),
  ]
};
