import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(1);

// Day 1 is the reference day for the whole app: why before what, plain language, every question restates its own
// givens, about one hour of study, and each strand ends with exam- or interview-style questions. See C:\dev\study\CLAUDE.md.
export default {
  title: 'Bits, values, dice and Ohm — from the ground up',
  emoji: '🔢',
  strands: ['J', 'H', 'S', 'M', 'E', 'G'],
  summary: 'Day 1 of the handbook\'s week 1. **Hardware**: why chips use two symbols, and how a row of bits becomes a number in binary, decimal and hex. **Code**: what Python does with a line, why 3 and 3.0 differ, the division that clocks and counters use, and your first two real programs. **Quant maths**: equally likely outcomes, ordered dice pairs and why the dice grid has 36 cells rather than 21. **Degree**: charge, current, voltage, resistance and power from the physics up, and the honest story of where + and − labels come from. **Mathematician\'s thread**: parity and a colouring invariant that proves a mutilated chessboard cannot be tiled.',
  takeaway: 'A row of bits has a **width**; its meaning as a number is a separate choice. Each new bit doubles what I have and adds itself. `a == b·(a // b) + a % b` always. On two dice, ordered equally likely outcomes make a 36-cell sample space. V = I·R and P = V·I; the + on a resistor is **my label**, and the passive sign convention (arrow into +) makes P = VI mean "absorbs". A domino covers one black and one white square, so unequal colour counts are an invariant obstruction: parity can prove impossibility without trying arrangements.',
  steps: [
    q.info('J', 'Four core goals, plus a mathematician\'s thread — and how these lessons work', `Every day trains four core goals at once:

- 🔧 **Senior FPGA engineer**: bits, arithmetic, registers, handshakes, FIFOs, verification (handbook H01→H11; this month H01–H04).
- 💻 **Senior software engineer**: Python, Git, invariants, data structures, algorithms, with real tests and speed checks.
- 📐 **Jane Street quant-level maths**: counting, probability, expectation, queues. Derived, not memorised.
- ⚡ **First-rate EE student**: Manchester's units in the order they are taught (uni starts Mon 21 Sep, Day 16).

On each lesson day, a fifth element closes the session:

- 🧠 **Mathematician's thread**: proof ideas such as parity, invariants, pairing, pigeonhole, induction, telescoping and symmetry. This is a separate route towards mathematical genius by summer 2030. It is not the quant-probability strand or the degree syllabus.

**How a lesson works.** Each concept card explains *why* before *what*. Every question restates its own numbers, so it still makes sense when it comes back in review weeks later. Wrong answers return until you get them and go into your **Ledger**. Each strand ends with exam-style or interview-style questions. A day is about an hour. Sundays are checkpoint tests: no hints, no retries.`, {
      terms: [
        ['FPGA', 'Field-programmable gate array: a chip full of small configurable logic blocks and wires. You describe a circuit; the chip becomes that circuit.'],
        ['HDL', 'Hardware description language (Verilog, VHDL): text that describes a circuit, not a list of instructions.'],
        ['Ledger', 'Your private list of what you got wrong, what you assumed, and the fix.'],
      ]
    }),

    // =====================================================================================================
    // HARDWARE: why two symbols, and how a row of bits becomes a number
    // =====================================================================================================
    q.info('H', 'Why computers use two symbols, not ten', `A wire inside a chip carries a voltage. You could try to store a decimal digit on it with ten voltage levels, 0.1 V apart. The trouble is that real voltages wobble: heat, nearby wires and imperfect power supplies all add small random shifts, called **noise**. With levels only 0.1 V apart, a small wobble turns a 4 into a 5 and the chip silently gets the wrong answer.

So chips use just **two** levels, far apart: near 0 V means **0**, near the supply voltage means **1**. A wobble of 0.2 V cannot turn one into the other. That reliability is the whole reason for binary.

One such two-valued signal is a **bit**. On its own it means nothing: a 1 could mean "door open", "add", or "the number one". Meaning is something we agree on top of the bits.`, {
      terms: [
        ['Bit', 'One binary digit, 0 or 1: the answer to one yes/no question.'],
        ['Logic level', 'The voltage range a chip reads as 0 (low) or 1 (high).'],
        ['Noise', 'Unwanted random wobble on a voltage. Two far-apart levels survive it; ten close levels do not.'],
      ]
    }),
    q.info('H', 'Place value: you already know how this works', `The decimal number 246 means 2 hundreds + 4 tens + 6 ones. Each position has a **weight**, and each step left multiplies the weight by ten, because there are ten symbols. That is **place value**.

With two symbols, each step left multiplies the weight by **two**. So an 8-bit row has weights 1, 2, 4, 8, 16, 32, 64, 128 from the right. To read the row as a plain, non-negative number (an **unsigned** number), add the weights where the bit is 1:

\`11110110\` = 128 + 64 + 32 + 16 + 4 + 2 = **246**.

Why doubling weights? Each extra bit doubles the number of patterns you can make (every old pattern, with a 0 or a 1 in front). Doubling weights is the only choice that gives every pattern its own value with no gaps and no repeats.

The leftmost bit is the **MSB** (biggest weight), the rightmost the **LSB** (weight 1). Tap bits below and watch the sum.`, {
      terms: [
        ['Place value', 'A digit\'s meaning depends on its position: the number is the sum of digit × weight.'],
        ['Weight', 'What a position contributes when its bit is 1: 1, 2, 4, 8, … doubling leftwards.'],
        ['Width', 'How many bits a value has. 8 bits: 2⁸ = 256 possible patterns.'],
        ['Unsigned', 'Reading a pattern as a non-negative whole number, 0 up to 2^width − 1.'],
        ['MSB / LSB', 'Most / least significant bit: leftmost (largest weight) / rightmost (weight 1).'],
      ],
      widget: W('bits', { width: 8, value: 0b00101101 })
    }),
    q.goal('H', 'Use the bit toggler to show the unsigned value **37**.', W('bits', { width: 8, value: 0, target: 37 }), s => s.value === 37,
      '37 = 32 + 4 + 1 → bits 5, 2 and 0 are set: 00100101.'),
    q.num('H', 'Decode `11110110` as an **unsigned** 8-bit value.', 246, '128 + 64 + 32 + 16 + 4 + 2 = 246. Faster: only weights 8 and 1 are missing, so 255 − 9 = 246.'),
    q.num('H', 'Decode `01011010` as an **unsigned** 8-bit value.', 90, 'Set bits have weights 64, 16, 8 and 2: 64 + 16 + 8 + 2 = 90.'),
    q.mc('H', 'Why do digital chips store information as two voltage levels instead of ten?', ['Two widely separated levels survive electrical noise; ten close levels would be misread', 'Transistors can only ever be fully on or fully off', 'Binary numbers are shorter than decimal numbers', 'It was a historical accident with no technical reason'], 0, 'Reliability. Noise wobbles every real voltage; two levels far apart cannot be confused. (Transistors can sit at in-between voltages; analogue circuits use exactly that.)'),
    q.info('H', 'How many patterns, and why the biggest is 2^w − 1', `Each bit doubles the number of patterns: 8 bits give 2⁸ = **256**. One pattern is all zeros (value 0), so the largest value is 256 − 1 = **255**, the all-ones pattern \`11111111\`.

A quick way to see the −1: add 1 to all-ones. \`11111111\` + 1 carries all the way through and gives \`100000000\`, a 1 followed by eight zeros, which is 2⁸. So all-ones is 2⁸ − 1.

General rule for width w: **2^w patterns, values 0 … 2^w − 1**. To size a register, ask "what is the largest value I must hold?" and find the smallest w with 2^w − 1 at least that big. Watch the edge: 0 to 1023 fits in 10 bits, 1024 does not.`, {
      terms: [
        ['Range', 'The values a reading can represent. Unsigned width w: 0 to 2^w − 1.'],
        ['All-ones', 'The pattern 111…1: the unsigned maximum, 2^w − 1.'],
      ]
    }),
    q.mc('H', 'What is the largest unsigned value an 8-bit vector can hold?', ['255', '256', '128', '127'], 0, '2⁸ = 256 patterns, numbered 0 to 255. All-ones = 255.'),
    q.num('H', 'How many distinct patterns does a **10-bit** vector have?', 1024, '2¹⁰ = 1024: ten doublings of 1.'),
    q.mc('H', 'You need to store counts from 0 up to **1000** inclusive. Minimum unsigned width?', ['10 bits', '9 bits', '8 bits', '11 bits'], 0, '2⁹ − 1 = 511 is too small; 2¹⁰ − 1 = 1023 ≥ 1000. Always check the maximum value, not a round number.'),
    q.mc('H', 'A register must hold any value from 0 to **1023** inclusive. Minimum unsigned width?', ['10 bits', '11 bits', '9 bits', '12 bits'], 0, '1023 = 2¹⁰ − 1 exactly, the all-ones 10-bit pattern. One more (1024) would need 11 bits.'),
    q.info('H', 'Number → bits: two methods that always work', `**Greedy subtraction.** Take the biggest weight that fits, subtract it, repeat. 77: 64 fits (13 left), 32 and 16 do not, 8 fits (5 left), 4 fits (1 left), 1 fits. Bits at 64, 8, 4, 1 → \`01001101\`.

**Repeated halving.** Divide by 2, write the remainder, repeat with the quotient until it is 0. 77 → 38 r1 → 19 r0 → 9 r1 → 4 r1 → 2 r0 → 1 r0 → 0 r1. Read the remainders **bottom-up**: 1001101, padded to 8 bits: \`01001101\`.

Why halving works: a binary number is (the bits above the LSB) × 2 + the LSB. Dividing by 2 gives the upper bits as the quotient and the LSB as the remainder. Each halving peels one more bit off the right. This is exactly the \`//\` and \`%\` you meet in the Python section.`, {
      terms: [
        ['Encode', 'Turn a value into a bit pattern (the reverse of decoding).'],
        ['Quotient / remainder', 'Whole-number division: 77 = 2 × 38 + 1, so quotient 38, remainder 1.'],
        ['Padding', 'Leading zeros added to reach the required width. The value is unchanged.'],
      ]
    }),
    q.text('H', 'Encode the value **77** as an **8-bit** unsigned pattern.', ['01001101'], '64 + 8 + 4 + 1 = 77 → bits 6, 3, 2, 0 set: 01001101.', { mono: true, accept: ['^0*1001101$'] }),
    q.text('H', 'Encode the value **200** as an **8-bit** unsigned pattern.', ['11001000'], '128 + 64 + 8 = 200 → 11001000.', { mono: true, accept: ['^0*11001000$'] }),
    q.text('H', 'Encode the value **19** as a **5-bit** unsigned pattern.', ['10011'], '16 + 2 + 1 = 19 → 10011. Halving: 19 r1, 9 r1, 4 r0, 2 r0, 1 r1 → read upwards 10011.', { mono: true, accept: ['^0*10011$'] }),
    q.mc('H', 'Using repeated halving to encode a number, the **first** remainder you write down is…', ['the LSB (weight 1)', 'the MSB (largest weight)', 'the number of bits needed', 'always 1'], 0, 'Dividing by 2 peels off the rightmost bit. Later remainders are higher bits, so read bottom-up.'),
    q.info('H', 'Hexadecimal: four bits per digit', `Long bit strings are easy to miscopy. Since 16 = 2⁴, **one hexadecimal digit stands for exactly four bits**, so any bit string splits cleanly into groups of four. Hex digits run 0–9 then A–F for 10–15.

\`1111 0110\` → F (15), 6 → **0xF6**. \`1010 0101\` → **0xA5**. The 0x prefix just says "this is hex". Two hex digits make one **byte**, so a 32-bit value is eight hex digits: it fits on a line and you can see the bit fields at a glance.

Decimal does not split bits this way, because 10 is not a power of two. That is why hardware people think in hex.`, {
      terms: [
        ['Hexadecimal (hex)', 'Base 16. Digits 0–9, A–F. One digit = exactly four bits.'],
        ['Nibble', 'Four bits: half a byte, one hex digit.'],
        ['Byte', 'Eight bits: two hex digits, values 0 … 255.'],
      ]
    }),
    q.text('H', 'Write **0xA5** as an 8-bit binary pattern.', ['10100101'], 'A = 1010, 5 = 0101 → 10100101 (165 in decimal).', { mono: true, accept: ['^0*10100101$'] }),
    q.text('H', 'Write the 8-bit pattern `11110110` in hex (two digits, no prefix needed).', ['F6', '0xF6'], '1111 = F, 0110 = 6.', { mono: true, accept: ['^(0x)?f6$'] }),
    q.num('H', 'What is **0x2C** in decimal?', 44, '2 × 16 + 12 = 44. Or 0010 1100 = 32 + 8 + 4.'),
    q.mc('H', 'Why is hex the natural way to write bit patterns, while decimal is not?', ['16 = 2⁴, so each hex digit is exactly four bits and digit boundaries line up with bit boundaries', 'Hex numbers are always smaller', 'Chips compute in hex internally', 'Decimal cannot represent numbers above 255'], 0, 'Because 16 is a power of two, a hex digit maps to exactly one nibble. Ten is not, so decimal digits straddle bit boundaries.'),
    q.mc('H', 'Interview: a sensor reports values 0 to 4000 and you pick a 12-bit register (0 to 4095). A colleague says "use 13 bits to be safe". What is the right response?', ['12 bits is correct: 4000 ≤ 4095; a spare bit costs wiring and logic for no benefit, but write the limit 4095 into the interface spec', '13 bits, because you should always add one bit of margin', '11 bits, because 4000 is close to 2048 × 2', '16 bits, because registers should be whole bytes'], 0, 'Width follows from the maximum value, not from nervousness. State the limit in the contract so a future change to a 5000-count sensor is caught by review, not by a silent wrap.'),

    // =====================================================================================================
    // CODE: what Python actually does with a line
    // =====================================================================================================
    q.info('S', 'What Python does with a line', `A Python program is a list of lines. The **interpreter** reads a line, works out what it means, does it, and moves on. Two kinds of line matter today.

An **expression** produces a value: \`7 // 2\`, \`len(xs)\`, \`"a" + "b"\`. Typed at the prompt, Python prints the value.

A **statement** does something without producing a value. \`n = 7\` is an **assignment**: it makes the **name** n refer to the value 7. Nothing prints, because nothing was produced.

Think of a name as a sticky label on a value. \`n = 7\` sticks the label n on the object 7; \`n = 8\` moves the label to a different object. The word "variable" suggests a box holding a number, and that picture breaks on Day 5 when two labels share one list. The label picture never breaks.

Step through the lines below: assignments print nothing, expressions print their value.`, {
      widget: W('repl', { lines: [['n = 7', ''], ['n', '7'], ['n + 1', '8'], ['n', '7'], ['n = n + 1', ''], ['n', '8'], ['xs = [3, 1, 2]', ''], ['len(xs)', '3'], ['"a" + "b"', "'ab'"]] }),
      terms: [
        ['Interpreter', 'The program that reads your Python lines one by one and carries them out.'],
        ['Expression', 'Anything that produces a value: 7 // 2, len(xs), "a" + "b".'],
        ['Statement', 'A line that does something rather than producing a value: an assignment, a def, a loop.'],
        ['Name (variable)', 'A label attached to a value. Assignment attaches the label; it does not copy the value into a box.'],
      ]
    }),
    q.info('S', 'Types: why 3 and 3.0 are different objects', `Every value has a **type**, which decides what it can do and how it is stored.

- \`int\`: a whole number, exact, any size (\`2 ** 100\` is fine).
- \`float\`: a number with a fractional part, stored in binary place value with 64 bits. Same idea as this morning's weights, continued to the right of the point: ½, ¼, ⅛ …
- \`str\`: text in quotes. \`"7"\` is text, not the number 7.
- \`list\`: an ordered, changeable sequence: \`[3, 1, 2]\`.

Here is the float surprise. 0.1 cannot be written exactly with halves, quarters and eighths, just as 1/3 cannot be written exactly in decimal. So \`0.1\` is stored slightly off, and \`0.1 + 0.2 == 0.3\` is **False**. Rule: use \`int\` for anything you count (items, pence, clock cycles); use \`float\` for measurements.

Different types can still compare equal: \`3 == 3.0\` is True, because Python compares the numbers, not the storage.`, {
      widget: W('repl', { lines: [['type(7)', "<class 'int'>"], ['type(3.0)', "<class 'float'>"], ['type("7")', "<class 'str'>"], ['3 == 3.0', 'True'], ['0.1 + 0.2', '0.30000000000000004'], ['0.1 + 0.2 == 0.3', 'False'], ['2 ** 100', '1267650600228229401496703205376'], ['type([3, 1, 2])', "<class 'list'>"]] }),
      terms: [
        ['Type', 'The kind of a value: int, float, str, list… It decides what operations make sense.'],
        ['int / float', 'Whole number (exact, unbounded) / fractional number (64-bit binary fraction, tiny rounding).'],
        ['str', 'A string: text in quotes.'],
        ['list', 'An ordered, changeable sequence. Its length is len(xs).'],
      ]
    }),
    q.num('S', 'What does `len([3, 1, 2])` return?', 3, 'len counts elements: three of them.'),
    q.mc('S', 'Which is `type(3.0)`?', ['float', 'int', 'str', 'decimal'], 0, 'The decimal point makes it a float even though the value is whole.', { grid: true }),
    q.mc('S', 'What does `3 == 3.0` evaluate to?', ['True', 'False', 'an error', '3'], 0, 'Python compares numeric values, not storage types.', { grid: true }),
    q.mc('S', 'What does `0.1 + 0.2 == 0.3` evaluate to, and why?', ['False: 0.1 and 0.2 are stored as binary fractions that are slightly off, and the errors do not cancel', 'True: Python does exact decimal arithmetic', 'False: Python cannot add floats', 'True: == removes rounding error'], 0, '0.1 in binary is a repeating fraction, like 1/3 in decimal. The stored values are nearest approximations; their sum is 0.30000000000000004.'),
    q.mc('S', 'After `x = 5`, then `y = x`, then `x = 6`, what is `y`?', ['5', '6', 'an error', 'None'], 0, 'y = x attached the label y to the object 5. Rebinding x moves only x\'s label.', { grid: true }),
    q.info('S', '// and %: the division that clocks and counters use', `Whole-number division has two answers: how many times it fits (the **quotient**) and what is left (the **remainder**). 7 divided by 2 fits 3 times with 1 left: \`7 // 2\` is **3** and \`7 % 2\` is **1**. (\`7 / 2\` is the float 3.5, a different question.)

One identity makes both operators trustworthy: **\`a == b * (a // b) + a % b\`, always.** Check: 2 × 3 + 1 = 7.

For negatives Python rounds the quotient **down** (towards minus infinity) so that the remainder stays in 0 … b − 1: \`-7 // 2\` is −4 and \`-7 % 2\` is 1 (2 × (−4) + 1 = −7 ✔). That is the behaviour hardware people want, because a remainder in 0 … b − 1 is exactly a **wrap-around**: an 8-bit counter that counts to 260 shows 260 % 256 = 4.

You will use them constantly: seconds → hours/minutes/seconds, the next slot in a circular buffer (\`i % size\`), peeling bits off a number (\`n % 2\`, then \`n // 2\`: the halving method).`, {
      widget: W('repl', { lines: [['7 // 2', '3'], ['7 % 2', '1'], ['7 / 2', '3.5'], ['2 * (7 // 2) + 7 % 2', '7'], ['-7 // 2', '-4'], ['-7 % 2', '1'], ['3725 // 60', '62'], ['3725 % 60', '5'], ['260 % 256', '4']] }),
      terms: [
        ['Floor division //', 'Whole-number quotient, rounded towards minus infinity: 7 // 2 = 3, −7 // 2 = −4.'],
        ['Remainder (modulo) %', 'What is left after floor division. For positive b the result is always in 0 … b − 1.'],
        ['Wrap-around', 'Counting past the end and starting again from 0. A w-bit counter wraps modulo 2^w.'],
      ]
    }),
    q.mc('S', 'What does `7 // 2` evaluate to?', ['3', '3.5', '4', '1'], 0, '// is floor division: 3.5 rounded down to 3.', { grid: true }),
    q.mc('S', 'What does `7 % 2` evaluate to?', ['1', '0', '3', '2'], 0, '7 = 3 × 2 + 1: remainder 1.', { grid: true }),
    q.mc('S', 'What does `-7 // 2` evaluate to in Python?', ['−4', '−3', '−3.5', '3'], 0, 'Python rounds down: −3.5 → −4. Then −7 % 2 = 1 so that 2 × (−4) + 1 = −7.', { grid: true }),
    q.num('S', 'A stopwatch shows 3725 seconds. What does `3725 // 60` give (the number of whole minutes)?', 62, '60 × 62 = 3720, so 62 whole minutes with 5 seconds left over.'),
    q.num('S', 'A stopwatch shows 3725 seconds. What does `3725 % 60` give (the leftover seconds)?', 5, '3725 − 60 × 62 = 5.'),
    q.mc('S', 'For a positive `b`, the value of `a % b` in Python always lies in which range?', ['0 to b − 1 inclusive', '1 to b inclusive', '−b to b', '0 to b inclusive'], 0, 'That is what rounding the quotient down guarantees. It is exactly the wrap-around of a counter of size b.'),
    q.num('S', 'An 8-bit counter shows 0 … 255 and wraps past the end. If it counts 260 pulses from zero, what does it show? (Compute `260 % 256`.)', 4, '260 = 1 × 256 + 4. The counter went round once and shows 4.'),
    q.info('S', 'def and for: naming a computation, repeating a step', `A **function** packages a computation so it can be reused and tested. \`def\` names it and lists its inputs (**parameters**); the indented lines are its body; \`return\` hands a value back to whoever called it.

\`\`\`
def hms(total):
    h = total // 3600
    rest = total % 3600
    return [h, rest // 60, rest % 60]

hms(3725)        # → [1, 2, 5]
\`\`\`

Why \`return\` and not \`print\`? \`print\` only shows text on screen; nothing can use it. \`return\` gives the value to the caller, so it can be stored, compared, or checked by a test. Every code exercise here checks your **returned** value.

A **for loop** runs its indented block once per item, including once per character of a string:

\`\`\`
value = 0
for ch in "1011":
    value = value * 2 + (1 if ch == "1" else 0)
# value is now 11
\`\`\`

Read the loop slowly: each new bit **doubles what you have** (every earlier bit moves one place left, so its weight doubles) **and adds itself**. That is place value, left to right. Indentation is not decoration in Python: it is the block.`, {
      widget: W('repl', { lines: [['def double(x):', ''], ['    return 2 * x', ''], ['double(21)', '42'], ['y = double(4)', ''], ['y + 1', '9'], ['value = 0', ''], ['for ch in "1011":', ''], ['    value = value * 2 + (1 if ch == "1" else 0)', ''], ['value', '11']] }),
      terms: [
        ['Function', 'A named, reusable computation: def name(parameters): body.'],
        ['Parameter / argument', 'The name inside the def (parameter) and the actual value you pass when calling (argument).'],
        ['return', 'Sends a value back to the caller and ends the function. print only displays text.'],
        ['for loop', 'Runs the indented block once for each item in a sequence (list, string, range).'],
        ['Block', 'The indented lines that belong to a def, for or if.'],
      ]
    }),
    q.mc('S', 'A function ends with `print(x)` instead of `return x`. What happens when a test calls it and checks the result?', ['The test sees None: printing shows text but hands nothing back', 'The test sees x, because printing and returning are the same', 'Python raises an error', 'The test sees the string "x"'], 0, 'A function with no return gives back None. print writes to the screen only.'),
    q.tokens('S', 'Arrange the tokens into a one-line Python function that returns **twice** its input.', ['def', 'double(x):', 'return', '2 * x'], ['print', '==', 'x + 2'], 'def double(x): return 2 * x. The colon opens the body; return hands the value back.', { mono: true }),
    q.num('S', 'Trace this loop by hand: `value = 0`, then `for ch in "1101": value = value * 2 + (1 if ch == "1" else 0)`. What is `value` at the end?', 13, 'Steps: 0 → 1 → 3 → 6 → 13. Doubling shifts every earlier bit left one place; 1101 = 8 + 4 + 1 = 13.'),
    q.mc('S', 'Interview: a colleague stores prices as floats and sums 10,000 of them, then checks the total `== 1234.56`. The check fails although every price was entered correctly. Best fix?', ['Store money as an int number of pence: exact, so equality checks are meaningful', 'Round every price to two decimals before adding', 'Compare with < instead of ==', 'Use a bigger float'], 0, 'Binary floats cannot represent most decimal fractions exactly, and the errors accumulate. Counting pence as ints removes the problem entirely; rounding just hides it.'),
    q.code('S', 'Write `solve(total_seconds)` that returns `[hours, minutes, seconds]` for a non-negative whole number of seconds. Hours may exceed 24 (90061 s → [25, 1, 1]). Use `//` and `%` only; no loops needed.', {
      fn: 'solve',
      starter: 'def solve(total_seconds):\n    # hours = whole 3600-second blocks; then split the rest into minutes and seconds\n    hours = 0\n    minutes = 0\n    seconds = 0\n    return [hours, minutes, seconds]\n',
      tests: [
        { args: [3725], expect: [1, 2, 5] },
        { args: [0], expect: [0, 0, 0], name: 'solve(0) — nothing elapsed' },
        { args: [59], expect: [0, 0, 59], name: 'just under a minute' },
        { args: [3600], expect: [1, 0, 0], name: 'exactly one hour' },
        { args: [86399], expect: [23, 59, 59], name: 'one second short of a day' },
        { args: [90061], expect: [25, 1, 1], name: 'more than a day: hours keep counting' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        yield [random.randint(0, 10**6)]',
      refCode: 'def ref(t):\n    return [t // 3600, (t % 3600) // 60, t % 60]',
      solution: 'def solve(total_seconds):\n    hours = total_seconds // 3600\n    rest = total_seconds % 3600\n    return [hours, rest // 60, rest % 60]'
    }, 'hours = t // 3600 takes the whole hours; t % 3600 is what those hours did not use; that remainder splits into minutes (// 60) and seconds (% 60). The identity a == b·(a // b) + a % b guarantees nothing is lost or double-counted.'),
    q.code('H', 'Build: write `solve(bits)` that decodes a string of `0`/`1` characters as an **unsigned** number, using a loop and place value (each new character doubles the running value and adds itself). Do not call `int(bits, 2)`; the point is to own the arithmetic. Random strings are checked against a hidden reference, and a 20,000-character string must decode within the time budget.', {
      fn: 'solve',
      starter: 'def solve(bits):\n    value = 0\n    for ch in bits:\n        # double what you have, then add this bit\n        pass\n    return value\n',
      tests: [
        { args: ['11110110'], expect: 246 },
        { args: ['00100101'], expect: 37, name: 'leading zeros change nothing' },
        { args: ['0'], expect: 0, name: 'a single 0' },
        { args: ['1'], expect: 1, name: 'a single 1' },
        { args: ['11111111'], expect: 255, name: 'all-ones = 2^8 − 1' },
        { args: ['10000000000'], expect: 1024, name: 'a 1 followed by ten zeros = 2^10' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(1, 40)\n        yield ["".join(random.choice("01") for _ in range(n))]',
      refCode: 'def ref(bits):\n    return int(bits, 2)',
      speed: { gen: 'def gen():\n    return ["".join(random.choice("01") for _ in range(20000))]', budgetMs: 1500, label: '20,000-bit string' },
      solution: 'def solve(bits):\n    value = 0\n    for ch in bits:\n        value = value * 2 + (1 if ch == "1" else 0)\n    return value'
    }, 'value = value * 2 + bit is place value done left to right: doubling moves every bit already read one place up, then the new bit lands at weight 1. One multiply and one add per character. Computing 2**i for each position works too but is slower and easier to get backwards.'),

    // =====================================================================================================
    // MATHS: what a probability is
    // =====================================================================================================
    q.info('M', 'What a probability actually is', `Roll a die. Nobody can say what it will show, yet everyone agrees "a six" has probability 1/6. What does that number mean? Two pictures, and they agree.

**The long-run picture.** Roll 6000 times. The fraction of sixes wanders at first, then settles near 1/6. Probability is the value that fraction settles on.

**The counting picture.** A fair die has 6 faces that are all alike, so no face should come up more often than another: the 6 possible results (**outcomes**) are **equally likely**. Then P(event) = (outcomes in the event) ÷ (all outcomes). "A six" is 1 outcome of 6.

The counting picture is the one you calculate with, and it has a condition people forget: **it only works when the outcomes you count are equally likely.** Symmetry (a fair die, a fair coin, a shuffled deck) is what justifies that. The next card shows the classic trap when it fails.

An event is some of the outcomes, so its probability sits between 0 (impossible) and 1 (certain).`, {
      terms: [
        ['Experiment', 'A repeatable action with an uncertain result: rolling dice, flipping a coin.'],
        ['Outcome', 'One complete result of the experiment, described finely enough that nothing is left uncertain. Two dice: (3, 4).'],
        ['Sample space', 'Every possible outcome, listed once.'],
        ['Event', 'A set of outcomes you care about: "the sum is 7" contains 6 outcomes.'],
        ['Probability', 'A number from 0 to 1. With equally likely outcomes: (outcomes you want) ÷ (all outcomes). Also the long-run fraction of repeats in which the event happens.'],
        ['Fair', 'Every outcome equally likely, by symmetry.'],
      ]
    }),
    q.info('M', 'Why (1, 2) and (2, 1) are both outcomes', `Roll a red die and a blue die. Is the sample space the 36 **ordered pairs** (red, blue), or the 21 unordered combinations {1,1}, {1,2}, … {6,6}?

Try the unordered version on "sum is 7": combinations {1,6}, {2,5}, {3,4}: 3 of 21 = 1/7. Try the ordered version: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1): 6 of 36 = 1/6. They disagree, and experiments say **1/6**.

The unordered count fails because its outcomes are not equally likely: {1,2} happens two ways (red 1 blue 2, or red 2 blue 1) but {1,1} only one way. The 36 ordered pairs are equally likely because each die is fair and does not affect the other, so every cell has probability 1/6 × 1/6 = 1/36. The rule: **describe outcomes finely enough that they are equally likely, then count.** The dice are distinguishable even when they look identical; the physics does not care about colour.

Below, rows are the first die, columns the second; yellow cells are "sum is 7".`, {
      terms: [
        ['Ordered pair', '(a, b) where order matters: (1, 2) ≠ (2, 1). Two dice give 6 × 6 = 36 of them.'],
        ['Equally likely', 'Each outcome has the same probability. Required before you may count outcomes.'],
        ['Independent', 'One die\'s result does not change the other\'s chances, so their probabilities multiply: 1/6 × 1/6.'],
      ],
      widget: W('dice', { event: (a, b) => a + b === 7, eventName: 'sum is 7', cond: () => true, condName: 'none' })
    }),
    q.num('M', 'How many outcomes are in the sample space for two fair dice?', 36, '6 faces × 6 faces = 36 ordered pairs. (1,2) and (2,1) are different outcomes.'),
    q.num('M', 'Two fair dice. P(sum is 7) = ?', 1 / 6, '(1,6),(2,5),(3,4),(4,3),(5,2),(6,1): 6 outcomes out of 36. You can type 6/36.', { display: '6/36 = 1/6' }),
    q.num('M', 'Two fair dice. P(both dice show a 6) = ?', 1 / 36, 'Only one outcome, (6,6), out of 36.', { display: '1/36' }),
    q.num('M', 'Two fair dice. P(sum is 10 or more) = ?', 1 / 6, 'Sum 10: (4,6),(5,5),(6,4). Sum 11: (5,6),(6,5). Sum 12: (6,6). Six cells out of 36.', { display: '6/36 = 1/6' }),
    q.num('M', 'Two fair dice. P(both dice show the same number) = ?', 1 / 6, 'The six doubles (1,1) … (6,6) out of 36.', { display: '6/36 = 1/6' }),
    q.num('M', 'Two fair dice, one red and one blue. P(the red die shows a strictly larger number than the blue die) = ?', 15 / 36, 'Remove the 6 doubles; the other 30 cells split evenly by symmetry between "red bigger" and "blue bigger": 15/36.', { display: '15/36' }),
    q.mc('M', 'A student says: "Sum 7 comes from the combinations {1,6}, {2,5}, {3,4}, so P(sum 7) = 3/21 = 1/7." What is wrong?', ['The 21 unordered combinations are not equally likely: {1,6} happens two ways, {1,1} only one, so counting them is not allowed', 'Nothing; 1/7 is correct', 'They forgot the combination {7,0}', 'They should have divided by 36, giving 3/36'], 0, 'Counting requires equally likely outcomes. The 36 ordered pairs qualify (1/36 each); the 21 combinations do not. Correct answer 6/36 = 1/6.'),
    q.mc('M', 'Which statement about a probability is always true?', ['It lies between 0 and 1 inclusive, because an event is some of the outcomes', 'It can exceed 1 for very likely events', 'It is negative for impossible events', 'It equals the number of favourable outcomes'], 0, 'An event contains between none and all of the outcomes, so its share lies between 0 and 1.'),
    q.info('M', 'Events are sets: adding, complements, the total of 1', `An event is a set of cells in the grid, so probability follows the rules of counting cells.

**Complement.** "Not A" is every cell outside A. Inside plus outside is all 36, so **P(not A) = 1 − P(A)**. P(sum is not 7) = 1 − 6/36 = 30/36. Often "not A" is far easier to count than A; Day 2 uses this.

**Disjoint events add.** If A and B share no cell, "A or B" has the cells of A plus the cells of B: **P(A or B) = P(A) + P(B)**. "Sum is 7" (6 cells) and "sum is 11" (2 cells) cannot both happen, so P(7 or 11) = 8/36.

**Overlaps are counted once.** If A and B can both happen, P(A) + P(B) counts the shared cells twice. "Sum is 7" and "first die is 1" share (1,6): P(7 or first is 1) = 6/36 + 6/36 − 1/36 = 11/36. The principle is simply: count cells, never count a cell twice.

Below: "sum is 7 or 11", 8 cells, no overlap.`, {
      terms: [
        ['Complement', '"Not A": every outcome not in A. P(not A) = 1 − P(A).'],
        ['Disjoint (mutually exclusive)', 'Two events that share no outcome. Then P(A or B) = P(A) + P(B).'],
        ['Union (A or B)', 'The outcomes in A, in B, or in both, each counted once.'],
        ['Intersection (A and B)', 'The outcomes in both: the overlap.'],
      ],
      widget: W('dice', { event: (a, b) => a + b === 7 || a + b === 11, eventName: 'sum is 7 or 11', cond: () => true, condName: 'none' })
    }),
    q.num('M', 'Two fair dice. P(sum is 7 **or** 11) = ?', 8 / 36, '6/36 + 2/36. Adding is allowed because no cell has both sums.', { display: '8/36 = 2/9' }),
    q.num('M', 'Two fair dice. P(sum is **not** 7) = ?', 30 / 36, '1 − 6/36 = 30/36 = 5/6.', { display: '30/36 = 5/6' }),
    q.tf('M', 'For any event A, P(A) + P(not A) = 1.', true, 'Every outcome is in exactly one of A and not-A, so the two counts add to the whole sample space.'),
    q.num('M', 'Exam-style: two fair dice. P(sum is 7 **or** the first die shows 1) = ?', 11 / 36, '"Sum 7" has 6 cells, "first die 1" has 6 cells, and they share (1,6). 6 + 6 − 1 = 11 cells.', { display: '11/36' }),
    q.info('M', 'Probability predicts counts', `Once you know P(sum is 7) = 1/6, you can predict a count: in 720 rolls you expect about 720 × 1/6 = **120** sevens. Not exactly 120; a real run might give 113 or 131. The prediction is the centre the real count scatters around, and the scatter shrinks *relative to the total* as the number of trials grows.

This is how probability becomes engineering. If a packet drops with probability 0.01, a stream of 100,000 packets loses about 1000; a buffer or retry policy is sized from that expectation, then tested against the scatter. "Expected count = trials × probability" is the first thing a quant or a hardware engineer computes.`, {
      terms: [
        ['Relative frequency', 'Times an event happened ÷ number of trials. Settles towards the probability.'],
        ['Expected count', 'Trials × probability: the value the actual count scatters around.'],
        ['Law of large numbers', 'As trials increase, the relative frequency converges to the probability.'],
      ]
    }),
    q.num('M', 'Two fair dice are rolled 720 times. About how many rolls should show a sum of 7?', 120, '720 × 6/36 = 120.'),
    q.num('M', 'A fair die is rolled 3000 times. About how many sixes?', 500, '3000 × 1/6 = 500.'),
    q.mc('M', 'Interview: you roll two dice 36 times and see 9 sevens instead of the expected 6. A trader says the dice must be loaded. Your reply?', ['With only 36 trials the count scatters widely around 6; 9 is unremarkable. Roll thousands of times before concluding anything', 'Agree: 9 is 50 % above expectation', 'P(sum 7) must now be updated to 9/36', 'Probability does not apply to real dice'], 0, 'Expected count is a centre, not a guarantee, and small samples scatter a lot. 3600 rolls giving 900 sevens would be a different story.'),
    q.mc('M', 'Interview: two fair dice. Which is larger, P(sum is 7) or P(sum is 6), and why, without listing every cell?', ['P(sum 7): every first-die value 1–6 has exactly one partner that makes 7, so 6 ways; for 6, a first die of 6 has no partner, so only 5 ways', 'P(sum 6): smaller sums are always more likely', 'They are equal: both are "one specific sum"', 'P(sum 7) because 7 is odd'], 0, 'For sum 7 the second die is forced to 7 − first, always in range. For sum 6 the first die cannot be 6. Ways: 6 vs 5, so 6/36 vs 5/36.'),

    // =====================================================================================================
    // DEGREE: charge → current → voltage → resistance → power → signs (EEEN11101 Principles of EEE)
    // =====================================================================================================
    q.info('E', 'Charge: what actually moves', `Everything in circuits starts with **charge**. Atoms have positive protons and negative electrons. In a metal, the outermost electron of each atom is only loosely held and wanders through the whole piece of metal: a sea of **free electrons**. In an **insulator** (plastic, glass, dry air) every electron is bound to its atom, so nothing can move.

Charge is measured in **coulombs (C)**. One coulomb is about 6.24 × 10¹⁸ electron charges: a lot.

Two facts about charge underpin every circuit law this semester:
1. **Charge is conserved.** It is never created or destroyed, only moved. What flows into a junction must flow out (Day 3, Kirchhoff's current law).
2. **Like charges repel, opposite charges attract.** Pushing electrons together costs energy. That stored energy is what "voltage" measures, two cards from now.`, {
      terms: [
        ['Charge', 'The property that makes things feel electric forces. Two signs; measured in coulombs.'],
        ['Coulomb (C)', 'The SI unit of charge: 6.24 × 10¹⁸ electron charges.'],
        ['Conductor', 'A material with charges free to move: metals, via free electrons.'],
        ['Insulator', 'A material whose charges are all bound: no current through it.'],
      ]
    }),
    q.info('E', 'Current: charge per second, with a direction', `**Current** is how much charge passes a point each second: **I = Q / t**, in coulombs per second, called **amperes (A)**. 2 A means 2 coulombs per second.

**A quirk of history.** Before electrons were known, Franklin guessed which charge moved and called it positive. He guessed wrong: in a metal the movers are negative electrons, drifting from the battery's − terminal to its +. Nothing broke, because a flow of negative charge one way is equivalent in every equation to positive charge flowing the other way. So everyone keeps his convention: **conventional current** is drawn from + to −, and every diagram, meter and formula uses it.

**How fast?** Electrons drift at millimetres per second, yet a lamp lights instantly, because the wire is already full of free electrons. Push at one end and the whole column moves at once, like water in a full hose. The push travels near light speed; the electrons barely move.

Because current is a flow, "2 A" is not a complete statement until you say which way: "2 A along this arrow". That is why diagrams carry arrows, and it is the root of today's sign story.`, {
      terms: [
        ['Current', 'Rate of charge flow, I = Q/t. Measured through a wire, in amperes.'],
        ['Ampere (A)', 'One coulomb per second.'],
        ['Conventional current', 'The direction positive charge would flow: from + to −. What every diagram and formula uses.'],
        ['Electron flow', 'The actual motion of electrons in a metal, from − to +. Equivalent to conventional current the other way.'],
      ]
    }),
    q.num('E', 'A charge of 3 coulombs passes a point in a wire in 2 seconds. Current in amperes?', 1.5, 'I = Q/t = 3/2 = 1.5 A.', { unit: 'A' }),
    q.num('E', 'A current of 2 A flows for 10 seconds. How much charge passed, in coulombs?', 20, 'Q = I·t = 2 × 10 = 20 C.', { unit: 'C' }),
    q.mc('E', 'In a copper wire connected to a battery, the electrons move from the − terminal towards the + terminal. Which way is **conventional current** drawn, and why is that not a problem?', ['From + to −; negative charge flowing one way is equivalent in every equation to positive charge flowing the other way', 'From − to +, to match the electrons', 'From + to −, because electrons are actually positive', 'It depends on the metal'], 0, 'Only the sign matters, and everyone uses the same convention, so all formulas stay consistent.'),
    q.tf('E', 'In a single loop with a battery and one resistor, the current leaving the battery is larger than the current returning to it, because the resistor uses some of it up.', false, 'Charge is conserved and cannot pile up in the loop, so the same current flows at every point. The resistor uses up energy (it gets warm), not charge.'),
    q.info('E', 'Voltage: energy per coulomb, always between two points', `Current needs a push. The push is energy given to each coulomb of charge. **Voltage** between two points is the energy a coulomb gains or loses going from one to the other: **1 volt = 1 joule per coulomb**.

**The height picture.** A battery is a pump that lifts charge to a higher electrical "height". The charge flows downhill through the circuit, giving up that energy as heat or light, and the battery lifts it again. Voltage is the height difference. Like height, it only makes sense **between two points**: "the voltage at this point" is as incomplete as "the height of this point" until you say relative to what. So we say voltage **across** a component and current **through** it.

**Ground.** To give single points a number, engineers pick one point, call it 0 V, and call it **ground**, exactly as maps use sea level. Moving ground shifts every number by the same amount and changes no difference, so nothing physical changes.

**Polarity.** A battery's chemistry fixes which terminal is the higher-energy end: its physical **+**. Because voltage is a difference it has a sign: V from a to b is minus V from b to a.`, {
      terms: [
        ['Voltage (potential difference)', 'Energy per unit charge between two points: joules per coulomb. Measured across two points.'],
        ['Volt (V)', 'One joule per coulomb.'],
        ['Potential', 'The electrical "height" of a point relative to the chosen reference.'],
        ['Ground (reference)', 'The point you choose to call 0 V, like sea level for heights.'],
        ['Polarity', 'Which end is + (higher potential) and which is −.'],
      ]
    }),
    q.num('E', 'A 12 V battery pushes 2 coulombs of charge around a circuit. How much energy did it give the charge, in joules?', 24, 'Energy = voltage × charge = 12 J/C × 2 C = 24 J.', { unit: 'J' }),
    q.mc('E', 'Point a is at 5 V and point b is at 2 V, both measured from the same ground. A resistor connects them. Which is true?', ['The voltage across the resistor is 3 V and conventional current flows through it from a to b', 'The voltage across the resistor is 7 V', 'Current flows from b to a because b is lower', 'No current flows because both points are above ground'], 0, 'Only the difference drives current: 5 − 2 = 3 V, downhill from a to b. Being above ground is irrelevant; ground is just the chosen zero.'),
    q.mc('E', 'Which phrase is physically meaningful?', ['The voltage across the resistor is 6 V', 'The voltage through the resistor is 6 V', 'The current across the resistor is 2 A', 'The voltage at the resistor is 6 V (with no reference stated)'], 0, 'Voltage is a difference between two points (across); current is a flow (through). A single-point voltage needs a stated reference.'),
    q.mc('E', 'If you moved the ground reference of a circuit from one node to another, what would change?', ['Every single-point voltage shifts by the same amount; every voltage difference, current and power stays the same', 'All currents reverse', 'The battery voltage changes', 'The circuit stops working'], 0, 'Ground is a choice of zero. Differences, which are all the physics cares about, are unchanged.'),
    q.info('E', "Resistance and Ohm's law: why the flow is proportional to the push", `Push charge through a metal. The free electrons speed up, bump into the vibrating metal atoms, lose their speed, speed up again. The result is a steady average drift, and for a metal at a fixed temperature the drift is **proportional** to the push: twice the voltage, twice the current. That experimental fact is **Ohm's law**:

**V = I · R**, so I = V / R and R = V / I.

**R** is the **resistance**, in **ohms (Ω)**: how many volts of push each ampere of flow needs. It is a property of the object: the material (how badly it obstructs electrons), the length (twice as long, twice as many collisions in a row: R doubles) and the cross-section (twice the area is two side-by-side paths: R halves). Together **R = ρ·L / A**, where ρ is the material's **resistivity**.

Two honest caveats. Ohm's law is not a law of nature; it describes metals and the parts sold as "resistors" very well. A lamp filament heats up and its resistance rises; a diode passes current one way only. Those are **non-ohmic**. And Ohm's law quietly assumes current flows through the resistor from its higher-potential end to its lower one. That assumption becomes the sign convention two cards from now.

Drag V and R below and watch I follow.`, {
      terms: [
        ['Resistance', 'Opposition to current: R = V/I. 1 Ω lets 1 A flow per 1 V.'],
        ['Ohm (Ω)', 'One volt per ampere.'],
        ['Ohmic', 'Current proportional to voltage (constant R): metals at fixed temperature, ordinary resistors.'],
        ['Non-ohmic', 'Current not proportional to voltage: filament lamps, diodes, LEDs.'],
        ['Resistivity (ρ)', 'How strongly a material obstructs current, per unit length and area. Copper 1.7 × 10⁻⁸ Ω·m.'],
      ],
      widget: W('ohm', { V: 12, R: 6 })
    }),
    q.num('E', '12 V across a 6 Ω resistor. Current in amperes?', 2, 'I = V/R = 12/6 = 2 A.', { unit: 'A' }),
    q.num('E', '9 V across a resistor drives 0.5 A through it. Resistance in ohms?', 18, 'R = V/I = 9/0.5 = 18 Ω.', { unit: 'Ω' }),
    q.mc('E', 'A resistor has 12 V across it. Keep the voltage the same and **double** the resistance. The current…', ['halves', 'doubles', 'stays the same', 'goes to zero'], 0, 'I = V/R: doubling R halves I.'),
    q.mc('E', 'Which of these is an **ohmic** component (current proportional to voltage)?', ['A metal-film resistor at constant temperature', 'A filament lamp warming up', 'A diode', 'An LED'], 0, 'Ohm\'s law describes metals at fixed temperature and manufactured resistors. Filaments change resistance as they heat; diodes and LEDs conduct very unequally in the two directions.'),
    q.info('E', 'What resistance depends on: R = ρ·L/A', `Two wires of the same copper: one twice as long has **twice** the resistance, because charge must get past twice as many obstacles in a row. One with twice the cross-section has **half** the resistance, because there are twice as many lanes for the same push. (That is Day 4's parallel-resistor rule in disguise.)

The material sets the scale through its resistivity ρ. Copper is used for wiring because ρ is tiny; nichrome is used for kettle elements because ρ is about 65 times larger, so a short coil dissipates real heat. Temperature matters too: metals get more resistive when hot (more atomic vibration, more collisions), which is why a cold lamp filament draws a surge of current at switch-on.

Drag length, area and material below.`, {
      terms: [
        ['Cross-section area (A)', 'The area of the wire\'s cut face. More area, more parallel paths, less resistance.'],
        ['Temperature coefficient', 'How much R changes per degree. Positive for metals: hotter means more resistance.'],
        ['Inrush current', 'The large current a cold filament or motor draws at switch-on.'],
      ],
      widget: W('wireR', { L: 2, A: 1 })
    }),
    q.num('E', 'A copper wire has resistance 4 Ω. A second copper wire has the same cross-section but is twice as long. Its resistance in ohms?', 8, 'R ∝ L: twice the length, twice the collisions in series, 8 Ω.', { unit: 'Ω' }),
    q.mc('E', 'Why is nichrome, not copper, used for a kettle element?', ['Its resistivity is about 65× higher, so a short coil has enough resistance to dissipate kilowatts as heat', 'It is a better conductor than copper', 'It is cheaper than copper', 'It does not conduct at all'], 0, 'Heating needs resistance. Copper is chosen for wiring precisely because it wastes almost no energy as heat.'),
    q.info('E', 'Power: where the energy goes', `Put the two definitions together. Voltage is joules per coulomb; current is coulombs per second. Multiply and the coulombs cancel:

**P = V · I** &nbsp; (J/C) × (C/s) = J/s = **watts (W)**.

That is the rate at which energy is delivered to the component. In a resistor every joule becomes heat: the electrons hand their energy to the vibrating atoms in those collisions. Substitute Ohm's law for the other two forms: **P = I²R** (when you know the current) and **P = V²/R** (when you know the voltage). All three say the same thing.

**Why it matters.** Every resistor has a **power rating**, typically ¼ W for a small breadboard part. Exceed it and the part chars. A 1 kΩ, ¼ W resistor can take at most V = √(P·R) = √250 ≈ 15.8 V. Power also sets the electricity bill: energy = power × time, tomorrow's topic.`, {
      terms: [
        ['Power', 'Energy per second, in watts. For a resistor P = V·I = I²R = V²/R.'],
        ['Watt (W)', 'One joule per second.'],
        ['Dissipation', 'Energy turned into heat in a component.'],
        ['Power rating', 'The most power a part can dissipate safely: ¼ W for a common small resistor.'],
      ]
    }),
    q.num('E', '12 V across a 6 Ω resistor. Power dissipated, in watts?', 24, 'I = 12/6 = 2 A, so P = V·I = 12 × 2 = 24 W. Also I²R = 4 × 6 = 24 and V²/R = 144/6 = 24.', { unit: 'W' }),
    q.num('E', 'A 1 kΩ resistor is rated at ¼ W. Largest voltage it can safely have across it, in volts, to 1 d.p.?', 15.8, 'P = V²/R → V = √(P·R) = √(0.25 × 1000) = √250 ≈ 15.8 V.', { unit: 'V', tol: 0.1 }),
    q.mc('E', 'You know the current through a resistor and its resistance, but not the voltage. The quickest correct power formula is…', ['P = I²R', 'P = V²/R', 'P = V/I', 'P = R/I'], 0, 'I²R uses exactly what you know. V/I is resistance, not power.'),
    q.num('E', 'Exam-style: a 2 kW kettle runs from a 230 V supply. Current drawn, in amperes, to 1 d.p.?', 8.7, 'I = P/V = 2000/230 ≈ 8.7 A. That is why kettles have 13 A plugs.', { unit: 'A', tol: 0.1 }),
    q.info('E', 'Signs: who chooses the + and −, and why it matters', `A battery has a real +: chemistry decides which terminal is the higher-energy end. **A resistor has no + printed on it.** Turn it round and nothing changes. So where do the + and − on a resistor in a diagram come from?

**1. They are your labels, and you need them because both quantities are signed.** Voltage is a difference, so to write it as one number you must say which end you measure from: the + label means "from this end". Current is a flow, so you must say which way counts as positive: the arrow. Choosing them is like choosing which way is positive x on a graph. Any choice works; it just has to be made before any number is written.

**2. You may guess, and the sign of the answer corrects you.** If you had to know the true direction first, you could never solve a circuit with an unknown current. So you draw an arrow, solve, and if the answer is −3 A the current is 3 A the other way. Negative results are the method working, not a mistake.

**3. But then P = V·I could mean "absorbs" or "delivers".** With arbitrary labels a resistor's v·i might come out −24 W, as if it generated energy. So everyone agrees on the **passive sign convention**: draw the current arrow **entering the + label**. Then P = v·i > 0 means the component **absorbs** energy (a resistor, always) and P < 0 means it **delivers** energy (a battery in use). With that agreement, the v·i of every component in a circuit adds to exactly zero: energy delivered equals energy absorbed.

**4. Sources obey it too.** Current leaves a battery's +, so under the convention its current is negative: P = 12 × (−2) = −24 W, it delivers 24 W. A charger pushing current *into* the + gives P > 0: the battery is absorbing, i.e. charging. One formula, no special cases.

**5. Ohm's law wears the same convention.** V = I·R is true when the arrow enters the + end. Arrow into the − end, and the honest equation is V = −I·R. Use the convention and you never need that minus sign.

In the simulation the physics is fixed: current really flows clockwise and the resistor really heats. Flip the label and the arrow and watch what changes.`, {
      terms: [
        ['Reference direction', 'The + label and current arrow you choose before calculating. A negative result means the real direction is opposite to your arrow.'],
        ['Passive sign convention', 'Draw the current arrow entering the + label. Then P = v·i > 0 means absorbing energy, P < 0 means delivering it.'],
        ['Absorb / deliver', 'Take energy in (a resistor: heat) / give energy out (a battery in use).'],
        ['Conservation of energy (Tellegen)', 'Under the passive convention, v·i summed over every component of a circuit is zero.'],
      ],
      widget: W('psc', { V: 12, R: 6, plusTop: true, arrowCW: true })
    }),
    q.goal('E', 'In the simulation the current arrow starts pointing **up** the resistor while the + label is at the **top**. Change one label so the arrow enters the + end (the passive sign convention holds).', W('psc', { V: 12, R: 6, plusTop: true, arrowCW: false }), s => s.psc,
      'Either flip the arrow (down, entering the top +) or flip the + label (to the bottom, where the upward arrow enters). Both satisfy the convention; the physics never changed.'),
    q.mc('E', 'A resistor in a circuit diagram has no + printed on it. Where does its + label come from?', ['You choose it as a reference direction before calculating; a negative answer just means the real direction is opposite', 'It is a physical property measured with a meter', 'The manufacturer marks it', 'Only batteries can have a + label'], 0, 'Reference directions are bookkeeping. The passive sign convention says: make the current arrow enter the + end, then P = VI is positive for absorbing.'),
    q.num('E', 'A component has 5 V across it with the + label at its top end, and 2 A flowing **into** the top end. Under the passive sign convention, what is its power in watts (sign included)?', 10, 'The arrow enters the + end, so P = v·i = 5 × 2 = +10 W: it absorbs 10 W.', { unit: 'W' }),
    q.num('E', 'A component has 5 V across it with the + label at its top end, and 2 A flowing **out of** the top end. Under the passive sign convention, what is its power in watts (sign included)?', -10, 'Current entering the + end is −2 A, so P = 5 × (−2) = −10 W: it delivers 10 W. This component is acting as a source.', { unit: 'W' }),
    q.mc('E', 'You draw a current arrow left-to-right through a resistor, solve the circuit, and get I = −3 A. What does that mean?', ['3 A flows right-to-left; the arrow was a guess and the sign corrected it', 'The circuit is broken', 'The resistor is generating energy', 'You must redo the calculation with the arrow reversed to get a valid answer'], 0, 'Negative just means opposite to the reference arrow. Keep −3 A or restate it as 3 A the other way; both are correct.'),
    q.multi('E', 'Which components have a polarity fixed by physics rather than chosen by you?', ['A battery', 'An LED', 'A resistor', 'A plain wire'], [0, 1], 'A battery\'s chemistry fixes its +; an LED conducts only one way, so it has a physical anode and cathode. A resistor or wire behaves identically either way round, so its + is your label.'),
    q.mc('E', 'A 12 V battery drives 2 A around a circuit. Under the passive sign convention, the power of the **battery** is…', ['−24 W: it delivers 24 W', '+24 W: it absorbs 24 W', '0 W: batteries have no power', '24 W with no sign, because sign only applies to resistors'], 0, 'Current leaves the + terminal, so the current entering + is −2 A: P = 12 × (−2) = −24 W. Negative means delivering.'),
    q.num('E', 'A 12 V battery is being **charged**: the charger forces 1 A **into** its + terminal. Under the passive sign convention, the battery\'s power in watts (sign included)?', 12, 'Arrow into +, current +1 A: P = 12 × 1 = +12 W. Positive means absorbing: the battery is storing energy. Same formula as when it delivers; only the sign of the current changed.', { unit: 'W' }),
    q.tf('E', 'Under the passive sign convention, the sum of v·i over every component in a complete circuit is zero.', true, 'Energy delivered by sources equals energy absorbed by everything else. In the battery-and-resistor loop: −24 W + 24 W = 0.'),
    q.mc('E', 'Exam-style: under the passive sign convention, can a resistor\'s power ever come out negative in a correct calculation?', ['No: with the arrow entering +, Ohm\'s law gives v = i·R, so v·i = i²R ≥ 0; a negative value means the labels violate the convention or there is an arithmetic slip', 'Yes, when the current is negative', 'Yes, when the voltage is negative', 'Yes, for resistors above 1 kΩ'], 0, 'A resistor only absorbs. A negative resistor power is a bookkeeping error, not physics.'),
    q.mc('E', 'Exam-style: a current arrow is drawn entering the **−** end of a 4 Ω resistor, and the current along that arrow is +2 A. What is the voltage measured from the + label to the − label?', ['−8 V: with the arrow into the − end, Ohm\'s law reads v = −i·R', '+8 V: Ohm\'s law is always v = i·R', '0 V', '2 V'], 0, 'Current physically flows from the resistor\'s higher end to its lower end. Entering at the − label means the − end is actually the higher one, so v(+ to −) = −8 V. Use the passive convention and you avoid this minus sign entirely.'),
    q.info('E', 'Real resistors: tolerance, rating, and the LED series resistor', `Manufactured resistors are not exact. A **tolerance** of ±5 % on a 220 Ω part means the real value is anywhere from 209 Ω to 231 Ω. Values come from a standard series (E12: 10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82 and their multiples). When a calculation says 350 Ω, you buy 330 Ω or 390 Ω and check that either still works.

**Worked example: the LED.** An LED is non-ohmic: once its **forward voltage** (about 2 V for red) is reached, its current climbs almost vertically with any extra voltage. Connect it straight across 5 V and the current runs away and destroys it. So you add a **series resistor** to set the current. The resistor sees the supply minus the LED drop: with 5 V, a 2.0 V LED and 220 Ω, I = (5 − 2)/220 = 13.6 mA, a comfortable brightness. The resistor dissipates 3 V × 13.6 mA = 41 mW, far below ¼ W.

To design one: choose the current (say 20 mA), compute R = (V_supply − V_LED)/I, pick the nearest standard value, then check the resistor's power against its rating.`, {
      terms: [
        ['Tolerance', 'The guaranteed accuracy band of a part: ±5 % on 220 Ω means 209 … 231 Ω.'],
        ['E12 series', 'The standard set of 12 resistor values per decade.'],
        ['Forward voltage', 'The voltage at which a diode or LED starts to conduct strongly: about 2 V for a red LED.'],
        ['Series resistor', 'A resistor in the path that limits current to a non-ohmic device such as an LED.'],
      ]
    }),
    q.num('E', 'Exam-style: a 5 V supply, a 220 Ω resistor in series with an LED that drops 2.0 V. Current in mA, 1 d.p.?', 13.6, 'The resistor sees 5 − 2 = 3 V: I = 3/220 = 0.01364 A = 13.6 mA.', { unit: 'mA', tol: 0.1 }),
    q.mc('E', 'Why must an LED have a series resistor when driven from a 5 V supply?', ['The LED is non-ohmic: above its forward voltage its current rises almost vertically, so without a resistor the current runs away and destroys it', 'To make the LED brighter', 'Because LEDs only work with resistors of exactly 220 Ω', 'To convert the 5 V to 2 V without any current'], 0, 'The resistor takes up the difference between the supply and the LED\'s forward voltage and sets the current by Ohm\'s law.'),
    q.num('E', 'Exam-style: design a series resistor for a red LED (forward voltage 2.0 V) to carry 20 mA from a 9 V supply. Exact resistance in ohms?', 350, 'R = (9 − 2)/0.020 = 350 Ω. You would buy 330 Ω (21 mA) or 390 Ω (18 mA).', { unit: 'Ω' }),
    q.num('E', 'Exam-style: a 9 V supply, a 2.0 V LED and a 350 Ω series resistor carrying 20 mA. Power dissipated in the resistor, in **milliwatts**?', 140, 'The resistor has 7 V across it: P = 7 × 0.020 = 0.14 W = 140 mW. A ¼ W (250 mW) part is fine.', { unit: 'mW' }),
    ...genius(q, 1),
  ]
};
