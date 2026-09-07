import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(2);

// Day 2: every concept built from the ground up (why before what), every question self-contained,
// a full study session. See C:\dev\study\CLAUDE.md and app/CONTENT_GUIDE.md.
export default {
  title: "Two's complement, lists, 'at least one', energy",
  emoji: '➖',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Day 2 of week 1. **Hardware**: why hardware stores negatives as two\'s complement (so the plain adder works with wrap-around), why the MSB weight is negative, why negate = invert + 1, wrap-around, hex ↔ signed, and two bit-level Python models (decode and encode with wrap). **Code**: why lists index from zero, why slices are half-open, negative indices, clipping, slices as copies, and a slice-based program with a speed test. **Maths**: "at least one" through the complement, partitions (none / exactly one / both), repeated trials by counting outcomes (de Méré\'s dice). **Degree**: power versus energy, units and prefixes, kWh and cost, heating water, battery capacity, efficiency.',
  takeaway: 'Same 8 bits, two meanings: 11110110 is 246 unsigned and −10 signed. The MSB weight is −128 so that the ordinary adder, with its carry-out thrown away, adds signed numbers correctly: 5 + (−5) = 0. Negate = invert + 1 because x + ~x = all-ones = −1. Indices name boxes, slice bounds name gaps: xs[a:b] has b − a items. P(at least one) = 1 − P(none). Energy = power × time; 1 kWh = 3.6 MJ.',
  steps: [
    // =====================================================================================================
    // HARDWARE: negatives without a minus sign
    // =====================================================================================================
    q.info('H', 'The problem: a wire cannot carry a minus sign', `Yesterday every pattern was a non-negative number. Real designs need negatives: a temperature below zero, a price change, a motor turning backwards. But a wire is only ever 0 or 1; there is no third state for "minus". So the minus sign must be **encoded in the bits themselves**, and we have to choose how.

**First idea: sign-magnitude.** Use the top bit as a flag (1 = negative) and the other seven as the size. \`10000101\` would be −5. It reads naturally, but it fails in the hardware: **two zeros** (\`00000000\` and \`10000000\`), so "is x zero?" needs a special case; and the plain adder gives nonsense: 5 + (−5) = \`00000101\` + \`10000101\` = \`10001010\`, which is −10 in this scheme. You would need a separate subtractor, a comparator to decide which magnitude is larger, and logic to pick the result's sign. Slow, big, and a source of bugs.

**What we actually want.** A rule for negatives such that the **ordinary unsigned adder** (the one from yesterday's place value, which you will build on Day 4) adds signed numbers correctly with no extra hardware. Then one adder serves both interpretations, and subtraction becomes "negate, then add". Two's complement is the encoding that delivers exactly this, and the next card shows where it comes from.`, {
      terms: [
        ['Signed / unsigned', 'Two interpretations of the same bits: unsigned = 0 … 2^w − 1; signed = includes negatives.'],
        ['Sign-magnitude', 'A rejected scheme: top bit is a minus flag, the rest is the size. Two zeros and no clean addition.'],
        ['Encoding', 'An agreed rule that maps meanings (like −5) to bit patterns. The bits carry no meaning without the rule.'],
        ['Interpretation', 'The rule you read a pattern with. The wires do not know which rule you chose.'],
      ]
    }),
    q.info('H', "Two's complement: why the MSB is worth −128", `Work backwards from what we want. In 8 bits, the adder throws away any carry out of the top bit, so it really computes **(a + b) mod 256**: results wrap around after 255 (Day 1's counter that showed 260 as 4). The pattern that should mean **−5** is therefore the pattern that, added to 5, gives 0 after wrapping. That is **256 − 5 = 251**, i.e. \`11111011\`. Check: 5 + 251 = 256, which is \`1 00000000\`; drop the carry-out and the 8-bit result is \`00000000\`. **The plain adder just did signed arithmetic.**

So the rule is: **a negative number −x is stored as the unsigned pattern of 256 − x.** Which patterns are negative? We choose the top half (128 … 255, those with the MSB set) to mean negatives, because then a value's sign is visible in one bit. Reading such a pattern: signed value = unsigned value − 256. And subtracting 256 from a pattern whose MSB is set is the same as changing the MSB's weight from **+128 to −128** (since −128 = 128 − 256). All other weights stay the same.

\`11110110\` = −128 + 64 + 32 + 16 + 4 + 2 = **−10**. The same pattern is 246 unsigned; 246 − 256 = −10. The bits did not change; the interpretation did.

**Range**: MSB clear gives 0 … 127; MSB set gives −128 … −1. So 8-bit signed is **−128 … +127**, one more negative than positive, because zero uses one of the "positive" (MSB = 0) patterns. General width w: **−2^(w−1) … 2^(w−1) − 1**. Tap the bits below; the sign bit is marked.`, {
      terms: [
        ["Two's complement", 'The standard way to represent signed integers: −x is stored as 2^w − x, equivalently the MSB weight is −2^(w−1).'],
        ['Sign bit', 'The MSB of a signed value. 1 means negative. It is a weight (−128), not a separate flag.'],
        ['Modulo 2^w', 'What a w-bit adder really computes: the true sum with any multiple of 2^w removed (the carry-out is discarded).'],
        ['Signed range', 'For width w: −2^(w−1) … 2^(w−1) − 1. For 8 bits: −128 … 127.'],
      ],
      widget: W('bits', { width: 8, value: 0b11110110, signed: true })
    }),
    q.goal('H', 'Use the bit toggler to show the signed 8-bit value **−10**.', W('bits', { width: 8, value: 0, signed: true, target: 0b11110110 }), s => s.signed === -10,
      '−10 = 11110110: −128 + 64 + 32 + 16 + 4 + 2. Or: 256 − 10 = 246 = 11110110. Or: 10 is 00001010, invert → 11110101, add 1 → 11110110.'),
    q.num('H', 'What is the most negative value a signed 8-bit two\'s complement register can hold?', -128, 'Pattern 10000000: only the −128 weight is set. There is no +128: the positive side stops at 127 because zero uses one of the MSB-clear patterns.'),
    q.mc('H', 'Which 8-bit pattern is signed **−1** in two\'s complement?', ['11111111', '10000001', '00000001', '10000000'], 0, '−128 + 64+32+16+8+4+2+1 = −128 + 127 = −1. Or 256 − 1 = 255 = all-ones. All-ones is −1 at any width.', { grid: true }),
    q.num('H', 'Read the 4-bit pattern `1101` as a signed two\'s complement value.', -3, 'Weights −8, 4, 2, 1: −8 + 4 + 1 = −3. Check: 16 − 3 = 13 = 1101 unsigned.'),
    q.text('H', 'Encode **−37** as an 8-bit two\'s complement pattern.', ['11011011'], '256 − 37 = 219 = 128 + 64 + 16 + 8 + 2 + 1 = 11011011. Check by weights: −128 + 64 + 16 + 8 + 2 + 1 = −37.', { mono: true, accept: ['^11011011$'] }),
    q.num('H', 'An 8-bit pattern reads as **200** when interpreted as unsigned. What does that identical 8-bit pattern read as when interpreted as signed two\'s complement?', -56, 'MSB is set (200 ≥ 128), so signed = 200 − 256 = −56.'),
    q.mc('H', 'Why is the two\'s complement range −128 … 127 rather than −127 … 127 or −128 … 128?', ['256 patterns split into 128 with the MSB clear (0 … 127, which includes zero) and 128 with it set (−128 … −1)', 'Hardware cannot represent +128 for electrical reasons', 'The designers made an arbitrary choice', 'Because 127 is prime'], 0, 'Zero takes one of the MSB-clear patterns, leaving 127 positives; the 128 MSB-set patterns are all negative, giving −128 … −1.'),
    q.mc('H', 'Why did engineers reject sign-magnitude (top bit = minus flag, remaining bits = size) in favour of two\'s complement?', ['Sign-magnitude has two zeros and the plain adder gives wrong results, so it needs a separate subtractor and compare logic; two\'s complement lets one unsigned adder handle both', 'Sign-magnitude cannot represent −1', 'Sign-magnitude needs more bits for the same range', 'Two\'s complement is easier for humans to read'], 0, 'The whole point of two\'s complement is that (a + b) mod 2^w is the right signed answer, so the same adder serves both interpretations and subtraction is negate-then-add.'),
    q.info('H', 'Negate = invert + 1, and why', `To negate x we need 256 − x. Here is a trick that avoids any subtractor. **Inverting** every bit of x (written \`~x\`) gives a pattern that has a 1 exactly where x has a 0. So in every column, x and ~x contribute exactly one 1 between them, and the column sum is 1 with no carries anywhere: **x + ~x = 11111111 = 255**, which as a signed value is **−1**.

Rearrange: x + ~x = −1, so **x + (~x + 1) = 0**, which means **~x + 1 is exactly −x**. That is the rule "invert all the bits, then add 1", and now you know it is not a spell: it is 255 − x + 1 = 256 − x, computed with an inverter (cheap: one NOT gate per bit) and the adder you already have.

**10** = \`00001010\` → invert → \`11110101\` (= −11, one less than −10) → add 1 → \`11110110\` = **−10**. Negating again: invert → \`00001001\`, add 1 → \`00001010\` = 10. The rule is its own inverse, as it must be.

**One edge case.** −128 = \`10000000\`: invert → \`01111111\`, add 1 → \`10000000\`. Negating the most negative value gives itself, because +128 does not fit in 8 signed bits. Real hardware and real software both carry this scar: in C, \`-INT_MIN\` is undefined behaviour, and a 32-bit absolute-value function has one input for which it returns a negative number.

Tap bits below and watch x + ~x stay all-ones whatever you do.`, {
      terms: [
        ['Invert (~x, one\'s complement)', 'Flip every bit. ~x = 255 − x in 8 bits, so ~x = −x − 1 as a signed value.'],
        ['Negate', 'Invert all bits and add 1. Works because x + ~x = all-ones = −1.'],
        ['Subtraction in hardware', 'a − b = a + (~b) + 1: an inverter, the adder, and a carry-in of 1. No separate subtractor.'],
        ['Most negative value', '10…0: the only pattern whose negation is itself, because 2^(w−1) does not fit in the signed range.'],
      ],
      widget: W('negate', { width: 8, value: 10 })
    }),
    q.text('H', 'Negate the 8-bit two\'s complement pattern `00000110` (+6) using invert-and-add-1. Write the result.', ['11111010'], 'Invert: 11111001. Add 1: 11111010. Check: −128 + 64 + 32 + 16 + 8 + 2 = −6.', { mono: true, accept: ['^11111010$'] }),
    q.mc('H', 'In 8-bit two\'s complement, what is `~x` (invert every bit, no +1) as a signed value, for any x?', ['−x − 1', '−x', '−x + 1', '255 − x as a signed value, which depends on x'], 0, 'x + ~x = 11111111 = −1, so ~x = −x − 1. Adding 1 gives −x, which is why negation needs the +1.'),
    q.mc('H', 'Why does x + ~x equal all-ones for every x?', ['In each bit position exactly one of x and ~x has a 1, so every column sums to 1 with no carries', 'Because the adder wraps around', 'Because ~x is always larger than x', 'It only works for positive x'], 0, 'Inverting swaps 0 ↔ 1 in every position. One 1 per column, no carries anywhere, so the result is 11111111.'),
    q.text('H', 'Apply invert-and-add-1 to the 8-bit pattern `10000000` (−128). What pattern results?', ['10000000'], 'Invert: 01111111. Add 1: 10000000. −128 negates to itself because +128 does not exist in 8 signed bits. This is the classic corner case for absolute-value logic.', { mono: true, accept: ['^10000000$'] }),
    q.mc('H', 'How does a CPU or FPGA compute a − b using only an adder?', ['a + (~b) + 1: invert b with NOT gates, add it to a, and feed 1 into the carry-in', 'It stores a subtractor circuit separate from the adder', 'It converts both numbers to decimal first', 'It swaps a and b and negates the answer'], 0, '~b + 1 = −b, so a − b = a + ~b + 1. The +1 arrives for free as the carry-in of the lowest full adder.'),
    q.info('H', 'Wrap-around: watch 5 + (−5) become 0, and 7 + 1 become −8', `Counting up in 4 bits: 0111 (7) + 1 = 1000. Unsigned that is 8; signed it is **−8**. The pattern rolled over the top of the positive range and landed at the most negative value. Nothing "went wrong" in the wires; the number just left the range we chose. Drag the wheel slider below past 7 and past 15 to see both wraps.

Now the good side of wrapping. In the 8-bit adder, **5 + (−5)** is \`00000101\` + \`11111011\`. Column by column from the right: 1 + 1 = 10 (sum 0, carry 1); then 0 + 1 + carry 1 = 10 (sum 0, carry 1); and so on, a carry rippling all the way up and out of the top. The 8 bits left behind are all zero, and the **carry-out is discarded**. That discard is exactly the "mod 256" that made two's complement work. A carry-out therefore means nothing on its own for signed numbers; deciding when a signed sum has really gone wrong is Day 8's job (**signed overflow**).`, {
      terms: [
        ['Wrap-around', 'Counting past the largest pattern returns to the smallest. Signed: 127 + 1 = −128. Unsigned: 255 + 1 = 0.'],
        ['Carry-out', 'The 1 that leaves the top bit of the adder. Discarded in w-bit arithmetic; for signed numbers it is not an error flag.'],
        ['Overflow (preview)', 'When the true result does not fit the chosen range. Day 8 shows how to detect it from the sign bits.'],
      ],
      widget: W('wheel', { bitsN: 4, value: 7 })
    }),
    q.goal('H', 'In the 8-bit **signed** adder below, A is already +5. Set B to the two\'s complement pattern for **−5** so that the SUM row reads all zeros and the carry-out is 1.', W('adder', { width: 8, a: 5, b: 0, signed: true, allowSignedToggle: false, targetA: 5, targetB: 251 }), s => s.a === 5 && s.b === 251,
      '−5 = 256 − 5 = 251 = 11111011. Adding 00000101 gives 1 00000000: the carry ripples out of the top and is discarded, leaving 0.'),
    q.mc('H', 'A 4-bit signed register holds 0111 (+7). Add 1. What does the register show, read as signed?', ['1000 = −8', '1000 = +8', '0000 = 0', '0111 = 7 (it saturates)'], 0, 'The pattern rolls over into the MSB, whose weight is −8. The wires did nothing wrong; the value left the range −8 … 7.'),
    q.mc('H', 'In 8-bit arithmetic, 5 + (−5) produces a carry-out of 1 and an 8-bit result of 0. What does that carry-out mean for signed numbers?', ['Nothing by itself: discarding it is the mod-256 step that makes two\'s complement work, and the result 0 is correct', 'The addition overflowed and the result is wrong', 'The result should be read as 256', 'The sign of the result must be flipped'], 0, 'For unsigned numbers carry-out = overflow. For signed numbers the carry-out is routinely discarded; a signed sum goes wrong only when the true result leaves −128 … 127 (Day 8).'),
    q.info('H', 'Same bits, three readings: unsigned, signed, hex', `Hardware people move between three readings of one pattern without a pencil. Take \`11110110\`:

- **Hex**: split into nibbles, 1111 0110 → **0xF6** (Day 1).
- **Unsigned**: 15 × 16 + 6 = **246**.
- **Signed**: the top hex digit is 8 or more (F), so the MSB is set: 246 − 256 = **−10**.

The shortcut for hex → signed: if the leading hex digit is **8, 9, A, B, C, D, E or F**, the MSB is 1 and the value is negative; subtract 2^w (256 for a byte, 65536 for 16 bits). Otherwise it is the plain unsigned value. Landmarks worth knowing cold: \`0x7F\` = 127 (most positive byte), \`0x80\` = −128, \`0xFF\` = −1, \`0x00\` = 0. For 16 bits: \`0x7FFF\` = 32767, \`0x8000\` = −32768, \`0xFFFF\` = −1.

**Why this matters on Monday.** A Verilog signal declared \`logic [7:0] x\` and one declared \`logic signed [7:0] y\` can hold the identical pattern 0xF6, and a comparison \`x < 0\` is always false while \`y < 0\` is true. The handbook's H01 warning, "arithmetic can be logically plausible and still wrong", is usually this: the bits were right, the declared interpretation was not.`, {
      terms: [
        ['Nibble → hex digit', 'Four bits map to one hex digit. The top digit tells you the sign at a glance.'],
        ['0x80 / 0x7F / 0xFF', 'Landmarks for a signed byte: −128, +127, −1.'],
        ['Declared signedness', 'In an HDL, whether a signal is treated as signed is part of its declaration, not of its bits.'],
      ]
    }),
    q.num('H', 'What is `0xFF` as a signed 8-bit two\'s complement value?', -1, 'Leading digit F means the MSB is set: 255 − 256 = −1. All-ones is always −1.'),
    q.num('H', 'What is `0xC0` as a signed 8-bit two\'s complement value?', -64, 'C = 1100, so the pattern is 11000000: −128 + 64 = −64. Or 192 − 256 = −64.'),
    q.text('H', 'Write **−2** as an 8-bit two\'s complement pattern in **hex** (two digits, no prefix needed).', ['FE', '0xFE'], '256 − 2 = 254 = 1111 1110 = 0xFE. Or: −1 is 0xFF, one less is 0xFE.', { mono: true, accept: ['^(0x)?fe$'] }),
    q.mc('H', 'Two 16-bit signals hold the identical pattern `0x8000`. One is declared unsigned, the other signed. Their values are…', ['32768 unsigned and −32768 signed', 'both 32768', 'both −32768', '32768 unsigned and −1 signed'], 0, 'Leading digit 8 sets the MSB. Unsigned: 8 × 4096 = 32768. Signed: 32768 − 65536 = −32768, the most negative 16-bit value.'),
    q.code('H', 'Build: write `solve(bits)` that decodes a string of `0`/`1` characters as a **signed two\'s complement** number of width `len(bits)`. Use a loop with place value (double, then add the bit) as on Day 1, then correct for the sign: if the first character is `1` the MSB weight should have been negative, so subtract `2 ** len(bits)`. Do not call `int(bits, 2)` on the whole string; own the arithmetic. Random strings of width 1 … 16 are checked against a hidden reference.', {
      fn: 'solve',
      starter: 'def solve(bits):\n    value = 0\n    for ch in bits:\n        # double what you have, then add this bit (unsigned place value)\n        pass\n    # if the MSB (bits[0]) is "1", the pattern is negative: subtract 2 ** width\n    return value\n',
      tests: [
        { args: ['11110110'], expect: -10 },
        { args: ['00001010'], expect: 10, name: 'MSB clear: plain unsigned' },
        { args: ['10000000'], expect: -128, name: 'most negative byte' },
        { args: ['11111111'], expect: -1, name: 'all-ones is −1' },
        { args: ['01111111'], expect: 127, name: 'most positive byte' },
        { args: ['0'], expect: 0, name: '1-bit zero' },
        { args: ['1'], expect: -1, name: '1-bit: the only weight is −1' },
        { args: ['1101'], expect: -3, name: '4-bit −3' },
        { args: ['1000000000000000'], expect: -32768, name: '16-bit most negative' },
      ],
      gen: 'def gen():\n    for _ in range(50):\n        n = random.randint(1, 16)\n        yield ["".join(random.choice("01") for _ in range(n))]',
      refCode: 'def ref(bits):\n    v = int(bits, 2)\n    return v - (1 << len(bits)) if bits[0] == "1" else v',
      solution: 'def solve(bits):\n    value = 0\n    for ch in bits:\n        value = value * 2 + (1 if ch == "1" else 0)\n    if bits[0] == "1":\n        value = value - 2 ** len(bits)\n    return value'
    }, 'The unsigned loop gives the MSB weight +2^(w−1). The signed reading wants −2^(w−1): the difference is exactly 2^w, so subtracting 2^w when the MSB is set converts one to the other. This is the "signed = unsigned − 256" rule for any width.'),
    // =====================================================================================================
    // CODE: lists, zero-based indexing, half-open slices
    // =====================================================================================================
    q.info('S', 'Lists: why the first item is at index 0', `\`xs = [10, 20, 30, 40]\` is a list of four items. Each has a **position**, and Python (like C, Verilog vectors and memory addresses) numbers positions from **0**: \`xs[0]\` is 10, \`xs[3]\` is 40. Why not start at 1, as people do?

**Because an index is an offset, a distance from the start.** In memory a list's items sit one after another. The first item is *at* the start, so its distance from the start is 0; the fourth is three steps along. With zero-based indexing the address arithmetic is simply \`start + i × size\`, with nothing to subtract. Hardware feels the same: an 8-entry memory has addresses 0 … 7, because three address bits give the patterns 000 … 111, and 000 has to mean something. Choosing "1" for the first entry would waste the 000 pattern or force a subtract-1 on every access.

So \`len(xs)\` is 4 but the last index is 3; in general the valid indices are 0 … len − 1. Asking for \`xs[4]\` raises **IndexError**: Python refuses rather than guessing, which is the right behaviour (C would silently read whatever memory came next). **Negative indices** count from the end: \`xs[-1]\` is the last item, \`xs[-2]\` the one before, so \`xs[-k]\` is shorthand for \`xs[len(xs) - k]\`. Run the lines below.`, {
      widget: W('repl', { lines: [['xs = [10, 20, 30, 40]', ''], ['xs[0]', '10'], ['xs[3]', '40'], ['len(xs)', '4'], ['xs[-1]', '40'], ['xs[-2]', '30'], ['xs[len(xs) - 1]', '40'], ['xs[4]', '!IndexError: list index out of range'], ['xs[0] = 99', ''], ['xs', '[99, 20, 30, 40]']] }),
      terms: [
        ['Index', 'The position of an item, counted as a distance from the start. Zero-based: the first item is index 0.'],
        ['Offset', 'How far along from the start. Index 0 is at the start itself; index i is i steps along.'],
        ['IndexError', 'The error Python raises when an index is outside 0 … len − 1 (or −len … −1).'],
        ['Negative index', 'xs[−k] means xs[len(xs) − k]: −1 is the last item, −2 the one before.'],
        ['Mutable', 'A list can be changed in place: xs[0] = 99 replaces the first item; xs.append(5) adds one to the end.'],
      ]
    }),
    q.num('S', '`xs = [10, 20, 30, 40]`. What is `xs[1]`?', 20, 'Index 0 is 10 (at the start), index 1 is one step along: 20.'),
    q.num('S', '`xs = [10, 20, 30, 40]`. What is `xs[-1]`?', 40, '−1 means the last element; it is shorthand for xs[len(xs) − 1] = xs[3].'),
    q.num('S', '`xs = [10, 20, 30, 40]`. What is `xs[-3]`?', 20, 'xs[−3] = xs[4 − 3] = xs[1] = 20.'),
    q.mc('S', '`xs = [10, 20, 30, 40]`. What happens when you evaluate `xs[4]`?', ['IndexError is raised', 'Returns None', 'Returns 0', 'Wraps to xs[0]'], 0, 'Valid indices are 0 … 3. Python refuses rather than guessing; C would read garbage memory silently.'),
    q.mc('S', 'Why do Python, C and memory addresses number the first item **0** rather than 1?', ['An index is an offset from the start: the first item is at distance 0, so the address is start + i × size with nothing to subtract', 'Because 0 is the smallest number a computer can store', 'It is a historical accident with no technical reason', 'To make lists shorter'], 0, 'Zero-based indexing makes the address arithmetic clean and uses the all-zero address pattern. Day 2\'s slices depend on it too.'),
    q.num('S', 'A memory has 16 entries, addressed with 4 bits. What is the address of the **last** entry?', 15, 'Addresses 0 … 15 (0000 … 1111). The 16th entry sits at address 15, exactly like a 16-item list whose last index is 15.'),
    q.mc('S', 'After `xs = [10, 20, 30, 40]` and `xs[0] = 99`, what is `xs`?', ['[99, 20, 30, 40]', '[10, 20, 30, 40, 99]', '[99]', 'an error: lists cannot be changed'], 0, 'Item assignment replaces the item at that index in place. Lists are mutable.', { grid: true }),
    q.info('S', 'Slices are half-open, and why', `A **slice** \`xs[a:b]\` gives a new list of the items from index a up to **but not including** b: for \`xs = [10, 20, 30, 40]\`, \`xs[1:3]\` is \`[20, 30]\`. Including the start and excluding the stop is called a **half-open** range, written [a, b). Why not include both ends, as "from 1 to 3" sounds?

**1. Lengths subtract.** The number of items in \`xs[a:b]\` is exactly **b − a**: 3 − 1 = 2. With closed ranges it would be b − a + 1, and that "+ 1" is the source of a whole family of off-by-one bugs.

**2. Adjacent slices tile with no overlap and no gap.** \`xs[:2] + xs[2:]\` is xs again: the stop of one piece is the start of the next, with no "2 + 1" needed. That is why "split at k" is written \`xs[:k]\` and \`xs[k:]\`.

**3. The empty range exists.** \`xs[2:2]\` is \`[]\`, length 0, no error. A closed range cannot express "nothing" cleanly.

**The picture that makes this obvious:** indices name the **boxes**, but slice bounds name the **gaps between boxes**. Gap 0 is before the first item, gap 4 is after the last. xs[1:3] is everything between gap 1 and gap 3. Drag the sliders below.

Two more rules that follow: leaving a bound out means "from the start" (\`xs[:2]\` = [10, 20]) or "to the end" (\`xs[2:]\` = [30, 40]), and slice bounds **clip** rather than error: \`xs[1:100]\` is [20, 30, 40], because gap 100 is simply treated as the end. (A bare index like xs[100] still raises IndexError; an index must point at a real box.) A slice builds a **new list**, so changing the slice does not change the original; that matters on Day 5 when two names share one list.`, {
      terms: [
        ['Slice', 'xs[a:b]: a new list of the items from index a up to but not including b.'],
        ['Half-open interval', '[a, b): includes a, excludes b. Length is b − a; adjacent intervals tile. Used everywhere in code and hardware addressing.'],
        ['Gap (boundary) numbering', 'Slice bounds count the gaps between items: gap 0 before the first, gap len after the last.'],
        ['Clipping', 'A slice bound beyond the end is treated as the end. Slices never raise IndexError.'],
        ['Copy', 'A slice is a fresh list object. xs[:] copies the whole list.'],
      ],
      widget: W('slicer', { items: [10, 20, 30, 40, 50, 60], a: 1, b: 3 })
    }),
    q.goal('S', 'Using the slider widget for `xs = [10, 20, 30, 40, 50, 60]`, set the bounds so that the highlighted slice is `[20, 30]` (that is, show `xs[1:3]`).', W('slicer', { items: [10, 20, 30, 40, 50, 60], a: 0, b: 6, target: [1, 3] }), s => s.a === 1 && s.b === 3,
      'Gap 1 sits between 10 and 20; gap 3 sits between 30 and 40. Everything between those two gaps is [20, 30]: two items, 3 − 1 = 2.'),
    q.tokens('S', 'Build the value of `xs[1:3]` for `xs = [10, 20, 30, 40]`.', ['[', '20', ',', '30', ']'], ['10', '40'], 'Start at index 1 (20), stop before index 3: [20, 30]. Two items, 3 − 1 = 2.', { mono: true }),
    q.num('S', 'How many items are in `xs[2:7]` when `xs` has at least 7 items?', 5, 'Half-open: 7 − 2 = 5 items (indices 2, 3, 4, 5, 6).'),
    q.tokens('S', 'Build the value of `xs[:2]` for `xs = [10, 20, 30, 40]`.', ['[', '10', ',', '20', ']'], ['30', '40'], 'A missing start means gap 0. Up to but not including index 2: [10, 20].', { mono: true }),
    q.tokens('S', 'Build the value of `xs[-2:]` for `xs = [10, 20, 30, 40]`.', ['[', '30', ',', '40', ']'], ['10', '20'], '−2 is index 2 (len − 2). From there to the end: [30, 40]. xs[−k:] is always "the last k items".', { mono: true }),
    q.mc('S', '`xs = [10, 20, 30, 40]`. What is `xs[1:100]`?', ['[20, 30, 40]', 'IndexError', '[20, 30, 40, None, None, …]', '[]'], 0, 'Slice bounds clip to the end; only a bare index must point at a real item.', { grid: true }),
    q.mc('S', '`xs = [10, 20, 30, 40]`. What is `xs[2:2]`?', ['[]', '[30]', 'IndexError', '[30, 30]'], 0, 'Gap 2 to gap 2 contains no boxes: the empty list, length 2 − 2 = 0, no error.', { grid: true }),
    q.mc('S', 'Why do slices exclude the stop index (`xs[a:b]` stops before b)?', ['Lengths become b − a, adjacent slices xs[:k] and xs[k:] tile exactly, and the empty slice xs[k:k] exists', 'Because Python cannot count to b', 'To make slices one item shorter for safety', 'It is an arbitrary rule with no benefit'], 0, 'Half-open ranges remove the "+1" from length arithmetic and let a split point be shared by both pieces. The same convention is used for range() on Day 4 and for memory ranges in hardware.'),
    q.mc('S', 'After `xs = [10, 20, 30, 40]`, `ys = xs[1:3]`, `ys[0] = 99`, what is `xs`?', ['[10, 20, 30, 40]: a slice is a new list', '[10, 99, 30, 40]', '[99, 20, 30, 40]', 'an error'], 0, 'Slicing copies the selected items into a fresh list. Changing ys does not touch xs. (Day 5: ys = xs, without a slice, would make two names for one list.)'),
    q.num('S', 'For `xs = [3, 1, 4, 1, 5, 9, 2, 6]`, what is `len(xs[:5]) + len(xs[5:])`?', 8, 'xs[:5] has 5 items and xs[5:] has 3; the two pieces tile the whole list: 5 + 3 = 8 = len(xs).'),
    q.code('S', 'Write `solve(xs, k)` that returns a **new list** equal to `xs` rotated **left** by `k` places: `solve([1, 2, 3, 4, 5], 2)` → `[3, 4, 5, 1, 2]`. `k` may be larger than the length (rotating a 3-item list by 3 changes nothing) or negative (rotate right). Return `[]` for an empty list. Two slices and one `+` do the whole job; a 50,000-item list must rotate within the time budget, so do not move items one at a time.', {
      fn: 'solve',
      starter: 'def solve(xs, k):\n    if len(xs) == 0:\n        return []\n    # bring k into 0 .. len(xs) - 1 (Python\'s % handles negatives and big k)\n    # then join the tail slice and the head slice\n    return xs\n',
      tests: [
        { args: [[1, 2, 3, 4, 5], 2], expect: [3, 4, 5, 1, 2] },
        { args: [[], 3], expect: [], name: 'empty list' },
        { args: [[7], 5], expect: [7], name: 'single item' },
        { args: [[1, 2, 3], 3], expect: [1, 2, 3], name: 'a full turn changes nothing' },
        { args: [[1, 2, 3], 0], expect: [1, 2, 3], name: 'k = 0' },
        { args: [[1, 2, 3, 4], 6], expect: [3, 4, 1, 2], name: 'k larger than the length' },
        { args: [[1, 2, 3, 4], -1], expect: [4, 1, 2, 3], name: 'negative k rotates right' },
        { args: [[5, 5, 5, 1], 1], expect: [5, 5, 1, 5], name: 'duplicates' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(0, 12)\n        yield [[random.randint(0, 9) for _ in range(n)], random.randint(-20, 20)]',
      refCode: 'def ref(xs, k):\n    if not xs:\n        return []\n    k %= len(xs)\n    return xs[k:] + xs[:k]',
      speed: { gen: 'def gen():\n    return [[random.randint(0, 1000) for _ in range(50000)], 12345]', budgetMs: 1500, label: '50,000 items' },
      solution: 'def solve(xs, k):\n    if len(xs) == 0:\n        return []\n    k = k % len(xs)\n    return xs[k:] + xs[:k]'
    }, 'k % len(xs) brings any k into 0 … len − 1 (−1 % 4 = 3, so rotating right by 1 is rotating left by 3). Then the half-open slices xs[k:] and xs[:k] tile the list with no overlap, and joining them in the other order is the rotation. Both slices are single copies, so the whole thing is one pass over the list. Popping the front item k times is O(n) per pop and stalls on 50,000 items.'),

    // =====================================================================================================
    // MATHS: 'at least one' via the complement
    // =====================================================================================================
    q.info('M', "'At least one': count what you don't want", `Yesterday: P(not A) = 1 − P(A), because the cells inside and outside A add up to the whole grid. Today that rule earns its keep.

Ask "**at least one six** on two dice". Counting directly is messy: a six on the first die (6 cells), a six on the second (6 cells), but the cell (6, 6) is in both and must not be counted twice; 6 + 6 − 1 = 11. Now imagine ten dice: the overlaps pile up into dozens of cases. The direct route drowns.

The **complement** is one clean count. "At least one six" fails only when there is **no six at all**, and "no six" means every die avoided the six: 5 choices for the first, 5 for the second, so 5 × 5 = **25** cells (the 5 × 5 block in the grid below). Hence P(at least one six) = 1 − 25/36 = **11/36**. The two counts agree, and only one of them stays easy as the problem grows.

The pattern to remember: **"at least one" is the complement of "none"**, and "none" is usually a single product of counts. Whenever a question says "at least one", reach for 1 − P(none) first.`, {
      terms: [
        ['Complement', '"Not A": every outcome not in A. P(not A) = 1 − P(A).'],
        ['At least one', 'One or more. Its complement is "none", which is usually far easier to count.'],
        ['None', 'Zero occurrences: every trial avoided the thing. Count = (ways to avoid)^(number of trials) when the trials are alike.'],
        ['Overlap (intersection)', 'Outcomes in both A and B, written A ∩ B. Adding P(A) + P(B) counts it twice.'],
      ],
      widget: W('dice', { event: (a, b) => a === 6 || b === 6, eventName: 'at least one six', cond: () => true, condName: 'none' })
    }),
    q.num('M', 'Two fair dice. P(no six on either die) = ?', 25 / 36, 'Each die has 5 non-six faces: 5 × 5 = 25 of the 36 equally likely cells.', { display: '25/36' }),
    q.num('M', 'Two fair dice. P(at least one six) = ?', 11 / 36, '1 − 25/36 = 11/36 ≈ 0.306. Direct count: 6 + 6 − 1 = 11 cells (the row and column of sixes share (6, 6)).', { display: '11/36' }),
    q.mc('M', 'A student says: "P(at least one six on two dice) = 1/6 + 1/6 = 1/3." What is wrong?', ['The two events "first die is 6" and "second die is 6" overlap at (6, 6), so adding counts that cell twice; the correct value is 11/36', 'Nothing; 1/3 is correct', 'The events are disjoint, so the answer is 12/36', 'You should multiply: 1/36'], 0, 'Adding is only allowed for disjoint events. Here 6 + 6 double-counts (6, 6): 11/36, not 12/36. With three dice the naive 3 × 1/6 = 1/2 is wrong too, and with seven dice it exceeds 1.'),
    q.num('M', 'Two fair dice. P(at least one die shows a 5 or a 6) = ?', 20 / 36, 'Complement: both dice show 1 … 4, which is 4 × 4 = 16 cells. 36 − 16 = 20, so 20/36 = 5/9.', { display: '20/36 = 5/9' }),
    q.num('M', 'A fair coin is flipped 3 times. P(at least one head) = ?', 7 / 8, 'The 8 sequences HHH … TTT are equally likely. "No head" is the single sequence TTT: 1/8. So 1 − 1/8 = 7/8.', { display: '7/8' }),
    q.num('M', 'A fair coin is flipped 10 times. P(at least one head), to 4 decimal places?', 1023 / 1024, '1 − 1/2^10 = 1 − 1/1024 = 1023/1024 ≈ 0.9990. Ten tails in a row is the only failing sequence out of 1024.', { display: '1023/1024', tol: 0.0005 }),
    q.info('M', 'Partitions: none, exactly one, both', `The complement is a special case of a more general habit: **cut the sample space into pieces that cannot overlap, then add the pieces**. For "sixes on two dice" the pieces are:

- **no six**: 5 × 5 = **25** cells;
- **exactly one six**: a six on the first die and a non-six on the second (1 × 5 = 5) or the other way round (5 × 1 = 5): **10** cells;
- **both sixes**: the single cell (6, 6): **1**.

Check: 25 + 10 + 1 = 36. Every cell is in exactly one piece, so the pieces are a **partition** and their probabilities add to 1. Now any question about sixes is a sum of pieces: "at least one" = exactly one + both = 11/36; "**at most one**" = none + exactly one = 35/36, which is also 1 − P(both) = 1 − 1/36. Two routes, same answer: that is your check.

The same three pieces appear for coins, for packet drops, for faulty parts. The discipline is to name the pieces and confirm they cover everything exactly once *before* adding. Day 1's "sum is 7 or 11" was allowed to add for the same reason: the two sums cannot both happen.`, {
      terms: [
        ['Partition', 'A split of the sample space into pieces with no overlaps and no gaps. Their probabilities sum to 1.'],
        ['Exactly one', 'One occurrence and no more. For two trials: (yes, no) or (no, yes), two disjoint cases.'],
        ['At most one', 'Zero or one occurrence. Complement of "two or more"; for two trials, the complement of "both".'],
        ['Disjoint (mutually exclusive)', 'Two events that share no outcome. Then P(A or B) = P(A) + P(B).'],
      ],
      widget: W('dice', { event: (a, b) => (a === 6) !== (b === 6), eventName: 'exactly one six', cond: () => true, condName: 'none' })
    }),
    q.num('M', 'Two fair dice. P(exactly one six) = ?', 10 / 36, '(6, non-six): 5 cells; (non-six, 6): 5 cells. 10/36. Check: 25 (none) + 10 + 1 (both) = 36.', { display: '10/36 = 5/18' }),
    q.num('M', 'Two fair dice. P(at most one six) = ?', 35 / 36, '"At most one" fails only when both dice show 6: 1 − 1/36 = 35/36. Or none + exactly one = 25 + 10 = 35 cells.', { display: '35/36' }),
    q.mc('M', 'Two fair dice. "Sum is 7" and "sum is 11" are disjoint. P(sum is 7 **or** 11)?', ['8/36', '6/36', '2/36', '12/36'], 0, '6/36 + 2/36 = 8/36. Adding is allowed only because no cell has both sums.'),
    q.num('M', 'Two fair dice. P(the sum is neither 7 nor 11) = ?', 28 / 36, 'Complement of "7 or 11" (8 cells): 36 − 8 = 28. 28/36 = 7/9.', { display: '28/36 = 7/9' }),
    q.num('M', 'A fair coin is flipped 3 times. P(all three flips show the same face) = ?', 2 / 8, 'HHH and TTT: 2 of the 8 equally likely sequences. The two cases are disjoint, so they add: 1/8 + 1/8.', { display: '2/8 = 1/4' }),
    q.info('M', "More trials: count outcomes, then de Méré's bet", `Roll one die **four** times. How many outcomes? Each roll has 6 results, and any result of roll 1 can go with any result of roll 2, and so on: 6 × 6 × 6 × 6 = **1296** equally likely sequences, the same reasoning that gave 36 cells for two dice (a 4-dimensional grid). "No six in four rolls" leaves 5 choices per roll: 5⁴ = **625**. So P(at least one six in 4 rolls) = 1 − 625/1296 ≈ **0.518**.

You may also write this as 1 − (5/6)⁴: dividing 5⁴ by 6⁴ is the same as multiplying 5/6 by itself four times. Multiplying probabilities of separate rolls is legitimate here because the rolls do not influence each other; Day 3 makes that idea (**independence**) precise and shows when it fails.

**The story.** In 1654 the gambler Antoine Gombaud, Chevalier de Méré, made money betting he would roll at least one six in four rolls (0.518, slightly better than evens). He then reasoned "a double six is 6 times rarer, so 24 double rolls should be just as good", and lost steadily. Compute it: 1 − (35/36)²⁴ ≈ **0.491**, slightly *worse* than evens. His letter to Pascal about this, and Pascal's reply to Fermat, started probability theory. The lesson is the one on this card: "at least one" is not proportional to the number of trials; only the complement is easy, and it must be computed, not guessed.`, {
      terms: [
        ['Product rule of counting', 'If stage 1 has m results and stage 2 has n, and any pairing is possible, there are m × n outcomes. Extends to any number of stages.'],
        ['Sequence of trials', 'Repeating an experiment n times; an outcome is the whole list of results, e.g. (3, 6, 6, 1).'],
        ['(1 − p)ⁿ', 'Probability that none of n independent trials succeeds, when each succeeds with probability p. Day 3 justifies the multiplication.'],
        ["de Méré's paradox", 'Four rolls for a six wins 51.8 %; twenty-four double rolls for a double six wins only 49.1 %.'],
      ]
    }),
    q.num('M', 'How many equally likely outcomes are there when one fair die is rolled **four** times (each outcome is the full sequence of four results)?', 1296, '6 × 6 × 6 × 6 = 6⁴ = 1296. Each roll multiplies the number of sequences by 6.'),
    q.num('M', 'One fair die is rolled four times. P(at least one six), to 3 decimal places?', 671 / 1296, 'No six: 5⁴ = 625 sequences out of 6⁴ = 1296. 1 − 625/1296 = 671/1296 ≈ 0.518.', { display: '671/1296 ≈ 0.518', tol: 0.002 }),
    q.mc('M', 'Which reasoning is correct for "at least one six in four rolls of a die"?', ['1 − (5/6)⁴ ≈ 0.518: the complement "no six" has 5 choices per roll', '4 × 1/6 = 2/3: each roll adds 1/6', '1/6, because each roll is 1/6', '(1/6)⁴, because all four rolls matter'], 0, 'Adding 1/6 four times double-counts sequences with more than one six (and with 7 rolls would exceed 1). Only the complement multiplies cleanly.'),
    q.num('M', 'Stretch: two fair dice are rolled together **three** times. P(at least one double, i.e. both dice equal, in the three rolls), to 3 decimal places?', 91 / 216, 'P(double) on one roll = 6/36 = 1/6, so P(no double) = 5/6 per roll. Three rolls: (5/6)³ = 125/216 with no double at all. 1 − 125/216 = 91/216 ≈ 0.421.', { display: '91/216 ≈ 0.421', tol: 0.002 }),
    q.num('M', 'Stretch: three fair dice. P(at least **two** sixes), to 3 decimal places?', 16 / 216, 'Complement is "zero or one six". Zero: 5³ = 125. Exactly one: the six can be on any of the 3 dice, the other two non-six: 3 × 25 = 75. Total 200 of 216, so P(at least two) = 16/216 = 2/27 ≈ 0.074. (Direct: exactly two = 3 × 5 = 15, all three = 1, 16 in total.)', { display: '16/216 = 2/27 ≈ 0.074', tol: 0.002 }),
    q.num('M', 'Stretch: de Méré\'s second bet. Two dice are rolled 24 times. P(at least one double six), to 3 decimal places?', 1 - Math.pow(35 / 36, 24), 'P(no double six on one roll) = 35/36. Over 24 rolls the no-double-six sequences are 35²⁴ of 36²⁴, so P(none) = (35/36)²⁴ ≈ 0.509 and P(at least one) ≈ 0.491, just below evens. He lost money because 24 × 1/36 = 2/3 is not a probability.', { display: '≈ 0.491', tol: 0.003 }),

    // =====================================================================================================
    // DEGREE: power vs energy, units, kWh, heating, batteries, efficiency (EEEN11101)
    // =====================================================================================================
    q.info('E', 'Power is a rate, energy is a total', `Yesterday: P = V·I is the rate at which energy is delivered to a component, in joules per second (**watts**). Today the other half: the **energy** itself. Energy is what you pay for, what heats the water, what a battery stores, what a resistor turns into heat over an afternoon. Power says *how fast*; energy says *how much*.

For constant power, **E = P × t**: a 100 W lamp for 2 hours uses 100 J/s × 7200 s = **720,000 J**. If the power varies, the energy is the area under the power-versus-time graph (an integral; Day 8 makes that precise). The height picture from Day 1 helps: each coulomb falls through V volts and gives up V joules; I coulombs per second fall, so V·I joules per second are given up; run that for t seconds and the total is V·I·t.

**Why the joule feels tiny.** One joule lifts an apple one metre. A kettle uses about a million of them per boil, a house tens of millions per day. Bills therefore use a bigger unit, the **kilowatt-hour**: the energy of 1000 W running for one hour, 1000 × 3600 = **3.6 million joules (3.6 MJ)**. Same quantity, more convenient size. The 100 W lamp for 2 h is 0.1 kW × 2 h = **0.2 kWh**; check: 0.2 × 3.6 MJ = 720,000 J.

Drag the power and time below and watch both readings.`, {
      terms: [
        ['Energy', 'The total amount of work done or heat produced, in joules. What you pay for and what heats things.'],
        ['Power', 'Energy per second, in watts. A rate, not an amount. P = V·I for an electrical component.'],
        ['Joule (J)', 'The SI unit of energy: 1 W for 1 s, or lifting 1 N through 1 m.'],
        ['Watt (W)', 'One joule per second.'],
        ['Kilowatt-hour (kWh)', '1000 W for 3600 s = 3.6 MJ. The billing unit for electricity; a "unit" on a bill.'],
      ],
      widget: W('energy', { P: 100, h: 2 })
    }),
    q.num('E', 'A 100 W lamp runs for 2 hours. Energy used, in **kWh**?', 0.2, '0.1 kW × 2 h = 0.2 kWh.', { unit: 'kWh' }),
    q.num('E', 'A 100 W lamp runs for 2 hours. Energy used, in **joules**?', 720000, '100 W × 7200 s = 720,000 J. Check: 0.2 kWh × 3.6 MJ/kWh = 720,000 J.', { unit: 'J' }),
    q.mc('E', 'A watt is…', ['a joule per second', 'a joule', 'an amp per volt', 'a volt per amp'], 0, 'Power = energy/time. J/s = W. (V/A is an ohm; A/V is a siemens.)'),
    q.tf('E', 'A 2 kW heater always uses more energy than a 1 kW heater.', false, 'Power is a rate. Energy = power × time: a 1 kW heater running for 3 hours (3 kWh) uses more than a 2 kW heater running for 1 hour (2 kWh).'),
    q.num('E', 'Stretch: a 2 kW heater runs for 90 minutes. Energy in kWh?', 3, '90 minutes is 1.5 h. 2 kW × 1.5 h = 3 kWh (= 10.8 MJ).', { unit: 'kWh' }),
    q.num('E', 'How many joules are in one kilowatt-hour?', 3600000, '1 kWh = 1000 W × 3600 s = 3,600,000 J = 3.6 MJ.', { unit: 'J' }),
    q.mc('E', 'Which of these is an amount of **energy** rather than a rate?', ['kWh', 'kW', 'W', 'J/s'], 0, 'kWh is power × time, an energy (3.6 MJ). kW, W and J/s are all rates.'),
    q.info('E', 'Units and prefixes: a number without a unit is not an answer', `Engineering numbers span many powers of ten, so SI **prefixes** scale the unit: **k** (kilo) = 10³, **M** (mega) = 10⁶, **G** (giga) = 10⁹, **m** (milli) = 10⁻³, **µ** (micro) = 10⁻⁶, **n** (nano) = 10⁻⁹. Capital M is a million, small m is a thousandth: 1 MW and 1 mW differ by a factor of a billion, and both appear in exam papers.

**Working method.** Convert everything to base units (W, s, J, V, A, Ω), calculate, then convert the answer to a sensible prefix. The traps are all in the time unit: hours must become seconds (× 3600) before you multiply by watts to get joules, and minutes must become hours (÷ 60) before you multiply by kilowatts to get kWh. 2 kW for 90 min: 90 min = 1.5 h, so 3 kWh; or 2000 W × 5400 s = 10.8 MJ, and 10.8 MJ ÷ 3.6 MJ/kWh = 3 kWh. Both routes must agree.

**Money.** A bill charges per kWh. At 30 p/kWh, 3 kWh costs 90 p. The sums are trivial; the discipline is writing the unit at every step so the 3600 and the 1000 land in the right places. A useful sanity check: 1 kWh of heat raises about 10 litres of water from cold to boiling (10 kg × 4200 J/kg·K × 80 K ≈ 3.4 MJ). If your kettle calculation says a boil costs £5, a unit slipped.`, {
      terms: [
        ['SI prefix', 'A letter that scales a unit by a power of ten: k = 10³, M = 10⁶, m = 10⁻³, µ = 10⁻⁶.'],
        ['Base units', 'W, s, J, V, A, Ω without prefixes. Convert to these before calculating.'],
        ['Unit price', 'The cost of one kWh (a "unit") of electricity; about 25–30 p in the UK in 2026.'],
        ['Sanity check', 'A rough known value (1 kWh boils about 10 litres) used to catch a factor-of-1000 slip.'],
      ]
    }),
    q.num('E', 'Electricity costs 30 p per kWh. A 2 kW heater runs for 90 minutes. Cost in **pence**?', 90, '2 kW × 1.5 h = 3 kWh; 3 × 30 p = 90 p.', { unit: 'p' }),
    q.num('E', 'A 60 W bulb is left on 24 hours a day for 30 days. Energy used in **kWh**?', 43.2, '60 W × 24 h × 30 days = 43,200 Wh = 43.2 kWh.', { unit: 'kWh', tol: 0.05 }),
    q.num('E', 'A 60 W bulb is left on 24 hours a day for 30 days, and electricity costs 30 p per kWh. Cost in **pounds**, to the nearest penny?', 12.96, '43.2 kWh × 30 p = 1296 p = £12.96. A 6 W LED giving the same light would cost £1.30.', { unit: '£', tol: 0.01 }),
    q.num('E', 'A 3 kW electric shower runs for 8 minutes. Energy in **kWh**?', 0.4, '8 min = 8/60 h = 0.1333 h. 3 kW × 0.1333 h = 0.4 kWh (= 1.44 MJ).', { unit: 'kWh', tol: 0.005 }),
    q.mc('E', 'A student computes the energy of a 2 kW heater running for 90 minutes as 2 × 90 = 180 kWh. What went wrong?', ['Minutes were multiplied by kilowatts; 90 min must be converted to 1.5 h first, giving 3 kWh', 'Nothing; 180 kWh is correct', 'The answer should be in joules', 'The heater\'s power should be in milliwatts'], 0, 'kW × h = kWh, so time must be in hours. Writing the unit at every step (2 kW × 90 min) shows immediately that the product is not a kWh.'),
    q.num('E', 'A phone charger delivers 5 V at 2 A for 30 minutes. Energy delivered, in **joules**?', 18000, 'P = V·I = 10 W. E = P·t = 10 W × 1800 s = 18,000 J (= 5 Wh).', { unit: 'J' }),
    q.info('E', 'Where the energy goes: heat, batteries and efficiency', `**Heating.** In a resistor every joule becomes heat, so over time t the heat is E = P·t = V·I·t = **I²R·t**. Heat raises temperature according to **Q = m·c·ΔT**: mass × specific heat capacity × temperature rise. Water has c ≈ 4200 J per kg per °C. A kettle heating 1.5 kg of water from 20 °C to 100 °C must supply 1.5 × 4200 × 80 = **504,000 J**; at 2 kW that takes 504,000 / 2000 = **252 s**, about four minutes, which matches experience. This is your first "engineering estimate": physics constants in, a time out, checked against the world.

**Batteries.** A battery is labelled with its **capacity** in ampere-hours (Ah) or milliampere-hours (mAh): how much charge it can push. Multiply by its voltage to get **energy**: a 3.7 V, 2000 mAh phone cell holds 3.7 × 2 = **7.4 Wh** = 26,640 J. A load of 0.5 W then runs for 7.4 / 0.5 = **14.8 h**. A 12 V, 40 Ah car battery holds 480 Wh. Ah alone is not energy; the voltage matters.

**Efficiency.** No real converter is perfect. **η = P_out / P_in**; the difference P_in − P_out is lost, almost always as heat. A motor that draws 460 W from the mains and is 80 % efficient delivers 0.8 × 460 = **368 W** of mechanical power and warms its surroundings with the other 92 W. Under Day 1's passive sign convention, the source's negative power and the loads' positive powers still sum to zero: the "lost" power is simply absorbed by a component you were not thinking about.`, {
      terms: [
        ['Specific heat capacity (c)', 'Joules needed to warm 1 kg of a material by 1 °C. Water: about 4200 J/(kg·°C).'],
        ['Q = m·c·ΔT', 'Heat energy = mass × specific heat capacity × temperature rise.'],
        ['Capacity (Ah, mAh)', 'How much charge a battery can deliver: 2000 mAh = 2 A for 1 h, or 0.2 A for 10 h.'],
        ['Watt-hour (Wh)', 'Battery energy = voltage × Ah. 1 Wh = 3600 J.'],
        ['Efficiency (η)', 'P_out / P_in, between 0 and 1. The rest is lost as heat.'],
      ]
    }),
    q.num('E', 'Exam-style: a 2 kW kettle heats 1.5 kg of water from 20 °C to 100 °C. Take c = 4200 J/(kg·°C) and ignore losses. Energy required, in **joules**?', 504000, 'Q = m·c·ΔT = 1.5 × 4200 × 80 = 504,000 J.', { unit: 'J', tol: 500 }),
    q.num('E', 'Exam-style: a 2 kW kettle heats 1.5 kg of water from 20 °C to 100 °C (c = 4200 J/(kg·°C), no losses). Time taken, in **seconds**?', 252, 'Energy 1.5 × 4200 × 80 = 504,000 J. t = E/P = 504,000 / 2000 = 252 s, about 4 minutes.', { unit: 's', tol: 1 }),
    q.num('E', 'A current of 2 A flows through a 10 Ω resistor for 5 minutes. Heat produced, in **joules**?', 12000, 'P = I²R = 4 × 10 = 40 W. E = 40 W × 300 s = 12,000 J.', { unit: 'J' }),
    q.num('E', 'A phone battery is rated 3.7 V, 2000 mAh. Energy stored, in **watt-hours**?', 7.4, '3.7 V × 2 Ah = 7.4 Wh (= 26,640 J).', { unit: 'Wh', tol: 0.05 }),
    q.num('E', 'A phone battery stores 7.4 Wh. A load draws a steady 0.5 W. Run time in **hours**?', 14.8, 't = E/P = 7.4 Wh / 0.5 W = 14.8 h.', { unit: 'h', tol: 0.1 }),
    q.num('E', 'Exam-style: a 12 V car battery is rated 40 Ah. A lamp drawing 2 A is left on. Hours until the battery is flat (ignore voltage droop)?', 20, 'Capacity in Ah divided by current: 40 Ah / 2 A = 20 h. The energy delivered is 12 V × 40 Ah = 480 Wh = 1.728 MJ.', { unit: 'h' }),
    q.num('E', 'A 12 V car battery rated 40 Ah is fully discharged. Total energy it delivered, in **megajoules**?', 1.728, '12 V × 40 Ah = 480 Wh; 480 × 3600 = 1,728,000 J = 1.728 MJ.', { unit: 'MJ', tol: 0.01 }),
    q.num('E', 'A motor draws 460 W from the supply and is 80 % efficient. Mechanical output power in **watts**?', 368, 'P_out = η × P_in = 0.8 × 460 = 368 W. The remaining 92 W becomes heat in the windings and bearings.', { unit: 'W' }),
    q.mc('E', 'Why is a battery\'s Ah (ampere-hour) rating not, by itself, a statement of stored energy?', ['Ah is charge (current × time); energy is charge × voltage, so the same 2 Ah is 7.4 Wh at 3.7 V but 24 Wh at 12 V', 'Because Ah is a power unit', 'Because batteries lose charge over time', 'It is: 1 Ah is always 1 Wh'], 0, 'Each coulomb carries V joules (Day 1: volt = joule per coulomb). Multiply the charge by the voltage to get energy.'),
    q.mc('E', 'A power supply is 90 % efficient and delivers 45 W to its load. Where do the other 5 W go?', ['Into heat inside the supply, absorbed by its own components', 'They are stored for later', 'They return to the mains', 'Nowhere; efficiency does not involve power'], 0, 'P_in = 45/0.9 = 50 W. The 5 W difference is dissipated in the converter, which is why supplies have heatsinks and vents.'),
    ...genius(q, 2),
  ]
};
