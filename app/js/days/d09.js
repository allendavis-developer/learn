import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(9);

export default {
  title: 'Saturation, bytes & endianness, factorials, complex numbers',
  emoji: '🧮',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Week 2, day 2. **Hardware** (H01 L3): what an accumulator is, why its sum must eventually leave the range, the two honest policies at the limit (wrap and saturate), why the choice is a *contract* and not an implementation detail, how a saturating adder is built (one bit wider, then a mux), the sticky flag, and a cycle-level Python model tested at widths 1, 4, 8 and 17. **Code** (S01 L2 / H09 L1): why a multi-byte number needs an agreed byte order, base-256 place value, big- vs little-endian, `struct` format strings, why native unpacking is wrong for a wire format, and the 16-byte educational message. **Maths** (M01): the product rule for counting, n! and the falling product, 0! = 1, how fast factorials grow (and when they overflow 32 and 64 bits), circular arrangements and "must sit together" problems. **Degree** (E02 L1): why i exists (a quarter-turn), rectangular form and the conjugate, polar form and why multiplication is "scale and rotate", Euler\'s e^(iθ), and the road to phasors.',
  takeaway: 'Wrap teleports across the number line; saturate sticks at the limit — and which one you get is part of the **contract**, because 0x7F means "127" under wrap and "at least 127" under saturate. Network order is big-endian: first byte is most significant, so `01 02` = 258; always say the byte order (`>`), never leave it native. n! counts orderings because each slot multiplies the choices; 0! = 1. A complex number is an arrow; multiplying by r∠θ **scales by r and rotates by θ**, which is why polar form (and e^(iθ)) makes multiplication easy.',
  steps: [
    // =====================================================================================================
    // HARDWARE: the saturating accumulator, and why the policy is a contract (H01 L3)
    // =====================================================================================================
    q.info('H', 'An accumulator, and why its sum must leave the range', `An **accumulator** is the simplest stateful arithmetic block there is: a register whose next value is its current value plus the input, **acc ← acc + x**, one addition per clock cycle. A running total of shares bought and sold (a *position*), the integrator in a digital filter, a checksum over a packet, the "total so far" in any counter: all accumulators.

Here is the problem the whole card is about. The register has a fixed **width** w, so it can only hold 2^w patterns: as a signed number, −2^(w−1) … 2^(w−1) − 1 (Day 2). The inputs keep arriving. Sooner or later the *true* sum is outside that range, and the hardware **must still produce some w-bit pattern**: a circuit cannot refuse, throw an exception or grow a bit. Every one of the 2^w patterns is a legal value, so whatever pattern comes out will be read as a number by the next block.

On Day 8 you learned how to *detect* that a signed addition overflowed (two operands of the same sign giving a result of the other sign). Today's question is what to **do** when it happens. There are exactly two honest answers, and they give different numbers for the same inputs, so the designer must choose one and *write the choice down*.`, {
      terms: [
        ['Accumulator', 'A register whose next value is its current value plus the input: acc ← acc + x, once per clock cycle.'],
        ['Position', 'A trading firm\'s running total of a thing bought minus sold. An accumulator whose overflow would be a financial disaster.'],
        ['Range', 'The set of values a width-w register can hold. Signed: −2^(w−1) … 2^(w−1) − 1; for w = 8 that is −128 … 127.'],
        ['Out of range', 'A true result that no pattern of the register can represent. The hardware must still output some pattern.'],
        ['Policy', 'The rule for what pattern comes out when the true result is out of range: wrap or saturate.'],
      ]
    }),
    q.info('H', 'Wrap: keep the low w bits (cheap, and sometimes exactly right)', `**Wrap** means: compute the true sum, keep only its low w bits, throw the rest away. Mathematically the result is the true sum **modulo 2^w**, then read as signed. It costs *nothing*: an ordinary w-bit adder does this by itself, because the carry out of the top bit simply falls off the end. That is why wrap is the default in every HDL and in C.

Trace it in signed 8-bit: 100 + 50 = 150. The pattern of 150 is \`10010110\`; read as signed (MSB weight −128) that is −128 + 22 = **−106**. The value "teleported" from the top of the number line to the bottom. In the widget below, switch to WRAP and press +60 then +50 to watch it happen.

When is wrap **right**? Whenever the quantity is *meant* to be cyclic. A clock-cycle counter, a sequence number, a ring-buffer index, a hash: these are supposed to roll round. There is even a bonus: with wrap arithmetic, \`now − then\` gives the correct elapsed count *even across the wrap point*, as long as the true difference fits in the width, because subtraction modulo 2^w undoes addition modulo 2^w.

When is wrap a **disaster**? Whenever the value has a *meaning* that is not cyclic. A position of 100 shares that receives +50 and shows **−106** looks like a short position. A risk check that asks "is the position above the 120-share limit?" answers *no*, and the order that should have been blocked goes through. The check did not fail loudly; it failed silently, in the direction that lets a bad thing happen.`, {
      terms: [
        ['Wrap (modulo arithmetic)', 'Keep only the low w bits of the true result. 150 in signed 8-bit becomes −106 (150 − 256).'],
        ['Modulo 2^w', 'The remainder after dividing by 2^w: exactly what dropping all bits above bit w−1 computes.'],
        ['Carry out', 'The bit that leaves the top of an adder. Wrap simply ignores it.'],
        ['Cyclic quantity', 'Something that is meant to roll round: a sequence number, a ring-buffer index, a clock counter. Wrap is correct for these.'],
        ['Silent failure', 'A wrong answer that looks like a valid one. The worst kind, because nothing downstream can tell.'],
      ],
      widget: W('accum', { width: 8, adds: [60, 50, -100, 10] })
    }),
    q.info('H', 'Saturate: clamp at the limit, and what a risk check must do there', `**Saturate** means: if the true sum is above the maximum, output the **maximum**; if below the minimum, output the **minimum**; otherwise output the true sum. In signed 8-bit, 100 + 50 = 150 > 127, so the output is **127**. The value "sticks" at the edge instead of teleporting.

Why is this the right policy for a limit check? Think about what the check must guarantee: **once the position is at or beyond the limit, no further buy may look acceptable.** With saturation, a position at 127 that receives +50 stays at 127: the comparison "position ≥ limit" keeps saying *yes* and keeps rejecting. The check **fails closed**. With wrap it would fail open. Saturation is also the standard policy in audio and signal processing, where a clipped peak is an audible but bounded error and a wrapped one is a full-scale screech.

Saturation is not free of consequences. **Information is lost at the edge**: after 127 + 50 → 127, subtracting 50 gives 77, not 127. The block no longer knows how far above the limit it "really" was. And a value of exactly 127 is now ambiguous: "127" or "at least 127"? A careful design adds a **sticky flag**: one extra bit that is set the first time saturation happens and stays set until reset, so the consumer can tell the two apart and raise an alarm.

That ambiguity is precisely why the handbook says **rounding and saturation are part of the interface contract**. The consumer of the output must know which policy produced it, because the same pattern \`01111111\` means different things under the two policies. "It is an implementation detail" is the sentence that lets a wrapped position pass a risk check.`, {
      terms: [
        ['Saturate (clamp)', 'If the true result exceeds the max, output the max; below the min, output the min; otherwise the true result.'],
        ['Fail closed / fail open', 'When something goes wrong, a fail-closed check keeps rejecting; a fail-open check lets things through. Limits must fail closed.'],
        ['Sticky flag', 'A one-bit register set the first time saturation occurs and cleared only by reset. Tells the consumer that "127" means "at least 127".'],
        ['Interface contract', 'The written agreement between two blocks: widths, signedness, scale, rounding, saturation, timing. Nothing in it is an implementation detail.'],
        ['Clipping', 'Saturation in audio/DSP: the waveform is flattened at the limit rather than wrapped into a screech.'],
      ]
    }),
    q.info('H', 'Building it: one bit wider, then a mux; and how to test it', `A saturating adder is built from things you already own. Day 6 (carry chains) and Day 8 (signed overflow) showed that adding two w-bit signed numbers can need **w + 1** bits. So:

1. **Sign-extend** both operands to w + 1 bits (Day 5) and add them with a (w + 1)-bit adder. The true sum now always fits: nothing has wrapped yet.
2. **Compare** the true sum with MAX = 2^(w−1) − 1 and MIN = −2^(w−1). Two comparators.
3. **Select** with a mux (Day 4): if sum > MAX pick MAX; else if sum < MIN pick MIN; else pick the low w bits of the sum.
4. Register the selected value; optionally set the sticky flag if either comparator fired.

Cost: one extra adder bit, two comparators, a mux. Cheap; the point is that the *true* sum exists somewhere in the circuit before anything is thrown away. (Day 8's overflow test, "same input signs, different output sign", detects the same event without the extra bit, and a mux on the sign of the operands then picks MAX or MIN.)

**Testing** is where the handbook is strict (H01 L3): test at widths **1, 4, 8 and 17**, and at every width test inputs *exactly below, at and above* each limit. Width 1 is a real edge: a 1-bit signed register holds only −1 and 0, so adding +1 to 0 saturates immediately. Width 17 catches code that quietly assumed a byte or a 16-bit word. The code exercise below is that model.`, {
      terms: [
        ['Sign extension', 'Copying the sign bit into new upper bits so a w-bit signed value keeps its value at w + 1 bits (Day 5).'],
        ['Comparator', 'A block whose output is 1 when a > b (or a ≥ b). Two of them find "above MAX" and "below MIN".'],
        ['Mux (multiplexer)', 'A selector: the select input chooses which of several inputs reaches the output (Day 4).'],
        ['Boundary test', 'Inputs exactly below, at and above a limit. Off-by-one bugs live exactly there.'],
        ['Width-1 register', 'Signed range −1 … 0. A legal width that breaks any code assuming "at least a byte".'],
      ]
    }),
    q.goal('H', 'In the 8-bit signed simulation (range −128 … 127, mode SATURATE), start from 0 and keep pressing +60 and +50 until the accumulator shows exactly **127**.', W('accum', { width: 8, adds: [60, 50, -100, 10] }), s => s.acc === 127,
      '+60 → 60, +50 → 110, then +50 gives a true sum of 160 > 127, so the output clamps at 127 (the dot turns red at the edge). In WRAP mode the same sequence would show −96.'),
    q.num('H', 'A signed 8-bit accumulator (range −128 … 127) holds 100 and receives +50 with the **saturate** policy. What does it show?', 127, 'True sum 150 > 127, so the output is clamped to the maximum, 127.'),
    q.num('H', 'A signed 8-bit accumulator (range −128 … 127) holds 100 and receives +50 with the **wrap** policy. What does it show?', -106, 'True sum 150; keep the low 8 bits: pattern 10010110. Read as signed: −128 + 16 + 4 + 2 = −106. Equivalently 150 − 256 = −106.'),
    q.num('H', 'A signed 8-bit accumulator (range −128 … 127) holds −100 and receives −50 with the **saturate** policy. What does it show?', -128, 'True sum −150 < −128, so it clamps at the minimum, −128.'),
    q.num('H', 'A signed 8-bit accumulator (range −128 … 127) holds −100 and receives −50 with the **wrap** policy. What does it show?', 106, 'True sum −150. Add 256 to bring it into range: −150 + 256 = 106. The pattern is 01101010. A large negative teleported to a large positive.'),
    q.mc('H', 'A signed 8-bit **saturating** accumulator sits at 127 and receives −100. What does it show?', ['27', '127', '−100', '−128'], 0, 'Saturation only clamps when the true result is out of range. 127 − 100 = 27 is in range, so 27 is output. Note the loss: if the value had "really" been 200 before clamping, subtracting 100 should give 100, but the block only knew 127.', { grid: true }),
    q.num('H', 'A signed 8-bit saturating accumulator (range −128 … 127) starts at 127, receives +50, then receives −50. What does it show at the end?', 77, '127 + 50 = 177 → clamps to 127 (the excess 50 is lost forever). Then 127 − 50 = 77. Saturation is not reversible: the block cannot remember how far past the limit it was.'),
    q.num('H', 'A signed **4-bit** saturating accumulator (range −8 … 7) holds 5 and receives +4. What does it show?', 7, 'True sum 9 > 7, clamp to 7. Four bits signed: patterns 0000 … 0111 are 0 … 7 and 1000 … 1111 are −8 … −1.'),
    q.num('H', 'An **unsigned** 8-bit saturating accumulator (range 0 … 255) holds 250 and receives +10. What does it show?', 255, 'True sum 260 > 255 → 255. Unsigned saturation clamps at 0 below and 2^w − 1 above.'),
    q.tf('H', 'Whether an accumulator block wraps or saturates is an implementation detail that the block consuming its output does not need to know.', false, 'It changes the meaning of every output value near the limit: 01111111 means "127" under wrap and "127 or more" under saturate. The handbook: rounding and saturation are part of the interface contract.'),
    q.mc('H', 'A risk check keeps a position in a signed 8-bit register with the **wrap** policy and rejects buys when position ≥ 120. The position is 100 and a buy of 50 arrives. What happens, and why is it dangerous?', ['The register shows −106 after the buy, so the next check sees a value far below 120 and lets further buys through: the check failed open', 'The register shows 127 and every later buy is rejected', 'The adder raises an exception and the system halts', 'Nothing dangerous: 150 is stored correctly'], 0, '150 wraps to −106. A check comparing against 120 now believes the position is short. Wrap makes a limit check fail in the direction that lets bad orders through; saturation makes it fail closed.'),
    q.mc('H', 'Which of these correctly builds a saturating adder for two w-bit signed inputs?', ['Sign-extend both to w + 1 bits, add so the true sum cannot wrap, compare it with MAX and MIN, and mux between MAX, MIN and the sum', 'Add in w bits and, if the carry out is 1, replace the result with MAX', 'Add in w bits and replace any negative result with MAX', 'Use a w-bit adder and rely on the consumer to notice the wrap'], 0, 'The true sum must exist somewhere before anything is discarded: one extra bit guarantees that. Carry out alone does not detect signed overflow (Day 8), and a negative result is perfectly legal.'),
    q.order('H', 'Put the four steps of a saturating adder in the order the data flows through them.', ['sign-extend both operands to w + 1 bits and add', 'compare the true sum with MAX and MIN', 'mux: select MAX, MIN or the low w bits of the sum', 'register the selected value (and set the sticky flag if clamped)'], 'Widen, add, compare, select, store. The comparison must see the un-wrapped sum, so widening comes first.'),
    q.mc('H', 'Why would a designer add a one-bit **sticky saturation flag** to a saturating accumulator?', ['Because after clamping, an output of 127 is ambiguous ("127" or "at least 127"); the flag tells the consumer that information was lost so it can raise an alarm', 'To make the adder faster', 'To convert the result back to wrap mode', 'Because saturation is illegal without it'], 0, 'Saturation deliberately loses information at the edge. The flag records that it happened, and stays set until reset so a brief clamp cannot be missed.'),
    q.mc('H', 'A signed accumulator of width **1** (range −1 … 0) holds 0 and receives +1 under the saturate policy. Output?', ['0: the true sum 1 exceeds the maximum 0, so it clamps at 0', '1', '−1: it wraps', 'Width 1 is not a legal width'], 0, 'A 1-bit signed register has patterns 0 (value 0) and 1 (value −1). Its maximum is 0, so +1 saturates immediately. The handbook tests widths 1, 4, 8 and 17 precisely to catch code that assumed a byte.', { grid: true }),
    q.code('H', 'Build: write `solve(w, xs, mode)`, a cycle-level model of a **signed w-bit accumulator** that starts at 0 and adds the numbers in `xs` one per cycle. Return the list of register values after each add. `mode` is `"sat"` (clamp to −2^(w−1) … 2^(w−1) − 1) or `"wrap"` (keep the low w bits and read them as signed). It must work for any width from 1 upward, including 17, and a 50,000-input stream must run within the time budget.', {
      fn: 'solve',
      starter: 'def solve(w, xs, mode):\n    lo = -(2 ** (w - 1))\n    hi = 2 ** (w - 1) - 1\n    acc = 0\n    out = []\n    for x in xs:\n        t = acc + x          # the true sum, before any policy\n        if mode == "sat":\n            pass             # clamp t into lo..hi\n        else:\n            pass             # keep the low w bits of t and read them as signed\n        out.append(acc)\n    return out\n',
      tests: [
        { args: [8, [100, 50], 'sat'], expect: [100, 127] },
        { args: [8, [100, 50], 'wrap'], expect: [100, -106], name: 'the same inputs wrap to −106' },
        { args: [8, [], 'sat'], expect: [], name: 'no inputs: empty trace' },
        { args: [4, [5, 4, -20], 'sat'], expect: [5, 7, -8], name: 'width 4 clamps at 7 then at −8' },
        { args: [1, [1, 1, -1, -1, -1], 'sat'], expect: [0, 0, -1, -1, -1], name: 'width 1: range is −1 … 0' },
        { args: [1, [1, 1, -1], 'wrap'], expect: [-1, 0, -1], name: 'width 1 wrap: 0 + 1 → pattern 1 → −1' },
        { args: [17, [65535, 1, 1], 'sat'], expect: [65535, 65535, 65535], name: 'width 17: max is 65535' },
        { args: [17, [65535, 1], 'wrap'], expect: [65535, -65536], name: 'width 17 wrap teleports to −65536' },
        { args: [8, [127, 50, -50], 'sat'], expect: [127, 127, 77], name: 'saturation is not reversible' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        w = random.choice([1, 2, 3, 4, 8, 12, 17])\n        n = random.randint(1, 30)\n        big = 2 ** w\n        yield [w, [random.randint(-big, big) for _ in range(n)], random.choice(["sat", "wrap"])]',
      refCode: 'def ref(w, xs, mode):\n    lo, hi = -(1 << (w - 1)), (1 << (w - 1)) - 1\n    acc, out = 0, []\n    for x in xs:\n        t = acc + x\n        if mode == "sat":\n            acc = max(lo, min(hi, t))\n        else:\n            acc = ((t + (1 << (w - 1))) % (1 << w)) - (1 << (w - 1))\n        out.append(acc)\n    return out',
      speed: { gen: 'def gen():\n    return [8, [random.randint(-200, 200) for _ in range(50000)], "sat"]', budgetMs: 1500, label: '50,000 inputs, width 8' },
      solution: 'def solve(w, xs, mode):\n    lo = -(2 ** (w - 1))\n    hi = 2 ** (w - 1) - 1\n    acc = 0\n    out = []\n    for x in xs:\n        t = acc + x\n        if mode == "sat":\n            acc = max(lo, min(hi, t))\n        else:\n            acc = ((t - lo) % (2 ** w)) + lo\n        out.append(acc)\n    return out'
    }, 'Saturate is max(lo, min(hi, t)): two comparisons and a select, exactly the comparators-plus-mux of the hardware. Wrap is "reduce modulo 2^w into the signed window": (t − lo) % 2^w + lo shifts the window so that Python\'s always-non-negative remainder lands in lo … hi. Width 1 has lo = −1, hi = 0; width 17 has hi = 65535. The hidden checks use random widths including 1 and 17 and random policies, and the 50,000-input stream is one pass with constant work per input.'),

    // =====================================================================================================
    // CODE: bytes on the wire, byte order, struct (S01 L2, H09 L1)
    // =====================================================================================================
    q.info('S', 'Why a number needs an agreed byte order', `Memory and network wires deliver data **one byte at a time**, in address order or arrival order. A **byte** is 8 bits, values 0 … 255, two hex digits (Day 1). A number bigger than 255 needs several bytes, and that creates a question that a single byte never raised: the number's digits are ordered by **significance** (most significant first when we write 258 as 0x0102), while the bytes are ordered by **position** (first, second). Which byte holds which digit?

Two answers exist, and both are in daily use:

- **Big-endian**: the *most* significant byte comes first, so 258 = 0x0102 is sent as \`01 02\`. This reads like a written number, left to right.
- **Little-endian**: the *least* significant byte comes first, so 258 is stored as \`02 01\`. The x86 processor in your laptop stores every integer this way in memory.

Why would anyone choose little-endian? Because in memory it has a real convenience: the low byte of a 16-bit, 32-bit or 64-bit value sits at the **same address**, so a CPU can read "the low 8 bits" of a value without adjusting the address, and can widen a value in place by appending bytes. Intel chose it in the 1970s and it stuck.

Why do networks use big-endian? Because a wire format is read by *many different machines*, and the format must define an order that does not depend on any of them. The Internet standards picked most-significant-first and called it **network byte order**. Whether it is the "better" order is beside the point: what matters is that **the format defines it and every decoder obeys it**. The same two bytes \`01 02\` mean 258 to a big-endian reader and 513 to a little-endian one; nothing in the bytes tells you which. Only the specification does.`, {
      terms: [
        ['Byte', '8 bits: two hex digits, values 0 … 255. The unit in which memory and networks move data.'],
        ['Endianness (byte order)', 'Which end of a multi-byte number comes first: the big end (most significant byte) or the little end.'],
        ['Big-endian / network byte order', 'Most significant byte first. Defined by the Internet standards for IP, UDP and most binary protocols, and by this course\'s message.'],
        ['Little-endian', 'Least significant byte first. What x86 CPUs use in memory. Convenient for hardware, wrong for a network-defined format.'],
        ['Wire format', 'A byte layout defined by a specification so that any machine can produce or read it identically.'],
      ]
    }),
    q.info('S', 'Reading a big-endian field: place value in base 256', `Decoding bytes is Day 1's place value with a bigger base. In binary each new bit doubles what you have and adds itself; in bytes each new byte **multiplies what you have by 256** and adds itself, because a byte holds 256 patterns:

\`\`\`
value = 0
for b in [0x00, 0x00, 0x27, 0x10]:   # big-endian: first byte is most significant
    value = value * 256 + b          # 0 → 0 → 0x27 = 39 → 39*256 + 16 = 10000
\`\`\`

So \`00 00 27 10\` is 0x00002710 = **10,000**. Written as weights: 0×256³ + 0×256² + 39×256 + 16. Multiplying by 256 is the same as shifting left by 8 bits, so hardware and C people write \`(value << 8) | b\`.

For **little-endian** you read the bytes in reverse order (or weight them 256⁰, 256¹, 256² … in arrival order). The bytes \`10 27 00 00\` little-endian are also 10,000; the bytes \`00 00 27 10\` read little-endian would be 0x10270000 = 270,794,752, a nonsense price.

**Signed fields** work the same way, then apply two's complement to the whole assembled value (Day 2): two bytes \`FF FE\` assemble to 65534, which as a 16-bit signed value is 65534 − 65536 = **−2**. Python's \`int.from_bytes(bs, "big", signed=True)\` does exactly this, and \`n.to_bytes(4, "big")\` goes the other way; today's code exercise is the loop behind them.`, {
      terms: [
        ['Base 256', 'Each byte is a digit worth 0 … 255; each position to the left is worth 256 times more.'],
        ['Shift left by 8', 'Multiply by 256: value << 8. Makes room for the next byte in the low position.'],
        ['int.from_bytes / to_bytes', 'Python\'s built-ins for byte-string ↔ integer; both take the byte order and a signed flag.'],
        ['Hex dump', 'Bytes printed two hex digits each in arrival order: 00 00 27 10. Read big-endian fields left to right.'],
      ]
    }),
    q.info('S', 'struct: describing a byte layout in one string', `Python's \`struct\` module packs and unpacks fixed binary layouts from a **format string**. The first character sets the byte order and the rest name the fields:

| code | meaning | bytes |
|---|---|---|
| \`>\` | big-endian, no padding | prefix |
| \`<\` | little-endian, no padding | prefix |
| \`!\` | network order (same as \`>\`) | prefix |
| \`B\` / \`b\` | unsigned / signed 8-bit | 1 |
| \`H\` / \`h\` | unsigned / signed 16-bit | 2 |
| \`I\` / \`i\` | unsigned / signed 32-bit | 4 |
| \`Q\` / \`q\` | unsigned / signed 64-bit | 8 |

\`struct.unpack('>I', bytes([0, 0, 0x27, 0x10]))\` gives \`(10000,)\` (a tuple, even for one field). \`struct.calcsize('>BBBBIHIH')\` is 1+1+1+1+4+2+4+2 = **16**. And \`unpack\` refuses (raises \`struct.error\`) if the byte string is not *exactly* the size the format needs: a free check against truncated input, which Day 10 uses.

**Why a bare format (\`'I'\`, no prefix) is wrong for a wire format.** With no prefix, struct uses the *native* rules of the machine running the code: its byte order **and** its alignment padding. Two things then go wrong. On a little-endian machine \`'I'\` reads \`00 00 27 10\` as 270,794,752 instead of 10,000. And native mode inserts padding bytes so fields sit on "natural" boundaries: \`calcsize('BI')\` is 8 on x86 but \`calcsize('>BI')\` is 5. So the same code parses the same bytes into **different numbers, and even a different message length**, depending on which machine it runs on. A format defined on the wire has one meaning; the decoder must state the order explicitly so every machine agrees.`, {
      terms: [
        ['Format string', 'struct\'s mini-language: an order prefix, then one letter per field.'],
        ['Native order/alignment', 'What a bare format string (no prefix) uses: the running machine\'s byte order plus padding. Machine-dependent, so never for wire formats.'],
        ['Padding (alignment)', 'Unused bytes a CPU likes between fields so each starts at a multiple of its size. Native struct inserts them; > and < never do.'],
        ['struct.error', 'The error unpack raises when the data length does not match the format exactly.'],
        ['Tuple', 'What unpack returns: a fixed sequence of the decoded fields, even when there is only one.'],
      ]
    }),
    q.info('S', 'The 16-byte educational quote message', `The handbook's flagship projects exchange one fixed-size message. Every field is big-endian and the total is exactly 16 bytes, so the format string is \`'>BBBBIHIH'\`:

| offset | size | field | rule |
|---|---|---|---|
| 0 | 1 | version | must be 1 |
| 1 | 1 | opcode | 1 = replace quote, 2 = delete |
| 2 | 1 | side | 0 = bid, 1 = ask |
| 3 | 1 | reserved | must be 0 |
| 4 | 4 | sequence | message counter |
| 8 | 2 | symbol | instrument id |
| 10 | 4 | price (ticks) | integer price |
| 14 | 2 | quantity | 0 only for a delete |

Fixed size is a deliberate simplification: a receiver can cut a byte stream into messages by counting 16, with no length field to trust. The **reserved** byte exists so a future version can add a field without changing the size; a sender must set it to 0 and a receiver must check it, otherwise the first "future" message would be misread by old code. Tap the fields below, then switch the widget to little-endian and watch every multi-byte field turn into nonsense: that is what a machine-dependent decoder would see.`, {
      terms: [
        ['Offset', 'The index of a field\'s first byte, counting from 0.'],
        ['Fixed-size message', 'Every message has the same length, so framing (finding message boundaries in a stream) is trivial.'],
        ['Reserved field', 'A field with no meaning yet, which must be zero. Lets a format grow without breaking old readers.'],
        ['Ticks', 'Prices sent as whole numbers of a small unit, so no floating point is needed on the wire.'],
      ],
      widget: W('bytes', {
        title: 'The 16-byte educational quote message',
        bytes: [0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0x2A, 0x00, 0x00, 0x27, 0x10, 0x00, 0x64],
        fields: [
          { name: 'version', off: 0, len: 1, note: 'must be 1' }, { name: 'opcode', off: 1, len: 1, note: '1 = replace quote, 2 = delete' }, { name: 'side', off: 2, len: 1, note: '0 = bid, 1 = ask' },
          { name: 'reserved', off: 3, len: 1, note: 'must be zero' }, { name: 'sequence', off: 4, len: 4 }, { name: 'symbol', off: 8, len: 2 }, { name: 'price (ticks)', off: 10, len: 4 }, { name: 'quantity', off: 14, len: 2 }]
      })
    }),
    q.goal('S', 'In the message widget (bytes `01 01 00 00 00 00 00 07 00 2A 00 00 27 10 00 64`), tap the **version** field (byte 0) so the widget decodes it.', W('bytes', {
      title: 'The 16-byte educational quote message',
      bytes: [0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0x2A, 0x00, 0x00, 0x27, 0x10, 0x00, 0x64],
      fields: [
        { name: 'version', off: 0, len: 1, note: 'must be 1' }, { name: 'opcode', off: 1, len: 1, note: '1 = replace quote, 2 = delete' }, { name: 'side', off: 2, len: 1, note: '0 = bid, 1 = ask' },
        { name: 'reserved', off: 3, len: 1, note: 'must be zero' }, { name: 'sequence', off: 4, len: 4 }, { name: 'symbol', off: 8, len: 2 }, { name: 'price (ticks)', off: 10, len: 4 }, { name: 'quantity', off: 14, len: 2 }]
    }), s => s.sel === 0, 'Byte 0 is 0x01: version 1, the only legal value. A one-byte field has no byte-order question at all; order only matters from two bytes upward.'),
    q.num('S', 'The two bytes `01 02` arrive on a network link. Read as a 16-bit **big-endian** unsigned value, what number are they?', 258, 'First byte is most significant: 1 × 256 + 2 = 258 (0x0102).'),
    q.num('S', 'The two bytes `0A 00` are read as a 16-bit **little-endian** unsigned value. What number is that? (Big-endian would give 2560.)', 10, 'Little-endian: the first byte is the least significant: 0x0A × 1 + 0x00 × 256 = 10. Big-endian: 0x0A00 = 2560. Same bytes, two numbers; only the specification decides.'),
    q.num('S', 'The two bytes `00 2A` are read as a 16-bit big-endian unsigned value. What number is that?', 42, '0 × 256 + 0x2A = 42.'),
    q.num('S', 'In the 16-byte message `01 01 00 00 00 00 00 07 00 2A 00 00 27 10 00 64`, the price field is bytes 10–13 (`00 00 27 10`), big-endian. What is the price in ticks?', 10000, '0x00002710: 0×256³ + 0×256² + 39×256 + 16 = 9984 + 16 = 10,000.'),
    q.num('S', 'The four bytes `10 27 00 00` are read as a 32-bit **little-endian** unsigned value. What number is that?', 10000, 'Little-endian: 0x10 + 0x27×256 + 0 + 0 = 16 + 9984 = 10,000. (The same bytes big-endian would be 0x10270000 = 270,794,752.)'),
    q.text('S', 'Write the value **1000** as two big-endian bytes in hex, separated by a space (e.g. `01 02`).', ['03 E8'], '1000 = 3 × 256 + 232 = 0x03E8. Big-endian sends the most significant byte first: 03 then E8.', { mono: true, accept: ['^0?3\\s*e8$'] }),
    q.mc('S', "In Python's `struct`, which format string reads a **big-endian unsigned 32-bit** integer?", ["'>I'", "'<I'", "'I'", "'>i'"], 0, "'>' means big-endian, 'I' means unsigned 4 bytes. Lower-case 'i' is signed; '<' is little-endian; a bare 'I' uses the machine's native order and padding, which is wrong for a wire format.", { grid: true }),
    q.mc('S', 'Why is a **native-endian** unpack (a bare format such as `\'I\'`) wrong for decoding a message whose layout is defined by a network specification?', ['The result would depend on the machine running the decoder: byte order and padding both change, so the same bytes give different numbers and even a different message size', 'It is slower than big-endian', 'Python does not support native unpacking', 'Network bytes are always little-endian, so native is only wrong on big-endian machines'], 0, 'A wire format has one defined meaning. The decoder must state the order explicitly (\'>\' or \'!\') so that every machine reads the same bytes as the same numbers.'),
    q.num('S', 'What does `struct.calcsize(\'>BBBBIHIH\')` return?', 16, 'B = 1 byte ×4 = 4, I = 4, H = 2, I = 4, H = 2: 4 + 4 + 2 + 4 + 2 = 16. No padding because of the \'>\' prefix.'),
    q.mc('S', 'On an x86 machine, `struct.calcsize(\'BI\')` gives 8 but `struct.calcsize(\'>BI\')` gives 5. Why?', ['With no prefix, struct uses native alignment and inserts 3 padding bytes so the 4-byte field starts at a multiple of 4; \'>\' disables padding', 'Big-endian integers are shorter', '\'>\' drops the B field', 'The native version counts bits, not bytes'], 0, 'Native mode mimics a C struct, which pads fields to their natural alignment. A wire format never has such padding, which is another reason a bare format string is wrong.'),
    q.num('S', 'The four bytes `FF FF FF FF` are decoded with `struct.unpack(\'>i\', …)` (big-endian **signed** 32-bit). What value results?', -1, 'All-ones assembles to 4,294,967,295 unsigned; as a signed 32-bit two\'s complement value that is 4,294,967,295 − 2³² = −1. With \'>I\' (unsigned) it would be 4,294,967,295.'),
    q.num('S', 'The two bytes `FF FE` are decoded as a big-endian **signed** 16-bit value. What value results?', -2, 'Assemble: 255 × 256 + 254 = 65534. Signed 16-bit: 65534 − 65536 = −2.'),
    q.mc('S', 'A 12-byte string is passed to `struct.unpack(\'>BBBBIHIH\', data)`, whose format needs 16 bytes. What happens?', ['It raises struct.error, because unpack requires exactly the format\'s size: a free guard against truncated messages', 'It pads the missing bytes with zeros', 'It returns the first three fields only', 'It returns None'], 0, 'unpack is strict about length. Day 10 builds a parser that checks the length itself first so it can return a named reason instead of letting the error escape.'),
    q.code('S', 'Write `solve(bs, signed)`: decode a list of byte values (each 0–255) as a **big-endian** integer. If `signed` is `False` the result is unsigned; if `True`, interpret the assembled value as two\'s complement of width 8 × len(bs) (so `[0xFF, 0xFF]` is −1). An empty list decodes to 0. Use the multiply-by-256 loop, not `int.from_bytes`; the hidden random cases go up to 8 bytes.', {
      fn: 'solve',
      starter: 'def solve(bs, signed):\n    value = 0\n    for b in bs:\n        # shift what we have so far up by one byte, then add b\n        pass\n    if signed:\n        pass   # if the top bit of the assembled value is set, subtract 2**(8*len(bs))\n    return value\n',
      tests: [
        { args: [[1, 2], false], expect: 258 },
        { args: [[0, 0, 0x27, 0x10], false], expect: 10000, name: 'the price field 00 00 27 10' },
        { args: [[], false], expect: 0, name: 'empty → 0' },
        { args: [[0xFF, 0xFF], false], expect: 65535, name: 'all-ones unsigned' },
        { args: [[0xFF, 0xFF], true], expect: -1, name: 'all-ones signed = −1' },
        { args: [[2, 1], false], expect: 513, name: 'order matters: 02 01 is 513 (little-endian would say 258)' },
        { args: [[0xF6], true], expect: -10, name: 'one byte 11110110 signed = −10 (Day 1 pattern)' },
        { args: [[0x80, 0], true], expect: -32768, name: 'most negative 16-bit' },
        { args: [[0x7F, 0xFF], true], expect: 32767, name: 'top bit clear: positive' },
        { args: [[0xFF, 0xFE], true], expect: -2, name: 'FF FE signed = −2' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(1, 8)\n        yield [[random.randint(0, 255) for _ in range(n)], random.random() < 0.5]',
      refCode: 'def ref(bs, signed):\n    return int.from_bytes(bytes(bs), "big", signed=signed) if bs else 0',
      solution: 'def solve(bs, signed):\n    value = 0\n    for b in bs:\n        value = value * 256 + b\n    if signed and bs and value >= 2 ** (8 * len(bs) - 1):\n        value -= 2 ** (8 * len(bs))\n    return value'
    }, 'value = value × 256 + b is place value in base 256: the first byte ends up multiplied by 256^(n−1). For signed, the assembled pattern is two\'s complement (Day 2): if it is at or above 2^(bits−1) the top bit is set, so subtract 2^bits. The library call int.from_bytes(bytes(bs), "big", signed=…) does exactly this and is what you use in real code; the loop is so you own the arithmetic.'),

    // =====================================================================================================
    // MATHS: counting orderings (M01)
    // =====================================================================================================
    q.info('M', 'Counting by multiplying: the product rule for choices', `Day 8 gave you the product rule for *probabilities* of independent events. Counting has its own product rule, and it is the engine behind everything today.

**If a task is done in stages, with a choices at stage 1 and, whatever you chose there, b choices at stage 2, then the task can be done in a × b ways.** Picture a grid: a rows (first choice) by b columns (second choice); every cell is one complete outcome and there are a·b cells. Three shirts and two pairs of trousers: 3 × 2 = 6 outfits. A 4-digit PIN with digits 0–9: 10 × 10 × 10 × 10 = 10⁴ = 10,000 (repeats allowed, so each stage has all 10).

The condition that people forget: the **number** of options at stage 2 must be the same whichever option was picked at stage 1 (the options themselves may differ). "Choose a starter, then a main that is not the same colour as the starter" breaks the rule if some starters rule out more mains than others; then you must split into cases and add. The Day 1 rule "describe outcomes finely enough that they are equally likely, then count" has a counting twin: **describe the task as stages with a fixed number of options each, then multiply.**`, {
      terms: [
        ['Product rule (counting)', 'Stages with a, then b, then c options (fixed counts) give a × b × c outcomes in total.'],
        ['Stage', 'One decision in building an outcome. A PIN is four stages of ten options.'],
        ['With repetition', 'The same symbol may be used again at a later stage, so every stage keeps all its options: 10⁴ PINs.'],
        ['Case split', 'When the number of later options depends on the earlier choice, count each case separately and add.'],
      ]
    }),
    q.info('M', 'Arrangements without repeats: n! and the falling product', `Now forbid repeats. How many ways can you line up the four letters A, B, C, D? Fill the slots left to right. The first slot has 4 options. Whichever letter you used, the second slot has **3** left (a fixed *count*, so the product rule applies), the third has 2, the last has 1: 4 × 3 × 2 × 1 = **24**. That product is written **4!** ("four factorial"). In general **n! = n × (n − 1) × … × 2 × 1** counts the orderings (**permutations**) of n distinct things, and the reason is nothing more than "each slot multiplies by the number of options left".

If you only fill **k** of the slots (gold, silver and bronze from 6 runners), the product stops early: 6 × 5 × 4 = **120**, a **falling product** of k factors. There is a tidy formula for it: 6 × 5 × 4 = 6!/3!, because 6! = (6 × 5 × 4) × (3 × 2 × 1) and dividing by 3! removes the unused tail. In general the number of ordered selections of k from n is **n!/(n − k)!**. Use the falling product when you compute; use the fraction when you prove.

Try it below: pick a symbol for each slot and watch the count of options shrink by one each time.`, {
      terms: [
        ['Permutation', 'An ordering of distinct items. n items have n! orderings.'],
        ['Factorial n!', 'n × (n − 1) × … × 1. 4! = 24, 5! = 120, 6! = 720, 10! = 3,628,800.'],
        ['Falling product', 'n × (n − 1) × … × (n − k + 1): k factors, counting ordered selections of k from n. Equals n!/(n − k)!.'],
        ['Without repetition', 'Each item may be used once, so every stage has one fewer option than the last.'],
      ],
      widget: W('perms', { items: ['A', 'B', 'C', 'D'], k: 4 })
    }),
    q.info('M', '0! = 1, and how fast factorials grow', `**Why 0! = 1.** Two reasons that agree. Counting: there is exactly one way to arrange nothing (do nothing), so the empty arrangement counts once. Algebra: n! = n × (n − 1)! for every n ≥ 1, so 1! = 1 × 0!, which forces 0! = 1. The definition is what keeps formulas such as n!/(k!(n − k)!) (Day 10) working at the edges instead of needing special cases.

**How fast.** 5! = 120, 10! = 3,628,800, 12! = 479,001,600, 13! = 6,227,020,800. Because each factor is at most n, n! ≤ nⁿ; but the top half of the factors are all at least n/2, so n! ≥ (n/2)^(n/2). Both bounds are exponential-or-worse: factorials outgrow every power of n and every 2ⁿ.

This has consequences you will meet in the hardware and code strands. **13! exceeds 2³² = 4,294,967,296**, so a 32-bit unsigned counter of "all orderings of 13 items" wraps (Day 9 hardware: silently). **21! ≈ 5.1 × 10¹⁹ exceeds 2⁶³**, so even a signed 64-bit integer overflows at 21!; Python's ints grow without limit (Day 1), which is one reason Python is used for reference models. And exhaustive testing over all orderings (H01 L3's "exhaustively where practical") is practical for 8 items (40,320 cases) and hopeless for 20.`, {
      terms: [
        ['0! = 1', 'One way to arrange nothing. Forced by n! = n × (n − 1)! at n = 1, and needed so counting formulas work at the edges.'],
        ['Growth of n!', 'Faster than any exponential: 10! ≈ 3.6 million, 13! > 2³², 21! > 2⁶³.'],
        ['Exhaustive test', 'Trying every case. Feasible when the count (often a factorial) is small enough to enumerate.'],
      ]
    }),
    q.info('M', 'Circles, blocks and "not first": three classic arrangements', `Interview counting questions are ordinary permutations with one twist each. The trick is to turn each twist back into a plain product.

**Round a table.** Seat 5 people at a circular table where only *who sits next to whom* matters (rotating everybody one seat is the same seating). Count the 5! = 120 line-ups; each circular seating appears **5 times** (once per rotation), so there are 120/5 = **24 = 4!** seatings. Equivalent view: sit one person anywhere to kill the rotation, then arrange the other four: 4!. In general **(n − 1)!**.

**Must be together.** 6 people in a row, A and B adjacent: glue A and B into one **block**. Now there are 5 objects to arrange (5!), and the block can be AB or BA (×2): 2 × 5! = **240**.

**Must not be first.** 5 people in a row, A not at the front: count everything (5! = 120), subtract the bad ones where A *is* first (4! = 24): **96**. This is the complement rule from Day 2, used for counting.

**A before B.** 5 letters in a row; how many have A somewhere before B? Pair every arrangement with the one obtained by swapping A and B: the pairing is one-to-one, and in each pair exactly one has A first. So exactly half: 120/2 = **60**. That "pair them up" argument is a **bijection**, and Day 11 uses the same idea to handle repeated letters.`, {
      terms: [
        ['Circular arrangement', 'Seatings where rotations are considered the same: (n − 1)! for n people.'],
        ['Block (gluing)', 'Treating items that must be adjacent as one object, then multiplying by the orders inside the block.'],
        ['Complement counting', 'Count all, subtract the forbidden ones. The counting twin of P(not A) = 1 − P(A).'],
        ['Bijection', 'A one-to-one pairing between two sets, proving they have the same size without counting either.'],
      ]
    }),
    q.goal('M', 'In the slot widget (four symbols A, B, C, D and four slots, no repeats), fill all four slots and read off the total number of sequences.', W('perms', { items: ['A', 'B', 'C', 'D'], k: 4 }), s => s.chosen === 4,
      'Options per slot: 4, 3, 2, 1. Total 4 × 3 × 2 × 1 = 24 = 4!.'),
    q.num('M', '5! = ?', 120, '5 × 4 × 3 × 2 × 1 = 120.'),
    q.num('M', 'In how many different orders can the four letters A, B, C, D be arranged in a row?', 24, '4! = 4 × 3 × 2 × 1 = 24. Four options for the first slot, three for the next, and so on.'),
    q.num('M', '0! = ?', 1, 'One way to arrange nothing. Also forced by 1! = 1 × 0!.'),
    q.num('M', 'Six runners finish a race. How many possible orderings are there for gold, silver and bronze?', 120, '6 × 5 × 4 = 120. Only three slots are filled, so it is the falling product 6!/3!, not 6! = 720.'),
    q.num('M', 'Seven different books are placed on a shelf. In how many orders can they stand?', 5040, '7! = 5040.'),
    q.num('M', 'Compute 10!/8! without evaluating either factorial.', 90, '10!/8! = 10 × 9 = 90: dividing by 8! removes the tail 8 × 7 × … × 1.'),
    q.mc('M', 'Why is the number of orderings of n distinct items n! rather than nⁿ?', ['Without repeats each slot has one fewer option than the last (n, n − 1, …, 1), and the product rule multiplies those counts', 'Because nⁿ is too large to compute', 'Because n! is a convention chosen by mathematicians', 'Because order does not matter'], 0, 'nⁿ counts sequences with repeats allowed (every slot keeps all n options). Once an item is used it is gone, so the counts fall by one.'),
    q.num('M', 'What is the smallest n for which n! exceeds 2³² = 4,294,967,296 (so a 32-bit unsigned counter of orderings would wrap)?', 13, '12! = 479,001,600 < 2³²; 13! = 6,227,020,800 > 2³². Thirteen items already have more orderings than a 32-bit register can count.'),
    q.num('M', 'Five people sit at a round table, and two seatings that differ only by rotating everyone are counted as the same. How many seatings?', 24, '5!/5 = 4! = 24: each circular seating appears 5 times among the 120 line-ups, once per rotation.'),
    q.num('M', 'Stretch: six people stand in a row for a photo, and Ann and Ben insist on standing next to each other. How many arrangements?', 240, 'Glue Ann and Ben into one block: 5 objects → 5! = 120 arrangements; the block can be Ann-Ben or Ben-Ann: × 2 = 240.'),
    q.num('M', 'Stretch: the five letters A, B, C, D, E are arranged in a row at random. In how many of the 120 arrangements does A appear somewhere before B?', 60, 'Swap A and B in any arrangement: this pairs every "A before B" arrangement with exactly one "B before A" arrangement. Exactly half: 120/2 = 60.'),
    q.num('M', 'Stretch: five people line up, and Ann refuses to be first. How many line-ups?', 96, 'All 5! = 120 minus those with Ann first (4! = 24 orders of the rest): 96. Or directly: 4 choices for the first place, then 4! for the rest: 4 × 24 = 96.'),
    q.num('M', 'Stretch: how many 5-letter "words" can be made from the 26 letters of the alphabet if no letter is used twice?', 7893600, 'Falling product 26 × 25 × 24 × 23 × 22 = 7,893,600.'),

    // =====================================================================================================
    // DEGREE: complex numbers (E02 L1, MATH19611)
    // =====================================================================================================
    q.info('E', 'Why invent i: the number that is a quarter turn', `On the real number line, multiplying by −1 does one geometric thing: it **flips** a number to the other side of zero, a rotation by 180°. Now ask: is there a number that, applied **twice**, does that flip? Applying it once would have to be a rotation by **90°**. No real number does that: a real number can only stretch or flip along the line. So we add a new direction: a second axis at right angles, and call the unit step along it **i**. Then i × i = "turn 90° twice" = "turn 180°" = −1. That is what **i² = −1** *means*: i is not a mysterious symbol, it is a quarter turn.

A **complex number** z = a + bi is a point (or an arrow from the origin) in this plane: a steps along the **real** axis, b along the **imaginary** axis. Two real numbers, one object. Engineers write **j** instead of i because i is already current; the mathematics is identical.

Why does an electrical engineer care? Because anything that **rotates or oscillates** lives naturally in this plane: a sinusoid is the shadow of a rotating arrow. On Day 22 you will turn every AC voltage and current into a single complex number (a *phasor*) and solve AC circuits with the same algebra as DC ones. Everything today is preparation for that.`, {
      terms: [
        ['Imaginary unit i (j in EE)', 'The unit step at right angles to the real axis. i² = −1 because a quarter turn done twice is a half turn.'],
        ['Complex number', 'z = a + bi: a point or arrow in the plane with real part a and imaginary part b.'],
        ['Real / imaginary part', 'The horizontal / vertical component of the arrow: Re(z) = a, Im(z) = b (a real number, no i).'],
        ['Complex plane (Argand diagram)', 'The plane with the real axis horizontal and the imaginary axis vertical.'],
        ['Phasor (preview)', 'A complex number standing for the amplitude and phase of a sinusoid. Day 22.'],
      ]
    }),
    q.info('E', 'Rectangular form: adding arrows, and the conjugate', `In **rectangular form** a + bi, addition is head-to-tail arrow addition: (a + bi) + (c + di) = (a + c) + (b + d)i. Add the real parts, add the imaginary parts. Subtraction likewise. This form is the natural one for **adding**.

Multiplication in rectangular form uses i² = −1 and ordinary expansion: (1 + 2i)(3 − i) = 3 − i + 6i − 2i² = 3 + 5i + 2 = **5 + 5i**. It works, but it hides what is happening geometrically; the next card fixes that.

The **conjugate** z* = a − bi is the mirror image of z in the real axis. Its job: z · z* = (a + bi)(a − bi) = a² − (bi)² = a² + b², a **real** number, the square of the arrow's length. That gives you **division**: to compute 1/(3 − i), multiply top and bottom by the conjugate 3 + i, so the bottom becomes real: (1 + 2i)/(3 − i) = (1 + 2i)(3 + i)/(3² + 1²) = (3 + i + 6i + 2i²)/10 = (1 + 7i)/10 = **0.1 + 0.7i**. "Make the denominator real" is the whole technique.`, {
      terms: [
        ['Rectangular (Cartesian) form', 'a + bi. Add and subtract component-wise. The form to use for adding.'],
        ['Conjugate z*', 'a − bi: the reflection of z in the real axis. z · z* = a² + b² is real.'],
        ['Modulus squared', 'a² + b² = z · z*: the squared length of the arrow.'],
        ['Realising the denominator', 'Multiply top and bottom by the conjugate of the bottom so you can divide by a real number.'],
      ]
    }),
    q.info('E', 'Polar form: length and angle, and why multiplication is "scale and rotate"', `The same arrow can be described by its **length** r = |z| = √(a² + b²) (Pythagoras on the two components) and its **angle** θ measured anticlockwise from the positive real axis. Going back: a = r cos θ, b = r sin θ. For 3 + 4i: r = √(9 + 16) = **5**, θ = atan2(4, 3) = **53.13°**. Use **atan2(b, a)**, not atan(b/a): atan(4/3) and atan(−4/−3) are the same number, but 3 + 4i and −3 − 4i point in opposite directions. atan2 looks at the signs of both parts and returns the right quadrant (−3 + 4i → 126.87°).

Now the payoff. Multiply two arrows in polar form: z₁ = r₁(cos θ₁ + i sin θ₁), z₂ = r₂(cos θ₂ + i sin θ₂). Expanding and grouping gives r₁r₂[(cos θ₁ cos θ₂ − sin θ₁ sin θ₂) + i(sin θ₁ cos θ₂ + cos θ₁ sin θ₂)], and the two brackets are exactly the **angle-addition formulas**: cos(θ₁ + θ₂) and sin(θ₁ + θ₂). So

**z₁z₂ has length r₁r₂ and angle θ₁ + θ₂: multiplying by z scales by |z| and rotates by its angle.**

That is the quarter-turn idea generalised: i has r = 1, θ = 90°, so multiplying by i rotates by 90° and changes no length; multiplying by 2 scales by 2 and rotates by 0°; multiplying by 2∠30° does both. Check on (1 + i)²: 1 + i has r = √2, θ = 45°, so the square has r = 2, θ = 90°: 2i. Expand to confirm: 1 + 2i + i² = 2i ✓. Polar form is the form for **multiplying and dividing** (divide lengths, subtract angles); rectangular is for adding. Slide the arrow below and watch both descriptions.`, {
      terms: [
        ['Modulus |z|', '√(a² + b²): the length of the arrow. |z₁z₂| = |z₁||z₂|.'],
        ['Argument (angle) θ', 'atan2(b, a): the arrow\'s direction from the positive real axis, in the correct quadrant. Angles add under multiplication.'],
        ['atan2', 'The two-argument arctangent: takes (b, a), returns the angle in the right quadrant. Plain atan(b/a) cannot tell 3 + 4i from −3 − 4i.'],
        ['Polar form', 'r∠θ: length and angle. Multiply: multiply lengths, add angles. Divide: divide lengths, subtract angles.'],
        ['Scale-and-rotate', 'What multiplying by a complex number does to the plane: stretch by |z| and turn by arg z.'],
      ],
      widget: W('complex', { re: 3, im: 4 })
    }),
    q.info('E', 'Euler\'s form e^(iθ), and the road to phasors', `Write the unit-length arrow at angle θ as **e^(iθ) = cos θ + i sin θ**. Why does it deserve the exponential's name? Two reasons, both things you can check:

1. **It multiplies like an exponential.** The scale-and-rotate rule says (unit arrow at θ₁) × (unit arrow at θ₂) = unit arrow at θ₁ + θ₂, i.e. e^(iθ₁)·e^(iθ₂) = e^(i(θ₁ + θ₂)). That is the law of exponents.
2. **It differentiates like an exponential.** d/dθ (cos θ + i sin θ) = −sin θ + i cos θ = i(cos θ + i sin θ) = **i·e^(iθ)**: the derivative is a constant (i) times the function, exactly as d/dt e^(kt) = k e^(kt) (Day 6). Only exponentials do that.

So any complex number is z = r·e^(iθ), and powers become trivial: (r e^(iθ))ⁿ = rⁿ e^(inθ) (de Moivre). (1 + i)⁸ = (√2)⁸ ∠ 8 × 45° = 16 ∠ 360° = **16**. Setting θ = π gives the famous e^(iπ) = cos π + i sin π = **−1**: a half turn.

**Where this is going.** A sinusoid A cos(ωt + φ) is the real part of A e^(iφ) · e^(iωt): a fixed arrow A∠φ, spun by the factor e^(iωt). In an AC circuit every voltage and current spins at the same ω, so the spinning factor is common to everything and can be dropped; what remains is one fixed complex number per signal, the **phasor** A∠φ. Adding sinusoids becomes adding arrows (rectangular form); differentiating becomes multiplying by iω (property 2), which turns the calculus of Day 11 into algebra. That is Day 22; today you have built the tool.`, {
      terms: [
        ['Euler\'s formula', 'e^(iθ) = cos θ + i sin θ: the unit arrow at angle θ, and it obeys the exponent and derivative laws.'],
        ['Exponential (polar) form', 'z = r e^(iθ). Same content as r∠θ; convenient for powers and calculus.'],
        ['De Moivre', '(r e^(iθ))ⁿ = rⁿ e^(inθ): raise the length to n, multiply the angle by n.'],
        ['iω rule (preview)', 'Differentiating e^(iωt) multiplies it by iω. On Day 22 this replaces derivatives with multiplication.'],
      ]
    }),
    q.num('E', '|3 + 4i| = ?', 5, '√(3² + 4²) = √25 = 5: the arrow\'s length by Pythagoras.'),
    q.num('E', 'The angle of 3 + 4i, in degrees, to 2 decimal places?', 53.13, 'atan2(4, 3) = 53.13°. Both parts are positive, so the arrow is in the first quadrant.', { tol: 0.05 }),
    q.num('E', '|−3 + 4i| = ?', 5, '√((−3)² + 4²) = √25 = 5. Length ignores the signs of the components.'),
    q.num('E', 'The angle of −3 + 4i, in degrees, to 2 decimal places?', 126.87, 'atan2(4, −3) = 180° − 53.13° = 126.87°: second quadrant. Plain atan(4/(−3)) would wrongly say −53.13°.', { tol: 0.05 }),
    q.mc('E', 'Why must you use atan2(b, a) rather than atan(b/a) to find the angle of a + bi?', ['atan(b/a) cannot tell a + bi from −a − bi (same ratio, opposite directions); atan2 uses the signs of both parts to pick the correct quadrant', 'atan2 is faster', 'atan only works in radians', 'atan(b/a) fails only when b = 0'], 0, '3 + 4i and −3 − 4i both have b/a = 4/3. atan2(4, 3) = 53.13°, atan2(−4, −3) = −126.87°: different arrows, different angles.'),
    q.mc('E', '5∠90° in rectangular form is…', ['0 + 5i', '5 + 0i', '5 + 5i', '−5 + 0i'], 0, 'a = 5 cos 90° = 0, b = 5 sin 90° = 5 → 5i. A length-5 arrow pointing straight up the imaginary axis.', { grid: true }),
    q.mc('E', 'Multiplying two complex numbers written in polar form, r₁∠θ₁ × r₂∠θ₂, gives…', ['length r₁r₂ and angle θ₁ + θ₂: multiply the lengths, add the angles', 'length r₁ + r₂ and angle θ₁θ₂', 'length r₁ + r₂ and angle θ₁ + θ₂', 'length r₁r₂ and angle θ₁θ₂'], 0, 'Expanding r₁(cos θ₁ + i sin θ₁) · r₂(cos θ₂ + i sin θ₂) and using the angle-addition formulas gives r₁r₂[cos(θ₁ + θ₂) + i sin(θ₁ + θ₂)].'),
    q.num('E', 'What is the imaginary part of (1 + 2i)(3 − i)?', 5, '(1 + 2i)(3 − i) = 3 − i + 6i − 2i² = 3 + 5i + 2 = 5 + 5i. Imaginary part 5.'),
    q.num('E', 'What is the real part of (1 + 2i)(3 − i)?', 5, '3 − i + 6i − 2i² = (3 + 2) + (−1 + 6)i = 5 + 5i. Real part 5 (remember −2i² = +2).'),
    q.num('E', 'Compute (3 + 4i)(3 − 4i), the product of 3 + 4i with its conjugate.', 25, '3² − (4i)² = 9 − 16i² = 9 + 16 = 25 = |3 + 4i|². Real, as z·z* always is.'),
    q.mc('E', 'What is i³?', ['−i', 'i', '−1', '1'], 0, 'i³ = i² · i = −1 · i = −i. Geometrically: three quarter turns = 270° = pointing straight down.', { grid: true }),
    q.num('E', 'What is i⁴?', 1, 'i⁴ = (i²)² = (−1)² = 1: four quarter turns bring you back to the start.'),
    q.mc('E', '(1 + i)² = ?', ['2i', '2', '1 + i', '2 + 2i'], 0, 'Expand: 1 + 2i + i² = 2i. Polar check: 1 + i is √2∠45°, so its square is 2∠90° = 2i. Same answer, and the polar route shows why: scale by √2 twice, rotate by 45° twice.', { grid: true }),
    q.num('E', 'Multiply 2∠30° by 3∠45°. What is the **length** of the result?', 6, 'Lengths multiply: 2 × 3 = 6.'),
    q.num('E', 'Multiply 2∠30° by 3∠45°. What is the **angle** of the result, in degrees?', 75, 'Angles add: 30° + 45° = 75°.'),
    q.num('E', 'Exam-style: write 10∠−60° in rectangular form and give its **imaginary part** (2 d.p.).', -8.66, 'a = 10 cos(−60°) = 5, b = 10 sin(−60°) = −10 × 0.8660 = −8.66. So 5 − 8.66i: fourth quadrant.', { tol: 0.02 }),
    q.num('E', 'Exam-style: compute (2 + 3i)/(1 − i) and give its **real part**.', -0.5, 'Multiply top and bottom by the conjugate 1 + i: (2 + 3i)(1 + i)/(1² + 1²) = (2 + 2i + 3i + 3i²)/2 = (−1 + 5i)/2 = −0.5 + 2.5i.', { tol: 0.01 }),
    q.num('E', 'What is e^(iπ)? (Euler\'s formula: e^(iθ) = cos θ + i sin θ.)', -1, 'cos π + i sin π = −1 + 0i = −1. A half turn from 1 lands on −1.'),
    q.num('E', 'Stretch: compute (1 + i)⁸ using polar form.', 16, '1 + i = √2∠45°. Raise to the 8th: length (√2)⁸ = 2⁴ = 16, angle 8 × 45° = 360° = 0°. So 16 + 0i = 16.'),
    q.mc('E', 'Why is d/dθ of e^(iθ) = cos θ + i sin θ equal to i·e^(iθ), and why will that matter for circuits?', ['Differentiating gives −sin θ + i cos θ = i(cos θ + i sin θ); a derivative that is a constant times the function is what makes e^(iωt) turn differentiation into multiplication by iω (Day 22 phasors)', 'Because i is a constant, the derivative is zero', 'Because cos and sin are both periodic', 'It does not; the derivative of e^(iθ) is e^(iθ)'], 0, 'Only exponentials have derivatives proportional to themselves. That property lets an AC circuit\'s differential equations (Day 11) become algebra in the phasor domain.'),
    ...genius(q, 9),
  ]
};
