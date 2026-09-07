import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(12);

export default {
  title: 'Priority encoders, exceptions, stars and bars, RMS',
  emoji: '🥇',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Week 2, day 5. **Hardware** (H01 L3): many requests, one winner — what a priority encoder is for, why the "nobody asked" case must be written into the contract rather than left to the tool, how the encoder is built and tested at widths 1, 4, 8 and 17, fixed priority vs starvation, and the signed-comparator trap. **Code** (S01): what an exception really is and why Python prefers it to an error return, catching the specific one, `else`/`finally`, raising your own, turning an exception into a structured rejection at a trust boundary, and dataclasses as readable records. **Maths** (M01 L3/L4): the three questions to ask before counting, stars and bars derived as a bijection, why distinguishable jobs is a different problem, and bounded occupancy (at least one, at most four) by inclusion–exclusion. **Degree** (E10 L1): why the average of an AC voltage tells you nothing, RMS defined so that P = V²/R still works, the √2 for a sine derived, other waveshapes, why a cheap multimeter lies on them, and energy in joules and kWh.',
  takeaway: 'An encoder with **no** asserted request has no winner, so the contract needs a separate `valid` bit; "don\'t care" in a spec becomes "random" in silicon. Catch the exception you expect, never all of them. 8 identical jobs into 3 labelled queues = C(10, 2) = 45; distinguishable jobs would be 3⁸. RMS is defined by **average the square, then take the root**, so that P = Vrms²/R; for a sine that gives peak/√2, and for nothing else.',
  steps: [
    // =====================================================================================================
    // HARDWARE — priority encoders and the no-request contract (H01 L3)
    // =====================================================================================================
    q.info('H', 'Eight things want attention at once', `Picture eight blocks on a chip, each with one wire it pulls high when it wants service. One shared resource — a memory port, a bus, an output register — can serve one of them per cycle.

Two problems. First, the wires say *who* wants service in a wasteful way: eight wires, but the answer you need is a single number 0–7, which is three bits. Second, several wires can be high at once, and someone has to pick.

A **priority encoder** does both jobs in one lump of logic. It looks at the request wires, picks the winner by a fixed rule (say: the highest-numbered request wins), and outputs that number in binary.

The fixed rule is what makes it *priority*. There is no negotiation and no memory of who went last. The same request pattern always produces the same winner, this cycle and every cycle, which is exactly what you want when you have to reason about a circuit.`, {
      terms: [
        ['Request line', 'One wire per client, pulled high to mean "I want the shared resource".'],
        ['Encoder', 'Logic that turns "which one of n wires is active" into the binary index of that wire.'],
        ['Priority encoder', 'An encoder that also resolves several active wires at once, by a fixed ranking.'],
        ['Arbitration', 'Deciding which of several requesters gets a shared resource this cycle.'],
        ['Index', 'The number of the winning line, 0 … n−1. n lines need ⌈log₂ n⌉ bits.'],
      ],
      widget: W('prienc', { n: 8, value: 0 })
    }),
    q.goal('H', 'In the 8-line priority-encoder simulation, assert **req3 and req5 together** (highest index wins) and watch which one takes the output.', W('prienc', { n: 8, value: 0, target: 0b00101000 }), s => Boolean((s.req & 0b00100000) && (s.req & 0b00001000)),
      'With both high the encoder reports index 5 (binary 101) and valid = 1. req3 is invisible at the output until req5 goes away — that is fixed priority working as designed, and also its weakness.'),
    q.info('H', 'The output when nobody asks', `Count the cases. Eight request lines have 256 patterns, and 255 of them have a winner. One does not: all wires low.

The index output cannot say "nobody". Three bits have eight patterns and all eight already mean a real line. Index 0 is taken by req0. So the encoder needs **one more wire**: a **valid** bit that is 1 when a winner exists and 0 when none does.

Then what should the index show when valid is 0? Nothing sensible — but it must show *something*, because a wire always carries a voltage. The honest move is to write the choice into the specification: "when valid = 0, the index reads 0 and the consumer must ignore it".

Leaving it as "don't care" is the trap. The synthesis tool reads that as permission and picks whatever is cheapest, which may differ between builds. Your simulation may show a tidy 0 while the chip shows 7. The testbench then passes by luck, not by agreement.`, {
      terms: [
        ['Valid bit', 'A one-bit output meaning "the rest of my outputs are meaningful this cycle".'],
        ['Contract', 'The written agreement about what every output means, including in the awkward cases.'],
        ["Don't care", 'A spec saying any value is acceptable. The tool then chooses for you, and may choose differently next build.'],
        ['Synthesis', 'The tool that turns your HDL description into real gates. It optimises anything you did not pin down.'],
        ['Passes by luck', 'A test that agrees with the design only because both happened to pick the same unspecified value.'],
      ]
    }),
    q.mc('H', 'An 8-line priority encoder is given a request pattern in which **no** line is asserted. What should it output?', ['valid = 0, plus an index value the specification names (say 0) that consumers are told to ignore', 'index 7, because 7 is the highest priority', 'index 8, a special "none" code', "whatever the synthesis tool finds cheapest — it is a don't-care"], 0, 'Three index bits cannot encode nine outcomes, so a separate valid bit carries "nobody asked". The index still has to carry some value, so name it in the spec instead of letting the tool decide.'),
    q.num('H', 'A priority encoder has **8** request lines. How many bits does its index output need?', 3, '8 indices, 0 … 7, and 2³ = 8. The valid bit is extra and does not count as an index bit.'),
    q.num('H', 'A priority encoder has **40** request lines. How many bits does its index output need?', 6, 'You need 2^b ≥ 40. 2⁵ = 32 is too few; 2⁶ = 64 is enough, so 6 bits (24 of the codes are never produced).'),
    q.info('H', 'Building one, and testing it at awkward widths', `The plain way to build it in hardware: for each line i, output i if line i is high and every higher-numbered line is low. That is one AND per line, and the "every higher line is low" terms can be shared down the chain, so the cost grows roughly with the number of lines.

Write it once with the number of lines as a **parameter**, and the same source serves 4 lines or 40.

That is also why the handbook insists on testing at widths **1, 4, 8 and 17**. Width 1 is a real design: one request line, a zero-bit index, and the whole job falls to the valid bit. Width 17 is not a power of two and not a byte, so it catches code that quietly assumed 8 or 16. Between them they break almost every hidden assumption.

At each width, test all-zero, each single request alone, and several at once — for 8 lines that is only 256 patterns, so test **all** of them.`, {
        terms: [
          ['Parameter', 'A width or size left as a symbol in the source, so one description covers every size.'],
          ['Exhaustive test', 'Trying every possible input. Practical here: 8 lines is 256 patterns.'],
          ['Awkward width', 'A width that is not 8, 16 or 32 — like 1 or 17. It exposes assumptions the author did not know they made.'],
          ['Chain', 'The shared "nothing higher is asserted" signal passed down the lines; it is what makes priority cheap.'],
        ]
      }),
    q.num('H', 'How many distinct request patterns does an exhaustive test of an **8-line** priority encoder have to apply?', 256, 'Each of the 8 lines is independently 0 or 1: 2⁸ = 256 patterns, including the all-zero one. That is nothing for a simulator, so there is no excuse for sampling.'),
    q.mc('H', 'Why does the handbook ask for a priority encoder to be tested at width **17** as well as 8?', ['17 is neither a power of two nor a byte multiple, so it catches code that silently assumed a standard width', '17 is the largest width real hardware supports', 'Prime widths are faster in silicon', 'Odd widths change the priority order'], 0, 'Bugs hide in assumptions like "the index is 3 bits" or "one byte holds the requests". A width nobody would choose by habit flushes them out.'),
    q.code('H', 'Build: write `solve(w, patterns, mode)`, a model of a **parameterised priority encoder** with `w` request lines. `patterns` is a list of integers; in each one, bit *i* set means request line *i* is asserted. `mode` is `"high"` (the highest-numbered asserted line wins) or `"low"` (the lowest-numbered wins). Return a list with one `[index, valid]` pair per pattern. The contract for a pattern with **no** line asserted is `[0, 0]`: index 0, valid 0. It must work at w = 1 and w = 17, and 50,000 patterns must fit the time budget.', {
      fn: 'solve',
      starter: 'def solve(w, patterns, mode):\n    out = []\n    for p in patterns:\n        if p == 0:\n            out.append([0, 0])      # the declared no-request contract\n        elif mode == "high":\n            pass                    # index of the highest set bit\n        else:\n            pass                    # index of the lowest set bit\n    return out\n',
      tests: [
        { args: [8, [0], 'high'], expect: [[0, 0]], name: 'no request: the contract says index 0, valid 0' },
        { args: [8, [0b00101000], 'high'], expect: [[5, 1]], name: 'lines 3 and 5 asserted, highest wins' },
        { args: [8, [0b00101000], 'low'], expect: [[3, 1]], name: 'same pattern, lowest-wins policy' },
        { args: [8, [1, 2, 4, 128], 'high'], expect: [[0, 1], [1, 1], [2, 1], [7, 1]], name: 'single requests give their own index' },
        { args: [1, [0, 1], 'high'], expect: [[0, 0], [0, 1]], name: 'width 1: index is always 0, only valid distinguishes' },
        { args: [17, [1 << 16, 1 << 16 | 1], 'high'], expect: [[16, 1], [16, 1]], name: 'width 17: the top line is index 16' },
        { args: [4, [15], 'low'], expect: [[0, 1]], name: 'all four asserted, lowest-wins' },
        { args: [8, [], 'high'], expect: [], name: 'no patterns at all: empty trace' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        w = random.choice([1, 2, 4, 8, 17])\n        n = random.randint(1, 20)\n        yield [w, [random.randint(0, 2 ** w - 1) for _ in range(n)], random.choice(["high", "low"])]',
      refCode: 'def ref(w, patterns, mode):\n    res = []\n    for p in patterns:\n        idx, val = 0, 0\n        order = range(w - 1, -1, -1) if mode == "high" else range(w)\n        for i in order:\n            if (p >> i) & 1:\n                idx, val = i, 1\n                break\n        res.append([idx, val])\n    return res',
      speed: { gen: 'def gen():\n    return [17, [random.randint(0, 2 ** 17 - 1) for _ in range(50000)], "high"]', budgetMs: 1500, label: '50,000 patterns, width 17' },
      solution: 'def solve(w, patterns, mode):\n    out = []\n    for p in patterns:\n        if p == 0:\n            out.append([0, 0])\n        elif mode == "high":\n            out.append([p.bit_length() - 1, 1])\n        else:\n            out.append([(p & -p).bit_length() - 1, 1])\n    return out'
    }, 'The zero pattern is handled first and on its own, exactly as the hardware contract states it: there is no winner, so valid = 0 and the index is the agreed filler. For the highest set bit, `p.bit_length()` counts the bits up to and including the top one, so the index is one less. For the lowest, `p & -p` clears every bit except the lowest set one (two\'s complement negation flips and adds one, so the bits below the lowest 1 stay 0 and everything above flips), then the same bit_length trick reads its position. Both are one step per pattern, so 50,000 patterns is one fast pass; a bit-by-bit scan is also fine, just w times slower. The hidden checks use widths 1, 2, 4, 8 and 17 and both policies.'),
    q.info('H', 'Two things fixed priority costs you', `**Starvation.** With highest-wins, line 7 can hold its request high forever and lines 0–6 never get a turn. Nothing is broken; the design is doing what you asked. Fixed priority is right when the ranking really is a ranking (an error must beat a status update). When the clients are peers, you want a rotating scheme instead, so the winner moves on each cycle.

**Comparison.** The encoder's sibling is the **comparator**, which reports whether a < b, a = b or a > b. The trap is that the answer depends on how you agreed to read the bits. Take 8-bit \`11111111\` and \`00000001\`. Read as unsigned, the first is 255 and the bigger. Read as two's complement, the first is −1 and the smaller.

Same wires, opposite answers. The comparator you build must match the signedness written in the contract, and a signed value compared by unsigned logic is one of the classic silent bugs.`, {
      terms: [
        ['Starvation', 'A requester that never wins because a higher-priority one keeps asking.'],
        ['Round robin', 'A rotating priority scheme: the line that just won drops to the bottom of the ranking.'],
        ['Comparator', 'Logic that reports the ordering of two numbers: less, equal or greater.'],
        ['Signedness', 'Whether a bit pattern is read as unsigned or as two\'s complement. It is a choice, not a property of the wires.'],
      ]
    }),
    q.mc('H', 'Two 8-bit patterns `11111111` and `00000001` are compared as **two\'s complement signed** values. Which is true?', ['11111111 is smaller: as signed it is −1, and −1 < 1', '11111111 is larger: 255 > 1', 'They are equal', 'Signed comparison of 8-bit values is undefined'], 0, 'All-ones is −1 in two\'s complement. An unsigned comparator on the same wires would answer 255 > 1 — opposite, and silently wrong if the contract said signed.'),
    q.mc('H', 'Interview: a fixed highest-wins priority encoder arbitrates a shared bus between eight peer DMA engines. Engine 7 keeps its request asserted. What happens, and what would you change?', ['Engines 0–6 are starved forever; peers need a rotating (round-robin) priority so the winner drops to the bottom of the ranking after each grant', 'Nothing: the encoder alternates between requesters automatically', 'The encoder outputs valid = 0 because there is a conflict', 'Engine 7 is blocked after its first grant'], 0, 'Fixed priority is deliberate unfairness, which is correct when the clients really are ranked. Peers need fairness, and round robin is the cheapest way to get it.'),
    q.mc('H', 'Interview: a colleague drives an 8-to-1 data mux directly from a priority encoder\'s index and leaves the `valid` output unconnected. What is the first failure you would predict?', ['With no request asserted the index still reads 0, so the mux keeps forwarding channel 0\'s data as if it had been selected', 'The mux will output all zeros, which is safe', 'Synthesis will refuse to build the design', 'The index bits float and the chip draws excess current'], 0, 'The index is only meaningful when valid is 1. Dropping valid turns "nobody asked" into "channel 0 asked", and the downstream block cannot tell the difference. Gate the mux enable with valid.'),
    q.mc('H', 'Interview: your priority encoder passes 100,000 random request patterns at width 8, but the spec says widths 1 to 32 are supported. What is the strongest objection to shipping it?', ['Random patterns at one width say nothing about the widths that break assumptions: 8 lines only has 256 patterns, so test those exhaustively and repeat at widths 1, 17 and 32', 'It should be 1,000,000 patterns instead of 100,000', 'Random testing is never valid evidence', 'The design should be rewritten without a parameter'], 0, 'A huge count at a comfortable width is cheap confidence. Exhaustive at width 8 is stronger and faster, and the awkward widths (1, 17, 32) are where the parameterisation actually fails.'),

    // =====================================================================================================
    // CODE — exceptions, and dataclasses as records (S01)
    // =====================================================================================================
    q.info('S', 'When a function cannot answer', `\`int("abc")\` has no sensible number to return. What should it do?

One option is an error value: return \`None\`, or \`-1\`. Two things go wrong. The caller can forget to check, and then the bad value flows on and blows up somewhere far away with no clue where it came from. And for a general function there may be no spare value to sacrifice — \`-1\` is a perfectly good result for something.

Python's answer is an **exception**. The function stops immediately and throws an object describing what went wrong. That object travels back up through every caller until one of them says "I was expecting this one, I will handle it". If nobody does, the program stops and prints where it happened.

So the default is loud and traceable. You get a wrong answer only if you deliberately silence the error, which is the opposite of the error-value default.`, {
      terms: [
        ['Exception', 'An object describing a failure, thrown instead of returning a value.'],
        ['Raise', 'To throw an exception: `raise ValueError("opcode 7 unknown")`.'],
        ['Propagate', 'The way an uncaught exception travels up through the callers until something catches it.'],
        ['Traceback', 'The printed chain of calls showing exactly where an uncaught exception came from.'],
        ['Error value', 'The alternative style: return a special value such as None or −1 to mean failure. Easy to ignore by accident.'],
      ],
      widget: W('tryexcept', {})
    }),
    q.info('S', 'Catch the one you expect, and nothing else', `\`try:\` runs code; \`except SomeError:\` says what to do if that particular failure happens.

\`\`\`
try:
    n = int(text)
except ValueError:
    return Rejected("not a number")
\`\`\`

Name the exception. A bare \`except:\` catches *everything* — a typo in a variable name (\`NameError\`), running out of memory, even your own Ctrl-C. The bug you were hunting becomes a silent "rejected", and the program looks fine while doing nothing useful.

The common ones say what kind of failure it was. \`ValueError\`: right type, impossible value (\`int("abc")\`). \`TypeError\`: wrong type entirely (\`len(5)\`). \`IndexError\`: list position that does not exist. \`KeyError\`: missing dictionary key. \`ZeroDivisionError\` speaks for itself.

Two extras worth knowing: \`else:\` runs only when the \`try\` block did **not** raise, which keeps the protected block down to the one line that can fail; \`finally:\` runs either way, and is where you close a file.`, {
      terms: [
        ['try / except', 'Run a block; if the named exception is raised inside it, run the handler instead of crashing.'],
        ['Bare except', '`except:` with no exception named. Catches everything, including your own typos. Almost always wrong.'],
        ['ValueError / TypeError', 'Right type but impossible value / wrong type altogether.'],
        ['IndexError / KeyError', 'List position out of range / dictionary key not present.'],
        ['else / finally', '`else` runs when nothing was raised; `finally` runs either way, for cleanup.'],
      ]
    }),
    q.mc('S', 'What exception does `int("abc")` raise in Python?', ['ValueError', 'TypeError', 'KeyError', 'IndexError'], 0, 'The argument is a string, which is the type `int()` accepts, so the type is fine. It is the *value* that cannot be converted, hence ValueError. `int([1,2])` would be a TypeError.', { grid: true }),
    q.mc('S', 'A Python program reads `xs = [1, 2, 3]` then `xs[9]`. Which exception is raised?', ['IndexError', 'KeyError', 'ValueError', 'TypeError'], 0, 'A list position outside 0 … len−1 raises IndexError. KeyError is the dictionary version, for a key that is not present.', { grid: true }),
    q.tf('S', 'Wrapping a whole program in `try: ... except: pass` is good defensive programming, because it means the program never crashes.', false, 'It catches every failure, including typos (NameError), memory exhaustion and Ctrl-C. The program stops crashing and starts silently producing nothing. Catch the specific exception you expect at the specific place you expect it, and let the rest surface.'),
    q.mc('S', 'What is the point of putting code in the `else:` clause of a `try` statement, rather than at the end of the `try` block?', ['Only the line that can actually fail stays inside `try`, so the handler cannot accidentally catch a failure from unrelated code that runs afterwards', '`else` runs faster than code inside `try`', '`else` runs when the exception was raised', 'It is required whenever you use `except`'], 0, 'A fat `try` block is how a handler ends up swallowing an error it was never written for. `else` runs only when nothing was raised, so the protected region stays honest.'),
    q.info('S', 'Raising your own, and what a boundary should return', `Use \`raise\` when your own code discovers something it cannot handle: \`raise ValueError("length must be 16 bytes")\`. Make the message say the actual value, not just "bad input" — it is the only clue a reader gets.

Now a design question. A decoder sits at a **boundary**: bytes arrive from a network and cannot be trusted. Should a malformed message raise, or return a rejection?

If bad input is unexpected — a bug on your own side — raise. If bad input is *expected traffic*, an exception is the wrong shape. You want to count rejections by reason, log them and test each rule, and that is easier when a rejection is an ordinary returned value: \`("rejected", "out_of_range")\`.

The usual pattern is both. Let low-level helpers raise something specific, catch it at the boundary, and turn it into a structured result with a reason code. Never turn it into \`None\`, which throws away the reason.`, {
      terms: [
        ['raise', 'Throw an exception deliberately from your own code.'],
        ['Trust boundary', 'The line where data from outside enters your program. Everything crossing it is validated.'],
        ['Reason code', 'A short fixed string or enum naming *why* something was rejected, so rejections can be counted and tested.'],
        ['Structured result', 'A returned value carrying both the outcome and the reason, e.g. ("rejected", "not_a_number").'],
      ]
    }),
    q.mc('S', 'A message decoder on a network boundary meets an opcode it does not recognise. Which design does the handbook favour?', ['Return a structured rejection carrying a reason code (or raise a specific ParseError that the boundary converts into one)', 'Print a warning and carry on decoding the rest of the message', 'Return None so the caller knows something went wrong', 'Catch it with a bare except and ignore it'], 0, 'Malformed input from a network is expected traffic, not a bug, so it deserves a countable, testable result. None loses the reason; printing loses it too, since nothing downstream can act on prose.'),
    q.info('S', 'Dataclasses: records with names', `A decoded message has fields: symbol, price, quantity, sequence number. Returning them as a tuple means the rest of your program says \`msg[2]\`, and one inserted field silently breaks every reader.

A **dataclass** is a small class where you just list the fields and their types:

\`\`\`
from dataclasses import dataclass

@dataclass
class Quote:
    symbol: int
    price: int
    qty: int
\`\`\`

You get three things free. A constructor, so \`Quote(7, 250, 100)\` works. A readable printout, so a failing test shows \`Quote(symbol=7, price=250, qty=100)\` instead of an address. And equality by field, so \`assert got == expected\` compares the contents and shows which field differs.

That last one is why reference models are written this way: the expected value is a literal record, and the diff reads like English. Add \`frozen=True\` and the record cannot be modified after construction, which is what you want for something decoded once.`, {
      terms: [
        ['Dataclass', 'A decorator that builds __init__, __repr__ and __eq__ from a list of typed fields.'],
        ['Field', 'One named, typed member of the record: `price: int`.'],
        ['frozen=True', 'Makes instances read-only after construction — useful for decoded data that should never be edited.'],
        ['__repr__ / __eq__', 'The methods behind printing an object and comparing two objects with ==.'],
      ]
    }),
    q.mc('S', 'Why prefer a dataclass over a plain tuple for a decoded message with four fields?', ['Named typed fields, a readable printout and field-by-field equality come for free, so a failing test names the field that differs', 'A dataclass uses less memory than a tuple', 'Tuples cannot hold integers', 'Only dataclasses can be returned from a function'], 0, '`msg.price` survives an inserted field; `msg[2]` does not. And `Quote(symbol=7, price=250, qty=100)` in a failure message beats a bare tuple every time.'),
    q.code('S', 'Write `solve(text)`, the validator for a quantity field arriving as text from an untrusted source. Return `["ok", value]` when `text` is a run of digit characters whose numeric value is 1 … 65535 inclusive. Return `["rejected", "not_a_number"]` when it is not a run of digits, or when it looks like digits but Python still refuses to convert it. Return `["rejected", "out_of_range"]` when it converts but falls outside 1 … 65535. No exception may escape your function.', {
      fn: 'solve',
      starter: 'def solve(text):\n    if not text.isdigit():\n        return ["rejected", "not_a_number"]\n    try:\n        value = int(text)\n    except ValueError:\n        # isdigit() is true for some characters int() will not take\n        return ["rejected", "not_a_number"]\n    # range check goes here\n    return ["ok", value]\n',
      tests: [
        { args: ['100'], expect: ['ok', 100] },
        { args: ['1'], expect: ['ok', 1], name: 'exactly at the lower limit' },
        { args: ['65535'], expect: ['ok', 65535], name: 'exactly at the upper limit' },
        { args: ['0'], expect: ['rejected', 'out_of_range'], name: 'one below the lower limit' },
        { args: ['65536'], expect: ['rejected', 'out_of_range'], name: 'one above the upper limit' },
        { args: ['12x'], expect: ['rejected', 'not_a_number'] },
        { args: ['-5'], expect: ['rejected', 'not_a_number'], name: 'a minus sign is not a digit' },
        { args: [''], expect: ['rejected', 'not_a_number'], name: 'empty string' },
        { args: [' 7'], expect: ['rejected', 'not_a_number'], name: 'a leading space is not a digit' },
        { args: ['²'], expect: ['rejected', 'not_a_number'], name: 'superscript two: isdigit() says yes, int() raises' },
        { args: ['007'], expect: ['ok', 7], name: 'leading zeros are still digits' },
      ],
      solution: 'def solve(text):\n    if not text.isdigit():\n        return ["rejected", "not_a_number"]\n    try:\n        value = int(text)\n    except ValueError:\n        return ["rejected", "not_a_number"]\n    if not (1 <= value <= 65535):\n        return ["rejected", "out_of_range"]\n    return ["ok", value]'
    }, 'Two guards, in this order. `str.isdigit()` rejects the sign, the space, the empty string and the trailing letter — note that `int("-5")` would happily succeed, so leaning on `int()` alone accepts a negative quantity. Then the `try` is not decoration: `isdigit()` is true for characters such as the superscript "²", which `int()` refuses, and only the handler catches that. Once a value exists, the range check runs on the value, and the two failures get different reason codes so a caller can count them separately. Nothing raises out of the function, and the boundary tests sit exactly at 1, 0, 65535 and 65536 — the four values that separate a correct comparison from an off-by-one.'),
    q.mc('S', 'Interview: a reviewer changes `except ValueError:` to `except Exception:` in a parser "to be safe". Why is that usually a step backwards?', ['It now also swallows programming errors such as a misspelled name or a wrong-type call, so a real bug is reported as a rejected message', 'Exception is slower to catch than ValueError', '`except Exception` cannot be combined with `else` or `finally`', 'It changes the return type of the function'], 0, 'The handler was written for one known failure. Widening it means every unknown failure gets the same treatment, and your bug arrives disguised as data. Widen only when you can honestly handle whatever turns up.'),
    q.mc('S', 'Interview: `parse(text)` returns `None` for anything malformed. What is the concrete problem when a caller processes a million messages?', ['You know how many failed but never why, so the rejections cannot be counted by reason, triaged or tested rule by rule', 'None is slower to return than a tuple', 'None cannot be stored in a list', 'The function will leak memory'], 0, 'A single failure value collapses every distinct cause into one bucket. A reason code — "not_a_number", "out_of_range", "bad_opcode" — lets you build a table, spot the one that spiked, and write a test per rule.'),
    q.mc('S', 'Interview: a validator uses `if text.isdigit(): value = int(text)` with no `try`. On which input does that crash, and what does the crash tell you?', ['On a string of characters Unicode calls digits but `int()` rejects, such as the superscript "²" — isdigit() and int() do not agree on what a digit is, so the boundary needs both checks', 'On the empty string, because isdigit() raises on it', 'On "007", because leading zeros are not allowed', 'It cannot crash: isdigit() guarantees int() succeeds'], 0, '`"²".isdigit()` is True while `int("²")` raises ValueError. A validator on untrusted input meets exactly this class of surprise, which is why the specific `except ValueError` stays even after the guard.'),

    // =====================================================================================================
    // MATHS — stars and bars, and bounded occupancy (M01 L3/L4)
    // =====================================================================================================
    q.info('M', 'Three questions before you count anything', `Most counting mistakes are made before any arithmetic. Ask three things about the objects first.

**Can you tell the items apart?** Eight jobs from the same batch, all identical work, are indistinguishable: only *how many* land in each queue matters. Eight named jobs are distinguishable: which one went where matters too.

**Can you tell the containers apart?** Queue 0, queue 1 and queue 2 are labelled, so (5, 3, 0) and (0, 3, 5) are different situations — a different queue is busy.

**Does order inside a container matter?** For a count of jobs waiting, no.

Change any answer and you are counting a different set, with a different total. Today's problem fixes them as: items identical, bins labelled, order irrelevant, and empty bins allowed.`, {
      terms: [
        ['Distinguishable', 'Items you can tell apart, so swapping two of them gives a different arrangement.'],
        ['Identical (indistinguishable)', 'Items you cannot tell apart, so only the counts per bin matter.'],
        ['Labelled bins', 'Containers you can tell apart, so (5,3,0) differs from (0,3,5).'],
        ['Configuration', 'One complete answer to "how many in each bin": here a triple like (5, 3, 0).'],
      ]
    }),
    q.info('M', 'Stars and bars: turn the problem into a different one', `Eight identical jobs, three labelled queues, empty queues allowed. Counting the triples directly is fiddly. So change what you are counting.

Draw the eight jobs as stars in a row, and drop in two bars to cut the row into three pieces:

\`★★★|★★|★★★\` → queue 0 gets 3, queue 1 gets 2, queue 2 gets 3.

Now check the correspondence goes both ways. Every bar arrangement gives exactly one triple (read off the pieces). Every triple gives exactly one bar arrangement (put down that many stars, then a bar, and so on). Nothing is missed and nothing is counted twice — bars at the very start or two bars together are legal, and give the empty queues.

So the two sets have the same size, and the bar arrangements are easy: a row of 8 + 2 = 10 slots, choose which **2** hold bars. That is C(10, 2) = 45.

In general: n identical items into k labelled bins = **C(n + k − 1, k − 1)**.`, {
      terms: [
        ['Bijection', 'A pairing between two sets that matches every member of each with exactly one of the other. It proves the sets are the same size.'],
        ['Stars and bars', 'Drawing n items as stars and k−1 dividers as bars, so a distribution becomes an arrangement.'],
        ['C(n, r)', '"n choose r": the number of ways to pick r positions out of n, order irrelevant.'],
        ['Empty bin', 'A bin with zero items. It corresponds to two adjacent bars, or a bar at an end.'],
      ],
      widget: W('starsbars', { n: 8, k: 3 })
    }),
    q.num('M', '8 identical jobs are distributed among 3 labelled queues, and a queue may be left empty. How many configurations are there?', 45, '8 stars and 2 bars make a row of 10 slots; choose the 2 bar positions: C(10, 2) = 10 × 9 / 2 = 45.'),
    q.num('M', '5 identical items are distributed among 2 labelled bins, and a bin may be left empty. How many configurations?', 6, 'C(5 + 2 − 1, 2 − 1) = C(6, 1) = 6. Check by listing: (0,5), (1,4), (2,3), (3,2), (4,1), (5,0).'),
    q.num('M', '2 identical items are distributed among 3 labelled bins, and a bin may be left empty. How many configurations? (Small enough to list and verify.)', 6, 'C(2 + 3 − 1, 3 − 1) = C(4, 2) = 6. The list: (2,0,0), (0,2,0), (0,0,2), (1,1,0), (1,0,1), (0,1,1). The formula and the enumeration agree, which is how you check it at small n.'),
    q.mc('M', 'Which expression counts the ways to put n **identical** items into k **labelled** bins, with empty bins allowed?', ['C(n + k − 1, k − 1)', 'C(n, k)', 'kⁿ', 'n! / k!'], 0, 'Write n stars and k − 1 bars in a row: that is n + k − 1 positions, and you choose which k − 1 of them hold bars.', { grid: true }),
    q.mc('M', '8 **distinguishable** jobs (each with its own name) are assigned to 3 labelled queues. How many assignments are there?', ['3⁸ = 6561', '45', '8³ = 512', 'C(10, 2) = 45'], 0, 'Each named job independently picks one of 3 queues, so multiply 3 by itself 8 times. The identical-jobs answer, 45, is far smaller because it only records the counts, not who went where.', { grid: true }),
    q.info('M', 'When every queue must get its share', `Same eight identical jobs, same three labelled queues, but now every queue must hold **at least one**.

Trick: pay the minimum up front. Hand one job to each queue. Three jobs are spent, five remain, and those five are now completely unrestricted. So the answer is stars and bars on five: C(5 + 2, 2) = C(7, 2) = **21**.

Add a ceiling of four per queue and the trick alone is not enough. After the down-payment each queue may take at most three more. Count the 21 unrestricted ways, then throw away the bad ones.

A queue breaks the ceiling if it takes 4 or more of the 5 leftovers. Pay it 4 as well, leaving 1 to spread freely: C(1 + 2, 2) = 3 ways, and any of the 3 queues could be the offender, so 9 bad configurations. Two queues cannot both break it, since that would need 8 leftovers and only 5 exist — so there is no double-counting to repair.

**21 − 9 = 12.**`, {
      terms: [
        ['Lower bound (at least one)', 'A minimum per bin. Pay it first, then count the remainder freely.'],
        ['Upper bound (at most four)', 'A maximum per bin. Count everything, then subtract the arrangements that break it.'],
        ['Inclusion–exclusion', 'Subtract the bad cases; add back anything you subtracted twice. Here nothing is subtracted twice.'],
        ['Overlap check', 'Asking whether two bins could break the ceiling at once. If not, no add-back term is needed.'],
      ]
    }),
    q.num('M', '8 identical jobs are distributed among 3 labelled queues with **at least one job in every queue**. How many configurations?', 21, 'Give each queue one job first (3 used). The remaining 5 are unrestricted: C(5 + 3 − 1, 3 − 1) = C(7, 2) = 21.'),
    q.num('M', 'Interview: 8 identical jobs are distributed among 3 labelled queues so that every queue holds **at least 1 and at most 4** jobs. How many configurations?', 12, 'Pay one to each queue: 5 left, each queue may take at most 3 more. Unrestricted: C(7, 2) = 21. A queue breaking the ceiling takes ≥ 4 of the 5, leaving 1 free: C(3, 2) = 3 ways, times 3 choices of offending queue = 9. Two offenders would need 8 leftovers and only 5 exist, so nothing is double-subtracted. 21 − 9 = 12.'),
    q.num('M', 'Interview: how many solutions in **non-negative integers** does x₁ + x₂ + x₃ + x₄ = 10 have?', 286, 'Identical units into 4 labelled variables: C(10 + 4 − 1, 4 − 1) = C(13, 3) = 286. Every equation of this shape is a stars-and-bars question in disguise.'),
    q.num('M', 'Interview: how many solutions in integers does x₁ + x₂ + x₃ = 10 have if every xᵢ must be **at least 2**?', 15, 'Substitute yᵢ = xᵢ − 2, so every yᵢ ≥ 0 and y₁ + y₂ + y₃ = 4. Then C(4 + 2, 2) = C(6, 2) = 15. Pay every lower bound first and the problem becomes the unrestricted one.'),
    q.mc('M', 'Interview: a candidate says "8 identical jobs into 3 queues must be 3⁸/8!, because 3⁸ counts labelled jobs and 8! removes the labels". Why is that wrong?', ['Dividing by 8! assumes every configuration comes from the same number of labelled assignments, but it does not — (8,0,0) comes from 1 assignment while (3,3,2) comes from many', 'It is right, but 3⁸/8! is not a whole number so they should round it', '3⁸ is the wrong starting point; it should be 8³', 'You may never divide when counting'], 0, 'Dividing by k! only works when every object in the target set is hit exactly k! times. Here the multiplicity varies with the shape of the configuration, so no single divisor exists. That is precisely why stars and bars builds a bijection instead of dividing.'),

    // =====================================================================================================
    // DEGREE — RMS (E10 L1)
    // =====================================================================================================
    q.info('E', 'The average of the mains voltage is zero', `A wall socket delivers a voltage that swings up and down about a hundred times a second, as far positive as it goes negative.

Average it over a whole cycle and you get exactly **zero**. Yet a kettle plugged into it boils water. So the plain average is not the number you want; it throws away everything that matters.

Look at what heat actually depends on. Instantaneous power in a resistor is p = v·i, and with v = i·R that is **p = i²R**. The square is the whole story: current in either direction heats the resistor, because a negative current squared is positive.

So the useful average is not the average of the current. It is the average of the **square** of the current, which never cancels. That single observation is where the next card's definition comes from.`, {
      terms: [
        ['Alternating (AC)', 'A voltage or current that reverses direction periodically, like the mains.'],
        ['Cycle / period', 'One complete repetition of the waveform. UK mains: 50 cycles per second, so a period of 20 ms.'],
        ['Instantaneous power', 'p(t) = v(t)·i(t): the power at one instant, not averaged.'],
        ['Average power', 'The mean of p(t) over a whole cycle. This is what heats a kettle and what the bill charges for.'],
      ]
    }),
    q.info('E', 'RMS is defined to make the DC formula keep working', `For a steady DC current, average power in a resistor is P = I²R. For an alternating current it is the average of i²R over a cycle, which is R × (average of i²).

We would like to keep writing **P = I²R**. So invent the number that makes that true:

**I_rms = √(average of i² over one cycle)**

Then P = I_rms²·R exactly, by construction. Read the name backwards and it is the recipe: **square** the waveform, take the **mean**, take the **root**. Root-mean-square.

That is the whole idea, and it explains what RMS *means* physically: the DC current that would heat the resistor at the same average rate. A 4 A RMS alternating current and a 4 A DC current warm the same element equally. The same construction gives V_rms, and P = V_rms²/R.

Nothing here is special to sines. Any repeating waveform has an RMS value; you just have to average its square.`, {
      terms: [
        ['RMS (root mean square)', 'Square the waveform, average over one cycle, take the square root.'],
        ['Heating-equivalent value', 'The plain-English meaning of RMS: the DC value that delivers the same average power.'],
        ['Peak (amplitude)', 'The largest instantaneous value the waveform reaches.'],
        ['Mean square', 'The average of v² over one cycle — the middle step, in volts squared.'],
      ],
      widget: W('rmsshape', { A: 100, shape: 0, target: 1 })
    }),
    q.info('E', 'Where the √2 comes from', `Take a sine of peak A: v = A·sin(θ). Square it: v² = A²·sin²θ. Now find the average of sin²θ over a full cycle.

Two ways to see that it is **½**.

The quick one: sin²θ + cos²θ = 1 always, so the two averages add to 1. A cosine is a sine shifted along, so over a whole cycle their averages must be equal. Equal and summing to one means each is ½.

The formal one: sin²θ = (1 − cos 2θ)/2. Over a whole number of cycles the cosine term averages to zero, leaving ½.

So the average of v² is A²/2, and

**V_rms = √(A²/2) = A/√2 ≈ 0.707 A.**

The √2 is not a general law of AC — it belongs to the sine. Change the shape and you change the number. That is worth remembering, because "divide by 1.414" gets applied to square waves by people who never asked where it came from.`, {
      terms: [
        ['sin²θ average', 'The mean of sin² over a whole cycle is ½, which is where the √2 comes from.'],
        ['0.707', '1/√2, the ratio of RMS to peak for a sine and for nothing else.'],
        ['Crest factor', 'Peak ÷ RMS. For a sine it is √2 ≈ 1.414; for a square wave it is 1.'],
      ]
    }),
    q.num('E', 'A sinusoidal voltage has a peak value of 325 V. Its RMS value, in volts (nearest whole volt)?', 230, 'V_rms = A/√2 = 325/1.4142 = 229.8 ≈ 230 V. This is why UK mains is quoted as 230 V while the waveform actually reaches 325 V.', { unit: 'V', tol: 1 }),
    q.num('E', 'A sinusoidal voltage has a peak value of 10 V. Its RMS value, in volts, to 2 d.p.?', 7.07, '10/√2 = 10/1.41421 = 7.07 V.', { unit: 'V', tol: 0.02 }),
    q.num('E', 'A sinusoidal supply is quoted as 230 V RMS. Its **peak** value, in volts, to the nearest volt?', 325, 'Peak = RMS × √2 = 230 × 1.41421 = 325.3 V. Insulation and the voltage rating of a capacitor must survive the peak, not the RMS.', { unit: 'V', tol: 1 }),
    q.mc('E', 'Why is RMS, rather than the plain average, used to describe an alternating voltage?', ['The plain average of a symmetrical alternating voltage is zero, while RMS is the DC value that produces the same average heating', 'RMS is easier to measure than an average', 'The plain average is always larger than the RMS value', 'RMS is another name for the peak value'], 0, 'Power depends on v², and squaring removes the sign, so the meaningful average is of v². The square root then puts the answer back into volts.'),
    q.info('E', 'Other shapes, and the meter that lies about them', `Apply the recipe to other waveforms of peak A and the answers differ.

**Square wave**, ±A: the square of it is A² at every instant, so the mean square is A² and **V_rms = A**. Nothing is lost to the shape, because it is always at full height.

**Triangle or sawtooth**: the mean square works out at A²/3, so **V_rms = A/√3 ≈ 0.577 A**.

**Half-wave rectified sine** (the negative half removed): the positive half still averages A²/2, but the flat half contributes nothing, so the mean square is A²/4 and **V_rms = A/2**.

Now the practical sting. A cheap multimeter does not square anything. It rectifies, takes the average of |v|, and multiplies by 1.111 — the fixed ratio that converts an average to an RMS **for a sine**. Feed it a triangle or a square wave and it confidently reports the wrong number. A meter that really averages the square is sold as **true RMS**.`, {
      terms: [
        ['Square wave', 'A waveform that jumps between +A and −A. Its RMS equals its peak.'],
        ['Half-wave rectified', 'A sine with the negative half removed, leaving humps separated by flat gaps.'],
        ['Form factor', 'RMS ÷ average of |v|. For a sine it is 1.111, and cheap meters assume it.'],
        ['True RMS meter', 'An instrument that computes the mean of the square, so it is correct for any waveshape.'],
      ],
      widget: W('rmsshape', { A: 100, shape: 1, target: 2 })
    }),
    q.num('E', 'A square wave alternates between +5 V and −5 V, spending equal time at each. Its RMS value, in volts?', 5, 'The square of the waveform is 25 V² at every instant, so the mean square is 25 and the root is 5 V. A square wave\'s RMS equals its peak; dividing by √2 here would be wrong by 29%.', { unit: 'V' }),
    q.num('E', 'A triangular voltage waveform has a peak of 3 V. Its RMS value, in volts, to 3 d.p.?', 1.732, 'For a triangle or sawtooth the mean of v² is A²/3, so V_rms = A/√3 = 3/1.73205 = 1.732 V.', { unit: 'V', tol: 0.005 }),
    q.num('E', 'Exam-style: a sinusoid of peak 100 V is half-wave rectified, so the negative half-cycles are replaced by 0 V. State its RMS value in volts.', 50, 'Over a full period the positive hump contributes a mean square of A²/2 for half the time and the flat gap contributes 0 for the other half, so the mean square is A²/4 = 2500 V². The root is 50 V = A/2.', { unit: 'V', tol: 0.5 }),
    q.num('E', 'Exam-style: a voltage is v(t) = 3 + 4·sin(ωt) volts, i.e. a 4 V-peak sine sitting on a 3 V DC offset. State its RMS value in volts, to 2 d.p.', 4.12, 'Mean of v² = mean(9) + mean(24 sin ωt) + mean(16 sin²ωt) = 9 + 0 + 8 = 17 V². The cross term averages to zero over a whole cycle. V_rms = √17 = 4.12 V. Note it is not 3 + 2.83: RMS values of different parts add in quadrature, not directly.', { unit: 'V', tol: 0.02 }),
    q.mc('E', 'Exam-style: an averaging multimeter (which rectifies, averages |v| and multiplies by the sine form factor 1.111) is used on a **square wave** of peak 10 V. What does it display, and what is the true RMS?', ['It displays 11.11 V while the true RMS is 10.0 V — an error of +11%', 'It displays 7.07 V while the true RMS is 10.0 V', 'It displays 10.0 V, which is correct', 'It displays 14.14 V while the true RMS is 10.0 V'], 0, 'For a square wave the average of |v| is the full 10 V, so the meter reports 1.111 × 10 = 11.11 V. The true RMS is 10 V. The scaling factor is baked in for sines and is simply wrong here; a true-RMS instrument is required.'),
    q.info('E', 'Using RMS: heating, ratings and the bill', `Once you have RMS values, every DC formula you already know comes back unchanged: **P = V_rms·I_rms = I_rms²R = V_rms²/R** for a resistor.

So a 230 V RMS supply across a 23 Ω heating element delivers 230²/23 = 2300 W, and that is a real, continuous 2.3 kW of heat.

Energy is then power × time. A 100 W lamp left on for 2 hours uses 100 × 7200 = 720,000 J. Since a joule is small, electricity is billed in **kilowatt-hours**: 0.1 kW × 2 h = **0.2 kWh**, and 1 kWh = 3.6 MJ.

One caution worth carrying forward. P = V_rms·I_rms is exact for a **resistor**, where voltage and current rise and fall together. Motors and other loads shift the current in time relative to the voltage, and then the average power is less than V_rms·I_rms. That correction factor is a later topic; the RMS values you compute today are what it will be built on.`, {
      terms: [
        ['Kilowatt-hour (kWh)', 'The billing unit of energy: 1 kW for 1 hour = 3.6 million joules.'],
        ['Joule (J)', 'The SI unit of energy: one watt for one second.'],
        ['Resistive load', 'A load whose current follows its voltage exactly in time, so P = V_rms·I_rms holds without correction.'],
      ]
    }),
    q.num('E', 'A heating element of resistance 23 Ω is connected across a 230 V RMS supply. Average power dissipated, in watts?', 2300, 'P = V_rms²/R = 230²/23 = 52900/23 = 2300 W. Using RMS values means the ordinary DC formula gives the correct average power directly.', { unit: 'W' }),
    q.num('E', 'A 2.3 kW heater is connected to a 230 V RMS supply and behaves as a pure resistance. The RMS current it draws, in amperes?', 10, 'I_rms = P/V_rms = 2300/230 = 10 A. (Hence a 13 A plug fuse is the right size and a 5 A one is not.)', { unit: 'A' }),
    q.num('E', 'Exam-style: a 100 W lamp is left on for 2 hours. State the energy used in **joules**.', 720000, 'E = P·t = 100 W × (2 × 3600 s) = 100 × 7200 = 720,000 J = 720 kJ.', { unit: 'J' }),
    q.num('E', 'Exam-style: a 100 W lamp is left on for 2 hours. State the energy used in **kilowatt-hours**.', 0.2, 'E = 0.1 kW × 2 h = 0.2 kWh. Check against joules: 0.2 × 3.6 MJ = 720,000 J, which agrees.', { unit: 'kWh', tol: 0.005 }),
    q.num('E', 'Exam-style: a sinusoidal voltage v(t) = 12·sin(314t) volts is applied across an 8 Ω resistor. State the average power dissipated, in watts.', 9, 'V_rms = 12/√2 = 8.485 V, so P = V_rms²/R = 72/8 = 9 W. Equivalently P = A²/(2R) = 144/16 = 9 W. The 314 rad/s (50 Hz) never enters the calculation: a resistor does not care about frequency.', { unit: 'W', tol: 0.05 }),
    ...genius(q, 12),
  ]
};
