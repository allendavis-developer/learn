import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(10);

export default {
  title: 'Product widths, parsing safely, combinations, RC time constant',
  emoji: '📐',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Week 2, day 3. **Hardware** (H01 L4): why a product needs m + n bits, why the signed case is decided by the most negative value, how a 32-bit notional silently lets an over-limit order through, and what a fractional price scale of 256 does to the comparison. **Code** (S01 L2): a parser as four ordered stages, the full rule list of the 16-byte message, deterministic rejection precedence, and why a native-endian unpack is wrong for a wire format. **Maths** (M01): combinations as "count with order, then divide by the orders", the edge cases and the complement mirror, Pascal\'s rule derived by fixing one item, and how to compute C(n, k) without overflowing. **Degree** (E01 L3): q = Cv and i = C·dv/dt from the plates up, why charging is exponential, where 63.2 % comes from, t = −τ·ln(1 − f), discharge and settling time.',
  takeaway: 'An m-bit × n-bit product needs **m + n** bits, so 16 × 32 → 48; the full-width product must exist **before** any comparison, or a wrapped notional passes a risk check. A parser checks length, decodes, validates, then applies — and a fixed rejection precedence gives one stable reason code per input. C(n, k) = n!/(k!(n−k)!) because each set was counted k! times; C(n,k) = C(n−1,k−1) + C(n−1,k) by asking whether one fixed item is in. **τ = RC** because the rate of rise is proportional to the gap left; 63.2 % = 1 − 1/e at t = τ, and t = −τ·ln(1 − f) in general, so 90 % takes 2.303 τ.',
  steps: [
    // =====================================================================================================
    // HARDWARE: how wide must a product be, and where the comparison goes (H01 L4)
    // =====================================================================================================
    q.info('H', 'Why a product needs more bits than its inputs', `Add two 8-bit numbers and the answer can need 9 bits. Multiply them and it can need 16. Where does the difference come from?

Look at the largest values. The biggest 8-bit unsigned number is 255. 255 + 255 = 510, just under 512 = 2⁹, so addition needs one extra bit. But 255 × 255 = 65,025, just under 65,536 = 2¹⁶. Multiplying roughly **adds the number of digits**, the same way 99 × 99 = 9801 has four decimal digits.

The rule: an m-bit unsigned value times an n-bit unsigned value fits in **m + n** bits, and nothing narrower always works.

Both halves of that are one line each. (2^m − 1)(2^n − 1) < 2^(m+n), so m + n always fits. And whenever m and n are both at least 2, that same product is larger than 2^(m+n−1), so m + n − 1 sometimes fails.

So a 16-bit quantity times a 32-bit price needs **48 bits**. Not 32, not 40. Drag the two widths and watch the maximum product.`, {
      terms: [
        ['Width', 'How many bits a value is stored in. It is a property of the wire or register, not of the number.'],
        ['Intermediate result', 'A value that exists partway through a calculation. It needs its own width, chosen from its own worst case.'],
        ['Product width', 'm-bit × n-bit needs m + n bits, unsigned or signed.'],
        ['Notional', 'The money value of an order: quantity × price. The classic place this width bug shows up.'],
      ],
      widget: W('widths', { a: 16, b: 32 })
    }),
    q.info('H', 'The signed case is decided by the most negative value', `With signed numbers the dangerous corner is not the biggest positive number. An 8-bit signed value runs from −128 to +127, so the negative end reaches one further than the positive end.

The largest product is therefore not 127 × 127 = 16,129. It is (−128) × (−128) = **16,384**.

Can 15 bits hold that? A 15-bit signed value tops out at 2¹⁴ − 1 = 16,383. One short. So a signed 8 × 8 multiply also needs 16 bits, and the general rule stays **m × n → m + n bits**, signed or unsigned. Only the corner that hurts you changes.

A habit that catches almost every width bug before it is written: list the smallest and largest value each operand can take, multiply the four combinations, and size the result to hold the worst of them. It takes twenty seconds and it works for subtraction and accumulation too.`, {
      terms: [
        ['Signed range', 'A width-w signed value covers −2^(w−1) … 2^(w−1) − 1: one more step below zero than above.'],
        ['Corner case', 'An input combination at the extreme of the allowed range. Widths must be sized on these, not on typical values.'],
        ['Worst-case sizing', 'Choosing a width from the extreme values the inputs may legally take, rather than from the values you expect.'],
      ]
    }),
    q.info('H', 'Compare at full width, then truncate', `A risk check has one job: reject an order worth more than the limit. Here is how it silently stops doing that job.

An order is 100 units at a price of 50,000,000, so it is worth 5,000,000,000. The limit is 1,000,000,000, so it must be rejected.

Now suppose the multiply lands in a 32-bit register. That register keeps only the low 32 bits, and 5,000,000,000 − 4,294,967,296 = **705,032,704**. The comparison then asks whether 705,032,704 exceeds 1,000,000,000. It does not. The order is accepted.

Nothing crashed and no warning appeared. A number that was far too big came back looking small — exactly the direction that lets a bad order through.

The fix is an ordering rule, not a wider variable at the end: **the full-width product must exist before anything is compared or thrown away.** Widen first (48 bits here), compare, then narrow for whatever comes next. Casting to 64 bits *after* the multiply is too late; the bits were already lost inside it.`, {
      terms: [
        ['Truncation', 'Keeping only the low bits of a result. Silent: the register looks perfectly valid afterwards.'],
        ['Full width', 'A width big enough that the true result cannot wrap. For a product of m and n bits, m + n.'],
        ['Fail open', 'A check that lets things through when it goes wrong. A wrapped notional makes a limit check fail open.'],
        ['Risk limit', 'A maximum order value the gate must never accept beyond. Its comparison is only as trustworthy as the width it runs at.'],
      ],
      widget: W('notional', {})
    }),
    q.info('H', 'A fractional price scale, and where you round', `Prices are rarely whole numbers. The usual trick is to keep the price as an integer number of 1/256ths: a stored price of 2561 means 2561/256 = 10.00390625. The 256 is the **scale**, and it is an agreement between blocks, not something visible in the bits.

Multiply a plain integer quantity by that stored price and the scale comes along. With quantity 3: 3 × 2561 = 7683, and that 7683 is the order value **times 256**.

Now check it against a limit of 30. Two honest designs:

- **compare before rescaling**: is 7683 > 30 × 256 = 7680? Yes → reject.
- **rescale first** (7683 ÷ 256 = 30.0117, floor to 30), then compare: is 30 > 30? No → accept.

Same order, same limit, opposite answers, and neither piece of code is wrong. Which one is correct is whatever the specification says.

The two designs only ever differ within one unit of the limit, so that is precisely where the tests belong: exactly below, at, and above. Write the scale, the rescale point and the rounding rule into the interface contract, next to the widths.`, {
        terms: [
          ['Scale', 'The agreed multiplier that turns a stored integer into a real value. Scale 256 means eight bits sit after the binary point.'],
          ['Rescale', 'Dividing a product back down to the working scale, once, at a chosen point.'],
          ['Rounding policy', 'What happens to the bits the rescale drops: floor, nearest, or something else. It must be written down.'],
          ['Interface contract', 'The written agreement between two blocks: widths, signedness, scale, rounding, comparison order, timing.'],
          ['Boundary test', 'An input exactly below, at and above a limit. Off-by-one bugs live nowhere else.'],
        ]
      }),
    q.goal('H', 'In the notional simulation, the result register can be 32 bits or the full 48. Find the order where the two widths **disagree**: the truncated compare accepts it and the full-width compare rejects it.', W('notional', {}), s => s.disagree,
      'The 100 × 50,000,000 order is worth 5,000,000,000. Kept to 32 bits it looks like 705,032,704, which is under the 1,000,000,000 limit, so the truncated check accepts an order that is five times over. The 3000 × 2,000,000 order fails the same way.'),
    q.num('H', 'An unsigned 16-bit value is multiplied by an unsigned 32-bit value. What is the minimum width, in bits, that always holds the product?', 48, 'm + n = 48. The largest product is (2¹⁶ − 1)(2³² − 1) = 2⁴⁸ − 2³² − 2¹⁶ + 1, just under 2⁴⁸, so 48 bits fit and 47 do not.'),
    q.num('H', 'An unsigned 8-bit value is multiplied by an unsigned 8-bit value. What is the minimum result width in bits?', 16, '255 × 255 = 65,025, which is under 65,536 = 2¹⁶ but well over 2¹⁵ = 32,768. So 16 bits, and 15 are not enough.'),
    q.num('H', 'A signed 8-bit value (range −128 … 127) is multiplied by another signed 8-bit value. What is the minimum result width in bits?', 16, 'The extreme product is (−128) × (−128) = 16,384. A 15-bit signed value reaches only 16,383, so 16 bits are needed. Signed m × n also needs m + n.'),
    q.mc('H', 'A 1-bit unsigned value is multiplied by an 8-bit unsigned value. The minimum result width is…', ['8 bits: the product is either 0 or the 8-bit operand itself', '9 bits, because m + n = 9', '16 bits', '1 bit'], 0, 'm + n is always safe but not always tight. Multiplying by 0 or 1 cannot make a value bigger, so 8 bits suffice. The tight rule "m + n is also necessary" needs both widths to be at least 2.'),
    q.mc('H', 'A design multiplies quantity by price into a 32-bit register and then compares that register against a 32-bit limit. What is the bug?', ['The product may already have wrapped inside the 32-bit register, so the comparison is checking a wrong, smaller number and an over-limit order can pass', 'Comparison is slower than multiplication, so the order arrives late', 'Limits must always be stored as 64-bit values', 'Multiplication needs an extra clock cycle that the comparison does not wait for'], 0, 'Truncation happened first. The comparison is then perfectly correct about a number that is not the order value. Widen to the full product width, compare, and truncate afterwards.'),
    q.num('H', 'A quantity of 100 is multiplied by a price of 50,000,000 and the result is kept in a 32-bit unsigned register. What value does the register hold?', 705032704, 'The true product is 5,000,000,000. A 32-bit register keeps the remainder modulo 2³² = 4,294,967,296: 5,000,000,000 − 4,294,967,296 = 705,032,704.'),
    q.mc('H', 'Two order values, each held in 48 bits, are added together. The sum needs…', ['49 bits', '48 bits', '96 bits', '64 bits'], 0, 'Addition adds one bit; multiplication adds the whole width. (2⁴⁸ − 1) + (2⁴⁸ − 1) < 2⁴⁹.', { grid: true }),
    q.num('H', 'A risk gate adds up 64 order values, each an unsigned 16-bit number, into one accumulator. What is the minimum accumulator width in bits?', 22, '64 values of at most 2¹⁶ − 1 sum to less than 64 × 2¹⁶ = 2²². So 16 + log₂(64) = 16 + 6 = 22 bits. Summing N values of width w needs w + ⌈log₂ N⌉.'),
    q.num('H', 'A price is stored as an integer number of 1/256ths, and the stored price is 2561. A quantity of 3 is bought. The limit is 30 whole currency units and the design compares **before** rescaling. What number must the product 3 × 2561 be compared against?', 7680, 'Comparing before rescaling means bringing the limit up to the product\'s scale: 30 × 256 = 7680. The product is 7683 > 7680, so the order is rejected. Rescaling first would floor 7683/256 to 30 and accept it.'),
    q.mc('H', 'Interview: a colleague fixes a width bug by writing `long long total = (long long)(qty * price);`, where `qty` and `price` are 32-bit. Does the cast fix it?', ['No: the multiply still happens in 32 bits and wraps, and the cast then widens the already-wrong result', 'Yes: the cast makes the whole expression 64-bit', 'Yes, as long as the limit is also 64-bit', 'Only if the values are unsigned'], 0, 'The cast applies to the result of the multiply, not to its operands. The bits were lost inside the multiplication. Widen the operands first — `(long long)qty * price` — so the multiply itself runs at full width.'),
    q.num('H', 'Interview: an accumulator must hold the sum of up to 1024 order values, each at most 48 bits wide. What is the minimum accumulator width in bits?', 58, '1024 × (2⁴⁸ − 1) < 2¹⁰ × 2⁴⁸ = 2⁵⁸, so 58 bits. Rule: summing N values of width w needs w + ⌈log₂ N⌉ bits. Sizing it at 48 or 64 "because those are the round numbers" is guessing; 58 is the derived answer and 64 is the honest engineering choice on a byte-oriented bus.'),
    q.code('H', 'Build the width-checked notional test from a risk gate. Write `solve(qty, price_ticks, limit, scale, mode)`. `qty` is an unsigned 16-bit quantity (legal range 0 … 65535); `price_ticks` is an unsigned 32-bit stored price (0 … 2³² − 1) whose real value is `price_ticks / scale`. If either is outside its declared width, return `"bad_input"`. Otherwise the order value at the stored scale is `qty * price_ticks`, and `limit` is a whole-currency limit. When `mode` is `"before"`, compare at full precision and reject when `qty * price_ticks > limit * scale`. When `mode` is `"after"`, rescale first with floor division and reject when `qty * price_ticks // scale > limit`. Return `"accept"` or `"reject"`.', {
      fn: 'solve',
      starter: 'def solve(qty, price_ticks, limit, scale, mode):\n    if not (0 <= qty <= 65535) or not (0 <= price_ticks <= 2 ** 32 - 1):\n        return "bad_input"\n    prod = qty * price_ticks       # full width: up to 48 bits, never truncated\n    if mode == "before":\n        pass                       # compare prod with the limit brought up to the scale\n    else:\n        pass                       # rescale prod with floor division, then compare\n    return "accept"\n',
      tests: [
        { args: [3, 2561, 30, 256, 'before'], expect: 'reject', name: 'compare before rescaling: 7683 > 7680' },
        { args: [3, 2561, 30, 256, 'after'], expect: 'accept', name: 'rescale first: 7683 // 256 = 30, not over 30' },
        { args: [3, 2560, 30, 256, 'before'], expect: 'accept', name: 'exactly at the limit is accepted' },
        { args: [3, 2560, 30, 256, 'after'], expect: 'accept', name: 'exactly at the limit, other mode' },
        { args: [100, 50000000, 1000000000, 1, 'before'], expect: 'reject', name: 'the order a 32-bit register would wrongly accept' },
        { args: [0, 4294967295, 0, 1, 'before'], expect: 'accept', name: 'zero quantity: value 0, not over a limit of 0' },
        { args: [65535, 4294967295, 281474976710655, 1, 'before'], expect: 'accept', name: 'the widest legal order: 48 bits, still under 2⁴⁸ − 1' },
        { args: [65536, 1, 100, 1, 'before'], expect: 'bad_input', name: 'quantity wider than 16 bits' },
        { args: [1, 4294967296, 100, 1, 'before'], expect: 'bad_input', name: 'price wider than 32 bits' },
        { args: [-1, 10, 100, 1, 'before'], expect: 'bad_input', name: 'negative quantity is not a legal unsigned value' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        qty = random.choice([0, 1, 3, 65535, 65536, random.randint(0, 70000)])\n        price = random.choice([0, 1, 2560, 2561, 2 ** 32 - 1, 2 ** 32, random.randint(0, 2 ** 32)])\n        scale = random.choice([1, 256])\n        limit = random.randint(0, 40) * scale + random.choice([0, 1, 30])\n        yield [qty, price, limit, scale, random.choice(["before", "after"])]',
      refCode: 'def ref(qty, price_ticks, limit, scale, mode):\n    if not (0 <= qty <= 65535) or not (0 <= price_ticks <= 2 ** 32 - 1):\n        return "bad_input"\n    prod = qty * price_ticks\n    over = prod > limit * scale if mode == "before" else prod // scale > limit\n    return "reject" if over else "accept"',
      solution: 'def solve(qty, price_ticks, limit, scale, mode):\n    if not (0 <= qty <= 65535) or not (0 <= price_ticks <= 2 ** 32 - 1):\n        return "bad_input"\n    prod = qty * price_ticks\n    if mode == "before":\n        over = prod > limit * scale\n    else:\n        over = prod // scale > limit\n    return "reject" if over else "accept"'
    }, 'Two things are being practised. First, the width check happens before any arithmetic, so an out-of-range input is rejected rather than silently wrapped. Second, `prod` is computed once at full precision and the *limit* is moved to meet it, rather than the product being cut down to meet the limit. The two modes agree everywhere except within one unit of the limit — the tests at 2560 and 2561 are exactly that boundary, and they are the tests a specification argument is settled with.'),

    // =====================================================================================================
    // CODE: parsing a fixed-size binary message safely (S01 L2)
    // =====================================================================================================
    q.info('S', 'A parser is mostly a list of refusals', `Bytes arrive from a network. Somewhere they have to become fields you trust. That step is the **parser**, and most of its work is saying no.

Do it in four separate stages, in this order:

1. **Length** — is this exactly the 16 bytes the format promises? If not, stop here.
2. **Decode** — pull out the fields, stating the byte order explicitly.
3. **Validate** — is every field legal, and are the fields consistent with each other?
4. **Apply** — only now touch any stored state.

The order carries the safety. Decoding before checking the length means reading bytes that were never received: in Python an exception, in C somebody else's memory. Applying before validating leaves half a bad message inside your state, which is worse than rejecting all of it.

Every refusal carries a short **reason code** such as \`truncated\` or \`bad_opcode\`. That turns "the feed broke" into "rule 4 rejected 812 messages", which is something you can test, count and put on a dashboard.`, {
      terms: [
        ['Parser', 'The code that turns raw bytes into named, checked fields.'],
        ['Reason code', 'A short fixed string naming which rule rejected a message. Not a free-text error.'],
        ['Truncated', 'Shorter than the format requires. Must be rejected before any field is read.'],
        ['Commit', 'The moment stored state actually changes. Everything that can fail must happen before it.'],
      ],
      widget: W('parsestep', {})
    }),
    q.info('S', 'The rules of the 16-byte message', `The message is 16 bytes and every multi-byte field is most-significant-byte first. Its layout puts version, opcode, side and a reserved byte in bytes 0–3, a 4-byte sequence number at 4, a 2-byte symbol at 8, a 4-byte price in ticks at 10, and a 2-byte quantity at 14.

The rules the parser enforces:

| field | rule |
|---|---|
| version (byte 0) | must be 1 |
| opcode (byte 1) | 1 = replace a quote, 2 = delete |
| side (byte 2) | 0 = bid, 1 = ask |
| reserved (byte 3) | must be 0 |
| quantity (bytes 14–15) | opcode 1 needs it above 0; opcode 2 needs it exactly 0 |

Two of those look pedantic and are not. **Version must be 1** because it is the only thing that lets a future format change be detected instead of misread. **Reserved must be zero** because that byte is the room a future field will occupy, so a sender putting anything there is either buggy or speaking a language you do not know yet.

The quantity rules are about meaning. Opcode 1 replaces a quote, and a quote of zero is not a quote. Opcode 2 deletes, so a non-zero quantity contradicts the message's own opcode.`, {
      terms: [
        ['Opcode', 'The field that says what kind of message this is. Unknown values are rejected, never guessed.'],
        ['Reserved field', 'A byte with no meaning yet, required to be zero, so the format can grow without breaking old readers.'],
        ['Field consistency', 'A rule involving two fields at once, such as "a delete must carry zero quantity".'],
        ['Ticks', 'Prices sent as whole numbers of a small unit, so no floating point is needed on the wire.'],
      ]
    }),
    q.info('S', 'Deterministic rejection precedence', `Send a message that is wrong in three ways at once: version 2, opcode 9, side 5. Which reason code comes back?

If the specification does not say, two perfectly reasonable implementations will disagree, and every test that checks a reason code becomes flaky. It gets worse when a hardware design is compared against the Python model: they differ on a message that **both** rejected, and you lose a day discovering that neither is wrong.

So the specification fixes an order, and every implementation checks in that order and stops at the first failure: length, version, reserved, opcode, side, then the quantity rules. That is what *deterministic rejection precedence* means — for any input there is exactly one defined answer, not merely "some rejection".

It also makes the counters mean something. Because \`bad_version\` is checked first, its counter is the number of messages with a bad version, not "messages with a bad version that happened to be looked at first".`, {
      terms: [
        ['Precedence', 'The fixed order in which rules are checked, so the first failure decides the reason code.'],
        ['Deterministic', 'Same input, same output, every time and in every implementation.'],
        ['Reference model', 'A simple software implementation the hardware is compared against, byte for byte.'],
        ['Flaky test', 'A test that passes or fails depending on something the specification never pinned down.'],
      ]
    }),
    q.info('S', 'Why a native-endian unpack is wrong here', `In Python, \`struct.unpack('>I', data)\` reads four bytes as a big-endian unsigned number. Drop the \`>\` and write \`'I'\` and it still works — on your machine.

Without a prefix, \`struct\` uses the running machine's own conventions, and two of them bite:

- **Byte order.** On an x86 laptop the bytes \`00 00 27 10\` come back as 270,794,752 instead of 10,000.
- **Padding.** Native mode inserts spare bytes so each field starts at an address the CPU prefers, so \`calcsize('BI')\` is 8 while \`calcsize('>BI')\` is 5. Your 16-byte message quietly becomes a 20-byte one.

So the same source file turns the same bytes into different numbers, and even a different message length, depending on where it runs. That is not a bug testing finds; it is a bug that appears when the code moves to another machine.

A wire format has exactly one meaning, fixed by its specification. Say the byte order out loud in every format string: \`>\` or \`!\`, never nothing.`, {
      terms: [
        ['Format string', "struct's mini-language: an order prefix, then one letter per field."],
        ['Native order', "The running machine's own byte order and padding rules. Fine for local memory, never for a wire format."],
        ['Alignment padding', 'Unused bytes a CPU likes between fields. Native struct inserts them; > and < never do.'],
        ['Wire format', 'A byte layout defined by a specification so any machine produces and reads it identically.'],
      ]
    }),
    q.goal('S', 'In the message-validation simulation, press "check next rule" repeatedly until the widget shows a reason code (or `ok`) for the message you picked.', W('parsestep', {}), s => s.verdict !== null,
      'The rules are checked in precedence order and the first failure ends the check: later rules are marked "skipped" because their result cannot change the answer. That is what makes the reason code stable across implementations.'),
    q.mc('S', 'A format defines messages as exactly 16 bytes, and only 12 bytes arrive. The parser should…', ['reject with a "truncated" reason before decoding any field', 'pad the missing bytes with zeros and continue', 'decode the first three fields, which are all present', 'let it raise an IndexError and catch that further up'], 0, 'Reading fields that were never received is undefined, and padding invents data the sender never sent. Check the length first and refuse with a named reason.'),
    q.mc('S', 'A message format defines opcode 1 (replace a quote) and opcode 2 (delete). A message arrives with opcode 7. The parser should…', ['reject it with an "unknown opcode" reason', 'treat 7 as the nearest defined opcode', 'treat any unknown opcode as a delete, which is the safe operation', 'ignore the message silently and carry on'], 0, 'Guessing is how a feed handler corrupts its own state. An unsupported input is rejected explicitly, and the counter for that reason is what tells you the sender changed.'),
    q.order('S', 'Put the four stages of a safe binary parser into the order the bytes flow through them.', ['check the total length', 'decode the fields with an explicit byte order', 'validate each field and their consistency', 'apply the update to stored state'], 'Length first so decoding can never run off the end; decode, then validate, and commit to state only when nothing else can fail.'),
    q.mc('S', 'In a 16-byte message format, opcode 2 means "delete this quote" and the specification says a delete carries quantity 0. A message arrives with opcode 2 and quantity 5. The correct handling is…', ['reject it: a delete with a non-zero quantity contradicts its own opcode', 'accept it and delete the quote, ignoring the quantity', 'accept it and store quantity 5', 'rewrite it as opcode 1 with quantity 5'], 0, 'Consistency between fields is part of being a legal message. Accepting it means silently choosing which of the two contradictory fields to believe.'),
    q.num('S', 'A 16-byte message has 1-byte version, opcode, side and reserved fields, then a 4-byte sequence number, a 2-byte symbol, a 4-byte price and a 2-byte quantity, in that order. At which byte offset does the quantity field start, counting from 0?', 14, '1 + 1 + 1 + 1 = 4, then 4 for the sequence → 8, then 2 for the symbol → 10, then 4 for the price → 14. The quantity occupies bytes 14 and 15, and 14 + 2 = 16 confirms the layout is complete.'),
    q.text('S', 'A parser checks its rules in this precedence: length, version, reserved byte, opcode, side, then the quantity rules. A 16-byte message arrives with version 2, opcode 9 and side 5. Which reason code does it return? (Use `bad_version`, `bad_opcode` or `bad_side`.)', ['bad_version'], 'Three rules fail, but precedence decides: version is checked before opcode and side, so the answer is bad_version, every time, in every implementation. Without a fixed order the answer would depend on how someone wrote their if-statements.', { mono: true, accept: ['^bad[_ ]?version$'] }),
    q.num('S', 'On an x86 machine `struct.calcsize(\'BI\')` returns 8 while `struct.calcsize(\'>BI\')` returns 5. How many padding bytes did the native format string insert?', 3, '8 − 5 = 3. Native mode puts the 4-byte field on a multiple-of-4 boundary, so three unused bytes follow the single-byte field. A wire format never contains that padding, which is a second reason a bare format string is wrong.'),
    q.mc('S', 'Why is a native-endian unpack (a bare format string such as `\'I\'`) wrong for decoding a message whose layout is fixed by a network specification?', ['The result depends on the machine running the decoder: byte order and padding both change, so the same bytes give different numbers and even a different message size', 'It is slower than an explicit big-endian unpack', 'Python does not support native unpacking of unsigned values', 'Network data is always little-endian, so native is only wrong on big-endian machines'], 0, 'A wire format has one meaning. The decoder has to state the order so that every machine reads the same bytes as the same numbers.'),
    q.num('S', 'Interview: a fuzzer sends 16 uniformly random bytes. The parser accepts only if version = 1, the reserved byte = 0, opcode ∈ {1, 2}, side ∈ {0, 1}, and the 2-byte quantity is non-zero for opcode 1 or exactly 0 for opcode 2. The acceptance probability is 2^(−k). What is k?', 31, 'Version 2⁻⁸, reserved 2⁻⁸, side 2/256 = 2⁻⁷. Opcode and quantity combine neatly: P(opcode 1 and qty > 0) + P(opcode 2 and qty = 0) = (1/256)(65535/65536) + (1/256)(1/65536) = 1/256 = 2⁻⁸. Total 2⁻(8+8+7+8) = 2⁻³¹, so k = 31 — about one in two billion. Random fuzzing alone will never reach the deeper rules, which is why you also need generated *nearly valid* messages.'),
    q.mc('S', 'Interview: a colleague\'s parser returns `True` for a good message and `False` for a bad one. What concretely is lost compared with returning a reason code?', ['Per-rule counters, per-rule tests and a way to tell a truncated packet from a bad opcode when a feed goes wrong at 3 a.m.', 'Nothing: the caller only needs to know whether to use the message', 'Speed, because a string comparison is slower than a boolean', 'The ability to reject the message at all'], 0, 'Both parsers reject the same messages; only one can tell you *why*. Reason codes give a test per rule, a counter per rule, and a fast answer when a sender changes its format.'),
    q.code('S', 'Build the validator for the 16-byte message. Write `solve(msg)`, where `msg` is a list of byte values. Return the **first** failing reason in this precedence, or `"ok"`: `"truncated"` (length ≠ 16), `"bad_version"` (byte 0 ≠ 1), `"reserved_nonzero"` (byte 3 ≠ 0), `"bad_opcode"` (byte 1 not 1 or 2), `"bad_side"` (byte 2 not 0 or 1), `"zero_qty"` (opcode 1 with quantity 0), `"delete_needs_zero_qty"` (opcode 2 with quantity ≠ 0). The quantity is bytes 14 and 15, most significant byte first.', {
      fn: 'solve',
      starter: 'def solve(msg):\n    if len(msg) != 16:\n        return "truncated"\n    version, opcode, side, reserved = msg[0], msg[1], msg[2], msg[3]\n    qty = msg[14] * 256 + msg[15]\n    # the remaining checks, in precedence order\n    return "ok"\n',
      tests: [
        { args: [[1, 1, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], expect: 'ok', name: 'a legal replace of 100 at price 10,000' },
        { args: [[1, 1, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0]], expect: 'truncated', name: 'only 12 bytes arrived' },
        { args: [[2, 1, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], expect: 'bad_version', name: 'version 2' },
        { args: [[1, 1, 0, 9, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], expect: 'reserved_nonzero', name: 'reserved byte is 9' },
        { args: [[1, 7, 0, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], expect: 'bad_opcode', name: 'opcode 7 is not defined' },
        { args: [[1, 1, 5, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 100]], expect: 'bad_side', name: 'side 5 is neither bid nor ask' },
        { args: [[1, 1, 1, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0x27, 0x10, 0, 0]], expect: 'zero_qty', name: 'a replace with quantity 0 is not a quote' },
        { args: [[1, 2, 1, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0, 0, 0, 5]], expect: 'delete_needs_zero_qty', name: 'a delete carrying quantity 5' },
        { args: [[1, 1, 1, 0, 0, 0, 0, 7, 0, 42, 0, 0, 0, 0, 1, 0]], expect: 'ok', name: 'quantity 256 spans both bytes: 1 × 256 + 0' },
        { args: [[2, 9, 5, 1, 0, 0, 0, 7, 0, 42, 0, 0, 0, 0, 0, 0]], expect: 'bad_version', name: 'four faults at once: precedence still says version' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        m = [random.choice([1, 1, 1, 2]), random.choice([1, 1, 2, 3, 7]), random.choice([0, 1, 2]), random.choice([0, 0, 0, 5])] + [0] * 10 + [random.choice([0, 0, 1]), random.choice([0, 1, 100])]\n        if random.random() < 0.15:\n            m = m[:random.randint(0, 15)]\n        yield [m]',
      refCode: 'def ref(msg):\n    if len(msg) != 16: return "truncated"\n    if msg[0] != 1: return "bad_version"\n    if msg[3] != 0: return "reserved_nonzero"\n    if msg[1] not in (1, 2): return "bad_opcode"\n    if msg[2] not in (0, 1): return "bad_side"\n    qty = msg[14] * 256 + msg[15]\n    if msg[1] == 1 and qty == 0: return "zero_qty"\n    if msg[1] == 2 and qty != 0: return "delete_needs_zero_qty"\n    return "ok"',
      solution: 'def solve(msg):\n    if len(msg) != 16:\n        return "truncated"\n    if msg[0] != 1:\n        return "bad_version"\n    if msg[3] != 0:\n        return "reserved_nonzero"\n    if msg[1] not in (1, 2):\n        return "bad_opcode"\n    if msg[2] not in (0, 1):\n        return "bad_side"\n    qty = msg[14] * 256 + msg[15]\n    if msg[1] == 1 and qty == 0:\n        return "zero_qty"\n    if msg[1] == 2 and qty != 0:\n        return "delete_needs_zero_qty"\n    return "ok"'
    }, 'Every check is a separate early return in a fixed order, which is precisely what "deterministic rejection precedence" buys: the test with four simultaneous faults has one right answer. Note that the length check has to come first — `msg[14]` on a 12-byte list would raise IndexError, which is a crash, not a rejection. The random cases mix valid and invalid messages and are checked against a hidden reference implementation of the same rules.'),

    // =====================================================================================================
    // MATHS: combinations (M01)
    // =====================================================================================================
    q.info('M', 'Combinations: count with order, then divide by the orders', `Pick 3 letters from A, B, C, D, E as an **ordered** list: 5 × 4 × 3 = 60 of them (Day 9's falling product). Now pick 3 as a **set**, where ABC and CAB count as the same choice. How many?

Write the 60 lists out and sort them into piles, one pile per set. Every pile holds exactly the same number of lists: 3! = 6, the ways to order three chosen letters. Equal piles are what makes division legal, so the number of piles is 60/6 = **10**.

That is the whole idea. Count with order, then divide by how many times each answer got counted.

In factorials: the ordered count 5 × 4 × 3 is 5!/2!, so the number of sets is 5!/(3! · 2!) = 10. In general the number of ways to choose k things from n when order does not matter is

**C(n, k) = n! / (k! (n − k)!)**

Toggle the simulation between sequences and sets and watch the piles collapse.`, {
      terms: [
        ['Combination', 'A selection where order does not matter: a subset.'],
        ['C(n, k)', 'Read "n choose k": the number of k-element subsets of n things.'],
        ['Equal piles', 'The reason division works: every unordered answer corresponds to the same number k! of ordered ones.'],
        ['Subset', 'Some of the items, with no order and no repeats.'],
      ],
      widget: W('counting', { symbols: ['A', 'B', 'C', 'D', 'E'], k: 3 })
    }),
    q.info('M', 'The edges and the mirror', `**The edges.** C(5, 0) = 1: there is exactly one way to choose nothing, namely take nothing. The formula gives 5!/(0! · 5!), which comes out as 1 only because 0! = 1 (Day 9). That convention is not decoration — it is what makes the ends of the range behave. C(n, n) = 1 for the same reason at the other end.

**The mirror.** C(10, 8) = 45 and C(10, 2) = 45. Not a coincidence: choosing 8 things to take is the same act as choosing 2 to leave behind. Pair every 8-subset with its 2-element complement; the pairing hits each side exactly once, so the two counts must be equal.

**C(n, k) = C(n, n − k)**

Pairing two collections up one-to-one to prove they are the same size is called a **bijection**. It is the cheapest proof in counting, because you never have to compute either side. It is also practical: always count the smaller side.`, {
      terms: [
        ['Complement', 'The items you did not choose. Choosing k from n also chooses the other n − k.'],
        ['Bijection', 'A perfect one-to-one pairing between two collections, proving they have the same size.'],
        ['0! = 1', 'One way to arrange nothing. It is what keeps C(n, 0) = 1 falling out of the formula.'],
      ]
    }),
    q.info('M', "Pascal's rule: ask whether one particular item is in", `Take C(6, 2): choosing 2 people from 6. Fix your attention on one of them, Ann. Every possible choice either includes Ann or it does not, and no choice does both.

- **Includes Ann.** The other 1 place is filled from the remaining 5: C(5, 1) = 5.
- **Excludes Ann.** Both places come from the remaining 5: C(5, 2) = 10.

Nothing is counted twice and nothing is missed, so C(6, 2) = 5 + 10 = **15**.

The argument never used the numbers 6 and 2, so it holds in general:

**C(n, k) = C(n − 1, k − 1) + C(n − 1, k)**

Stack the answers in rows and each entry is the sum of the two above it: that is Pascal's triangle, and it lets you build the numbers with additions only, which is exactly what you want in hardware.

One free extra: a whole row adds up to 2ⁿ. Choosing *any* subset of n items is n independent in-or-out decisions, which is 2ⁿ, and grouping those subsets by size gives the row.`, {
      terms: [
        ['Pascal\'s rule', 'C(n, k) = C(n−1, k−1) + C(n−1, k), from asking whether one fixed item is included.'],
        ['Case split', 'Breaking a count into groups that overlap nowhere and miss nothing, then adding.'],
        ['Row sum', 'The entries of row n add to 2ⁿ, the number of all subsets of n items.'],
      ],
      widget: W('pascal', { rows: 8, target: [6, 2] })
    }),
    q.info('M', 'Computing C(n, k) without exploding', `C(52, 5) = 2,598,960, a small number. But 52! has 68 digits, so computing it as n!/(k!(n−k)!) builds an enormous value and then divides it away again. In Python that is merely slow; in fixed-width hardware or C it overflows, and 13! already passes 2³² (Day 9).

Multiply and divide alternately instead:

C(n, k) = (n / 1) × ((n − 1) / 2) × ((n − 2) / 3) × … , k factors in all.

After i steps the running value is exactly C(n, i), which is a whole number, so no division ever leaves a remainder and the value never grows past the answer.

Take the smaller side first as well: C(52, 47) = C(52, 5), five factors instead of forty-seven.

Two size estimates worth carrying: C(n, k) ≤ 2ⁿ, and the middle entry C(n, n/2) is roughly 2ⁿ/√n. Counting answers grow fast, so the register that holds the count has to be sized for the count, not for n.`, {
      terms: [
        ['Multiplicative formula', 'Building C(n, k) by alternately multiplying and dividing, so nothing ever exceeds the answer.'],
        ['Overflow', 'A result too big for its fixed width. Factorials reach it long before the combination does.'],
        ['Middle binomial', 'C(n, n/2), the largest entry of a row, about 2ⁿ/√n.'],
      ]
    }),
    q.goal('M', "In Pascal's triangle, click the entry that equals **C(6, 2)** — row 6, position 2, counting rows and positions from 0.", W('pascal', { rows: 8, target: [6, 2] }), s => s.n === 6 && s.k === 2,
      'Row 6 reads 1, 6, 15, 20, 15, 6, 1. Position 2 is 15, and the two entries above it are C(5,1) = 5 and C(5,2) = 10: 5 + 10 = 15.'),
    q.num('M', 'How many ways are there to choose 3 items from 5 when order does not matter? (That is C(5, 3).)', 10, 'Ordered: 5 × 4 × 3 = 60. Each unordered set of 3 appears in 3! = 6 orders, so 60/6 = 10.'),
    q.num('M', 'How many ways are there to choose 2 items from 6 when order does not matter? (That is C(6, 2).)', 15, '6 × 5 = 30 ordered pairs, each set counted 2! = 2 times: 30/2 = 15.'),
    q.mc('M', 'Choosing 3 letters from 5 gives 5 × 4 × 3 = 60 ordered lists. Why is dividing by 3! the right way to get the number of unordered sets?', ['Every set of 3 letters appears once for each of its 3! orderings, so the 60 lists split into equal piles of 6', 'Because 3 is odd', 'Because it converts combinations into permutations', 'It is a convention with no underlying reason'], 0, 'ABC, ACB, BAC, BCA, CAB, CBA are one set counted six times. Division is only legal because every pile has the same size.'),
    q.num('M', 'How many ways are there to choose 8 items from 10 when order does not matter? (That is C(10, 8).)', 45, 'Choosing 8 to take is choosing 2 to leave: C(10, 8) = C(10, 2) = 10 × 9/2 = 45. Counting the smaller side is much less work.'),
    q.num('M', 'A test suite has 8 tests and you must run exactly 3 of them, in any order. How many different sets of 3 can you run?', 56, 'C(8, 3) = (8 × 7 × 6)/(3 × 2 × 1) = 336/6 = 56.'),
    q.num('M', 'Ten people are in a room and every pair shakes hands exactly once. How many handshakes happen?', 45, 'A handshake is an unordered pair: C(10, 2) = 10 × 9/2 = 45. Counting 10 × 9 would count each handshake once from each end.'),
    q.num('M', 'How many different subsets does a set of 5 elements have, counting the empty set and the whole set?', 32, '2⁵ = 32: each element is independently in or out. Grouping them by size gives row 5 of Pascal\'s triangle, 1 + 5 + 10 + 10 + 5 + 1 = 32.'),
    q.num('M', 'A standard deck has 52 cards and a poker hand is 5 cards with order ignored. How many distinct hands are there?', 2598960, 'C(52, 5) = (52 × 51 × 50 × 49 × 48)/120 = 311,875,200/120 = 2,598,960. Multiply and divide alternately and no intermediate value ever exceeds the answer.'),
    q.num('M', 'Interview: a bag holds 12 balls, 5 of them red and 7 blue. You draw 4 balls at once. How many of the possible selections contain exactly 2 red balls?', 210, 'Choose which 2 of the 5 reds: C(5, 2) = 10. Independently choose which 2 of the 7 blues: C(7, 2) = 21. The two choices are made in stages with fixed counts, so multiply: 10 × 21 = 210. (Out of C(12, 4) = 495 selections in total.)'),
    q.mc('M', 'Interview: without computing either number, which is larger, C(20, 9) or C(20, 10)?', ['C(20, 10): moving k towards n/2 multiplies the count by (n − k)/(k + 1), which is above 1 while k is below n/2', 'C(20, 9), because taking fewer items is always easier', 'They are equal by the symmetry C(n, k) = C(n, n − k)', 'It cannot be decided without evaluating them'], 0, 'C(n, k+1)/C(n, k) = (n − k)/(k + 1). Going from k = 9 to 10 multiplies by 11/10 > 1, so C(20, 10) is larger. The row peaks in the middle, and the symmetry pairs 9 with 11, not with 10.'),
    q.mc('M', 'Interview: give the counting argument for why C(n, 0) + C(n, 1) + … + C(n, n) = 2ⁿ.', ['Both sides count all subsets of n items: the left side groups them by size, the right side decides in-or-out for each item independently', 'Both sides are equal because the binomial theorem says so, with no counting meaning', 'Because each term is at most 2ⁿ and there are n + 1 terms', 'Because Pascal\'s triangle is symmetric'], 0, 'Counting one collection two ways is the standard proof technique: the collection is "all subsets", size 2ⁿ by the in-or-out argument, and also the sum of the counts of subsets of each size.'),

    // =====================================================================================================
    // DEGREE: capacitors and the RC time constant (E01 L3, EEEN11101)
    // =====================================================================================================
    q.info('E', 'What a capacitor actually does', `Two metal plates with a gap. Charge cannot cross the gap, so when you push charge onto one plate it sits there, and an equal amount is pushed off the other. The plates now hold opposite charges, and that separation is what a voltmeter reads as a voltage across the device.

Push twice as much charge on and you get twice the voltage. So charge divided by voltage is a constant of that particular object:

**q = C·v**, where C is the **capacitance**, measured in farads (one coulomb per volt).

A farad is enormous; real parts are microfarads (10⁻⁶ F) and below.

Now look at how it changes. Current is charge arriving per second, so i = dq/dt = **C·dv/dt**. Read it as a sentence: a capacitor's voltage moves only while current flows into it, and the bigger the current the faster it moves.

Two things follow immediately. Its voltage **cannot jump**, because a jump would need infinite current. And with no current flowing it simply holds whatever voltage it reached — which is why capacitors are used for memory, filtering and timing.`, {
      terms: [
        ['Capacitor', 'Two conductors separated by an insulator. It stores charge by separating it, not by letting it through.'],
        ['Capacitance C', 'Charge stored per volt: C = q/v. A property of the object, set by plate area, spacing and the insulator.'],
        ['Farad (F)', 'One coulomb per volt. 1 µF = 10⁻⁶ F, 1 nF = 10⁻⁹ F.'],
        ['i = C·dv/dt', 'Current into a capacitor equals capacitance times the rate its voltage changes.'],
        ['Continuous voltage', 'A capacitor voltage cannot step instantly, because that would require infinite current.'],
      ]
    }),
    q.info('E', 'Why charging follows an exponential', `Connect a battery of V volts through a resistor R to an uncharged capacitor C, and close the switch.

At the first instant the capacitor is at 0 V, so the whole V sits across the resistor and the current is at its largest, V/R. That current pushes charge in, so the capacitor's voltage rises — and now less voltage is left for the resistor, so the current is smaller and the rise is slower. **The circuit slows itself down as it fills.**

As one equation: round the loop, V = i·R + v, and i = C·dv/dt, so

**R·C·dv/dt = V − v**

The right-hand side is *how far there is left to go*. The speed of the rise is proportional to the remaining gap.

Call that gap g = V − v. Then dg/dt = −g/(RC): the gap loses a fixed **fraction** of itself in every equal slice of time. That is exactly what an exponential does, so g = V·e^(−t/RC), and

**v(t) = V(1 − e^(−t/RC))**

Nothing exponential was assumed. It came out of "the rate is proportional to what is left".`, {
      terms: [
        ['Step response', 'What a circuit does when its input jumps from 0 to V and stays there.'],
        ['Gap (remaining distance)', 'V − v, how far the capacitor still has to go. Its decay is what the exponential describes.'],
        ['Exponential decay', 'A quantity that loses the same fraction of itself in every equal time interval.'],
        ['Steady state', 'Where the circuit settles once nothing is changing: here v = V and the current is zero.'],
      ],
      widget: W('rc', { R: 1000, C: 1, V: 5 })
    }),
    q.info('E', 'τ = RC, and where 63 % comes from', `The product RC appears everywhere in that solution, so it gets a name: the **time constant**, **τ = R·C**.

It really is a time. R is volts per amp and C is coulombs per volt, so RC is coulombs per amp; an amp is a coulomb per second, so the units cancel down to seconds. 1 kΩ × 1 µF = 1 ms.

Put t = τ into v = V(1 − e^(−t/τ)) and you get v = V(1 − e⁻¹) = V × 0.632. So **63.2 % is not a rule to memorise** — it is simply what 1 − 1/e comes to. One τ later the *remaining* gap has shrunk by another factor of e, and so on:

| time | fraction of V reached |
|---|---|
| τ | 63.2 % |
| 2τ | 86.5 % |
| 3τ | 95.0 % |
| 5τ | 99.3 % |

There is a good picture too. Draw the tangent to the curve at t = 0 and it reaches the final value at exactly t = τ. So τ is how long charging would take **if it never slowed down**.`, {
      terms: [
        ['Time constant τ', 'τ = RC, in seconds. Sets how fast the exponential settles; it does not change the final value.'],
        ['1 − 1/e', 'The fraction reached after one τ: 0.632. The origin of the "63 %" figure.'],
        ['Initial tangent', 'The slope at t = 0 is V/τ, so extending it would hit V at exactly t = τ.'],
        ['Five taus', 'A common engineering rule for "settled": 99.3 % of the way there.'],
      ],
      widget: W('rctime', { R: 1000, C: 1, pct: 63, goalPct: 90 })
    }),
    q.info('E', 'How long to reach a given level', `Turn v = V(1 − e^(−t/τ)) around. To reach a fraction f of the final value:

**t = −τ · ln(1 − f)**

For 90 %: −ln(0.1) = ln 10 = 2.303, so **t = 2.303 τ**. With τ = 1 ms that is 2.303 ms. For 99 %: ln 100 = 4.605 τ.

Notice the pattern: every extra factor of ten in accuracy costs another 2.303 τ. Accuracy is bought in equal instalments of time, never all at once, which is why "wait a bit longer" stops helping quickly.

Discharging is the same story with the target at zero: **v(t) = V₀ · e^(−t/τ)**. After one τ, 36.8 % is left; the time to fall to half is τ·ln 2 = 0.693 τ.

This is how R and C get chosen. An analogue-to-digital converter that must settle to within one part in 2¹³ needs t = 13 · ln 2 · τ ≈ 9 τ before it is allowed to sample. Too large a τ and the conversion is late; too small and the circuit passes more noise.`, {
      terms: [
        ['Settling time', 'How long until the output is within a stated accuracy of its final value.'],
        ['Discharge', 'v = V₀e^(−t/τ): the same exponential heading down to zero instead of up to V.'],
        ['Half-life', 'τ·ln 2 = 0.693 τ, the time to cover half the remaining gap.'],
        ['LSB', 'One step of a converter: full scale divided by 2ⁿ for n bits. Settling is quoted against it.'],
      ]
    }),
    q.goal('E', 'In the RC simulation, set the target percentage to **90 %** and read off how many time constants it takes.', W('rctime', { R: 1000, C: 1, pct: 63, goalPct: 90 }), s => s.pct === 90,
      't = −τ·ln(1 − 0.9) = τ·ln 10 = 2.303 τ. With R = 1 kΩ and C = 1 µF, τ = 1 ms, so 90 % is reached at 2.303 ms.'),
    q.num('E', 'A 10 µF capacitor has 5 V across it. How much charge is stored, in microcoulombs?', 50, 'q = C·v = 10 × 10⁻⁶ F × 5 V = 50 × 10⁻⁶ C = 50 µC.', { unit: 'µC' }),
    q.num('E', 'The voltage across a 1 µF capacitor is rising steadily at 2 volts per millisecond. What current is flowing into it, in milliamps?', 2, 'i = C·dv/dt = 10⁻⁶ F × 2000 V/s = 2 × 10⁻³ A = 2 mA. Note the rate must be in volts per second before it meets a capacitance in farads.', { unit: 'mA' }),
    q.mc('E', 'A 5 V step is applied through a resistor to an uncharged capacitor. At what moment is the current largest, and why?', ['At t = 0: the capacitor is still at 0 V, so the whole 5 V is across the resistor', 'At t = τ, when the capacitor has reached 63 % of 5 V', 'Once the capacitor is fully charged, because it then holds the most energy', 'The current is constant throughout the charge'], 0, 'The resistor sees V − v. That is largest at the start, when v = 0, giving i = V/R, and it falls to zero as v approaches V.'),
    q.num('E', 'A 1 kΩ resistor charges a 1 µF capacitor from a voltage step. What is the time constant, in milliseconds?', 1, 'τ = R·C = 1000 Ω × 10⁻⁶ F = 10⁻³ s = 1 ms.', { unit: 'ms' }),
    q.num('E', 'A 10 kΩ resistor charges a 4.7 µF capacitor from a voltage step. What is the time constant, in milliseconds?', 47, 'τ = 10,000 × 4.7 × 10⁻⁶ = 0.047 s = 47 ms.', { unit: 'ms' }),
    q.mc('E', 'Why does resistance × capacitance come out in seconds?', ['Ohms are volts per amp and farads are coulombs per volt, so their product is coulombs per amp — and an amp is a coulomb per second', 'It is a definition with no dimensional justification', 'Because both R and C are measured relative to one second', 'It does not; τ is in seconds only when C is in farads and R in kilohms'], 0, '(V/A) × (C/V) = C/A = C/(C/s) = s. Checking units this way catches a wrong formula faster than anything else.'),
    q.num('E', 'A capacitor charges from 0 towards a final value through a resistor. What percentage of the final voltage has it reached at t = τ? (whole number)', 63, 'v = V(1 − e⁻¹) = V × 0.6321, so 63 %. The number is just 1 − 1/e.', { unit: '%', tol: 1 }),
    q.num('E', 'A capacitor charges from 0 towards a final value through a resistor. What percentage of the final voltage has it reached at t = 2τ? (1 d.p.)', 86.5, '1 − e⁻² = 1 − 0.1353 = 0.8647 → 86.5 %. Each further τ removes another factor of e from the gap that is left.', { unit: '%', tol: 0.2 }),
    q.num('E', 'A 1 kΩ resistor charges a 1 µF capacitor from a step. How long does it take to reach 90 % of the final value, in milliseconds (3 d.p.)?', 2.303, 't = −τ·ln(1 − 0.9) = τ·ln 10 = 1 ms × 2.30259 = 2.303 ms.', { unit: 'ms', tol: 0.005 }),
    q.mc('E', 'A resistor charges a capacitor from a fixed voltage step. Doubling the resistance while keeping the capacitance the same…', ['doubles τ, so the charge takes twice as long, but the final voltage is unchanged', 'halves τ', 'leaves τ unchanged', 'doubles the final voltage'], 0, 'τ = RC is proportional to R. The final voltage is set by the source, since no current flows once charging has finished and so the resistor drops nothing.'),
    q.num('E', 'A capacitor charged to 10 V is disconnected from its source and discharges through a resistor, with a time constant of 2 ms. What is its voltage after 5 ms, in volts (2 d.p.)?', 0.82, 'Discharging: v = V₀·e^(−t/τ) = 10 × e^(−5/2) = 10 × 0.08208 = 0.821 V.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'Exam-style: a 5 V step is applied at t = 0 to a 2.2 kΩ resistor in series with an uncharged 100 nF capacitor. Find the time constant, in microseconds.', 220, 'τ = R·C = 2200 Ω × 100 × 10⁻⁹ F = 2.2 × 10⁻⁴ s = 220 µs.', { unit: 'µs', tol: 1 }),
    q.num('E', 'Exam-style: a 5 V step is applied at t = 0 to a 2.2 kΩ resistor in series with an uncharged 100 nF capacitor. Find the capacitor voltage at t = 500 µs, in volts (2 d.p.).', 4.48, 'τ = 220 µs, so t/τ = 500/220 = 2.2727. v = 5(1 − e^(−2.2727)) = 5(1 − 0.1031) = 4.48 V.', { unit: 'V', tol: 0.03 }),
    q.num('E', 'Exam-style: a 5 V step is applied at t = 0 to a 2.2 kΩ resistor in series with an uncharged 100 nF capacitor. How long does the capacitor voltage take to reach 4.0 V, in microseconds (nearest whole number)?', 354, 't = −τ·ln(1 − 4/5) = −220 × ln(0.2) = 220 × 1.6094 = 354 µs.', { unit: 'µs', tol: 3 }),
    q.num('E', 'Exam-style: a sample-and-hold circuit charges through an RC network with τ = 1.0 µs and must settle to within one part in 2¹³ of its final value before the converter samples. Find the required settling time, in microseconds (2 d.p.).', 9.01, 'Need e^(−t/τ) < 2⁻¹³, so t = 13·ln 2 · τ = 13 × 0.6931 × 1.0 µs = 9.01 µs. Each extra bit of accuracy costs one further ln 2 = 0.693 τ.', { unit: 'µs', tol: 0.05 }),
    q.num('E', 'Exam-style: an RC circuit with a time constant of 4.7 ms charges from 0 V towards 5 V. How long does the capacitor take to reach 4.0 V, in milliseconds (2 d.p.)?', 7.56, 't = −τ·ln(1 − 4/5) = 4.7 × ln 5 = 4.7 × 1.6094 = 7.56 ms.', { unit: 'ms', tol: 0.05 }),
    ...genius(q, 10),
  ]
};
