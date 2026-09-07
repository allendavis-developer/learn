import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(5);

// Rewritten to the standing content rules (C:\dev\study\CLAUDE.md + app/CONTENT_GUIDE.md):
// short plain cards (90-220 words), why before what, every prompt self-contained,
// a code exercise in H and in S, and Exam-style / Interview questions closing every strand.
export default {
  title: 'Sign extension, aliasing, coin flips, Thévenin',
  emoji: '📏',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Week 1, day 5. **Hardware** (H01 L1): why widening a signed value means copying the sign bit (the negative weight telescopes), why zero-extension destroys a negative number, exactly when truncation is safe, what a truncation warning is really asking, and a Python model that resizes a pattern and reports whether information was lost. **Code** (S01 L1): a name is an arrow, not a box; why Python never copies on assignment; why integers hid this from you; shallow versus deep copy; the `dict.fromkeys` and mutable-default traps. **Maths** (M05 L1): a random variable as a function from outcome to number, the 1-3-3-1 distribution of heads in three flips, and the mean as a balance point the coins never show. **Degree** (E01 L2): why any linear two-terminal network is one source behind one resistor, finding Vth and Rth two ways, why "turning a source off" means shorting it, and why the unloaded divider voltage is a promise it cannot keep.',
  takeaway: 'Widen by copying the **sign bit**: the new weight −2^(k+1) plus the old bit at +2^k equals −2^k, so the value passes through unchanged. Narrowing is exact only when the dropped bits *and* the new sign bit all agree. `b = a` copies the arrow, not the object, and a copy separates exactly one level. Three fair flips give 0, 1, 2, 3 heads with probability 1/8, 3/8, 3/8, 1/8 and mean 1.5. Any linear two-terminal network is **Vth behind Rth**, and a load makes that Rth the top half of a new divider: 5 V behind 500 Ω delivers only 3.33 V into 1 kΩ.',
  steps: [
    // =====================================================================================================
    // HARDWARE: resizing a value without changing what it means (H01 L1)
    // =====================================================================================================
    q.info('H', 'Values get resized all day, and the two directions differ', `A bundle of wires in a chip has a fixed number of wires. An 8-bit sensor reading has to enter a 16-bit accumulator. A 17-bit sum has to leave through a 16-bit port. So "make this value w bits wide" happens on almost every line of real hardware.

Resizing goes two ways, and the risk is completely different.

**Widening** — more bits than you need — should never change the value. There is always room. So if the value comes out different, you picked the wrong rule, and that is entirely your mistake to find.

**Narrowing** — fewer bits — might have to change the value, because the room may genuinely not be there. The question is no longer "which rule" but "have I proved it fits?".

When a tool prints \`truncated to 8 bits\` it is telling you it dropped some wires and has no idea whether that mattered. The handbook's standard for this unit: explicit widths and signed casts, **no unexplained truncation warnings**. A truncation you have proved safe is fine. One you scrolled past is a bug waiting for an unusual input — and it never crashes, it just hands the next block a wrong number that looks perfectly ordinary.`, {
      terms: [
        ['Width', 'How many bits a value occupies. A property of the wires, chosen at design time.'],
        ['Widening / narrowing', 'Moving a value to more / fewer bits.'],
        ['Truncation warning', 'A tool message saying bits were dropped in an assignment. It is a question about a range, not noise.'],
        ['Cast', 'An explicit instruction saying how to resize or reinterpret a value, written by you rather than inferred.'],
        ['Silent failure', 'A wrong result that looks like a right one. Width bugs are the classic source.'],
      ]
    }),
    q.info('H', 'Widening a signed value: copy the sign bit', `Day 2 fixed the meaning of a signed pattern: every bit has its usual weight except the top one, which is **negative**, −2^(w−1). So 8-bit \`11110110\` is −128 + 64 + 32 + 16 + 4 + 2 = **−10**.

Widen it to 9 bits by copying the top bit: \`111110110\`. Follow the arithmetic. The new top bit is worth −256. The old top bit is still 1 but has moved into an ordinary position, so it is now worth **+128**. Together: −256 + 128 = −128 — exactly what the single sign bit contributed before. Nothing else moved, so the value is unchanged.

That argument repeats at every step: −2^(k+1) + 2^k = −2^k. Half of each new negative weight is cancelled by the promoted old bit, so you can copy the sign bit as many times as you like.

For a positive number the sign bit is 0, and copying zeros adds nothing. One rule covers both signs: **replicate the MSB**.

Padding with 0s instead is **zero-extension**. Right for unsigned values. Fatal for a negative one: \`11110110\` becomes \`000011110110\`, top bit 0, which reads as **+246**. The bits survived; the meaning did not.`, {
      terms: [
        ['Sign bit / MSB', 'The top bit. In two\'s complement it carries the negative weight −2^(w−1), so it decides the sign.'],
        ['Sign extension', 'Widening by replicating the MSB. Preserves a signed value at any new width.'],
        ['Zero extension', 'Widening by padding with 0s. Preserves an unsigned value; turns a negative signed value into a large positive one.'],
        ['Telescoping weights', 'Why replication works: −2^(k+1) + 2^k = −2^k, so the extra copy restores the old contribution exactly.'],
        ['Wire-only operation', 'Both extensions cost zero gates: the new bits are copies of an existing wire.'],
      ],
      widget: W('signext', { value: 0b11110110, from: 8, to: 12 })
    }),
    q.mc('H', 'Sign-extend the 8-bit signed value `11110110` (which is −10) to 12 bits. Which pattern results?', ['111111110110', '000011110110', '111101100000', '000000001010'], 0, 'Copy the sign bit (1) into the four new positions. The new top weight −2048, plus ones at +1024, +512, +256 and +128, totals −128 — what the old sign bit contributed. Still −10.', { grid: true }),
    q.mc('H', 'The 8-bit pattern `11110110` means −10 as a signed value. It is **zero-extended** to 12 bits and then read as a signed 12-bit number. What is it now?', ['+246: the negative value was destroyed', 'still −10', '−246', '0'], 0, 'Zero-extension gives 000011110110. Its top bit is 0, so no negative weight applies: 128 + 64 + 32 + 16 + 4 + 2 = 246.'),
    q.text('H', 'Sign-extend the 4-bit signed value `1011` (which is −5) to 8 bits. Write the 8-bit pattern.', ['11111011'], '1011 = −8 + 2 + 1 = −5. Replicate the sign bit 1 four times: 11111011 = −128 + 64 + 32 + 16 + 8 + 2 + 1 = −5.', { mono: true, accept: ['^11111011$'] }),
    q.mc('H', 'Why does replicating the MSB preserve a two\'s-complement value, rather than being an arbitrary convention?', ['The new top bit contributes −2^(k+1) while the old top bit, now in an ordinary position, contributes +2^k, and −2^(k+1) + 2^k = −2^k: the original contribution is restored exactly', 'Because negative numbers are defined as having leading ones', 'Because synthesis tools zero the extra bits anyway', 'Because two\'s complement stores the sign separately from the magnitude'], 0, 'It is arithmetic, not convention. Half of the new negative weight is cancelled by the promoted bit, which is why any number of copies is safe.'),
    q.mc('H', 'A designer widens an **unsigned** 8-bit count to 16 bits by replicating its top bit. What happens?', ['Any count of 128 or more becomes a huge wrong value, because the replicated 1s add weight an unsigned value never had', 'Nothing: sign extension is always safe', 'The count is halved', 'The tool refuses to compile'], 0, 'Unsigned 200 is 11001000; replicating its top bit gives 1111111111001000 = 65,480. Unsigned values want zero-extension. The bits cannot tell you which rule to use — only your stated intent can.'),
    q.info('H', 'Narrowing: truncation is exact only when the value already fitted', `**Truncation** keeps the low n bits and throws the rest away. Like sign extension it is pure wiring — you simply do not connect the top wires. The only question is when it is right.

Unsigned is easy. The dropped bits carry weights 2^n and above, so the value survives only if **every dropped bit is 0**. The 9-bit pattern \`100000000\` is 256; truncated to 8 bits it becomes \`00000000\` = **0**. The one bit carrying the whole value was the one thrown away, and what comes out is an ordinary-looking zero.

Signed has a twist: the bit that *becomes* the new top bit changes weight, from +2^(n−1) to −2^(n−1). Rather than track that, use the shortcut. Truncation is the exact inverse of sign extension, so it is safe precisely when the wide pattern looks like a sign-extended narrow one:

> **safe if and only if bits w−1 down to n−1 are all equal** — every dropped bit *and* the new sign bit.

Say it as a range in a design review: safe exactly when the value already lies in −2^(n−1) … 2^(n−1) − 1. Sixteen bits down to eight means the top **9** bits must match, i.e. the value is in −128 … 127.

So: prove the range, then truncate. If you cannot prove it, widen the destination or clamp deliberately (Day 9) — at least clamping fails at the limit instead of teleporting across the number line.`, {
      terms: [
        ['Truncate', 'Keep the low n bits, discard the rest. Free in gates, expensive in meaning.'],
        ['Redundant sign bits', 'The leading copies of the sign bit a value does not need. Only these may be dropped.'],
        ['Range proof', 'The argument that a value must lie in −2^(n−1) … 2^(n−1) − 1, which is what makes the truncation exact.'],
        ['Silent wrap', 'What truncation does when the range proof fails: the value reappears as a different, legal-looking number.'],
        ['Saturation (preview)', 'Clamping to the largest or smallest representable value instead of wrapping. Day 9.'],
      ],
      widget: W('truncate', { from: 12, to: 8, value: 0b111111110110, signed: true })
    }),
    q.goal('H', 'The truncation simulator narrows the 12-bit signed pattern `1111 1111 0110` (= −10) to 8 bits, which is currently **safe**. Tap one of the four dashed (dropped) bits so that the narrowed value no longer equals the wide one.', W('truncate', { from: 12, to: 8, value: 0b111111110110, signed: true }), s => s.safe === false,
      'The dropped bits are 1111 and the new sign bit is 1: all five agree, so nothing is lost. Clear any dropped bit — say the top one, giving 0111 1111 0110 = +2038 — and they no longer agree, while the 8-bit result is still −10.'),
    q.num('H', 'The 9-bit unsigned value `100000000` (= 256) is truncated to 8 bits. What value results?', 0, 'The only set bit had weight 256, and it was the one discarded. The result is 00000000 = 0.'),
    q.tf('H', 'Truncating a signed 16-bit value down to 8 bits is exact whenever the value lies between −128 and 127 inclusive.', true, 'In that range the top nine bits are all copies of one sign bit, so dropping eight of them removes only redundancy. Outside it, some dropped bit disagrees with the new sign bit and the value changes.'),
    q.num('H', 'For a signed value to be truncated from 16 bits to 8 bits with no change, how many of the leading bits must all be identical?', 9, 'The eight dropped bits plus the bit that becomes the new sign bit: 9. Equivalently, the 16-bit value must be a sign-extension of some 8-bit value.'),
    q.num('H', 'The 8-bit signed pattern `11111011` is truncated to 4 bits. What decimal value does the 4-bit result represent?', -5, 'The low four bits are 1011 = −8 + 2 + 1 = −5, and the wide value was also −5. The five leading bits all agree, so nothing was lost.'),
    q.num('H', 'The 12-bit unsigned pattern `000100000110` (= 262) is truncated to 8 bits. What unsigned value results?', 6, 'The dropped bits are 0001, carrying 256. What is left is 00000110 = 6, so the truncation was not exact.'),
    q.mc('H', 'Which sentence states when a signed truncation from w bits to n bits is exact?', ['When bits w−1 down to n−1 are all equal, so the wide pattern is a sign-extension of the narrow one', 'When the value is positive', 'When the dropped bits are all zero', 'When the addition that produced it had no carry-out'], 0, 'All dropped bits *and* the new sign bit must agree. "Dropped bits all zero" is the unsigned test and would wrongly reject every negative value.'),
    q.info('H', 'Where widths get lost in real HDL', `In Verilog the resize rule is chosen for you by the **declaration**, which is why declarations matter more than they look:

\`\`\`
logic signed [7:0]  a;
logic signed [15:0] b;
b <= a;              // sign-extends: both sides are signed
\`\`\`

Drop the word \`signed\` from \`a\` and that same line zero-extends instead, quietly turning −10 into 246.

There is a second rule that catches everyone once: if **any** operand in an expression is unsigned, the whole expression is evaluated as unsigned. One stray unsigned operand can change the result of an entire line, not just its own term. The cure is to declare signedness on purpose and write \`$signed(...)\` where you mean a reinterpretation.

Going the other way, \`narrow <= wide;\` drops the top wires and gives you a warning at best. Three honest replies to that warning:

1. prove the range and say so in a comment, then truncate on purpose with an explicit bit-select;
2. widen the destination so the question disappears;
3. clamp deliberately and raise a flag.

Scrolling past is not on the list.`, {
      terms: [
        ['signed declaration', 'Marking a vector as signed so the tools sign-extend and compare it correctly. Unsigned is the default.'],
        ['Implicit conversion', 'Verilog\'s rule that one unsigned operand makes the whole expression unsigned.'],
        ['$signed / $unsigned', 'Explicit casts stating how a pattern should be read, instead of relying on inference.'],
        ['Bit-select', 'Writing the range you mean, e.g. wide[7:0], so a truncation is visible and reviewable in the source.'],
      ]
    }),
    q.mc('H', 'Interview: a colleague widens a signed 8-bit sample into a 16-bit register with `assign wide = {8\'b0, sample};`. What is the bug and the one-line fix?', ['It zero-extends, so a negative sample becomes a large positive number; write `assign wide = {{8{sample[7]}}, sample};`, or declare both signed and assign directly', 'No bug: concatenation always preserves the value', 'The concatenation is too wide and will be truncated', 'It sign-extends where it should zero-extend'], 0, 'The literal 8\'b0 pads with zeros. Replicating the sample\'s own top bit is the sign extension; declaring both operands signed makes the tool do it for you.'),
    q.mc('H', 'Interview: your synthesis log says "expression truncated to 8 bits". What is an acceptable response in a design review?', ['Give the argument that the value can never leave −128 … 127 (or 0 … 255 unsigned), and make the truncation explicit in the source', 'Note that the testbench passes, so the warning is cosmetic', 'Raise the lint threshold so the message stops appearing', 'Add a comment saying the tool is being conservative'], 0, 'A truncation warning is a question about a range, so only a range argument answers it. Passing tests say nothing about inputs the tests never produced, and that is exactly where width bugs live.'),
    q.num('H', 'Interview: a 12-bit signed ADC sample (range −2048 … 2047) is written to an 8-bit signed port, so only values in −128 … 127 survive the truncation. How many of the 4096 possible sample values would come out as a different number?', 3840, '4096 values in the 12-bit range, 256 of them safe: 4096 − 256 = 3840, which is 94 % of the range. That is why the port width, not the register width, is the thing to argue about.'),
    q.code('H', 'Build: write `solve(pattern, w_in, w_out, signed)`, a model of resize logic. `pattern` is a raw bit pattern as a non-negative integer that fits in `w_in` bits. Return `[out_pattern, lost]`: `out_pattern` is the raw `w_out`-bit pattern (again a non-negative integer) and `lost` is `True` only when the represented value changed. Widening (`w_out >= w_in`) sign-extends when `signed` is true and zero-extends otherwise, and never loses anything. Narrowing keeps the low `w_out` bits. Widths as small as 1 must work.', {
      fn: 'solve',
      starter: 'def solve(pattern, w_in, w_out, signed):\n    p = pattern & ((1 << w_in) - 1)\n    # 1. read p as a number, giving the top bit its negative weight when signed\n    value = p\n    # 2. widening: re-encode that number at the new width\n    # 3. narrowing: keep the low w_out bits, read them back, compare with value\n    return [p, False]\n',
      tests: [
        { args: [246, 8, 12, true], expect: [4086, false], name: '11110110 (−10) sign-extended to 12 bits' },
        { args: [246, 8, 12, false], expect: [246, false], name: 'zero-extended instead, it stays 246' },
        { args: [256, 9, 8, false], expect: [0, true], name: '9-bit 256 truncated to 8 bits becomes 0' },
        { args: [246, 8, 4, true], expect: [6, true], name: '−10 truncated to 4 bits becomes +6' },
        { args: [251, 8, 4, true], expect: [11, false], name: '−5 truncated to 4 bits is still −5' },
        { args: [10, 8, 4, false], expect: [10, false], name: 'unsigned 10 fits in 4 bits' },
        { args: [262, 12, 8, false], expect: [6, true], name: 'unsigned 262 truncated to 8 bits becomes 6' },
        { args: [5, 4, 4, true], expect: [5, false], name: 'same width: nothing happens' },
        { args: [1, 1, 8, true], expect: [255, false], name: 'width 1 signed: pattern 1 means −1, so 8 bits is all ones' },
        { args: [8, 4, 8, true], expect: [248, false], name: 'the most negative 4-bit value, −8, widens to 11111000' },
        { args: [0, 4, 2, true], expect: [0, false], name: 'zero survives every resize' },
      ],
      gen: 'def gen():\n    for _ in range(60):\n        wi = random.randint(1, 12)\n        wo = random.randint(1, 16)\n        yield [random.randint(0, (1 << wi) - 1), wi, wo, random.random() < 0.5]',
      refCode: 'def ref(pattern, w_in, w_out, signed):\n    p = pattern & ((1 << w_in) - 1)\n    v = p - (1 << w_in) if signed and (p >> (w_in - 1)) & 1 else p\n    if w_out >= w_in:\n        return [v & ((1 << w_out) - 1), False]\n    o = p & ((1 << w_out) - 1)\n    nv = o - (1 << w_out) if signed and (o >> (w_out - 1)) & 1 else o\n    return [o, nv != v]',
      solution: 'def solve(pattern, w_in, w_out, signed):\n    p = pattern & ((1 << w_in) - 1)\n    if signed and (p >> (w_in - 1)) & 1:\n        value = p - (1 << w_in)\n    else:\n        value = p\n    if w_out >= w_in:\n        return [value & ((1 << w_out) - 1), False]\n    out = p & ((1 << w_out) - 1)\n    if signed and (out >> (w_out - 1)) & 1:\n        new_value = out - (1 << w_out)\n    else:\n        new_value = out\n    return [out, new_value != value]'
    }, 'Decoding is Day 2: if the top bit is set and the value is signed, subtract 2^w to give that bit its negative weight. Widening is then just re-encoding the same number at the new width, and `value & ((1 << w_out) - 1)` does it for negatives too, because Python treats a negative integer as if it had endless leading 1s — which is sign extension. Narrowing keeps the low bits and asks the only question that matters: does the pattern still mean the same number? Comparing decoded values gets both the signed and unsigned rules right in one line, and works at width 1, where the signed range is just −1 … 0.'),

    // =====================================================================================================
    // CODE: names, objects and aliasing (S01 L1)
    // =====================================================================================================
    q.info('S', 'A name is an arrow, not a box', `\`a = [1, 2]\` does two separate things. It builds a list **object** in memory, and it points the **name** \`a\` at that object.

\`b = a\` does only the second thing again. It points \`b\` at the *same* object. Nothing was copied.

Why would a language work that way? Because assignment has to be cheap. If \`b = a\` copied, assigning a million-element list would cost a million operations, and the cost of a line would depend on data you cannot see from that line. Python's rule is uniform: **assignment copies the arrow, never the object** — and the same goes for passing an argument, storing into a list, and returning a value.

The consequence is **aliasing**: two names, one object. \`b.append(3)\` changes that one list, and \`a\` shows \`[1, 2, 3]\`, because there is nothing else for it to show.

Why did numbers never behave like this? After \`x = 5; y = x; x = 6\`, \`y\` is still 5. That looks like proof that assignment copies. It is not. \`x = 6\` points x at a different object and never touches the object 5 — nothing could, because an \`int\` cannot be changed in place. Lists, dicts and sets can. That is where the box picture finally breaks and the arrow picture keeps working.`, {
      terms: [
        ['Object', 'A value living in memory, with an identity of its own.'],
        ['Name (binding)', 'A label pointing at an object. Assignment creates or moves the label.'],
        ['Rebinding', 'Pointing an existing name at a different object (x = 6). Invisible to every other name.'],
        ['Mutation', 'Changing an object in place (append, item assignment, sort). Visible through every name that points at it.'],
        ['Mutable / immutable', 'Can be changed in place (list, dict, set) / cannot (int, float, str, tuple).'],
        ['is vs ==', 'is: the same object. ==: equal contents. a == b can be True while a is b is False.'],
      ],
      widget: W('pyvars', {})
    }),
    q.goal('S', 'In the "names point at objects" stepper, run at least the first three lines (`a = [1, 2]`, `b = a`, `b.append(3)`) and count how many list objects exist.', W('pyvars', {}), s => s.step >= 3,
      'After three lines there is exactly one list object with two arrows pointing at it. That is why a shows [1, 2, 3]: there is no second list for it to show.'),
    q.mc('S', 'After `a = [1, 2]`, then `b = a`, then `b.append(3)`, what does `a` contain?', ['[1, 2, 3]', '[1, 2]', '[3]', 'an error'], 0, 'b = a copied the arrow, not the list, so both names point at one object. Appending through b appends to that object.', { grid: true }),
    q.mc('S', 'After `a = [1, 2]` and `b = a`, what does `a is b` return?', ['True', 'False'], 0, 'is asks whether the names point at the same object, and they do. After c = a.copy(), c == a stays True but c is a becomes False.', { grid: true, shuffle: false }),
    q.mc('S', 'After `p = [1, 2]` and `r = [1, 2]` (two separate list literals), what are `p == r` and `p is r`?', ['p == r is True, p is r is False: equal contents, two different objects', 'both True', 'both False', 'p == r is False, p is r is True'], 0, 'Two literals build two objects. Equal contents make == True; different identities make is False. Appending to one leaves the other alone.'),
    q.mc('S', 'After `x = 5`, then `y = x`, then `x = 6`, what is `y` — and what is the correct reason?', ['5, because x = 6 pointed the name x at a different object and never altered the object 5', '5, because assignment copies the value into a separate box for y', '6, because y follows x', 'an error, because x changed type'], 0, 'Both stories give 5 here, which is why the box picture survives so long. The arrow story is the one that also gets lists right.'),
    q.info('S', 'A copy separates exactly one level', `\`c = a.copy()\` (also \`list(a)\` or \`a[:]\`) builds a **new** list whose slots hold the *same arrows* a's slots held. So \`c is a\` is False, \`c == a\` is True, and \`c.append(9)\` leaves \`a\` alone.

That is a **shallow copy**, and "shallow" is the warning. Take \`a = [[1, 2], [3]]\`. Now \`c = a.copy()\` gives a new outer list pointing at the *same two inner lists*. \`c[0].append(9)\` changes an inner list, so \`a[0]\` becomes \`[1, 2, 9]\` too. The copy separated one level, exactly as promised.

\`copy.deepcopy(a)\` rebuilds every level, so nothing is shared at any depth. It costs time and memory proportional to the whole structure, so it is a decision, not a default.

Two traps follow straight from this:

- \`d = dict.fromkeys(['A', 'B'], [])\` evaluates the empty list **once** and hands every key that one list, so \`d['A'].append(1)\` gives \`{'A': [1], 'B': [1]}\`.
- \`def f(xs=[]):\` evaluates the default once, when the function is *defined*, so every call that omits the argument shares one list and it grows across calls. Use \`xs=None\` and build the list inside.

Why the handbook cares: if a reference model and its expected-result table share one mutable object, changing either updates both and the test passes when it should fail. A test that cannot fail is not a test.`, {
      terms: [
        ['Shallow copy', 'A new container holding the same inner objects. a.copy(), list(a), a[:] and dict(d) are all shallow.'],
        ['Deep copy', 'copy.deepcopy(x): every level rebuilt, nothing shared.'],
        ['Nested structure', 'A container whose elements are themselves containers — the only place shallow and deep differ.'],
        ['Mutable default argument', 'def f(xs=[]): the default object is built once at definition time and shared by every call.'],
        ['Shared-state bug', 'Two things that should be independent turn out to be one object.'],
      ]
    }),
    q.mc('S', 'After `a = [1, 2]`, then `c = a.copy()`, then `c.append(9)`, what does `a` contain?', ['[1, 2]', '[1, 2, 9]', '[9]', '[1, 2, [9]]'], 0, 'copy() built a separate outer list, so appending to c cannot reach a.', { grid: true }),
    q.mc('S', 'After `a = [[1, 2], [3]]`, then `c = a.copy()`, then `c[0].append(9)`, what does `a` contain?', ['[[1, 2, 9], [3]]', '[[1, 2], [3]]', '[[1, 2, 9], [3, 9]]', 'an error'], 0, 'The copy separated only the outer list. Both outer lists still point at the same two inner lists, so appending to c[0] appends to a[0].'),
    q.mc('S', 'You have `a = [[1, 2], [3]]` and need a copy you can change at every level without touching `a`. Which call do you use?', ['copy.deepcopy(a)', 'a.copy()', 'list(a)', 'a[:]'], 0, 'The other three are shallow: a new outer list sharing the same inner lists.', { grid: true }),
    q.mc('S', 'What does `d` contain after `d = dict.fromkeys(["A", "B"], [])` followed by `d["A"].append(1)`?', ['{"A": [1], "B": [1]}: both keys point at one list', '{"A": [1], "B": []}', '{"A": [1]}', 'an error, because lists cannot be dictionary values'], 0, 'fromkeys evaluates the empty list once and stores that single object under every key. Build a new list per key instead.'),
    q.mc('S', 'A function is defined as `def add(item, bag=[]): bag.append(item); return bag`, then called as `add(1)` and then `add(2)`. What does the second call return?', ['[1, 2], because the default list was built once when the function was defined and is shared by every call', '[2], because each call gets a fresh empty list', '[1], because the second call is ignored', 'an error'], 0, 'Default arguments are evaluated once, at definition time. Use bag=None and create the list inside the function.'),
    q.mc('S', 'Inside a function whose parameter is `xs`, which line changes the caller\'s list and which does not?', ['`xs += [9]` changes the caller\'s list (it extends in place); `xs = xs + [9]` builds a new list and moves only the local name', 'Both change the caller\'s list', 'Neither changes the caller\'s list', '`xs = xs + [9]` changes it and `xs += [9]` does not'], 0, 'For lists, += extends in place. The + form builds a new object and the assignment moves only the local name. Two lines that look interchangeable and are not.'),
    q.mc('S', 'Why does the handbook single out aliasing when building a reference model?', ['A model and its expected-result table that share one mutable object will agree whatever the model does, so the test can never fail', 'It makes Python slower', 'It only matters when using C extensions', 'Lists cannot be compared for equality'], 0, 'The danger is not a crash; it is a test that always passes. Two checks that share an assumption can be wrong together.'),
    q.code('S', 'Write `solve(events)`. `events` is a list of `[symbol, price]` pairs in arrival order. Return a dictionary mapping each symbol to the **list of its prices, in arrival order**. Every symbol needs its **own** list: starting one list outside the loop, or using `dict.fromkeys(symbols, [])`, makes every symbol share one list so all the prices land in all of them. A 200,000-event stream must finish inside the time budget.', {
      fn: 'solve',
      starter: 'def solve(events):\n    by_symbol = {}\n    for symbol, price in events:\n        # if this symbol has not been seen, start a NEW list for it, then append\n        pass\n    return by_symbol\n',
      tests: [
        { args: [[[1, 100], [2, 50], [1, 101]]], expect: { 1: [100, 101], 2: [50] } },
        { args: [[]], expect: {}, name: 'no events: an empty dict, not None' },
        { args: [[[7, 5], [7, 5], [7, 6]]], expect: { 7: [5, 5, 6] }, name: 'duplicate prices are kept, in order' },
        { args: [[[1, 1], [2, 2], [3, 3]]], expect: { 1: [1], 2: [2], 3: [3] }, name: 'three symbols must NOT share one list' },
        { args: [[[4, 9]]], expect: { 4: [9] }, name: 'a single event' },
      ],
      checker: 'def check(args, got, expect):\n    return {str(k): list(v) for k, v in dict(got).items()} == {str(k): v for k, v in dict(expect).items()}',
      speed: { gen: 'def gen():\n    return [[[random.randint(0, 255), random.randint(1, 1000)] for _ in range(200000)]]', budgetMs: 1500, label: '200,000 events' },
      solution: 'def solve(events):\n    by_symbol = {}\n    for symbol, price in events:\n        if symbol not in by_symbol:\n            by_symbol[symbol] = []\n        by_symbol[symbol].append(price)\n    return by_symbol'
    }, 'The whole exercise is that `by_symbol[symbol] = []` sits *inside* the loop, so a new object is built per symbol. Written as `shared = []` before the loop, or as dict.fromkeys(symbols, []), every key would hold one arrow to one list and every price would appear under every symbol — which is what test 4 catches. `setdefault(symbol, []).append(price)` and `collections.defaultdict(list)` are the idiomatic forms and both build a fresh list per key. One dictionary lookup and one append per event keeps it linear.'),
    q.mc('S', 'Interview: a function documented as "returns a sorted copy of the input list" is written as `def f(xs): xs.sort(); return xs`. Why does it fail in production even though it returns the right values?', ['`list.sort()` sorts in place, so the caller\'s own list is silently reordered and anything relying on arrival order breaks; `return sorted(xs)` leaves the input alone', 'sort() is slower than sorted()', 'It fails on empty lists', 'It returns None instead of a list'], 0, 'The returned value is right, so tests that only check the return value pass. The bug is the invisible side effect on the caller\'s object.'),
    q.mc('S', 'Interview: you must snapshot `cfg = {"limits": [100, 200]}` so a later experiment cannot disturb the original. Someone proposes `snap = dict(cfg)`. What goes wrong, and what does the fix cost?', ['`dict(cfg)` is shallow, so snap["limits"] is the same list and appending to it changes cfg too; `copy.deepcopy(cfg)` fixes it at a time and memory cost proportional to the whole structure', 'Nothing goes wrong: dict() is a deep copy', 'dict(cfg) raises an error on nested values', 'The fix is to call dict(cfg) twice'], 0, 'A copy separates one level. Deep copying is correct here but not free, which is why long-lived snapshots are often kept as immutable structures instead.'),

    // =====================================================================================================
    // MATHS: the distribution of heads in three flips (M05 L1)
    // =====================================================================================================
    q.info('M', 'Three flips: where 1, 3, 3, 1 comes from', `Flip a fair coin three times. The possible results are the 8 sequences HHH, HHT, HTH, HTT, THH, THT, TTH, TTT. They are equally likely — each flip is fair and unaffected by the others — so each has probability 1/8.

Usually you do not care about the sequence, only about a number attached to it: how many heads. That number is a **random variable**. The name misleads. X is not a number and it is not random; it is a *function* from outcome to number, fixed and known in advance. X(HTH) = 2. The randomness is in which outcome happens.

Group the 8 sequences by their number of heads. Zero: TTT — 1 way. One: HTT, THT, TTH — 3 ways. Two: HHT, HTH, THH — 3 ways. Three: HHH — 1 way. **1, 3, 3, 1.**

Two things follow. Every sequence lands in exactly one group, so the counts must add to 8 and the probabilities 1/8, 3/8, 3/8, 1/8 must add to **1**. That is why every distribution sums to 1 — it is forced, not checked afterwards.

And why 1, 3, 3, 1? Because choosing *which* positions hold the heads is a counting problem: 1 way to pick none, 3 to pick one, 3 to pick two, 1 to pick all. Day 10 names those counts; today, listing them is enough.

The table of value → probability is the **probability mass function**.`, {
      terms: [
        ['Random variable', 'A function from outcome to number, e.g. "number of heads". Fixed and known; only the outcome is random.'],
        ['PMF (probability mass function)', 'The table of value → probability. Sums to 1 because the values split the outcomes with no overlap.'],
        ['Support', 'The values a random variable can take. Here: 0, 1, 2, 3.'],
        ['Partition', 'A split of the outcomes into groups with no overlap and nothing left out.'],
      ],
      widget: W('coins', { n: 3 })
    }),
    q.num('M', 'Three flips of a fair coin are recorded as a sequence such as HTH. How many distinct sequences are there?', 8, '2 choices per flip, three flips: 2 × 2 × 2 = 8, each with probability 1/8.'),
    q.num('M', 'A fair coin is flipped 3 times. What is P(exactly 2 heads)?', 3 / 8, 'HHT, HTH and THH: 3 of the 8 equally likely sequences.', { display: '3/8' }),
    q.num('M', 'A fair coin is flipped 3 times. What is P(at least one head)?', 7 / 8, 'Count the opposite: only TTT has no head, so 1 − 1/8 = 7/8.', { display: '7/8' }),
    q.num('M', 'A fair coin is flipped 3 times. What is P(at least 2 heads)?', 1 / 2, '3/8 (exactly two) + 1/8 (exactly three) = 4/8. Symmetry gives it instantly: with an odd number of flips, "more heads" and "more tails" are equally likely and cover every case.', { display: '4/8 = 1/2' }),
    q.mc('M', 'A student argues: "three flips give four possible results — 0, 1, 2 or 3 heads — so each has probability 1/4." What is wrong?', ['The four values are not equally likely: one head happens in 3 of the 8 sequences and zero heads in only 1, so you may only count at the level of sequences', 'Nothing; 1/4 is correct', 'There are five possible values, not four', 'The probabilities of a count never add to 1'], 0, 'The same trap as Day 1\'s dice combinations. Counting needs equally likely outcomes, and only the 8 sequences qualify.'),
    q.info('M', 'The mean: a balance point, not a prediction', `The **expected value** of a random variable is its probability-weighted average:

**E[X] = Σ x · P(X = x)** = 0(1/8) + 1(3/8) + 2(3/8) + 3(1/8) = 12/8 = **1.5**.

Where does that formula come from? From counting. Run the three-flip experiment 800 times. You expect about 100 runs with 0 heads, 300 with 1, 300 with 2, 100 with 3. Total heads ≈ 300 + 600 + 300 = 1200, so the average per run is 1200/800 = 1.5. Replace each count "800 × P(x)" by its probability and the 800 cancels, leaving Σ x·P(x). The expectation is the long-run average, written down without flipping anything.

Second picture: put weights 1, 3, 3, 1 at the positions 0, 1, 2, 3 on a ruler. It balances at 1.5. Expectation is the centre of mass, which is why a symmetric distribution has its mean at the centre — here you could have written 1.5 down with no arithmetic.

**And the coins never show 1.5 heads.** That is not a defect. An average of whole numbers need not be a whole number, and E[X] describes the distribution, not any single trial. "Which flip gives half a head?" is the same question as "which family has 1.8 children?".

A shortcut worth meeting now: each flip contributes half a head on average, and averages add, so 3 × 1/2 = 1.5. Day 6 makes that the main event.`, {
      terms: [
        ['Expected value E[X]', 'Σ x·P(X = x): the probability-weighted average, equal to the long-run average over many repeats.'],
        ['Balance point', 'The mechanical picture: probabilities are weights placed at the values, and the mean is where they balance.'],
        ['Not attainable', 'An expectation need not be a value the variable can take: 1.5 heads, 3.5 on a die, 1.8 children.'],
      ]
    }),
    q.num('M', 'A fair coin is flipped 3 times. What is the mean (expected) number of heads?', 1.5, 'Σ x·P(x) = 0(1/8) + 1(3/8) + 2(3/8) + 3(1/8) = 12/8 = 1.5. The weights 1, 3, 3, 1 are symmetric, so the balance point is halfway between 0 and 3.'),
    q.tf('M', 'The expected value of a random variable must be a value that the variable can actually take.', false, '1.5 heads never occurs and a die never shows 3.5. Expectation is the balance point of the distribution, not a prediction of one trial.'),
    q.num('M', 'A fair coin is flipped 4 times. What is the mean number of heads?', 2, 'Each flip contributes half a head on average and averages add: 4 × 1/2 = 2.'),
    q.num('M', 'A fair coin is flipped 4 times, giving 16 equally likely sequences. What is P(exactly 2 heads)?', 6 / 16, 'Choosing which 2 of the 4 positions are heads gives 6 sequences: HHTT, HTHT, HTTH, THHT, THTH, TTHH.', { display: '6/16 = 3/8' }),
    q.num('M', 'An experiment of 3 fair coin flips is repeated 80 times. About how many repeats should show exactly 2 heads?', 30, 'Expected count = trials × probability = 80 × 3/8 = 30. The actual number scatters around 30.'),
    q.mc('M', 'A fair coin has just landed heads twice in a row. What is the probability that the third flip is heads?', ['1/2: the coin has no memory, and the 1-3-3-1 counts describe the whole triple before any flip, not a force pulling the total towards 1.5', 'Less than 1/2, because the average must come back down', 'More than 1/2, because heads are running', 'It cannot be determined'], 0, 'The distribution of the total was a statement made in advance about all three flips. Once two are known, only the remaining flip is still random.'),
    q.num('M', 'Interview: a fair coin is flipped 3 times. Given that at least one head appeared, what is the probability that all three were heads?', 1 / 7, 'Keep only the 7 sequences containing a head; they are still equally likely. Exactly one is HHH, so 1/7 — not 1/8. Conditioning shrinks the pool and rescales by dividing by P(at least one head) = 7/8.', { display: '1/7 ≈ 0.1429', tol: 0.002 }),
    q.num('M', 'Interview: you flip a fair coin 3 times and I flip a fair coin 3 times, independently. What is the probability we get the same number of heads?', 20 / 64, 'Sum over the shared value: (1/8)² + (3/8)² + (3/8)² + (1/8)² = (1 + 9 + 9 + 1)/64 = 20/64 = 5/16 ≈ 0.3125. Well above 1/4, because both of us are pulled towards 1 or 2 heads.', { display: '20/64 = 5/16', tol: 0.002 }),
    q.mc('M', 'Interview: "The expected number of heads in three fair flips is 1.5, so you will usually get 1 or 2 heads." Is the conclusion right, and is the reasoning right?', ['The conclusion is right (P = 6/8 = 3/4) but the reasoning is not: a mean says nothing about spread, and a variable paying 0 or 3 with equal chance also has mean 1.5', 'Both the conclusion and the reasoning are correct', 'The conclusion is wrong: P(1 or 2 heads) = 1/2', 'The conclusion is wrong because 1.5 is not attainable'], 0, 'Check the claim and the argument separately. Here a correct number is defended by an argument that would fail for a different distribution with the same mean.'),
    q.num('M', 'Interview: a fair coin is flipped 3 times and you are paid £2 for every head. What is your expected payment, in pounds?', 3, 'The payment is 2X, and expectation scales: E[2X] = 2 × 1.5 = £3, because every term of Σ x·P(x) is multiplied by the same 2.', { unit: '£' }),

    // =====================================================================================================
    // DEGREE: Thévenin equivalents and loading (E01 L2, EEEN11101)
    // =====================================================================================================
    q.info('E', 'What a load can see, and why it is only two numbers', `Build this: a 10 V ideal source, a 1 kΩ resistor down to a node A, and a second 1 kΩ resistor from A to ground. With nothing attached, A sits at 5 V. Attach something and it does not.

Whatever you attach at A can only ever discover two things about everything to its left: the voltage at the terminals and the current through them. It cannot see how many resistors are inside or how they are wired. So the whole network, seen from outside, *is* the relationship between its terminal voltage and current — nothing else.

Here is the result. If the network contains only resistors and ideal sources, that relationship is a straight line:

**V = Vth − Rth · I**

Two numbers describe the network, however many parts are inside.

Why a straight line? Because a resistor's voltage is proportional to its current, and equations of that kind combine into more equations of that kind. The terminal voltage is a fixed part, caused by the internal sources, plus a part proportional to the terminal current. Fixed plus proportional is a straight line. That is all **Thévenin's theorem** says.

Reading the two numbers off the line is easy. At I = 0, nothing is drawing current and V = **Vth**. The slope of the line is −**Rth**.`, {
      terms: [
        ['Two-terminal network', 'Any collection of components brought out to exactly two connection points.'],
        ['Linear element', 'One whose voltage–current graph is a straight line: resistors and ideal sources. Diodes are not.'],
        ['Terminal characteristic', 'The V–I line of a network: V = Vth − Rth·I.'],
        ['Open-circuit voltage', 'The terminal voltage when no current is drawn. It equals Vth.'],
        ['Thévenin equivalent', 'One voltage source Vth in series with one resistance Rth that behaves identically at the terminals.'],
      ],
      widget: W('viline', { Vs: 10, R1: 1000, R2: 1000, RL: 1000 })
    }),
    q.goal('E', 'The V–I simulator shows a 10 V source with R1 = R2 = 1 kΩ (open-circuit 5 V, Rth = 500 Ω). Drag the load resistance down to **200 Ω or less** and watch the operating point slide down the line.', W('viline', { Vs: 10, R1: 1000, R2: 1000, RL: 1000 }), s => s.RL <= 200,
      'At 100 Ω the load gets 5 × 100/(500 + 100) = 0.83 V, a sixth of the unloaded value. The network never changed; the operating point simply moved along the same straight line.'),
    q.info('E', 'Finding Vth and Rth, and why "off" means a short', `**Vth** is the open-circuit voltage. For the 10 V source with two 1 kΩ resistors, no current leaves node A when nothing is attached, so both resistors carry the same current and A sits at 10 × 1000/2000 = **5 V**.

**Rth** has two routes.

*Route 1 — switch the sources off and look in.* Replace each ideal voltage source by a short circuit and each ideal current source by an open circuit, then work out the resistance between the terminals. Here the shorted source puts R1 from A to ground alongside R2, so Rth = 1000 ∥ 1000 = **500 Ω**.

Why does "off" mean a short? Because off must mean "contributes nothing", and a voltage source contributes a fixed voltage. Set that voltage to zero and you have an element holding 0 V across itself at any current — a piece of wire. Set a current source to zero and it passes nothing at any voltage — a break. Both are just the source's own definition with the value set to zero.

*Route 2 — Vth divided by the short-circuit current.* Join the terminals. With A held at ground, R2 has no voltage across it and carries nothing, so the current comes through R1 alone: 10/1000 = 10 mA. Rth = 5/0.01 = **500 Ω**. Same answer, and this is the route you can use in a lab, where you cannot reach inside to short a source.`, {
      terms: [
        ['Source deactivation', 'Setting an independent source to zero: a voltage source becomes a short, a current source becomes an open.'],
        ['Short circuit', 'A connection of zero resistance: 0 V across it at any current.'],
        ['Open circuit', 'A break: 0 A through it at any voltage.'],
        ['Short-circuit current Isc', 'The current when the two terminals are joined. Rth = Vth / Isc.'],
      ]
    }),
    q.num('E', 'A 10 V ideal source feeds R1 = 1 kΩ down to node A, and R2 = 1 kΩ runs from A to ground. What is the open-circuit voltage at A, in volts?', 5, 'With nothing connected, one current flows through both resistors, so A sits at 10 × 1000/2000 = 5 V. That is Vth.', { unit: 'V' }),
    q.num('E', 'A 10 V ideal source feeds R1 = 1 kΩ down to node A, and R2 = 1 kΩ runs from A to ground. What is the Thévenin resistance seen at A, in ohms?', 500, 'Replace the source by a short. R1 then runs from A to ground in parallel with R2: 1000 ∥ 1000 = 500 Ω.', { unit: 'Ω' }),
    q.num('E', 'A 10 V ideal source feeds R1 = 1 kΩ down to node A, and R2 = 1 kΩ runs from A to ground. Node A is then shorted straight to ground. What current flows through that short, in **milliamps**?', 10, 'With A at 0 V, R2 has no voltage across it and carries nothing, so the current comes through R1 alone: 10/1000 = 10 mA. Check: Rth = Vth/Isc = 5/0.01 = 500 Ω, matching R1 ∥ R2.', { unit: 'mA' }),
    q.mc('E', 'To find a Thévenin resistance you switch the independent sources off. What does an ideal **voltage** source become, and why?', ['A short circuit, because a voltage source set to 0 V holds 0 V across itself at any current — which is what a wire does', 'An open circuit, because no current should flow', 'A resistor equal to its voltage divided by the load current', 'It is left unchanged'], 0, 'Switching off means setting the source\'s own quantity to zero. A 0 V voltage source is a wire; a 0 A current source is a break.'),
    q.mc('E', 'To find a Thévenin resistance you switch the independent sources off. What does an ideal **current** source become?', ['An open circuit: 0 A through it at any voltage', 'A short circuit', 'A 1 Ω resistor', 'A voltage source of the same numerical value'], 0, 'A current source set to 0 A passes nothing whatever the voltage across it, and that is a break in the wire.'),
    q.info('E', 'Loading: the unloaded voltage is a promise it cannot keep', `Attach a 1 kΩ load to node A of the 10 V, 1 kΩ / 1 kΩ divider. The equivalent makes it immediate: the load sees 5 V behind 500 Ω, and those two form a new divider.

V = 5 × 1000/(500 + 1000) = **3.33 V**.

A third of the promised voltage has gone — not stolen by the load, but dropped across Rth as the load current warms R1 and R2. Keep the general result as a fraction:

**delivered fraction = RL / (Rth + RL)**

Load ten times Rth → 91 %. Equal to Rth → 50 %. A tenth of Rth → 9 %. So the design question is never "what is Rth?" alone; it is always "how does Rth compare with the smallest load I will meet?".

Two rules fall out. To *deliver* a voltage, make Rth small compared with the load; a source with small Rth barely moves as the load changes. To *measure* a voltage, make the meter's input resistance large compared with Rth, or you are measuring your own loading — Day 17's subject.

Keep one thing separate: setting the load equal to Rth transfers the most **power**, wasting as much again inside the source. Maximum power is a different goal from maximum voltage. Day 6 derives it by differentiating.`, {
      terms: [
        ['Loading', 'The drop in terminal voltage caused by a load drawing current through Rth.'],
        ['Stiff source', 'One whose Rth is far below any load it will meet, so its output hardly moves.'],
        ['Buffer', 'A stage with a very large input resistance and a tiny output resistance, inserted so a weak source is not loaded. Day 16.'],
        ['Input resistance', 'The resistance an instrument or next stage presents. It is the RL in the loading formula.'],
        ['Maximum power transfer', 'Load equal to Rth delivers the most power, at 50 % efficiency. Not the same goal as delivering the most voltage.'],
      ],
      widget: W('divider', { Vs: 10, R1: 1000, R2: 1000, RL: 1000 })
    }),
    q.goal('E', 'In the divider simulator (10 V source, R1 = R2 = 1 kΩ, load RL = 1 kΩ), press **connect load** and compare the loaded output with the open-circuit value.', W('divider', { Vs: 10, R1: 1000, R2: 1000, RL: 1000 }), s => s.loaded === true,
      'Open circuit 5.00 V; loaded, 5 × 1000/(500 + 1000) = 3.33 V. The missing 1.67 V is dropped across the 500 Ω Thévenin resistance by the 3.33 mA of load current.'),
    q.num('E', 'A 10 V ideal source feeds R1 = 1 kΩ down to node A, R2 = 1 kΩ runs from A to ground, and a 1 kΩ load is connected from A to ground. What is the voltage at A, in volts (2 d.p.)?', 3.33, 'Thévenin first: Vth = 5 V, Rth = 500 Ω. Then the load makes a divider with Rth: 5 × 1000/1500 = 3.333 V.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'A 10 V ideal source feeds R1 = 1 kΩ down to node A, R2 = 1 kΩ runs from A to ground, and a **10 kΩ** load is connected from A to ground. What is the voltage at A, in volts (2 d.p.)?', 4.76, 'Vth = 5 V, Rth = 500 Ω, so V = 5 × 10000/10500 = 4.762 V. A load twenty times Rth costs under 5 %.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'A 10 V ideal source feeds R1 = 1 kΩ down to node A, R2 = 1 kΩ runs from A to ground, and a **100 Ω** load is connected from A to ground. What is the voltage at A, in volts (2 d.p.)?', 0.83, 'Vth = 5 V, Rth = 500 Ω, so V = 5 × 100/600 = 0.833 V. A load five times smaller than Rth keeps only a sixth of the open-circuit voltage.', { unit: 'V', tol: 0.02 }),
    q.mc('E', 'Why is the unloaded output voltage of a resistive divider not enough to design with?', ['Any real load draws current, and that current flows through the Thévenin resistance, so the output sags by Rth times the load current', 'Dividers only work when the two resistors are equal', 'The source voltage falls when a load is attached', 'Kirchhoff\'s laws stop applying once a load is present'], 0, 'The open-circuit voltage is one point on the V–I line, at zero current. Every real load moves you along that line.'),
    q.num('E', 'A network behaves as 5 V behind 500 Ω. For a load to receive at least 90 % of 5 V, what is the smallest load resistance, in ohms?', 4500, 'RL/(500 + RL) ≥ 0.9 gives 0.1·RL ≥ 450, so RL ≥ 4500 Ω. Rule of thumb: load ≥ 9 × Rth for 90 %.', { unit: 'Ω' }),
    q.num('E', 'A battery reads 9.00 V with no load. With a 10.0 Ω resistor across it, its terminal voltage reads 8.20 V. What is its internal resistance, in ohms (2 d.p.)?', 0.98, 'Load current = 8.20/10.0 = 0.820 A. The missing 0.80 V is dropped inside: 0.80/0.820 = 0.976 Ω. Two meter readings measure the Thévenin equivalent of a device you never opened.', { unit: 'Ω', tol: 0.03 }),
    q.mc('E', 'A Thévenin equivalent reproduces a network\'s terminal voltage and current for every load. What does it **not** reproduce?', ['The power dissipated inside the original network: the unloaded 10 V divider heats its resistors while its 5 V / 500 Ω equivalent draws nothing', 'The open-circuit voltage', 'The short-circuit current', 'The behaviour with a 1 kΩ load'], 0, 'Equivalence is a claim about the terminals only. Internal heat and internal node voltages are outside that claim.'),
    q.num('E', 'Exam-style: a 12 V ideal source is connected through a 4 Ω resistor to node A, and a 12 Ω resistor connects A to ground. Determine the Thévenin equivalent voltage at A, in volts.', 9, 'Open circuit: no current leaves A, so both resistors carry the same current and A sits at 12 × 12/(4 + 12) = 9 V.', { unit: 'V' }),
    q.num('E', 'Exam-style: a 12 V ideal source is connected through a 4 Ω resistor to node A, and a 12 Ω resistor connects A to ground. Determine the Thévenin equivalent resistance seen at A, in ohms.', 3, 'Replace the ideal source by a short. The 4 Ω and 12 Ω are then both between A and ground: 4 ∥ 12 = 48/16 = 3 Ω.', { unit: 'Ω' }),
    q.num('E', 'Exam-style: a 12 V ideal source is connected through a 4 Ω resistor to node A, and a 12 Ω resistor connects A to ground, so the network at A behaves as 9 V behind 3 Ω. A 6 Ω load is connected from A to ground. Calculate the power dissipated in the 6 Ω load, in watts.', 6, 'I = 9/(3 + 6) = 1 A, so P = I²R = 6 W. The load voltage is 6 V, a third of the 9 V being lost inside the network.', { unit: 'W' }),
    q.num('E', 'Exam-style: a 5.00 V supply feeds a divider of R1 = 10 kΩ (supply to output) and R2 = 10 kΩ (output to ground). The output drives an analogue input of resistance 100 kΩ. Calculate the voltage actually present at that input, in volts (3 s.f.).', 2.38, 'Vth = 2.50 V; Rth = 10k ∥ 10k = 5.00 kΩ; loaded V = 2.50 × 100/105 = 2.381 V. A 4.8 % error that no amount of care over the two 10 kΩ resistors would remove — the cure is a smaller Rth or a buffer.', { unit: 'V', tol: 0.02 }),
    ...genius(q, 5),
  ]
};
