import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(13);

export default {
  title: 'Testing arithmetic, big-O, pigeonhole, superposition',
  emoji: '🧪',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Week 2, day 6. **Hardware** (H01 L3 pass evidence, a first look at H05): what actually counts as evidence that an adder is right — exhaustive testing where the input space allows it, boundary cases at every limit, an independent bit-accurate reference rather than a copy of the design, and why a million nominal cases prove almost nothing. **Algorithms** (A01): what big-O keeps and what it throws away, the doubling test, the standard growth classes, worst case vs expected case, and two code exercises — an exhaustive/boundary adder checker and an operation-count experiment that reads its own growth off the measurements. **Maths** (M01): counting by bijection, injective and surjective maps, the pigeonhole principle proved rather than asserted, the generalised form ⌈n/m⌉, and the real skill of choosing the boxes. **Degree** (E01): what linearity means, why turning a source off makes a voltage source a short and a current source an open, superposition worked on a real node, and exactly why it fails for power.',
  takeaway: 'A test is worth what it **distinguishes**: exhaustive where the space is small (4-bit adder = 256 pairs), boundary cases at L−1, L, L+1 everywhere else, and an independent reference — never a copy of the design. Big-O keeps the shape of growth and throws away constants, so read it from the **largest** sizes you measured. n items in m boxes forces some box to hold ⌈n/m⌉. Superposition adds voltages and currents, never powers, because power is quadratic and the cross term is real.',
  steps: [
    // =====================================================================================================
    // HARDWARE — what counts as evidence (H01 L3 pass evidence, H05 preview)
    // =====================================================================================================
    q.info('H', 'A test is worth what it distinguishes', `Your adder passes a million random tests. How much do you now know?

Ask a sharper question: **which wrong design would those tests have rejected?** If a million cases all sit in the comfortable middle of the range, then a design that is broken only at the top of the range passes every one of them. The count is large; the information is nearly zero.

That is the standard the handbook sets. A test earns its place by ruling something out. So evidence for an arithmetic block is not "it ran": it is a short list of specific things.

**Explicit widths and signedness**, so nobody is guessing how the bits are read. **No unexplained truncation warnings** — the tool told you a value did not fit and you either fixed it or wrote down why it is safe. **An independent reference** that says what the answer should be. **Boundary tests** at every limit. A waveform with no reference result beside it is a picture, not a check.`, {
      terms: [
        ['Evidence', 'A result that would have come out differently if the design were wrong.'],
        ['Reference model (oracle)', 'A separate, simpler implementation that states the expected answer.'],
        ['Truncation warning', 'The tool reporting that a value was assigned to something too narrow to hold it.'],
        ['Nominal case', 'An ordinary, comfortable input. Cheap to generate and weak at finding bugs.'],
        ['Bit-accurate', 'The reference reproduces exactly the same bits, including wrap, saturation and rounding — not merely a close number.'],
      ],
      widget: W('testmatrix', {})
    }),
    q.multi('H', 'The handbook lists the pass evidence for an arithmetic block (unit H01). Which of these items are on that list?', ['explicit widths and signed casts', 'no unexplained truncation warnings', 'a bit-accurate reference model', 'boundary tests at every limit', 'a waveform screenshot on its own'], [0, 1, 2, 3], 'The first four are the list. A waveform without a reference result beside it shows what happened, not what should have happened, so it cannot fail — and a check that cannot fail is not evidence.'),
    q.info('H', 'Exhaustive, while you still can', `Some input spaces are small enough to test **completely**, and then there is nothing left to argue about.

A 4-bit + 4-bit adder has 16 × 16 = **256** input pairs. With a carry-in it is 512. A simulator does that instantly.

An 8-bit + 8-bit adder has 256 × 256 = **65,536**. Still nothing.

A 16-bit adder has 2³² ≈ 4.3 billion pairs. Minutes to hours, so possible for a block you really care about, but no longer free.

A 32-bit adder has 2⁶⁴ ≈ 1.8 × 10¹⁹ pairs. At a billion per second that is 585 years. Never.

So the strategy changes with width, and the change is a cliff rather than a slope. Below the cliff, prove it by exhaustion. Above it, you are choosing which inputs to try, and choosing well is the whole skill — which is what the next card is about.`, {
      terms: [
        ['Exhaustive test', 'Applying every possible input. Complete proof of the function, when it fits in the time you have.'],
        ['Input space', 'The set of all possible inputs. Two w-bit operands give 2^(2w) of them.'],
        ['Combinatorial explosion', 'The way an input space grows so fast with width that exhaustion stops being possible.'],
      ]
    }),
    q.num('H', 'How many distinct input pairs does an exhaustive test of a **4-bit + 4-bit** adder require (no carry-in)?', 256, '16 values on each input: 16 × 16 = 256. Adding a carry-in doubles it to 512. Either way a simulator does it instantly, so there is no reason to sample.'),
    q.num('H', 'How many distinct input pairs does an exhaustive test of an **8-bit + 8-bit** adder require (no carry-in)?', 65536, '256 × 256 = 2¹⁶ = 65,536. Still trivial for a simulator, which is why 8-bit arithmetic blocks should be tested exhaustively rather than randomly.'),
    q.mc('H', 'An exhaustive test of a **32-bit + 32-bit** adder would need 2⁶⁴ ≈ 1.8 × 10¹⁹ input pairs. At one billion pairs per second, roughly how long is that?', ['About 585 years', 'About 18 seconds', 'About 5 hours', 'About 3 weeks'], 0, '1.8 × 10¹⁹ / 10⁹ = 1.8 × 10¹⁰ seconds, and a year is about 3.15 × 10⁷ seconds, so roughly 585 years. Above 16 bits or so, exhaustion stops being an option and directed tests take over.'),
    q.info('H', 'Boundary tests: where off-by-one lives', `Bugs cluster at edges. A limit written \`>\` when it should be \`>=\` behaves identically everywhere except at exactly one value — the limit itself.

So for every limit L in the specification, test **L − 1, L and L + 1**. Three inputs, and they separate the two comparisons.

Notice why random testing is so bad at this. If the limit is 1000 and inputs are drawn uniformly from a 32-bit range, the chance any one input lands exactly on 1000 is about 1 in 4.3 billion. A million random tests miss it with probability better than 99.97%. Adding another million barely helps.

The same reasoning applies to width edges: the largest and smallest representable values, zero, and the values just inside and just outside the range. These are where carries ripple all the way, where sign bits flip and where a too-narrow intermediate finally overflows.

Boundary tests are cheap, few and chosen on purpose. That is exactly what makes them strong.`, {
      terms: [
        ['Boundary test', 'An input exactly at, just below and just above a limit or width edge.'],
        ['Off-by-one', 'A bug that misplaces a limit by exactly one, such as > written where >= was meant.'],
        ['Directed test', 'A test chosen deliberately to distinguish a specific wrong behaviour, as opposed to a random one.'],
        ['Width edge', 'The extreme values a width can hold: 0, the maximum, the minimum, and the values either side.'],
      ]
    }),
    q.mc('H', 'A risk check must reject an order when its notional value is **greater than 1000**. The design mistakenly wrote "greater than or equal to 1000". Which single test input exposes that?', ['notional = 1000', 'notional = 999', 'notional = 1001', 'notional = 0'], 0, 'At 999 both comparisons accept; at 1001 both reject. Only the value exactly at the limit behaves differently, which is why the boundary set is L − 1, L, L + 1 and why random sampling over a wide range almost never finds this bug.', { grid: true }),
    q.mc('H', 'A verification engineer writes the reference model by transcribing the design\'s pipeline structure into Python, stage by stage. What is wrong with that?', ['A model copied from the design repeats the design\'s misunderstandings, so both agree and the bug survives; the model should express the specification more simply and independently', 'Python is too slow to be a reference model', 'The model would be bit-accurate, which is not wanted', 'Nothing is wrong: matching structure makes debugging easier'], 0, 'The value of a reference comes entirely from its independence. If it was derived from the same source, agreement proves only that you copied carefully.'),
    q.code('H', 'Build: write `solve(w, dut, mode)`, a test generator for a `w`-bit unsigned adder that wraps (its correct output for inputs a and b is `(a + b) % 2**w`). The device under test is given to you as a lookup table `dut`, a flat list where `dut[a * 2**w + b]` is what the device outputs for those inputs. In `"exhaustive"` mode try every ordered pair. In `"boundary"` mode try only ordered pairs drawn from the boundary set — the values 0, 1, 2**w − 2, 2**w − 1, 2**(w−1) − 1 and 2**(w−1), with duplicates removed and any value outside 0 … 2**w − 1 dropped. Return the failing pairs as a list of `[a, b]`, sorted by a then b.', {
      fn: 'solve',
      starter: 'def solve(w, dut, mode):\n    m = 2 ** w\n    if mode == "exhaustive":\n        vals = list(range(m))\n    else:\n        vals = []            # the six boundary candidates, deduplicated, in range, sorted\n    bad = []\n    for a in vals:\n        for b in vals:\n            pass             # compare dut[a * m + b] with the correct wrapped sum\n    return bad\n',
      tests: [
        { args: [2, [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 1, 3, 0, 1, 2], 'exhaustive'], expect: [], name: 'a correct 2-bit adder fails nothing' },
        { args: [2, [0, 1, 2, 3, 1, 2, 3, 0, 2, 3, 0, 2, 3, 0, 1, 2], 'exhaustive'], expect: [[2, 3]], name: '2+3 should wrap to 1 but returns 2' },
        { args: [3, [0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 0, 2, 3, 4, 5, 6, 0, 0, 1, 3, 4, 5, 6, 7, 0, 1, 2, 4, 5, 6, 7, 0, 1, 2, 3, 5, 6, 7, 0, 1, 2, 3, 4, 6, 7, 0, 1, 2, 3, 4, 5, 7, 0, 1, 2, 3, 4, 5, 6], 'exhaustive'], expect: [[2, 5]], name: 'width 3, bug at 2+5: exhaustive finds it' },
        { args: [3, [0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 0, 2, 3, 4, 5, 6, 0, 0, 1, 3, 4, 5, 6, 7, 0, 1, 2, 4, 5, 6, 7, 0, 1, 2, 3, 5, 6, 7, 0, 1, 2, 3, 4, 6, 7, 0, 1, 2, 3, 4, 5, 7, 0, 1, 2, 3, 4, 5, 6], 'boundary'], expect: [], name: 'the same bug at 2+5 hides from the boundary set: neither 2 nor 5 is a boundary value at width 3' },
        { args: [3, [0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 0, 2, 3, 4, 5, 6, 7, 0, 1, 3, 4, 5, 6, 7, 0, 1, 2, 4, 5, 6, 7, 0, 1, 2, 3, 5, 6, 7, 0, 1, 2, 3, 4, 6, 7, 0, 1, 2, 3, 4, 5, 7, 7, 1, 2, 3, 4, 5, 6], 'boundary'], expect: [[7, 1]], name: 'a bug at the wrap point 7+1 is caught by the boundary set' },
        { args: [1, [0, 1, 1, 0], 'exhaustive'], expect: [], name: 'width 1: a correct one-bit adder' },
        { args: [1, [0, 1, 1, 1], 'boundary'], expect: [[1, 1]], name: 'width 1: 1+1 should wrap to 0' },
      ],
      gen: 'def gen():\n    for _ in range(30):\n        w = random.choice([1, 2, 3, 4])\n        m = 2 ** w\n        dut = [(a + b) % m for a in range(m) for b in range(m)]\n        for _ in range(random.randint(0, 3)):\n            i = random.randrange(m * m)\n            dut[i] = random.randrange(m)\n        yield [w, dut, random.choice(["exhaustive", "boundary"])]',
      refCode: 'def ref(w, dut, mode):\n    m = 2 ** w\n    if mode == "exhaustive":\n        vals = list(range(m))\n    else:\n        vals = sorted({0, 1, m - 2, m - 1, m // 2 - 1, m // 2} & set(range(m)))\n    out = []\n    for a in vals:\n        for b in vals:\n            if dut[a * m + b] != (a + b) % m:\n                out.append([a, b])\n    return out',
      speed: { gen: 'def gen():\n    m = 256\n    dut = [(a + b) % m for a in range(m) for b in range(m)]\n    dut[200 * m + 199] = 0\n    return [8, dut, "exhaustive"]', budgetMs: 1500, label: 'exhaustive 8-bit adder: 65,536 pairs' },
      solution: 'def solve(w, dut, mode):\n    m = 2 ** w\n    if mode == "exhaustive":\n        vals = list(range(m))\n    else:\n        cand = {0, 1, m - 2, m - 1, m // 2 - 1, m // 2}\n        vals = sorted(v for v in cand if 0 <= v < m)\n    bad = []\n    for a in vals:\n        for b in vals:\n            if dut[a * m + b] != (a + b) % m:\n                bad.append([a, b])\n    return bad'
    }, 'Two things make this a real test generator rather than a loop. First, the expected value is computed independently — `(a + b) % 2**w` in Python integers, which cannot wrap by accident — so the checker does not inherit the device\'s mistake. Second, the boundary set is built from the width, not hard-coded, so it is right at width 1 (where the six candidates collapse to just 0 and 1) and at width 17 alike. The tests show the trade-off directly: a bug at 2 + 5 in a 3-bit adder is invisible to the 36 boundary pairs and obvious to the 64 exhaustive ones, while a bug at the wrap point 7 + 1 is caught by both. At width 8, exhaustive is 65,536 pairs and still finishes in milliseconds, so that is what you would actually run.'),
    q.mc('H', 'Interview: your 16-bit multiplier passes 10 million constrained-random tests with operands drawn uniformly from the full range. Which criticism is the strongest?', ['Uniform random operands almost never produce zero, one, the maximum, or a product exactly at the width limit, so the cases most likely to be wrong were never tried', 'Ten million is too few; a hundred million would settle it', 'Random testing is invalid and only formal proof counts', 'Constrained-random testing cannot be reproduced'], 0, 'Uniform sampling spends its whole budget in the middle of the range. Add a directed boundary set — 0, 1, max, min, and operand pairs whose product sits exactly at, just below and just above every limit — and the ten million becomes a useful supplement rather than the whole argument.'),
    q.mc('H', 'Interview: a colleague says "we have 100% line coverage on the adder, so it is verified". What is your reply?', ['Line coverage only shows every line ran; it says nothing about whether the outputs were checked or which wrong behaviours the tests would have caught', 'Line coverage is the strongest evidence available and the claim is fair', 'Line coverage is meaningless and should never be measured', '100% line coverage is impossible on arithmetic hardware'], 0, 'A test that executes every line and checks nothing has full coverage and zero value. Coverage tells you what was exercised; a reference model and boundary cases tell you what was verified. They answer different questions.'),

    // =====================================================================================================
    // ALGORITHMS — big-O (A01)
    // =====================================================================================================
    q.info('A', 'The question big-O answers', `"How long does this take?" is not answerable. It depends on the machine, the language, the compiler, the cache and what else is running.

**Big-O** answers a different, stable question: *when the input gets bigger, how does the work grow?* That answer survives changing machine.

To get it, you deliberately throw two things away. **Constant factors**: an algorithm doing 3n steps and one doing 300n steps are both O(n), because buying a faster machine changes the constant but not the shape. **Lower-order terms**: n² + 5n + 900 is O(n²), because once n is large the n² term dwarfs the rest.

What is kept is the shape of growth, and that is the thing you cannot fix with better hardware. An O(n²) algorithm on a machine a thousand times faster still loses to an O(n) one once n is large enough.

The honest caveat: constants matter at small n. O(n²) with a tiny constant can beat O(n log n) on twenty items. Big-O is about the trend, not about twenty items.`, {
      terms: [
        ['Big-O, O(f(n))', 'An upper bound on how the work grows with input size n, ignoring constant factors.'],
        ['Input size n', 'The number that measures how big the problem is: list length, number of nodes, digits in a number.'],
        ['Constant factor', 'A fixed multiplier such as the 3 in 3n. Dropped by big-O, because hardware changes it.'],
        ['Lower-order term', 'A term that grows more slowly than the leading one, such as the 5n in n² + 5n. Dropped too.'],
        ['Asymptotic', 'Describing behaviour as n grows large, which is where the leading term takes over.'],
      ],
      widget: W('bigo', { n: 64 })
    }),
    q.info('A', 'The doubling test', `Here is the practical version, and it is what you would do at a whiteboard or on a real measurement.

**Double n and see what happens to the work.**

- O(1): unchanged. A dictionary lookup does not care how big the dictionary is.
- O(log n): goes up by a **fixed amount**, not a factor. Doubling n adds exactly one halving step.
- O(n): doubles. One pass over the data.
- O(n log n): a bit more than doubles. Good sorting.
- O(n²): **quadruples**. A loop inside a loop over the same data.
- O(2ⁿ): squares. Hopeless past about 40.

Two numbers worth carrying: at n = 1000, n² is 10⁶ steps — instant. At n = 10⁶, n² is 10¹² — hours to days. The same algorithm is fine and impossible depending only on n.

Read the ratio from your **largest** measurements. At small n the lower-order terms and the constants still dominate, so an early ratio can point at the wrong class.`, {
      terms: [
        ['Doubling test', 'Measure the work at n and at 2n; the ratio names the growth class.'],
        ['O(1) constant', 'The work does not grow with n at all.'],
        ['O(log n)', 'Each step removes a fixed fraction of what is left, so doubling n adds one step.'],
        ['O(n²) quadratic', 'Doubling n multiplies the work by four.'],
      ]
    }),
    q.mc('A', 'A function loops over n items and, inside that loop, loops over the same n items again. What is its time complexity?', ['O(n²)', 'O(n)', 'O(2n)', 'O(log n)'], 0, 'Each of n outer steps does n inner steps: n × n. Doubling n multiplies the work by four. The brute-force "check every pair" solution to two-sum is exactly this shape.', { grid: true }),
    q.num('A', 'An O(n²) algorithm performs roughly n² basic steps. Roughly how many steps is that at n = 1000?', 1000000, '1000² = 10⁶, about a million steps — a few milliseconds. At n = 10⁶ the same algorithm needs 10¹² steps, which is hours to days. The class did not change; only n did.'),
    q.mc('A', 'An algorithm halves the amount of data still to be searched at every step. What is its time complexity?', ['O(log n)', 'O(n)', 'O(n/2)', 'O(1)'], 0, 'Halving 1024 items reaches one item in log₂(1024) = 10 steps. Doubling n adds exactly one step, which is the signature of a logarithm. O(n/2) is not a class: constants are dropped, so it would just be O(n).', { grid: true }),
    q.mc('A', 'Two implementations run in 3n + 7 steps and 300n + 2 steps. What does big-O say about them?', ['Both are O(n): the constant factor is dropped, though the second really is a hundred times slower on the same machine', 'The first is O(n) and the second is O(300n)', 'The first is O(n) and the second is O(n²)', 'They cannot be compared'], 0, 'Big-O deliberately ignores the factor of 100 because a faster machine can change it, while nothing changes the fact that both grow linearly. That is why "O(n)" is an answer about scaling, not a promise about speed.'),
    q.mc('A', 'A hash-map lookup is usually described as "O(1)". What is the precise claim?', ['Expected constant time; the worst case is worse, because many keys can collide into one bucket', 'Exactly one machine operation, always', 'Constant time for any hash function whatsoever', 'O(1) in the worst case, guaranteed'], 0, 'The constant-time behaviour is an average over well-spread keys. Adversarial or unlucky keys pile into one bucket and the lookup degrades towards linear. State which case you are claiming — the handbook asks for the worst case of the chosen map separately from the expected case.'),
    q.code('A', 'Write `solve(items, k)` returning the `k` most frequent values in `items` as a list of `[value, count]` pairs, most frequent first, ties broken by the smaller value first. If fewer than `k` distinct values exist, return them all. `items` is a list of integers and may be empty. Aim for O(n log n) or better: the speed test uses 300,000 items.', {
      fn: 'solve',
      starter: 'def solve(items, k):\n    counts = {}\n    for x in items:\n        counts[x] = counts.get(x, 0) + 1\n    # sort the (value, count) pairs by (-count, value), then take the first k\n    return []\n',
      tests: [
        { args: [[3, 1, 3, 2, 1, 3], 2], expect: [[3, 3], [1, 2]] },
        { args: [[5, 5, 7, 7], 1], expect: [[5, 2]], name: 'equal counts: the smaller value wins the tie' },
        { args: [[], 3], expect: [], name: 'empty input returns an empty list' },
        { args: [[9], 5], expect: [[9, 1]], name: 'fewer distinct values than k' },
        { args: [[1, 2, 2, 3, 3, 3], 3], expect: [[3, 3], [2, 2], [1, 1]] },
        { args: [[4, 4, 4], 0], expect: [], name: 'k = 0 asks for nothing' },
      ],
      gen: 'def gen():\n    for _ in range(20):\n        n = random.randint(0, 15)\n        yield [[random.randint(0, 5) for _ in range(n)], random.randint(0, 4)]',
      refCode: 'def ref(items, k):\n    c = {}\n    for x in items:\n        c[x] = c.get(x, 0) + 1\n    return [[v, n] for v, n in sorted(c.items(), key=lambda p: (-p[1], p[0]))[:k]]',
      speed: { gen: 'def gen():\n    return [[random.randint(0, 10000) for _ in range(300000)], 10]', budgetMs: 1500, label: '300,000 items' },
      solution: 'def solve(items, k):\n    counts = {}\n    for x in items:\n        counts[x] = counts.get(x, 0) + 1\n    ordered = sorted(counts.items(), key=lambda p: (-p[1], p[0]))\n    return [[v, n] for v, n in ordered[:k]]'
    }, 'Counting with a dictionary is one pass, O(n) expected. Sorting the d distinct values is O(d log d), and d is never more than n, so the whole thing is O(n log n). The tie rule falls out of the sort key `(-count, value)`: negating the count sorts it descending while the value still sorts ascending. The tempting wrong solution — for each value, scan the whole list to count it — is O(n × d), which is quadratic when the values are varied, and it is exactly what the 300,000-item budget rejects.'),
    q.code('A', 'Build: write `solve(sizes, program)`, an operation-count experiment. For each n in `sizes`, count the basic steps that `program` performs on an input of size n: `"peek"` does 1 step whatever n is; `"total"` does one step per item, so n steps; `"pairs"` does one step per ordered pair of items, so n² steps. Then classify the growth from the **last two** measurements: let r be the final count divided by the one before it, and return `"O(1)"` if r < 1.5, `"O(n)"` if r < 3, otherwise `"O(n^2)"`. If there are fewer than two sizes, or the second-to-last count is 0, return `"unknown"`. Return `[counts, verdict]`.', {
      fn: 'solve',
      starter: 'def solve(sizes, program):\n    counts = []\n    for n in sizes:\n        steps = 0\n        # count the steps this program performs at size n\n        counts.append(steps)\n    verdict = "unknown"\n    # use only the last two counts\n    return [counts, verdict]\n',
      tests: [
        { args: [[100, 200, 400], 'peek'], expect: [[1, 1, 1], 'O(1)'], name: 'work does not grow with n' },
        { args: [[100, 200, 400], 'total'], expect: [[100, 200, 400], 'O(n)'], name: 'doubling n doubles the work' },
        { args: [[10, 20, 40], 'pairs'], expect: [[100, 400, 1600], 'O(n^2)'], name: 'doubling n quadruples the work' },
        { args: [[1, 2], 'pairs'], expect: [[1, 4], 'O(n^2)'], name: 'only two sizes is enough for one ratio' },
        { args: [[50], 'total'], expect: [[50], 'unknown'], name: 'one measurement gives no ratio' },
        { args: [[], 'pairs'], expect: [[], 'unknown'], name: 'no measurements at all' },
        { args: [[0, 0], 'total'], expect: [[0, 0], 'unknown'], name: 'a zero previous count would divide by zero' },
        { args: [[2, 4, 8, 16, 32, 64], 'total'], expect: [[2, 4, 8, 16, 32, 64], 'O(n)'], name: 'a long sweep still reads its class off the last pair' },
      ],
      gen: 'def gen():\n    for _ in range(25):\n        k = random.randint(0, 4)\n        start = random.choice([1, 3, 5, 10])\n        yield [[start * 2 ** i for i in range(k)], random.choice(["peek", "total", "pairs"])]',
      refCode: 'def ref(sizes, program):\n    f = {"peek": lambda n: 1, "total": lambda n: n, "pairs": lambda n: n * n}[program]\n    counts = [f(n) for n in sizes]\n    if len(counts) < 2 or counts[-2] == 0:\n        return [counts, "unknown"]\n    r = counts[-1] / counts[-2]\n    return [counts, "O(1)" if r < 1.5 else ("O(n)" if r < 3 else "O(n^2)")]',
      solution: 'def solve(sizes, program):\n    counts = []\n    for n in sizes:\n        if program == "peek":\n            steps = 1\n        elif program == "total":\n            steps = 0\n            for _ in range(n):\n                steps += 1\n        else:\n            steps = 0\n            for _ in range(n):\n                for _ in range(n):\n                    steps += 1\n        counts.append(steps)\n    if len(counts) < 2 or counts[-2] == 0:\n        return [counts, "unknown"]\n    r = counts[-1] / counts[-2]\n    if r < 1.5:\n        verdict = "O(1)"\n    elif r < 3:\n        verdict = "O(n)"\n    else:\n        verdict = "O(n^2)"\n    return [counts, verdict]'
    }, 'This is how you measure a complexity claim instead of asserting it. The three ratio bands come straight from the doubling test: unchanged means constant, roughly ×2 means linear, roughly ×4 means quadratic, and the thresholds 1.5 and 3 sit in the gaps so a little measurement noise cannot move the verdict. Two details are the real lesson. The ratio is read from the **last** pair, because at small n the constant and lower-order terms still dominate — a program doing 2n + 6 steps shows a ratio of only 1.4 between n = 2 and n = 4, which would be misread as constant, but 1.91 between n = 32 and n = 64, which is clearly linear. And the guards matter: one measurement gives no ratio at all, and a zero previous count would divide by zero, so both return "unknown" rather than an invented answer.'),
    q.mc('A', 'Interview: you measure an algorithm at n = 1000 (0.8 s), n = 2000 (3.1 s) and n = 4000 (12.5 s). What do you conclude, and what would you check next?', ['Each doubling multiplies the time by about four, so the growth is quadratic; look for a loop nested inside a loop, or a linear scan performed once per item', 'The growth is linear, since the times increase steadily', 'The growth is O(n log n), the usual sorting cost', 'Nothing can be concluded from three points'], 0, '3.1/0.8 = 3.9 and 12.5/3.1 = 4.0. A factor of four per doubling is the signature of n². The usual culprit is a lookup done by scanning a list inside a loop, which a dictionary turns into O(n).'),
    q.mc('A', 'Interview: an algorithm is O(n log n) and a rival is O(n²), yet the O(n²) one is faster on your real inputs. How can both facts be true?', ['Big-O ignores constant factors, and if the inputs are always small the constant dominates; measure at your actual sizes and state the size range with the claim', 'One of the two complexity analyses must be wrong', 'The O(n²) implementation must be using more memory to cheat', 'Complexity classes only apply to sorted data'], 0, 'Asymptotic classes describe the trend as n grows, not the running time at n = 30. A simple quadratic loop with no allocation can beat a sophisticated O(n log n) routine on small inputs — which is precisely why real sort implementations switch to insertion sort below a threshold.'),

    // =====================================================================================================
    // MATHS — bijections and pigeonhole (M01)
    // =====================================================================================================
    q.info('M', 'Counting by pairing', `Some sets are hard to count directly and easy to count in disguise.

The trick is a **bijection**: a pairing between two sets in which every member of each set is matched with exactly one member of the other. Nothing left over on either side.

If you can build one, the two sets must be the same size — because the pairing is a perfect matching, and you cannot perfectly match a set of 45 things with a set of 46.

You have already used one. Distributing identical jobs among labelled queues was matched, one for one, with arrangements of stars and bars. The distributions were awkward; the arrangements were a routine "choose the bar positions".

Another: the subsets of {a, b, c} pair up with the 3-bit patterns 000 … 111, one bit per element saying in or out. Counting subsets is hard to picture; counting 3-bit patterns is 2³ = 8.

The move is always the same: find a set you can already count, and show the matching is perfect both ways.`, {
      terms: [
        ['Bijection', 'A pairing matching every member of each set with exactly one of the other. Proves equal size.'],
        ['Injective (one-to-one)', 'No two different inputs give the same output — nothing is squashed together.'],
        ['Surjective (onto)', 'Every possible output is actually reached — nothing is left out.'],
        ['Correspondence', 'The everyday word for a bijection: a rule that translates one kind of object into another, reversibly.'],
      ]
    }),
    q.mc('M', 'You construct a bijection between a set A and a set B. What does that let you conclude?', ['|A| = |B|: the two sets have exactly the same number of members', '|A| < |B|', 'A and B have at least one member in common', 'A is a subset of B'], 0, 'Every member of A is matched with exactly one member of B and vice versa, with nothing left over on either side, so the counts must be equal. This is the standard way a hard count is replaced by an easy one.', { grid: true }),
    q.mc('M', 'A map f sends every member of A to a member of B. It is **injective** but not **surjective**. What follows?', ['|A| < |B|: nothing in A collides, but some member of B is never hit', '|A| = |B|', '|A| > |B|', 'Nothing can be concluded'], 0, 'Injective means A fits inside B without collisions, so |A| ≤ |B|. Not surjective means at least one member of B is missed, so the inequality is strict. Bijective is exactly injective and surjective together, which forces equality.'),
    q.info('M', 'Pigeonhole, and why it is true', `Put n items into m boxes with n > m. Then **some box holds at least two items**.

It is worth seeing why, because the proof is the pattern you reuse. Suppose not: suppose every box holds at most one. Then the total number of items is at most m, one per box. But the total is n, and n > m. Contradiction. So the supposition fails and some box holds two.

The general version comes from the same argument. If every box held at most k items, the total would be at most m·k. So if n > m·k, some box holds at least k + 1. Written the usual way: **some box holds at least ⌈n/m⌉ items.**

Check it: 25 items in 4 boxes. If every box had at most 6 you could hold only 24. So some box has at least 7, and ⌈25/4⌉ = 7 agrees.

Notice what the principle does **not** say. It does not tell you which box, and it does not say every box is full. It is a guarantee about the worst case, and that is exactly what makes it useful.`, {
      terms: [
        ['Pigeonhole principle', 'More items than boxes forces some box to hold at least two.'],
        ['Generalised pigeonhole', 'n items in m boxes force some box to hold at least ⌈n/m⌉.'],
        ['⌈x⌉ (ceiling)', 'Round up to the next whole number: ⌈25/4⌉ = ⌈6.25⌉ = 7.'],
        ['Proof by contradiction', 'Assume the opposite, derive an impossibility, conclude the original claim.'],
      ],
      widget: W('pigeon', { m: 5 })
    }),
    q.num('M', 'People are added to a room one at a time. What is the smallest number of people that **guarantees** at least two of them share a birth month?', 13, '12 months are the boxes. Twelve people could have all different months, so 12 is not a guarantee. The 13th person must fall into a month already used: 13.'),
    q.num('M', '6 keys are hashed into 5 buckets. At least one bucket is guaranteed to hold at least how many keys?', 2, '⌈6/5⌉ = 2. With more keys than buckets a collision is not merely likely, it is certain — which is why every hash table must have a plan for collisions rather than hoping to avoid them.'),
    q.num('M', '25 items are placed into 4 boxes, in any way at all. Some box is guaranteed to hold at least how many items?', 7, '⌈25/4⌉ = 7. Check by contradiction: if every box held at most 6, the total would be at most 24, but there are 25 items.'),
    q.info('M', 'The whole skill is choosing the boxes', `The principle is trivial. Applying it is not, because the boxes are almost never handed to you.

**Socks.** A drawer holds socks in 4 colours. Take them blindfolded; how many guarantee a matching pair? Boxes = colours = 4. Five socks force two into one colour. Answer: 5.

**A unit square.** Among any 5 points in a 1 × 1 square, two are within √2/2 of each other. Boxes = the four quarter-squares. Five points force two into one quarter, and a ½ × ½ square has diagonal √2/2, so no two points inside it can be further apart than that.

**Remainders.** Among any 5 whole numbers, two leave the same remainder when divided by 4, because there are only 4 possible remainders (0, 1, 2, 3). Their difference is then a multiple of 4.

The pattern: name a property with few possible values, make each value a box, and count.`, {
      terms: [
        ['Box (pigeonhole)', 'A category chosen so that each item falls into exactly one. Choosing them well is the art.'],
        ['Remainder classes mod m', 'The m possible remainders 0 … m−1. A natural, very common set of boxes.'],
        ['Worst case guarantee', 'What is forced no matter how adversarially the items are placed.'],
      ]
    }),
    q.num('M', 'Interview: a drawer contains socks in 4 colours, mixed up in the dark. How many socks must you take out to be **certain** of a matching pair?', 5, 'Boxes = the 4 colours. Four socks might be one of each, so 4 is not certain. The 5th must repeat a colour: 5. In general k colours need k + 1.'),
    q.num('M', 'Interview: a drawer contains socks in 4 colours. How many must you take out to be **certain** of three socks of the same colour?', 9, 'The worst case is 2 of every colour: 8 socks with no triple. The 9th forces a third of some colour. Generalised pigeonhole: you need n > 4 × 2, so n = 9, and ⌈9/4⌉ = 3.'),
    q.mc('M', 'Interview: prove that among any 5 whole numbers, some two have a difference that is a multiple of 4. Which choice of boxes makes it immediate?', ['The 4 possible remainders on division by 4: two of the five numbers share a remainder, and equal remainders means their difference is divisible by 4', 'The 5 numbers themselves, one per box', 'Odd and even, giving 2 boxes', 'The four quarters of the number line'], 0, 'Any whole number leaves remainder 0, 1, 2 or 3 on division by 4 — four boxes for five numbers. If a = 4p + r and b = 4q + r then a − b = 4(p − q). Naming the right property is the entire proof.'),
    q.mc('M', 'Interview: someone argues "there are 5 points in a unit square and 4 quarter-squares, so two points are within √2/2 — therefore with 4 points they must be within √2/2 as well." What is wrong?', ['With 4 points there is no forcing: one point per quarter is possible, and two of those can sit in opposite corners a full √2 apart', 'Nothing is wrong; the conclusion holds for 4 points too', 'The quarter-squares have diagonal ½, not √2/2', 'Pigeonhole never applies to geometry'], 0, 'The principle needs strictly more items than boxes. At exactly 4 points and 4 boxes, the adversary places one per box and the guarantee vanishes. Pigeonhole gives you the worst case only when n > m.'),

    // =====================================================================================================
    // DEGREE — superposition (E01)
    // =====================================================================================================
    q.info('E', 'Linear means you can split the problem', `A circuit made of resistors and ideal sources has a very particular property, and it is worth stating precisely because everything today rests on it.

**Scale the input, and every voltage and current scales by the same factor.** Double the battery and every current doubles.

**Add two inputs, and the responses add.** If source A alone would produce 5 V at some node, and source B alone would produce 2 V there, then A and B together produce 7 V.

Together these two statements are what "**linear**" means, and a circuit of resistors, capacitors, inductors and ideal sources has both. Ohm's law v = i·R is a straight line through the origin, and adding straight lines gives a straight line.

A diode does not have them. Its current rises roughly exponentially with voltage, so doubling the voltage multiplies the current by far more than two, and the responses to two sources do not add.

The second statement, used deliberately, is **superposition**: work out one source at a time, then add.`, {
      terms: [
        ['Linear circuit', 'One where scaling the sources scales every response by the same factor, and responses to separate sources add.'],
        ['Superposition', 'Total response = sum of the responses to each independent source acting alone.'],
        ['Independent source', 'A source whose value is fixed by itself, not by some other voltage or current in the circuit.'],
        ['Nonlinear', 'Not obeying scaling and adding. Diodes, transistors and saturating magnetic cores are nonlinear.'],
      ]
    }),
    q.info('E', 'Turning a source off is not removing it', `To handle one source at a time you must switch the others **off**. Off does not mean "delete from the diagram" — the component is still there, still connecting two points, and what it does when set to zero follows from what it does at all.

A **voltage source** forces a fixed voltage between its terminals whatever current flows. Set that voltage to zero and you have a component that forces 0 V between its terminals whatever the current: that is a **wire**. So a dead voltage source becomes a **short circuit**.

A **current source** forces a fixed current through itself whatever voltage appears. Set that current to zero and you have a component that permits no current whatever the voltage: that is a **gap**. So a dead current source becomes an **open circuit**.

Getting this backwards is the classic error, and it changes the resistances in the circuit, so every number afterwards is wrong. Say the definition out loud each time: a voltage source fixes voltage, a current source fixes current, and zero of the thing it fixes gives you a wire or a gap respectively.`, {
      terms: [
        ['Short circuit', 'A perfect connection: 0 V across it for any current. What a dead voltage source becomes.'],
        ['Open circuit', 'A gap: no current for any voltage. What a dead current source becomes.'],
        ['Deactivate (turn off)', 'Set an independent source to zero while leaving its position and its internal resistance in place.'],
      ],
      widget: W('superpos', { Vs: 10, Is: 2, R1: 2, R2: 2, targetVs: 10, targetIs: 2 })
    }),
    q.goal('E', 'In the superposition simulation (a 10 V source through 2 Ω to node A, a 2 Ω from A to ground, and a current source injecting into A), set the voltage source to **20 V** and turn the **current source off** by setting it to 0 A, so that only one source is acting.', W('superpos', { Vs: 10, Is: 2, R1: 2, R2: 2, targetVs: 20, targetIs: 0 }), s => s.Vs === 20 && s.Is === 0,
      'With the current source at 0 A it is an open circuit and contributes nothing, so the node voltage is the divider result alone: 20 × 2/(2 + 2) = 10 V. Doubling the voltage source doubled its partial answer from 5 V to 10 V — that is the scaling half of linearity, visible directly.'),
    q.mc('E', 'While applying superposition, you need to turn off a **voltage** source. What do you replace it with?', ['A short circuit (a plain wire)', 'An open circuit (a gap)', 'A resistor equal to the Thévenin resistance', 'A current source of the same value'], 0, 'A voltage source fixes the voltage across itself. Fixing it at 0 V for any current is exactly what a wire does.'),
    q.mc('E', 'While applying superposition, you need to turn off a **current** source. What do you replace it with?', ['An open circuit (a gap)', 'A short circuit (a plain wire)', 'A resistor of zero ohms', 'A voltage source of the same value'], 0, 'A current source fixes the current through itself. Fixing it at 0 A for any voltage is exactly what a gap does. Swapping the two rules changes the resistor network and every subsequent number.'),
    q.info('E', 'Worked: one node, two sources', `Take a circuit with a single unknown node, call it A. A 10 V source drives A through a 2 Ω resistor. A 2 Ω resistor runs from A down to ground. A 2 A current source pushes current into A.

**Current source off** (replace it with a gap). What is left is 10 V through 2 Ω into A, and 2 Ω from A to ground: a plain divider. V_A = 10 × 2/(2 + 2) = **5 V**.

**Voltage source off** (replace it with a wire). Now the 2 Ω that came from the source runs from A straight to ground, in parallel with the other 2 Ω: 2 ∥ 2 = 1 Ω. The 2 A has nowhere else to go, so V_A = 2 × 1 = **2 V**.

**Add them:** V_A = 5 + 2 = **7 V**.

Check it independently with a current balance at A. In through the resistor: (10 − 7)/2 = 1.5 A. In from the source: 2 A. Out through the other resistor: 7/2 = 3.5 A. In equals out. It holds.`, {
      terms: [
        ['Partial response', 'The voltage or current produced by one source with all others turned off.'],
        ['Parallel combination (∥)', 'Two resistors sharing both ends: R₁∥R₂ = R₁R₂/(R₁+R₂). Two 2 Ω give 1 Ω.'],
        ['Current balance', 'Current in equals current out at any node. An independent check on a superposition answer.'],
      ]
    }),
    q.num('E', 'A 10 V source drives node A through a 2 Ω resistor; a second 2 Ω resistor runs from A to ground; a 2 A current source pushes current into A. Using superposition, find the partial voltage at A due to the **10 V source alone**, in volts.', 5, 'Turn the current source off: it becomes an open circuit, so the circuit is just a divider. V = 10 × 2/(2 + 2) = 5 V.', { unit: 'V' }),
    q.num('E', 'A 10 V source drives node A through a 2 Ω resistor; a second 2 Ω resistor runs from A to ground; a 2 A current source pushes current into A. Using superposition, find the partial voltage at A due to the **2 A source alone**, in volts.', 2, 'Turn the voltage source off: it becomes a wire, so its 2 Ω now runs from A to ground alongside the other 2 Ω. In parallel they are 1 Ω, and all 2 A flows through that: V = 2 × 1 = 2 V.', { unit: 'V' }),
    q.num('E', 'A 10 V source drives node A through a 2 Ω resistor; a second 2 Ω resistor runs from A to ground; a 2 A current source pushes current into A. What is the total node voltage at A, in volts?', 7, 'Superposition: 5 V from the voltage source alone plus 2 V from the current source alone gives 7 V. Check with a current balance at A: (10 − 7)/2 = 1.5 A in, plus 2 A in, equals 7/2 = 3.5 A out.', { unit: 'V' }),
    q.num('E', 'A 6 V source and a 3 V source are connected in series, both driving the same way round a loop, in series with a single 3 Ω resistor. What current flows, in amperes?', 3, 'By superposition: the 6 V alone gives 6/3 = 2 A, the 3 V alone gives 3/3 = 1 A, and together 3 A. (Turning off a series voltage source makes it a wire, which is why the other source still sees the full 3 Ω.) The direct route agrees: 9 V across 3 Ω is 3 A.', { unit: 'A' }),
    q.info('E', 'Why power is the exception', `Superposition adds voltages and currents. It does **not** add powers, and the reason is one line of algebra.

Power in a resistor is quadratic: P = I²R. If source 1 alone would drive current I₁ and source 2 alone would drive I₂, then together the current really is I₁ + I₂, and the power is

(I₁ + I₂)²R = I₁²R + I₂²R + **2·I₁·I₂·R**.

The first two terms are the partial powers. The last is a **cross term**, and it is not zero. So adding the partial powers misses it.

Put numbers on the worked circuit. Its 2 Ω to ground carries 5 V from one source and 2 V from the other. Partial powers: 5²/2 = 12.5 W and 2²/2 = 2 W, total 14.5 W. The real power is 7²/2 = **24.5 W**. The missing 10 W is the cross term.

The rule to carry: superpose the voltages or the currents first, then compute power once, from the total.`, {
      terms: [
        ['Quadratic', 'Involving a square. P = I²R and P = V²/R are quadratic in the response.'],
        ['Cross term', 'The 2·I₁·I₂·R that appears when a sum is squared. It is why powers do not superpose.'],
        ['Superposable quantity', 'One that adds: voltage and current. Power is not one.'],
      ]
    }),
    q.mc('E', 'Superposition may be applied directly to which quantities in a linear circuit?', ['Voltages and currents, but not power', 'Power only', 'Power, voltage and current alike', 'Resistances only'], 0, 'Voltage and current are linear in the sources, so they add. Power depends on the square of the response, and squaring a sum produces a cross term that the partial powers do not contain.'),
    q.num('E', 'A 2 Ω resistor carries a partial voltage of 5 V from one source acting alone and 2 V from a second source acting alone. What is the **actual** power dissipated in it when both sources act, in watts?', 24.5, 'Add the voltages first: 5 + 2 = 7 V. Then P = V²/R = 49/2 = 24.5 W. Adding the partial powers would give 12.5 + 2 = 14.5 W and miss the 10 W cross term entirely.', { unit: 'W', tol: 0.05 }),
    q.mc('E', 'Why does superposition fail for a circuit containing a diode?', ['A diode is nonlinear: its current does not scale with the applied voltage, so the responses to separate sources do not add', 'A diode has no resistance to work with', 'It only fails at high frequency', 'It does not fail; superposition works for any circuit'], 0, 'Superposition is a consequence of linearity, nothing more. A diode\'s current rises roughly exponentially with voltage, so neither scaling nor adding holds, and the whole method collapses.'),
    q.num('E', 'Exam-style: a 10 V source connects to node A through 5 Ω. A 20 V source connects to the same node A through 10 Ω. A 10 Ω resistor runs from A to ground. Using superposition, state the partial voltage at A due to the **10 V source acting alone**, in volts.', 5, 'Turn the 20 V source off: it becomes a wire, so its 10 Ω now runs from A to ground in parallel with the other 10 Ω, giving 5 Ω. The 10 V source then sees a divider of 5 Ω over (5 + 5) Ω: V = 10 × 5/10 = 5 V.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 10 V source connects to node A through 5 Ω. A 20 V source connects to the same node A through 10 Ω. A 10 Ω resistor runs from A to ground. State the **total** voltage at A, in volts.', 10, 'The 10 V source alone gives 5 V (its 10 Ω partner is shorted to ground and parallels the load: 10∥10 = 5 Ω, so 10 × 5/10 = 5 V). The 20 V source alone sees 5∥10 = 3.33 Ω to ground: 20 × 3.33/(10 + 3.33) = 5 V. Total 5 + 5 = 10 V. Check with a current balance at A: (10 − 10)/5 = 0 A, (20 − 10)/10 = 1 A in, 10/10 = 1 A out. It balances.', { unit: 'V', tol: 0.1 }),
    q.num('E', 'Exam-style: a 12 V source connects to node A through 4 Ω, a 6 Ω resistor runs from A to ground, and a 1 A current source pushes current into A. State the voltage at A, in volts, to 1 d.p.', 9.6, 'Voltage source alone (current source open): divider, 12 × 6/(4 + 6) = 7.2 V. Current source alone (voltage source shorted): 4∥6 = 2.4 Ω, so 1 × 2.4 = 2.4 V. Total 7.2 + 2.4 = 9.6 V. Check: (12 − 9.6)/4 = 0.6 A in, plus 1 A in, equals 9.6/6 = 1.6 A out.', { unit: 'V', tol: 0.05 }),
    q.num('E', 'Exam-style: a 12 V source connects to node A through 4 Ω, a 6 Ω resistor runs from A to ground, and a 1 A current source pushes current into A. State the power dissipated in the 6 Ω resistor, in watts, to 1 d.p.', 15.4, 'Superpose the voltages first: 7.2 V from the voltage source alone and 2.4 V from the current source alone give 9.6 V. Then P = V²/R = 9.6²/6 = 92.16/6 = 15.36 ≈ 15.4 W. Adding the partial powers (7.2²/6 = 8.64 W and 2.4²/6 = 0.96 W) would give 9.6 W and be badly wrong: power never superposes.', { unit: 'W', tol: 0.1 }),
    q.info('E', 'When superposition is worth the effort', `For a plain numeric answer, superposition is often the slow route: two or three separate circuits to solve instead of one.

Its real value is that it tells you **where an answer came from**. In the worked circuit, 5 of the 7 volts at node A came from the voltage source and 2 from the current source. That is a sensitivity statement: if the current source drifts by 10%, node A moves by 0.2 V, and you know that without re-solving anything.

That is how it is used in practice. Split a node voltage into a wanted contribution and an unwanted one — a signal and an interfering source, a supply and a noise injection — and you can size the parts that matter.

It also gives you a free sanity check. Solve the circuit once by any method, then confirm that the partial answers add up to it. Two independent routes agreeing is much stronger evidence than one route done carefully.`, {
      terms: [
        ['Sensitivity', 'How much a result changes when one input changes. Superposition hands you this per source.'],
        ['Contribution', 'The part of a response traceable to one particular source.'],
        ['Independent check', 'Recomputing an answer by a different method to confirm it, as opposed to re-reading the same working.'],
      ]
    }),
    q.mc('E', 'Exam-style: at a node in a linear circuit, a signal source contributes 40 mV and an interference source contributes 5 mV. The interference source doubles in strength while the signal source is unchanged. What is the new node voltage?', ['50 mV: the signal contribution stays at 40 mV and the interference contribution scales to 10 mV', '90 mV: both contributions double', '45 mV: the interference cannot change the total', '80 mV: doubling one source doubles the total'], 0, 'Linearity means each source scales its own contribution independently, and the contributions then add. Only the 5 mV term responds to the change, giving 40 + 10 = 50 mV. This decomposition is the practical reason to use superposition even when a direct solution would be quicker.'),
    ...genius(q, 13),
  ]
};
